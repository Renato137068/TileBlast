import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function ids(list) {
  return list.map((id) => `<div id="${id}"></div>`).join('');
}

describe('tb-input', () => {
  /** @type {any} */
  let IN;
  /** @type {any} */
  let cfg;
  /** @type {HTMLCanvasElement} */
  let canvas;

  beforeEach(() => {
    delete globalThis.TBInput;
    delete globalThis.handleAppBack;
    delete globalThis.goToMap;
    delete globalThis.onTileBlastConsentUpdate;

    globalThis.TBState = {
      isInfiniteMode: false,
      isDailyPuzzleMode: false,
      lvIdx: 0,
    };
    globalThis.AppTimers = { clearAll: vi.fn() };
    globalThis.TBRoadmap = {
      clearSession: vi.fn(),
      onReturnToMap: vi.fn(),
      t: (_k, f) => f || _k,
      openAchievementsModal: vi.fn(),
      openLeaderboardModal: vi.fn(),
      openBattlePassModal: vi.fn(),
      openPiggyModal: vi.fn(),
      openFlashModal: vi.fn(),
      exportSave: vi.fn(),
      importSave: vi.fn(),
      cloudSyncFirebase: vi.fn(),
      cloudRestore: vi.fn(),
      openPlayerNameModal: vi.fn(),
      showChangelogIfNeeded: vi.fn(),
    };
    globalThis.TBGlobal = {
      openProfileModal: vi.fn(),
      openDailyPuzzleModal: vi.fn(),
    };
    globalThis.TBMeta = { openModal: vi.fn() };

    document.body.innerHTML = `
      <div id="s-game" class="screen"></div>
      <div id="s-map" class="screen active"></div>
      <div id="s-start" class="screen"></div>
      <div id="s-result" class="screen"></div>
      <div id="s-shop" class="screen"></div>
      <div id="s-complete" class="screen"></div>
      <div id="s-worlds" class="screen"></div>
      <div id="global-modal"></div>
      <div id="levelup-overlay"></div>
      <div id="ad-overlay"></div>
      <div id="cd"></div>
      <div id="hud-timer"></div>
      ${ids([
        'res-next',
        'res-retry',
        'res-map',
        'hud-back',
        'hud-mute',
        'complete-replay',
        'complete-map',
        'map-play-btn',
        'coach-dismiss',
        'map-ach-btn',
        'map-lb-btn',
        'map-bp-btn',
        'bp-banner',
        'piggy-banner',
        'flash-banner',
        'map-restore-btn',
        'map-privacy-btn',
        'map-lang-btn',
        'map-export-btn',
        'map-import-btn',
        'import-file',
        'map-cloud-backup',
        'map-cloud-restore',
        'map-player-btn',
        'map-whatsnew-btn',
        'map-shop-btn',
        'map-garden-btn',
        'map-reducemotion-toggle',
        'map-coll-btn',
        'map-profile-btn',
        'map-daily-puzzle-btn',
        'map-challenge-btn',
        'map-time-btn',
        'map-modes-btn',
        'map-worlds-btn',
        'worlds-back',
        'shop-back',
        'levelup-ok',
      ])}
    `;
    // import-file precisa ser input
    document.getElementById('import-file').outerHTML = '<input type="file" id="import-file" />';

    canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 360;
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 320,
      height: 360,
      right: 320,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.getElementById('s-game').appendChild(canvas);

    cfg = {
      canvas,
      CELL: 40,
      BPX: 320,
      BPY: 360,
      GW: 8,
      GH: 9,
      IS_TOUCH: false,
      busy: false,
      over: false,
      pendingPU: '',
      isTimeChallengeMode: false,
      _dailyLv: null,
      _timeLv: null,
      _timeTimer: 0,
      grid: [[{ type: 0 }]],
      kbFocus: { x: 0, y: 0, active: false },
      hoverCells: new Set(),
      hoverSz: 0,
      sGame: document.getElementById('s-game'),
      sMap: document.getElementById('s-map'),
      sStart: document.getElementById('s-start'),
      sResult: document.getElementById('s-result'),
      sShop: document.getElementById('s-shop'),
      sComp: document.getElementById('s-complete'),
      sWorlds: document.getElementById('s-worlds'),
      handleClick: vi.fn(),
      syncKbHover: vi.fn(),
      announce: vi.fn(),
      describeCell: () => 'cell',
      requestDraw: vi.fn(),
      showScreen: vi.fn((id) => {
        document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
        document
          .getElementById(`s-${id === 'complete' ? 'complete' : id}`)
          ?.classList.add('active');
        if (id === 'map') document.getElementById('s-map').classList.add('active');
        if (id === 'game') document.getElementById('s-game').classList.add('active');
      }),
      setGameSeed: vi.fn(),
      hideResult: vi.fn(),
      dismissCoachHint: vi.fn(),
      stopRegenInterval: vi.fn(),
      checkLifeRegen: vi.fn(),
      renderMap: vi.fn(),
      updateMusicToggleUI: vi.fn(),
      announceNewUnlocks: vi.fn(),
      updateMapMeta: vi.fn(),
      openShop: vi.fn(),
      openCollectionModal: vi.fn(),
      openChallengeModal: vi.fn(),
      startTimeChallengeMode: vi.fn(),
      openModesModal: vi.fn(),
      openWorldSelect: vi.fn(),
      closeLevelUpCelebration: vi.fn(),
      cancelRewardedAd: vi.fn(),
      closeGlobalModal: vi.fn(),
      startGame: vi.fn(),
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      _t: (_k, f) => f,
      ld: () => ({ muted: false, reduceMotion: false }),
      sv: vi.fn(),
      Sound: {
        click: vi.fn(),
        isMuted: () => false,
        setMuted: vi.fn(),
      },
      PlayBridge: { hasBilling: () => false, restore: () => false },
      Mascot: { setMood: vi.fn(), nextTip: vi.fn() },
      Music: { updateTheme: vi.fn(), pause: vi.fn(), resume: vi.fn() },
      trapModalFocus: vi.fn(),
      layoutBoard: vi.fn(),
      flushSave: vi.fn(),
    };
    cfg.Sound.suspend = vi.fn();
    cfg.Sound.resume = vi.fn();
    globalThis.AppTimers.pause = vi.fn();
    globalThis.AppTimers.resume = vi.fn();

    mountModule('tb-input.js', {
      Math,
      history: { replaceState: vi.fn(), state: null },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
    });
    IN = globalThis.TBInput;
  });

  it('init + bind anexa teclado no canvas', () => {
    IN.init(cfg);
    IN.bind();
    cfg.sGame.classList.add('active');
    cfg.sMap.classList.remove('active');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(cfg.kbFocus.x).toBe(1);
    expect(cfg.syncKbHover).toHaveBeenCalled();
  });

  it('Enter no canvas chama handleClick no foco', () => {
    IN.init(cfg);
    IN.bind();
    cfg.sGame.classList.add('active');
    cfg.sMap.classList.remove('active');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(cfg.handleClick).toHaveBeenCalledWith(0, 0);
  });

  it('goToMap limpa estado e mostra mapa', () => {
    IN.init(cfg);
    IN.bind();
    globalThis.TBState.isInfiniteMode = true;
    IN.goToMap('test');
    expect(globalThis.TBState.isInfiniteMode).toBe(false);
    expect(cfg.showScreen).toHaveBeenCalledWith('map');
    expect(cfg.renderMap).toHaveBeenCalled();
    expect(globalThis.TBRoadmap.onReturnToMap).toHaveBeenCalledWith('test');
  });

  it('handleAppBack fecha modal global se aberto', () => {
    IN.init(cfg);
    IN.bind();
    document.getElementById('global-modal').classList.add('show');
    expect(IN.handleAppBack()).toBe(true);
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
  });

  it('handleAppBack a partir do jogo vai ao mapa', () => {
    IN.init(cfg);
    IN.bind();
    cfg.sGame.classList.add('active');
    cfg.sMap.classList.remove('active');
    expect(IN.handleAppBack()).toBe(true);
    expect(cfg.showScreen).toHaveBeenCalledWith('map');
  });

  it('map-play-btn com complete abre modos', () => {
    IN.init(cfg);
    IN.bind();
    const btn = document.getElementById('map-play-btn');
    btn.dataset.complete = '1';
    btn.click();
    expect(cfg.openModesModal).toHaveBeenCalled();
  });

  it('map-play-btn inicia fase pelo dataset.level', () => {
    IN.init(cfg);
    IN.bind();
    const btn = document.getElementById('map-play-btn');
    btn.dataset.level = '4';
    btn.click();
    expect(cfg.startGame).toHaveBeenCalledWith(4);
  });

  it('shop-back volta ao mapa', () => {
    IN.init(cfg);
    IN.bind();
    document.getElementById('shop-back').click();
    expect(cfg.showScreen).toHaveBeenCalledWith('map');
    expect(cfg.updateMapMeta).toHaveBeenCalled();
  });
});
