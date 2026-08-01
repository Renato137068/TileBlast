import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function emptyGrid(gw, gh) {
  return Array.from({ length: gw }, () => Array.from({ length: gh }, () => ({ type: 0, sp: 0 })));
}

describe('TBLogic.checkObjectives — novos tipos de obstáculo', () => {
  it('objetivo de gelo (ice) por chave de tipo', () => {
    mountModule('tb-game-logic.js');
    const objs = [{ type: 'ice', target: 8 }];
    expect(TBLogic.checkObjectives(objs, 0, { ice: 7 })).toBe(false);
    expect(TBLogic.checkObjectives(objs, 0, { ice: 8 })).toBe(true);
  });

  it('objetivo de coleta + cor simultâneos', () => {
    mountModule('tb-game-logic.js');
    const objs = [
      { type: 'collect', target: 5 },
      { type: 'color', color: 1, target: 10 },
    ];
    expect(TBLogic.checkObjectives(objs, 0, { collect: 5, 1: 9 })).toBe(false);
    expect(TBLogic.checkObjectives(objs, 0, { collect: 5, 1: 10 })).toBe(true);
  });

  it('score/color continuam funcionando (retrocompatível)', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.checkObjectives([{ type: 'score', target: 500 }], 500, {})).toBe(true);
    expect(TBLogic.checkObjectives([{ type: 'color', color: 2, target: 3 }], 0, { 2: 3 })).toBe(
      true
    );
  });
});

describe('TBLogic.calcStarsMerit', () => {
  it('3★ quando eficiente e supera a meta', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStarsMerit(8, 20, 1.3)).toBe(3);
  });
  it('nao da 3★ se venceu no limite mesmo sendo rapido', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStarsMerit(10, 20, 1.0)).toBe(2);
  });
  it('2★ por muita folga de pontos mesmo lento', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStarsMerit(1, 20, 1.5)).toBe(2);
  });
  it('1★ no aperto', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStarsMerit(1, 20, 1.0)).toBe(1);
  });
});

describe('TBLogic.adjacentObstacleCells', () => {
  it('encontra gelo/caixa vizinhos sem duplicar', () => {
    mountModule('tb-game-logic.js');
    const g = emptyGrid(4, 4);
    g[1][1].ice = 1; // vizinho de (0,1) e (2,1) e (1,0),(1,2)
    g[2][2].crate = 2;
    const popped = [
      [0, 1],
      [1, 2],
    ]; // (1,1) é vizinho de ambos -> aparece 1x
    const cells = TBLogic.adjacentObstacleCells(popped, g, 4, 4);
    const keys = cells.map((c) => c.x + ',' + c.y).sort();
    expect(keys).toContain('1,1');
    expect(keys).toContain('2,2');
    expect(new Set(keys).size).toBe(keys.length); // sem duplicatas
  });
  it('ignora blocos normais', () => {
    mountModule('tb-game-logic.js');
    const g = emptyGrid(3, 3);
    expect(TBLogic.adjacentObstacleCells([[1, 1]], g, 3, 3)).toEqual([]);
  });
});

describe('TBLogic.mercyRefillType', () => {
  it('forca cor necessaria quando rng abaixo da chance', () => {
    mountModule('tb-game-logic.js');
    // rng sempre 0 -> sempre entra na mercy e pega needs[0]
    const rng = () => 0;
    expect(TBLogic.mercyRefillType(rng, 5, [2, 3], 0.35)).toBe(2);
  });
  it('mantem baseType quando rng acima da chance', () => {
    mountModule('tb-game-logic.js');
    const rng = () => 0.99;
    expect(TBLogic.mercyRefillType(rng, 5, [2, 3], 0.35)).toBe(5);
  });
  it('sem cores necessarias mantem baseType', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.mercyRefillType(() => 0, 4, [], 0.9)).toBe(4);
  });
});
