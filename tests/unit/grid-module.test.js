import { beforeEach, describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const SP = { NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 };

/** cfg mínimo que o TBGrid espera receber do boot. */
function makeCfg(level = {}) {
  const cfg = {
    TC: 5,
    GW: 8,
    GH: 9,
    CELL: 40,
    SP,
    grid: [],
    pops: [],
    coverGrid: null,
    kbFocus: null,
    drawCalls: 0,
    shuffles: 0,
    movesAvailable: true,
    _lv: () => level,
    isBlocked: (b) => !!(b && (b.ice || b.crate || b.chain)),
    hasMoves: () => cfg.movesAvailable,
    shuffleTypes: () => {
      cfg.shuffles++;
    },
    requestDraw: () => {
      cfg.drawCalls++;
    },
  };
  return cfg;
}

function countCells(cfg, pred) {
  let n = 0;
  for (let x = 0; x < cfg.GW; x++) for (let y = 0; y < cfg.GH; y++) if (pred(cfg.grid[x][y])) n++;
  return n;
}

describe('tb-grid', () => {
  /** @type {any} */
  let G;

  beforeEach(() => {
    delete globalThis.TBGrid;
    mountModule('tb-game-logic.js');
    mountModule('tb-grid.js');
    G = globalThis.TBGrid;
  });

  it('buildGrid preenche GW x GH e pede redraw', () => {
    const cfg = makeCfg();
    G.init(cfg);
    G.buildGrid(123);
    expect(cfg.grid.length).toBe(cfg.GW);
    expect(cfg.grid[0].length).toBe(cfg.GH);
    expect(cfg.drawCalls).toBe(1);
    expect(cfg.kbFocus).toEqual({ x: 0, y: 0, active: false });
  });

  it('mesma seed gera o mesmo tabuleiro', () => {
    const a = makeCfg();
    G.init(a);
    G.buildGrid(4242);
    const snapA = a.grid.map((col) => col.map((b) => b.type).join('')).join('|');

    const b = makeCfg();
    G.init(b);
    G.buildGrid(4242);
    const snapB = b.grid.map((col) => col.map((c) => c.type).join('')).join('|');

    expect(snapB).toBe(snapA);
  });

  it('seeds diferentes geram tabuleiros diferentes', () => {
    const a = makeCfg();
    G.init(a);
    G.buildGrid(1);
    const snapA = a.grid.map((col) => col.map((c) => c.type).join('')).join('|');

    const b = makeCfg();
    G.init(b);
    G.buildGrid(2);
    const snapB = b.grid.map((col) => col.map((c) => c.type).join('')).join('|');

    expect(snapB).not.toBe(snapA);
  });

  it('embaralha até haver jogada disponível (com teto de tentativas)', () => {
    const cfg = makeCfg();
    cfg.movesAvailable = false;
    G.init(cfg);
    G.buildGrid(7);
    expect(cfg.shuffles).toBe(20);
  });

  it('mkB posiciona o bloco em pixels e ok() valida limites', () => {
    const cfg = makeCfg();
    G.init(cfg);
    const b = G.mkB(2, 3, 1);
    expect(b).toMatchObject({ x: 2, y: 3, type: 1, sp: SP.NONE, vx: 80, vy: 120 });
    expect(G.ok(0, 0)).toBe(true);
    expect(G.ok(-1, 0)).toBe(false);
    expect(G.ok(0, cfg.GH)).toBe(false);
  });

  it('rnd() fica no intervalo de tipos', () => {
    const cfg = makeCfg();
    G.init(cfg);
    G.setGameSeed(9);
    for (let i = 0; i < 200; i++) {
      const v = G.rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(cfg.TC);
    }
  });

  it('orderedCells cobre o tabuleiro em todos os padrões', () => {
    const cfg = makeCfg();
    G.init(cfg);
    G.setGameSeed(3);
    for (const pattern of ['band', 'wall', 'top', 'lake', 'scatter']) {
      const cells = G.orderedCells(pattern);
      const uniq = new Set(cells.map(([x, y]) => `${x},${y}`));
      expect(uniq.size, pattern).toBe(cfg.GW * cfg.GH);
    }
  });

  it('placeObstacles respeita a quantidade do objetivo', () => {
    const cfg = makeCfg({
      objectives: [
        { type: 'ice', target: 6 },
        { type: 'crate', target: 4 },
        { type: 'collect', target: 3 },
      ],
      setup: { iceHp: 2, crateHp: 1 },
    });
    G.init(cfg);
    G.buildGrid(11);
    expect(countCells(cfg, (b) => b.ice > 0)).toBe(6);
    expect(countCells(cfg, (b) => b.crate > 0)).toBe(4);
    expect(countCells(cfg, (b) => b.collect)).toBe(3);
  });

  it('objetivo cover cria coverGrid marcado', () => {
    const cfg = makeCfg({ objectives: [{ type: 'cover', target: 5 }] });
    G.init(cfg);
    G.buildGrid(12);
    expect(cfg.coverGrid.length).toBe(cfg.GW);
    let marked = 0;
    for (const col of cfg.coverGrid) for (const v of col) if (v) marked++;
    expect(marked).toBe(5);
  });

  it('ensureColorSupply garante blocos suficientes da cor pedida', () => {
    const cfg = makeCfg({ objectives: [{ type: 'color', color: 3, target: 8 }] });
    G.init(cfg);
    G.buildGrid(13);
    expect(countCells(cfg, (b) => b.type === 3)).toBeGreaterThanOrEqual(8);
  });
});
