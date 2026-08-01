import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

describe('retencao: streak de login com congelamento de 1 dia', () => {
  let streak;
  beforeEach(() => {
    createMinimalDom();
    mountRoadmap();
    streak = TBRoadmap.computeLoginStreak;
  });

  it('primeiro login inicia em 1', () => {
    expect(streak(0, 100, 0)).toBe(1);
  });

  it('dia consecutivo soma 1', () => {
    expect(streak(99, 100, 5)).toBe(6);
  });

  it('perder exatamente 1 dia CONGELA a sequencia (nao zera)', () => {
    expect(streak(98, 100, 5)).toBe(5); // gap de 2 dias = 1 dia perdido
  });

  it('perder 2+ dias zera para 1', () => {
    expect(streak(97, 100, 5)).toBe(1);
    expect(streak(90, 100, 12)).toBe(1);
  });

  it('mesmo dia / relogio atrasado mantem a sequencia', () => {
    expect(streak(100, 100, 5)).toBe(5);
    expect(streak(101, 100, 5)).toBe(5);
  });

  it('congelamento nunca deixa a sequencia abaixo de 1', () => {
    expect(streak(98, 100, 0)).toBe(1);
  });
});

describe('retencao: changelog fora do 1o caminho', () => {
  beforeEach(() => {
    createMinimalDom();
    mountModule('tb-analytics.js');
    mountModule('tb-retention.js');
    globalThis.APP_VERSION = '1.4.8';
  });

  it('hasWonAnyLevel e false sem progresso', () => {
    expect(TBRetention.hasWonAnyLevel({})).toBe(false);
    expect(TBRetention.hasWonAnyLevel({ unlocked: 0, stars: {} })).toBe(false);
  });

  it('hasWonAnyLevel e true com unlocked ou stars', () => {
    expect(TBRetention.hasWonAnyLevel({ unlocked: 1 })).toBe(true);
    expect(TBRetention.hasWonAnyLevel({ stars: { 0: 2 } })).toBe(true);
  });

  it('showChangelogIfNeeded nao abre modal antes da 1a vitoria', () => {
    let save = { unlocked: 0, stars: {} };
    const showGlobalModal = vi.fn();
    TBRetention.init({
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      showGlobalModal,
      closeGlobalModal: vi.fn(),
    });
    TBRetention.showChangelogIfNeeded();
    expect(showGlobalModal).not.toHaveBeenCalled();
  });

  it('showChangelogIfNeeded abre apos progresso', () => {
    let save = { unlocked: 1, stars: { 0: 1 } };
    const showGlobalModal = vi.fn();
    TBRetention.init({
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      showGlobalModal,
      closeGlobalModal: vi.fn(),
    });
    TBRetention.showChangelogIfNeeded();
    expect(showGlobalModal).toHaveBeenCalled();
    expect(showGlobalModal.mock.calls[0][0]).toMatch(/Novidades|What's new|Novedades|whats_new/i);
  });
});

describe('retencao: bonus semanal do login diario (marco entrega bonus real)', () => {
  let reward;
  beforeEach(() => {
    createMinimalDom();
    mountRoadmap();
    reward = TBRoadmap.computeLoginReward;
  });
  const R = [10, 15, 20, 25, 30, 40, 100];

  it('dia normal paga a recompensa base', () => {
    expect(reward(1, R).coins).toBe(10);
    expect(reward(3, R).coins).toBe(20);
    expect(reward(1, R).isWeek).toBe(false);
  });

  it('marco de 7 dias DOBRA (o "Bonus especial!" que a UI promete)', () => {
    expect(reward(7, R).isWeek).toBe(true);
    expect(reward(7, R).coins).toBe(200); // rewards[6] * 2
    expect(reward(14, R).coins).toBe(200); // proximo marco tambem
  });

  it('dia 8+ nao-marco fica no teto base, sem bonus', () => {
    expect(reward(8, R).isWeek).toBe(false);
    expect(reward(8, R).coins).toBe(100);
  });

  it('robusto a streak 0 e rewards vazio', () => {
    expect(reward(0, R).coins).toBe(10);
    expect(() => reward(5, [])).not.toThrow();
    expect(reward(5, []).coins).toBeGreaterThan(0);
  });
});
