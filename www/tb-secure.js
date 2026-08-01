// @ts-check
/**
 * Tile Blast — Save Integrity (anti-cheat deterrent).
 *
 * Wraps the local save in a signed envelope so casual tampering
 * (editing coins/lives/progress via DevTools) is detected.
 *
 * IMPORTANT (honest scope): client-side signing is a DETERRENT, not a
 * cryptographic guarantee — a determined attacker with the source can
 * always forge a signature. Real integrity requires server-side
 * validation (see Firebase/Cloud sync). This raises the bar against the
 * realistic threat: casual save editing.
 *
 * Design goals:
 *  - Backward compatible: legacy unsigned saves are accepted and upgraded
 *    on the next write (never wipes an existing player).
 *  - Non-destructive on tamper: returns the data + a `status` flag so the
 *    game can react (e.g. disable leaderboard) without bricking the save.
 *
 * Exposes: window.TBSecure { wrap, unwrap, sign, VERSION }
 *
 * @typedef {'empty'|'ok'|'legacy'|'tampered'|'corrupt'} TBSecureStatus
 * @typedef {{ data: Record<string, unknown>, status: TBSecureStatus }} TBSecureUnwrapResult
 * @typedef {{
 *   wrap: (obj: unknown) => string,
 *   unwrap: (raw: string|null|undefined) => TBSecureUnwrapResult,
 *   sign: (dataStr: string) => string,
 *   VERSION: number
 * }} TBSecureApi
 */
(function (global) {
  'use strict';

  const VERSION = 1;
  // Obfuscated salt (not secret-grade; deters casual edits).
  const SALT = 'tb☉' + 'v4' + '❤blast' + 'aa';

  /**
   * cyrb53 — fast, well-distributed 53-bit string hash.
   * @param {string} str
   * @param {number} seed
   * @returns {string}
   */
  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ seed,
      h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /**
   * @param {string} dataStr
   * @returns {string}
   */
  function sign(dataStr) {
    return cyrb53(dataStr + SALT, 0x9e37) + ':' + cyrb53(SALT + dataStr, 0x85eb);
  }

  /**
   * Serialize a save object into a signed envelope string.
   * @param {unknown} obj
   * @returns {string}
   */
  function wrap(obj) {
    const dataStr = JSON.stringify(obj == null ? {} : obj);
    return JSON.stringify({ v: VERSION, d: dataStr, s: sign(dataStr) });
  }

  /**
   * Parse a stored string.
   * @param {string|null|undefined} raw
   * @returns {TBSecureUnwrapResult}
   */
  function unwrap(raw) {
    if (raw == null || raw === '') return { data: {}, status: 'empty' };
    let outer;
    try {
      outer = JSON.parse(raw);
    } catch {
      return { data: {}, status: 'corrupt' };
    }

    // Signed envelope?
    if (
      outer &&
      typeof outer === 'object' &&
      outer.v === VERSION &&
      typeof outer.d === 'string' &&
      typeof outer.s === 'string'
    ) {
      const valid = sign(outer.d) === outer.s;
      /** @type {Record<string, unknown>} */
      let data = {};
      try {
        data = JSON.parse(outer.d) || {};
      } catch {
        return { data: {}, status: 'corrupt' };
      }
      return { data, status: valid ? 'ok' : 'tampered' };
    }

    // Legacy unsigned save (plain object) — accept & flag for upgrade.
    if (outer && typeof outer === 'object') return { data: outer, status: 'legacy' };
    return { data: {}, status: 'corrupt' };
  }

  /** @type {TBSecureApi} */
  const api = { wrap, unwrap, sign, VERSION };
  /** @type {any} */
  const g = global;
  g.TBSecure = api;

  // CommonJS-like export for unit tests (Node).
  // @ts-ignore — `module` só existe no host Node dos testes
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
