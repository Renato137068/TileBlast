import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createMockConfig } from '../helpers/mock-config.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

describe('tb-roadmap', () => {
  it('init + isReady + t()', () => {
    createMinimalDom();
    mountRoadmap(); // carrega tb-i18n → … → tb-roadmap.js
    mountModule('tb-roadmap.js'); // vínculo explícito no inventário
    const cfg = createMockConfig();
    expect(TBRoadmap.isReady()).toBe(false);
    TBRoadmap.init(cfg);
    expect(TBRoadmap.isReady()).toBe(true);
    expect(typeof TBRoadmap.t('play')).toBe('string');
  });
});
