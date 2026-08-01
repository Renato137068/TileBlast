import { beforeEach, describe, expect, it, vi } from 'vitest';
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

function mountChallenges() {
  mountModule('tb-config.js');
  mountModule('tb-game-logic.js');
  mountModule('tb-challenges.js');
  return globalThis.TBChallenges;
}

describe('tb-challenges', () => {
  /** @type {any} */
  let CH;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBChallenges;
    delete globalThis.getDailyChallenge;
    delete globalThis.getDailyChallengeState;
    delete globalThis.updateChallengeProgress;
    delete globalThis.renderChallengeNotif;
    delete globalThis.openChallengeModal;
    document.body.innerHTML = `<span id="challenge-notif"></span>`;
    globalThis.addXP = vi.fn();
    CH = mountChallenges();
    cfg = makeCfg();
    CH.init(cfg);
  });

  it('getDailyChallenge devolve desafio do dia', () => {
    const ch = CH.getDailyChallenge();
    expect(ch).toBeTruthy();
    expect(ch.type).toBeTruthy();
    expect(ch.target).toBeGreaterThan(0);
    expect(ch.reward.coins).toBeGreaterThan(0);
  });

  it('updateChallengeProgress avança e completa desafio', () => {
    const ch = CH.getDailyChallenge();
    if (ch.type === 'score_single') {
      CH.updateChallengeProgress(ch.type, ch.target);
    } else if (ch.type === 'color_popped') {
      CH.updateChallengeProgress(ch.type, ch.target, ch.colorIdx);
    } else {
      CH.updateChallengeProgress(ch.type, ch.target);
    }
    expect(cfg.ld().dch.done).toBe(true);
    expect(cfg.ld().dch.progress).toBeGreaterThanOrEqual(ch.target);
    expect(cfg.addCoins).toHaveBeenCalledWith(ch.reward.coins);
    expect(globalThis.addXP).toHaveBeenCalledWith(ch.reward.xp);
  });
});
