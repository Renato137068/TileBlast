import { describe, it, expect, vi } from 'vitest';
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
