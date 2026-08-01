import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createMockConfig } from '../helpers/mock-config.js';
import { loadBaseLevelsFromHtml, readAppVersion } from '../helpers/levels-fixture.js';
import { mountModule, projectRoot, mountRoadmap } from '../helpers/load-module.js';

describe('dados das 50 fases base', () => {
  const levels = loadBaseLevelsFromHtml();

  it('são exatamente 75 fases base (Jardim expandido + Mundo 6 Cristal)', () => {
    expect(levels).toHaveLength(75);
  });

  it('cada fase tem movimentos e objetivos válidos', () => {
    levels.forEach((lv, i) => {
      expect(lv.world, `fase ${i + 1}`).toBeTruthy();
      expect(lv.name, `fase ${i + 1}`).toBeTruthy();
      expect(lv.moves, `fase ${i + 1}`).toBeGreaterThanOrEqual(10);
      expect(lv.moves, `fase ${i + 1}`).toBeLessThanOrEqual(35);
      expect(lv.objectives.length, `fase ${i + 1}`).toBeGreaterThan(0);
      lv.objectives.forEach((o) => {
        if (o.type === 'score') expect(o.target).toBeGreaterThan(0);
        if (o.type === 'color') {
          expect(o.color).toBeGreaterThanOrEqual(0);
          expect(o.color).toBeLessThanOrEqual(5);
          expect(o.target).toBeGreaterThan(0);
        }
        if (['ice', 'crate', 'collect', 'cover'].includes(o.type)) {
          expect(o.target, `fase ${i + 1}`).toBeGreaterThan(0);
        }
      });
    });
  });

  it('metas de score sobem ao longo dos mundos', () => {
    const w1 = levels[0].objectives.find((o) => o.type === 'score')?.target ?? 0;
    const w5 = levels[54].objectives.find((o) => o.type === 'score')?.target ?? 0;
    expect(w5).toBeGreaterThan(w1);
  });

  it('cada mundo estreia uma mecanica de obstaculo (#3)', () => {
    const hasType = (lo, hi, type) =>
      levels.slice(lo, hi).some((lv) => lv.objectives.some((o) => o.type === type));
    expect(hasType(15, 25, 'ice')).toBe(true);
    expect(hasType(25, 35, 'crate')).toBe(true);
    expect(hasType(35, 45, 'collect')).toBe(true);
    expect(hasType(45, 55, 'cover')).toBe(true);
    expect(hasType(55, 75, 'chain')).toBe(true); // Cristal estreia corrente
  });

  it('fase 55 é o chefão final do inferno', () => {
    expect(levels[54].world).toBe('🔥 Inferno');
    expect(levels[54].name).toContain('👑');
    expect(levels[54].objectives.length).toBeGreaterThanOrEqual(3);
  });
});

describe('changelog vs APP_VERSION', () => {
  it('tb-retention.js documenta a versão atual', () => {
    const ver = readAppVersion();
    const retention = readFileSync(join(projectRoot, 'tb-retention.js'), 'utf8');
    expect(retention).toContain(`v: '${ver}'`);
  });
});

describe('boot com TBLogic', () => {
  it('TBLogic disponível após boot dos módulos principais', () => {
    createMinimalDom();
    mountModule('tb-game-logic.js');
    mountRoadmap();
    mountModule('tb-features.js');
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    TBFeatures.init({
      ld: cfg.ld,
      sv: cfg.sv,
      getCoins: cfg.getCoins,
      addCoins: cfg.addCoins,
      getUnlocked: cfg.getUnlocked,
      getLives: cfg.getLives,
      showGlobalModal: cfg.showGlobalModal,
      closeGlobalModal: cfg.closeGlobalModal,
      showToast: cfg.showToast,
      startGame: cfg.startGame,
      LEVELS: cfg.LEVELS,
      requestDraw: cfg.requestDraw,
      Sound: { click: () => {} },
      checkAchievements: cfg.checkAchievements,
    });
    expect(TBLogic.checkObjectives([{ type: 'score', target: 100 }], 100, {})).toBe(true);
    expect(cfg.LEVELS).toHaveLength(60);
  });
});
