import { beforeEach, describe, expect, it, vi } from 'vitest';
import TBRuntime from '../../tb-runtime.js';

describe('TBRuntime.escapeHtml (XSS)', () => {
  it('escapes HTML-significant characters', () => {
    expect(TBRuntime.escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(TBRuntime.escapeHtml('a & b "c" \'d\'')).toBe('a &amp; b &quot;c&quot; &#39;d&#39;');
  });
  it('handles null/undefined/number safely', () => {
    expect(TBRuntime.escapeHtml(null)).toBe('');
    expect(TBRuntime.escapeHtml(undefined)).toBe('');
    expect(TBRuntime.escapeHtml(42)).toBe('42');
  });
});

describe('TBRuntime.t (i18n com fallback)', () => {
  it('retorna o fallback quando TBRoadmap não está pronto', () => {
    delete globalThis.TBRoadmap;
    expect(TBRuntime.t('missing_key', 'Padrão')).toBe('Padrão');
  });

  it('usa a tradução de TBRoadmap quando disponível', () => {
    globalThis.TBRoadmap = { isReady: () => true, t: (k) => (k === 'play' ? 'Jogar' : '') };
    expect(TBRuntime.t('play', 'fallback')).toBe('Jogar');
    // chave sem tradução cai no fallback
    expect(TBRuntime.t('unknown', 'fb')).toBe('fb');
    delete globalThis.TBRoadmap;
  });
});

describe('TBRuntime.warn (log leve)', () => {
  it('nunca lança e chama console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => TBRuntime.warn('Tag', new Error('x'))).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('TBRuntime.captureError (TB-101)', () => {
  beforeEach(() => {
    globalThis.APP_VERSION = '1.4.9';
    globalThis.TBState = { lvIdx: 7 };
    globalThis.ld = () => ({ lang: 'es' });
    globalThis.TBAnalytics = {
      log: vi.fn(),
      exportEvents: () => [{ name: 'boot_ready' }],
    };
    globalThis.TBFirebase = {
      reportClientError: vi.fn(() => ({ ok: true })),
    };
  });

  it('envia level, versão, lang e last_event sem lançar', () => {
    const res = TBRuntime.captureError('error', new Error('boom-unit'));
    expect(res.ok).toBe(true);
    expect(res.payload.message).toBe('boom-unit');
    expect(res.payload.level).toBe(7);
    expect(res.payload.v).toBe('1.4.9');
    expect(res.payload.lang).toBe('es');
    expect(res.payload.last_event).toBe('boot_ready');
    expect(globalThis.TBAnalytics.log).toHaveBeenCalledWith(
      'client_error',
      expect.objectContaining({ message: 'boom-unit', level: 7 })
    );
    expect(globalThis.TBFirebase.reportClientError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', message: 'boom-unit', last_event: 'boot_ready' })
    );
  });

  it('nunca lança se analytics/firebase quebrarem', () => {
    globalThis.TBAnalytics.log = () => {
      throw new Error('analytics down');
    };
    globalThis.TBFirebase.reportClientError = () => {
      throw new Error('firebase down');
    };
    expect(() => TBRuntime.captureError('unhandledrejection', 'reject-unit')).not.toThrow();
    const res = TBRuntime.captureError('error', new Error('still-ok'));
    expect(res.ok === true || res.reason === 'dup').toBe(true);
  });

  it('dedupllica o mesmo fingerprint', () => {
    const a = TBRuntime.captureError('error', new Error('same-fp'));
    const b = TBRuntime.captureError('error', new Error('same-fp'));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(b.reason).toBe('dup');
  });
});

describe('TBRuntime timer/listener registry', () => {
  it('tracks and clears timers by scope', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    TBRuntime.setInterval(fn, 100, 'shop');
    TBRuntime.setTimeout(fn, 100, 'global');
    expect(TBRuntime.stats().timers).toBe(2);
    TBRuntime.clearScope('shop');
    expect(TBRuntime.stats().timers).toBe(1);
    TBRuntime.clearAll();
    expect(TBRuntime.stats().timers).toBe(0);
    vi.useRealTimers();
  });

  it('registers and removes listeners with scope teardown', () => {
    const target = {
      _h: {},
      addEventListener(t, h) {
        this._h[t] = h;
      },
      removeEventListener(t) {
        delete this._h[t];
      },
    };
    TBRuntime.on(target, 'click', () => {}, false, 'map');
    expect(TBRuntime.stats().listeners).toBe(1);
    expect(target._h.click).toBeTypeOf('function');
    TBRuntime.clearScope('map');
    expect(TBRuntime.stats().listeners).toBe(0);
    expect(target._h.click).toBeUndefined();
  });
});
