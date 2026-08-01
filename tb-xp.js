// @ts-check
/**
 * Tile Blast — sistema de XP / nível
 * Extraído de tb-meta-ui.js. TBXp.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBXpCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBConfig = global.TBConfig;
  /** @type {any} */
  const TBLogic = global.TBLogic;

  /** @type {any} */
  let C = null;

  /** @param {TBXpCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  const XP_DEFS = TBConfig.XP_DEFS;
  const XP_SAVE_KEY = TBConfig.XP_SAVE_KEY;
  const LEVEL_XP = TBLogic.LEVEL_XP;
  function _xpForLevel(lvl) {
    return TBLogic.xpForLevel(lvl);
  }
  function getLevel(totalXP) {
    return TBLogic.xpLevelInfo(totalXP);
  }

  function getXP() {
    const s = C.ld();
    if (typeof s[XP_SAVE_KEY] !== 'number') s[XP_SAVE_KEY] = 0;
    return s[XP_SAVE_KEY];
  }

  function addXP(amount) {
    if (!amount || amount <= 0) return;
    const mult =
      (typeof global.getActiveEvent === 'function' ? global.getActiveEvent() : { xpMult: 1 })
        .xpMult || 1;
    amount = Math.round(amount * mult);
    const s = C.ld();
    if (typeof s[XP_SAVE_KEY] !== 'number') s[XP_SAVE_KEY] = 0;
    const before = getLevel(s[XP_SAVE_KEY]);
    s[XP_SAVE_KEY] += amount;
    C.sv(s);
    const after = getLevel(s[XP_SAVE_KEY]);
    s.xpLevel = after.level;
    C.sv(s);
    renderXPBar();
    C.showToast(
      '⚡',
      C._t('xp_gained', '+{n} XP').replace('{n}', String(amount)),
      C._t('xp_progress', 'Nv.{level} — {current}/{needed}')
        .replace('{level}', String(after.level))
        .replace('{current}', String(after.current))
        .replace('{needed}', String(after.needed))
    );
    if (after.level > before.level) {
      setTimeout(() => showLevelUpCelebration(after.level), 600);
      (global.checkLevelCollUnlocks || function () {})(after.level);
    }
  }

  function showLevelUpCelebration(level) {
    document.getElementById('levelup-num').textContent = C._t('level_num', 'Nv. {n}').replace(
      '{n}',
      String(level)
    );
    const el = document.getElementById('levelup-overlay');
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
    C.spawnConfetti(45);
    C.Sound.levelUp();
    C.Haptic.heavy();
    setTimeout(() => document.getElementById('levelup-ok')?.focus(), 120);
  }

  function closeLevelUpCelebration() {
    const el = document.getElementById('levelup-overlay');
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }

  let _prevXpInfo = null;
  function renderXPBar() {
    const info = getLevel(getXP());
    const fill = document.getElementById('xp-fill');
    const lbl = document.getElementById('xp-label');
    const tot = document.getElementById('xp-total');
    if (fill) {
      fill.style.width = info.pct + '%'; // preenchimento suave via CSS transition (.5s ease)
      // Brilho ao ganhar XP e glow especial ao subir de nível.
      if (_prevXpInfo && !C._reduceMotion()) {
        const leveled = info.level > _prevXpInfo.level;
        if (leveled || info.pct > _prevXpInfo.pct) {
          fill.classList.remove('xp-gain');
          void fill.offsetWidth;
          fill.classList.add('xp-gain');
          setTimeout(() => fill.classList.remove('xp-gain'), 760);
        }
        if (leveled) {
          fill.classList.add('xp-levelup');
          setTimeout(() => fill.classList.remove('xp-levelup'), 1400);
        }
      }
    }
    if (lbl) lbl.textContent = '⚡ Nv.' + info.level;
    if (tot) tot.textContent = info.current + '/' + info.needed;
    _prevXpInfo = info;
  }
  // ────────────────────────────────────────────────────────────────

  /** @type {any} */
  const api = {
    init,
    XP_DEFS,
    addXP,
    getXP,
    getLevel,
    showLevelUpCelebration,
    closeLevelUpCelebration,
    renderXPBar,
  };

  /** @type {any} */
  const g = global;
  g.XP_DEFS = XP_DEFS;
  g.addXP = addXP;
  g.getXP = getXP;
  g.getLevel = getLevel;
  g.showLevelUpCelebration = showLevelUpCelebration;
  g.closeLevelUpCelebration = closeLevelUpCelebration;
  g.renderXPBar = renderXPBar;
  g.TBXp = api;
})(typeof window !== 'undefined' ? window : globalThis);
