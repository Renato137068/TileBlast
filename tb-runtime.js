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
 *   captureError: (kind: string, err: unknown, extra?: Record<string, unknown>) => { ok: boolean, reason?: string, payload?: Record<string, unknown> },
 *   installErrorCapture: () => boolean,
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

  let errorCaptureInstalled = false;
  let errorCaptureBusy = false;
  let errorCaptureCount = 0;
  const ERROR_CAPTURE_MAX = 20;
  /** @type {Set<string>} */
  const errorCaptureSeen = new Set();

  function resolveErrorLang() {
    try {
      if (typeof global.ld === 'function') {
        const s = global.ld();
        if (s && s.lang) return String(s.lang);
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (global.TBI18n && typeof global.TBI18n.detectLanguage === 'function') {
        const nav = global.navigator && global.navigator.language;
        const d = global.TBI18n.detectLanguage(nav || '');
        if (d) return String(d);
      }
    } catch (e) {
      /* ignore */
    }
    try {
      const html =
        global.document && global.document.documentElement && global.document.documentElement.lang;
      if (html) {
        const h = String(html).toLowerCase();
        if (h.indexOf('en') === 0) return 'en';
        if (h.indexOf('es') === 0) return 'es';
        if (h.indexOf('pt') === 0) return 'pt';
      }
    } catch (e) {
      /* ignore */
    }
    return 'pt';
  }

  function lastAnalyticsEventName() {
    try {
      if (!global.TBAnalytics || typeof global.TBAnalytics.exportEvents !== 'function') return '';
      const ev = global.TBAnalytics.exportEvents();
      if (!Array.isArray(ev) || !ev.length) return '';
      const last = ev[ev.length - 1];
      return last && last.name ? String(last.name) : '';
    } catch (e) {
      return '';
    }
  }

  function currentLevelIdx() {
    try {
      if (global.TBState && typeof global.TBState.lvIdx === 'number') return global.TBState.lvIdx;
    } catch (e) {
      /* ignore */
    }
    return -1;
  }

  /**
   * TB-101: captura global. Nunca lança.
   * @param {string} kind
   * @param {unknown} err
   * @param {Record<string, unknown>} [extra]
   * @returns {{ ok: boolean, reason?: string, payload?: Record<string, unknown> }}
   */
  function captureError(kind, err, extra) {
    if (errorCaptureBusy) return { ok: false, reason: 'reentry' };
    errorCaptureBusy = true;
    try {
      if (errorCaptureCount >= ERROR_CAPTURE_MAX) return { ok: false, reason: 'capped' };
      let message = '';
      if (err && typeof err === 'object' && /** @type {{ message?: unknown }} */ (err).message) {
        message = String(/** @type {{ message: unknown }} */ (err).message);
      } else if (typeof err === 'string') {
        message = err;
      } else {
        message = String(err == null ? 'unknown' : err);
      }
      message = message.slice(0, 240);
      const fp = String(kind || 'error') + ':' + message.slice(0, 160);
      if (errorCaptureSeen.has(fp)) return { ok: false, reason: 'dup' };
      errorCaptureSeen.add(fp);
      errorCaptureCount++;

      /** @type {Record<string, unknown>} */
      const payload = {
        kind: String(kind || 'error'),
        message: message,
        level: currentLevelIdx(),
        v: String(global.APP_VERSION || '0'),
        lang: resolveErrorLang(),
        last_event: lastAnalyticsEventName(),
      };
      if (extra && typeof extra === 'object') {
        if (extra.source) payload.source = String(extra.source).slice(0, 120);
        if (extra.lineno != null) payload.lineno = Number(extra.lineno) || 0;
      }

      try {
        if (global.TBAnalytics && typeof global.TBAnalytics.log === 'function') {
          global.TBAnalytics.log('client_error', payload);
        }
      } catch (e) {
        /* never throw */
      }

      try {
        if (global.TBFirebase && typeof global.TBFirebase.reportClientError === 'function') {
          global.TBFirebase.reportClientError(payload);
        } else if (global.TBFirebase && typeof global.TBFirebase.enqueueCallable === 'function') {
          global.TBFirebase.enqueueCallable('client_error', payload);
          if (typeof global.TBFirebase.flushCallableQueue === 'function') {
            Promise.resolve()
              .then(function () {
                return global.TBFirebase.flushCallableQueue();
              })
              .catch(function () {});
          }
        }
      } catch (e) {
        /* never throw */
      }

      return { ok: true, payload: payload };
    } catch (e) {
      return { ok: false, reason: 'error' };
    } finally {
      errorCaptureBusy = false;
    }
  }

  function onWindowError(ev) {
    try {
      const err = ev && ev.error ? ev.error : ev && ev.message ? ev.message : 'window.error';
      const extra = {};
      if (ev && ev.filename) extra.source = ev.filename;
      if (ev && ev.lineno != null) extra.lineno = ev.lineno;
      captureError('error', err, extra);
    } catch (e) {
      /* ignore */
    }
  }

  function onUnhandledRejection(ev) {
    try {
      const reason = ev && ev.reason !== undefined ? ev.reason : 'unhandledrejection';
      captureError('unhandledrejection', reason);
    } catch (e) {
      /* ignore */
    }
  }

  /** @returns {boolean} */
  function installErrorCapture() {
    if (errorCaptureInstalled) return true;
    const target = global.window && typeof global.window.addEventListener === 'function' ? global.window : global;
    if (!target || typeof target.addEventListener !== 'function') return false;
    errorCaptureInstalled = true;
    on(target, 'error', onWindowError, true, 'error-capture');
    on(target, 'unhandledrejection', onUnhandledRejection, true, 'error-capture');
    return true;
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
      const existing =
        global.document && global.document.querySelector('script[src="' + src + '"]');
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
    const list = Array.isArray(global.__TB_DEFERRED_MODULES__)
      ? global.__TB_DEFERRED_MODULES__
      : [];
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
    captureError,
    installErrorCapture,
    loadScript,
    loadDeferredModules,
    deferredLoaded: deferredLoadedList,
  };

  /** @type {any} */
  const g = global;
  g.TBRuntime = api;

  try {
    installErrorCapture();
  } catch (e) {
    /* boot nunca deve quebrar por telemetria */
  }

  // @ts-ignore — `module` só existe no host Node dos testes
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
