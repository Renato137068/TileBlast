// @ts-check
/**
 * Tile Blast — Core runtime helpers.
 *
 *  1) Timer / listener REGISTRY
 *  2) HTML escaping (XSS hardening)
 *
 * Exposes: window.TBRuntime
 *
 * @typedef {'timeout'|'interval'} TBTimerKind
 * @typedef {{ id: any, kind: TBTimerKind, scope: string }} TBTimerRec
 * @typedef {{
 *   target: EventTarget,
 *   type: string,
 *   handler: EventListenerOrEventListenerObject,
 *   opts: boolean|AddEventListenerOptions|undefined,
 *   scope: string
 * }} TBListenerRec
 * @typedef {{
 *   setTimeout: (fn: Function, ms: number, scope?: string) => string,
 *   setInterval: (fn: Function, ms: number, scope?: string) => string,
 *   clearTimer: (key: string) => void,
 *   on: (target: EventTarget|null|undefined, type: string, handler: EventListenerOrEventListenerObject, opts?: boolean|AddEventListenerOptions, scope?: string) => TBListenerRec|null,
 *   off: (rec: TBListenerRec|null|undefined) => void,
 *   clearScope: (scope: string) => void,
 *   clearAll: () => void,
 *   stats: () => { timers: number, listeners: number },
 *   escapeHtml: (v: unknown) => string,
 *   setText: (el: Element|null|undefined, v: unknown) => void,
 *   t: (key: string, fallback: string) => string,
 *   warn: (tag: string, err: unknown) => void,
 *   loadScript: (src: string) => Promise<string>,
 *   loadDeferredModules: () => Promise<string[]>,
 *   deferredLoaded: () => string[]
 * }} TBRuntimeApi
 */
(function (global) {
  'use strict';

  /** @type {Map<string, TBTimerRec>} */
  const timers = new Map();
  /** @type {Set<TBListenerRec>} */
  const listeners = new Set();
  let seq = 0;

  /**
   * @param {Function} fn
   * @param {number} ms
   * @param {string} [scope]
   * @returns {string}
   */
  function setTimeout_(fn, ms, scope) {
    const key = 'T' + ++seq;
    const id = global.setTimeout(() => {
      timers.delete(key);
      fn();
    }, ms);
    timers.set(key, { id, kind: 'timeout', scope: scope || 'global' });
    return key;
  }

  /**
   * @param {Function} fn
   * @param {number} ms
   * @param {string} [scope]
   * @returns {string}
   */
  function setInterval_(fn, ms, scope) {
    const id = global.setInterval(/** @type {TimerHandler} */ (fn), ms);
    const key = 'I' + ++seq;
    timers.set(key, { id, kind: 'interval', scope: scope || 'global' });
    return key;
  }

  /**
   * @param {string} key
   * @returns {void}
   */
  function clearTimer(key) {
    const t = timers.get(key);
    if (!t) return;
    (t.kind === 'interval' ? global.clearInterval : global.clearTimeout)(t.id);
    timers.delete(key);
  }

  /**
   * @param {EventTarget|null|undefined} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} handler
   * @param {boolean|AddEventListenerOptions} [opts]
   * @param {string} [scope]
   * @returns {TBListenerRec|null}
   */
  function on(target, type, handler, opts, scope) {
    if (!target || !target.addEventListener) return null;
    target.addEventListener(type, handler, opts);
    /** @type {TBListenerRec} */
    const rec = { target, type, handler, opts, scope: scope || 'global' };
    listeners.add(rec);
    return rec;
  }

  /**
   * @param {TBListenerRec|null|undefined} rec
   * @returns {void}
   */
  function off(rec) {
    if (!rec) return;
    try {
      rec.target.removeEventListener(rec.type, rec.handler, rec.opts);
    } catch (e) {
      /* noop */
    }
    listeners.delete(rec);
  }

  /**
   * @param {string} scope
   * @returns {void}
   */
  function clearScope(scope) {
    for (const [key, t] of timers) {
      if (t.scope === scope) {
        (t.kind === 'interval' ? global.clearInterval : global.clearTimeout)(t.id);
        timers.delete(key);
      }
    }
    for (const rec of Array.from(listeners)) {
      if (rec.scope === scope) off(rec);
    }
  }

  /** @returns {void} */
  function clearAll() {
    for (const [, t] of timers)
      (t.kind === 'interval' ? global.clearInterval : global.clearTimeout)(t.id);
    timers.clear();
    for (const rec of Array.from(listeners)) off(rec);
  }

  /** @returns {{ timers: number, listeners: number }} */
  function stats() {
    return { timers: timers.size, listeners: listeners.size };
  }

  /** @type {Readonly<Record<string, string>>} */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /**
   * @param {unknown} v
   * @returns {string}
   */
  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c] || c);
  }

  /**
   * @param {Element|null|undefined} el
   * @param {unknown} v
   * @returns {void}
   */
  function setText(el, v) {
    if (el) el.textContent = v == null ? '' : String(v);
  }

  /**
   * @param {string} tag
   * @param {unknown} err
   * @returns {void}
   */
  function warn(tag, err) {
    try {
      if (global.console && global.console.warn) global.console.warn('[' + tag + ']', err);
    } catch (e) {
      /* logging nunca deve quebrar o fluxo */
    }
  }

  /**
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  function t(key, fallback) {
    /** @type {any} */
    const R = global.TBRoadmap;
    if (R && R.isReady && R.isReady()) {
      const v = R.t(key);
      if (v) return v;
    }
    return fallback;
  }

  /** @type {Set<string>} */
  const deferredLoaded = new Set();

  /**
   * @param {string} src
   * @returns {Promise<string>}
   */
  function loadScript(src) {
    if (deferredLoaded.has(src)) return Promise.resolve(src);
    return new Promise((resolve, reject) => {
      const existing = global.document && global.document.querySelector('script[src="' + src + '"]');
      if (existing) {
        deferredLoaded.add(src);
        resolve(src);
        return;
      }
      const el = global.document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => {
        deferredLoaded.add(src);
        resolve(src);
      };
      el.onerror = () => reject(new Error('Falha ao carregar ' + src));
      global.document.head.appendChild(el);
    });
  }

  /** @returns {Promise<string[]>} */
  async function loadDeferredModules() {
    /** @type {string[]} */
    const list = Array.isArray(global.__TB_DEFERRED_MODULES__) ? global.__TB_DEFERRED_MODULES__ : [];
    const loaded = [];
    for (let i = 0; i < list.length; i++) {
      const src = list[i];
      if (!src || deferredLoaded.has(src)) continue;
      await loadScript(src);
      loaded.push(src);
    }
    return loaded;
  }

  /** @returns {string[]} */
  function deferredLoadedList() {
    return Array.from(deferredLoaded);
  }

  /** @type {TBRuntimeApi} */
  const api = {
    setTimeout: setTimeout_,
    setInterval: setInterval_,
    clearTimer,
    on,
    off,
    clearScope,
    clearAll,
    stats,
    escapeHtml,
    setText,
    t,
    warn,
    loadScript,
    loadDeferredModules,
    deferredLoaded: deferredLoadedList,
  };

  /** @type {any} */
  const g = global;
  g.TBRuntime = api;

  // @ts-ignore — `module` só existe no host Node dos testes
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
