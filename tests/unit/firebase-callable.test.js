import { beforeEach, describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('TBFirebase callables — fallback gracioso', () => {
  beforeEach(() => {
    localStorage.clear();
    delete globalThis.FIREBASE_CONFIG;
    delete globalThis.TBFirebase;
    delete globalThis.firebase;
    mountModule('tb-firebase.js');
  });

  it('callFunction sem config retorna ok:false (não lança)', async () => {
    const res = await TBFirebase.callFunction('grantAdReward', { kind: 'coins' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('no_config');
  });

  it('enqueueCallable grava fila local com requestId', () => {
    const r = TBFirebase.enqueueCallable('grantAdReward', { kind: 'coins' });
    expect(r.ok).toBe(true);
    expect(r.requestId).toBeTruthy();
    const raw = localStorage.getItem('tb_callable_queue');
    const q = JSON.parse(raw);
    expect(q).toHaveLength(1);
    expect(q[0].name).toBe('grantAdReward');
    expect(q[0].data.requestId).toBe(r.requestId);
  });

  it('flushCallableQueue sem config não apaga a fila', async () => {
    TBFirebase.enqueueCallable('grantAdReward', { kind: 'coins' });
    const flush = await TBFirebase.flushCallableQueue();
    expect(flush.ok).toBe(false);
    expect(flush.reason).toBe('no_config');
    expect(JSON.parse(localStorage.getItem('tb_callable_queue'))).toHaveLength(1);
  });

  it('queueAdGrantShadow não lança sem config', () => {
    expect(() => TBFirebase.queueAdGrantShadow('coins')).not.toThrow();
    expect(JSON.parse(localStorage.getItem('tb_callable_queue') || '[]').length).toBeGreaterThan(0);
  });

  it('queueIapConfirm enfileira confirmIapPurchase sem travar', () => {
    localStorage.clear();
    const r = TBFirebase.queueIapConfirm('coins500', 'tok-xyz');
    expect(r.ok).toBe(true);
    const q = JSON.parse(localStorage.getItem('tb_callable_queue'));
    expect(q.some((x) => x.name === 'confirmIapPurchase')).toBe(true);
    expect(q.find((x) => x.name === 'confirmIapPurchase').data.purchaseToken).toBe('tok-xyz');
  });

  it('queueIapConfirm sem token retorna bad_args', () => {
    expect(TBFirebase.queueIapConfirm('coins500', '')).toEqual({ ok: false, reason: 'bad_args' });
  });
});
