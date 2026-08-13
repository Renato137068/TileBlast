// @ts-check
/**
 * Tile Blast — Google Play / Android WebView bridge (IAP + ads nativos).
 * Carregar antes de tb-main.js. TBPlayBridge.init(cfg) no boot.
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;
  /** @type {any} */
  const g = global;
  /** @type {Record<string, { id: string, title?: string, formattedPrice?: string, priceCurrencyCode?: string, priceAmountMicros?: number }>} */
  let _storeProducts = Object.create(null);
  /** Cache JS do UMP/GDPR/LGPD (nativo: canShowAdsBridge; web: save.consentAds). */
  let _adsCanRequest = false;

  /** @param {Record<string, any>|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
    installNativeCallbacks();
    hydrateStoreProductsFromBridge();
    syncConsentFromBridge();
  }

  function persistConsentFlags(granted) {
    _adsCanRequest = !!granted;
    try {
      if (C && typeof C.ld === 'function' && typeof C.sv === 'function') {
        const s = C.ld();
        s.consentAds = _adsCanRequest;
        s.consentAnalytics = _adsCanRequest;
        C.sv(s);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function syncConsentFromBridge() {
    try {
      if (g.AndroidBridge && typeof g.AndroidBridge.canShowAdsBridge === 'function') {
        persistConsentFlags(!!g.AndroidBridge.canShowAdsBridge());
        return;
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (C && typeof C.ld === 'function') {
        const s = C.ld();
        if (s && typeof s.consentAds === 'boolean') {
          _adsCanRequest = !!s.consentAds;
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  function canRequestAds() {
    try {
      if (g.AndroidBridge && typeof g.AndroidBridge.canShowAdsBridge === 'function') {
        return !!g.AndroidBridge.canShowAdsBridge();
      }
    } catch (e) {
      /* ignore */
    }
    return !!_adsCanRequest;
  }

  function hydrateStoreProductsFromBridge() {
    if (!g.AndroidBridge || typeof g.AndroidBridge.getProductDetailsJson !== 'function') return;
    try {
      const raw = g.AndroidBridge.getProductDetailsJson();
      applyProductDetailsJson(raw);
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * @param {string|Array<Record<string, any>>} raw
   */
  function applyProductDetailsJson(raw) {
    let list = raw;
    if (typeof raw === 'string') {
      try {
        list = JSON.parse(raw);
      } catch (e) {
        return;
      }
    }
    if (!Array.isArray(list)) return;
    const next = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p || !p.id) continue;
      next[p.id] = {
        id: p.id,
        title: p.title || '',
        formattedPrice: p.formattedPrice || '',
        priceCurrencyCode: p.priceCurrencyCode || '',
        priceAmountMicros: typeof p.priceAmountMicros === 'number' ? p.priceAmountMicros : 0,
      };
    }
    _storeProducts = next;
    if (C && typeof C.refreshShopUI === 'function') C.refreshShopUI();
  }

  const PlayBridge = {
    hasBilling() {
      return !!(g.AndroidBridge && typeof g.AndroidBridge.purchaseItem === 'function');
    },
    hasNativeAds() {
      return !!(g.AndroidBridge && typeof g.AndroidBridge.showRewardedAd === 'function');
    },
    /** UMP / GDPR / LGPD: ads + analytics remoto só após consentimento. */
    canRequestAds() {
      return canRequestAds();
    },
    hasAnalyticsConsent() {
      return canRequestAds();
    },
    /** @param {boolean} granted */
    setWebConsent(granted) {
      persistConsentFlags(!!granted);
    },
    /** @param {string} itemId */
    getStoreProduct(itemId) {
      return _storeProducts[itemId] || null;
    },
    /** @param {string} itemId @param {string} [fallback] */
    getStorePrice(itemId, fallback) {
      const p = _storeProducts[itemId];
      if (p && p.formattedPrice) return p.formattedPrice;
      return fallback || '';
    },
    getStoreProducts() {
      return Object.assign({}, _storeProducts);
    },
    purchase(itemId) {
      if (!this.hasBilling()) return false;
      g.AndroidBridge.purchaseItem(itemId);
      return true;
    },
    purchaseSubscription(productId) {
      if (g.AndroidBridge && typeof g.AndroidBridge.purchaseSubscription === 'function') {
        g.AndroidBridge.purchaseSubscription(productId);
        return true;
      }
      return this.purchase(productId);
    },
    restore() {
      if (g.AndroidBridge && typeof g.AndroidBridge.restorePurchases === 'function') {
        g.AndroidBridge.restorePurchases();
        return true;
      }
      return false;
    },
    showRewardedAd(onReward, onCancel) {
      if (!this.hasNativeAds()) return false;
      if (!this.canRequestAds()) {
        if (typeof onCancel === 'function') onCancel();
        return false;
      }
      if (g._nativeAdTimer) {
        clearTimeout(g._nativeAdTimer);
        g._nativeAdTimer = null;
      }
      g._playAdPending = { onReward, onCancel, native: true };
      g._nativeAdTimer = setTimeout(() => {
        if (g._playAdPending && g._playAdPending.native) {
          g._playAdPending = null;
          if (typeof g.showRewardedAdSimulated === 'function')
            g.showRewardedAdSimulated(onReward, onCancel);
        }
      }, g.NATIVE_AD_TIMEOUT || 4000);
      g.AndroidBridge.showRewardedAd();
      return true;
    },
    showInterstitial(onDone) {
      if (typeof g.hasNoAds === 'function' && g.hasNoAds()) {
        onDone && onDone();
        return false;
      }
      if (!this.canRequestAds()) {
        onDone && onDone();
        return false;
      }
      if (g.AndroidBridge && typeof g.AndroidBridge.showInterstitialAd === 'function') {
        g._interstitialDone = onDone;
        g.AndroidBridge.showInterstitialAd();
        return true;
      }
      return false;
    },
  };

  /**
   * Envia a compra para validação server-side. Sem token não há como validar,
   * então o grant fica apenas local até o próximo restore.
   * @param {string} itemId
   * @param {string} [token]
   */
  function queueConfirm(itemId, token) {
    if (!token) return false;
    if (!g.TBFirebase || typeof g.TBFirebase.queueIapConfirm !== 'function') return false;
    try {
      g.TBFirebase.queueIapConfirm(itemId, token);
      return true;
    } catch (e) {
      return false;
    }
  }

  function installNativeCallbacks() {
    g.onTileBlastConsentUpdate = (granted) => {
      persistConsentFlags(!!granted);
      if (!granted && C && typeof C.showToast === 'function') {
        C.showToast(
          '🔒',
          C._t ? C._t('ad_heading', 'Anúncios') : 'Anúncios',
          C._t
            ? C._t('ads_consent', 'Consentimento necessário para anúncios personalizados.')
            : 'Consentimento necessário para anúncios personalizados.'
        );
      }
    };
    g.onTileBlastAdRewarded = () => {
      if (g._nativeAdTimer) {
        clearTimeout(g._nativeAdTimer);
        g._nativeAdTimer = null;
      }
      if (g._playAdPending) {
        if (typeof g.recordAdWatch === 'function') g.recordAdWatch();
        if (g.TBAnalytics) g.TBAnalytics.log('ad_reward_granted', { type: 'rewarded' });
        if (g.TBRoadmap) g.TBRoadmap.statBump('adsWatched');
        g._playAdPending.onReward && g._playAdPending.onReward();
        g._playAdPending = null;
      }
    };
    g.onTileBlastAdDismissed = () => {
      if (g._nativeAdTimer) {
        clearTimeout(g._nativeAdTimer);
        g._nativeAdTimer = null;
      }
      if (g._playAdPending) {
        g._playAdPending.onCancel && g._playAdPending.onCancel();
        g._playAdPending = null;
      }
    };
    g.onTileBlastAdFailed = () => {
      if (g._nativeAdTimer) {
        clearTimeout(g._nativeAdTimer);
        g._nativeAdTimer = null;
      }
      if (g._playAdPending) {
        const p = g._playAdPending;
        g._playAdPending = null;
        if (typeof g.showRewardedAdSimulated === 'function')
          g.showRewardedAdSimulated(p.onReward, p.onCancel);
      }
    };
    g.onTileBlastInterstitialDismissed = () => {
      const cb = g._interstitialDone;
      g._interstitialDone = null;
      cb && cb();
    };
    g.onTileBlastRestore = (idsJson) => {
      if (!C) return;
      try {
        const raw = typeof idsJson === 'string' ? JSON.parse(idsJson) : idsJson;
        if (!Array.isArray(raw) || !raw.length) return;
        // O nativo pode enviar ['id', ...] (legado) ou [{id, token}, ...].
        const entries = raw
          .map((e) => (e && typeof e === 'object' ? { id: e.id, token: e.token } : { id: e }))
          .filter((e) => !!e.id);
        if (!entries.length) return;
        const meta = C.IAP_META || {};
        let granted = 0;
        entries.forEach(({ id, token }) => {
          if (
            id === 'noads' ||
            id === 'starter' ||
            id === 'bppremium' ||
            id === 'no_ads_monthly' ||
            id === 'no_ads_yearly' ||
            meta[id]
          ) {
            C.applyIapPurchase(id, token);
            queueConfirm(id, token);
            granted++;
          }
        });
        if (!granted) return;
        if (g.TBAnalytics) g.TBAnalytics.log('iap_restore', { count: granted });
        C.refreshShopUI && C.refreshShopUI();
        C.updateMapMeta && C.updateMapMeta();
        C.showToast(
          '💳',
          C._t('purchases_restored', 'Compras restauradas'),
          C._t('purchases_restored_sub', '{n} item(ns) ativo(s)').replace('{n}', String(granted))
        );
      } catch (e) {
        /* ignore */
      }
    };
    g.onTileBlastPurchaseSuccess = (itemId, token) => {
      if (!C) return;
      C.applyIapPurchase(itemId, token);
      queueConfirm(itemId, token);
      C.refreshShopUI && C.refreshShopUI();
      C.updateMapMeta && C.updateMapMeta();
      C.checkAchievements && C.checkAchievements();
      const meta = (C.IAP_META || {})[itemId];
      const store = PlayBridge.getStoreProduct(itemId);
      const name =
        (store && store.title) || (meta ? meta.label : C._t('purchase_generic', 'Compra'));
      C.showToast(
        '✅',
        C._t('purchase_activated', '{name} ativado!').replace('{name}', name),
        C._t('purchase_thanks', 'Obrigado pela compra!')
      );
    };
    g.onTileBlastPurchasePending = (itemId) => {
      if (!C) return;
      C.showToast(
        '⏳',
        C._t('purchase_pending', 'Pagamento pendente'),
        C._t('purchase_pending_sub', 'A compra será liberada quando o pagamento for confirmado.')
      );
      if (g.TBAnalytics) g.TBAnalytics.log('iap_pending', { item: itemId || null });
    };
    g.onTileBlastPurchaseError = (msg) => {
      if (!C) return;
      const cancelled = msg === 'cancelled';
      C.showToast(
        cancelled ? '💳' : '💳',
        cancelled
          ? C._t('purchase_cancelled', 'Compra cancelada')
          : C._t('purchase_failed', 'Compra não concluída'),
        cancelled
          ? C._t('purchase_cancelled_sub', 'Nenhuma cobrança foi feita.')
          : msg || C._t('try_again', 'Tente novamente.')
      );
    };
    g.onTileBlastProductDetails = (json) => {
      applyProductDetailsJson(json);
    };
  }

  g.PlayBridge = PlayBridge;
  g.TBPlayBridge = {
    init,
    PlayBridge,
    queueConfirm,
    applyProductDetailsJson,
    syncConsentFromBridge,
  };
})(typeof window !== 'undefined' ? window : globalThis);
