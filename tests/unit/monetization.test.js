import { describe, expect, it, beforeEach } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function loadEconomy() {
  createMinimalDom();
  mountModule('tb-config.js');
  mountModule('tb-economy.js');
  return TBEconomy;
}

describe('monetizacao: classificacao consumivel x nao-consumivel', () => {
  let E;
  beforeEach(() => {
    E = loadEconomy();
  });

  it('nao-consumiveis: once / noAds / bpPremium / subscription', () => {
    expect(E.isNonConsumable(E.IAP_META.starter)).toBe(true); // once
    expect(E.isNonConsumable(E.IAP_META.welcome)).toBe(true); // once
    expect(E.isNonConsumable(E.IAP_META.noads)).toBe(true); // noAds
    expect(E.isNonConsumable(E.IAP_META.no_ads_monthly)).toBe(true); // subscription
    expect(E.isNonConsumable(E.IAP_META.bppremium)).toBe(true); // bpPremium
  });

  it('consumiveis: pacotes de moedas / impulso', () => {
    expect(E.isNonConsumable(E.IAP_META.coins500)).toBe(false);
    expect(E.isNonConsumable(E.IAP_META.coins1500)).toBe(false);
    expect(E.isNonConsumable(E.IAP_META.value_boost)).toBe(false);
    expect(E.isNonConsumable(undefined)).toBe(false);
  });
});

describe('monetizacao: anti-double-grant (farm via restore)', () => {
  let E;
  beforeEach(() => {
    E = loadEconomy();
  });

  it('consumivel: sempre concede o bonus', () => {
    const save = { iapGranted: { coins500: 123 } };
    expect(E.shouldGrantIapBonus('coins500', E.IAP_META.coins500, save)).toBe(true);
  });

  it('nao-consumivel: concede na 1a vez, nega depois', () => {
    const save = {};
    const meta = E.IAP_META.starter;
    expect(E.shouldGrantIapBonus('starter', meta, save)).toBe(true); // 1a vez
    // simula concessao registrada
    save.iapGranted = { starter: Date.now() };
    expect(E.shouldGrantIapBonus('starter', meta, save)).toBe(false); // restore nao re-concede
  });
});
