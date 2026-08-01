/**
 * Extrai LEVELS de tile_blast.html → data/levels/*.json + data/worlds.json
 * Executar após editar fases no HTML (transição) ou editar JSON diretamente.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'tile_blast.html'), 'utf8');

function extractLevels() {
  const marker = 'const LEVELS=';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('const LEVELS não encontrado');
  const from = start + marker.length;
  let depth = 0;
  for (let i = from; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') {
      depth--;
      if (depth === 0) {
        return vm.runInNewContext(html.slice(from, i + 1), {}, { timeout: 5000 });
      }
    }
  }
  throw new Error('array LEVELS malformado');
}

const WORLD_META = [
  {
    id: 'garden',
    label: 'Jardim Encantado',
    icon: '🌱',
    legacyWorld: '🌱 Jardim',
    theme: 'garden',
    musicKey: 'garden',
    skinId: 'av_w_garden',
    color: '#4ecb71',
    cssClass: 'world-jardim',
    unlockAtLevel: 0,
    completionReward: { coins: 150, bomb: 2 },
  },
  {
    id: 'forest',
    label: 'Floresta Mística',
    icon: '🌲',
    legacyWorld: '🌲 Floresta',
    theme: 'forest',
    musicKey: 'forest',
    skinId: 'av_w_forest',
    color: '#3aa6e0',
    cssClass: 'world-floresta',
    unlockAtLevel: 15,
    completionReward: { coins: 200, rainbow: 1 },
  },
  {
    id: 'mountain',
    label: 'Montanha Gelada',
    icon: '⛰',
    legacyWorld: '⛰ Montanha',
    theme: 'mountain',
    musicKey: 'mountain',
    skinId: 'av_w_mountain',
    color: '#b46fe0',
    cssClass: 'world-montanha',
    unlockAtLevel: 25,
    completionReward: { coins: 250, shuffle: 3 },
  },
  {
    id: 'ocean',
    label: 'Ilha Tropical',
    icon: '🌊',
    legacyWorld: '🌊 Oceano',
    theme: 'ocean',
    musicKey: 'ocean',
    skinId: 'av_w_ocean',
    color: '#44c8ff',
    cssClass: 'world-oceano',
    unlockAtLevel: 35,
    completionReward: { coins: 300, moves: 2 },
  },
  {
    id: 'inferno',
    label: 'Reino de Fogo',
    icon: '🔥',
    legacyWorld: '🔥 Inferno',
    theme: 'inferno',
    musicKey: 'inferno',
    skinId: 'av_w_inferno',
    color: '#ef4b5f',
    cssClass: 'world-inferno',
    unlockAtLevel: 45,
    completionReward: { coins: 350, bomb: 3 },
  },
  {
    id: 'crystal',
    label: 'Caverna de Cristal',
    icon: '💎',
    legacyWorld: '💎 Cristal',
    theme: 'crystal',
    musicKey: 'crystal',
    skinId: 'av_w_crystal',
    color: '#7fe3ff',
    cssClass: 'world-cristal',
    unlockAtLevel: 55,
    completionReward: { coins: 500, rainbow: 2 },
  },
  {
    id: 'legendary',
    label: 'Reino Lendário',
    icon: '👑',
    legacyWorld: '👑 Lendário',
    theme: 'legendary',
    musicKey: 'legendary',
    skinId: 'av_w_legend',
    color: '#ffdd44',
    cssClass: 'world-lendario',
    unlockAtLevel: 75,
    completionReward: { coins: 1000, bomb: 5, rainbow: 3 },
  },
];

const legacyToId = Object.fromEntries(WORLD_META.map((w) => [w.legacyWorld, w.id]));

const levels = extractLevels();
const dataDir = path.join(root, 'data');
const levelsDir = path.join(dataDir, 'levels');
fs.mkdirSync(levelsDir, { recursive: true });

const packs = {};
WORLD_META.forEach((w) => {
  packs[w.id] = [];
});

levels.forEach((lv, index) => {
  const worldId = legacyToId[lv.world] || 'garden';
  const order = packs[worldId].length + 1;
  const id = `${worldId}-${String(order).padStart(2, '0')}`;
  const difficulty = order <= 3 ? 'easy' : order <= 7 ? 'medium' : 'hard';
  const primaryObj = (lv.objectives && lv.objectives[0]) || { type: 'score' };
  packs[worldId].push({
    id,
    worldId,
    order,
    index,
    name: lv.name,
    moves: lv.moves,
    objectives: lv.objectives,
    setup: lv.setup,
    pattern: lv.pattern,
    difficulty,
    objectiveType: primaryObj.type,
    reward: { coins: difficulty === 'easy' ? 40 : difficulty === 'medium' ? 55 : 70 },
    mode: 'classic_blast',
  });
});

const worldsOut = {
  version: 1,
  worlds: WORLD_META.map((w) => ({
    id: w.id,
    label: w.label,
    icon: w.icon,
    theme: w.theme,
    musicKey: w.musicKey,
    skinId: w.skinId,
    color: w.color,
    cssClass: w.cssClass,
    unlockAtLevel: w.unlockAtLevel,
    levelCount: packs[w.id].length,
    completionReward: w.completionReward,
    description: `Explore ${packs[w.id].length} fases temáticas.`,
  })),
};

fs.writeFileSync(path.join(dataDir, 'worlds.json'), JSON.stringify(worldsOut, null, 2) + '\n');

const manifest = { version: 1, packs: [] };
Object.keys(packs).forEach((worldId) => {
  if (!packs[worldId].length) return;
  const file = `${worldId}.json`;
  fs.writeFileSync(
    path.join(levelsDir, file),
    JSON.stringify({ worldId, levels: packs[worldId] }, null, 2) + '\n'
  );
  manifest.packs.push({ worldId, file, count: packs[worldId].length });
});
fs.writeFileSync(path.join(levelsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`Content built: ${levels.length} levels → ${manifest.packs.length} world packs`);
