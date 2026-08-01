/**
 * Desafios compartilháveis — lógica pura (P3.2).
 */
'use strict';

const crypto = require('crypto');

const CHALLENGE_TTL_MS = 7 * 86400000;
const LEVEL_MAX = 200;

/**
 * @param {object} opts
 * @param {number} opts.levelIdx 0-based
 * @param {string} [opts.seed]
 * @param {string} opts.creatorUid
 * @param {number} [opts.nowMs]
 * @param {number} [opts.ttlMs]
 * @param {() => string} [opts.randomId]
 * @param {() => string} [opts.randomNonce]
 */
function buildChallenge(opts) {
  const levelIdx = Math.floor(Number(opts.levelIdx));
  if (!Number.isFinite(levelIdx) || levelIdx < 0 || levelIdx >= LEVEL_MAX) {
    return { ok: false, code: 'invalid-argument', message: 'level inválido.' };
  }
  const nowMs = opts.nowMs || Date.now();
  const ttl = opts.ttlMs || CHALLENGE_TTL_MS;
  const id =
    typeof opts.randomId === 'function'
      ? opts.randomId()
      : crypto.randomBytes(8).toString('hex');
  const nonce =
    typeof opts.randomNonce === 'function'
      ? opts.randomNonce()
      : crypto.randomBytes(12).toString('hex');
  const seed = opts.seed === 'master' ? 'master' : 'normal';
  return {
    ok: true,
    challenge: {
      id,
      nonce,
      levelIdx,
      seed,
      creatorUid: opts.creatorUid,
      expiresAt: nowMs + ttl,
      used: false,
      createdAt: nowMs,
    },
  };
}

/**
 * @param {object|null|undefined} challenge
 * @param {string} nonce
 * @param {number} [nowMs]
 * @param {string} [claimerUid]
 */
function evaluateChallengeClaim(challenge, nonce, nowMs = Date.now(), claimerUid) {
  if (!challenge || typeof challenge !== 'object') {
    return { ok: false, code: 'not-found', message: 'Desafio não encontrado.' };
  }
  if (challenge.used) {
    return { ok: false, code: 'already-exists', message: 'Desafio já foi usado.' };
  }
  if (typeof challenge.expiresAt === 'number' && nowMs > challenge.expiresAt) {
    return { ok: false, code: 'deadline-exceeded', message: 'Desafio expirado.' };
  }
  if (!nonce || challenge.nonce !== nonce) {
    return { ok: false, code: 'permission-denied', message: 'Nonce inválido.' };
  }
  return {
    ok: true,
    levelIdx: challenge.levelIdx,
    seed: challenge.seed === 'master' ? 'master' : 'normal',
    creatorUid: challenge.creatorUid || null,
    claimerUid: claimerUid || null,
  };
}

/**
 * Texto de share sem PII (sem uid/email/token).
 * @param {{ level?: number, score?: number, label?: string }} opts
 */
function buildShareSafeText(opts) {
  const o = opts || {};
  const level = o.level != null ? `Fase ${o.level}` : o.label || 'Tile Blast';
  const scorePart =
    typeof o.score === 'number' && o.score > 0
      ? `: ${Math.floor(o.score).toLocaleString('pt-BR')} pts`
      : '';
  return `Tile Blast — ${level}${scorePart}! 🧡`;
}

module.exports = {
  CHALLENGE_TTL_MS,
  LEVEL_MAX,
  buildChallenge,
  evaluateChallengeClaim,
  buildShareSafeText,
};
