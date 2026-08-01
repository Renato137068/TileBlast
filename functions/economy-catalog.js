/**
 * Catálogo econômico server-side (espelho manual de TBEconomy).
 * Manter alinhado a tb-economy.js — coins / entitlements / tipo Play.
 */
'use strict';

const AD_REWARD_COINS = 50;
const AD_DAILY_LIMIT = 5;

const PACKAGE_NAME_DEFAULT = 'com.tileblast.game';

/** @type {Record<string, { coins?: number, entitlements?: Record<string, boolean>, extras?: Record<string, number>, once?: boolean, kind: 'inapp'|'sub' }>} */
const PRODUCT_CATALOG = {
  starter: {
    coins: 650,
    extras: { bomb: 3, rainbow: 3 },
    entitlements: { starter: true },
    once: true,
    kind: 'inapp',
  },
  welcome: {
    coins: 350,
    extras: { bomb: 2, shuffle: 2 },
    entitlements: { welcome: true },
    once: true,
    kind: 'inapp',
  },
  value_boost: {
    coins: 900,
    extras: { shuffle: 5, moves: 1 },
    kind: 'inapp',
  },
  coins500: { coins: 500, kind: 'inapp' },
  coins1500: { coins: 1500, kind: 'inapp' },
  coins4000: { coins: 4000, kind: 'inapp' },
  weekly_pack: {
    coins: 2200,
    extras: { bomb: 3, rainbow: 2 },
    kind: 'inapp',
  },
  return_pack: {
    coins: 450,
    extras: { moves: 2, shuffle: 2 },
    kind: 'inapp',
  },
  limited_flash: {
    coins: 600,
    extras: { bomb: 1 },
    kind: 'inapp',
  },
  noads: {
    coins: 0,
    entitlements: { noAds: true },
    once: true,
    kind: 'inapp',
  },
  no_ads_monthly: {
    coins: 0,
    entitlements: { noAds: true },
    kind: 'sub',
  },
  no_ads_yearly: {
    coins: 0,
    entitlements: { noAds: true },
    kind: 'sub',
  },
  bppremium: {
    coins: 0,
    entitlements: { bpPremium: true },
    once: true,
    kind: 'inapp',
  },
};

module.exports = {
  AD_REWARD_COINS,
  AD_DAILY_LIMIT,
  PACKAGE_NAME_DEFAULT,
  PRODUCT_CATALOG,
};
