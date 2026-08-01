// @ts-check
/**
 * TB-CONFIG — Fonte única de constantes de configuração do jogo.
 * Apenas valores (sem lógica de gameplay). Exposto como window.TBConfig.
 *
 * @typedef {{ NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 }} TBSpecialEnum
 * @typedef {{
 *   GW: number, GH: number, TC: number, PPB: number,
 *   CMT: number, CMM: number, CHT: number, CHM: number,
 *   BOMB_T: number, ROCKET_T: number, RAINBOW_T: number,
 *   CASCADE_MAX: number, CASCADE_MIN: number, CASCADE_SCORE_MULT: number,
 *   SP: TBSpecialEnum,
 *   OBS_ICON: Record<string, string>,
 *   COLORS: string[],
 *   ICONS: string[],
 *   CONFETTI_COLORS: string[],
 *   COINS_STAR: number[],
 *   XP_DEFS: {
 *     win: number[],
 *     score_per_1000: number,
 *     daily_mission: number,
 *     weekly_mission: number,
 *     combo: number,
 *     chest: Record<string, number>
 *   },
 *   CHEST_SLOTS: number,
 *   EVENT_DURATION_MS: number,
 *   XP_SAVE_KEY: string,
 *   CHEST_SAVE_KEY: string
 * }} TBConfigShape
 */
(function () {
  'use strict';

  /** P4.1 — módulos adiados (manifesto: scripts/modules.mjs DEFERRED_MODULES). */
  /** @type {any} */
  const w = typeof window !== 'undefined' ? window : null;
  if (w && !w.__TB_DEFERRED_MODULES__) {
    w.__TB_DEFERRED_MODULES__ = ['tb-push.js'];
  }

  /** @type {TBConfigShape} */
  var CONFIG = {
    GW: 8,
    GH: 8,
    TC: 6,
    PPB: 10,
    CMT: 5,
    CMM: 1.5,
    CHT: 8,
    CHM: 2.0,
    BOMB_T: 4,
    ROCKET_T: 6,
    RAINBOW_T: 8,
    /** Máximo de cascata automática pós-gravidade (grupos que se formam sozinhos). */
    CASCADE_MAX: 3,
    /** Tamanho mínimo para cascata automática (pares ficam para o jogador). */
    CASCADE_MIN: 3,
    /** Multiplicador de pontuação em limpezas de cascata (não gasta movimento). */
    CASCADE_SCORE_MULT: 0.5,
    SP: { NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 },
    OBS_ICON: { ice: '🧊', crate: '📦', collect: '🍒', cover: '🟩', chain: '⛓️' },
    COLORS: ['#ef4b5f', '#3aa6e0', '#4ecb71', '#f6c945', '#b46fe0', '#f5933e'],
    ICONS: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
    CONFETTI_COLORS: ['#ef4b5f', '#3aa6e0', '#4ecb71', '#f6c945', '#b46fe0', '#f6b23e'],
    COINS_STAR: [0, 20, 35, 55],
    XP_DEFS: {
      win: [0, 20, 35, 50],
      score_per_1000: 5,
      daily_mission: 25,
      weekly_mission: 75,
      combo: 2,
      chest: { bronze: 10, silver: 25, gold: 50, epic: 75, legendary: 150 },
    },
    CHEST_SLOTS: 4,
    EVENT_DURATION_MS: 3 * 24 * 3600 * 1000,
    XP_SAVE_KEY: 'xp',
    CHEST_SAVE_KEY: 'chests',
  };

  /**
   * @param {object|null|undefined} o
   * @returns {object|null|undefined}
   */
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.keys(o).forEach(function (k) {
        deepFreeze(/** @type {any} */ (o)[k]);
      });
      Object.freeze(o);
    }
    return o;
  }

  /** @type {any} */
  var g = typeof window !== 'undefined' ? window : globalThis;
  g.TBConfig = deepFreeze(CONFIG);

  try {
    if (typeof location !== 'undefined' && location.protocol !== 'file:') {
      if (!document.querySelector('link[rel="manifest"]')) {
        var man = document.createElement('link');
        man.rel = 'manifest';
        man.href = 'manifest.json';
        document.head.appendChild(man);
      }
    }
    var font = document.getElementById('tb-font-css');
    if (font) {
      var activate = function () {
        /** @type {HTMLLinkElement} */ (font).media = 'all';
      };
      if (/** @type {HTMLLinkElement} */ (font).sheet) activate();
      else font.addEventListener('load', activate);
      setTimeout(activate, 3000);
    }
  } catch (e) {
    /* non-fatal */
  }
})();
