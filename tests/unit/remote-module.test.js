import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const CACHE_KEY = 'tb_remote_cfg';

describe('tb-remote', () => {
  /** @type {any} */
  let R;
  /** @type {any} */
  let save;
  /** @type {any} */
  let fb;
  /** @type {any} */
  let ld;
  /** @type {any} */
  let sv;

  beforeEach(() => {
    delete globalThis.TBRemote;
    delete globalThis.firebase;
    save = {};
    ld = () => save;
    sv = vi.fn((s) => {
      save = s;
    });
    fb = {
      configValid: vi.fn(() => false),
      boot: vi.fn(async () => false),
    };
    globalThis.TBFirebase = fb;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));
    // `fetch` e `TBFirebase` são identificadores livres dentro do módulo:
    // precisam existir no sandbox do vm, não só em globalThis.
    mountModule('tb-remote.js', {
      fetch: (...args) => globalThis.fetch(...args),
      TBFirebase: fb,
    });
    R = globalThis.TBRemote;
  });

  it('expõe DEFAULTS congelável com as chaves de economia', () => {
    expect(R.DEFAULTS.adDailyLimit).toBe(5);
    expect(R.DEFAULTS.coinMult).toBe(1);
    expect(R.DEFAULTS.dynamicOffersEnabled).toBe(true);
  });

  it('load busca o JSON remoto, mescla com DEFAULTS e persiste', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ coinMult: 2, flashCoins: 1500 }),
    }));

    const cfg = await R.load(ld, sv);
    expect(cfg.coinMult).toBe(2);
    expect(cfg.flashCoins).toBe(1500);
    expect(cfg.adDailyLimit).toBe(5);
    expect(save.remoteCfg).toEqual(cfg);
    expect(save._remoteCfgCache.data).toEqual(cfg);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)).coinMult).toBe(2);
  });

  it('usa o cache fresco sem tocar na rede', async () => {
    save._remoteCfgCache = { at: Date.now(), data: { coinMult: 3 } };
    const cfg = await R.load(ld, sv);
    expect(cfg.coinMult).toBe(3);
    expect(cfg.piggyCap).toBe(500);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('refaz o fetch quando o cache expirou', async () => {
    save._remoteCfgCache = { at: Date.now() - 7200000, data: { coinMult: 3 } };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ coinMult: 4 }),
    }));

    const cfg = await R.load(ld, sv);
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(cfg.coinMult).toBe(4);
  });

  it('cai no localStorage quando o fetch falha', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ flashCoins: 999 }));
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));

    const cfg = await R.load(ld, sv);
    expect(cfg.flashCoins).toBe(999);
    expect(cfg.adDailyLimit).toBe(5);
  });

  it('devolve apenas os DEFAULTS quando não há rede nem cache', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline');
    });

    const cfg = await R.load(ld, sv);
    expect(cfg).toEqual(R.DEFAULTS);
    expect(sv).toHaveBeenCalled();
  });

  it('prioriza o Firestore quando disponível', async () => {
    fb.configValid.mockReturnValue(true);
    fb.boot.mockResolvedValue(true);
    globalThis.firebase = {
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: true, data: () => ({ coinMult: 5 }) }),
          }),
        }),
      }),
    };

    const cfg = await R.load(ld, sv);
    expect(cfg.coinMult).toBe(5);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
