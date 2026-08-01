import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function shopDom() {
  document.body.innerHTML = `
    <div id="screen-shop">
      <div id="shop-coin-count"></div>
      <div id="sh-offers-section" style="display:none"><div id="sh-offers-grid"></div></div>
      <div id="sh-starter-wrap"></div>
      <div id="sh-noads-wrap"></div>
      <div id="sh-sub-wrap"></div>
      <div id="sh-bppremium-wrap"></div>
      <div id="shop-ad-count"></div>
      <div id="sh-ad-life" class="shop-item"><div class="shop-item-price"></div></div>
      <div id="sh-ad-coins" class="shop-item">
        <div class="shop-item-name"></div>
        <div class="shop-item-price"></div>
      </div>
      <div class="shop-item" data-action="shopBuyCoin" data-arg="bomb">
        <div class="shop-item-price">💰 55</div>
      </div>
      <div class="shop-item" data-action="shopBuyCoin" data-arg="life">
        <div class="shop-item-price">💰 70</div>
      </div>
    </div>
  `;
}

function makeCfg(overrides = {}) {
  let save = { boughtStarter: false, bpPremiumOwned: false, lang: 'pt' };
  let coins = 500;
  let lives = 2;
  return {
    ld: () => save,
    sv: (s) => {
      save = s;
    },
    t: (_k, f) => f,
    getCoins: () => coins,
    addCoins: (n) => {
      coins += n;
    },
    getLives: () => lives,
    setLives: (n) => {
      lives = n;
    },
    ML: 5,
    hasNoAds: () => false,
    getAdState: () => ({ count: 0 }),
    getAdDailyLimit: () => 5,
    canWatchAd: () => true,
    getRemoteEconomyCfg: () => ({}),
    showScreen: vi.fn(),
    showToast: vi.fn(),
    showCustomConfirm: (_msg, ok) => ok(),
    showGlobalModal: vi.fn(),
    closeGlobalModal: vi.fn(),
    checkLifeRegen: vi.fn(),
    updateMapMeta: vi.fn(),
    checkAchievements: vi.fn(),
    addPU: vi.fn(),
    Sound: { click: vi.fn() },
    PU_DEFS: [
      { id: 'bomb', label: '💣', desc: 'Bomba' },
      { id: 'shuffle', label: '🔀', desc: 'Embaralhar' },
    ],
    ...overrides,
  };
}

describe('tb-shop', () => {
  /** @type {any} */
  let Shop;

  beforeEach(() => {
    delete globalThis.TBShop;
    delete globalThis.TBEconomy;
    delete globalThis.TBLogic;
    shopDom();
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-economy.js');
    mountModule('tb-shop.js');
    Shop = globalThis.TBShop;
  });

  it('init + refreshShopUI atualiza moedas e preços', () => {
    const cfg = makeCfg();
    Shop.init(cfg);
    Shop.refreshShopUI();
    expect(document.getElementById('shop-coin-count').textContent).toMatch(/500/);
    const bombPrice = document.querySelector('[data-arg="bomb"] .shop-item-price');
    expect(bombPrice.textContent).toContain(String(globalThis.TBEconomy.SHOP_COIN_PRICES.bomb));
    expect(document.getElementById('shop-ad-count').textContent).toContain('5/5');
  });

  it('openShop refresca UI e muda para a tela shop', () => {
    const cfg = makeCfg();
    Shop.init(cfg);
    Shop.openShop();
    expect(cfg.Sound.click).toHaveBeenCalled();
    expect(cfg.showScreen).toHaveBeenCalledWith('shop');
    expect(document.getElementById('shop-coin-count').textContent).toMatch(/500/);
  });

  it('shopBuyCoin compra power-up via confirm e debita moedas', () => {
    const cfg = makeCfg();
    Shop.init(cfg);
    Shop.shopBuyCoin('bomb');
    expect(cfg.addPU).toHaveBeenCalledWith('bomb');
    expect(cfg.getCoins()).toBe(500 - globalThis.TBEconomy.SHOP_COIN_PRICES.bomb);
    expect(cfg.showToast).toHaveBeenCalled();
  });

  it('shopBuyCoin life recusa com vidas cheias', () => {
    const cfg = makeCfg({ getLives: () => 5, ML: 5 });
    Shop.init(cfg);
    Shop.shopBuyCoin('life');
    expect(cfg.showToast).toHaveBeenCalled();
    expect(cfg.showToast.mock.calls[0][1]).toMatch(/cheias/i);
  });
});
