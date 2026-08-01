/**
 * Núcleo de submitScore / submitEventScore (sem onCall).
 * Injetável em testes com db mock.
 */
'use strict';

const {
  validateSubmitScoreArgs,
  validateSubmitEventScoreArgs,
  evaluateScoreWrite,
  evaluateScoreRateLimit,
} = require('./score-logic.js');

/**
 * @param {object} opts
 */
async function applyRateLimit(opts) {
  const { uid, db, FieldValue, makeError, nowMs } = opts;
  const rateRef = db.collection('users').doc(uid).collection('meta').doc('scoreRate');
  const snap = await rateRef.get();
  const meta = snap.exists ? snap.data() : {};
  const ev = evaluateScoreRateLimit(meta, nowMs || Date.now());
  if (!ev.ok) throw makeError(ev.code, ev.message);
  await rateRef.set(
    {
      windowStart: ev.next.windowStart,
      count: ev.next.count,
      at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * @param {object} opts
 * @param {string} opts.uid
 * @param {object} opts.data
 * @param {FirebaseFirestore.Firestore} opts.db
 * @param {object} opts.FieldValue
 * @param {(code: string, message: string) => Error} opts.makeError
 * @param {number} [opts.nowMs]
 */
async function runSubmitScore(opts) {
  const { uid, data, db, FieldValue, makeError, nowMs } = opts;
  const v = validateSubmitScoreArgs(data, nowMs);
  if (!v.ok) throw makeError(v.code, v.message);

  await applyRateLimit(opts);

  const ref = db.collection('leaderboards').doc(v.boardId).collection('scores').doc(uid);
  const snap = await ref.get();
  const prev = snap.exists ? snap.data().score || 0 : 0;
  const ev = evaluateScoreWrite(prev, v.score);
  if (!ev.write) {
    return { ok: true, written: false, score: ev.score, boardId: v.boardId };
  }
  await ref.set(
    {
      uid,
      name: v.name,
      score: ev.score,
      at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { ok: true, written: true, score: ev.score, boardId: v.boardId };
}

/**
 * @param {object} opts
 */
async function runSubmitEventScore(opts) {
  const { uid, data, db, FieldValue, makeError } = opts;
  const v = validateSubmitEventScoreArgs(data);
  if (!v.ok) throw makeError(v.code, v.message);

  await applyRateLimit(opts);

  const ref = db.collection('leaderboards').doc(v.boardId).collection('scores').doc(uid);
  const snap = await ref.get();
  const prev = snap.exists ? snap.data().score || 0 : 0;
  const ev = evaluateScoreWrite(prev, v.score);
  if (!ev.write) {
    return { ok: true, written: false, score: ev.score, boardId: v.boardId };
  }
  await ref.set(
    {
      uid,
      name: v.name,
      score: ev.score,
      at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { ok: true, written: true, score: ev.score, boardId: v.boardId };
}

module.exports = {
  runSubmitScore,
  runSubmitEventScore,
};
