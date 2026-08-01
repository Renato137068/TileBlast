/**
 * Tile Blast — Remote Config (JSON estático + Firestore opcional).
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    adDailyLimit: 5,
    interstitialEvery: 5,
    interstitialDailyCap: 5,
    coinMult: 1,
    starterPrice: 2.99,
    bppremiumPrice: 6.99,
    flashCoins: 800,
    piggyCap: 500,
    dynamicOffersEnabled: true,
    liveOpsEnabled: true,
    liveOpsCalendarEnabled: true,
    liveOpsDailyEnabled: true,
    liveOpsWeeklyEnabled: true,
    liveOpsSocialEnabled: true,
    liveOpsReturnEnabled: true,
    liveOpsRemindersEnabled: true,
    calendarWeekOffset: 0,
    disabledCalendarWeeks: [],
    disabledEvents: [],
    activeEventId: '',
  };

  const CACHE_KEY = 'tb_remote_cfg';
  const CACHE_TTL = 3600000;

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('http ' + res.status);
    return res.json();
  }

  async function fetchFirestore() {
    if (!global.TBFirebase || !TBFirebase.configValid()) return null;
    const ok = await TBFirebase.boot();
    if (!ok || !global.firebase) return null;
    const snap = await global.firebase.firestore().collection('config').doc('public').get();
    return snap.exists ? snap.data() : null;
  }

  async function load(ldFn, svFn) {
    const s = ldFn();
    const cached = s._remoteCfgCache;
    if (cached && cached.at && Date.now() - cached.at < CACHE_TTL && cached.data) {
      s.remoteCfg = Object.assign({}, DEFAULTS, cached.data);
      svFn(s);
      return s.remoteCfg;
    }

    let remote = null;
    try {
      remote = await fetchFirestore();
    } catch (e) {
      /* ignore */
    }

    if (!remote) {
      try {
        remote = await fetchJson('remote-config.json?v=' + (global.APP_VERSION || '1'));
      } catch (e) {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) remote = JSON.parse(raw);
        } catch (e2) {
          /* ignore */
        }
      }
    }

    const merged = Object.assign({}, DEFAULTS, remote || {});
    s.remoteCfg = merged;
    s._remoteCfgCache = { at: Date.now(), data: merged };
    svFn(s);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    } catch (e) {
      /* ignore */
    }
    return merged;
  }

  global.TBRemote = { load, DEFAULTS };
})(typeof window !== 'undefined' ? window : globalThis);
