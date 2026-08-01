import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function makeCfg(overrides = {}) {
  return {
    _t: (_k, f) => f,
    _shopLocale: () => 'pt-BR',
    getLives: () => 3,
    showNoLivesModal: vi.fn(),
    hideResult: vi.fn(),
    showGlobalModal: vi.fn(),
    showToast: vi.fn(),
    showScreen: vi.fn(),
    updateHUD: vi.fn(),
    buildPUBar: vi.fn(),
    buildGrid: vi.fn(),
    setGameSeed: vi.fn(),
    showCountdown: vi.fn(),
    stopRegenInterval: vi.fn(),
    goToMap: vi.fn(),
    _contentReady: () => false,
    getActiveEvent: () => ({}),
    addXP: vi.fn(),
    addCoins: vi.fn(),
    updateMissionProgress: vi.fn(),
    updateChallengeProgress: vi.fn(),
    canvas: { classList: { remove: vi.fn(), add: vi.fn() } },
    Sound: { click: vi.fn(), win: vi.fn(), lose: vi.fn() },
    Music: { updateTheme: vi.fn() },
    ld: () => ({}),
    sv: vi.fn(),
    score: 0,
    movesLeft: 20,
    busy: false,
    over: false,
    pendingPU: '',
    over_used_continue: false,
    _prevHudScore: 0,
    colorProgress: {},
    obsProgress: {},
    coverGrid: null,
    particles: [],
    floaters: [],
    hoverCells: new Set(),
    hoverSz: 0,
    _infLv: null,
    _dailyLv: null,
    isTimeChallengeMode: false,
    _timeLv: null,
    _timeTimer: null,
    ...overrides,
  };
}

describe('tb-modes', () => {
  /** @type {any} */
  let Modes;

  beforeEach(() => {
    delete globalThis.TBModes;
    delete globalThis.TBContent;
    document.body.innerHTML = '';
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-analytics.js');
    mountModule('tb-modes.js', {
      history: { pushState: vi.fn(), replaceState: vi.fn() },
    });
    Modes = globalThis.TBModes;
    globalThis.TBState.isInfiniteMode = false;
    globalThis.TBState.isDailyPuzzleMode = false;
    globalThis.TBState.lvIdx = 0;
  });

  it('makeInfiniteLevel escala moves/target por rodada', () => {
    Modes.init(makeCfg());
    const r1 = Modes.makeInfiniteLevel(1);
    const r5 = Modes.makeInfiniteLevel(5);
    expect(r1.objectives[0].type).toBe('score');
    expect(r5.objectives[0].target).toBeGreaterThanOrEqual(r1.objectives[0].target);
    expect(r1.name).toContain('1');
    expect(r5.name).toContain('5');
  });

  it('startInfiniteMode bloqueia sem vidas', () => {
    const cfg = makeCfg({ getLives: () => 0 });
    Modes.init(cfg);
    Modes.startInfiniteMode();
    expect(cfg.showNoLivesModal).toHaveBeenCalled();
    expect(globalThis.TBState.isInfiniteMode).toBe(false);
  });

  it('startInfiniteMode prepara sessão e abre o jogo', () => {
    const cfg = makeCfg();
    Modes.init(cfg);
    Modes.startInfiniteMode();
    expect(globalThis.TBState.isInfiniteMode).toBe(true);
    expect(cfg._infLv).toBeTruthy();
    expect(cfg.movesLeft).toBe(cfg._infLv.moves);
    expect(cfg.showScreen).toHaveBeenCalledWith('game');
    expect(cfg.buildGrid).toHaveBeenCalled();
    expect(cfg.showCountdown).toHaveBeenCalled();
  });

  it('openModesModal abre o seletor', () => {
    globalThis.TBContent = {
      getModes: () => [
        { id: 'infinite', icon: '♾️', label: 'Infinito' },
        { id: 'time_challenge', icon: '⏱️', label: 'Tempo' },
        { id: 'daily_challenge', icon: '🌍', label: 'Diário' },
      ],
      isModeUnlocked: () => true,
    };
    delete globalThis.TBModes;
    mountModule('tb-modes.js', {
      history: { pushState: vi.fn(), replaceState: vi.fn() },
    });
    Modes = globalThis.TBModes;
    const cfg = makeCfg({ _contentReady: () => true });
    Modes.init(cfg);
    Modes.openModesModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    const html = cfg.showGlobalModal.mock.calls[0][0];
    expect(html).toMatch(/time_challenge|infinite|daily/i);
  });

  it('startDailyPuzzleGame prepara a sessão diária e semeia o grid', () => {
    const cfg = makeCfg();
    Modes.init(cfg);
    Modes.startDailyPuzzleGame();
    expect(globalThis.TBState.isDailyPuzzleMode).toBe(true);
    expect(globalThis.TBState.isInfiniteMode).toBe(false);
    expect(cfg._dailyLv).toBeTruthy();
    expect(cfg.movesLeft).toBe(18);
    expect(cfg.setGameSeed).toHaveBeenCalled();
    expect(cfg.buildGrid).toHaveBeenCalled();
    expect(cfg.showCountdown).toHaveBeenCalled();
  });

  it('resolveDailyPuzzleEnd grava o melhor score do dia e progride a missão', () => {
    const state = {};
    const cfg = makeCfg({ ld: () => state, sv: vi.fn(), score: 500 });
    Modes.init(cfg);
    Modes.resolveDailyPuzzleEnd();
    const day = Math.floor(Date.now() / 86400000);
    expect(state.dailyPuzzle[day]).toBe(500);
    expect(cfg.over).toBe(true);
    expect(cfg.updateMissionProgress).toHaveBeenCalledWith('daily_puzzle', 1);
    // Sem TBGlobal montado, cai no fallback goToMap.
    expect(cfg.goToMap).toHaveBeenCalled();
  });

  it('resolveDailyPuzzleEnd não rebaixa um score melhor já registrado', () => {
    const day = Math.floor(Date.now() / 86400000);
    const state = { dailyPuzzle: { [day]: 900 } };
    const cfg = makeCfg({ ld: () => state, sv: vi.fn(), score: 300 });
    Modes.init(cfg);
    Modes.resolveDailyPuzzleEnd();
    expect(state.dailyPuzzle[day]).toBe(900);
  });

  it('_timeChallengeEnd aplica o multiplicador e grava o recorde', () => {
    const state = {};
    const cfg = makeCfg({
      ld: () => state,
      sv: vi.fn(),
      score: 100,
      _timeLv: { scoreMultiplier: 2 },
    });
    Modes.init(cfg);
    Modes._timeChallengeEnd();
    expect(cfg.over).toBe(true);
    expect(state.modes.timeChallenge.best).toBe(200);
    expect(cfg.showGlobalModal).toHaveBeenCalled();
  });

  it('_infGameOver encerra a sessão e mostra o resumo', () => {
    const cfg = makeCfg({ ld: () => ({}), sv: vi.fn(), score: 1500 });
    Modes.init(cfg);
    Modes.startInfiniteMode();
    Modes._infGameOver();
    expect(cfg.over).toBe(true);
    expect(cfg.busy).toBe(true);
    expect(cfg.showGlobalModal).toHaveBeenCalled();
  });
});
