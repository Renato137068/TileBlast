// @ts-check
/**
 * Tile Blast — acessibilidade (announce, teclado, foco de modal).
 * Isolado de tb-main; dependências via TBA11y.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBA11yCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  const COLOR_NAMES = ['vermelho', 'azul', 'verde', 'amarelo', 'roxo', 'laranja'];

  /** @param {TBA11yCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function _colorName(i) {
    if (TBRoadmap && TBRoadmap.colorName) return TBRoadmap.colorName(i);
    return COLOR_NAMES[((i % COLOR_NAMES.length) + COLOR_NAMES.length) % COLOR_NAMES.length];
  }

  function _a11y(k, f) {
    return (TBRoadmap && TBRoadmap.t && TBRoadmap.t(k)) || f;
  }

  function announce(msg) {
    const el = document.getElementById('board-status');
    if (el) el.textContent = msg;
  }

  function describeCell(gx, gy) {
    const row = gy + 1,
      col = gx + 1;
    if (!C.ok(gx, gy) || !C.grid[gx] || !C.grid[gx][gy]) {
      return _a11y('a11y_empty', `Linha ${row}, coluna ${col}, vazio`)
        .replace('{row}', String(row))
        .replace('{col}', String(col));
    }
    const b = C.grid[gx][gy];
    if (b.sp !== C.SP.NONE) {
      const sp =
        b.sp === C.SP.BOMB
          ? _a11y('sp_bomb', 'bomba')
          : b.sp === C.SP.ROCKET
            ? _a11y('sp_rocket', 'foguete')
            : _a11y('sp_rainbow', 'arco-íris');
      return _a11y('a11y_special', `Linha ${row}, coluna ${col}, bloco especial ${sp}`)
        .replace('{row}', String(row))
        .replace('{col}', String(col))
        .replace('{kind}', sp);
    }
    const cor = _colorName(b.type);
    const g = C.getGroup(gx, gy);
    const tail =
      g.length >= 2
        ? _a11y('a11y_group', `, grupo de ${g.length}`).replace('{n}', String(g.length))
        : _a11y('a11y_no_pair', ', sem par');
    return (
      _a11y('a11y_block', `Linha ${row}, coluna ${col}, bloco ${cor}`)
        .replace('{row}', String(row))
        .replace('{col}', String(col))
        .replace('{color}', cor) + tail
    );
  }

  function syncKbHover() {
    if (!C.kbFocus.active || C.IS_TOUCH) return;
    const g = C.getGroup(C.kbFocus.x, C.kbFocus.y);
    if (g.length >= 2) {
      C.hoverCells = new Set(g.map(([x, y]) => x + ',' + y));
      C.hoverSz = g.length;
    } else {
      C.hoverCells = new Set();
      C.hoverSz = 0;
    }
    C.requestDraw();
  }

  function trapModalFocus(e) {
    const modal = document.getElementById('global-modal');
    if (e.key !== 'Tab' || !modal.classList.contains('show')) return;
    const nodes = modal.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    if (!nodes.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      /** @type {HTMLElement} */ (last).focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      /** @type {HTMLElement} */ (first).focus();
    }
  }

  /** @type {any} */
  const api = {
    init,
    COLOR_NAMES,
    _colorName,
    _a11y,
    announce,
    describeCell,
    syncKbHover,
    trapModalFocus,
  };

  /** @type {any} */
  const g = global;
  g.COLOR_NAMES = COLOR_NAMES;
  g._colorName = _colorName;
  g._a11y = _a11y;
  g.announce = announce;
  g.describeCell = describeCell;
  g.syncKbHover = syncKbHover;
  g.trapModalFocus = trapModalFocus;
  g.TBA11y = api;
})(typeof window !== 'undefined' ? window : globalThis);
