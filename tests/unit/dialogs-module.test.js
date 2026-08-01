import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function dialogsDom() {
  document.body.innerHTML = `
    <div id="map-mascot-wrap" class="mascot-wrap"></div>
    <div id="map-mascot-bubble" class="hide"></div>
    <div id="confetti-layer"></div>
    <div id="global-modal"></div>
  `;
}

function makeCfg(overrides = {}) {
  let save = {
    worldIntro: {},
    mechIntro: {},
    tutorialDone: false,
    coachDone: false,
    lives: 0,
    lifeRegenAt: Date.now() - 1000,
  };
  return {
    ld: () => save,
    sv: (s) => {
      save = s;
    },
    _t: (_k, f) => f,
    IS_NATIVE: false,
    _reduceMotion: () => false,
    LIFE_REGEN_MS: 1800000,
    ML: 5,
    getLives: () => save.lives ?? 0,
    setLives: (n) => {
      save.lives = n;
    },
    canWatchAd: () => false,
    showGlobalModal: vi.fn((html) => {
      document.getElementById('global-modal').innerHTML = html;
      document.getElementById('global-modal').classList.add('show');
    }),
    closeGlobalModal: vi.fn(),
    openShop: vi.fn(),
    showRewardedAd: vi.fn(),
    updateMapMeta: vi.fn(),
    showToast: vi.fn(),
    updateMapHint: vi.fn(),
    showCountdown: vi.fn(),
    _lv: () => ({ name: 'Início', objectives: [{ type: 'score', target: 100 }], moves: 20 }),
    Sound: { unlock: vi.fn(), click: vi.fn() },
    ...overrides,
  };
}

describe('tb-dialogs', () => {
  /** @type {any} */
  let D;

  beforeEach(() => {
    delete globalThis.TBDialogs;
    delete globalThis.Mascot;
    delete globalThis.TBConfig;
    delete globalThis.TBLogic;
    delete globalThis.TBState;
    delete globalThis.TBAnalytics;
    dialogsDom();
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-analytics.js');
    mountModule('tb-dialogs.js');
    D = globalThis.TBDialogs;
    globalThis.TBState.LEVELS = [
      { world: '🌱 Jardim', name: 'Início' },
      { world: '🌲 Floresta', name: 'Gelo 1' },
      { world: '🌲 Floresta', name: 'Gelo 2' },
    ];
    globalThis.TBState.lvIdx = 1;
    globalThis.TBState.isInfiniteMode = false;
    globalThis.TBState.isDailyPuzzleMode = false;
  });

  it('showTutorial inclui progresso, skip e limiares 4/6/8 no 2º passo', () => {
    const cfg = makeCfg();
    D.init(cfg);
    D.showTutorial();
    let html = cfg.showGlobalModal.mock.calls[0][0];
    expect(html).toContain('Passo 1 de 2');
    expect(html).toContain('data-action="skipOnboarding"');
    expect(html).toContain('Pular tutorial');
    D.onboardingNext();
    html = cfg.showGlobalModal.mock.calls[1][0];
    expect(html).toContain('Passo 2 de 2');
    expect(html).toContain('4+');
    expect(html).toContain('6+');
    expect(html).toContain('8+');
    expect(html).toContain('Bomba');
    expect(html).toContain('Foguete');
    expect(html).toContain('Arco-íris');
    expect(html).toContain('data-action="closeTutorialAndStart"');
  });

  it('skipOnboarding marca tutorial+coach e inicia countdown sem coach', () => {
    const cfg = makeCfg();
    D.init(cfg);
    D.showTutorial();
    D.skipOnboarding();
    expect(cfg.ld().tutorialDone).toBe(true);
    expect(cfg.ld().coachDone).toBe(true);
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
    expect(cfg.showCountdown).toHaveBeenCalled();
    expect(cfg.showCountdown.mock.calls[0][1]).toBeNull();
  });

  it('closeTutorialAndStart completa onboarding e marca coachDone', () => {
    const cfg = makeCfg();
    D.init(cfg);
    D.showTutorial();
    D.onboardingNext();
    D.closeTutorialAndStart();
    expect(cfg.ld().tutorialDone).toBe(true);
    expect(cfg.ld().coachDone).toBe(true);
    expect(cfg.showCountdown).toHaveBeenCalled();
  });

  it('maybeShowWorldIntro abre modal na primeira fase do mundo', async () => {
    const cfg = makeCfg();
    D.init(cfg);
    D.maybeShowWorldIntro();
    expect(cfg.ld().worldIntro['🌲 Floresta']).toBe(true);
    await vi.waitFor(() => expect(cfg.showGlobalModal).toHaveBeenCalled(), { timeout: 2000 });
    const html = cfg.showGlobalModal.mock.calls[0][0];
    expect(html).toContain('Gelo!');
    expect(html).toContain('AO LADO');
  });

  it('ensina mecânica nova por objetivo (correntes) mesmo no meio do mundo', async () => {
    const cfg = makeCfg();
    D.init(cfg);
    globalThis.TBState.LEVELS = [
      {
        worldId: 'crystal',
        world: '💎 Cristal',
        name: 'A',
        objectives: [{ type: 'ice', target: 4 }],
      },
      {
        worldId: 'crystal',
        world: '💎 Cristal',
        name: 'Correntes',
        objectives: [{ type: 'chain', target: 6 }],
      },
    ];
    globalThis.TBState.lvIdx = 1;
    cfg.ld().mechIntro.ice = true;
    cfg.ld().worldIntro.crystal = true;
    cfg.ld().worldIntro['💎 Cristal'] = true;
    D.maybeShowWorldIntro();
    expect(cfg.ld().mechIntro.chain).toBe(true);
    await vi.waitFor(() => expect(cfg.showGlobalModal).toHaveBeenCalled(), { timeout: 2000 });
    expect(cfg.showGlobalModal.mock.calls[0][0]).toContain('Correntes');
  });

  it('maybeShowWorldIntro não reabre se já visto', () => {
    const cfg = makeCfg();
    cfg.ld().worldIntro['🌲 Floresta'] = true;
    D.init(cfg);
    D.maybeShowWorldIntro();
    expect(cfg.showGlobalModal).not.toHaveBeenCalled();
  });

  it('showNoLivesModal monta timer e botões', () => {
    const cfg = makeCfg();
    D.init(cfg);
    D.showNoLivesModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    expect(document.getElementById('nlm-timer')).toBeTruthy();
    expect(document.getElementById('nlm-ok')).toBeTruthy();
    expect(document.getElementById('nlm-shop')).toBeTruthy();
    document.getElementById('nlm-ok').click();
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
  });

  it('spawnConfetti é no-op com reduceMotion', () => {
    const cfg = makeCfg({ _reduceMotion: () => true });
    D.init(cfg);
    D.spawnConfetti(20);
    const layer = document.getElementById('confetti-layer');
    expect(layer.classList.contains('active')).toBe(false);
    expect(layer.querySelectorAll('.confetti-piece')).toHaveLength(0);
  });

  it('Mascot.say e nextTip atualizam o bubble', () => {
    const cfg = makeCfg();
    D.init(cfg);
    D.Mascot.say('Olá Blasty', 60000);
    const bubble = document.getElementById('map-mascot-bubble');
    expect(bubble.textContent).toBe('Olá Blasty');
    expect(bubble.classList.contains('hide')).toBe(false);
    D.Mascot.nextTip();
    expect(bubble.textContent).toContain('Blasty');
    expect(bubble.classList.contains('hide')).toBe(false);
  });
});
