import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('tb-global', () => {
  /** @type {any} */
  let G;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBGlobal;
    document.body.innerHTML = `
      <div id="map-player-title"></div>
      <div id="daily-notif" style="display:inline-block"></div>
    `;
    save = {
      lang: 'pt',
      playerName: 'Tester',
      stars: { 1: 3, 2: 2 },
      winStreak: 2,
      stats: { infBest: 100 },
      dailyPuzzle: {},
    };
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      getUnlocked: () => 8,
      getCoins: () => 250,
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      showToast: vi.fn(),
    };
    mountModule('tb-global.js');
    G = globalThis.TBGlobal;
  });

  it('init + isReady e dailySeed estável no mesmo dia', () => {
    expect(G.isReady()).toBe(false);
    G.init(cfg);
    expect(G.isReady()).toBe(true);
    const a = G.dailySeed();
    const b = G.dailySeed();
    expect(a).toBe(b);
    expect(typeof a).toBe('number');
  });

  it('getPlayerTitle escala por fases desbloqueadas', () => {
    G.init(cfg);
    expect(G.getPlayerTitle(0).pt).toBe('Novato');
    expect(G.getPlayerTitle(5).pt).toBe('Explorador');
    expect(G.getPlayerTitle(50).pt).toBe('Lenda');
    expect(G.getPlayerTitle(60).pt).toBe('Titã Mundial');
  });

  it('renderMapTitle preenche o título e notificação diária', () => {
    G.init(cfg);
    G.renderMapTitle();
    const el = document.getElementById('map-player-title');
    expect(el.textContent).toContain('Tester');
    expect(el.textContent).toContain('Explorador');
    expect(document.getElementById('daily-notif').style.display).toBe('inline-block');

    const day = Math.floor(Date.now() / 86400000);
    save.dailyPuzzle[day] = 500;
    G.renderMapTitle();
    expect(document.getElementById('daily-notif').style.display).toBe('none');
  });

  it('openProfileModal abre modal com estatísticas', () => {
    G.init(cfg);
    G.openProfileModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    const html = cfg.showGlobalModal.mock.calls[0][0];
    expect(html).toContain('Tester');
    expect(html).toContain('Explorador');
  });

  it('openStoreRating fecha modal e abre Play Store', () => {
    G.init(cfg);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    G.openStoreRating();
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
    expect(String(open.mock.calls[0][0])).toContain('play.google.com');
    open.mockRestore();
  });
});
