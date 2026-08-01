import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('tb-social', () => {
  /** @type {any} */
  let S;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBSocial;
    document.body.innerHTML = '';
    save = {
      playerName: 'Renato',
      weekly: { score: 100, name: 'Renato' },
    };
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      showToast: vi.fn(),
      getUnlocked: () => 5,
      Sound: { click: vi.fn() },
    };
    mountModule('tb-social.js');
    S = globalThis.TBSocial;
    S.init(cfg);
  });

  it('isReady e getPlayerName', () => {
    expect(S.isReady()).toBe(true);
    expect(S.getPlayerName()).toBe('Renato');
    save.playerName = '';
    expect(S.getPlayerName()).toMatch(/you|você|você/i);
  });

  it('openPlayerNameModal abre modal com input', () => {
    S.openPlayerNameModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    expect(cfg.showGlobalModal.mock.calls[0][0]).toContain('player-name-inp');
    expect(cfg.showGlobalModal.mock.calls[0][0]).toContain('Renato');
  });

  it('savePlayerName persiste nome sanitizado', () => {
    document.body.innerHTML = `<input id="player-name-inp" value="  Nova <b>Tag</b>  " />`;
    S.savePlayerName();
    expect(save.playerName.length).toBeGreaterThan(0);
    expect(save.playerName).not.toContain('<');
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
  });

  it('recordLeaderboardScore e getLeaderboard', () => {
    S.recordLeaderboardScore('infinite', 999);
    const lb = S.getLeaderboard();
    expect(lb.infinite.some((r) => r.score === 999)).toBe(true);
    expect(lb.ghosts.length).toBeGreaterThan(0);
  });
});
