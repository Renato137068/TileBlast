/**
 * Scaffold de um mundo novo (pack + manifest + worlds.json).
 * Uso:
 *   node scripts/new-world.mjs --id sky --label "Céu Azul" --icon ☁️ --levels 10 --color "#7ec8ff"
 *
 * Depois: edite fases em data/levels/<id>.json, rode npm run content:validate,
 * adicione tema em tb-music.js (MUSIC_THEMES.<id>) e CSS world-<id> se preciso.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}

const id = (arg('id') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
const label = arg('label', id ? id[0].toUpperCase() + id.slice(1) : '');
const icon = arg('icon', '🌍');
const color = arg('color', '#88aacc');
const nLevels = Math.max(5, parseInt(arg('levels', '10'), 10) || 10);
const after = arg('after', null); // worldId após o qual inserir

if (!id) {
  console.error(
    'Uso: node scripts/new-world.mjs --id <slug> --label "Nome" [--levels 10] [--color "#hex"] [--after legendary]'
  );
  process.exit(1);
}

const levelsDir = join(root, 'data', 'levels');
const packPath = join(levelsDir, id + '.json');
if (existsSync(packPath)) {
  console.error(`Pack já existe: data/levels/${id}.json`);
  process.exit(1);
}

const worldsPath = join(root, 'data', 'worlds.json');
const manifestPath = join(levelsDir, 'manifest.json');
const worldsDoc = JSON.parse(readFileSync(worldsPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (worldsDoc.worlds.some((w) => w.id === id)) {
  console.error(`worlds.json já tem id=${id}`);
  process.exit(1);
}
if (manifest.packs.some((p) => p.worldId === id)) {
  console.error(`manifest já tem worldId=${id}`);
  process.exit(1);
}

const OBJ_ROTATION = [
  { type: 'score', targetBase: 900 },
  { type: 'color', color: 0, targetBase: 25 },
  { type: 'ice', targetBase: 10 },
  { type: 'crate', targetBase: 10 },
  { type: 'cover', targetBase: 14 },
  { type: 'chain', targetBase: 8 },
  { type: 'collect', targetBase: 6 },
  { type: 'score', targetBase: 1400 },
];

function makeLevel(order, startIndex) {
  const rot = OBJ_ROTATION[(order - 1) % OBJ_ROTATION.length];
  const easy = order <= Math.ceil(nLevels * 0.25);
  const mid = order <= Math.ceil(nLevels * 0.55);
  // Respiro: a cada 4 fases a partir da 4ª, força medium mesmo no bloco hard
  const breath = order >= 4 && order % 4 === 0;
  const difficulty = breath ? 'medium' : easy ? 'easy' : mid ? 'medium' : 'hard';
  const moves = easy ? 22 : mid ? 20 : breath ? 24 : 16 + (order % 3) * 2;
  const scale = 1 + (order - 1) * 0.08;
  const obj = { type: rot.type, target: Math.round(rot.targetBase * scale) };
  if (rot.type === 'color') obj.color = (order + (rot.color || 0)) % 5;
  return {
    id: `${id}-${String(order).padStart(2, '0')}`,
    worldId: id,
    order,
    index: startIndex + order - 1,
    name: `${label} ${order}`,
    moves,
    objectives: [obj],
    difficulty,
    objectiveType: rot.type,
    reward: { coins: difficulty === 'easy' ? 40 : difficulty === 'medium' ? 55 : 70 },
    mode: 'classic_blast',
    seed: 2000 + order * 31,
  };
}

const startIndex = manifest.packs.reduce((s, p) => s + p.count, 0);
const levels = [];
for (let o = 1; o <= nLevels; o++) levels.push(makeLevel(o, startIndex));

const pack = { worldId: id, levels };
writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');

const unlockAt = startIndex;
const worldEntry = {
  id,
  label,
  icon,
  theme: id,
  musicKey: id,
  skinId: `av_w_${id}`,
  color,
  cssClass: `world-${id}`,
  unlockAtLevel: unlockAt,
  levelCount: nLevels,
  completionReward: { coins: 200 + nLevels * 10 },
  description: `Explore ${nLevels} fases em ${label}.`,
};

let insertAt = worldsDoc.worlds.length;
if (after) {
  const ai = worldsDoc.worlds.findIndex((w) => w.id === after);
  if (ai >= 0) insertAt = ai + 1;
}
worldsDoc.worlds.splice(insertAt, 0, worldEntry);
// Recalcula unlockAtLevel em cadeia
let unlock = 0;
for (const w of worldsDoc.worlds) {
  w.unlockAtLevel = unlock;
  unlock += w.levelCount || 0;
}
writeFileSync(worldsPath, JSON.stringify(worldsDoc, null, 2) + '\n');

const packMeta = { worldId: id, file: `${id}.json`, count: nLevels };
let mInsert = manifest.packs.length;
if (after) {
  const ai = manifest.packs.findIndex((p) => p.worldId === after);
  if (ai >= 0) mInsert = ai + 1;
}
manifest.packs.splice(mInsert, 0, packMeta);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✓ Mundo criado: ${id} (${nLevels} fases)`);
console.log(`  data/levels/${id}.json`);
console.log(`  worlds.json + manifest atualizados (unlockAtLevel=${worldEntry.unlockAtLevel})`);
console.log(`\nPróximos passos:`);
console.log(`  1. npm run content:validate`);
console.log(`  2. Adicionar MUSIC_THEMES.${id} em tb-music.js`);
console.log(`  3. CSS .${worldEntry.cssClass} em css/map.css (borda do mapa)`);
console.log(`  4. npm run sync:www && npm run build:bundle`);
