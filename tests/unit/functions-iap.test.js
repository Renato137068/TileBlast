import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const logic = require('../../functions/iap-logic.js');
const catalog = require('../../functions/economy-catalog.js');
const playVerify = require('../../functions/play-verify.js');

describe('functions/iap-logic — ads rate-limit', () => {
  it('utcDayKey formato ISO date', () => {
    expect(logic.utcDayKey(new Date('2026-07-15T12:00:00Z'))).toBe('2026-07-15');
  });

  it('avalia grant e respeita limite diário', () => {
    const day = '2026-07-15';
    let ad = { dayKey: day, count: 0 };
    for (let i = 0; i < catalog.AD_DAILY_LIMIT; i++) {
      const r = logic.evaluateAdGrant(ad, day, 'r' + i);
      expect(r.ok).toBe(true);
      expect(r.granted).toBe(true);
      expect(r.coinsDelta).toBe(catalog.AD_REWARD_COINS);
      ad = { dayKey: day, count: r.count, lastRequestId: 'r' + i };
    }
    const blocked = logic.evaluateAdGrant(ad, day, 'extra');
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe('resource-exhausted');
  });

  it('idempotência por requestId no mesmo dia', () => {
    const day = '2026-07-15';
    const ad = { dayKey: day, count: 2, lastRequestId: 'same' };
    const r = logic.evaluateAdGrant(ad, day, 'same');
    expect(r.ok).toBe(true);
    expect(r.duplicate).toBe(true);
    expect(r.granted).toBe(false);
    expect(r.coinsDelta).toBe(0);
  });
});

describe('functions/iap-logic — productId → coins/entitlements', () => {
  it('mapeia packs conhecidos', () => {
    expect(logic.planIapGrant({ coins: 100 }, 'coins500').nextCoins).toBe(600);
    expect(logic.planIapGrant({ coins: 0 }, 'starter').deltaCoins).toBe(650);
    expect(logic.planIapGrant({}, 'noads').nextEntitlements.noAds).toBe(true);
    expect(logic.planIapGrant({}, 'bppremium').nextEntitlements.bpPremium).toBe(true);
    expect(logic.getProduct('no_ads_yearly').kind).toBe('sub');
  });

  it('once já possuído não credita de novo (alreadyOwned)', () => {
    const owned = logic.planIapGrant({ coins: 900, entitlements: { starter: true } }, 'starter');
    expect(owned.alreadyOwned).toBe(true);
    expect(owned.deltaCoins).toBe(0);
    expect(owned.nextCoins).toBe(900);
  });

  it('assertPlayPurchaseValid rejeita refund/cancel (purchaseState=1)', () => {
    expect(logic.assertPlayPurchaseValid({ purchaseState: 1 }, 'inapp').ok).toBe(false);
    expect(logic.assertPlayPurchaseValid({ purchaseState: 2 }, 'inapp').ok).toBe(false);
  });

  it('validateConfirmArgs rejeita input inválido', () => {
    expect(logic.validateConfirmArgs({}).ok).toBe(false);
    expect(logic.validateConfirmArgs({ productId: 'x' }).code).toBe('invalid-argument');
    expect(logic.validateConfirmArgs({ productId: 'ghost', purchaseToken: 't' }).ok).toBe(false);
    const ok = logic.validateConfirmArgs({ productId: 'coins500', purchaseToken: 'tok' });
    expect(ok.ok).toBe(true);
    expect(ok.productId).toBe('coins500');
  });

  it('receiptOwnership distingue fresh/duplicate/conflict', () => {
    expect(logic.receiptOwnership(null, 'u1')).toBe('fresh');
    expect(logic.receiptOwnership('u1', 'u1')).toBe('duplicate');
    expect(logic.receiptOwnership('u2', 'u1')).toBe('conflict');
  });

  it('assertPlayPurchaseValid exige purchaseState=0 em inapp', () => {
    expect(logic.assertPlayPurchaseValid({ purchaseState: 0 }, 'inapp').ok).toBe(true);
    expect(logic.assertPlayPurchaseValid({ purchaseState: 1 }, 'inapp').code).toBe(
      'permission-denied'
    );
    expect(logic.assertPlayPurchaseValid({ paymentState: 1 }, 'sub').ok).toBe(true);
  });
});

describe('functions/play-verify — parse secrets', () => {
  it('parseServiceAccount aceita JSON string e objeto', () => {
    expect(playVerify.parseServiceAccount(null)).toBeNull();
    expect(playVerify.parseServiceAccount('{bad')).toBeNull();
    expect(playVerify.parseServiceAccount({ client_email: 'a@b' }).client_email).toBe('a@b');
    expect(playVerify.parseServiceAccount('{"client_email":"a@b"}').client_email).toBe('a@b');
  });

  it('packageName default com.tileblast.game', () => {
    const prev = process.env.ANDROID_PACKAGE_NAME;
    delete process.env.ANDROID_PACKAGE_NAME;
    delete process.env.PLAY_PACKAGE_NAME;
    expect(playVerify.packageName()).toBe('com.tileblast.game');
    if (prev != null) process.env.ANDROID_PACKAGE_NAME = prev;
  });
});

