/**
 * Apaga nome + scores sociais do usuário (P3.2 LGPD-ish).
 */
'use strict';

const { knownLeaderboardIds } = require('./score-logic.js');

/**
 * @param {object} opts
 * @param {string} opts.uid
 * @param {FirebaseFirestore.Firestore} opts.db
 * @param {object} opts.FieldValue
 * @param {(code: string, message: string) => Error} opts.makeError
 * @param {number} [opts.nowMs]
 * @param {string[]} [opts.extraBoardIds]
 */
async function runDeleteSocialData(opts) {
  const { uid, db, FieldValue, makeError, nowMs, extraBoardIds } = opts;
  if (!uid) throw makeError('unauthenticated', 'Login necessário.');

  const boards = knownLeaderboardIds(nowMs || Date.now(), 14).concat(extraBoardIds || []);
  const unique = Array.from(new Set(boards));

  const deletes = [];
  for (let i = 0; i < unique.length; i++) {
    const ref = db.collection('leaderboards').doc(unique[i]).collection('scores').doc(uid);
    deletes.push(ref.delete().catch(() => null));
  }
  await Promise.all(deletes);

  const saveRef = db.collection('saves').doc(uid);
  await saveRef.set(
    {
      playerName: FieldValue.delete(),
      socialClearedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const rateRef = db.collection('users').doc(uid).collection('meta').doc('scoreRate');
  await rateRef.delete().catch(() => null);

  return { ok: true, boardsCleared: unique.length };
}

module.exports = {
  runDeleteSocialData,
};
