import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { projectRoot } from './load-module.js';
import { loadContentDataFromDisk } from './content-fixture.js';

/** Carrega fases base — preferência: data/*.json; fallback: tile_blast.html */
export function loadBaseLevelsFromHtml() {
  try {
    const { levelPacks } = loadContentDataFromDisk();
    const levels = [];
    levelPacks.forEach((pack) => {
      if (pack.worldId === 'legendary') return;
      const LEGACY = {
        garden: '🌱 Jardim',
        forest: '🌲 Floresta',
        mountain: '⛰ Montanha',
        ocean: '🌊 Oceano',
        inferno: '🔥 Inferno',
        crystal: '💎 Cristal',
        legendary: '👑 Lendário',
      };
      pack.levels.forEach((entry) => {
        levels.push({
          world: LEGACY[entry.worldId] || entry.worldId,
          name: entry.name,
          moves: entry.moves,
          objectives: entry.objectives,
          setup: entry.setup,
          pattern: entry.pattern,
        });
      });
    });
    if (levels.length >= 70) return levels;
  } catch (_) {
    /* fallback abaixo */
  }

  const html =
    readFileSync(join(projectRoot, 'tile_blast.html'), 'utf8') +
    readFileSync(join(projectRoot, 'tb-main.js'), 'utf8');
  const mLv = html.match(/const LEVELS\s*=/);
  const start = mLv ? mLv.index : -1;
  const marker = mLv ? mLv[0] : 'const LEVELS=';
  if (start < 0) {
    const data = loadContentDataFromDisk();
    return data.levelPacks.filter((p) => p.worldId !== 'legendary').flatMap((p) => p.levels);
  }
  const from = start + marker.length;
  let depth = 0;
  for (let i = from; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') {
      depth--;
      if (depth === 0) {
        return vm.runInNewContext(html.slice(from, i + 1), {}, { timeout: 2000 });
      }
    }
  }
  throw new Error('array LEVELS malformado');
}

export function readAppVersion() {
  const html =
    readFileSync(join(projectRoot, 'tile_blast.html'), 'utf8') +
    readFileSync(join(projectRoot, 'tb-main.js'), 'utf8');
  const m = html.match(/APP_VERSION\s*=\s*'([^']+)'/);
  if (!m) throw new Error('APP_VERSION não encontrado');
  return m[1];
}
