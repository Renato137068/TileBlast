import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function makeGrid(gw, gh, cell) {
  const grid = [];
  for (let x = 0; x < gw; x++) {
    const col = [];
    for (let y = 0; y < gh; y++) {
      col.push({ x, y, vx: x * cell, vy: y * cell, afy: y * cell, aty: y * cell, ad: 0 });
    }
    grid.push(col);
  }
  return grid;
}

function makeCfg(overrides = {}) {
  const GW = 4;
  const GH = 4;
  const CELL = 40;
  return {
    GW,
    GH,
    CELL,
    CHT: 5,
    grid: makeGrid(GW, GH, CELL),
    pops: [{}, {}],
    particles: [],
    floaters: [],
    shakeAmp: 0,
    shakeUntil: 0,
    ld: () => ({}),
    getActiveEvent: () => null,
    requestDraw: vi.fn(),
    ...overrides,
  };
}

describe('tb-fx', () => {
  /** @type {any} */
  let F;

  beforeEach(() => {
    delete globalThis.TBFx;
    delete globalThis.TBJuice;
    delete globalThis.__lowEndDevice;
    mountModule('tb-game-logic.js');
    mountModule('tb-fx.js');
    F = globalThis.TBFx;
  });

  it('litHex clareia a cor em direção ao branco', () => {
    expect(F.litHex('#000000', 0)).toBe('rgb(0,0,0)');
    expect(F.litHex('#000000', 1)).toBe('rgb(255,255,255)');
    expect(F.litHex('#204080', 0.5)).toBe('rgb(143,159,191)');
  });

  it('viewportWidth usa o menor entre visualViewport e clientWidth', () => {
    expect(typeof F.viewportWidth()).toBe('number');
    expect(F.viewportWidth()).not.toBeNaN();
  });

  it('spawnFloater posiciona no centro da célula', () => {
    const cfg = makeCfg();
    F.init(cfg);
    F.spawnFloater('+120', 1, 2);
    expect(cfg.floaters).toHaveLength(1);
    expect(cfg.floaters[0]).toMatchObject({ text: '+120', cx: 60, cy: 100, tier: 0 });
  });

  it('spawnFloater marca big para textos longos e respeita override', () => {
    const cfg = makeCfg();
    F.init(cfg);
    F.spawnFloater('COMBO XL', 0, 0);
    F.spawnFloater('+5', 0, 0, '#fff', { big: true, dur: 1500, tier: 3 });
    expect(cfg.floaters[0].big).toBe(true);
    expect(cfg.floaters[1]).toMatchObject({ big: true, dur: 1500, tier: 3 });
  });

  it('spawnParticles gera partículas por célula do grupo', () => {
    const cfg = makeCfg();
    F.init(cfg);
    F.spawnParticles(
      [
        [0, 0],
        [1, 0],
      ],
      '#ff0000'
    );
    expect(cfg.particles.length).toBeGreaterThanOrEqual(12);
    expect(cfg.particles.length).toBeLessThanOrEqual(18);
  });

  it('spawnParticles delega ao TBJuice.burst quando disponível', () => {
    const burst = vi.fn();
    globalThis.TBJuice = { burst, init: vi.fn(), setCell: vi.fn(), shake: vi.fn() };
    mountModule('tb-fx.js');
    const fx = globalThis.TBFx;
    const cfg = makeCfg();
    fx.init(cfg);
    fx.spawnParticles(
      [
        [0, 0],
        [1, 0],
      ],
      '#ff0000'
    );
    expect(burst).toHaveBeenCalled();
    expect(cfg.particles).toHaveLength(0); // não polui o array legado
    delete globalThis.TBJuice;
  });

  it('grupo grande adiciona anel de partículas brancas', () => {
    const cfg = makeCfg();
    F.init(cfg);
    const grp = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
    ];
    F.spawnParticles(grp, '#00ff00');
    expect(cfg.particles.filter((p) => p.color === '#fff')).toHaveLength(12);
  });

  it('partículas ficam limitadas pelo cap (menor em low-end)', () => {
    globalThis.__lowEndDevice = true;
    const cfg = makeCfg();
    F.init(cfg);
    for (let i = 0; i < 30; i++) F.spawnParticles([[0, 0]], '#123456');
    expect(cfg.particles.length).toBe(80);
    delete globalThis.__lowEndDevice;
  });

  it('relayoutGridBlocks reposiciona blocos parados e limpa pops', () => {
    const cfg = makeCfg();
    F.init(cfg);
    cfg.CELL = 50;
    F.relayoutGridBlocks();
    expect(cfg.grid[2][3].vx).toBe(100);
    expect(cfg.grid[2][3].vy).toBe(150);
    expect(cfg.pops).toHaveLength(0);
  });

  it('relayoutGridBlocks só ajusta destino de blocos em animação', () => {
    const cfg = makeCfg();
    cfg.grid[0][1].ad = 1;
    cfg.grid[0][1].vy = 999;
    F.init(cfg);
    cfg.CELL = 50;
    F.relayoutGridBlocks();
    expect(cfg.grid[0][1].vy).toBe(999);
    expect(cfg.grid[0][1].aty).toBe(50);
  });

  it('relayoutGridBlocks ignora grid vazio', () => {
    const cfg = makeCfg({ grid: [] });
    F.init(cfg);
    expect(() => F.relayoutGridBlocks()).not.toThrow();
  });

  it('layoutBoard não roda sem canvas', () => {
    const cfg = makeCfg();
    F.init(cfg);
    expect(() => F.layoutBoard()).not.toThrow();
    expect(cfg.requestDraw).not.toHaveBeenCalled();
  });

  it('triggerShake aplica amplitude e duração no estado', () => {
    const cfg = makeCfg();
    F.init(cfg);
    F.triggerShake(9, 300);
    expect(cfg.shakeAmp).toBe(9);
    expect(cfg.shakeUntil).toBeGreaterThan(0);
  });

  it('triggerShake é ignorado com reduce motion no save', () => {
    const cfg = makeCfg({ ld: () => ({ reduceMotion: true }) });
    F.init(cfg);
    F.triggerShake(9, 300);
    expect(cfg.shakeAmp).toBe(0);
  });

  it('triggerShake delega ao TBJuice quando presente', () => {
    const shake = vi.fn();
    globalThis.TBJuice = { shake, init: vi.fn(), setCell: vi.fn() };
    mountModule('tb-fx.js');
    const fx = globalThis.TBFx;
    const cfg = makeCfg();
    fx.init(cfg);
    fx.triggerShake(4, 100);
    expect(shake).toHaveBeenCalledWith(4, 100, undefined);
    expect(cfg.shakeAmp).toBe(0);
    delete globalThis.TBJuice;
  });

  it('calcGroupPts delega para TBLogic', () => {
    const cfg = makeCfg();
    F.init(cfg);
    const pts = F.calcGroupPts(5);
    expect(typeof pts).toBe('number');
    expect(pts).toBeGreaterThan(0);
  });
});