describe('functions confirmIapPurchase — integração leve com mocks', () => {
  it('credita once e é idempotente no 2º call (Play API mockada)', async () => {
    const { runConfirmIapPurchase, receiptDocId } = require('../../functions/confirm-iap.js');
    void receiptDocId;

    const store = {
      users: {},
      iapReceipts: {},
      ledger: {},
    };

    function makeSnap(data) {
      return {
        exists: !!data,
        data: () => data,
      };
    }

    const db = {
      collection(name) {
        return {
          doc(id) {
            const path = name + '/' + id;
            return {
              id,
              collection(sub) {
                return {
                  doc(subId) {
                    const sp = path + '/' + sub + '/' + subId;
                    return {
                      id: subId,
                      _path: sp,
                    };
                  },
                };
              },
              _path: path,
            };
          },
        };
      },
      async runTransaction(fn) {
        const pending = [];
        const tx = {
          async get(ref) {
            const p = ref._path;
            if (p.startsWith('users/') && !p.includes('/ledger/')) {
              return makeSnap(store.users[ref.id]);
            }
            if (p.startsWith('iapReceipts/')) {
              return makeSnap(store.iapReceipts[ref.id]);
            }
            return makeSnap(null);
          },
          set(ref, data) {
            pending.push({ ref, data });
          },
        };
        const result = await fn(tx);
        for (const w of pending) {
          const p = w.ref._path;
          if (p.startsWith('iapReceipts/')) store.iapReceipts[w.ref.id] = Object.assign({}, w.data);
          else if (p.includes('/ledger/')) store.ledger[p] = Object.assign({}, w.data);
          else if (p.startsWith('users/')) {
            store.users[w.ref.id] = Object.assign({}, store.users[w.ref.id] || {}, w.data);
          }
        }
        return result;
      },
    };

    const FieldValue = {
      serverTimestamp: () => ({ _sv: true }),
    };

    const verify = vi.fn(async () => ({
      packageName: 'com.tileblast.game',
      data: { purchaseState: 0 },
    }));

    const first = await runConfirmIapPurchase({
      uid: 'user-a',
      data: { productId: 'coins500', purchaseToken: 'tok-abc' },
      db,
      FieldValue,
      verify,
      credentials: { client_email: 'x@y.z', private_key: 'x' },
    });
    expect(first.granted).toBe(true);
    expect(first.coins).toBe(500);
    expect(verify).toHaveBeenCalledTimes(1);

    const second = await runConfirmIapPurchase({
      uid: 'user-a',
      data: { productId: 'coins500', purchaseToken: 'tok-abc' },
      db,
      FieldValue,
      verify,
      credentials: { client_email: 'x@y.z', private_key: 'x' },
    });
    expect(second.granted).toBe(false);
    expect(second.reason).toBe('duplicate');
    expect(second.coins).toBe(500);
    expect(store.users['user-a'].coins).toBe(500);
  });

  it('lança already-exists se token já vinculado a outro uid', async () => {
    const { runConfirmIapPurchase, receiptDocId } = require('../../functions/confirm-iap.js');
    const rid = receiptDocId('tok-stolen');
    const store = {
      users: { 'user-b': { coins: 10 } },
      iapReceipts: { [rid]: { uid: 'user-a', productId: 'coins500' } },
    };
    const db = {
      collection(name) {
        return {
          doc(id) {
            const path = name + '/' + id;
            return {
              id,
              collection(sub) {
                return {
                  doc(subId) {
                    return { id: subId, _path: path + '/' + sub + '/' + subId };
                  },
                };
              },
              _path: path,
            };
          },
        };
      },
      async runTransaction(fn) {
        const tx = {
          async get(ref) {
            if (ref._path.startsWith('iapReceipts/')) {
              return { exists: !!store.iapReceipts[ref.id], data: () => store.iapReceipts[ref.id] };
            }
            return {
              exists: !!store.users[ref.id],
              data: () => store.users[ref.id],
            };
          },
          set() {},
        };
        return fn(tx);
      },
    };
    await expect(
      runConfirmIapPurchase({
        uid: 'user-b',
        data: { productId: 'coins500', purchaseToken: 'tok-stolen' },
        db,
        FieldValue: { serverTimestamp: () => null },
        verify: async () => ({ data: { purchaseState: 0 }, packageName: 'com.tileblast.game' }),
        credentials: { client_email: 'x' },
      })
    ).rejects.toMatchObject({ code: 'already-exists' });
  });
});
