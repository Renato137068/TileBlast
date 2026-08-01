import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('tb-achievements', () => {
  /** @type {any} */
  let A;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBAchievements;
    document.body.innerHTML = '';
    save = {
      ach: {},
      stats: {
        maxCombo: 12,
        chestsOpened: 12,
        missionsDone: 0,
        challengesDone: 0,
        adsWatched: 0,
        infBest: 0,
        winsNoLife: 0,
      },
      stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3 },
      winStreak: 3,
      collUnlocked: ['a', 'b', 'c', 'd', 'e'],
      xpLevel: 1,
      piggy: 0,
    };
    cfg = {
      ld: () => save,
      sv: vi.fn((s) => {
        save = s;
      }),
      getUnlocked: () => 25,
      getCoins: () => 1500,
      LEVELS: Array.from({ length: 60 }, (_, i) => ({ id: i + 1 })),
      ACHIEVEMENTS: [{ id: 'first_win', icon: '★', title: 'Primeira', sub: 'Venceu 1 fase' }],
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      Sound: { ach: vi.fn() },
      addCoins: vi.fn(),
      addXP: vi.fn(),
    };
    mountModule('tb-achievements.js');
    A = globalThis.TBAchievements;
    A.init(cfg);
  });

  it('isReady e getAllAchievements mescla base + EXT', () => {
    expect(A.isReady()).toBe(true);
    const all = A.getAllAchievements();
    expect(all.some((a) => a.id === 'first_win')).toBe(true);
    expect(all.some((a) => a.id === 'twenty_levels')).toBe(true);
    expect(A.EXT_ACHIEVEMENTS.length).toBeGreaterThan(10);
  });

  it('checkExtendedAchievements desbloqueia conquistas elegíveis', () => {
    A.checkExtendedAchievements({});
    expect(save.ach.twenty_levels).toBeTruthy();
    expect(save.ach.ten_triples).toBeTruthy();
    expect(save.ach.combo10).toBeTruthy();
    expect(save.ach.coins1k).toBeTruthy();
    expect(save.ach.chest10).toBeTruthy();
    expect(save.ach.winstreak3).toBeTruthy();
    expect(save.ach.skin5).toBeTruthy();
    expect(cfg.sv).toHaveBeenCalled();
  });

  it('não re-notifica conquista já desbloqueada', () => {
    save.ach.twenty_levels = Date.now();
    cfg.showToast.mockClear();
    A.checkExtendedAchievements({});
    const toasts = cfg.showToast.mock.calls.map((c) => String(c[0]));
    expect(toasts.some((t) => /Explorador|twenty/i.test(t))).toBe(false);
  });

  it('openAchievementsModal renderiza lista', () => {
    save.ach.twenty_levels = 1;
    A.openAchievementsModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    const html = cfg.showGlobalModal.mock.calls[0][0];
    expect(html).toMatch(/achievement|conquista|Explorador/i);
  });
});
