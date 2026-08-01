import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function makeCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
  };
}

describe('tb-juice', () => {
  /** @type {any} */
  let J;
  let reduceMotion;

  beforeEach(() => {
    delete globalThis.TBJuice;
    document.body.innerHTML = '';
    reduceMotion = false;
    mountModule('tb-juice.js');
    J = globalThis.TBJuice;
    J.init({ reduceMotion: () => reduceMotion });
  });

  it('init devolve a API e setCell aceita tamanho de célula', () => {
    expect(typeof J.init).toBe('function');
    expect(J.init({})).toBe(J);
    expect(J.isLowPower()).toBe(false);
    J.setCell(60);
    J.setCell(-5);
    expect(J.active(performance.now())).toBe(false);
  });

  it('setLowPower liga o modo de baixa potência', () => {
    J.setLowPower(true);
    expect(J.isLowPower()).toBe(true);
    J.setLowPower(false);
    expect(J.isLowPower()).toBe(false);
  });

  it('shake respeita reduceMotion', () => {
    reduceMotion = true;
    J.shake(12, 300);
    expect(J.getShake(performance.now())).toBeNull();

    reduceMotion = false;
    J.shake(12, 300, { rot: 2 });
    const s = J.getShake(performance.now());
    expect(s).not.toBeNull();
    expect(typeof s.x).toBe('number');
    expect(typeof s.y).toBe('number');
    expect(Math.abs(s.x)).toBeLessThanOrEqual(12);
    expect(J.getShake(performance.now() + 5000)).toBeNull();
  });

  it('burst/confettiBurst enfileiram partículas e reset limpa tudo', () => {
    const now = performance.now();
    expect(J.active(now)).toBe(false);
    J.burst(20, 20, { intensity: 0.9, color: '#ef4b5f' });
    J.confettiBurst(30, 30, { count: 10 });
    J.shockwave(10, 10, { intensity: 0.8 });
    expect(J.active(now)).toBe(true);

    J.reset();
    expect(J.active(now)).toBe(false);
  });

  it('nada é emitido com reduceMotion ativo', () => {
    reduceMotion = true;
    J.burst(10, 10, {});
    J.confettiBurst(10, 10, {});
    J.shockwave(10, 10, {});
    J.flash('#fff', 0.5, 200);
    expect(J.active(performance.now())).toBe(false);
  });

  it('flash desenha o retângulo do board no render', () => {
    const ctx = makeCtx();
    J.flash('#fff', 0.5, 500);
    J.render(ctx, performance.now(), 400);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 400);
  });

  it('render desenha partículas e shockwaves sem erro', () => {
    const ctx = makeCtx();
    J.burst(20, 20, { intensity: 0.9 });
    J.confettiBurst(25, 25, { count: 6 });
    J.shockwave(20, 20, { intensity: 0.8 });
    J.render(ctx, performance.now(), 320);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.createRadialGradient).toHaveBeenCalled();

    // Depois da duração máxima tudo é descartado
    J.render(ctx, performance.now() + 60000, 320);
    expect(J.active(performance.now() + 60000)).toBe(false);
  });

  it('hitStop congela por um curto período', () => {
    J.hitStop(60);
    expect(J.isFrozen(performance.now())).toBe(true);
    expect(J.isFrozen(performance.now() + 500)).toBe(false);

    J.reset();
    reduceMotion = true;
    J.hitStop(60);
    expect(J.isFrozen(performance.now())).toBe(false);
  });

  it('coinFly sem elemento-alvo executa callbacks imediatamente', () => {
    const onEach = vi.fn();
    const onDone = vi.fn();
    J.coinFly({ x: 0, y: 0 }, null, { count: 3, onEach, onDone });
    expect(onEach).toHaveBeenCalledTimes(3);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('ease expõe curvas normalizadas e tick não quebra', () => {
    expect(J.ease.linear(0.5)).toBe(0.5);
    expect(J.ease.outCubic(0)).toBe(0);
    expect(J.ease.outCubic(1)).toBe(1);
    expect(J.ease.outBounce(1)).toBeCloseTo(1, 5);
    expect(J.ease.outElastic(0)).toBe(0);

    J.tick(0);
    J.tick(16);
    J.tick(2000);
    expect(typeof J.isLowPower()).toBe('boolean');
  });
});
