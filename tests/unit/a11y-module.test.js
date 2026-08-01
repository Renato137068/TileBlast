import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const SP = { NONE: 0, BOMB: 1, ROCKET: 2, RAINBOW: 3 };

function makeCfg(overrides = {}) {
  const grid = [
    [
      { type: 0, sp: SP.NONE },
      { type: 0, sp: SP.NONE },
    ],
    [
      { type: 2, sp: SP.NONE },
      { type: 1, sp: SP.BOMB },
    ],
  ];
  return {
    SP,
    grid,
    IS_TOUCH: false,
    kbFocus: { x: 0, y: 0, active: true },
    hoverCells: new Set(),
    hoverSz: 0,
    ok: (x, y) => x >= 0 && x < 2 && y >= 0 && y < 2,
    getGroup: () => [],
    requestDraw: vi.fn(),
    ...overrides,
  };
}

describe('tb-a11y', () => {
  /** @type {any} */
  let A;

  beforeEach(() => {
    delete globalThis.TBA11y;
    document.body.innerHTML = '<div id="board-status"></div>';
    mountModule('tb-a11y.js');
    A = globalThis.TBA11y;
  });

  it('announce escreve na live region', () => {
    A.init(makeCfg());
    A.announce('Nível concluído');
    expect(document.getElementById('board-status').textContent).toBe('Nível concluído');
  });

  it('announce sem live region não quebra', () => {
    document.body.innerHTML = '';
    A.init(makeCfg());
    expect(() => A.announce('oi')).not.toThrow();
  });

  it('_colorName cicla e aceita índices fora do intervalo', () => {
    A.init(makeCfg());
    expect(A._colorName(0)).toBe('vermelho');
    expect(A._colorName(A.COLOR_NAMES.length)).toBe('vermelho');
    expect(A._colorName(-1)).toBe(A.COLOR_NAMES[A.COLOR_NAMES.length - 1]);
  });

  it('describeCell descreve célula vazia fora do tabuleiro', () => {
    A.init(makeCfg());
    expect(A.describeCell(9, 9)).toContain('vazio');
  });

  it('describeCell nomeia blocos especiais', () => {
    A.init(makeCfg());
    expect(A.describeCell(1, 1)).toContain('bomba');
  });

  it('describeCell informa tamanho do grupo', () => {
    A.init(
      makeCfg({
        getGroup: () => [
          [0, 0],
          [0, 1],
          [1, 0],
        ],
      })
    );
    const txt = A.describeCell(0, 0);
    expect(txt).toContain('vermelho');
    expect(txt).toContain('grupo de 3');
  });

  it('describeCell sinaliza bloco sem par', () => {
    A.init(makeCfg({ getGroup: () => [[0, 0]] }));
    expect(A.describeCell(0, 0)).toContain('sem par');
  });

  it('syncKbHover preenche hover quando há grupo', () => {
    const cfg = makeCfg({
      getGroup: () => [
        [0, 0],
        [0, 1],
      ],
    });
    A.init(cfg);
    A.syncKbHover();
    expect(cfg.hoverSz).toBe(2);
    expect(cfg.hoverCells.has('0,1')).toBe(true);
    expect(cfg.requestDraw).toHaveBeenCalled();
  });

  it('syncKbHover limpa hover quando não há grupo', () => {
    const cfg = makeCfg({ getGroup: () => [[0, 0]], hoverSz: 5 });
    A.init(cfg);
    A.syncKbHover();
    expect(cfg.hoverSz).toBe(0);
    expect(cfg.hoverCells.size).toBe(0);
  });

  it('syncKbHover não roda em touch nem com foco inativo', () => {
    const touch = makeCfg({ IS_TOUCH: true });
    A.init(touch);
    A.syncKbHover();
    expect(touch.requestDraw).not.toHaveBeenCalled();

    const inactive = makeCfg({ kbFocus: { x: 0, y: 0, active: false } });
    A.init(inactive);
    A.syncKbHover();
    expect(inactive.requestDraw).not.toHaveBeenCalled();
  });
});

describe('tb-a11y — foco de modal', () => {
  /** @type {any} */
  let A;

  beforeEach(() => {
    delete globalThis.TBA11y;
    document.body.innerHTML =
      '<div id="global-modal" class="show"><button id="b1"></button><button id="b2"></button></div>';
    mountModule('tb-a11y.js');
    A = globalThis.TBA11y;
    A.init({});
  });

  it('Tab no último elemento volta para o primeiro', () => {
    document.getElementById('b2').focus();
    const e = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };
    A.trapModalFocus(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(document.activeElement.id).toBe('b1');
  });

  it('Shift+Tab no primeiro elemento vai para o último', () => {
    document.getElementById('b1').focus();
    const e = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() };
    A.trapModalFocus(e);
    expect(document.activeElement.id).toBe('b2');
  });

  it('ignora teclas diferentes de Tab e modal fechado', () => {
    const other = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };
    A.trapModalFocus(other);
    expect(other.preventDefault).not.toHaveBeenCalled();

    document.getElementById('global-modal').classList.remove('show');
    const tab = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };
    A.trapModalFocus(tab);
    expect(tab.preventDefault).not.toHaveBeenCalled();
  });
});
