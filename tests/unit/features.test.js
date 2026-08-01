import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createFeaturesConfig, createMockConfig } from '../helpers/mock-config.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

describe('TBFeatures', () => {
  it('isColorBlind retorna false antes e depois do init', () => {
    createMinimalDom();
    mountModule('tb-features.js');
    expect(TBFeatures.isColorBlind()).toBe(false);
    const base = createMockConfig();
    TBFeatures.init(createFeaturesConfig(base));
    expect(TBFeatures.isColorBlind()).toBe(false);
  });

  it('toggleColorBlind persiste no save', () => {
    createMinimalDom();
    mountRoadmap();
    mountModule('tb-features.js');
    const base = createMockConfig();
    TBRoadmap.init(base);
    TBFeatures.init(createFeaturesConfig(base));
    TBFeatures.toggleColorBlind();
    expect(base.ld().colorBlind).toBe(true);
    expect(TBFeatures.isColorBlind()).toBe(true);
  });

  it('updateColorBlindUI não lança antes do init', () => {
    createMinimalDom();
    mountModule('tb-features.js');
    expect(() => TBFeatures.updateColorBlindUI()).not.toThrow();
  });

  it('missionLabel substitui {n}', () => {
    createMinimalDom();
    mountRoadmap();
    mountModule('tb-features.js');
    const base = createMockConfig();
    TBRoadmap.init(base);
    TBFeatures.init(createFeaturesConfig(base));
    const label = TBFeatures.missionLabel({ type: 'blocks_popped', target: 40 });
    expect(label).toContain('40');
  });
});
