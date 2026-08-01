// @ts-check
/**
 * Tile Blast — save (ld/sv), vidas/moedas/PU, IAP e helpers de economia.
 * Carregar após tb-secure.js. TBSave.init(cfg) no boot p/ deps de UI.
 *
 * @typedef {Record<string, any>} TBSaveCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBEconomy = global.TBEconomy;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBSecure = global.TBSecure;
  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBAnalytics = global.TBAnalytics;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBUI = global.TBUI;

  /** @type {any} */
  let C = null;

  const SK = 'tbv4';
  const ML = TBEconomy.LIVES.max;
  const LIFE_REGEN_MS = TBEconomy.LIVES.regenMs;
  const SAVE_DEBOUNCE_MS = 400;
  const SHOP_COIN_PRICES = TBEconomy.SHOP_COIN_PRICES;
  const IAP_META = TBEconomy.IAP_META;

  let _saveCache = null,
    _saveDirty = false,
    /** @type {ReturnType<typeof setTimeout>|null} */
    _saveTimer = null;

  /** @param {TBSaveCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function t(k, f) {
    if (C && typeof C._t === 'function') return C._t(k, f);
    return f != null ? f : k;
  }

  function _localToday() {
    return TBLogic.localDateKey(new Date());
  }
  function _localYesterday() {
    return TBLogic.localYesterdayKey(new Date());
  }

  const ld = () => {
    if (_saveCache !== null) return _saveCache;
    try {
      const raw = localStorage.getItem(SK);
      if (TBSecure) {
        const r = TBSecure.unwrap(raw);
        if (r.status === 'tampered') global.__saveTampered = true;
        _saveCache = r.data || {};
      } else {
        _saveCache = JSON.parse(raw) || {};
      }
    } catch {
      _saveCache = {};
    }
    return _saveCache;
  };

  const flushSave = () => {
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    if (!_saveDirty || _saveCache === null) return;
    localStorage.setItem(SK, TBSecure ? TBSecure.wrap(_saveCache) : JSON.stringify(_saveCache));
    _saveDirty = false;
  };

  const sv = (s) => {
    _saveCache = s;
    _saveDirty = true;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  };

  const getLives = () => Math.min(ld().lives ?? ML, ML);
  const getUnlocked = () => ld().unlocked ?? 0;
  const getStars = (i) => (ld().stars || {})[i] ?? 0;
  const getHS = () => ld().hs ?? 0;
  const getCoins = () => ld().coins ?? 0;
  const getPUCount = (id) => (ld().pu || {})[id] ?? 0;

  const setLives = (v) => {
    const s = ld();
    s.lives = Math.max(0, Math.min(ML, v));
    if (s.lives < ML && !s.lifeRegenAt) s.lifeRegenAt = Date.now();
    if (s.lives >= ML) delete s.lifeRegenAt;
    sv(s);
  };

  const loseLive = () => {
    const prev = getLives();
    setLives(prev - 1);
    if (prev > 0) {
      if (C && C.triggerShake) C.triggerShake(6, 220);
      showToast(
        '💔',
        t('life_lost', 'Vida perdida'),
        t('lives_left', `${getLives()} restantes`).replace('{n}', String(getLives()))
      );
    }
  };

  const resetLives = () => setLives(ML);

  const addCoins = (n) => {
    const s = ld();
    s.coins = (s.coins ?? 0) + n;
    sv(s);
  };

  const usePU = (id) => {
    const c = getPUCount(id);
    if (c <= 0) return false;
    const s = ld();
    s.pu = s.pu || {};
    s.pu[id] = c - 1;
    sv(s);
    return true;
  };

  const addPU = (id, n) => {
    if (n === undefined) n = 1;
    const s = ld();
    s.pu = s.pu || {};
    s.pu[id] = (s.pu[id] || 0) + n;
    sv(s);
  };

  const completeLevel = (i, stars, score) => {
    const s = ld();
    const prevUnlocked = s.unlocked ?? 0;
    s.unlocked = Math.max(prevUnlocked, i + 1);
    s.stars = s.stars || {};
    s.stars[i] = Math.max(s.stars[i] ?? 0, stars);
    s.hs = Math.max(s.hs ?? 0, score);
    sv(s);
    if (typeof global.grantWorldCompletionIfNeeded === 'function') {
      global.grantWorldCompletionIfNeeded(i);
    }
    if (i + 1 < TBState.LEVELS.length) {
      const prevWorld = TBState.LEVELS[prevUnlocked]?.world || '';
      const newWorld = TBState.LEVELS[i + 1]?.world || '';
      if (newWorld !== prevWorld && i + 1 > prevUnlocked) {
        setTimeout(() => showWorldUnlock(newWorld), 1200);
      }
    }
  };

  function showWorldUnlock(worldName) {
    const unlockWorldSkin = C && C.unlockWorldSkin;
    const skinItem = unlockWorldSkin ? unlockWorldSkin(worldName) : null;
    const filters = global.BLASTY_SKIN_FILTERS || {};
    const skinF = skinItem ? filters[skinItem.skin] || '' : '';
    if (global.Music) global.Music.updateTheme();
    if (typeof global.updateMusicToggleUI === 'function') global.updateMusicToggleUI();
    const locName =
      C && C._locCollName
        ? C._locCollName(skinItem)
        : skinItem && skinItem.name
          ? skinItem.name
          : '';
    showGlobalModal(
      `
    <div class="mascot-wrap mascot-wrap--md mascot-excited" style="margin:0 auto 8px">
      <img class="mascot-img" src="mascot.svg" alt="Blasty" style="filter:${skinF}">
    </div>
    <div style="font-size:20px;font-weight:800;color:var(--accent)">Novo Mundo!</div>
    <div style="font-size:26px;font-weight:800;margin:8px 0">${worldName}</div>
    ${skinItem ? `<div style="font-size:13px;color:var(--accent);font-weight:700;">${t('skin_unlocked', '🎨 Skin desbloqueada: Blasty {name}!').replace('{name}', locName)}</div>` : ''}
    <div style="font-size:12px;color:var(--dim);margin-top:6px;">Nova trilha sonora ativada 🎵</div>
    <button data-action="closeGlobalModal" class="btn btn-p" style="width:100%;font-size:15px;margin-top:12px;">Explorar! 🚀</button>
  `,
      'Novo mundo desbloqueado'
    );
  }

  const resetAll = () => {
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    _saveCache = null;
    _saveDirty = false;
    localStorage.removeItem(SK);
  };

  function showToast(icon, title, sub) {
    return TBUI.toast(icon, title, sub);
  }

  function showGlobalModal(html, title) {
    if (C && C.showGlobalModal) return C.showGlobalModal(html, title);
    return TBUI.showModal(html, title);
  }

  function getRemoteEconomyCfg() {
    return TBRoadmap && TBRoadmap.remoteConfig ? TBRoadmap.remoteConfig() : ld().remoteCfg || {};
  }

  function getIAPMeta() {
    return TBEconomy.getIAPMeta(getRemoteEconomyCfg());
  }

  function getEconomyCoinMult(evMult) {
    return TBEconomy.getGlobalCoinMult(evMult || 1, getRemoteEconomyCfg());
  }

  function _shopLocale() {
    return TBLogic.localeTag(ld().lang);
  }

  function applyIapPurchase(itemId, token) {
    const meta = getIAPMeta()[itemId] || IAP_META[itemId];
    if (!meta) return;
    const s = ld();
    if (token) {
      s.iapTokens = s.iapTokens || {};
      if (s.iapTokens[token]) return;
      s.iapTokens[token] = { item: itemId, at: Date.now() };
    }
    const nonConsumable = !!(TBEconomy && TBEconomy.isNonConsumable(meta));
    const grantBonus = TBEconomy ? TBEconomy.shouldGrantIapBonus(itemId, meta, s) : true;
    if (grantBonus) {
      if (meta.coins) addCoins(meta.coins);
      if (meta.extras) Object.entries(meta.extras).forEach(([k, v]) => addPU(k, v));
    }
    if (meta.noAds) s.noAds = true;
    if (itemId === 'starter') s.boughtStarter = true;
    if (itemId === 'welcome') s.boughtWelcome = true;
    if (itemId === 'bppremium' || meta.bpPremium) {
      if (TBRoadmap) TBRoadmap.activateBpPremium();
      else s.bpPremiumOwned = true;
    }
    if (nonConsumable) {
      s.iapGranted = s.iapGranted || {};
      s.iapGranted[itemId] = Date.now();
    }
    if (TBEconomy) TBEconomy.markIAPFlag(s, itemId);
    s.boughtAnyIAP = true;
    sv(s);
    TBAnalytics.log('iap_success', { item: itemId, granted: grantBonus });
  }

  function reconcileServerEconomy(result) {
    if (!result || typeof result.coins !== 'number') return;
    const s = ld();
    s.coins = result.coins;
    const ent = result.entitlements || {};
    if (ent.noAds) s.noAds = true;
    if (ent.starter) s.boughtStarter = true;
    if (ent.welcome) s.boughtWelcome = true;
    if (ent.bpPremium) {
      if (TBRoadmap && typeof TBRoadmap.activateBpPremium === 'function') {
        TBRoadmap.activateBpPremium();
      } else s.bpPremiumOwned = true;
    }
    sv(s);
    try {
      if (typeof global.refreshShopUI === 'function') global.refreshShopUI();
    } catch (e) {}
    try {
      if (typeof global.updateMapMeta === 'function') global.updateMapMeta();
    } catch (e) {}
  }

  /** @type {any} */
  const api = {
    init,
    SK,
    ML,
    LIFE_REGEN_MS,
    SAVE_DEBOUNCE_MS,
    SHOP_COIN_PRICES,
    IAP_META,
    _localToday,
    _localYesterday,
    ld,
    sv,
    flushSave,
    getLives,
    getUnlocked,
    getStars,
    getHS,
    getCoins,
    getPUCount,
    setLives,
    loseLive,
    resetLives,
    addCoins,
    usePU,
    addPU,
    completeLevel,
    showWorldUnlock,
    resetAll,
    showToast,
    getRemoteEconomyCfg,
    getIAPMeta,
    getEconomyCoinMult,
    _shopLocale,
    applyIapPurchase,
    reconcileServerEconomy,
  };

  /** @type {any} */
  const g = global;
  g.SK = SK;
  g.ML = ML;
  g.LIFE_REGEN_MS = LIFE_REGEN_MS;
  g.SAVE_DEBOUNCE_MS = SAVE_DEBOUNCE_MS;
  g.SHOP_COIN_PRICES = SHOP_COIN_PRICES;
  g.IAP_META = IAP_META;
  g._localToday = _localToday;
  g._localYesterday = _localYesterday;
  g.ld = ld;
  g.sv = sv;
  g.flushSave = flushSave;
  g.getLives = getLives;
  g.getUnlocked = getUnlocked;
  g.getStars = getStars;
  g.getHS = getHS;
  g.getCoins = getCoins;
  g.getPUCount = getPUCount;
  g.setLives = setLives;
  g.loseLive = loseLive;
  g.resetLives = resetLives;
  g.addCoins = addCoins;
  g.usePU = usePU;
  g.addPU = addPU;
  g.completeLevel = completeLevel;
  g.showWorldUnlock = showWorldUnlock;
  g.resetAll = resetAll;
  g.showToast = showToast;
  g.getRemoteEconomyCfg = getRemoteEconomyCfg;
  g.getIAPMeta = getIAPMeta;
  g.getEconomyCoinMult = getEconomyCoinMult;
  g._shopLocale = _shopLocale;
  g.applyIapPurchase = applyIapPurchase;
  g.reconcileServerEconomy = reconcileServerEconomy;
  g.TBSave = api;
})(typeof window !== 'undefined' ? window : globalThis);
