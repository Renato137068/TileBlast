import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

describe('TBConfig', () => {
  it('expõe window.TBConfig com os valores canônicos do jogo', () => {
    createMinimalDom();
    mountModule('tb-config.js');
    expect(typeof TBConfig).toBe('object');
    // Tabuleiro / pontuação
    expect(TBConfig.GW).toBe(8);
    expect(TBConfig.GH).toBe(8);
    expect(TBConfig.TC).toBe(6);
    expect(TBConfig.PPB).toBe(10);
    expect(TBConfig.CMT).toBe(5);
    expect(TBConfig.CMM).toBe(1.5);
    expect(TBConfig.CHT).toBe(8);
    expect(TBConfig.CHM).toBe(2.0);
    // Thresholds de especiais
    expect(TBConfig.BOMB_T).toBe(4);
    expect(TBConfig.ROCKET_T).toBe(6);
    expect(TBConfig.RAINBOW_T).toBe(8);
    // Enum
    expect(TBConfig.SP).toEqual({ NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 });
    // Economia / XP / baús
    expect(TBConfig.COINS_STAR).toEqual([0, 20, 35, 55]);
    expect(TBConfig.XP_DEFS.win).toEqual([0, 20, 35, 50]);
    expect(TBConfig.XP_SAVE_KEY).toBe('xp');
    expect(TBConfig.CHEST_SLOTS).toBe(4);
    expect(TBConfig.CHEST_SAVE_KEY).toBe('chests');
    expect(TBConfig.EVENT_DURATION_MS).toBe(3 * 24 * 3600 * 1000);
  });

  it('é imutável (congelado)', () => {
    createMinimalDom();
    mountModule('tb-config.js');
    expect(Object.isFrozen(TBConfig)).toBe(true);
    expect(Object.isFrozen(TBConfig.SP)).toBe(true);
    const prev = TBConfig.GW;
    try {
      TBConfig.GW = 999;
    } catch (e) {
      /* strict mode pode lançar */
    }
    expect(TBConfig.GW).toBe(prev);
  });
});
