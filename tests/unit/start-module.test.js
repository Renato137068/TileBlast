import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

/** HUD mínimo que o tb-start manipula. */
function hudDom() {
  document.body.innerHTML = `
    <div id="hud-lv"></div>
    <div id="hud-score"></div>
    <div id="hud-mv"></div>
    <div id="hud-lives"></div>
    <div id="hud-coins"></div>
    <div id="hud-obj"></div>
    <div id="board-w"><div id="prog-w"><div id="prog-b"></div></div></div>
    <div id="cd"><div id="cd-n"></div><div id="cd-ph"></div><div id="cd-info"></div></div>
  `;
}

const LEVEL = {
  world: 'Floresta',
  name: 'Início',
  moves: 20,
  objectives: [
    { type: 'score', target: 1000 },
    { type: 'color', color: 1, target: 10 },
  ],
};

function makeCfg(overrides = {}) {
  return {
    score: 500,
    movesLeft: 10,
    over: false,
    _prevHudScore: 0,
    colorProgress: { 1: 5 },
    obsProgress: {},
    ICONS: ['🔴', '🔵', '🟢'],
    COLORS: ['#f00', '#00f', '#0f0'],
    OBS_ICON: { ice: '🧊' },
    _t: (_k, f) => f,
    _shopLocale: () => 'pt-BR',
    getLives: () => 3,
    getCoins: () => 250,
    updateMissionProgress: vi.fn(),
    Sound: {
      star: vi.fn(),
      objComplete: vi.fn(),
      click: vi.fn(),
      lose: vi.fn(),
      nearMiss: vi.fn(),
    },
    Haptic: { medium: vi.fn() },
    ...overrides,
  };
}

describe('tb-start — HUD e objetivos', () => {
  /** @type {any} */
  let S;

  beforeEach(() => {
    delete globalThis.TBStart;
    delete globalThis.TBState;
    delete globalThis.TBJuice;
    hudDom();
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-analytics.js');
    mountModule('tb-economy.js');
    mountModule('tb-start.js');
    globalThis.TBState.LEVELS = [LEVEL];
    globalThis.TBState.lvIdx = 0;
    globalThis.TBState.isInfiniteMode = false;
    globalThis.TBState.isDailyPuzzleMode = false;
    S = globalThis.TBStart;
  });

  it('_lv devolve a fase da campanha por padrão', () => {
    S.init(makeCfg());
    expect(S._lv()).toBe(LEVEL);
  });

  it('_lv prioriza daily puzzle, depois time challenge, depois infinito', () => {
    const dailyLv = { name: 'daily' };
    const timeLv = { name: 'time' };
    const infLv = { name: 'inf' };
    S.init(
      makeCfg({ _dailyLv: dailyLv, _timeLv: timeLv, _infLv: infLv, isTimeChallengeMode: true })
    );

    globalThis.TBState.isDailyPuzzleMode = true;
    expect(S._lv()).toBe(dailyLv);

    globalThis.TBState.isDailyPuzzleMode = false;
    expect(S._lv()).toBe(timeLv);

    S.init(makeCfg({ _infLv: infLv }));
    globalThis.TBState.isInfiniteMode = true;
    expect(S._lv()).toBe(infLv);
  });

  it('updateHUD escreve fase, score, vidas e moedas', () => {
    S.init(makeCfg());
    S.updateHUD();
    expect(document.getElementById('hud-lv').textContent).toBe('Floresta · Fase 1');
    expect(document.getElementById('hud-score').textContent).toBe('500');
    expect(document.getElementById('hud-lives').textContent).toBe('3');
    expect(document.getElementById('hud-coins').textContent).toBe('250');
  });

  it('updateHUD marca perigo conforme jogadas restantes', () => {
    S.init(makeCfg({ movesLeft: 4 }));
    S.updateHUD();
    const mv = document.getElementById('hud-mv');
    expect(mv.textContent).toBe('⚠️4');
    expect(mv.classList.contains('danger')).toBe(true);
    expect(document.getElementById('board-w').classList.contains('board-danger')).toBe(true);
  });

  it('updateHUD marca estado crítico com 3 jogadas ou menos', () => {
    S.init(makeCfg({ movesLeft: 2 }));
    S.updateHUD();
    const mv = document.getElementById('hud-mv');
    expect(mv.textContent).toBe('🔥2');
    expect(mv.classList.contains('critical')).toBe(true);
    expect(document.getElementById('board-w').classList.contains('board-critical')).toBe(true);
  });

  it('barra de progresso reflete o avanço médio dos objetivos', () => {
    S.init(makeCfg());
    S.updateHUD();
    const w = parseFloat(document.getElementById('prog-b').style.width);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(100);
    expect(document.getElementById('prog-w').getAttribute('aria-valuenow')).toBe(
      String(Math.round(w))
    );
  });

  it('_refreshObjDisplay renderiza uma linha por objetivo', () => {
    S.init(makeCfg());
    S._refreshObjDisplay();
    expect(document.querySelectorAll('#hud-obj .obj-row')).toHaveLength(2);
    expect(document.querySelectorAll('#hud-obj .obj-done')).toHaveLength(0);
  });

  it('_refreshObjDisplay marca objetivo concluído e toca o som uma vez', () => {
    const cfg = makeCfg({ score: 5000, colorProgress: { 1: 99 } });
    S.init(cfg);
    S._refreshObjDisplay();
    expect(document.querySelectorAll('#hud-obj .obj-done')).toHaveLength(2);
    expect(cfg.Sound.objComplete).toHaveBeenCalledTimes(1);

    cfg.Sound.objComplete.mockClear();
    S._refreshObjDisplay();
    expect(cfg.Sound.objComplete).not.toHaveBeenCalled();
  });
});

