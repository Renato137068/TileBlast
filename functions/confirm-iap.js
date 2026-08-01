/**
 * Núcleo de confirmIapPurchase (sem onCall / initializeApp).
 * Usado por functions/index.js e testes Vitest.
 */
'use strict';

const crypto = require('crypto');
const {
  validateConfirmArgs,
  receiptOwnership,
  planIapGrant,
  assertPlayPurchaseValid,
} = require('./iap-logic.js');
const { verifyPlayPurchase, packageName } = require('./play-verify.js');

function receiptDocId(purchaseToken) {
  return crypto.createHash('sha256').update(String(purchaseToken)).digest('hex');
}

/**
 * @param {{ code: string, message: string }} err
 * @param {(code: string, message: string) => Error} makeError
 */
function fail(makeError, code, message) {
  throw makeError(code, message);
}

/**
 * @param {{
 *   uid: string,
 *   data: object,
 *   db: { collection: Function, runTransaction: Function },
 *   FieldValue: { serverTimestamp: Function },
 *   verify?: typeof verifyPlayPurchase,
 *   credentials?: object|null,
 *   makeError?: (code: string, message: string) => Error,
 * }} deps
 */
async function runConfirmIapPurchase(deps) {
  const makeError =
    deps.makeError ||
    ((code, message) => {
      const e = new Error(message);
      e.code = code;
      return e;
    });

  const validated = validateConfirmArgs(deps.data);
  if (!validated.ok) fail(makeError, validated.code, validated.message);

  const { productId, purchaseToken } = validated;
  const plan = planIapGrant({}, productId);
  if (!plan) fail(makeError, 'invalid-argument', 'productId desconhecido.');

  const verify = deps.verify || verifyPlayPurchase;
  let playResult;
  try {
    playResult = await verify({
      productId,
      purchaseToken,
      kind: plan.kind,
      packageName: packageName(),
      credentials: deps.credentials,
    });
  } catch (e) {
    const code =
      e && e.code === 'failed-precondition' ? 'failed-precondition' : 'permission-denied';
    fail(makeError, code, (e && e.message) || 'Falha ao verificar recibo na Play API.');
  }

  const playOk = assertPlayPurchaseValid(playResult && playResult.data, plan.kind);
  if (!playOk.ok) fail(makeError, playOk.code, playOk.message);

  const rid = receiptDocId(purchaseToken);
  const receiptRef = deps.db.collection('iapReceipts').doc(rid);
  const userRef = deps.db.collection('users').doc(deps.uid);
  const FV = deps.FieldValue;

  return deps.db.runTransaction(async (tx) => {
    const [receiptSnap, userSnap] = await Promise.all([tx.get(receiptRef), tx.get(userRef)]);
    const existing = receiptSnap.exists ? receiptSnap.data() : null;
    const ownership = receiptOwnership(existing && existing.uid, deps.uid);

    if (ownership === 'conflict') {
      fail(makeError, 'already-exists', 'Este recibo já foi creditado a outra conta.');
    }

    const cur = userSnap.exists ? userSnap.data() : {};
    const grant = planIapGrant(cur, productId);

    if (ownership === 'duplicate') {
      return {
        granted: false,
        reason: 'duplicate',
        coins: typeof cur.coins === 'number' ? cur.coins : 0,
        entitlements: cur.entitlements || {},
        productId,
      };
    }

    // once já possuído: registra recibo sem creditar de novo (anti double-grant)
    if (grant.alreadyOwned) {
      tx.set(receiptRef, {
        uid: deps.uid,
        productId,
        purchaseTokenHash: rid,
        packageName: (playResult && playResult.packageName) || packageName(),
        kind: grant.kind,
        deltaCoins: 0,
        alreadyOwned: true,
        at: FV.serverTimestamp(),
      });
      return {
        granted: false,
        reason: 'already_owned',
        coins: typeof cur.coins === 'number' ? cur.coins : 0,
        entitlements: cur.entitlements || {},
        productId,
      };
    }

    tx.set(
      userRef,
      {
        coins: grant.nextCoins,
        entitlements: grant.nextEntitlements,
        ledgerAt: FV.serverTimestamp(),
        v: '1',
      },
      { merge: true }
    );

    tx.set(receiptRef, {
      uid: deps.uid,
      productId,
      purchaseTokenHash: rid,
      packageName: (playResult && playResult.packageName) || packageName(),
      kind: grant.kind,
      deltaCoins: grant.deltaCoins,
      at: FV.serverTimestamp(),
    });

    const led = userRef.collection('ledger').doc('iap_' + rid.slice(0, 40));
    tx.set(led, {
      type: 'iap',
      delta: grant.deltaCoins,
      meta: {
        productId,
        extras: grant.extras,
        entitlements: grant.product.entitlements || null,
      },
      at: FV.serverTimestamp(),
      requestId: rid,
    });

    return {
      granted: true,
      coins: grant.nextCoins,
      entitlements: grant.nextEntitlements,
      productId,
      deltaCoins: grant.deltaCoins,
    };
  });
}

module.exports = {
  receiptDocId,
  runConfirmIapPurchase,
};
