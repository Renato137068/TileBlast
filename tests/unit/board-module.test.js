import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const SP = { NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 };

function makeCtx() {
  const gradient = { addColorStop: vi.fn() };
  /** @type {Record<string, any>} */
  const base = {
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    measureText: vi.fn(() => ({ width: 10 })),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string') {
        const fn = vi.fn();
        target[prop] = fn;
        return fn;
      }
      return undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

describe('tb-board', () => {
  /** @type {any} */
  let B;
  /** @type {any} */
  let cfg;
  /** @type {any} */
  let ctx;

  beforeEach(() => {
    delete globalThis.TBBoard;
    delete globalThis.TBState;
    delete globalThis.TBJuice;
    globalThis.TBState = { isInfiniteMode: false, isDailyPuzzleMode: false };
    globalThis.TBFeatures = { isColorBlind: () => false };
    globalThis.TBRoadmap = null;
    globalThis.requestAnimationFrame = vi.fn(() => 1);

    mountModule('tb-juice.js');
    globalThis.TBJuice.init({ reduceMotion: () => false });
    globalThis.TBJuice.setCell(40);

    ctx = makeCtx();
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 360;
    canvas.getContext = () => ctx;

    const GW = 4;
    const GH = 4;
    const grid = Array.from({ length: GW }, (_, x) =>
      Array.from({ length: GH }, (_, y) => ({
        type: (x + y) % 4,
        sp: SP.NONE,
        x,
        y,
        ice: 0,
        crate: 0,
        chain: 0,
        cover: 0,
        collect: 0,
      }))
    );

    cfg = {
      GW,
      GH,
      CELL: 40,
      BPX: 160,
      BPY: 160,
      SP,
      COLORS: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f'],
      grid,
      pops: [],
      floaters: [],
      particles: [],
      coverGrid: null,
      hoverCells: new Set(),
      hoverSz: 0,
      kbFocus: { x: 0, y: 0, active: false },
      rafActive: false,
      ripple: null,
      shake: null,
      canvas,
      ctx,
      board: canvas,
      tutHighlight: null,
      skinId: null,
      reduceMotion: () => false,
      isColorBlind: () => false,
      litHex: (c) => c,
      darkHex: (c) => c,
      gatherBlast: () => ({ cells: [] }),
      spawnParticles: vi.fn(),
      triggerShake: vi.fn(),
      Sound: { boardClear: vi.fn() },
      ICON: ['●', '▲', '■', '★'],
      _t: (_k, f) => f,
      movesLeft: 20,
      over: false,
      shakeUntil: 0,
      sGame: Object.assign(document.createElement('div'), { classList: { contains: () => false } }),
      _bgCache: { w: 160, h: 160, canvas: document.createElement('canvas') },
    };

    mountModule('tb-board.js', {
      requestAnimationFrame: globalThis.requestAnimationFrame,
      performance: globalThis.performance,
      Math,
    });
    B = globalThis.TBBoard;
    B.init(cfg);
  });

  it('init + isAnimating false sem pops/particles', () => {
    expect(B.isAnimating()).toBe(false);
  });

  it('requestDraw agenda um frame quando idle', () => {
    B.requestDraw();
    expect(cfg.rafActive).toBe(true);
    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('draw limpa e desenha o tabuleiro sem lançar', () => {
    B.draw();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(
      ctx.beginPath.mock.calls.length + ctx.fill.mock.calls.length + ctx.ellipse.mock.calls.length
    ).toBeGreaterThan(0);
  });

  it('rebuild de fundo usa cor/tema do mundo em TBState.playTheme', () => {
    globalThis.TBState.playTheme = { color: '#4ecb71', theme: 'garden', bgTop: null, bgBot: null };
    cfg._bgCache = null;
    // força rebuild via draw (invalidate key)
    const fakeBg = document.createElement('canvas');
    const bgCtx = {
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      quadraticCurveTo: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    };
    // jsdom canvas getContext may return null — stub createElement path inside _buildBgCache
    const orig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === 'canvas') {
        el.getContext = () => bgCtx;
        Object.defineProperty(el, 'width', { writable: true, value: 160 });
        Object.defineProperty(el, 'height', { writable: true, value: 160 });
      }
      return el;
    });
    B.draw();
    expect(bgCtx.createLinearGradient).toHaveBeenCalled();
    expect(cfg._bgCache).toBeTruthy();
    expect(cfg._bgCache.key).toContain('#4ecb71');
    document.createElement.mockRestore();
  });

  it('boardClearFinale chama done imediatamente sem especiais', () => {
    const done = vi.fn();
    B.boardClearFinale(done);
    expect(done).toHaveBeenCalled();
  });

  it('boardClearFinale em modo infinito pula animação', () => {
    globalThis.TBState.isInfiniteMode = true;
    const done = vi.fn();
    cfg.grid[0][0].sp = SP.BOMB;
    B.boardClearFinale(done);
    expect(done).toHaveBeenCalled();
  });

  it('boardClearFinale sem cfg só chama done', () => {
    B.init(null);
    const done = vi.fn();
    B.boardClearFinale(done);
    expect(done).toHaveBeenCalled();
  });
});
