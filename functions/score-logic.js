/**
 * Lógica pura — submissão de scores / rankings (fase 4) + P3.2.
 * Sem firebase-admin: testável no Vitest do monorepo.
 */
'use strict';

/** Caps anti-cheat (cliente adulterado não grava absurdos). */
const SCORE_CAPS = {
  daily: 500000,
  infinite: 10000000,
  event: 10000000,
};

const NAME_MAX = 16;
const EVENT_BOARD_RE = /^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,63}$/;

/** Rate limit de submit por janela (anti-spam). */
const SCORE_RATE_LIMIT = { windowMs: 3600000, max: 30 };

/** Nomes reservados / ofensivos leves (moderação básica). */
const NAME_BLOCKLIST = [
  'admin',
  'moderator',
  'moderador',
  'tileblast',
  'oficial',
  'support',
  'suporte',
  'fuck',
  'shit',
  'bitch',
  'nigger',
  'faggot',
  'puta',
  'caralho',
  'porra',
  'viado',
  'hitler',
];

/**
 * @param {number} [nowMs]
 * @returns {number}
 */
function epochDay(nowMs = Date.now()) {
  return Math.floor(nowMs / 86400000);
}

/**
 * Mesmo esquema do cliente legado (tb-firebase lbCollection).
 * @param {'daily'|'infinite'|string} mode
 * @param {number} [nowMs]
 */
function boardIdForMode(mode, nowMs = Date.now()) {
  if (mode === 'infinite') return 'infinite_all';
  return 'daily_' + epochDay(nowMs);
}

/**
 * Boards conhecidos para apagar scores sociais (hoje + N dias + infinite).
 * @param {number} [nowMs]
 * @param {number} [lookbackDays]
 * @returns {string[]}
 */
function knownLeaderboardIds(nowMs = Date.now(), lookbackDays = 14) {
  const ids = ['infinite_all'];
  const today = epochDay(nowMs);
  for (let i = 0; i <= lookbackDays; i++) {
    ids.push('daily_' + (today - i));
  }
  return ids;
}

/**
 * @param {unknown} name
 * @returns {string}
 */
function sanitizePlayerName(name) {
  const raw = String(name == null ? '' : name)
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  const sliced = raw.slice(0, NAME_MAX);
  if (!sliced) return 'Jogador';
  const lower = sliced.toLowerCase();
  for (let i = 0; i < NAME_BLOCKLIST.length; i++) {
    if (lower.indexOf(NAME_BLOCKLIST[i]) >= 0) return 'Jogador';
  }
  return sliced;
}

/**
 * @param {{ windowStart?: number, count?: number }|null|undefined} meta
 * @param {number} [nowMs]
 * @param {{ windowMs?: number, max?: number }} [limits]
 */
function evaluateScoreRateLimit(meta, nowMs = Date.now(), limits = SCORE_RATE_LIMIT) {
  const windowMs = limits.windowMs || SCORE_RATE_LIMIT.windowMs;
  const max = limits.max || SCORE_RATE_LIMIT.max;
  const m = meta || {};
  const windowStart = typeof m.windowStart === 'number' ? m.windowStart : 0;
  const count = typeof m.count === 'number' ? m.count : 0;
  if (!windowStart || nowMs - windowStart >= windowMs) {
    return { ok: true, next: { windowStart: nowMs, count: 1 } };
  }
  if (count >= max) {
    return {
      ok: false,
      code: 'resource-exhausted',
      message: 'Muitos envios de ranking. Tente mais tarde.',
      next: { windowStart, count },
    };
  }
  return { ok: true, next: { windowStart, count: count + 1 } };
}

/**
 * @param {unknown} score
 * @param {number} cap
 * @returns {{ ok: true, score: number } | { ok: false, code: string, message: string }}
 */
function normalizeScore(score, cap) {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, code: 'invalid-argument', message: 'score inválido.' };
  }
  const floored = Math.floor(n);
  if (floored > cap) {
    return { ok: false, code: 'invalid-argument', message: 'score acima do limite.' };
  }
  return { ok: true, score: floored };
}

/**
 * @param {unknown} data
 * @param {number} [nowMs]
 * @returns {{ ok: true, mode: string, boardId: string, score: number, name: string } | { ok: false, code: string, message: string }}
 */
function validateSubmitScoreArgs(data, nowMs = Date.now()) {
  const d = data || {};
  const mode = d.mode === 'infinite' ? 'infinite' : d.mode === 'daily' ? 'daily' : '';
  if (!mode) {
    return { ok: false, code: 'invalid-argument', message: 'mode deve ser daily ou infinite.' };
  }
  const norm = normalizeScore(d.score, SCORE_CAPS[mode]);
  if (!norm.ok) return norm;
  return {
    ok: true,
    mode,
    boardId: boardIdForMode(mode, nowMs),
    score: norm.score,
    name: sanitizePlayerName(d.name),
  };
}

/**
 * @param {unknown} data
 * @returns {{ ok: true, boardId: string, score: number, name: string } | { ok: false, code: string, message: string }}
 */
function validateSubmitEventScoreArgs(data) {
  const d = data || {};
  const boardId = typeof d.eventLeaderboardId === 'string' ? d.eventLeaderboardId.trim() : '';
  if (!boardId || !EVENT_BOARD_RE.test(boardId)) {
    return {
      ok: false,
      code: 'invalid-argument',
      message: 'eventLeaderboardId inválido.',
    };
  }
  const norm = normalizeScore(d.score, SCORE_CAPS.event);
  if (!norm.ok) return norm;
  return {
    ok: true,
    boardId,
    score: norm.score,
    name: sanitizePlayerName(d.name),
  };
}

/**
 * Best-score only: não rebaixa nem regrava se empate/menor.
 * @param {number} prev
 * @param {number} next
 */
function evaluateScoreWrite(prev, next) {
  const p = typeof prev === 'number' && Number.isFinite(prev) ? prev : 0;
  if (next <= p) {
    return { write: false, score: p, improved: false };
  }
  return { write: true, score: next, improved: true };
}

module.exports = {
  SCORE_CAPS,
  NAME_MAX,
  NAME_BLOCKLIST,
  SCORE_RATE_LIMIT,
  epochDay,
  boardIdForMode,
  knownLeaderboardIds,
  sanitizePlayerName,
  evaluateScoreRateLimit,
  normalizeScore,
  validateSubmitScoreArgs,
  validateSubmitEventScoreArgs,
  evaluateScoreWrite,
};
