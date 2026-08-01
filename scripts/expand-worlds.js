/**
 * Expande fases de um mundo com variedade de objetivos e "respiros".
 * Uso: node scripts/expand-worlds.js --world garden --from 11 --to 20
 *      node scripts/expand-worlds.js --world forest --count 5
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}

const worldId = arg('world', 'garden');
const countExtra = parseInt(arg('count', '0'), 10) || 0;
let from = parseInt(arg('from', '0'), 10) || 0;
let to = parseInt(arg('to', '0'), 10) || 0;

const packPath = path.join(root, 'data', 'levels', worldId + '.json');
if (!fs.existsSync(packPath)) {
  console.error('Pack não encontrado:', packPath);
  process.exit(1);
}
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const existing = pack.levels.length;
const maxOrder = pack.levels.reduce((m, l) => Math.max(m, l.order || 0), 0);

if (countExtra > 0) {
  from = maxOrder + 1;
  to = maxOrder + countExtra;
}
if (!from || !to || to < from) {
  console.error('Informe --from/--to ou --count N');
  process.exit(1);
}

const OBJ_ROTATION = [
  { type: 'score', targetBase: 1000 },
  { type: 'color', color: 1, targetBase: 28 },
  { type: 'ice', targetBase: 12 },
  { type: 'crate', targetBase: 12 },
  { type: 'cover', targetBase: 16 },
  { type: 'chain', targetBase: 10 },
  { type: 'collect', targetBase: 7 },
  { type: 'score', targetBase: 1600 },
];

const NAMES = [
  'Aurora',
  'Eco',
  'Brisa',
  'Pico',
  'Vale',
  'Névoa',
  'Faísca',
  'Orvalho',
  'Rocha',
  'Luz',
  'Sombra',
  'Corrente',
  'Prisma',
  'Eco II',
  'Cume',
];

let startIndex = 0;
const manifestPath = path.join(root, 'data', 'levels', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const p of manifest.packs) {
  if (p.worldId === worldId) break;
  startIndex += p.count;
}

for (let o = from; o <= to; o++) {
  if (pack.levels.find((l) => l.order === o)) continue;
  const rot = OBJ_ROTATION[(o - 1) % OBJ_ROTATION.length];
  const breath = o % 4 === 0; // respiro a cada 4
  const late = o > maxOrder + Math.ceil((to - from + 1) * 0.55);
  const difficulty = breath ? 'medium' : late ? 'hard' : 'medium';
  const moves = breath ? 24 : late ? 16 + (o % 3) * 2 : 20 + (o % 4);
  const scale = 1 + (o - 1) * 0.07;
  const obj = { type: rot.type, target: Math.round(rot.targetBase * scale) };
  if (rot.type === 'color') obj.color = (o + (rot.color || 0)) % 5;
  pack.levels.push({
    id: `${worldId}-${String(o).padStart(2, '0')}`,
    worldId,
    order: o,
    index: startIndex + o - 1,
    name: NAMES[(o - 1) % NAMES.length] + (o > NAMES.length ? ` ${o}` : ''),
    moves,
    objectives: [obj],
    difficulty,
    objectiveType: rot.type,
    reward: { coins: difficulty === 'medium' ? 55 : 70 },
    mode: 'classic_blast',
    seed: 1000 + o * 17,
  });
}

pack.levels.sort((a, b) => a.order - b.order);
// Reindexa localmente (índice global revalidado no validate)
pack.levels.forEach((l, i) => {
  l.index = startIndex + i;
  l.order = i + 1;
});
fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');

const entry = manifest.packs.find((p) => p.worldId === worldId);
if (entry) entry.count = pack.levels.length;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const worldsPath = path.join(root, 'data', 'worlds.json');
const worldsDoc = JSON.parse(fs.readFileSync(worldsPath, 'utf8'));
const world = worldsDoc.worlds.find((w) => w.id === worldId);
if (world) {
  world.levelCount = pack.levels.length;
  world.description = `Explore ${pack.levels.length} fases em ${world.label || worldId}.`;
  // Recalcula unlock chain
  let unlock = 0;
  for (const w of worldsDoc.worlds) {
    w.unlockAtLevel = unlock;
    unlock += w.levelCount || 0;
  }
  fs.writeFileSync(worldsPath, JSON.stringify(worldsDoc, null, 2) + '\n');
}

console.log(
  `Expanded ${worldId}: ${existing} → ${pack.levels.length} levels (orders ${from}–${to})`
);
console.log('Rode: npm run content:validate');
