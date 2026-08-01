// @ts-check
/**
 * Tile Blast — estado de sessão compartilhado (ponto único).
 *
 * Fonte da verdade = window.TBState; accessors em globalThis mantêm
 * compat com onclick inline legados.
 *
 * @typedef {{
 *   lvIdx: number,
 *   LEVELS: Array<Record<string, unknown>>,
 *   isInfiniteMode: boolean,
 *   isDailyPuzzleMode: boolean,
 *   isMasteryMode: boolean
 * }} TBSessionState
 */
(function (global) {
  'use strict';

  /** @type {TBSessionState} */
  const state = {
    lvIdx: 0,
    LEVELS: [],
    isInfiniteMode: false,
    isDailyPuzzleMode: false,
    isMasteryMode: false,
  };

  /** @type {ReadonlyArray<keyof TBSessionState>} */
  const COMPAT_KEYS = ['lvIdx', 'LEVELS', 'isInfiniteMode', 'isDailyPuzzleMode', 'isMasteryMode'];

  function installCompatAccessors() {
    for (let i = 0; i < COMPAT_KEYS.length; i++) {
      const key = COMPAT_KEYS[i];
      try {
        Object.defineProperty(global, key, {
          configurable: true,
          enumerable: true,
          get: function () {
            return state[key];
          },
          set: function (v) {
            /** @type {any} */ (state)[key] = v;
          },
        });
      } catch (_e) {
        /* propriedade pré-existente não redefinível */
      }
    }
  }

  installCompatAccessors();

  /** @type {any} */
  const g = global;
  g.TBState = state;
})(typeof window !== 'undefined' ? window : globalThis);
