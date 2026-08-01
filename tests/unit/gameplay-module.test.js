import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const SP = { NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 };

function cell(type, extra = {}) {
  return { type, sp: SP.NONE, ice: 0, crate: 0, chain: 0, collect: 0, x: 0, y: 0, ...extra };
}

function makeGrid(w, h, fill) {
  return Array.from({ length: w }, (_, x) =>
    Array.from({ length: h }, (_, y) => {
      const b = fill(x, y);
      if (b) {
        b.x = x;
        b.y = y;
      }
      return b;
    })
  );
}

function makeCfg(overrides = {}) {
  const GW = 4;
  const GH = 4;
  const grid = makeGrid(GW, GH, (x, y) => cell((x + y) % 5));
  // par adjacente em (1,1)-(2,1)
  grid[1][1] = cell(7, { x: 1, y: 1 });
  grid[2][1] = cell(7, { x: 2, y: 1 });

  const cfg = {
    GW,
    GH,
    CELL: 40,
    SP,
    PPB: 10,
    BOMB_T: 4,
    ROCKET_T: 6,
    RAINBOW_T: 8,
    CASCADE_MAX: 8,
    CASCADE_MIN: 3,
    CASCADE_SCORE_MULT: 0.5,
    CHT: 8,
    CMT: 5,
    CHM: 2.5,
    CMM: 1.8,
    COLORS: ['#f00', '#0f0', '#00f', '#ff0', '#f0f'],
    grid,
    coverGrid: Array.from({ length: GW }, () => Array(GH).fill(false)),
    pops: [],
    floaters: [],
    colorProgress: {},
    obsProgress: {},
    score: 0,
    movesLeft: 20,
    busy: false,
    over: false,
    pendingPU: '',
    canvas: document.createElement('canvas'),
    noMvTimer: 0,
    ok: (x, y) => x >= 0 && y >= 0 && x < GW && y < GH,
    _lv: () => ({
      objectives: [
        { type: 'color', color: 7, target: 10 },
        { type: 'cover', target: 3 },
        { type: 'ice', target: 2 },
      ],
    }),
    _rand: () => 0.5,
    rnd: () => 0.5,
    _gameRng: Math.random,
    _t: (_k, f) => f,
    ld: () => ({ stats: {} }),
    sv: vi.fn(),
    calcGroupPts: (n) => n * 10,
    mkB: (x, y, type, sp) => cell(type, { x, y, sp }),
    spawnParticles: vi.fn(),
    spawnFloater: vi.fn(),
    requestDraw: vi.fn(),
    updateHUD: vi.fn(),
    checkWin: () => false,
    resolveWin: vi.fn(),
    resolveLoss: vi.fn(),
    updateMissionProgress: vi.fn(),
    updateChallengeProgress: vi.fn(),
    getActiveEvent: () => ({}),
    litHex: (c) => c,
    Sound: {
      comboStep: vi.fn(),
      tension: vi.fn(),
      shuffle: vi.fn(),
      click: vi.fn(),
      special: vi.fn(),
      blast: vi.fn(),
    },
    Haptic: { combo: vi.fn(), tap: vi.fn(), light: vi.fn() },
    triggerShake: vi.fn(),
    addXP: vi.fn(),
    XP_DEFS: { combo: 5 },
    comboTimer: 0,
    ...overrides,
  };
  return cfg;
}

