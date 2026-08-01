/**
 * Lógica pura — rate-limit ads, mapeamento IAP, idempotência.
 * Sem firebase-admin / googleapis: testável no Vitest do monorepo.
 */
'use strict';

const { AD_REWARD_COINS, AD_DAILY_LIMIT, PRODUCT_CATALOG } = require('./economy-catalog.js');

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * @param {{ dayKey?: string, count?: number, lastRequestId?: string }} ad
 * @param {string} dayKey
 * @param {string} [requestId]
 * @param {number} [limit]
 */
function evaluateAdGrant(ad, dayKey, requestId, limit = AD_DAILY_LIMIT) {
  const cur = ad || {};
  if (requestId && cur.lastRequestId === requestId && cur.dayKey === dayKey) {
    return {
      ok: true,
      duplicate: true,
      granted: false,
      count: cur.dayKey === dayKey ? cur.count || 0 : 0,
      delta: 0,
      coinsDelta: 0,
    };
  }
  let count = cur.dayKey === dayKey ? cur.count || 0 : 0;
  if (count >= limit) {
    return { ok: false, code: 'resource-exhausted', message: 'Limite diário de anúncios.' };
  }
  count += 1;
  return {
    ok: true,
    duplicate: false,
    granted: true,
    count,
    delta: AD_REWARD_COINS,
    coinsDelta: AD_REWARD_COINS,
  };
}

/**
 * @param {unknown} data
 * @returns {{ ok: true, productId: string, purchaseToken: string } | { ok: false, code: string, message: string }}
 */
function validateConfirmArgs(data) {
  const d = data || {};
  const productId = typeof d.productId === 'string' ? d.productId.trim() : '';
  const purchaseToken = typeof d.purchaseToken === 'string' ? d.purchaseToken.trim() : '';
  if (!productId || !purchaseToken) {
    return {
      ok: false,
      code: 'invalid-argument',
      message: 'productId e purchaseToken são obrigatórios.',
    };
  }
  if (!PRODUCT_CATALOG[productId]) {
    return {
      ok: false,
      code: 'invalid-argument',
      message: 'productId desconhecido: ' + productId,
    };
  }
  return { ok: true, productId, purchaseToken };
}

function getProduct(productId) {
  return PRODUCT_CATALOG[productId] || null;
}

/**
 * @param {string|null|undefined} existingUid
 * @param {string} uid
 * @returns {'fresh'|'duplicate'|'conflict'}
 */
function receiptOwnership(existingUid, uid) {
  if (!existingUid) return 'fresh';
  if (existingUid === uid) return 'duplicate';
  return 'conflict';
}

/**
 * Plano de crédito a partir do catálogo + estado atual do user.
 * @param {Record<string, unknown>} user
 * @param {string} productId
 */
function planIapGrant(user, productId) {
  const product = getProduct(productId);
  if (!product) return null;
  const coins = typeof user.coins === 'number' ? user.coins : 0;
  const entitlements = Object.assign({}, user.entitlements || {});
  if (product.once && product.entitlements) {
    const owned = Object.keys(product.entitlements).some(
      (k) => product.entitlements[k] && entitlements[k]
    );
    if (owned) {
      return {
        product,
        deltaCoins: 0,
        nextCoins: coins,
        nextEntitlements: entitlements,
        extras: null,
        once: true,
        alreadyOwned: true,
        kind: product.kind,
      };
    }
  }
  const deltaCoins = product.coins || 0;
  const nextEntitlements = Object.assign({}, entitlements, product.entitlements || {});
  return {
    product,
    deltaCoins,
    nextCoins: coins + deltaCoins,
    nextEntitlements,
    extras: product.extras || null,
    once: !!product.once,
    alreadyOwned: false,
    kind: product.kind,
  };
}

/**
 * purchaseState Play: 0 purchased, 1 canceled, 2 pending.
 * @param {{ purchaseState?: number, acknowledgementState?: number, paymentState?: number }} playData
 * @param {'inapp'|'sub'} kind
 */
function assertPlayPurchaseValid(playData, kind) {
  if (!playData || typeof playData !== 'object') {
    return { ok: false, code: 'permission-denied', message: 'Recibo inválido na Play API.' };
  }
  if (kind === 'sub') {
    // paymentState: 1 = received, 2 = free trial, 0 = pending
    const ps = playData.paymentState;
    if (ps !== 1 && ps !== 2 && playData.purchaseState !== 0) {
      return {
        ok: false,
        code: 'permission-denied',
        message: 'Assinatura não paga / inválida.',
      };
    }
    return { ok: true };
  }
  if (playData.purchaseState !== 0) {
    return {
      ok: false,
      code: 'permission-denied',
      message: 'Compra não está no estado purchased.',
    };
  }
  return { ok: true };
}

module.exports = {
  utcDayKey,
  evaluateAdGrant,
  validateConfirmArgs,
  getProduct,
  receiptOwnership,
  planIapGrant,
  assertPlayPurchaseValid,
  AD_REWARD_COINS,
  AD_DAILY_LIMIT,
  PRODUCT_CATALOG,
};
