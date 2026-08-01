// @ts-check
/**
 * TB-ECONOMY — Fonte única de economia, monetização e LiveOps (dados).
 * Centraliza preços, recompensas, pacotes IAP, ofertas rotativas, rewarded ads,
 * Battle Pass, login diário e esquema de remote config / admin dashboard.
 * Exposto como window.TBEconomy.
 *
 * @typedef {{
 *   coins?: number,
 *   bomb?: number,
 *   rainbow?: number,
 *   shuffle?: number,
 *   moves?: number,
 *   lives?: number
 * }} TBEconomyGrant
 * @typedef {{
 *   label: string,
 *   price: string,
 *   coins?: number,
 *   extras?: TBEconomyGrant,
 *   once?: boolean,
 *   flag?: string,
 *   badge?: string,
 *   category?: string,
 *   maxAccountAgeDays?: number,
 *   featured?: boolean,
 *   weekly?: boolean,
 *   returnOffer?: boolean,
 *   inactiveDays?: number,
 *   limitedHours?: number,
 *   noAds?: boolean,
 *   subscription?: boolean,
 *   bpPremium?: boolean
 * }} TBIapMeta
 * @typedef {{
 *   id: string,
 *   icon: string,
 *   name: string,
 *   desc: string,
 *   cost: number,
 *   grant: TBEconomyGrant
 * }} TBDailyShopDeal
 * @typedef {{
 *   firstPlayAt?: number,
 *   lastLoginDay?: number,
 *   noAds?: boolean,
 *   bpPremiumOwned?: boolean,
 *   boughtWelcome?: boolean,
 *   boughtStarter?: boolean,
 *   weeklyPackWeek?: number,
 *   returnPackDay?: number,
 *   _forceReturnOffer?: boolean,
 *   iapGranted?: Record<string, boolean>,
 *   [key: string]: unknown
 * }} TBEconomySave
 * @typedef {{
 *   coinMult?: number,
 *   starterPrice?: number,
 *   bppremiumPrice?: number,
 *   welcomePrice?: number,
 *   weeklyPackPrice?: number,
 *   returnPackPrice?: number,
 *   [key: string]: unknown
 * }} TBRemoteCfg
 * @typedef {{ id: string, meta: TBIapMeta }} TBVisibleIapOffer
 */
