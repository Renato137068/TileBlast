// @ts-check
/**
 * Tile Blast — LOJA (UI + compras soft/IAP/ads).
 * Isolado de tb-main; recebe dependências via TBShop.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBShopCfg
 * @typedef {{
 *   init: (cfg: TBShopCfg|null|undefined) => void,
 *   openShop: () => void,
 *   refreshShopUI: () => void,
 *   refreshShopOffers: () => void,
 *   shopBuyCoin: (itemId: string) => void,
 *   shopBuyIAP: (itemId: string) => void,
 *   shopBuyDailyDeal: () => void,
 *   shopAdReward: (type: string) => void
 * }} TBShopApi
 */
(function (global) {
  'use strict';

  // Bindings locais p/ checkJs (Window.TB* não está tipado no DOM lib).
  /** @type {any} */
  const TBEconomy = global.TBEconomy;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  /**
   * @param {TBShopCfg|null|undefined} cfg
   * @returns {void}
   */
  function init(cfg) {
    C = cfg || null;
  }

  /** @returns {boolean} */
  function ready() {
    return !!(C && C.ld);
  }

  /**
   * @param {string} key
   * @param {string} [fb]
   * @returns {string}
   */
  function t(key, fb) {
    if (C && typeof C.t === 'function') return C.t(key, fb);
    return fb != null ? fb : key;
  }

  /** @returns {string} */
  function shopLocale() {
    const lang = ready() ? C.ld().lang : 'pt';
    /** @type {any} */
    const Logic = global.TBLogic;
    if (Logic && Logic.localeTag) return Logic.localeTag(lang);
    return 'pt-BR';
  }

  /** @returns {Record<string, any>} */
  function remoteCfg() {
    if (C && typeof C.getRemoteEconomyCfg === 'function') return C.getRemoteEconomyCfg();
    /** @type {any} */
    const Roadmap = global.TBRoadmap;
    /** @type {any} */
    const Economy = global.TBEconomy;
    return (
      (Roadmap && Roadmap.remoteConfig && Roadmap.remoteConfig()) ||
      (ready() ? C.ld().remoteCfg : null) ||
      {}
    );
  }

  /** @returns {Record<string, any>} */
  function iapMeta() {
    if (C && typeof C.getIAPMeta === 'function') return C.getIAPMeta();
    /** @type {any} */
    const Economy = global.TBEconomy;
    return Economy ? Economy.getIAPMeta(remoteCfg()) : {};
  }

  /** @returns {Record<string, number>} */
  function coinPrices() {
    /** @type {any} */
    const Economy = global.TBEconomy;
    return (C && C.SHOP_COIN_PRICES) || (Economy && Economy.SHOP_COIN_PRICES) || {};
  }

  /** @returns {Record<string, any>} */
  function iapTable() {
    /** @type {any} */
    const Economy = global.TBEconomy;
    return (C && C.IAP_META) || (Economy && Economy.IAP_META) || {};
  }

  function openShop() {
    if (!ready()) return;
    C.Sound && C.Sound.click();
    if (global.TBAnalytics) global.TBAnalytics.log('iap_view', { surface: 'shop' });
    refreshShopUI();
    C.showScreen('shop');
  }

  function displayIapPrice(itemId, fallback) {
    const pb = C.PlayBridge || global.PlayBridge;
    const store = pb && pb.getStorePrice ? pb.getStorePrice(itemId, '') : '';
    const hasBilling = !!(pb && pb.hasBilling && pb.hasBilling());
    return TBEconomy.resolveIapDisplayPrice(
      itemId,
      { price: fallback },
      {
        storePrice: store || null,
        hasBilling,
        loadingLabel: t('shop_price_loading', '…'),
      }
    );
  }

  function applyIapPricesToDom() {
    document.querySelectorAll('#screen-shop .shop-item.iap[data-arg]').forEach((card) => {
      const id = card.getAttribute('data-arg');
      if (!id) return;
      const pr = card.querySelector('.shop-item-price.real');
      if (!pr) return;
      const meta = iapMeta()[id] || iapTable()[id];
      pr.textContent = displayIapPrice(id, meta && meta.price);
      pr.setAttribute('data-store-price', '1');
    });
  }

  function refreshShopOffers() {
    if (!ready()) return;
    const sec = document.getElementById('sh-offers-section');
    const grid = document.getElementById('sh-offers-grid');
    if (!sec || !grid || !global.TBEconomy) return;
    const s = C.ld();
    const rc = remoteCfg();
    const parts = [];
    const deal = TBEconomy.getDailyShopDeal();
    if (deal) {
      parts.push(`<div class="shop-item-wrap"><div class="shop-item featured" data-action="shopBuyDailyDeal">
      <div class="shop-item-icon">${deal.icon}</div>
      <div class="shop-item-name">${deal.name}</div>
      <div class="shop-item-desc">${deal.desc}<br><strong style="color:var(--accent)">${t('shop_deal_day', 'Oferta do dia')}</strong></div>
      <div class="shop-item-price">💰 ${deal.cost}</div>
    </div><span class="shop-badge">${t('shop_badge_daily', '📅 DIÁRIA')}</span></div>`);
    }
    TBEconomy.getVisibleIAPOffers(s, rc).forEach(({ id, meta }) => {
      if (
        [
          'starter',
          'noads',
          'no_ads_monthly',
          'no_ads_yearly',
          'bppremium',
          'coins500',
          'coins1500',
          'coins4000',
        ].indexOf(id) >= 0
      )
        return;
      const desc = meta.coins ? `${meta.coins} 💰` : '';
      const puDefs = C.PU_DEFS || [];
      const ex = meta.extras
        ? Object.entries(meta.extras)
            .map(([k, v]) => {
              const pd = puDefs.find((p) => p.id === k);
              return pd ? `${pd.label}×${v}` : '';
            })
            .filter(Boolean)
            .join(' · ')
        : '';
      const price = displayIapPrice(id, meta.price);
      parts.push(`<div class="shop-item-wrap"${meta.featured ? ' style="grid-column:1/-1"' : ''}><div class="shop-item iap${meta.featured ? ' featured' : ''}" data-action="shopBuyIAP" data-arg="${id}">
      <div class="shop-item-icon">${id === 'return_pack' ? '👋' : id === 'weekly_pack' ? '📅' : id === 'welcome' ? '✨' : '🎁'}</div>
      <div class="shop-item-name">${meta.label}</div>
      <div class="shop-item-desc">${desc}${ex ? '<br>' + ex : ''}</div>
      <div class="shop-item-price real">${price}</div>
    </div>${meta.badge ? `<span class="shop-badge">${meta.badge}</span>` : ''}</div>`);
    });
    grid.innerHTML = parts.join('');
    sec.style.display = parts.length ? '' : 'none';
  }

  function shopBuyDailyDeal() {
    if (!ready()) return;
    C.Sound && C.Sound.click();
    const deal = TBEconomy.getDailyShopDeal();
    if (!deal) return;
    if (C.getCoins() < deal.cost) {
      C.showToast(
        '💰',
        t('shop_insufficient', 'Moedas insuficientes!'),
        t('shop_need_coins', `Você precisa de ${deal.cost} 💰`).replace('{n}', String(deal.cost))
      );
      return;
    }
    C.showCustomConfirm(
      t('shop_buy_confirm', `Comprar ${deal.name} por ${deal.cost} 💰?`)
        .replace('{name}', deal.name)
        .replace('{cost}', String(deal.cost)),
      () => {
        if (C.getCoins() < deal.cost) return;
        C.addCoins(-deal.cost);
        const g = deal.grant || {};
        if (g.coins) C.addCoins(g.coins);
        Object.entries(g).forEach(([k, v]) => {
          if (k === 'coins' || k === 'lives') return;
          C.addPU(k, v);
        });
        if (g.lives) C.setLives(Math.min(C.ML, C.getLives() + g.lives));
        refreshShopUI();
        C.checkAchievements && C.checkAchievements();
        C.showToast(deal.icon, deal.name, t('shop_deal_bought', 'Pacote do dia adquirido!'));
      }
    );
  }

  function refreshShopUI() {
    if (!ready()) return;
    const el = document.getElementById('shop-coin-count');
    if (el) el.textContent = C.getCoins().toLocaleString(shopLocale());
    if (global.TBRoadmap && TBRoadmap.applyDataI18n) {
      TBRoadmap.applyDataI18n(document.getElementById('screen-shop'));
    }
    const prices = coinPrices();
    const priceMap = {
      bomb: '💰 ' + prices.bomb,
      rainbow: '💰 ' + prices.rainbow,
      moves: '💰 ' + prices.moves,
      shuffle: '💰 ' + prices.shuffle,
      life: '💰 ' + prices.life,
    };
    document.querySelectorAll('#screen-shop .shop-item').forEach((card) => {
      const id =
        card.getAttribute('data-action') === 'shopBuyCoin' ? card.getAttribute('data-arg') : null;
      if (id && priceMap[id]) {
        const pr = card.querySelector('.shop-item-price');
        if (pr && !pr.classList.contains('real') && !pr.classList.contains('free'))
          pr.textContent = priceMap[id];
      }
    });
    const adCoins = remoteCfg().adRewardCoins || TBEconomy.AD_REWARDS.coins;
    const adCoinName = document.querySelector('#sh-ad-coins .shop-item-name');
    if (adCoinName) {
      adCoinName.textContent = t('shop_ad_coins_tpl', `+${adCoins} Moedas`).replace(
        '{n}',
        String(adCoins)
      );
    }
    refreshShopOffers();
    applyIapPricesToDom();
    const sw = document.getElementById('sh-starter-wrap');
    if (sw) sw.style.display = C.ld().boughtStarter ? 'none' : '';
    const nw = document.getElementById('sh-noads-wrap');
    if (nw) nw.style.display = C.hasNoAds() ? 'none' : '';
    const sw2 = document.getElementById('sh-sub-wrap');
    if (sw2) sw2.style.display = C.hasNoAds() ? 'none' : '';
    const bpw = document.getElementById('sh-bppremium-wrap');
    if (bpw) bpw.style.display = C.ld().bpPremiumOwned ? 'none' : '';
    const adState = C.getAdState();
    const limit = C.getAdDailyLimit();
    const remaining = Math.max(0, limit - adState.count);
    const adLabel = document.getElementById('shop-ad-count');
    if (adLabel) {
      adLabel.textContent = t('shop_ad_today', `(${remaining}/${limit} hoje)`)
        .replace('{n}', String(remaining))
        .replace('{limit}', String(limit));
    }
    const canAd = C.canWatchAd();
    ['sh-ad-life', 'sh-ad-coins'].forEach((id) => {
      const card = document.getElementById(id);
      if (!card) return;
      card.style.opacity = canAd ? '1' : '0.4';
      card.style.pointerEvents = canAd ? 'auto' : 'none';
      const pr = card.querySelector('.shop-item-price');
      if (pr)
        pr.textContent = canAd
          ? t('shop_free', '📺 Grátis')
          : t('shop_ad_limit', 'Limite atingido');
    });
  }

  function shopBuyCoin(itemId) {
    if (!ready()) return;
    C.Sound && C.Sound.click();
    const prices = coinPrices();
    if (itemId === 'life') {
      const lv = C.getLives();
      if (lv >= C.ML) {
        C.showToast(
          '❤️',
          t('lives_full', 'Vidas cheias!'),
          t('shop_lives_full_body', 'Você já tem o máximo de vidas.')
        );
        return;
      }
      const price = prices.life;
      if (C.getCoins() < price) {
        C.showToast(
          '💰',
          t('shop_insufficient', 'Moedas insuficientes!'),
          t('shop_need_coins', `Você precisa de ${price} 💰`).replace('{n}', String(price))
        );
        return;
      }
      C.showCustomConfirm(
        t('shop_buy_confirm', `Comprar +1 Vida por ${price} 💰?`)
          .replace('{name}', t('shop_ad_life', '+1 Vida'))
          .replace('{cost}', String(price)),
        () => {
          if (C.getCoins() < price) {
            C.showToast('💰', t('shop_insufficient', 'Moedas insuficientes!'), '');
            return;
          }
          C.addCoins(-price);
          C.setLives(C.getLives() + 1);
          C.checkLifeRegen && C.checkLifeRegen();
          C.updateMapMeta && C.updateMapMeta();
          refreshShopUI();
          C.showToast(
            '❤️',
            t('life_gained', '+1 Vida!'),
            t('shop_life_recovered', 'Vida recuperada com sucesso!')
          );
        }
      );
      return;
    }
    const price = prices[itemId];
    if (!price) return;
    const pd = (C.PU_DEFS || []).find((p) => p.id === itemId);
    if (!pd) return;
    if (C.getCoins() < price) {
      C.showToast(
        '💰',
        t('shop_insufficient', 'Moedas insuficientes!'),
        t('shop_need_coins', `Você precisa de ${price} 💰`).replace('{n}', String(price))
      );
      return;
    }
    const itemName = `${pd.label} ${pd.desc}`.trim();
    C.showCustomConfirm(
      t('shop_buy_confirm', `Comprar ${itemName} por ${price} 💰?`)
        .replace('{name}', itemName)
        .replace('{cost}', String(price)),
      () => {
        if (C.getCoins() < price) {
          C.showToast('💰', t('shop_insufficient', 'Moedas insuficientes!'), '');
          return;
        }
        C.addCoins(-price);
        C.addPU(itemId);
        refreshShopUI();
        C.checkAchievements && C.checkAchievements();
        C.showToast(
          pd.label,
          t('shop_pu_added', '{name} adicionado!').replace('{name}', pd.desc),
          t('shop_pu_ready', 'Disponível na próxima fase')
        );
      }
    );
  }

  function shopBuyIAP(itemId) {
    if (!ready()) return;
    C.Sound && C.Sound.click();
    const meta = iapMeta()[itemId] || iapTable()[itemId];
    if (!meta) return;
    const s = C.ld();
    if (itemId === 'starter' && s.boughtStarter) {
      C.showToast(
        '🚀',
        t('shop_already_owned', 'Já adquirido!'),
        t('shop_starter_owned', 'Você já comprou o Pacote Iniciante.')
      );
      return;
    }
    if (itemId === 'welcome' && s.boughtWelcome) {
      C.showToast(
        '✨',
        t('shop_already_owned', 'Já adquirido!'),
        t('shop_welcome_owned', 'Oferta de Boas-Vindas já resgatada.')
      );
      return;
    }
    if (itemId === 'noads' && C.hasNoAds()) {
      C.showToast(
        '🚫',
        t('shop_already_active', 'Já ativo!'),
        t('shop_noads_active', 'Anúncios já removidos.')
      );
      return;
    }
    if (itemId === 'bppremium' && C.ld().bpPremiumOwned) {
      C.showToast(
        '👑',
        t('shop_already_active', 'Já ativo!'),
        t('shop_bp_active', 'Passe Premium já desbloqueado.')
      );
      return;
    }
    const PlayBridge = C.PlayBridge;
    const priceLabel = displayIapPrice(itemId, meta.price);
    const iapNote =
      PlayBridge && PlayBridge.hasBilling()
        ? t('shop_iap_secure', 'Pagamento seguro via Google Play.')
        : t('shop_iap_sim', 'Modo web: compra simulada. No app Android usa Google Play Billing.');
    C.showGlobalModal(`
    <div style="font-size:36px;margin-bottom:4px">💳</div>
    <div style="font-size:16px;font-weight:800;">${meta.label}</div>
    <div style="font-size:26px;font-weight:800;color:#4ecb71;margin:8px 0">${priceLabel}</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:14px;line-height:1.6">
      ${iapNote}
    </div>
    <div style="display:flex;gap:10px;width:100%">
      <button data-action="closeGlobalModal" class="btn btn-g" style="flex:1">${t('cancel', 'Cancelar')}</button>
      <button id="iap-ok" class="btn btn-p" style="flex:1;background:#4ecb71;color:#001a0f">${t('buy', 'Comprar')}</button>
    </div>
  `);
    document.getElementById('iap-ok').addEventListener('click', () => {
      C.closeGlobalModal();
      if (global.TBAnalytics) global.TBAnalytics.log('iap_start', { item: itemId });
      if (PlayBridge && PlayBridge.purchase(itemId)) return;
      C.applyIapPurchase(itemId);
      refreshShopUI();
      C.updateMapMeta && C.updateMapMeta();
      C.checkAchievements && C.checkAchievements();
      C.showToast(
        '✅',
        t('purchase_activated', '{name} ativado!').replace('{name}', meta.label),
        t('purchase_thanks', 'Obrigado pela compra!')
      );
    });
  }

  function shopAdReward(type) {
    if (!ready()) return;
    C.Sound && C.Sound.click();
    if (type === 'life') {
      C.showRewardedAd(() => {
        C.setLives(Math.min(C.ML, C.getLives() + 1));
        C.checkLifeRegen && C.checkLifeRegen();
        C.updateMapMeta && C.updateMapMeta();
        refreshShopUI();
        C.showToast(
          '❤️',
          t('life_gained', '+1 Vida!'),
          t('ad_thanks', 'Anúncio assistido — obrigado!')
        );
      }, null);
    } else if (type === 'coins') {
      const adCoins = remoteCfg().adRewardCoins || TBEconomy.AD_REWARDS.coins;
      C.showRewardedAd(() => {
        C.addCoins(adCoins);
        C.updateMapMeta && C.updateMapMeta();
        refreshShopUI();
        C.checkAchievements && C.checkAchievements();
        C.showToast(
          '💰',
          t('coins_gained', '+{n} Moedas!').replace('{n}', String(adCoins)),
          t('ad_thanks', 'Anúncio assistido — obrigado!')
        );
      }, null);
    }
  }

  /** @type {TBShopApi} */
  const api = {
    init,
    openShop,
    refreshShopUI,
    refreshShopOffers,
    shopBuyCoin,
    shopBuyIAP,
    shopBuyDailyDeal,
    shopAdReward,
  };

  /** @type {any} */
  const g = global;
  g.openShop = openShop;
  g.refreshShopUI = refreshShopUI;
  g.refreshShopOffers = refreshShopOffers;
  g.shopBuyCoin = shopBuyCoin;
  g.shopBuyIAP = shopBuyIAP;
  g.shopBuyDailyDeal = shopBuyDailyDeal;
  g.shopAdReward = shopAdReward;
  g.TBShop = api;
})(typeof window !== 'undefined' ? window : globalThis);
