import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function seed(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('P3.1 economy sim + preços Play', () => {
  it('resolveIapDisplayPrice prioriza preço da loja sobre fallback', () => {
    createMinimalDom();
    mountModule('tb-economy.js');
    expect(
      TBEconomy.resolveIapDisplayPrice('starter', { price: 'R$ 2,99' }, { storePrice: 'US$ 0.99' })
    ).toBe('US$ 0.99');
    expect(
      TBEconomy.resolveIapDisplayPrice('starter', { price: 'R$ 2,99' }, { hasBilling: true })
    ).toBe('…');
    expect(
      TBEconomy.resolveIapDisplayPrice('starter', { price: 'R$ 2,99' }, { hasBilling: false })
    ).toBe('R$ 2,99');
  });

  it('simulateEconomyDays 30/90 respeita cap de ads e permanece saudável', () => {
    createMinimalDom();
    mountModule('tb-economy.js');
    const r30 = TBEconomy.simulateEconomyDays(30, {
      rng: seed(7),
      adAttemptsPerDay: 8,
    });
    const r90 = TBEconomy.simulateEconomyDays(90, {
      rng: seed(7),
      adAttemptsPerDay: 8,
    });
    expect(r30.days).toBe(30);
    expect(r90.days).toBe(90);
    expect(r30.adsGranted).toBe(30 * TBEconomy.AD_REWARDS.dailyLimit);
    expect(r90.adsGranted).toBe(90 * TBEconomy.AD_REWARDS.dailyLimit);
    expect(r30.adsBlocked).toBe(30 * (8 - TBEconomy.AD_REWARDS.dailyLimit));
    expect(r30.healthy).toBe(true);
    expect(r90.healthy).toBe(true);
    expect(r30.finalCoins).toBeGreaterThan(0);
    expect(r90.finalCoins).toBeGreaterThan(0);
  });
});
