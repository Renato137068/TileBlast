import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function makeCfg(overrides = {}) {
  let save = {};
  return {
    ld: () => save,
    sv: (s) => {
      save = s;
    },
    _t: (_k, f) => f,
    _shopLocale: () => 'pt-BR',
    addCoins: vi.fn(),
    checkAchievements: vi.fn(),
    showToast: vi.fn(),
    showGlobalModal: vi.fn(),
    ...overrides,
  };
}

describe('tb-meta-ui', () => {
  /** @type {any} */
  let Meta;

  beforeEach(() => {
    delete globalThis.TBMetaUI;
    delete globalThis.TBEvents;
    delete globalThis.TBChallenges;
    delete globalThis.TBConfig;
    delete globalThis.TBLogic;
    delete globalThis.TBContent;
    delete globalThis.TBRuntime;
    delete globalThis.AppTimers;
    delete globalThis.getActiveEvent;
    delete globalThis.getDailyChallenge;
    delete globalThis.updateChallengeProgress;
    createMinimalDom();
    document.getElementById('screen-map').classList.add('active');
    if (!document.getElementById('challenge-notif')) {
      const dot = document.createElement('span');
      dot.id = 'challenge-notif';
      document.body.appendChild(dot);
    }
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-runtime.js');
    mountModule('tb-events.js');
    mountModule('tb-challenges.js');
    mountModule('tb-meta-ui.js');
    Meta = globalThis.TBMetaUI;
  });

  it('getActiveEvent devolve um evento da rotação', () => {
    Meta.init(makeCfg());
    const ev = Meta.getActiveEvent();
    expect(ev).toBeTruthy();
    expect(ev.id).toBeTruthy();
    expect(ev.icon).toBeTruthy();
    expect(typeof ev.coinMult).toBe('number');
  });

  it('getDailyChallenge devolve desafio do dia', () => {
    Meta.init(makeCfg());
    const ch = globalThis.getDailyChallenge();
    expect(ch).toBeTruthy();
    expect(ch.type).toBeTruthy();
    expect(ch.target).toBeGreaterThan(0);
    expect(ch.reward.coins).toBeGreaterThan(0);
  });

  it('updateChallengeProgress avança e completa desafio', () => {
    const cfg = makeCfg();
    Meta.init(cfg);
    const ch = globalThis.getDailyChallenge();
    if (ch.type === 'score_single') {
      Meta.updateChallengeProgress(ch.type, ch.target);
    } else if (ch.type === 'color_popped') {
      Meta.updateChallengeProgress(ch.type, ch.target, ch.colorIdx);
    } else {
      Meta.updateChallengeProgress(ch.type, ch.target);
    }
    expect(cfg.ld().dch.done).toBe(true);
    expect(cfg.ld().dch.progress).toBeGreaterThanOrEqual(ch.target);
    expect(cfg.addCoins).toHaveBeenCalledWith(ch.reward.coins);
  });

  it('renderEventBanner preenche #event-banner', () => {
    Meta.init(makeCfg());
    Meta.renderEventBanner();
    const el = document.getElementById('event-banner');
    expect(el.querySelector('.ev-name')).toBeTruthy();
    expect(el.querySelector('.ev-icon')).toBeTruthy();
    expect(el.querySelector('.ev-time')).toBeTruthy();
    expect(el.getAttribute('aria-label')).toContain('Evento ativo');
  });

  it('AppTimers start/pause controla intervalos', () => {
    Meta.init(makeCfg());
    const timers = globalThis.AppTimers;
    timers.start();
    expect(timers.isPaused()).toBe(false);
    timers.pause();
    expect(timers.isPaused()).toBe(true);
    timers.resume();
    expect(timers.isPaused()).toBe(false);
    timers.pause();
  });
});
