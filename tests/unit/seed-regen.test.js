import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('TBLogic.makeSeededRng (RNG determinístico)', () => {
  it('mesmo seed produz a mesma sequência', () => {
    mountModule('tb-game-logic.js');
    const a = TBLogic.makeSeededRng(1001);
    const b = TBLogic.makeSeededRng(1001);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('seeds diferentes divergem', () => {
    mountModule('tb-game-logic.js');
    const a = TBLogic.makeSeededRng(1);
    const b = TBLogic.makeSeededRng(2);
    expect(a()).not.toBe(b());
  });

  it('valores ficam no intervalo [0,1)', () => {
    mountModule('tb-game-logic.js');
    const r = TBLogic.makeSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('TBLogic.computeLifeRegen (regeneração de vidas)', () => {
  const MAX = 5;
  const REGEN = 30 * 60 * 1000; // 30 min

  it('vidas cheias limpam o timer', () => {
    mountModule('tb-game-logic.js');
    const r = TBLogic.computeLifeRegen({ lives: 5, lifeRegenAt: 123 }, 1000, MAX, REGEN);
    expect(r.lives).toBe(5);
    expect(r.lifeRegenAt).toBe(null);
    expect(r.changed).toBe(true);
  });

  it('inicia o timer quando falta vida e não há timer', () => {
    mountModule('tb-game-logic.js');
    const now = 9999;
    const r = TBLogic.computeLifeRegen({ lives: 2 }, now, MAX, REGEN);
    expect(r.lifeRegenAt).toBe(now);
    expect(r.changed).toBe(true);
    expect(r.lives).toBe(2);
  });

  it('não altera antes de completar um intervalo', () => {
    mountModule('tb-game-logic.js');
    const start = 1000;
    const r = TBLogic.computeLifeRegen(
      { lives: 2, lifeRegenAt: start },
      start + REGEN - 1,
      MAX,
      REGEN
    );
    expect(r.changed).toBe(false);
    expect(r.lives).toBe(2);
    expect(r.lifeRegenAt).toBe(start);
  });

  it('regenera N vidas conforme intervalos decorridos e avança o timer', () => {
    mountModule('tb-game-logic.js');
    const start = 0;
    const r = TBLogic.computeLifeRegen(
      { lives: 1, lifeRegenAt: start },
      start + REGEN * 2 + 5,
      MAX,
      REGEN
    );
    expect(r.lives).toBe(3);
    expect(r.lifeRegenAt).toBe(start + REGEN * 2);
    expect(r.changed).toBe(true);
  });

  it('ao encher, remove o timer (lifeRegenAt null)', () => {
    mountModule('tb-game-logic.js');
    const start = 0;
    const r = TBLogic.computeLifeRegen(
      { lives: 4, lifeRegenAt: start },
      start + REGEN * 10,
      MAX,
      REGEN
    );
    expect(r.lives).toBe(5);
    expect(r.lifeRegenAt).toBe(null);
    expect(r.changed).toBe(true);
  });
});

describe('TBLogic.msToNextLife (contagem regressiva)', () => {
  const REGEN = 30 * 60 * 1000;

  it('sem timer retorna o intervalo cheio', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.msToNextLife(null, 12345, REGEN)).toBe(REGEN);
  });

  it('logo após iniciar, falta quase o intervalo inteiro', () => {
    mountModule('tb-game-logic.js');
    const start = 1000;
    expect(TBLogic.msToNextLife(start, start + 1, REGEN)).toBe(REGEN - 1);
  });

  it('no meio do intervalo retorna o restante', () => {
    mountModule('tb-game-logic.js');
    const start = 0;
    expect(TBLogic.msToNextLife(start, REGEN * 1.5, REGEN)).toBe(REGEN / 2);
  });

  it('nunca retorna negativo', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.msToNextLife(0, REGEN * 3.25, REGEN)).toBeGreaterThanOrEqual(0);
    expect(TBLogic.msToNextLife(0, REGEN * 3.25, REGEN)).toBeLessThanOrEqual(REGEN);
  });
});

describe('TBLogic.rollPowerUp (sorteio de power-up)', () => {
  const OPTIONS = ['bomb', 'rainbow', 'moves', 'shuffle'];

  it('menos de 2 estrelas nunca dá prêmio', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.rollPowerUp(1, () => 0)).toBe(null);
    expect(TBLogic.rollPowerUp(0, () => 0)).toBe(null);
  });

  it('roll acima do limiar não dá prêmio', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.rollPowerUp(2, () => 0.9)).toBe(null);
    expect(TBLogic.rollPowerUp(3, () => 0.5)).toBe(null); // 0.5 > 0.35
  });

  it('roll dentro do limiar retorna uma opção válida', () => {
    mountModule('tb-game-logic.js');
    const id = TBLogic.rollPowerUp(3, () => 0.1);
    expect(OPTIONS).toContain(id);
  });

  it('3 estrelas têm limiar mais generoso que 2', () => {
    mountModule('tb-game-logic.js');
    // roll = 0.45: passa para 3★ (<=0.55? não, 0.45<0.55 sim) e para 2★ também.
    // roll = 0.5: 2★ passa (0.5<0.55) e dá prêmio; 3★ falha (0.5>0.35).
    expect(TBLogic.rollPowerUp(2, () => 0.5)).not.toBe(null);
    expect(TBLogic.rollPowerUp(3, () => 0.5)).toBe(null);
  });
});

