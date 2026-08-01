import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const pv = require('../../functions/play-verify.js');
const iap = require('../../functions/iap-logic.js');
const challenge = require('../../functions/challenge-logic.js');
const catalog = require('../../functions/economy-catalog.js');

describe('functions/play-verify — parse/env helpers', () => {
  const ENV_KEYS = [
    'PLAY_SERVICE_ACCOUNT_JSON',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON',
    'ANDROID_PACKAGE_NAME',
    'PLAY_PACKAGE_NAME',
  ];
  const saved = {};
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
  const stash = (k, v) => {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  };

  it('parseServiceAccount cobre null, objeto, JSON válido e inválido', () => {
    expect(pv.parseServiceAccount(null)).toBeNull();
    expect(pv.parseServiceAccount('')).toBeNull();
    const obj = { client_email: 'a@b.c' };
    expect(pv.parseServiceAccount(obj)).toBe(obj);
    expect(pv.parseServiceAccount('{"a":1}')).toEqual({ a: 1 });
    expect(pv.parseServiceAccount('{não é json')).toBeNull();
  });

  it('loadCredentialsFromEnv lê a env e cai em null sem ela', () => {
    stash('PLAY_SERVICE_ACCOUNT_JSON', '{"client_email":"svc@x"}');
    expect(pv.loadCredentialsFromEnv()).toEqual({ client_email: 'svc@x' });
    stash('PLAY_SERVICE_ACCOUNT_JSON', undefined);
    stash('GOOGLE_APPLICATION_CREDENTIALS_JSON', undefined);
    expect(pv.loadCredentialsFromEnv()).toBeNull();
  });

  it('packageName usa override da env ou o default do catálogo', () => {
    stash('ANDROID_PACKAGE_NAME', 'com.exemplo.custom');
    expect(pv.packageName()).toBe('com.exemplo.custom');
    stash('ANDROID_PACKAGE_NAME', undefined);
    stash('PLAY_PACKAGE_NAME', undefined);
    expect(pv.packageName()).toBe(catalog.PACKAGE_NAME_DEFAULT);
  });
});

describe('functions/iap-logic — assertPlayPurchaseValid', () => {
  it('assinatura não paga → permission-denied', () => {
    const r = iap.assertPlayPurchaseValid({ paymentState: 0, purchaseState: 1 }, 'sub');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('permission-denied');
  });

  it('assinatura recebida (paymentState 1) → ok', () => {
    expect(iap.assertPlayPurchaseValid({ paymentState: 1, purchaseState: 0 }, 'sub').ok).toBe(true);
  });

  it('inapp cancelado (purchaseState != 0) → permission-denied', () => {
    const r = iap.assertPlayPurchaseValid({ purchaseState: 1 }, 'inapp');
    expect(r.ok).toBe(false);
  });

  it('recibo ausente → permission-denied', () => {
    expect(iap.assertPlayPurchaseValid(null, 'inapp').ok).toBe(false);
  });
});

describe('functions/challenge-logic — validação', () => {
  it('buildChallenge rejeita level inválido', () => {
    expect(challenge.buildChallenge({ levelIdx: -1 }).ok).toBe(false);
    expect(challenge.buildChallenge({ levelIdx: NaN }).ok).toBe(false);
    expect(challenge.buildChallenge({ levelIdx: 999999 }).code).toBe('invalid-argument');
  });

  it('buildChallenge aceita level válido e produz id/nonce', () => {
    const r = challenge.buildChallenge({ levelIdx: 3, nowMs: 1000 });
    expect(r.ok).toBe(true);
    expect(r.challenge).toBeTruthy();
  });

  it('evaluateChallengeClaim rejeita desafio ausente ou já usado', () => {
    expect(challenge.evaluateChallengeClaim(null, 'n', 1000, 'uid').code).toBe('not-found');
    const used = challenge.evaluateChallengeClaim({ used: true, nonce: 'n' }, 'n', 1000, 'uid');
    expect(used.ok).toBe(false);
  });
});
