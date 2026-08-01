import { describe, it, expect } from 'vitest';
import TBSecure from '../../tb-secure.js';

describe('TBSecure save integrity', () => {
  it('round-trips a save (wrap -> unwrap = ok)', () => {
    const save = { coins: 1200, lives: 5, unlocked: 34, stars: { 1: 3, 2: 2 } };
    const raw = TBSecure.wrap(save);
    const { data, status } = TBSecure.unwrap(raw);
    expect(status).toBe('ok');
    expect(data).toEqual(save);
  });

  it('detects tampering when the payload is edited', () => {
    const raw = TBSecure.wrap({ coins: 100 });
    const env = JSON.parse(raw);
    env.d = env.d.replace('100', '999999'); // simulate DevTools edit
    const { data, status } = TBSecure.unwrap(JSON.stringify(env));
    expect(status).toBe('tampered');
    // non-destructive: data is still returned, not wiped
    expect(data.coins).toBe(999999);
  });

  it('accepts a legacy unsigned save (backward compatible)', () => {
    const legacy = JSON.stringify({ coins: 50, lives: 3 });
    const { data, status } = TBSecure.unwrap(legacy);
    expect(status).toBe('legacy');
    expect(data.coins).toBe(50);
  });

  it('handles empty and corrupt input without throwing', () => {
    expect(TBSecure.unwrap(null).status).toBe('empty');
    expect(TBSecure.unwrap('').status).toBe('empty');
    expect(TBSecure.unwrap('{not json').status).toBe('corrupt');
    expect(TBSecure.unwrap(null).data).toEqual({});
  });

  it('signature changes when data changes', () => {
    expect(TBSecure.sign('{"a":1}')).not.toBe(TBSecure.sign('{"a":2}'));
  });
});
