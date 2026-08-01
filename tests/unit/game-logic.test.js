import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('TBLogic.calcGroupPts', () => {
  it('pontuação base sem combo', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcGroupPts(2)).toBe(20);
    expect(TBLogic.calcGroupPts(4)).toBe(40);
  });

  it('multiplicador 1.5x a partir de 5 blocos', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcGroupPts(5)).toBe(75);
  });

  it('multiplicador 2x a partir de 8 blocos', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcGroupPts(8)).toBe(160);
  });

  it('aplica scoreMult do evento', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcGroupPts(4, { scoreMult: 2 })).toBe(80);
  });

  it('evento comboBonus reduz limiar para 3', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.calcGroupPts(3, { comboBonus: true })).toBe(45);
  });
});

describe('TBLogic.getGroup', () => {
  it('flood-fill agrupa blocos adjacentes da mesma cor', () => {
    mountModule('tb-game-logic.js');
    const grid = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({ type: 0, sp: 0 }))
    );
    grid[2][2].type = 1;
    grid[2][3].type = 1;
    grid[3][2].type = 1;
    const g = TBLogic.getGroup(grid, 2, 2, 8, 8, 0);
    expect(g).toHaveLength(3);
  });

  it('não inclui blocos especiais', () => {
    mountModule('tb-game-logic.js');
    const grid = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({ type: 1, sp: 0 }))
    );
    grid[1][1].sp = 2;
    expect(TBLogic.getGroup(grid, 1, 1, 8, 8, 0)).toEqual([]);
  });
});

describe('TBLogic.findMatchingGroups', () => {
  it('lista grupos ≥ minSize e findLargestGroup pega o maior', () => {
    mountModule('tb-game-logic.js');
    const grid = Array.from({ length: 4 }, (_, x) =>
      Array.from({ length: 4 }, (_, y) => ({
        type: 100 + x * 4 + y,
        sp: 0,
        ice: 0,
        chain: 0,
        crate: 0,
      }))
    );
    // grupo 2 em (0,0)-(1,0)
    grid[0][0].type = 1;
    grid[1][0].type = 1;
    // grupo 3 em (2,2)-(2,3)-(3,2)
    grid[2][2].type = 2;
    grid[2][3].type = 2;
    grid[3][2].type = 2;
    expect(TBLogic.findMatchingGroups(grid, 4, 4, 0, 2)).toHaveLength(2);
    expect(TBLogic.findMatchingGroups(grid, 4, 4, 0, 3)).toHaveLength(1);
    const largest = TBLogic.findLargestGroup(grid, 4, 4, 0, 3);
    expect(largest).toHaveLength(3);
    expect(TBLogic.findLargestGroup(grid, 4, 4, 0, 4)).toBeNull();
  });
});

describe('TBLogic.createMemSave', () => {
  it('persiste e restaura progresso em nova sessão', () => {
    mountModule('tb-game-logic.js');
    const first = TBLogic.createMemSave('tb_unit', 5);
    first.sv({ coins: 120, unlocked: 3, lives: 4 });
    first.flushSave();
    const second = TBLogic.createMemSave('tb_unit', 5);
    const loaded = second.ld();
    expect(loaded.coins).toBe(120);
    expect(loaded.unlocked).toBe(3);
    expect(second.getLives()).toBe(4);
  });
});
