import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const DAILY_POOL = [
  { type: 'blocks_popped', target: 10, label: 'Exploda {n}', reward: { coins: 20 } },
  { type: 'combos_made', target: 3, label: 'Combos {n}', reward: { coins: 30 } },
  { type: 'levels_won', target: 2, label: 'Vença {n}', reward: { coins: 40 } },
  { type: 'score_in_level', target: 500, label: 'Score {n}', reward: { coins: 25 } },
];

const WEEKLY_POOL = [
  { type: 'levels_won', target: 10, label: 'Vença {n}', reward: { coins: 100 } },
  { type: 'blocks_popped', target: 200, label: 'Blocos {n}', reward: { coins: 80 } },
  { type: 'combos_made', target: 20, label: 'Combos {n}', reward: { coins: 90 } },
  { type: 'specials_made', target: 15, label: 'Especiais {n}', reward: { coins: 70 } },
  { type: 'score_in_level', target: 2000, label: 'Score {n}', reward: { coins: 110 } },
  { type: 'color_popped', target: 50, color: 1, label: 'Cor {n}', reward: { coins: 60 } },
];

function mountMissions() {
  globalThis.TBContent = {
    getDailyMissionPool: () => DAILY_POOL,
    getWeeklyMissionPool: () => WEEKLY_POOL,
    getDailyMissionCount: () => 3,
    getWeeklyMissionCount: () => 5,
  };
  mountModule('tb-missions.js');
  return globalThis.TBMissions;
}

describe('tb-missions', () => {
  /** @type {any} */
  let M;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBMissions;
    delete globalThis.TBContent;
    delete globalThis.addXP;
    delete globalThis.XP_DEFS;
    delete globalThis.addChest;
    document.body.innerHTML = `<div id="missions-notif" style="display:none"></div><div id="dm-modal-content"></div>`;
    save = {};
    globalThis.XP_DEFS = { daily_mission: 15, weekly_mission: 40 };
    globalThis.addXP = vi.fn();
    globalThis.addChest = vi.fn(() => true);
    M = mountMissions();
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      _t: (_k, f) => f,
      _contentReady: () => true,
      _shopLocale: () => 'pt-BR',
      PU_DEFS: [{ id: 'bomb', label: 'Bomba', desc: 'boom' }],
      addCoins: vi.fn(),
      addPU: vi.fn(),
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      checkAchievements: vi.fn(),
      Sound: { click: vi.fn() },
    };
    M.init(cfg);
    M.syncMissionPools();
  });

  it('gera 3 missões diárias persistidas', () => {
    const dm = M.getDailyMissions();
    expect(dm.missions).toHaveLength(3);
    expect(dm.date).toBeTruthy();
    const again = M.getDailyMissions();
    expect(again.missions).toEqual(dm.missions);
  });

  it('updateMissionProgress avança e claimMission credita', () => {
    const dm = M.getDailyMissions();
    const slot = dm.missions[0];
    const def = DAILY_POOL[slot.poolIdx];
    if (def.type === 'score_in_level' || def.type === 'win_streak') {
      M.updateMissionProgress(def.type, 0, def.target);
    } else {
      M.updateMissionProgress(def.type, def.target, def.color);
    }
    expect(save.dm.missions[0].progress).toBeGreaterThanOrEqual(def.target);

    M.claimMission(0);
    expect(save.dm.missions[0].claimed).toBe(true);
    expect(cfg.addCoins).toHaveBeenCalled();
    expect(globalThis.addXP).toHaveBeenCalledWith(15);
  });

  it('não reclama missão incompleta', () => {
    M.getDailyMissions();
    M.claimMission(0);
    expect(cfg.addCoins).not.toHaveBeenCalled();
  });

  it('gera 5 missões semanais', () => {
    const wm = M.getWeeklyMissions();
    expect(wm.missions).toHaveLength(5);
    expect(wm.week).toBeTruthy();
  });
});
