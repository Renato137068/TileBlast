import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function mountChests() {
  mountModule('tb-config.js');
  mountModule('tb-chests.js');
  return globalThis.TBChests;
}

describe('tb-chests', () => {
  /** @type {any} */
  let CH;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    delete globalThis.TBChests;
    delete globalThis.TBJuice;
    delete globalThis.getActiveEvent;
    delete globalThis.tryDropCollFromChest;
    delete globalThis._locChestLabel;
    delete globalThis._locCollName;
    document.body.innerHTML = `<div id="chest-bar"></div>`;
    save = {};
    globalThis.XP_DEFS = {
      chest: { bronze: 10, silver: 25, gold: 50, epic: 75, legendary: 150 },
    };
    globalThis.addXP = vi.fn();
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      _t: (_k, f) => f,
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      addCoins: vi.fn(),
      addPU: vi.fn(),
      checkAchievements: vi.fn(),
      hasNoAds: () => false,
      showRewardedAd: vi.fn((onReward) => onReward()),
      Sound: { chest: vi.fn(), click: vi.fn() },
      PU_DEFS: [
        { id: 'bomb', label: 'Bomba' },
        { id: 'rainbow', label: 'Arco-íris' },
        { id: 'moves', label: 'Movimentos' },
        { id: 'shuffle', label: 'Embaralhar' },
      ],
    };
    CH = mountChests();
    CH.init(cfg);
  });

  it('getChests cria 4 slots vazios e persiste', () => {
    const chests = CH.getChests();
    expect(chests).toHaveLength(4);
    expect(chests.every((c) => c === null)).toBe(true);
    expect(save.chests).toHaveLength(4);
  });

  it('addChest ocupa o primeiro slot livre e renderiza a barra', () => {
    expect(CH.addChest('bronze')).toBe(true);
    expect(CH.getChests()[0].tier).toBe('bronze');
    expect(CH.getChests()[1]).toBeNull();
    expect(document.querySelectorAll('#chest-bar .chest-slot')).toHaveLength(4);
    expect(document.getElementById('chest-bar').innerHTML).toContain('chest-empty');
  });

  it('addChest retorna false quando todos os slots estão cheios', () => {
    for (let i = 0; i < 4; i++) expect(CH.addChest('silver')).toBe(true);
    expect(CH.addChest('gold')).toBe(false);
    expect(CH.getChests().filter(Boolean)).toHaveLength(4);
  });

  it('startChestUnlock inicia o timer e mostra toast', () => {
    CH.addChest('bronze');
    CH.startChestUnlock(0);
    const slot = CH.getChests()[0];
    expect(slot.unlockedAt).toBeGreaterThan(0);
    expect(slot.openableAt).toBeGreaterThan(Date.now());
    expect(cfg.showToast).toHaveBeenCalled();
    expect(document.getElementById('chest-bar').innerHTML).toContain('chest-unlocking');
  });

  it('apenas um baú abre por vez', () => {
    CH.addChest('bronze');
    CH.addChest('silver');
    CH.startChestUnlock(0);
    CH.startChestUnlock(1);
    expect(CH.getChests()[1].unlockedAt).toBeNull();
    expect(cfg.showToast).toHaveBeenCalledWith('⏳', expect.any(String), expect.any(String));
  });

  it('tickChestTimers formata o tempo restante no slot', () => {
    CH.addChest('gold');
    CH.startChestUnlock(0);
    CH.tickChestTimers();
    const el = document.getElementById('ct-0');
    expect(el).toBeTruthy();
    expect(el.textContent).toMatch(/^\d+h \d{2}m$/);
  });

  it('skipChestFree + openChest entrega moedas, power-ups e XP', () => {
    CH.addChest('bronze');
    CH.startChestUnlock(0);
    CH.skipChestFree(0);
    expect(cfg.showGlobalModal).toHaveBeenCalled();

    CH.openChest(0);
    expect(cfg.Sound.chest).toHaveBeenCalled();
    expect(cfg.addCoins).toHaveBeenCalledWith(expect.any(Number));
    expect(cfg.addCoins.mock.calls[0][0]).toBeGreaterThanOrEqual(50);
    expect(cfg.addPU).toHaveBeenCalled();
    expect(globalThis.addXP).toHaveBeenCalledWith(10);
    expect(CH.getChests()[0]).toBeNull();
  });

  it('openChest ignora baú que ainda não está pronto', () => {
    CH.addChest('legendary');
    CH.startChestUnlock(0);
    CH.openChest(0);
    expect(cfg.addCoins).not.toHaveBeenCalled();
    expect(CH.getChests()[0]).not.toBeNull();
  });
});
