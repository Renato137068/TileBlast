import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('tb-offers', () => {
  /** @type {any} */
  let O;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBOffers;
    delete globalThis.TBEconomy;
    document.body.innerHTML = `<div id="bp-banner"></div><div id="piggy-banner"></div><div id="flash-banner"></div>`;
    mountModule('tb-config.js');
    mountModule('tb-economy.js');
    save = {
      bp: null,
      piggy: 100,
      lastLoginDay: Math.floor(Date.now() / 86400000) - 5,
      remoteCfg: {},
    };
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      addCoins: vi.fn(),
      addPU: vi.fn(),
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      Sound: { click: vi.fn() },
      _t: (_k, f) => f,
      getUnlocked: () => 10,
      hasNoAds: () => false,
    };
    mountModule('tb-offers.js');
    O = globalThis.TBOffers;
    O.init(cfg);
  });

  it('isReady + getBattlePass cria temporada', () => {
    expect(O.isReady()).toBe(true);
    const bp = O.getBattlePass();
    expect(bp).toMatchObject({ tier: 0, xp: 0 });
    expect(save.bp).toBeTruthy();
  });

  it('addBattlePassXP sobe tier e concede recompensas', () => {
    const before = O.getBattlePass().tier;
    O.addBattlePassXP(500);
    expect(O.getBattlePass().tier).toBeGreaterThan(before);
    expect(cfg.addCoins).toHaveBeenCalled();
  });

  it('addPiggyCoins aumenta o cofrinho', () => {
    const before = save.piggy;
    O.addPiggyCoins(50);
    expect(save.piggy).toBeGreaterThan(before);
  });

  it('prepareReturnPlayerOffer marca oferta após inatividade', () => {
    O.prepareReturnPlayerOffer();
    expect(save._forceReturnOffer).toBe(true);
  });

  it('maybeShowInterstitial respeita cap diário', () => {
    save.unlocked = 10;
    save.remoteCfg = { interstitialEvery: 1, interstitialDailyCap: 2 };
    cfg.PlayBridge = { showInterstitial: vi.fn(() => true) };
    const cb = vi.fn();
    O.maybeShowInterstitial(cb);
    O.maybeShowInterstitial(cb);
    O.maybeShowInterstitial(cb);
    expect(cfg.PlayBridge.showInterstitial).toHaveBeenCalledTimes(2);
    expect(save.interstitialToday.count).toBe(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
