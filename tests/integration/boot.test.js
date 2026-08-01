import { describe, expect, it } from 'vitest';
import { createFeaturesConfig, createMockConfig } from '../helpers/mock-config.js';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

function runBoot() {
  createMinimalDom();
  mountRoadmap();
  mountModule('tb-features.js');
  const cfg = createMockConfig();
  TBRoadmap.init(cfg);
  TBFeatures.init(createFeaturesConfig(cfg));
  return cfg;
}

describe('boot integration', () => {
  it('TBRoadmap → TBFeatures completa sem erro', () => {
    expect(() => runBoot()).not.toThrow();
    expect(TBRoadmap.isReady()).toBe(true);
    expect(TBFeatures.isReady()).toBe(true);
  });

  it('applyI18n + updateColorBlindUI após boot completo', () => {
    runBoot();
    expect(() => TBRoadmap.applyI18n()).not.toThrow();
    expect(() => TBFeatures.updateColorBlindUI()).not.toThrow();
  });

  it('TBFeatures.isColorBlind não lança quando TBRoadmap já iniciou', () => {
    runBoot();
    expect(() => TBFeatures.isColorBlind()).not.toThrow();
    expect(TBFeatures.isColorBlind()).toBe(false);
  });

  it('fases disponíveis após boot (mock)', () => {
    const cfg = runBoot();
    expect(cfg.LEVELS.length).toBe(60);
  });
});
