import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createMockConfig } from '../helpers/mock-config.js';
import { mountModule, projectRoot, mountRoadmap } from '../helpers/load-module.js';

describe('TBRoadmap i18n', () => {
  it('traduz chaves em PT, EN e ES', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);

    cfg.sv({ ...cfg.ld(), lang: 'pt' });
    expect(TBRoadmap.t('play')).toBe('Jogar');

    cfg.sv({ ...cfg.ld(), lang: 'en' });
    expect(TBRoadmap.t('play')).toBe('Play');

    cfg.sv({ ...cfg.ld(), lang: 'es' });
    expect(TBRoadmap.t('play')).toBe('Jugar');
  });

  it('isReady fica true após init', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    expect(TBRoadmap.isReady()).toBe(false);
    TBRoadmap.init(cfg);
    expect(TBRoadmap.isReady()).toBe(true);
  });
});

describe('TBRoadmap appendMasterLevels', () => {
  it('adiciona 10 fases lendárias (50 → 60)', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    expect(cfg.LEVELS).toHaveLength(50);
    TBRoadmap.init(cfg);
    expect(cfg.LEVELS).toHaveLength(60);
    expect(cfg.LEVELS[50].world).toBe('👑 Lendário');
    expect(cfg.LEVELS[50].name).toBe('Ascensão');
    expect(cfg.LEVELS[59].name).toBe('TILE MASTER 👑');
    expect(cfg.LEVELS[59].objectives).toHaveLength(4);
  });

  it('não duplica fases lendárias', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    const len = cfg.LEVELS.length;
    TBRoadmap.init(cfg);
    expect(cfg.LEVELS.length).toBe(len);
  });
});

describe('TBRoadmap checkDailyLoginReward', () => {
  it('concede 10 moedas no primeiro login do dia', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    TBRoadmap.checkDailyLoginReward();
    expect(cfg.getCoins()).toBe(10);
    expect(cfg.ld().loginStreak).toBe(1);
  });

  it('não concede duas vezes no mesmo dia', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    TBRoadmap.checkDailyLoginReward();
    TBRoadmap.checkDailyLoginReward();
    expect(cfg.getCoins()).toBe(10);
  });

  it('colorName traduz cores', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    cfg.sv({ ...cfg.ld(), lang: 'en' });
    expect(TBRoadmap.colorName(0)).toBe('red');
    expect(TBRoadmap.colorName(1)).toBe('blue');
  });

  it('não concede daily login duas vezes no mesmo dia', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    TBRoadmap.checkDailyLoginReward();
    const coins = cfg.getCoins();
    TBRoadmap.checkDailyLoginReward();
    expect(cfg.getCoins()).toBe(coins);
  });

  it('fallback interstitialEvery usa 5 vitórias', () => {
    const src = readFileSync(join(projectRoot, 'tb-offers.js'), 'utf8');
    expect(src).toContain('cfg.interstitialEvery || 5');
    expect(src).not.toContain('cfg.interstitialEvery || 3');
  });
});
