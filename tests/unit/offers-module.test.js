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
      getCoins: () => 1000,
      getLives: () => 3,
      shopBuyIAP: vi.fn(),
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

  it('openBattlePassModal renderiza a trilha e o botão premium', () => {
    O.getBattlePass();
    O.openBattlePassModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    const html = cfg.showGlobalModal.mock.calls[0][0];
    expect(html).toMatch(/battlepass|Nível|buyBpPremium/i);
  });

  it('buyBpPremium encaminha para a compra IAP', () => {
    O.buyBpPremium();
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
    expect(cfg.shopBuyIAP).toHaveBeenCalledWith('bppremium');
  });

  it('activateBpPremium marca posse e premium na temporada', () => {
    O.activateBpPremium();
    expect(save.bpPremiumOwned).toBe(true);
    expect(O.getBattlePass().premium).toBe(true);
    expect(cfg.showToast).toHaveBeenCalled();
  });

  it('breakPiggy: bloqueia sem moedas e credita quando há saldo', () => {
    save.piggy = 200;
    // Sem moedas suficientes → não quebra.
    cfg.getCoins = () => 0;
    O.breakPiggy();
    expect(save.piggy).toBe(200);
    // Com saldo → debita o custo, credita o cofre e zera.
    cfg.getCoins = () => 1000;
    O.breakPiggy();
    expect(save.piggy).toBe(0);
    expect(cfg.addCoins).toHaveBeenCalledWith(200); // crédito do cofre
    expect(cfg.closeGlobalModal).toHaveBeenCalled();
  });

  it('fluxo flash: checkFlashOffer arma, claimFlash credita e limpa', () => {
    O.checkFlashOffer();
    expect(save.flashUntil).toBeGreaterThan(Date.now());
    O.openFlashModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    O.claimFlash();
    expect(cfg.addCoins).toHaveBeenCalledWith(800);
    expect(save.flashUntil).toBe(0);
  });

  it('oferta dinâmica: piggy quase cheio dispara e claim executa a ação', () => {
    save.piggy = 480; // >= 85% de 500
    save.remoteCfg = { piggyCap: 500, dynamicOffersEnabled: true };
    O.evaluateDynamicOffers('map');
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    // claimDynamicOffer executa a ação registrada (abre o cofrinho).
    const calls = cfg.showGlobalModal.mock.calls.length;
    O.claimDynamicOffer();
    expect(cfg.showGlobalModal.mock.calls.length).toBeGreaterThan(calls);
  });

  it('purchaseSubscription usa a ponte nativa quando disponível', () => {
    cfg.PlayBridge = { purchaseSubscription: vi.fn(() => true) };
    O.purchaseSubscription('no_ads_monthly');
    expect(cfg.PlayBridge.purchaseSubscription).toHaveBeenCalledWith('no_ads_monthly');
    expect(cfg.showToast).not.toHaveBeenCalled();
  });

  it('purchaseSubscription cai no aviso quando não há ponte', () => {
    O.purchaseSubscription('no_ads_yearly');
    expect(cfg.showToast).toHaveBeenCalled();
  });
});
