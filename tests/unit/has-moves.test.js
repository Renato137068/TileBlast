import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function emptyGrid(w, h) {
  return Array.from({ length: w }, () => Array.from({ length: h }, () => ({ type: 0, sp: 0 })));
}

describe('TBLogic.hasMoves', () => {
  it('detecta par horizontal adjacente', () => {
    mountModule('tb-game-logic.js');
    const grid = emptyGrid(8, 8);
    grid[1][1].type = 2;
    grid[2][1].type = 2;
    expect(TBLogic.hasMoves(grid, 8, 8, 0)).toBe(true);
  });

  it('retorna false quando não há pares nem especiais', () => {
    mountModule('tb-game-logic.js');
    const palette = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3];
    const grid = emptyGrid(4, 4);
    let i = 0;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) grid[x][y].type = palette[i++];
    }
    expect(TBLogic.hasMoves(grid, 4, 4, 0)).toBe(false);
  });

  it('bloco especial conta como movimento', () => {
    mountModule('tb-game-logic.js');
    const grid = emptyGrid(4, 4);
    const palette = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3];
    let i = 0;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) grid[x][y].type = palette[i++];
    }
    grid[0][0] = { type: 1, sp: 2 };
    expect(TBLogic.hasMoves(grid, 4, 4, 0)).toBe(true);
  });
});

describe('TBLogic.findValidMove', () => {
  it('encontra grupo de 3 blocos', () => {
    mountModule('tb-game-logic.js');
    const grid = emptyGrid(8, 8);
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) grid[x][y].type = (x + y) % 6;
    }
    grid[2][2].type = 1;
    grid[2][3].type = 1;
    grid[3][2].type = 1;
    const move = TBLogic.findValidMove(grid, 8, 8, 0);
    expect(move).not.toBeNull();
    expect(move.size).toBeGreaterThanOrEqual(2);
  });

  it('retorna null sem grupos válidos', () => {
    mountModule('tb-game-logic.js');
    const palette = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3];
    const grid = emptyGrid(4, 4);
    let i = 0;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) grid[x][y].type = palette[i++];
    }
    expect(TBLogic.findValidMove(grid, 4, 4, 0)).toBeNull();
  });

  it('hasMoves alinhado com findValidMove', () => {
    mountModule('tb-game-logic.js');
    const grid = emptyGrid(6, 6);
    grid[0][0].type = 3;
    grid[1][0].type = 3;
    expect(TBLogic.findValidMove(grid, 6, 6, 0)).not.toBeNull();
    expect(TBLogic.hasMoves(grid, 6, 6, 0)).toBe(true);
  });
});
