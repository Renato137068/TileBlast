// @ts-check
/**
 * Tile Blast — layout do canvas, partículas, floaters, shake, litHex.
 * Isolado de tb-main; TBFx.init(cfg) + TBFx.bindLayout() após canvas existir.
 *
 * @typedef {Record<string, any>} TBFxCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBJuice = global.TBJuice;

  /** @type {any} */
  let C = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let _layoutTimer = null;
  let _layoutBound = false;

  /** @param {TBFxCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
    if (C && TBJuice && typeof TBJuice.init === 'function') {
      TBJuice.init({ reduceMotion: _reduceMotion, lowPower: global.__lowEndDevice });
    }
  }

  function viewportWidth() {
    return Math.min(
      global.visualViewport?.width ?? global.innerWidth,
      document.documentElement.clientWidth
    );
  }

  function relayoutGridBlocks() {
    if (!C.grid || !C.grid.length) return;
    for (let x = 0; x < C.GW; x++) {
      for (let y = 0; y < C.GH; y++) {
        const b = C.grid[x][y];
        if (!b) continue;
        const px = x * C.CELL,
          py = y * C.CELL;
        b.x = x;
        b.y = y;
        if (b.ad <= 0) {
          b.vx = px;
          b.vy = py;
          b.afy = py;
          b.aty = py;
        } else {
          b.aty = b.y * C.CELL;
        }
      }
    }
    C.pops.length = 0;
  }

  function layoutBoard() {
    if (!C || !C.canvas || !C.ctx) return;
    // Tabuleiro maior em tablets (largura CSS >= 600px) para preencher a tela;
    // no celular mantém o cap de 416px. Casa com o #app responsivo
    // (css/responsive.css). O min(cellByW,cellByH) abaixo garante que ele não
    // transborde na vertical em tablets mais baixos.
    const vw = viewportWidth();
    const maxBoardW = vw >= 600 ? 680 : 416;
    const availW = Math.min(vw - 32, maxBoardW);
    // Altura disponível: viewport visível menos o espaço acima do tabuleiro
    // (HUD + barra de power-ups) e a área segura inferior. Sem isso o
    // tabuleiro era dimensionado só pela largura e transbordava na vertical
    // em telas altas (Android), deixando peças fora da área visível.
    const vpH = global.visualViewport?.height ?? global.innerHeight;
    const boardWEl = document.getElementById('board-w');
    const topUsed = boardWEl ? Math.max(0, boardWEl.getBoundingClientRect().top) : 0;
    let insetBottom = 0;
    try {
      insetBottom =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--inset-bottom')) ||
        0;
    } catch (e) {
      insetBottom = 0;
    }
    // Em tablets a pu-bar fica NO RODAPÉ (css/responsive.css) — reserva a
    // altura dela abaixo do tabuleiro para o board não crescer por cima.
    let puReserve = 0;
    if (vw >= 600) {
      const puBar = document.getElementById('pu-bar');
      if (puBar) puReserve = puBar.getBoundingClientRect().height + 16;
    }
    const reserveBelow = Math.max(16, insetBottom) + 14 + puReserve; // padding + respiro + pu-bar
    const availH = Math.max(120, vpH - topUsed - reserveBelow);
    const cellByW = Math.floor(availW / C.GW);
    const cellByH = Math.floor(availH / C.GH);
    C.CELL = Math.max(24, Math.min(cellByW, cellByH));
    C.BPX = C.CELL * C.GW;
    C.dpr = Math.min(
      global.devicePixelRatio || 1,
      global.__lowEndDevice ? 1.75 : C.IS_ANDROID ? 2 : 2.5
    );
    C.canvas.width = Math.round(C.BPX * C.dpr);
    C.canvas.height = Math.round(C.BPX * C.dpr);
    C.canvas.style.width = C.BPX + 'px';
    C.canvas.style.height = C.BPX + 'px';
    C.ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0);
    document.getElementById('board-w').style.width = C.BPX + 'px';
    document.getElementById('pu-bar').style.maxWidth = C.BPX + 'px';
    relayoutGridBlocks();
    C._bgCache = null;
    if (TBJuice) TBJuice.setCell(C.CELL);
    C.requestDraw();
  }

  function scheduleLayoutBoard() {
    clearTimeout(_layoutTimer);
    _layoutTimer = setTimeout(layoutBoard, 120);
  }

  function bindLayout() {
    if (_layoutBound || !C || !C.canvas) return;
    _layoutBound = true;
    layoutBoard();
    global.addEventListener('resize', scheduleLayoutBoard, { passive: true });
    global.addEventListener('orientationchange', scheduleLayoutBoard, { passive: true });
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', scheduleLayoutBoard, { passive: true });
    }
  }

  function calcGroupPts(cnt) {
    return TBLogic.calcGroupPts(cnt, C.getActiveEvent());
  }

  function litHex(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgb(${(r + (255 - r) * a) | 0},${(g + (255 - g) * a) | 0},${(b + (255 - b) * a) | 0})`;
  }

  function spawnParticles(grp, color) {
    // Preferência: TBJuice (um único sistema — menos GC, cap compartilhado, low-power)
    if (TBJuice && typeof TBJuice.burst === 'function') {
      const big = grp.length >= C.CHT;
      const inten = big ? 0.85 : 0.45 + Math.min(0.35, grp.length * 0.04);
      const count = ((big ? 7 : 5) * (C._fxLow || global.__lowEndDevice ? 0.65 : 1)) | 0;
      for (let i = 0; i < grp.length; i++) {
        const [x, y] = grp[i];
        TBJuice.burst(x * C.CELL + C.CELL / 2, y * C.CELL + C.CELL / 2, {
          color,
          intensity: inten,
          count,
          speed: big ? 160 : 120,
        });
      }
      if (big && grp.length) {
        const pcx = (grp.reduce((a, [x]) => a + x, 0) / grp.length) * C.CELL + C.CELL / 2;
        const pcy = (grp.reduce((a, [, y]) => a + y, 0) / grp.length) * C.CELL + C.CELL / 2;
        TBJuice.burst(pcx, pcy, { color: '#fff', intensity: 0.7, count: 10, speed: 180 });
      }
      return;
    }
    // Fallback legado (testes / boot sem TBJuice)
    const litColor = litHex(color, 0.3);
    const big = grp.length >= C.CHT;
    grp.forEach(([x, y]) => {
      const pcx = x * C.CELL + C.CELL / 2,
        pcy = y * C.CELL + C.CELL / 2;
      const count = (big ? 9 : 6) + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2,
          spd = (big ? 70 : 50) + Math.random() * (big ? 160 : 130);
        C.particles.push({
          x: pcx,
          y: pcy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 40,
          color: Math.random() < 0.5 ? color : litColor,
          r: (big ? 3 : 2.5) + Math.random() * (big ? 4 : 3.5),
          start: performance.now(),
          dur: 380 + Math.random() * 220,
          spin: (Math.random() - 0.5) * 0.3,
          sq: Math.random() < 0.4,
        });
      }
    });
    if (big && grp.length) {
      const pcx = (grp.reduce((a, [x]) => a + x, 0) / grp.length) * C.CELL + C.CELL / 2;
      const pcy = (grp.reduce((a, [, y]) => a + y, 0) / grp.length) * C.CELL + C.CELL / 2;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        C.particles.push({
          x: pcx,
          y: pcy,
          vx: Math.cos(ang) * 180,
          vy: Math.sin(ang) * 180,
          r: 2,
          start: performance.now(),
          dur: 320,
          sq: false,
          color: '#fff',
        });
      }
    }
    const cap = global.__lowEndDevice ? 80 : 160;
    while (C.particles.length > cap) C.particles.shift();
  }

  function spawnFloater(text, gridX, gridY, color, opts) {
    if (color === undefined) color = '#f6b23e';
    if (opts === undefined) opts = {};
    const big = opts.big != null ? opts.big : text.length > 5;
    C.floaters.push({
      text,
      cx: gridX * C.CELL + C.CELL / 2,
      cy: gridY * C.CELL + C.CELL / 2,
      color,
      start: performance.now(),
      dur: opts.dur || (big ? 1100 : 900),
      big,
      tier: opts.tier || 0,
    });
  }

  function _reduceMotion() {
    try {
      return (
        (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
        !!(C && C.ld && C.ld().reduceMotion)
      );
    } catch (e) {
      return false;
    }
  }

  function triggerShake(amp, dur, opts) {
    if (amp === undefined) amp = 7;
    if (dur === undefined) dur = 280;
    if (TBJuice) {
      TBJuice.shake(amp, dur, opts);
      return;
    }
    if (_reduceMotion()) return;
    C.shakeAmp = amp;
    C.shakeUntil = performance.now() + dur;
  }

  /** @type {any} */
  const api = {
    init,
    bindLayout,
    viewportWidth,
    relayoutGridBlocks,
    layoutBoard,
    scheduleLayoutBoard,
    calcGroupPts,
    litHex,
    spawnParticles,
    spawnFloater,
    _reduceMotion,
    triggerShake,
  };

  /** @type {any} */
  const g = global;
  g.viewportWidth = viewportWidth;
  g.relayoutGridBlocks = relayoutGridBlocks;
  g.layoutBoard = layoutBoard;
  g.scheduleLayoutBoard = scheduleLayoutBoard;
  g.calcGroupPts = calcGroupPts;
  g.litHex = litHex;
  g.spawnParticles = spawnParticles;
  g.spawnFloater = spawnFloater;
  g._reduceMotion = _reduceMotion;
  g.triggerShake = triggerShake;
  g.TBFx = api;
})(typeof window !== 'undefined' ? window : globalThis);
