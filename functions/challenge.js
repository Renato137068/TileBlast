/**
 * createChallenge / claimChallenge (P3.2) — injetável em testes.
 */
'use strict';

const { buildChallenge, evaluateChallengeClaim } = require('./challenge-logic.js');

/**
 * @param {object} opts
 */
async function runCreateChallenge(opts) {
  const { uid, data, db, FieldValue, makeError, nowMs, randomId, randomNonce } = opts;
  const built = buildChallenge({
    levelIdx: data && data.levelIdx,
    seed: data && data.seed,
    creatorUid: uid,
    nowMs,
    ttlMs: data && data.ttlMs,
    randomId,
    randomNonce,
  });
  if (!built.ok) throw makeError(built.code, built.message);

  const ch = built.challenge;
  const ref = db.collection('challenges').doc(ch.id);
  await ref.set({
    nonce: ch.nonce,
    levelIdx: ch.levelIdx,
    seed: ch.seed,
    creatorUid: ch.creatorUid,
    expiresAt: ch.expiresAt,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    id: ch.id,
    nonce: ch.nonce,
    levelIdx: ch.levelIdx,
    seed: ch.seed,
    expiresAt: ch.expiresAt,
  };
}

/**
 * @param {object} opts
 */
async function runClaimChallenge(opts) {
  const { uid, data, db, FieldValue, makeError, nowMs } = opts;
  const id = data && typeof data.id === 'string' ? data.id.trim() : '';
  const nonce = data && typeof data.nonce === 'string' ? data.nonce.trim() : '';
  if (!id || !nonce) throw makeError('invalid-argument', 'id e nonce obrigatórios.');

  const ref = db.collection('challenges').doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() : null;
    const ev = evaluateChallengeClaim(cur, nonce, nowMs || Date.now(), uid);
    if (!ev.ok) throw makeError(ev.code, ev.message);

    tx.set(
      ref,
      {
        used: true,
        claimedBy: uid,
        claimedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      ok: true,
      levelIdx: ev.levelIdx,
      seed: ev.seed,
    };
  });
}

module.exports = {
  runCreateChallenge,
  runClaimChallenge,
};
