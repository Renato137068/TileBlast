import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('TBLogic.comboMultiplier', () => {
  it('sem combo abaixo de 5', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.comboMultiplier(2)).toBe(1);
    expect(TBLogic.comboMultiplier(4)).toBe(1);
  });

  it('MEGA a partir de 5', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.comboMultiplier(5)).toBe(1.5);
  });

  it('ULTRA a partir de 8', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.comboMultiplier(8)).toBe(2);
  });

  it('evento comboBonus reduz limiar para 3', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.comboMultiplier(3, { comboBonus: true })).toBe(1.5);
  });
});

describe('TBLogic.calcStars', () => {
  it('3 estrelas com >60% movimentos restantes', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStars(15, 20)).toBe(3);
  });

  it('2 estrelas entre 30% e 60%', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStars(8, 20)).toBe(2);
  });

  it('1 estrela abaixo de 30%', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcStars(4, 20)).toBe(1);
  });
});

describe('TBLogic.findValidMove', () => {
  it('encontra grupo válido no tabuleiro', () => {
    mountModule('tb-game-logic.js');
    const grid = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({ type: 0, sp: 0 }))
    );
    grid[2][2].type = 1;
    grid[2][3].type = 1;
    grid[3][2].type = 1;
    const move = TBLogic.findValidMove(grid, 8, 8, 0);
    expect(move).not.toBeNull();
    expect(move.size).toBeGreaterThanOrEqual(2);
  });
});
