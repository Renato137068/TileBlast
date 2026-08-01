// @ts-check
/**
 * Tile Blast — sistema de ads / no-ads.
 * Dependências via TBAds.init(cfg) no boot (quando aplicável).
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBEconomy = global.TBEconomy;
  /** @type {any} */
  const TBAnalytics = global.TBAnalytics;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  /** @param {Record<string, any>|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // NO-ADS & AD SYSTEM
  // ═══════════════════════════════════════════════════════════════
  const hasNoAds = () => !!C.ld().noAds;
  const AD_DAILY_LIMIT = TBEconomy.AD_REWARDS.dailyLimit;
  function getAdState() {
    const s = C.ld(),
      today = C._localToday();
    if (!s.adsToday || s.adsToday.date !== today) return { date: today, count: 0 };
    return s.adsToday;
  }
  function getAdDailyLimit() {
    const rc = C.ld().remoteCfg;
    return rc && rc.adDailyLimit ? rc.adDailyLimit : AD_DAILY_LIMIT;
  }
  function canWatchAd() {
    return !hasNoAds() && getAdState().count < getAdDailyLimit();
  }
  function recordAdWatch() {
    const s = C.ld(),
      st = getAdState();
    st.count = (st.count || 0) + 1;
    s.adsToday = st;
    C.sv(s);
    // Fundação economia server-side (shadow): enfileira grantAdReward sem
    // alterar o saldo local. Offline/sem config → no-op seguro.
    // Ver docs/ECONOMIA-SERVER-SIDE.md.
    /** @type {any} */
    const FB = global.TBFirebase;
    if (FB && typeof FB.queueAdGrantShadow === 'function') {
      FB.queueAdGrantShadow('coins');
    }
  }

  // Rewarded ad — WebView nativo (AdMob) ou simulador web
  let _adDismiss = null,
    _playAdPending = null,
    _nativeAdTimer = null;
  const NATIVE_AD_TIMEOUT = 4000;
  function cancelRewardedAd() {
    if (_adDismiss) {
      _adDismiss();
      _adDismiss = null;
    } else if (_playAdPending) {
      const cb = _playAdPending.onCancel;
      _playAdPending = null;
      cb && cb();
    }
  }
  function showRewardedAdSimulated(onReward, onCancel) {
    const overlay = document.getElementById('ad-overlay');
    const skipWrap = document.getElementById('ad-skip-wrap');
    const timerEl = document.getElementById('ad-timer');
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    skipWrap.style.display = 'none';
    let secs = 5,
      skipInt = null,
      loadTimer = null,
      finished = false;
    const cleanup = () => {
      if (skipInt) {
        clearInterval(skipInt);
        skipInt = null;
      }
      if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      _adDismiss = null;
    };
    _adDismiss = () => {
      if (finished) return;
      cleanup();
      onCancel && onCancel();
    };
    const startCountdown = () => {
      skipWrap.style.display = 'flex';
      timerEl.textContent = String(secs);
      skipInt = setInterval(() => {
        secs--;
        timerEl.textContent = String(secs);
        if (secs <= 0) {
          finished = true;
          cleanup();
          recordAdWatch();
          TBAnalytics.log('ad_reward_granted', { type: 'rewarded_sim' });
          if (TBRoadmap) TBRoadmap.statBump('adsWatched');
          onReward && onReward();
        }
      }, 1000);
    };
    loadTimer = setTimeout(startCountdown, 1000);
  }
  function showRewardedAd(onReward, onCancel) {
    if (!canWatchAd()) {
      C.showToast(
        '📺',
        C._t('ad_daily_limit', 'Limite diário atingido'),
        C._t('ad_daily_limit_sub', 'Volte amanhã para mais anúncios!')
      );
      onCancel && onCancel();
      return;
    }
    TBAnalytics.log('ad_offer', { type: 'rewarded' });
    if (C.PlayBridge.showRewardedAd(onReward, onCancel)) return;
    showRewardedAdSimulated(onReward, onCancel);
  }

  /** @type {any} */
  const api = {
    init,
    hasNoAds,
    getAdState,
    getAdDailyLimit,
    canWatchAd,
    recordAdWatch,
    cancelRewardedAd,
    showRewardedAdSimulated,
    showRewardedAd,
    AD_DAILY_LIMIT,
  };

  /** @type {any} */
  const g = global;
  g.hasNoAds = hasNoAds;
  g.getAdState = getAdState;
  g.getAdDailyLimit = getAdDailyLimit;
  g.canWatchAd = canWatchAd;
  g.recordAdWatch = recordAdWatch;
  g.cancelRewardedAd = cancelRewardedAd;
  g.showRewardedAdSimulated = showRewardedAdSimulated;
  g.showRewardedAd = showRewardedAd;
  g.AD_DAILY_LIMIT = AD_DAILY_LIMIT;
  g.NATIVE_AD_TIMEOUT = NATIVE_AD_TIMEOUT;
  Object.defineProperty(g, '_playAdPending', {
    get() {
      return _playAdPending;
    },
    set(v) {
      _playAdPending = v;
    },
    configurable: true,
  });
  Object.defineProperty(g, '_nativeAdTimer', {
    get() {
      return _nativeAdTimer;
    },
    set(v) {
      _nativeAdTimer = v;
    },
    configurable: true,
  });
  g.TBAds = api;
})(typeof window !== 'undefined' ? window : globalThis);
