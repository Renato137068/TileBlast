import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('save layer (memória + localStorage)', () => {
  it('debounce grava após flush', async () => {
    mountModule('tb-game-logic.js');
    const save = TBLogic.createMemSave('tb_debounce');
    save.sv({ coins: 50 });
    expect(JSON.parse(localStorage.getItem('tb_debounce') || 'null')).toBeNull();
    save.flushSave();
    expect(JSON.parse(localStorage.getItem('tb_debounce')).coins).toBe(50);
  });

  it('getLives respeita máximo', () => {
    mountModule('tb-game-logic.js');
    const save = TBLogic.createMemSave('tb_lives', 5);
    save.sv({ lives: 99 });
    expect(save.getLives()).toBe(5);
  });

  it('ld recupera de JSON corrompido', () => {
    mountModule('tb-game-logic.js');
    localStorage.setItem('tb_corrupt', '{not json');
    const save = TBLogic.createMemSave('tb_corrupt');
    expect(save.ld()).toEqual({});
  });

  it('reset limpa cache e storage', () => {
    mountModule('tb-game-logic.js');
    const save = TBLogic.createMemSave('tb_reset');
    save.sv({ coins: 10 });
    save.flushSave();
    save.reset();
    expect(localStorage.getItem('tb_reset')).toBeNull();
    expect(save.ld()).toEqual({});
  });
});
