import { beforeEach, describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

/** Carrega tb-save.js com as dependências que ele captura no load. */
function mountSave() {
  mountModule('tb-game-logic.js');
  mountModule('tb-economy.js');
  mountModule('tb-secure.js');
  mountModule('tb-state.js');
  mountModule('tb-analytics.js');
  mountModule('tb-ui.js');
  mountModule('tb-save.js');
  return globalThis.TBSave;
}

describe('tb-save — persistência', () => {
  /** @type {any} */
  let S;

  beforeEach(() => {
    delete globalThis.TBSave;
    delete globalThis.TBEconomy;
    delete globalThis.TBSecure;
    delete globalThis.TBState;
    delete globalThis.TBAnalytics;
    delete globalThis.TBUI;
    S = mountSave();
    S.init({});
  });

  it('ld() devolve objeto vazio sem save prévio', () => {
    expect(S.ld()).toEqual({});
  });

  it('sv() é debounced e flushSave() grava no localStorage', () => {
    S.sv({ coins: 120 });
    expect(localStorage.getItem(S.SK)).toBeNull();
    S.flushSave();
    expect(localStorage.getItem(S.SK)).toBeTruthy();
    expect(S.getCoins()).toBe(120);
  });

  it('addCoins acumula sobre o valor atual', () => {
    S.addCoins(30);
    S.addCoins(20);
    expect(S.getCoins()).toBe(50);
  });

  it('setLives satura no máximo e no zero', () => {
    S.setLives(999);
    expect(S.getLives()).toBe(S.ML);
    S.setLives(-5);
    expect(S.getLives()).toBe(0);
  });

  it('setLives abaixo do máximo agenda regeneração', () => {
    S.setLives(S.ML - 1);
    expect(typeof S.ld().lifeRegenAt).toBe('number');
    S.resetLives();
    expect(S.ld().lifeRegenAt).toBeUndefined();
  });

  it('usePU consome apenas quando há estoque', () => {
    expect(S.usePU('bomb')).toBe(false);
    S.addPU('bomb', 2);
    expect(S.usePU('bomb')).toBe(true);
    expect(S.getPUCount('bomb')).toBe(1);
  });

  it('completeLevel guarda melhor estrela e high score', () => {
    globalThis.TBState.LEVELS = [{ world: 'A' }, { world: 'A' }];
    S.completeLevel(0, 3, 900);
    S.completeLevel(0, 1, 100);
    expect(S.getStars(0)).toBe(3);
    expect(S.getHS()).toBe(900);
    expect(S.getUnlocked()).toBe(1);
  });

  it('resetAll limpa cache e storage', () => {
    S.addCoins(99);
    S.flushSave();
    S.resetAll();
    expect(localStorage.getItem(S.SK)).toBeNull();
    expect(S.getCoins()).toBe(0);
  });

  it('ld() se recupera de payload corrompido', () => {
    localStorage.setItem(S.SK, '{quebrado');
    S.resetAll();
    localStorage.setItem(S.SK, '{quebrado');
    expect(S.ld()).toEqual({});
  });
});

describe('tb-save — IAP', () => {
  /** @type {any} */
  let S;

  beforeEach(() => {
    delete globalThis.TBSave;
    delete globalThis.TBEconomy;
    delete globalThis.TBSecure;
    delete globalThis.TBState;
    delete globalThis.TBAnalytics;
    delete globalThis.TBUI;
    S = mountSave();
    S.init({});
  });

  it('applyIapPurchase credita moedas e extras do pacote', () => {
    const meta = S.IAP_META.starter;
    S.applyIapPurchase('starter');
    expect(S.getCoins()).toBe(meta.coins);
    expect(S.getPUCount('bomb')).toBe(meta.extras.bomb);
    expect(S.ld().boughtStarter).toBe(true);
    expect(S.ld().boughtAnyIAP).toBe(true);
  });

  it('applyIapPurchase ignora item desconhecido', () => {
    S.applyIapPurchase('inexistente');
    expect(S.getCoins()).toBe(0);
  });

  it('token de compra é registrado e torna o grant idempotente', () => {
    S.applyIapPurchase('welcome', 'tok-123');
    const afterFirst = S.getCoins();
    expect(afterFirst).toBeGreaterThan(0);
    expect(S.ld().iapTokens['tok-123'].item).toBe('welcome');

    S.applyIapPurchase('welcome', 'tok-123');
    expect(S.getCoins()).toBe(afterFirst);
  });

  it('reconcileServerEconomy sobrescreve saldo e entitlements', () => {
    S.addCoins(10);
    S.reconcileServerEconomy({ coins: 777, entitlements: { noAds: true, starter: true } });
    expect(S.getCoins()).toBe(777);
    expect(S.ld().noAds).toBe(true);
    expect(S.ld().boughtStarter).toBe(true);
  });

  it('reconcileServerEconomy ignora resposta sem saldo numérico', () => {
    S.addCoins(10);
    S.reconcileServerEconomy({ entitlements: { noAds: true } });
    S.reconcileServerEconomy(null);
    expect(S.getCoins()).toBe(10);
    expect(S.ld().noAds).toBeUndefined();
  });

  it('getEconomyCoinMult devolve multiplicador numérico', () => {
    expect(typeof S.getEconomyCoinMult(1)).toBe('number');
    expect(S.getEconomyCoinMult(2)).toBeGreaterThan(0);
  });
});