(function () {
  'use strict';

  // ── Vidas ─────────────────────────────────────────────────────────────────
  var LIVES = {
    max: 5,
    regenMs: 30 * 60 * 1000,
    freeLossUntilLevel: 5, // índice < 5 = fases 1–5 sem perder vida
  };

  // ── Moedas por estrelas (equilibrado: vitória mais recompensadora, F2P justo) ─
  var COINS_STAR = [0, 20, 35, 55];

  // ── Preços em moedas (loja soft) ───────────────────────────────────────────
  // Filosofia: comprar = atalho conveniente; ganhar jogando continua viável.
  var SHOP_COIN_PRICES = {
    shuffle: 35,
    bomb: 55,
    rainbow: 75,
    moves: 95,
    life: 70,
  };

  // ── Rewarded ads (nunca interrompem gameplay — só opt-in) ─────────────────
  var AD_REWARDS = {
    dailyLimit: 5,
    life: 1,
    coins: 60,
    continueMoves: 5,
    bonusDailyLogin: 25, // extra se assistir ad após login (futuro)
  };

  // ── Continuar após derrota ─────────────────────────────────────────────────
  var LOSS_CONTINUE = { coinCost: 90, moves: 5 };

  // ── Login diário (sequência) ─────────────────────────────────────────────
  var DAILY_LOGIN_REWARDS = [12, 18, 24, 30, 36, 48, 120];

  // ── Battle Pass (30 dias / 30 tiers) ───────────────────────────────────────
  var BATTLE_PASS = {
    tiers: 30,
    xpPerTier: 120,
    seasonDays: 30,
    winXpBase: 40,
    winXpPerStar: 15,
    freeCoinsNormal: 35,
    freeCoinsEvery5: 90,
    premium: {
      every10: { rainbow: 1, coins: 70 },
      every5: { bomb: 2 },
      every3: { shuffle: 1 },
      defaultCoins: 40,
    },
  };

  // ── IAP / pacotes reais ────────────────────────────────────────────────────
  var IAP_META = {
    starter: {
      label: 'Pacote Iniciante',
      price: 'R$ 2,99',
      coins: 650,
      extras: { bomb: 3, rainbow: 3 },
      once: true,
      flag: 'boughtStarter',
      badge: '🔥 OFERTA',
      category: 'starter',
    },
    welcome: {
      label: 'Boas-Vindas',
      price: 'R$ 1,99',
      coins: 350,
      extras: { bomb: 2, shuffle: 2 },
      once: true,
      flag: 'boughtWelcome',
      badge: '✨ NOVO',
      category: 'welcome',
      maxAccountAgeDays: 3,
    },
    value_boost: {
      label: 'Pacote Impulso',
      price: 'R$ 3,99',
      coins: 900,
      extras: { shuffle: 5, moves: 1 },
      category: 'standard',
    },
    coins500: { label: '500 Moedas', price: 'R$ 1,99', coins: 500, category: 'coins' },
    coins1500: {
      label: '1.500 Moedas',
      price: 'R$ 4,99',
      coins: 1500,
      featured: true,
      category: 'coins',
    },
    coins4000: { label: '4.000 Moedas', price: 'R$ 9,99', coins: 4000, category: 'coins' },
    weekly_pack: {
      label: 'Pacote Semanal',
      price: 'R$ 7,99',
      coins: 2200,
      extras: { bomb: 3, rainbow: 2 },
      weekly: true,
      flag: 'weeklyPackWeek',
      badge: '📅 SEMANAL',
      category: 'weekly',
    },
    return_pack: {
      label: 'Pacote de Retorno',
      price: 'R$ 2,99',
      coins: 450,
      extras: { moves: 2, shuffle: 2 },
      returnOffer: true,
      flag: 'returnPackDay',
      badge: '👋 VOLTOU',
      category: 'return',
      inactiveDays: 3,
    },
    limited_flash: {
      label: 'Oferta Relâmpago',
      price: 'R$ 1,99',
      coins: 600,
      extras: { bomb: 1 },
      limitedHours: 2,
      category: 'limited',
    },
    noads: { label: 'Sem Anúncios', price: 'R$ 4,99', noAds: true, category: 'noads' },
    no_ads_monthly: {
      label: 'Sem Anúncios',
      price: 'R$ 9,90/mês',
      noAds: true,
      subscription: true,
      category: 'noads',
    },
    no_ads_yearly: {
      label: 'Sem Anúncios Anual',
      price: 'R$ 14,99/ano',
      noAds: true,
      subscription: true,
      category: 'noads',
    },
    bppremium: {
      label: 'Passe Premium',
      price: 'R$ 6,99',
      bpPremium: true,
      category: 'battlepass',
      badge: '🎫',
    },
  };

  // ── Ofertas dinâmicas (soft currency / comportamento) ─────────────────────
  var DYNAMIC_OFFERS = {
    stuck: { coinCost: 90, bomb: 2, shuffle: 2 },
    coins: { pay: 100, receive: 220 },
    rescue: { coinCost: 90 },
  };

  // ── Oferta diária rotativa (moedas — grátis de comprar com moedas) ───────
  var DAILY_SHOP_DEALS = [
    {
      id: 'deal_bomb3',
      icon: '💣',
      name: '3 Bombas',
      desc: 'Pacote do dia',
      cost: 140,
      grant: { bomb: 3 },
    },
    {
      id: 'deal_rain2',
      icon: '🌈',
      name: '2 Arco-íris',
      desc: 'Pacote do dia',
      cost: 130,
      grant: { rainbow: 2 },
    },
    {
      id: 'deal_mix',
      icon: '🎁',
      name: 'Mix Power',
      desc: 'Bomba + Shuffle',
      cost: 100,
      grant: { bomb: 1, shuffle: 2 },
    },
    {
      id: 'deal_moves',
      icon: '➕',
      name: '+5 Movimentos ×2',
      desc: 'Pacote do dia',
      cost: 160,
      grant: { moves: 2 },
    },
    {
      id: 'deal_coins',
      icon: '💰',
      name: 'Bolsa de Moedas',
      desc: '+180 moedas',
      cost: 120,
      grant: { coins: 180 },
    },
    {
      id: 'deal_life2',
      icon: '❤️',
      name: '2 Vidas',
      desc: 'Recarga rápida',
      cost: 110,
      grant: { lives: 2 },
    },
    {
      id: 'deal_rainbow_shuffle',
      icon: '✨',
      name: 'Combo Especial',
      desc: 'Arco-íris + Embaralhar',
      cost: 150,
      grant: { rainbow: 1, shuffle: 3 },
    },
  ];

  // ── Calendário LiveOps (estrutura — backend futuro sobrescreve via remote) ─
  var LIVEOPS_CALENDAR = {
    weekendMultiplier: { coinMult: 1.25, xpMult: 1.15, days: [6, 0] },
    seasonalSlots: [
      { id: 'spring', name: 'Festival da Primavera', month: 3, coinMult: 1.5, chestMult: 1.3 },
      { id: 'summer', name: 'Verão Blast', month: 7, coinMult: 1.5, scoreMult: 1.2 },
      { id: 'halloween', name: 'Blastoween', month: 10, coinMult: 2, xpMult: 1.5 },
      { id: 'winter', name: 'Natal Blast', month: 12, coinMult: 2, chestMult: 1.5 },
    ],
    eventRotationDays: 3,
  };

  // ── Esquema Admin Dashboard (remote / Firestore `economy/*`) ───────────────
  var ADMIN_SCHEMA = {
    version: 1,
    collections: {
      'economy/prices': { shop: SHOP_COIN_PRICES, iap: 'IAP_META keys + price overrides' },
      'economy/rewards': {
        coinsStar: COINS_STAR,
        dailyLogin: DAILY_LOGIN_REWARDS,
        adRewards: AD_REWARDS,
      },
      'economy/offers': { active: 'array of offer ids', schedule: 'cron / start-end ISO' },
      'economy/battlepass': BATTLE_PASS,
      'economy/events': LIVEOPS_CALENDAR,
      'economy/ab': { experimentId: 'string', variant: 'control|boost_a|boost_b' },
    },
    metrics: [
      'ARPDAU',
      'ARPPU',
      'conversion_rate',
      'D1',
      'D7',
      'D30',
      'session_length',
      'sessions_per_day',
      'revenue_by_offer',
      'ad_revenue',
    ],
  };

  /**
   * @returns {number}
   */
  function _epochDay() {
    return Math.floor(Date.now() / 86400000);
  }

  /**
   * @returns {number}
   */
  function _epochWeek() {
    return Math.floor(Date.now() / (7 * 86400000));
  }

  /**
   * Multiplicador global de moedas: evento × remote × fim de semana LiveOps.
   * @param {number} [activeEventMult]
   * @param {TBRemoteCfg|null|undefined} [remoteCfg]
   * @returns {number}
   */
  function getGlobalCoinMult(activeEventMult, remoteCfg) {
    var rc = remoteCfg || {};
    var mult = (activeEventMult || 1) * /** @type {number} */ (rc.coinMult || 1);
    var day = new Date().getDay();
    if (LIVEOPS_CALENDAR.weekendMultiplier.days.indexOf(day) >= 0) {
      mult *= LIVEOPS_CALENDAR.weekendMultiplier.coinMult;
    }
    return mult;
  }

  /**
   * Aplica overrides de preço do remote config nos metadados IAP.
   * @param {TBRemoteCfg|null|undefined} [remoteCfg]
   * @returns {Record<string, TBIapMeta>}
   */
  function getIAPMeta(remoteCfg) {
    var rc = remoteCfg || {};
    /** @type {Record<string, TBIapMeta>} */
    var meta = JSON.parse(JSON.stringify(IAP_META));
    if (rc.starterPrice != null)
      meta.starter.price = 'R$ ' + Number(rc.starterPrice).toFixed(2).replace('.', ',');
    if (rc.bppremiumPrice != null)
      meta.bppremium.price = 'R$ ' + Number(rc.bppremiumPrice).toFixed(2).replace('.', ',');
    if (rc.welcomePrice != null)
      meta.welcome.price = 'R$ ' + Number(rc.welcomePrice).toFixed(2).replace('.', ',');
    if (rc.weeklyPackPrice != null)
      meta.weekly_pack.price = 'R$ ' + Number(rc.weeklyPackPrice).toFixed(2).replace('.', ',');
    if (rc.returnPackPrice != null)
      meta.return_pack.price = 'R$ ' + Number(rc.returnPackPrice).toFixed(2).replace('.', ',');
    return meta;
  }

  /**
   * Oferta diária da loja (soft currency) — rota por dia.
   * @returns {TBDailyShopDeal}
   */
  function getDailyShopDeal() {
    var day = _epochDay();
    return DAILY_SHOP_DEALS[day % DAILY_SHOP_DEALS.length];
  }

  /**
   * Pacotes IAP elegíveis para exibir na loja.
   * @param {TBEconomySave|null|undefined} [save]
   * @param {TBRemoteCfg|null|undefined} [remoteCfg]
   * @returns {TBVisibleIapOffer[]}
   */
  function getVisibleIAPOffers(save, remoteCfg) {
    /** @type {TBEconomySave} */
    var s = save || {};
    var meta = getIAPMeta(remoteCfg);
    /** @type {TBVisibleIapOffer[]} */
    var out = [];
    var now = Date.now();
    var accountAgeDays = s.firstPlayAt ? (now - s.firstPlayAt) / 86400000 : 999;

    Object.keys(meta).forEach(function (id) {
      var m = meta[id];
      if (m.once && m.flag && s[m.flag]) return;
      if (id === 'welcome' && (s.boughtWelcome || accountAgeDays > (m.maxAccountAgeDays || 3)))
        return;
      if (m.weekly && m.flag) {
        var wk = _epochWeek();
        if (s[m.flag] === wk) return;
      }
      if (m.returnOffer && m.flag) {
        if (s[m.flag] === _epochDay()) return;
        var last = /** @type {number} */ (s.lastLoginDay || 0);
        var gap = _epochDay() - last;
        if (gap < (m.inactiveDays || 3) && !s._forceReturnOffer) return;
      }
      if (m.category === 'noads' && s.noAds) return;
      if (id === 'bppremium' && s.bpPremiumOwned) return;
      out.push({ id: id, meta: m });
    });
    return out;
  }

  /**
   * Detecta jogador retornando após inatividade.
   * @param {TBEconomySave|null|undefined} [save]
   * @returns {boolean}
   */
  function shouldShowReturnOffer(save) {
    /** @type {TBEconomySave} */
    var s = save || {};
    if (s.returnPackDay === _epochDay()) return false;
    var last = /** @type {number} */ (s.lastLoginDay || 0);
    return _epochDay() - last >= (IAP_META.return_pack.inactiveDays || 3);
  }

  /**
   * Não-consumível = compra única (assinatura / sem-anúncios / passe / pacotes "once").
   * @param {TBIapMeta|null|undefined} meta
   * @returns {boolean}
   */
  function isNonConsumable(meta) {
    return !!(meta && (meta.once || meta.noAds || meta.bpPremium || meta.subscription));
  }

  /**
   * Concede o bônus consumível (moedas/power-ups)? Consumível: sempre.
   * Não-consumível: apenas na 1ª vez (evita farm via "restaurar compras").
   * @param {string} itemId
   * @param {TBIapMeta|null|undefined} meta
   * @param {TBEconomySave|null|undefined} [save]
   * @returns {boolean}
   */
  function shouldGrantIapBonus(itemId, meta, save) {
    if (!isNonConsumable(meta)) return true;
    return !(save && save.iapGranted && save.iapGranted[itemId]);
  }

  /**
   * @param {TBEconomySave} save
   * @param {string} itemId
   * @returns {void}
   */
  function markIAPFlag(save, itemId) {
    var m = IAP_META[itemId];
    if (!m || !m.flag) return;
    if (m.weekly) save[m.flag] = _epochWeek();
    else if (m.returnOffer) save[m.flag] = _epochDay();
    else save[m.flag] = true;
  }

  /**
   * Preço exibido: prioriza Google Play Billing; fallback só em web/dev.
   * @param {string} itemId
   * @param {TBIapMeta|null|undefined} meta
   * @param {{ hasBilling?: boolean, storePrice?: string|null, loadingLabel?: string }} [opts]
   * @returns {string}
   */
  function resolveIapDisplayPrice(itemId, meta, opts) {
    opts = opts || {};
    if (opts.storePrice) return opts.storePrice;
    if (opts.hasBilling) return opts.loadingLabel || '…';
    return (meta && meta.price) || opts.loadingLabel || '…';
  }

  /**
   * Simula earn/spend soft + caps de ads por N dias (P3.1).
   * @param {number} days
   * @param {{
   *   winsPerDay?: number,
   *   lossRate?: number,
   *   starsAvg?: number,
   *   adAttemptsPerDay?: number,
   *   continueRateOnLoss?: number,
   *   shopSpendPerDay?: number,
   *   startCoins?: number,
   *   adDailyLimit?: number,
   *   continueCost?: number,
   *   rng?: () => number
   * }} [opts]
   * @returns {Record<string, number|boolean>}
   */
  function simulateEconomyDays(days, opts) {
    opts = opts || {};
    var n = Math.max(1, days | 0);
    var winsPerDay = opts.winsPerDay != null ? opts.winsPerDay : 5;
    var lossRate = opts.lossRate != null ? opts.lossRate : 0.28;
    var starsAvg = Math.min(3, Math.max(1, opts.starsAvg != null ? opts.starsAvg : 2));
    var adAttempts = opts.adAttemptsPerDay != null ? opts.adAttemptsPerDay : 4;
    var continueRate = opts.continueRateOnLoss != null ? opts.continueRateOnLoss : 0.35;
    var shopSpend = opts.shopSpendPerDay != null ? opts.shopSpendPerDay : 40;
    var coins = opts.startCoins != null ? opts.startCoins : 120;
    var adLimit = opts.adDailyLimit != null ? opts.adDailyLimit : AD_REWARDS.dailyLimit;
    var continueCost = opts.continueCost != null ? opts.continueCost : LOSS_CONTINUE.coinCost;
    var earnPerWin = COINS_STAR[starsAvg] || 25;
    var adCoins = AD_REWARDS.coins;
    var rng = typeof opts.rng === 'function' ? opts.rng : Math.random;

    var earned = 0;
    var spent = 0;
    var adsGranted = 0;
    var adsBlocked = 0;
    var continues = 0;
    var insolvencyDays = 0;
    var minCoins = coins;
    var maxCoins = coins;

    for (var d = 0; d < n; d++) {
      var dayAds = 0;
      var dayStart = coins;
      for (var w = 0; w < winsPerDay; w++) {
        var isLoss = rng() < lossRate;
        if (isLoss) {
          if (rng() < continueRate && coins >= continueCost) {
            coins -= continueCost;
            spent += continueCost;
            continues++;
            coins += earnPerWin;
            earned += earnPerWin;
          }
        } else {
          coins += earnPerWin;
          earned += earnPerWin;
        }
      }
      for (var a = 0; a < adAttempts; a++) {
        if (dayAds >= adLimit) {
          adsBlocked++;
        } else {
          dayAds++;
          adsGranted++;
          coins += adCoins;
          earned += adCoins;
        }
      }
      if (shopSpend > 0 && coins >= shopSpend) {
        coins -= shopSpend;
        spent += shopSpend;
      }
      if (coins < dayStart && coins < 30) insolvencyDays++;
      if (coins < minCoins) minCoins = coins;
      if (coins > maxCoins) maxCoins = coins;
    }

    return {
      days: n,
      finalCoins: coins,
      earned: earned,
      spent: spent,
      net: earned - spent,
      adsGranted: adsGranted,
      adsBlocked: adsBlocked,
      continues: continues,
      insolvencyDays: insolvencyDays,
      minCoins: minCoins,
      maxCoins: maxCoins,
      adDailyLimit: adLimit,
      healthy: insolvencyDays < n * 0.35 && coins > 0,
    };
  }

  /** @type {any} */
  var g = window;
  g.TBEconomy = {
    LIVES: LIVES,
    COINS_STAR: COINS_STAR,
    SHOP_COIN_PRICES: SHOP_COIN_PRICES,
    AD_REWARDS: AD_REWARDS,
    LOSS_CONTINUE: LOSS_CONTINUE,
    DAILY_LOGIN_REWARDS: DAILY_LOGIN_REWARDS,
    BATTLE_PASS: BATTLE_PASS,
    IAP_META: IAP_META,
    DYNAMIC_OFFERS: DYNAMIC_OFFERS,
    DAILY_SHOP_DEALS: DAILY_SHOP_DEALS,
    LIVEOPS_CALENDAR: LIVEOPS_CALENDAR,
    ADMIN_SCHEMA: ADMIN_SCHEMA,
    getGlobalCoinMult: getGlobalCoinMult,
    getIAPMeta: getIAPMeta,
    getDailyShopDeal: getDailyShopDeal,
    getVisibleIAPOffers: getVisibleIAPOffers,
    shouldShowReturnOffer: shouldShowReturnOffer,
    markIAPFlag: markIAPFlag,
    isNonConsumable: isNonConsumable,
    shouldGrantIapBonus: shouldGrantIapBonus,
    resolveIapDisplayPrice: resolveIapDisplayPrice,
    simulateEconomyDays: simulateEconomyDays,
    epochDay: _epochDay,
    epochWeek: _epochWeek,
  };
})();
