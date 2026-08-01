import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../helpers/load-module.js';

const readJson = (rel) => JSON.parse(readFileSync(join(projectRoot, rel), 'utf8'));
const worlds = readJson('data/worlds.json').worlds;
const packs = readJson('data/levels/manifest.json').packs;

// Rede de seguranca para escalar o conteudo (500-1000 fases): qualquer
// inconsistencia ao adicionar fases/mundos falha aqui antes de publicar.
describe('integridade de conteudo: worlds x manifest x arquivos', () => {
  it('cada pack do manifest referencia um mundo existente com contagem casada', () => {
    for (const p of packs) {
      const w = worlds.find((w) => w.id === p.worldId);
      expect(w, `mundo ausente para pack ${p.worldId}`).toBeTruthy();
      expect(p.count, `count divergente em ${p.worldId}`).toBe(w.levelCount);
    }
  });

  it('unlockAtLevel segue a soma cumulativa (progressao sem buracos/sobreposicao)', () => {
    let cum = 0;
    for (const w of worlds) {
      expect(w.unlockAtLevel, `unlock de ${w.id} deveria ser ${cum}`).toBe(cum);
      cum += w.levelCount;
    }
  });

  it('cada arquivo de fases existe e tem levels.length === count', () => {
    for (const p of packs) {
      const path = 'data/levels/' + p.file;
      expect(existsSync(join(projectRoot, path)), `${p.file} ausente`).toBe(true);
      const d = readJson(path);
      const levels = d.levels || d;
      expect(levels.length, `${p.file}: len != count`).toBe(p.count);
    }
  });

  it('todas as fases: id unico global, worldId correto, moves e objetivos validos', () => {
    const ids = new Set();
    for (const p of packs) {
      const levels = readJson('data/levels/' + p.file).levels || [];
      for (const lv of levels) {
        expect(lv.id, 'fase sem id').toBeTruthy();
        expect(ids.has(lv.id), `id duplicado: ${lv.id}`).toBe(false);
        ids.add(lv.id);
        expect(lv.worldId, `worldId errado em ${lv.id}`).toBe(p.worldId);
        expect(typeof lv.moves, `moves nao numerico em ${lv.id}`).toBe('number');
        expect(lv.moves, `moves fora de faixa em ${lv.id}`).toBeGreaterThanOrEqual(5);
        expect(lv.moves).toBeLessThanOrEqual(99);
        expect(
          Array.isArray(lv.objectives) && lv.objectives.length > 0,
          `sem objetivos em ${lv.id}`
        ).toBe(true);
        for (const o of lv.objectives) {
          if (typeof o.target === 'number') {
            expect(o.target, `target invalido em ${lv.id}`).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(ids.size).toBeGreaterThanOrEqual(60);
  });
});
