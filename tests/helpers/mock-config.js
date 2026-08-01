export function makeLevels(count = 50) {
  return Array.from({ length: count }, (_, i) => ({
    world: i < 10 ? '🌱 Jardim' : '🌲 Floresta',
    name: `Fase ${i + 1}`,
    moves: 20,
    objectives: [{ type: 'score', target: 500 + i * 10 }],
  }));
}

export function createMockConfig(overrides = {}) {
  const SK = overrides.SK || 'tb_test';
  let cache = null;

  const ld = () => {
    if (cache !== null) return cache;
    try {
      cache = JSON.parse(localStorage.getItem(SK) || '{}');
    } catch {
      cache = {};
    }
    if (!cache || typeof cache !== 'object') cache = {};
    return cache;
  };

  const sv = (s) => {
    cache = s;
    localStorage.setItem(SK, JSON.stringify(s));
  };

  const LEVELS = overrides.LEVELS || makeLevels(50);
  const ACHIEVEMENTS = overrides.ACHIEVEMENTS || [];

  const cfg = {
    SK,
    ML: 5,
    AD_DAILY_LIMIT: 5,
    LEVELS,
    ACHIEVEMENTS,
    ld,
    sv,
    getCoins: () => ld().coins ?? 0,
    addCoins: (n) => {
      const s = ld();
      s.coins = (s.coins ?? 0) + n;
      sv(s);
    },
    addPU: () => {},
    getUnlocked: () => ld().unlocked ?? 0,
    getHS: () => ld().hs ?? 0,
    getLives: () => Math.min(ld().lives ?? 5, 5),
    hasNoAds: () => !!ld().noAds,
    showGlobalModal: () => {},
    closeGlobalModal: () => {},
    showToast: () => {},
    showScreen: () => {},
    refreshShopUI: () => {},
    updateMapMeta: () => {},
    renderMap: () => {},
    IAP_META: {},
    applyIapPurchase: () => {},
    checkAchievements: () => {},
    updateMusicToggleUI: () => {},
    PlayBridge: {},
    grid: [],
    getGroup: () => [],
    requestDraw: () => {},
    GW: 8,
    GH: 8,
    startGame: () => {},
    startInfiniteMode: () => {},
    shopBuyIAP: () => {},
    openShop: () => {},
    showNoLivesModal: () => {},
    startDailyPuzzleGame: () => {},
    goToMap: () => {},
    ...overrides,
  };

  return cfg;
}

export function createFeaturesConfig(base) {
  return {
    ld: base.ld,
    sv: base.sv,
    getCoins: base.getCoins,
    addCoins: base.addCoins,
    getUnlocked: base.getUnlocked,
    getLives: base.getLives,
    showGlobalModal: base.showGlobalModal,
    closeGlobalModal: base.closeGlobalModal,
    showToast: base.showToast,
    startGame: base.startGame,
    LEVELS: base.LEVELS,
    requestDraw: base.requestDraw,
    Sound: { click: () => {} },
    checkAchievements: base.checkAchievements,
  };
}