describe('tb-start — vitória e derrota', () => {
  /** @type {any} */
  let S;

  beforeEach(() => {
    delete globalThis.TBStart;
    delete globalThis.TBState;
    hudDom();
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-analytics.js');
    mountModule('tb-economy.js');
    mountModule('tb-start.js');
    globalThis.TBState.LEVELS = [LEVEL];
    globalThis.TBState.lvIdx = 0;
    globalThis.TBState.isInfiniteMode = false;
    globalThis.TBState.isDailyPuzzleMode = false;
    S = globalThis.TBStart;
  });

  it('checkWin exige todos os objetivos', () => {
    S.init(makeCfg());
    expect(S.checkWin()).toBe(false);
    S.init(makeCfg({ score: 1000, colorProgress: { 1: 10 } }));
    expect(S.checkWin()).toBe(true);
  });

  it('calcStars entrega mais estrelas com folga de jogadas e score', () => {
    S.init(makeCfg({ score: 3000, movesLeft: 15 }));
    const alto = S.calcStars();
    S.init(makeCfg({ score: 1000, movesLeft: 0 }));
    const baixo = S.calcStars();
    expect(alto).toBeGreaterThanOrEqual(baixo);
    expect(alto).toBeLessThanOrEqual(3);
  });

  it('_objCompletion usa o objetivo mais atrasado', () => {
    S.init(makeCfg({ score: 1000, colorProgress: { 1: 0 } }));
    expect(S._objCompletion()).toBe(0);
  });

  it('resolveLoss perde vida e mostra resultado', () => {
    globalThis.TBState.LEVELS = Array.from({ length: 21 }, () => LEVEL);
    globalThis.TBState.lvIdx = 20;
    const loseLive = vi.fn();
    const showResult = vi.fn();
    S.init(makeCfg({ loseLive, showResult }));
    S.resolveLoss();
    expect(loseLive).toHaveBeenCalled();
    expect(showResult).toHaveBeenCalledWith(false, 0);
  });

  it('resolveLoss em modo infinito encerra a run sem perder vida', () => {
    globalThis.TBState.isInfiniteMode = true;
    const loseLive = vi.fn();
    const _infGameOver = vi.fn();
    S.init(makeCfg({ loseLive, _infGameOver, showResult: vi.fn() }));
    S.resolveLoss();
    expect(_infGameOver).toHaveBeenCalled();
    expect(loseLive).not.toHaveBeenCalled();
  });

  it('near miss toca som específico', () => {
    globalThis.TBState.LEVELS = Array.from({ length: 21 }, () => LEVEL);
    globalThis.TBState.lvIdx = 20;
    const cfg = makeCfg({
      score: 990,
      colorProgress: { 1: 10 },
      loseLive: vi.fn(),
      showResult: vi.fn(),
    });
    S.init(cfg);
    S.resolveLoss();
    expect(cfg._lastLossNear).toBe(true);
    expect(cfg.Sound.nearMiss).toHaveBeenCalled();
  });
});

describe('tb-start — countdown', () => {
  beforeEach(() => {
    delete globalThis.TBStart;
    delete globalThis.TBState;
    hudDom();
  });

  it('abre em 3, bloqueia o board e libera ao final chamando onReady', async () => {
    // Fake timers antes do mount: o sandbox captura setTimeout no load.
    vi.useFakeTimers();
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-analytics.js');
    mountModule('tb-economy.js');
    mountModule('tb-start.js');
    globalThis.TBState.LEVELS = [LEVEL];
    globalThis.TBState.lvIdx = 0;
    const S = globalThis.TBStart;

    const cfg = makeCfg({
      grid: [],
      kbFocus: { x: 0, y: 0 },
      announce: vi.fn(),
      describeCell: vi.fn(),
    });
    S.init(cfg);
    const onReady = vi.fn();
    S.showCountdown(LEVEL, onReady);

    expect(document.getElementById('cd').classList.contains('show')).toBe(true);
    expect(document.getElementById('cd-n').textContent).toBe('3');
    expect(document.getElementById('cd-ph').textContent).toBe('Fase 1: Início');
    expect(document.querySelectorAll('#cd-info .cd-chip')).toHaveLength(2);
    expect(cfg.busy).toBe(true);

    await vi.advanceTimersByTimeAsync(5000);

    expect(cfg.busy).toBe(false);
    expect(document.getElementById('cd').classList.contains('show')).toBe(false);
    expect(document.getElementById('cd').getAttribute('aria-hidden')).toBe('true');
    expect(onReady).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('showCountdown mostra dica de obstáculo (gelo)', async () => {
    vi.useFakeTimers();
    delete globalThis.TBStart;
    mountModule('tb-config.js');
    mountModule('tb-state.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-economy.js');
    mountModule('tb-start.js');
    const iceLv = {
      name: 'Gelo',
      moves: 20,
      objectives: [{ type: 'ice', target: 6 }],
    };
    globalThis.TBState.LEVELS = [iceLv];
    globalThis.TBState.lvIdx = 0;
    const S = globalThis.TBStart;
    const cfg = makeCfg({
      grid: [],
      kbFocus: { x: 0, y: 0 },
      announce: vi.fn(),
      describeCell: vi.fn(),
      OBS_ICON: { ice: '🧊' },
    });
    S.init(cfg);
    S.showCountdown(iceLv, vi.fn());
    expect(document.querySelector('#cd-info .cd-hint')?.textContent).toMatch(/gelo|ao lado/i);
    vi.useRealTimers();
  });
});
