import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('TBLogic.checkObjectives', () => {
  it('vitória por pontuação', () => {
    mountModule('tb-game-logic.js');
    const objs = [{ type: 'score', target: 500 }];
    expect(TBLogic.checkObjectives(objs, 499, {})).toBe(false);
    expect(TBLogic.checkObjectives(objs, 500, {})).toBe(true);
  });

  it('vitória por cor', () => {
    mountModule('tb-game-logic.js');
    const objs = [{ type: 'color', color: 2, target: 20 }];
    expect(TBLogic.checkObjectives(objs, 0, { 2: 19 })).toBe(false);
    expect(TBLogic.checkObjectives(objs, 0, { 2: 20 })).toBe(true);
  });

  it('múltiplos objetivos — todos devem completar', () => {
    mountModule('tb-game-logic.js');
    const objs = [
      { type: 'color', color: 0, target: 15 },
      { type: 'color', color: 3, target: 15 },
    ];
    expect(TBLogic.checkObjectives(objs, 0, { 0: 15, 3: 14 })).toBe(false);
    expect(TBLogic.checkObjectives(objs, 0, { 0: 15, 3: 15 })).toBe(true);
  });

  it('objetivo misto score + cor', () => {
    mountModule('tb-game-logic.js');
    const objs = [
      { type: 'color', color: 0, target: 25 },
      { type: 'score', target: 800 },
    ];
    expect(TBLogic.checkObjectives(objs, 800, { 0: 25 })).toBe(true);
    expect(TBLogic.checkObjectives(objs, 799, { 0: 25 })).toBe(false);
  });
});

describe('TBLogic.applyLevelComplete', () => {
  it('desbloqueia próxima fase', () => {
    mountModule('tb-game-logic.js');
    const next = TBLogic.applyLevelComplete({ unlocked: 0 }, 0, 2, 600);
    expect(next.unlocked).toBe(1);
    expect(next.stars[0]).toBe(2);
    expect(next.hs).toBe(600);
  });

  it('mantém melhor estrela e high score', () => {
    mountModule('tb-game-logic.js');
    const base = { unlocked: 5, stars: { 3: 3 }, hs: 4000 };
    const next = TBLogic.applyLevelComplete(base, 3, 1, 3500);
    expect(next.unlocked).toBe(5);
    expect(next.stars[3]).toBe(3);
    expect(next.hs).toBe(4000);
  });

  it('atualiza estrelas e recorde quando melhor', () => {
    mountModule('tb-game-logic.js');
    const base = { unlocked: 2, stars: { 1: 1 }, hs: 900 };
    const next = TBLogic.applyLevelComplete(base, 1, 3, 1200);
    expect(next.stars[1]).toBe(3);
    expect(next.hs).toBe(1200);
  });
});

describe('TBLogic.findSmallestMove', () => {
  it('prefere grupo menor', () => {
    mountModule('tb-game-logic.js');
    const grid = Array.from({ length: 8 }, (_, x) =>
      Array.from({ length: 8 }, (_, y) => ({ type: (x * 3 + y * 5) % 6, sp: 0 }))
    );
    grid[0][0].type = 1;
    grid[1][0].type = 1;
    grid[7][6].type = 2;
    grid[7][7].type = 2;
    grid[6][7].type = 2;
    const move = TBLogic.findSmallestMove(grid, 8, 8, 0);
    expect(move?.size).toBe(2);
  });
});

describe('TBLogic.checkObjectives (obstaculos)', () => {
  it('usa obsProgress separado para gelo/caixa', () => {
    mountModule('tb-game-logic.js');
    const objs = [{ type: 'ice', target: 3 }];
    expect(TBLogic.checkObjectives(objs, 0, {}, { ice: 2 })).toBe(false);
    expect(TBLogic.checkObjectives(objs, 0, {}, { ice: 3 })).toBe(true);
    // sem 4º arg: fallback no 3º mapa (compat)
    expect(TBLogic.checkObjectives(objs, 0, { ice: 3 })).toBe(true);
  });
});

describe('TBLogic.objectivesAvgProgress / MinProgress', () => {
  it('media 0-100 e minimo 0-1', () => {
    mountModule('tb-game-logic.js');
    const objs = [
      { type: 'score', target: 100 },
      { type: 'color', color: 0, target: 10 },
    ];
    expect(TBLogic.objectivesAvgProgress(objs, 50, { 0: 5 }, {})).toBe(50);
    expect(TBLogic.objectivesMinProgress(objs, 100, { 0: 5 }, {})).toBe(0.5);
    expect(TBLogic.objectivesMinProgress(objs, 100, { 0: 10 }, {})).toBe(1);
  });
});

describe('TBLogic win/loss helpers', () => {
  it('winChestTier por estrelas', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.winChestTier(1)).toBe('bronze');
    expect(TBLogic.winChestTier(2)).toBe('silver');
    expect(TBLogic.winChestTier(3)).toBe('gold');
  });

  it('winXpGain soma estrelas + score', () => {
    mountModule('tb-game-logic.js');
    const defs = { win: { 1: 10, 2: 20, 3: 40 }, score_per_1000: 5 };
    expect(TBLogic.winXpGain(3, 2500, defs)).toEqual({
      xpWin: 40,
      xpScore: 10,
      total: 50,
    });
  });

  it('shouldLoseLife respeita portao das 5 primeiras fases', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.shouldLoseLife(0)).toBe(false);
    expect(TBLogic.shouldLoseLife(4)).toBe(false);
    expect(TBLogic.shouldLoseLife(5)).toBe(true);
  });

  it('isNearMiss no limiar 0.8', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.isNearMiss(0.79)).toBe(false);
    expect(TBLogic.isNearMiss(0.8)).toBe(true);
  });
});
