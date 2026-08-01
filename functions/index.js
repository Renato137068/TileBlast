/**
 * Tile Blast — Cloud Functions (economia server-side).
 *
 * Deploy:
 *   cd functions && npm i
 *   firebase functions:secrets:set PLAY_SERVICE_ACCOUNT_JSON
 *   firebase deploy --only functions,firestore:rules
 *
 * Segredos: NUNCA no git. Ver docs/ECONOMIA-SERVER-SIDE.md.
 */
'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const { utcDayKey, evaluateAdGrant, AD_REWARD_COINS, AD_DAILY_LIMIT } = require('./iap-logic.js');
const { parseServiceAccount } = require('./play-verify.js');
const { runConfirmIapPurchase } = require('./confirm-iap.js');
const { runSubmitScore, runSubmitEventScore } = require('./submit-score.js');
const { runCreateChallenge, runClaimChallenge } = require('./challenge.js');
const { runDeleteSocialData } = require('./delete-social.js');

initializeApp();
const db = getFirestore();

const playSaSecret = defineSecret('PLAY_SERVICE_ACCOUNT_JSON');

function throwHttps(code, message) {
  throw new HttpsError(code, message);
}

/**
 * Callable: grantAdReward
 * data: { kind?: 'coins'|'life', requestId?: string }
 */
exports.grantAdReward = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throwHttps('unauthenticated', 'Login necessário.');
  }
  const uid = request.auth.uid;
  const requestId = (request.data && request.data.requestId) || '';
  const dayKey = utcDayKey();
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const cur = snap.exists ? snap.data() : {};
    const coins = typeof cur.coins === 'number' ? cur.coins : 0;
    const evaluation = evaluateAdGrant(cur.adGrants, dayKey, requestId, AD_DAILY_LIMIT);

    if (!evaluation.ok) {
      throwHttps(evaluation.code, evaluation.message);
    }

    if (evaluation.duplicate) {
      return {
        granted: false,
        reason: 'duplicate',
        coins,
        grantsLeft: Math.max(0, AD_DAILY_LIMIT - evaluation.count),
      };
    }

    const nextCoins = coins + evaluation.coinsDelta;
    tx.set(
      userRef,
      {
        coins: nextCoins,
        adGrants: {
          dayKey,
          count: evaluation.count,
          lastAt: FieldValue.serverTimestamp(),
          lastRequestId: requestId || null,
        },
        ledgerAt: FieldValue.serverTimestamp(),
        v: '1',
      },
      { merge: true }
    );

    if (requestId) {
      const led = userRef.collection('ledger').doc(requestId);
      tx.set(led, {
        type: 'ad',
        delta: AD_REWARD_COINS,
        meta: { kind: (request.data && request.data.kind) || 'coins' },
        at: FieldValue.serverTimestamp(),
        requestId,
      });
    }

    return {
      granted: true,
      coins: nextCoins,
      grantsLeft: Math.max(0, AD_DAILY_LIMIT - evaluation.count),
    };
  });
});

/**
 * Callable: confirmIapPurchase
 * data: { productId, purchaseToken }
 *
 * Idempotente via iapReceipts/{sha256(token)}.
 * Duplicata mesma conta → sucesso sem recreditar.
 */
exports.confirmIapPurchase = onCall(
  { region: 'us-central1', secrets: [playSaSecret] },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throwHttps('unauthenticated', 'Login necessário.');
    }

    let credentials = null;
    try {
      credentials = parseServiceAccount(playSaSecret.value());
    } catch {
      credentials = null;
    }
    if (!credentials) {
      credentials = parseServiceAccount(process.env.PLAY_SERVICE_ACCOUNT_JSON);
    }

    return runConfirmIapPurchase({
      uid: request.auth.uid,
      data: request.data || {},
      db,
      FieldValue,
      credentials,
      makeError: (code, message) => new HttpsError(code, message),
    });
  }
);

/**
 * Callable: submitScore (fase 4 — rankings)
 * data: { mode: 'daily'|'infinite', score: number, name?: string }
 * Board id calculado no servidor (cliente não escolhe path).
 */
exports.submitScore = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throwHttps('unauthenticated', 'Login necessário.');
  }
  return runSubmitScore({
    uid: request.auth.uid,
    data: request.data || {},
    db,
    FieldValue,
    makeError: (code, message) => new HttpsError(code, message),
  });
});

/**
 * Callable: submitEventScore
 * data: { eventLeaderboardId: string, score: number, name?: string }
 */
exports.submitEventScore = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throwHttps('unauthenticated', 'Login necessário.');
  }
  return runSubmitEventScore({
    uid: request.auth.uid,
    data: request.data || {},
    db,
    FieldValue,
    makeError: (code, message) => new HttpsError(code, message),
  });
});

/**
 * Callable: createChallenge (P3.2)
 * data: { levelIdx: number, seed?: 'master'|'normal' }
 */
exports.createChallenge = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throwHttps('unauthenticated', 'Login necessário.');
  }
  return runCreateChallenge({
    uid: request.auth.uid,
    data: request.data || {},
    db,
    FieldValue,
    makeError: (code, message) => new HttpsError(code, message),
  });
});

/**
 * Callable: claimChallenge
 * data: { id: string, nonce: string }
 */
exports.claimChallenge = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throwHttps('unauthenticated', 'Login necessário.');
  }
  return runClaimChallenge({
    uid: request.auth.uid,
    data: request.data || {},
    db,
    FieldValue,
    makeError: (code, message) => new HttpsError(code, message),
  });
});

/**
 * Callable: deleteSocialData — apaga nome + scores públicos do uid
 */
exports.deleteSocialData = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throwHttps('unauthenticated', 'Login necessário.');
  }
  return runDeleteSocialData({
    uid: request.auth.uid,
    db,
    FieldValue,
    makeError: (code, message) => new HttpsError(code, message),
  });
});
