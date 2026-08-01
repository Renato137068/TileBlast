import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createMockConfig } from '../helpers/mock-config.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

describe('fases lendárias 51–60', () => {
  it('progressão de dificuldade coerente', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    const legendary = cfg.LEVELS.slice(-10);
    expect(legendary).toHaveLength(10);
    legendary.forEach((lv, i) => {
      expect(lv.moves).toBeGreaterThanOrEqual(13);
      expect(lv.moves).toBeLessThanOrEqual(30);
      expect(lv.objectives.length).toBeGreaterThan(0);
      lv.objectives.forEach((o) => {
        // Fases lendarias multiobjetivo podem ter score menor quando combinam obstaculos.
        if (o.type === 'score') expect(o.target).toBeGreaterThanOrEqual(3000);
        if (o.type === 'color') expect(o.target).toBeGreaterThanOrEqual(25);
        if (['ice', 'crate', 'collect', 'cover', 'chain'].includes(o.type))
          expect(o.target).toBeGreaterThan(0);
      });
      if (i === 9) {
        const scoreObj = lv.objectives.find((o) => o.type === 'score');
        expect(scoreObj?.target).toBe(6500);
      }
    });
  });
});