describe('tb-gameplay', () => {
  /** @type {any} */
  let GP;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBGameplay;
    delete globalThis.isBlocked;
    delete globalThis.getGroup;
    document.body.innerHTML = `<div id="combo"></div><div id="no-mv"></div><div id="pu-bar"></div>`;
    mountModule('tb-game-logic.js');
    mountModule('tb-gameplay.js');
    GP = globalThis.TBGameplay;
    cfg = makeCfg();
    GP.init(cfg);
  });

  it('isBlocked reconhece gelo/caixa/corrente/coleta', () => {
    expect(globalThis.isBlocked(null)).toBe(false);
    expect(globalThis.isBlocked(cell(1))).toBe(false);
    expect(globalThis.isBlocked(cell(1, { ice: 1 }))).toBe(true);
    expect(globalThis.isBlocked(cell(1, { crate: 1 }))).toBe(true);
    expect(globalThis.isBlocked(cell(1, { chain: 1 }))).toBe(true);
    expect(globalThis.isBlocked(cell(1, { collect: 1 }))).toBe(true);
  });

  it('getGroup encontra adjacentes da mesma cor e ignora especiais/bloqueados', () => {
    const g = GP.getGroup(1, 1);
    expect(g).toEqual(
      expect.arrayContaining([
        [1, 1],
        [2, 1],
      ])
    );
    expect(g).toHaveLength(2);

    cfg.grid[1][1].sp = SP.BOMB;
    expect(GP.getGroup(1, 1)).toEqual([]);

    cfg.grid[1][1].sp = SP.NONE;
    cfg.grid[1][1].ice = 1;
    expect(GP.getGroup(1, 1)).toEqual([]);
  });

  it('hasMoves true com par e false sem movimentos', () => {
    expect(GP.hasMoves()).toBe(true);
    for (let x = 0; x < cfg.GW; x++) {
      for (let y = 0; y < cfg.GH; y++) {
        cfg.grid[x][y] = cell((x * 3 + y) % 6, { x, y });
      }
    }
    // checker sem pares adjacentes iguais em 4x4 com 6 cores
    let i = 0;
    const palette = [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2];
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 4; y++) cfg.grid[x][y] = cell(palette[i++], { x, y });
    expect(GP.hasMoves()).toBe(false);
  });

  it('addScore aplica pontos; combo DOM só com multiplicador > 1', () => {
    cfg.addXP = vi.fn();
    cfg.XP_DEFS = { combo: 5 };
    cfg.Sound.blast = vi.fn();
    GP.addScore(2, 7);
    expect(cfg.score).toBeGreaterThan(0);
    // grupo grande → multiplicador de combo
    GP.addScore(8, 7);
    expect(document.getElementById('combo').textContent).toContain('Combo');
    expect(cfg.addXP).toHaveBeenCalled();
  });

  it('bumpObs e clearCoverAt atualizam progresso de objetivos', () => {
    cfg.coverGrid[0][0] = true;
    globalThis.clearCoverAt(0, 0);
    expect(cfg.coverGrid[0][0]).toBe(false);
    expect(cfg.obsProgress.cover).toBe(1);
    globalThis.bumpObs('ice', 2);
    expect(cfg.obsProgress.ice).toBe(2);
  });

  it('neededColors lista cores ainda abaixo do alvo', () => {
    cfg.colorProgress = { 7: 2 };
    expect(globalThis.neededColors()).toEqual([7]);
    cfg.colorProgress[7] = 10;
    expect(globalThis.neededColors()).toEqual([]);
  });

  it('applyGravity faz blocos caírem para baixo e reabastece topo', () => {
    cfg.grid[0][0] = cell(1, { x: 0, y: 0 });
    cfg.grid[0][1] = null;
    cfg.grid[0][2] = null;
    cfg.grid[0][3] = null;
    GP.applyGravity();
    expect(cfg.grid[0][3]).toBeTruthy();
    expect(cfg.grid[0][3].type).toBe(1);
    // células vazias no topo são reabastecidas (mercy refill)
    expect(cfg.grid[0].every(Boolean)).toBe(true);
    expect(cfg.requestDraw).toHaveBeenCalled();
  });

  it('removeGroup limpa células, pontua e pode criar especial', () => {
    const grp = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ];
    for (const [x, y] of grp) cfg.grid[x][y] = cell(3, { x, y });
    GP.removeGroup(grp);
    expect(cfg.spawnParticles).toHaveBeenCalled();
    expect(cfg.updateMissionProgress).toHaveBeenCalledWith('blocks_popped', 4);
    // BOMB_T=4 → especial bomba no centro
    const remaining = cfg.grid.flat().filter(Boolean);
    expect(remaining.some((b) => b.sp === SP.BOMB)).toBe(true);
  });

  it('handleClick ignora quando busy/over e treme em grupo < 2', () => {
    cfg.busy = true;
    GP.handleClick(1, 1);
    expect(cfg.score).toBe(0);

    cfg.busy = false;
    cfg.over = true;
    GP.handleClick(1, 1);
    expect(cfg.score).toBe(0);

    cfg.over = false;
    const alone = cell(9, { x: 0, y: 0 });
    cfg.grid[0][0] = alone;
    cfg.grid[1][0] = cell(1, { x: 1, y: 0 });
    expect(() => GP.handleClick(0, 0)).not.toThrow();
  });

  it('showNoMv exibe overlay e agenda hide', () => {
    vi.useFakeTimers();
    delete globalThis.TBGameplay;
    mountModule('tb-game-logic.js');
    mountModule('tb-gameplay.js');
    GP = globalThis.TBGameplay;
    cfg = makeCfg();
    GP.init(cfg);
    GP.showNoMv();
    expect(document.getElementById('no-mv').classList.contains('show')).toBe(true);
    vi.advanceTimersByTime(1300);
    expect(document.getElementById('no-mv').classList.contains('show')).toBe(false);
    vi.useRealTimers();
  });

  it('settleBoard cascata limpa grupos ≥ CASCADE_MIN após gravidade sem gastar movimento extra', () => {
    vi.useFakeTimers();
    // Remonta após fake timers: o sandbox captura setTimeout no load.
    delete globalThis.TBGameplay;
    mountModule('tb-game-logic.js');
    mountModule('tb-gameplay.js');
    GP = globalThis.TBGameplay;
    cfg = makeCfg({
      CASCADE_MAX: 3,
      CASCADE_MIN: 3,
      CASCADE_SCORE_MULT: 0.5,
      BOMB_T: 99,
      ROCKET_T: 99,
      RAINBOW_T: 99,
    });
    // cores únicas (100+) + trio adjacente (cascata exige ≥3)
    cfg.grid = makeGrid(cfg.GW, cfg.GH, (x, y) => cell(100 + x * cfg.GH + y, { x, y }));
    cfg.grid[1][cfg.GH - 1] = cell(4, { x: 1, y: cfg.GH - 1 });
    cfg.grid[1][cfg.GH - 2] = cell(4, { x: 1, y: cfg.GH - 2 });
    cfg.grid[1][cfg.GH - 3] = cell(4, { x: 1, y: cfg.GH - 3 });
    GP.init(cfg);

    const movesBefore = cfg.movesLeft;
    const scoreBefore = cfg.score;
    const after = vi.fn();
    GP.settleBoard(after);
    for (let i = 0; i < 50; i++) vi.advanceTimersByTime(500);
    expect(after).toHaveBeenCalled();
    expect(cfg.movesLeft).toBe(movesBefore);
    expect(cfg.score).toBeGreaterThan(scoreBefore);
    // 50% da pontuação base: 3 * PPB * 0.5 = 15 (sem combo)
    expect(cfg.score).toBe(scoreBefore + Math.round(3 * cfg.PPB * 0.5));
    vi.useRealTimers();
  });

  it('dica de ociosidade destaca um grupo após o tempo de idle', () => {
    vi.useFakeTimers();
    delete globalThis.TBGameplay;
    mountModule('tb-game-logic.js');
    mountModule('tb-gameplay.js');
    GP = globalThis.TBGameplay;
    const sGame = document.createElement('div');
    sGame.classList.add('active');
    cfg = makeCfg({ sGame });
    GP.init(cfg);

    GP.noteActivity();
    vi.advanceTimersByTime(7600);
    // par 7 em (1,1)-(2,1) do makeCfg deve estar em hintCells
    expect(cfg.hintCells.size).toBeGreaterThanOrEqual(2);
    expect(cfg.hintCells.has('1,1')).toBe(true);
    expect(cfg.requestDraw).toHaveBeenCalled();

    GP.clearIdleHint();
    expect(cfg.hintCells.size).toBe(0);
    vi.useRealTimers();
  });

  it('removeGroup em cascata não cria especial e aplica score reduzido', () => {
    const grp = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ];
    for (const [x, y] of grp) cfg.grid[x][y] = cell(3, { x, y });
    cfg.CASCADE_SCORE_MULT = 0.5;
    cfg.BOMB_T = 4;
    GP.removeGroup(grp, { cascade: true });
    const remaining = cfg.grid.flat().filter(Boolean);
    expect(remaining.some((b) => b.sp === SP.BOMB)).toBe(false);
    expect(cfg.score).toBe(Math.round(4 * cfg.PPB * 0.5));
  });
});
