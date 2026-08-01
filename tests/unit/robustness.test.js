import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

describe('robustez: remoteConfig antes do init nao quebra', () => {
  it('TBRoadmap.remoteConfig() sem init retorna defaults sem lancar', () => {
    createMinimalDom();
    mountRoadmap(); // NAO chama init -> C permanece null
    expect(() => TBRoadmap.remoteConfig()).not.toThrow();
    const rc = TBRoadmap.remoteConfig();
    expect(rc).toBeTypeOf('object');
    expect(rc.adDailyLimit).toBeGreaterThan(0); // usa os defaults embutidos
  });
});