describe('TBLogic.infiniteLevelParams (Modo Infinito)', () => {
  it('rodada 1 tem 20 movimentos e alvo 1200', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.infiniteLevelParams(1)).toEqual({ moves: 20, target: 1200 });
  });

  it('movimentos caem a cada 5 rodadas, com piso de 10', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.infiniteLevelParams(6).moves).toBe(19);
    expect(TBLogic.infiniteLevelParams(51).moves).toBe(10);
    expect(TBLogic.infiniteLevelParams(999).moves).toBe(10);
  });

  it('alvo cresce linearmente com a rodada', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.infiniteLevelParams(10).target).toBe(12000);
  });

  it('rodadas inválidas caem para 1', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.infiniteLevelParams(0)).toEqual({ moves: 20, target: 1200 });
    expect(TBLogic.infiniteLevelParams(-5)).toEqual({ moves: 20, target: 1200 });
  });
});

describe('TBLogic.formatMsClock', () => {
  it('formata m:ss com zero-padding', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.formatMsClock(0)).toBe('0:00');
    expect(TBLogic.formatMsClock(65000)).toBe('1:05');
    expect(TBLogic.formatMsClock(125000)).toBe('2:05');
  });

  it('nunca retorna negativo', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.formatMsClock(-1000)).toBe('0:00');
  });
});

describe('TBLogic.formatEvTime', () => {
  it('formata horas e minutos', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.formatEvTime(0)).toBe('0h 00m');
    expect(TBLogic.formatEvTime(3660000)).toBe('1h 01m');
    expect(TBLogic.formatEvTime(7200000)).toBe('2h 00m');
  });

  it('nunca retorna negativo', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.formatEvTime(-5000)).toBe('0h 00m');
  });
});

describe('TBLogic.localeTag', () => {
  it('mapeia pt/en/es para tags BCP-47', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.localeTag('pt')).toBe('pt-BR');
    expect(TBLogic.localeTag('en-US')).toBe('en-US');
    expect(TBLogic.localeTag('es')).toBe('es-ES');
    expect(TBLogic.localeTag(null)).toBe('pt-BR');
  });
});

describe('TBLogic.xpLevelInfo', () => {
  it('calcula nivel e progresso na barra', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.xpForLevel(1)).toBe(0);
    expect(TBLogic.xpForLevel(2)).toBe(150);
    expect(TBLogic.xpLevelInfo(0)).toMatchObject({ level: 1, current: 0, needed: 150 });
    expect(TBLogic.xpLevelInfo(150)).toMatchObject({ level: 2, current: 0 });
    expect(TBLogic.xpLevelInfo(200)).toMatchObject({ level: 2, current: 50, needed: 250 });
  });

  it('escala alem da tabela', () => {
    mountModule('tb-game-logic.js');
    // i=15: +6000+(15-14)*1500 = +7500
    expect(TBLogic.xpForLevel(16)).toBe(26000 + 7500);
    expect(TBLogic.xpLevelInfo(26000).level).toBe(15);
  });
});

describe('TBLogic.epochDay', () => {
  it('divide milissegundos por dia UTC', () => {
    mountModule('tb-game-logic.js');
    expect(TBLogic.epochDay(0)).toBe(0);
    expect(TBLogic.epochDay(86400000)).toBe(1);
    expect(TBLogic.epochDay(86400000 * 3 + 1000)).toBe(3);
  });
});

describe('TBLogic.localDateKey', () => {
  it('formata YYYY-MM-DD no calendario local', () => {
    mountModule('tb-game-logic.js');
    const d = new Date(2026, 6, 14); // Jul 14 (month 0-indexed)
    expect(TBLogic.localDateKey(d)).toBe('2026-07-14');
    const y = new Date(2026, 6, 14);
    expect(TBLogic.localYesterdayKey(y)).toBe('2026-07-13');
  });
});
