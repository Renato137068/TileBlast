import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function mountXp() {
  mountModule('tb-config.js');
  mountModule('tb-game-logic.js');
  mountModule('tb-xp.js');
  return globalThis.TBXp;
}

describe('tb-xp', () => {
  /** @type {any} */
  let X;
  /** @type {any} */
  let save;

  beforeEach(() => {
    delete globalThis.TBXp;
    delete globalThis.getActiveEvent;
    delete globalThis.checkLevelCollUnlocks;
    document.body.innerHTML = `
      <div id="xp-fill"></div>
      <div id="xp-label"></div>
      <div id="xp-total"></div>
      <div id="levelup-overlay"><div id="levelup-num"></div><button id="levelup-ok"></button></div>
    `;
    X = mountXp();
    save = { xp: 0 };
    globalThis.getActiveEvent = () => ({ xpMult: 1 });
    X.init({
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      _t: (_k, f) => f,
      _reduceMotion: () => true,
      showToast: vi.fn(),
      spawnConfetti: vi.fn(),
      Sound: { levelUp: vi.fn() },
      Haptic: { heavy: vi.fn() },
    });
  });

  it('getXP inicializa em 0 e addXP acumula', () => {
    expect(X.getXP()).toBe(0);
    X.addXP(50);
    expect(X.getXP()).toBe(50);
  });

  it('addXP aplica multiplicador do evento ativo', () => {
    globalThis.getActiveEvent = () => ({ xpMult: 2 });
    X.addXP(40);
    expect(X.getXP()).toBe(80);
  });

  it('ignora amount inválido', () => {
    X.addXP(0);
    X.addXP(-10);
    expect(X.getXP()).toBe(0);
  });

  it('renderXPBar atualiza DOM', () => {
    X.addXP(30);
    X.renderXPBar();
    expect(document.getElementById('xp-label').textContent).toContain('Nv.');
    expect(document.getElementById('xp-fill').style.width).toMatch(/%$/);
  });

  it('level-up dispara checkLevelCollUnlocks', () => {
    const unlock = vi.fn();
    globalThis.checkLevelCollUnlocks = unlock;
    // XP suficiente para subir vários níveis de uma vez
    X.addXP(5000);
    expect(unlock).toHaveBeenCalled();
  });
});
