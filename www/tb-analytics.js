// @ts-check
/**
 * Tile Blast — analytics / telemetria de funil (sem PII).
 * Schema versionado + buffer local para export / D1·D7·D30.
 *
 * @typedef {Record<string, any>} TBAnalyticsEvent
 * @typedef {{
 *   SCHEMA: number,
 *   sessionId: string,
 *   sessionStartedAt: number,
 *   bootReadyAt: number,
 *   firstMoveLogged: boolean,
 *   markOpen: () => void,
 *   markBootReady: (params?: Record<string, any>) => void,
 *   bootReadyMs: () => number,
 *   ttfmMs: () => number,
 *   logFirstMove: (params?: Record<string, any>) => void,
 *   log: (event: string, params?: Record<string, any>) => void,
 *   exportEvents: () => TBAnalyticsEvent[],
 *   funnelReport: () => Record<string, any>,
 *   clearBuffer: () => void
 * }} TBAnalyticsApi
 */
(function (global) {
  'use strict';

  const SCHEMA = 1;
  const BUF_KEY = 'tb_analytics_buf';
  const META_KEY = 'tb_analytics_meta';
  const BUF_MAX = 250;

  /** Nomes legados → canônicos do funil P1.3. */
  const ALIASES = {
    daily_puzzle_start: 'daily_open',
    daily_puzzle_complete: 'daily_complete',
    ad_watched: 'ad_reward_granted',
    iap_purchase: 'iap_success',
  };

  /** @returns {number} */
  function dayKey(ts) {
    return Math.floor((ts || Date.now()) / 86400000);
  }

  function detectPlatform() {
    try {
      if (global.Capacitor && typeof global.Capacitor.isNativePlatform === 'function') {
        if (global.Capacitor.isNativePlatform()) return 'android';
      }
    } catch (e) {
      /* ignore */
    }
    if (global.AndroidBridge) return 'android_webview';
    return 'web';
  }

  function resolveLocale() {
    try {
      if (global.TBI18n && typeof global.TBI18n.getLang === 'function') {
        const lang = global.TBI18n.getLang();
        if (lang) return lang;
      }
    } catch (e) {
      /* ignore */
    }
    try {
      const raw = global.localStorage && global.localStorage.getItem('tbv4');
      if (raw && global.TBSecure && typeof global.TBSecure.unwrap === 'function') {
        const data = global.TBSecure.unwrap(raw).data;
        if (data && data.lang) return data.lang;
      } else if (raw) {
        const data = JSON.parse(raw);
        if (data && data.lang) return data.lang;
      }
    } catch (e) {
      /* ignore */
    }
    return 'pt';
  }

  function newSessionId() {
    return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /** @returns {TBAnalyticsEvent[]} */
  function loadBuf() {
    try {
      if (!global.localStorage) return [];
      const raw = global.localStorage.getItem(BUF_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  /** @param {TBAnalyticsEvent[]} buf */
  function saveBuf(buf) {
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(BUF_KEY, JSON.stringify(buf.slice(-BUF_MAX)));
    } catch (e) {
      /* quota / private mode */
    }
  }

  function loadMeta() {
    try {
      if (!global.localStorage) return {};
      const raw = global.localStorage.getItem(META_KEY);
      if (!raw) return {};
      const m = JSON.parse(raw);
      return m && typeof m === 'object' ? m : {};
    } catch (e) {
      return {};
    }
  }

  /** @param {Record<string, any>} meta */
  function saveMeta(meta) {
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      /* ignore */
    }
  }

  /** @type {TBAnalyticsApi} */
  const TBAnalytics = {
    SCHEMA,
    sessionId: '',
    sessionStartedAt: 0,
    bootReadyAt: 0,
    firstMoveLogged: false,

    markOpen() {
      this.sessionStartedAt =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      this.firstMoveLogged = false;
      this.sessionId = newSessionId();

      const meta = loadMeta();
      const now = Date.now();
      if (!meta.firstOpenAt) meta.firstOpenAt = now;
      const dk = dayKey(now);
      const days = Array.isArray(meta.openDays) ? meta.openDays.slice() : [];
      if (days.indexOf(dk) < 0) days.push(dk);
      meta.openDays = days.slice(-90);
      meta.lastOpenAt = now;
      saveMeta(meta);
    },

    markBootReady(params) {
      const now =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      if (!this.bootReadyAt) this.bootReadyAt = now;
      const startup =
        this.sessionStartedAt > 0 ? Math.max(0, Math.round(now - this.sessionStartedAt)) : 0;
      this.log(
        'boot_ready',
        Object.assign({ startup_ms: startup }, params && typeof params === 'object' ? params : {})
      );
    },

    bootReadyMs() {
      if (!this.bootReadyAt || !this.sessionStartedAt) return 0;
      return Math.max(0, Math.round(this.bootReadyAt - this.sessionStartedAt));
    },

    ttfmMs() {
      if (!this.sessionStartedAt) return 0;
      const now =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      return Math.max(0, Math.round(now - this.sessionStartedAt));
    },

    logFirstMove(params) {
      if (this.firstMoveLogged) return;
      this.firstMoveLogged = true;
      this.log('first_move', Object.assign({ ttfm_ms: this.ttfmMs() }, params || {}));
    },

    log(event, params) {
      const rawName = String(event || 'unknown');
      const name = ALIASES[rawName] || rawName;
      const p = params && typeof params === 'object' ? params : {};
      /** @type {TBAnalyticsEvent} */
      const envelope = Object.assign(
        {
          schema: SCHEMA,
          name,
          ts: Date.now(),
          v: global.APP_VERSION || '0',
          locale: resolveLocale(),
          platform: detectPlatform(),
          session_id: this.sessionId || 'boot',
        },
        p
      );
      if (name !== rawName) envelope.legacy = rawName;

      const buf = loadBuf();
      buf.push(envelope);
      saveBuf(buf);

      try {
        if (global.AndroidBridge && typeof global.AndroidBridge.logEvent === 'function') {
          global.AndroidBridge.logEvent(name, JSON.stringify(envelope));
        }
      } catch (e) {
        /* ignore */
      }
      if (typeof console !== 'undefined' && console.debug) console.debug('[TB]', name, envelope);
    },

    exportEvents() {
      return loadBuf().slice();
    },

    clearBuffer() {
      try {
        if (global.localStorage) global.localStorage.removeItem(BUF_KEY);
      } catch (e) {
        /* ignore */
      }
    },

    funnelReport() {
      const events = loadBuf();
      const meta = loadMeta();
      const counts = Object.create(null);
      for (let i = 0; i < events.length; i++) {
        const n = events[i] && events[i].name;
        if (!n) continue;
        counts[n] = (counts[n] || 0) + 1;
      }
      const firstOpenAt = meta.firstOpenAt || 0;
      const firstDay = firstOpenAt ? dayKey(firstOpenAt) : 0;
      const openDays = Array.isArray(meta.openDays) ? meta.openDays : [];
      const openSet = Object.create(null);
      for (let i = 0; i < openDays.length; i++) openSet[openDays[i]] = true;
      const today = dayKey(Date.now());
      const daysSince = firstOpenAt ? Math.floor((Date.now() - firstOpenAt) / 86400000) : 0;

      function retained(offset) {
        return !!(firstDay && openSet[firstDay + offset]);
      }

      const opens = counts.app_open || 0;
      const onbStart = counts.onboarding_start || 0;
      const onbDone = (counts.onboarding_complete || 0) + (counts.onboarding_skip || 0);
      const firstMove = counts.first_move || 0;
      const levelStart = counts.level_start || 0;
      const levelWin = counts.level_win || 0;
      const levelLoss = counts.level_loss || 0;
      const levelAbandon = counts.level_abandon || 0;
      const powerupUsed = counts.powerup_used || 0;

      function rate(num, den) {
        return den > 0 ? Math.round((num / den) * 1000) / 1000 : 0;
      }

      return {
        schema: SCHEMA,
        generated_at: Date.now(),
        v: global.APP_VERSION || '0',
        first_open_at: firstOpenAt || null,
        days_since_install: daysSince,
        retention: {
          d1: { eligible: daysSince >= 1, retained: retained(1) },
          d7: { eligible: daysSince >= 7, retained: retained(7) },
          d30: { eligible: daysSince >= 30, retained: retained(30) },
        },
        open_days: openDays.length,
        counts,
        conversion: {
          onboarding: rate(onbDone, onbStart || opens),
          first_move: rate(firstMove, opens),
          level_win: rate(levelWin, levelStart),
          level_clear: rate(levelWin, levelWin + levelLoss),
          level_abandon: rate(levelAbandon, levelStart),
          powerup_per_start: rate(powerupUsed, levelStart),
        },
        events_buffered: events.length,
        today_day_key: today,
      };
    },
  };

  global.TBAnalytics = TBAnalytics;
})(typeof window !== 'undefined' ? window : globalThis);
