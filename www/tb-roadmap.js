/**
 * Tile Blast — roadmap shell (master levels, tutorial, remote, boot).
 * Satélites: i18n/achievements/offers/social/retention. Init via TBRoadmap.init(cfg).
 */
(function (global) {
  'use strict';

  let C = null;

  function t(key, fallback) {
    if (global.TBI18n && global.TBI18n.t) return global.TBI18n.t(key);
    return fallback != null ? fallback : key;
  }
  function colorName(i) {
    return global.TBI18n ? global.TBI18n.colorName(i) : String(i);
  }
  function detectLanguage(navLang) {
    return global.TBI18n ? global.TBI18n.detectLanguage(navLang) : 'en';
  }
  function setLanguage(lang) {
    if (global.TBI18n) global.TBI18n.setLanguage(lang);
  }
  function applyI18n() {
    if (global.TBI18n) global.TBI18n.applyI18n();
  }
  function applyDataI18n(root) {
    if (global.TBI18n) global.TBI18n.applyDataI18n(root);
  }

  function _offers() {
    return global.TBOffers || null;
  }
  function prepareReturnPlayerOffer() {
    const o = _offers();
    if (o) o.prepareReturnPlayerOffer();
  }
  function addBattlePassXP(amount) {
    const o = _offers();
    if (o) o.addBattlePassXP(amount);
  }
  function openBattlePassModal() {
    const o = _offers();
    if (o) o.openBattlePassModal();
  }
  function buyBpPremium() {
    const o = _offers();
    if (o) o.buyBpPremium();
  }
  function activateBpPremium() {
    const o = _offers();
    if (o) o.activateBpPremium();
  }
  function addPiggyCoins(amount) {
    const o = _offers();
    if (o) o.addPiggyCoins(amount);
  }
  function openPiggyModal() {
    const o = _offers();
    if (o) o.openPiggyModal();
  }
  function breakPiggy() {
    const o = _offers();
    if (o) o.breakPiggy();
  }
  function onLevelLoss(lvIdx) {
    const o = _offers();
    if (o) o.onLevelLoss(lvIdx);
  }
  function onReturnToMap(reason) {
    const o = _offers();
    if (o) o.onReturnToMap(reason);
  }
  function evaluateDynamicOffers(trigger) {
    const o = _offers();
    if (o) o.evaluateDynamicOffers(trigger);
  }
  function claimDynamicOffer() {
    const o = _offers();
    if (o) o.claimDynamicOffer();
  }
  function openFlashModal() {
    const o = _offers();
    if (o) o.openFlashModal();
  }
  function claimFlash() {
    const o = _offers();
    if (o) o.claimFlash();
  }
  function onWinStreak(won) {
    const o = _offers();
    if (o) o.onWinStreak(won);
  }
  function maybeShowInterstitial(cb) {
    const o = _offers();
    if (o) o.maybeShowInterstitial(cb);
    else if (cb) cb();
  }
  function purchaseSubscription(productId) {
    const o = _offers();
    if (o) o.purchaseSubscription(productId);
  }

  function _ach() {
    return global.TBAchievements || null;
  }
  function _social() {
    return global.TBSocial || null;
  }
  function getAllAchievements() {
    const a = _ach();
    return a ? a.getAllAchievements() : [];
  }
  function checkExtendedAchievements(ctx) {
    const a = _ach();
    if (a) a.checkExtendedAchievements(ctx);
  }
  function openAchievementsModal() {
    const a = _ach();
    if (a) a.openAchievementsModal();
  }
  function getPlayerName() {
    const s = _social();
    return s ? s.getPlayerName() : 'You';
  }
  function openPlayerNameModal() {
    const s = _social();
    if (s) s.openPlayerNameModal();
  }
  function savePlayerName() {
    const s = _social();
    if (s) s.savePlayerName();
  }
  function deleteSocialData() {
    const s = _social();
    if (s && s.deleteSocialData) return s.deleteSocialData();
  }
  function openLeaderboardModal() {
    const s = _social();
    if (s) return s.openLeaderboardModal();
  }
  function recordLeaderboardScore(mode, score) {
    const s = _social();
    if (s) s.recordLeaderboardScore(mode, score);
  }
  function exportSave() {
    const s = _social();
    if (s) s.exportSave();
  }
  function importSave(file) {
    const s = _social();
    if (s) s.importSave(file);
  }
  function cloudSyncFirebase() {
    const s = _social();
    if (s) return s.cloudSyncFirebase();
  }
  function cloudBackup() {
    const s = _social();
    if (s) s.cloudBackup();
  }
  function cloudRestore() {
    const s = _social();
    if (s) s.cloudRestore();
  }
  function shareScore(score, label) {
    const s = _social();
    if (s) s.shareScore(score, label);
  }

  function _retention() {
    return global.TBRetention || null;
  }
  function computeLoginStreak(lastLogin, today, currentStreak) {
    const r = _retention();
    return r ? r.computeLoginStreak(lastLogin, today, currentStreak) : 1;
  }
  function computeLoginReward(streak, rewards) {
    const r = _retention();
    return r ? r.computeLoginReward(streak, rewards) : { coins: 0, isWeek: false, base: 0 };
  }
  function checkDailyLoginReward() {
    const r = _retention();
    if (r) r.checkDailyLoginReward();
  }
  function showChangelogIfNeeded() {
    const r = _retention();
    if (r) r.showChangelogIfNeeded();
  }
  function dismissChangelog() {
    const r = _retention();
    if (r) r.dismissChangelog();
  }
  function saveSessionSnapshot(screen, lv, inf) {
    const r = _retention();
    if (r) r.saveSessionSnapshot(screen, lv, inf);
  }
  function offerContinueSession() {
    const r = _retention();
    if (r) r.offerContinueSession();
  }
  function resumeSession() {
    const r = _retention();
    if (r) r.resumeSession();
  }
  function clearSession() {
    const r = _retention();
    if (r) r.clearSession();
  }
  function scheduleLocalReminders() {
    const r = _retention();
    if (r) r.scheduleLocalReminders();
  }
  function requestPushPermission() {
    const r = _retention();
    if (r) r.requestPushPermission();
  }
  function maybeRequestPushAfterProgress() {
    const r = _retention();
    if (r) r.maybeRequestPushAfterProgress();
  }

  function ready() {
    return !!(C && C.ld);
  }

  function remoteConfig() {
    const s = C ? C.ld() : {};
    const def = {
      adDailyLimit: 5,
      interstitialEvery: 5,
      coinMult: 1,
      starterPrice: 2.99,
      adRewardCoins: 50,
    };
    return Object.assign(def, s.remoteCfg || {});
  }

  let tutorialHighlight = null;

  function findTutorialGroup() {
    if (!C.grid || !C.grid.length) return null;
    for (let x = 0; x < C.GW; x++) {
      for (let y = 0; y < C.GH; y++) {
        const g = C.getGroup(x, y);
        if (g.length >= 2) return g;
      }
    }
    return null;
  }

  function showBoardTutorialHighlight() {
    const g = findTutorialGroup();
    if (!g || !g.length) return;
    tutorialHighlight = new Set(g.map(([a, b]) => a + ',' + b));
    C.requestDraw && C.requestDraw();
    const overlay = document.getElementById('board-tutorial-ring');
    if (overlay) overlay.classList.add('show');
  }

  function clearBoardTutorialHighlight() {
    tutorialHighlight = null;
    const overlay = document.getElementById('board-tutorial-ring');
    if (overlay) overlay.classList.remove('show');
    C.requestDraw && C.requestDraw();
  }

  function isTutorialCell(x, y) {
    return tutorialHighlight && tutorialHighlight.has(x + ',' + y);
  }

  const MASTER_EPISODES = [
    { name: 'Ascensão', moves: 18, objectives: [{ type: 'score', target: 4500 }] },
    {
      name: 'Dupla Coroa',
      moves: 24,
      objectives: [
        { type: 'color', color: 0, target: 30 },
        { type: 'chain', target: 8 },
      ],
    },
    { name: 'Relâmpago', moves: 14, objectives: [{ type: 'score', target: 3800 }] },
    {
      name: 'Prismas',
      moves: 24,
      objectives: [
        { type: 'color', color: 1, target: 30 },
        { type: 'color', color: 3, target: 30 },
        { type: 'color', color: 5, target: 28 },
      ],
    },
    {
      name: 'Tormenta',
      moves: 22,
      objectives: [
        { type: 'chain', target: 12 },
        { type: 'score', target: 3500 },
      ],
    },
    {
      name: 'Hexa Master',
      moves: 26,
      objectives: [
        { type: 'color', color: 0, target: 28 },
        { type: 'color', color: 2, target: 28 },
        { type: 'color', color: 4, target: 28 },
      ],
    },
    {
      name: 'Supremacia',
      moves: 15,
      objectives: [
        { type: 'score', target: 5200 },
        { type: 'color', color: 5, target: 35 },
      ],
    },
    {
      name: 'Coroa Tripla',
      moves: 28,
      objectives: [
        { type: 'chain', target: 14 },
        { type: 'color', color: 1, target: 28 },
        { type: 'score', target: 4200 },
      ],
    },
    { name: 'Penúltimo Julgamento', moves: 13, objectives: [{ type: 'score', target: 4600 }] },
    {
      name: 'TILE MASTER 👑',
      moves: 30,
      objectives: [
        { type: 'color', color: 0, target: 28 },
        { type: 'color', color: 2, target: 28 },
        { type: 'color', color: 4, target: 28 },
        { type: 'score', target: 6500 },
      ],
    },
  ];

  function appendMasterLevels() {
    if (C._masterAppended) return;
    C._masterAppended = true;
    if (
      global.TBContent &&
      TBContent.isLoaded &&
      TBContent.isLoaded() &&
      TBContent.getLevelCount() >= 80
    ) {
      C.LEVELS = TBContent.getLevels();
      return;
    }
    MASTER_EPISODES.forEach((ep) => {
      C.LEVELS.push({
        world: '👑 Lendário',
        name: ep.name,
        moves: ep.moves,
        objectives: ep.objectives.map((o) => ({ ...o })),
      });
    });
  }

  function applyRemoteConfig() {
    const cfg = remoteConfig();
    if (cfg.adDailyLimit && C.AD_DAILY_LIMIT !== undefined) {
      global.AD_DAILY_LIMIT = cfg.adDailyLimit;
    }
  }

  function boot() {
    const s = C.ld();
    if (!s.remoteCfg) {
      s.remoteCfg = { adDailyLimit: 5, interstitialEvery: 5, interstitialDailyCap: 5, coinMult: 1 };
      C.sv(s);
    }
    appendMasterLevels();
    if (global.TBRemote) {
      TBRemote.load(C.ld, C.sv)
        .then(() => applyRemoteConfig())
        .catch((e) => {
          if (global.TBRuntime && global.TBRuntime.warn)
            global.TBRuntime.warn('TBRoadmap.remoteLoad', e);
          applyRemoteConfig();
        });
    } else {
      applyRemoteConfig();
    }
    applyI18n();
    if (global.TBFirebase && TBFirebase.configValid()) {
      TBFirebase.boot();
    }
    if (global.TBOffers) global.TBOffers.bootBanners();

    if (global.TBRetention) global.TBRetention.bootRetention();
    const wrap = C.checkAchievements;
    if (wrap) {
      global.checkAchievements = function () {
        wrap();
        checkExtendedAchievements(true);
      };
    }
    checkExtendedAchievements();
  }

  const api = {
    isReady: ready,
    init(cfg) {
      C = cfg;
      if (global.TBI18n) global.TBI18n.init(cfg);
      if (global.TBOffers) global.TBOffers.init(cfg);
      if (global.TBAchievements) global.TBAchievements.init(cfg);
      if (global.TBSocial) global.TBSocial.init(cfg);
      if (global.TBRetention) global.TBRetention.init(cfg);
      // Auto-detecta idioma na primeira execucao (sem escolha salva ainda).
      try {
        const s0 = C.ld();
        if (!s0.lang) {
          s0.lang = detectLanguage(typeof navigator !== 'undefined' ? navigator.language : '');
          C.sv(s0);
          if (typeof document !== 'undefined') {
            const lm = { pt: 'pt-BR', en: 'en', es: 'es' };
            document.documentElement.lang = lm[s0.lang] || 'pt-BR';
          }
        }
      } catch (e) {
        /* ignore */
      }
      boot();
    },
    buyBpPremium,
    activateBpPremium,
    onLevelLoss,
    onReturnToMap,
    evaluateDynamicOffers,
    claimDynamicOffer,
    openAchievementsModal,
    openLeaderboardModal,
    openBattlePassModal,
    openPiggyModal,
    openFlashModal,
    openPlayerNameModal,
    savePlayerName,
    deleteSocialData,
    breakPiggy,
    claimFlash,
    onWinStreak,
    addBattlePassXP,
    addPiggyCoins,
    recordLeaderboardScore,
    maybeShowInterstitial,
    exportSave,
    importSave,
    cloudBackup,
    cloudRestore,
    cloudSyncFirebase,
    setLanguage,
    detectLanguage,
    computeLoginStreak,
    computeLoginReward,
    applyI18n,
    applyDataI18n,
    colorName,
    shareScore,
    checkDailyLoginReward,
    prepareReturnPlayerOffer,
    purchaseSubscription,
    showChangelogIfNeeded,
    dismissChangelog,
    saveSessionSnapshot,
    offerContinueSession,
    resumeSession,
    clearSession,
    showBoardTutorialHighlight,
    clearBoardTutorialHighlight,
    isTutorialCell,
    checkExtendedAchievements,
    requestPushPermission,
    maybeRequestPushAfterProgress,
    scheduleLocalReminders,
    remoteConfig,
    t,
    statBump(key, n) {
      const s = C.ld();
      s.stats = s.stats || {};
      s.stats[key] = (s.stats[key] || 0) + (n || 1);
      C.sv(s);
    },
  };

  global.TBRoadmap = api;
})(typeof window !== 'undefined' ? window : globalThis);
