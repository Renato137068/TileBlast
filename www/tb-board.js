// @ts-check
/**
 * Tile Blast — renderização do tabuleiro em canvas (draw*, particles, finale).
 * Isolado de tb-main; recebe dependências via TBBoard.init(cfg) no boot.
 * Estado mutável (grid, pops, rafActive, …) deve ser injetado com get/set
 * para não duplicar nem congelar referências reassigned em tb-main.
 *
 * @typedef {Record<string, any>} TBBoardCfg
 * @typedef {{
 *   init: (cfg: TBBoardCfg|null|undefined) => void,
 *   draw: () => void,
 *   requestDraw: () => void,
 *   boardClearFinale: (done: () => void) => void,
 *   isAnimating: () => boolean
 * }} TBBoardApi
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBJuice = global.TBJuice;
  /** @type {any} */
  const TBFeatures = global.TBFeatures;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  /**
   * @param {TBBoardCfg|null|undefined} cfg
   * @returns {void}
   */
  function init(cfg) {
    C = cfg || null;
  }

  function boardClearFinale(done) {
    if (!C) {
      if (typeof done === 'function') done();
      return;
    }
    if (TBState.isInfiniteMode || TBState.isDailyPuzzleMode) {
      done();
      return;
    }
    const specials = [];
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) {
        const b = C.grid[x][y];
        if (b && b.sp !== C.SP.NONE) specials.push([x, y]);
      }
    if (!specials.length) {
      done();
      return;
    }
    C.triggerShake(18, 650);
    C.Sound.boardClear();
    const now = performance.now();
    const all = new Set();
    for (const [x, y] of specials) {
      const b = C.grid[x][y];
      if (!b) continue;
      const r = C.gatherBlast(x, y, b.sp);
      for (const [tx, ty] of r.cells) all.add(tx + ',' + ty);
    }
    let bonus = 0;
    for (const k of all) {
      const [x, y] = k.split(',').map(Number);
      const b = C.grid[x][y];
      if (b) {
        b.popStart = now;
        C.pops.push(b);
        C.spawnParticles([[x, y]], '#ffd23e');
        C.grid[x][y] = null;
        bonus++;
      }
    }
    if (bonus) {
      C.score += bonus * C.PPB;
      C.updateHUD();
    }
    // Finale: flash + shockwave + confete no canvas (sem DOM #confetti-layer duplicado)
    if (TBJuice) {
      const c = C.BPX / 2;
      const world = _playColor();
      TBJuice.flash(_mixHex('#fff5cc', world, 0.25), 0.28, 420);
      TBJuice.shockwave(c, c, { color: world, intensity: 1, radius: C.BPX * 0.7, dur: 600 });
      TBJuice.confettiBurst(c, c, {
        count: 42,
        colors: ['#ffd23e', world, _mixHex(world, '#ffffff', 0.4), '#ef4b5f', '#4ecb71', '#3aa6e0'],
      });
      TBJuice.hitStop(60);
    } else if (C.spawnConfetti) {
      C.spawnConfetti();
    }
    if (C.Haptic && C.Haptic.combo) C.Haptic.combo(bonus);
    C.showComboBurst(specials.length + 1, bonus * C.PPB);
    C.requestDraw();
    setTimeout(done, 750);
  }

  const rgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lit = (h, a) => {
    const [r, g, b] = rgb(h);
    return `rgb(${(r + (255 - r) * a) | 0},${(g + (255 - g) * a) | 0},${(b + (255 - b) * a) | 0})`;
  };
  const drk = (h, a) => {
    const [r, g, b] = rgb(h);
    return `rgb(${(r * (1 - a)) | 0},${(g * (1 - a)) | 0},${(b * (1 - a)) | 0})`;
  };
  function rrect(x, y, w, h, r) {
    _rrectOn(C.ctx, x, y, w, h, r);
  }
  /** rrect genérico — funciona em qualquer contexto (sprites offscreen). */
  function _rrectOn(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // ── Atlas de sprites dos tiles ───────────────────────────────────────────────
  // O corpo do tile (gradiente 4 paradas + sombra + borda + lábio + anel +
  // specular) é caro para redesenhar por célula por frame. Pré-renderiza uma vez
  // por cor no tamanho corrente e blita com drawImage (~1 op por tile).
  let _tileSprites = { key: '', byType: [] };
  const _TILE_PAD = 14; // px lógicos p/ sombra (blur 8 + offsetY 4)

  /** Pinta o corpo do tile num contexto qualquer (usado no sprite e no fallback). */
  function _paintTileBody(g, x, y, sz, base, withShadow) {
    g.save();
    const A = g.globalAlpha;
    if (withShadow) {
      g.shadowColor = 'rgba(0,0,0,.4)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 4;
    }
    const grd = g.createLinearGradient(x, y, x, y + sz);
    grd.addColorStop(0, lit(base, 0.34));
    grd.addColorStop(0.38, lit(base, 0.1));
    grd.addColorStop(0.72, base);
    grd.addColorStop(1, drk(base, 0.22));
    _rrectOn(g, x, y, sz, sz, sz * 0.22);
    g.fillStyle = grd;
    g.fill();
    g.shadowColor = 'transparent';
    // borda clara
    g.lineWidth = Math.max(1.5, sz * 0.045);
    g.strokeStyle = lit(base, 0.42);
    g.stroke();
    // lábio inferior (espessura)
    g.globalAlpha = A * 0.5;
    g.fillStyle = drk(base, 0.32);
    _rrectOn(g, x + sz * 0.06, y + sz * 0.78, sz * 0.88, sz * 0.16, sz * 0.1);
    g.fill();
    // anel interno superior
    g.globalAlpha = A * 0.55;
    g.strokeStyle = lit(base, 0.6);
    g.lineWidth = Math.max(1, sz * 0.03);
    _rrectOn(g, x + sz * 0.1, y + sz * 0.1, sz * 0.8, sz * 0.42, sz * 0.14);
    g.stroke();
    // specular
    g.globalAlpha = A * 0.5;
    g.beginPath();
    g.ellipse(x + sz * 0.3, y + sz * 0.24, sz * 0.26, sz * 0.12, -0.45, 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
    // sombra interna inferior
    g.globalAlpha = A * 0.18;
    g.beginPath();
    g.ellipse(x + sz * 0.5, y + sz * 0.78, sz * 0.34, sz * 0.1, 0, 0, Math.PI * 2);
    g.fillStyle = '#000';
    g.fill();
    g.restore();
  }

  /** Sprite pré-renderizado do corpo por índice de cor (null se indisponível). */
  function _getTileSprite(typeIdx) {
    if (typeof document === 'undefined') return null;
    const szBase = C.CELL - C.CELL * 0.14;
    if (szBase <= 4) return null;
    const dpr = Math.max(1, Math.min(3, C.dpr || 1));
    const key = szBase.toFixed(1) + '|' + dpr + '|' + (C._fxLow ? 1 : 0);
    if (_tileSprites.key !== key) _tileSprites = { key, byType: [] };
    let spr = _tileSprites.byType[typeIdx];
    if (spr) return spr;
    try {
      const side = Math.ceil((szBase + _TILE_PAD * 2) * dpr);
      const cv = /** @type {HTMLCanvasElement} */ (document.createElement('canvas'));
      cv.width = side;
      cv.height = side;
      const g = cv.getContext('2d');
      if (!g || typeof g.setTransform !== 'function' || typeof g.ellipse !== 'function')
        return null;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      _paintTileBody(g, _TILE_PAD, _TILE_PAD, szBase, C.COLORS[typeIdx], !C._fxLow);
      spr = { canvas: cv, szBase, pad: _TILE_PAD };
      _tileSprites.byType[typeIdx] = spr;
      return spr;
    } catch (e) {
      return null;
    }
  }

  function _buildBgCache() {
    if (typeof document === 'undefined') return null;
    const c = /** @type {HTMLCanvasElement} */ (document.createElement('canvas'));
    c.width = C.BPX;
    c.height = C.BPX;
    const g = c.getContext('2d');
    if (!g) return null;
    const world = _playColor();
    const top = _playBgTop() || _mixHex('#1c2034', world, 0.28);
    const bot = _playBgBot() || _mixHex('#12151f', world, 0.12);
    const lg = g.createLinearGradient(0, 0, C.BPX * 0.15, C.BPX);
    lg.addColorStop(0, top);
    lg.addColorStop(0.55, _mixHex(top, bot, 0.45));
    lg.addColorStop(1, bot);
    g.fillStyle = lg;
    g.fillRect(0, 0, C.BPX, C.BPX);

    // Brilho ambiente do mundo (topo)
    const amb = g.createRadialGradient(
      C.BPX * 0.5,
      C.BPX * 0.08,
      0,
      C.BPX * 0.5,
      C.BPX * 0.08,
      C.BPX * 0.7
    );
    amb.addColorStop(0, _hexAlpha(world, 0.16));
    amb.addColorStop(0.55, _hexAlpha(world, 0.04));
    amb.addColorStop(1, 'transparent');
    g.fillStyle = amb;
    g.fillRect(0, 0, C.BPX, C.BPX);

    // Grade suave tingida
    g.strokeStyle = _hexAlpha(world, 0.07);
    g.lineWidth = 1;
    for (let i = 1; i < C.GW; i++) {
      const p = i * C.CELL;
      g.beginPath();
      g.moveTo(p + 0.5, 0);
      g.lineTo(p + 0.5, C.BPX);
      g.stroke();
    }
    for (let i = 1; i < C.GH; i++) {
      const p = i * C.CELL;
      g.beginPath();
      g.moveTo(0, p + 0.5);
      g.lineTo(C.BPX, p + 0.5);
      g.stroke();
    }

    // Motivo sutil por tema (pontos / ondas / cristais)
    _stampBgMotif(g, _playTheme(), world);

    const v = g.createRadialGradient(
      C.BPX / 2,
      C.BPX / 2,
      C.BPX * 0.18,
      C.BPX / 2,
      C.BPX / 2,
      C.BPX * 0.78
    );
    v.addColorStop(0, 'transparent');
    v.addColorStop(1, 'rgba(0,0,0,.28)');
    g.fillStyle = v;
    g.fillRect(0, 0, C.BPX, C.BPX);
    return {
      w: C.BPX,
      h: C.BPX,
      key: _bgThemeKey(),
      canvas: c,
    };
  }

  function _bgThemeKey() {
    const pt = TBState && TBState.playTheme;
    const color = (C && C._playWorldColor) || (pt && pt.color) || '';
    const theme = (C && C._playWorldTheme) || (pt && pt.theme) || '';
    const top = (C && C._playBgTop) || (pt && pt.bgTop) || '';
    const bot = (C && C._playBgBot) || (pt && pt.bgBot) || '';
    return [C.BPX, C.GW, C.GH, color, top, bot, theme].join('|');
  }

  function _playColor() {
    const pt = TBState && TBState.playTheme;
    return (C && C._playWorldColor) || (pt && pt.color) || '#3a4568';
  }
  function _playTheme() {
    const pt = TBState && TBState.playTheme;
    return (C && C._playWorldTheme) || (pt && pt.theme) || '';
  }
  function _playBgTop() {
    const pt = TBState && TBState.playTheme;
    return (C && C._playBgTop) || (pt && pt.bgTop) || null;
  }
  function _playBgBot() {
    const pt = TBState && TBState.playTheme;
    return (C && C._playBgBot) || (pt && pt.bgBot) || null;
  }

  /**
   * @param {string} a
   * @param {string} b
   * @param {number} t 0..1 toward b
   */
  function _mixHex(a, b, t) {
    try {
      const A = rgb(a);
      const B = rgb(b);
      const m = (i) => (A[i] + (B[i] - A[i]) * t) | 0;
      return `rgb(${m(0)},${m(1)},${m(2)})`;
    } catch (_) {
      return a;
    }
  }

  /** @param {string} h @param {number} a */
  function _hexAlpha(h, a) {
    try {
      const [r, g, b] = rgb(h);
      return `rgba(${r},${g},${b},${a})`;
    } catch (_) {
      return `rgba(255,255,255,${a})`;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} g
   * @param {string} theme
   * @param {string} world
   */
  function _stampBgMotif(g, theme, world) {
    g.save();
    g.globalAlpha = 0.07;
    g.fillStyle = world;
    g.strokeStyle = world;
    const n = Math.max(C.GW, C.GH);
    if (theme === 'ocean' || theme === 'forest') {
      g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const y = ((i + 1) / 6) * C.BPX;
        g.beginPath();
        for (let x = 0; x <= C.BPX; x += 8) {
          const yy = y + Math.sin(x * 0.04 + i) * (theme === 'ocean' ? 5 : 3);
          x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
        }
        g.stroke();
      }
    } else if (theme === 'crystal' || theme === 'mountain') {
      for (let i = 0; i < n * 2; i++) {
        const x = ((i * 97) % C.GW) * C.CELL + C.CELL * 0.5;
        const y = ((i * 53) % C.GH) * C.CELL + C.CELL * 0.5;
        const r = C.CELL * 0.12;
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * 0.7, y);
        g.lineTo(x, y + r);
        g.lineTo(x - r * 0.7, y);
        g.closePath();
        g.fill();
      }
    } else if (theme === 'inferno') {
      for (let i = 0; i < 8; i++) {
        const x = ((i * 67) % C.GW) * C.CELL + C.CELL * 0.5;
        const y = C.BPX - ((i * 41) % C.GH) * C.CELL * 0.35 - C.CELL * 0.2;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 6, y - 14, x, y - 22);
        g.quadraticCurveTo(x - 6, y - 14, x, y);
        g.fill();
      }
    } else {
      // jardim / default: pontos suaves
      for (let i = 0; i < n * 3; i++) {
        const x = ((i * 73) % C.GW) * C.CELL + C.CELL * 0.5;
        const y = ((i * 91) % C.GH) * C.CELL + C.CELL * 0.5;
        g.beginPath();
        g.arc(x, y, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }

  function drawBoardBackground() {
    const key = _bgThemeKey();
    if (!C._bgCache || C._bgCache.w !== C.BPX || C._bgCache.h !== C.BPX || C._bgCache.key !== key) {
      C._bgCache = _buildBgCache();
    }
    if (C._bgCache) C.ctx.drawImage(C._bgCache.canvas, 0, 0);
    else {
      C.ctx.fillStyle = '#12151f';
      C.ctx.fillRect(0, 0, C.BPX, C.BPX);
    }
  }

  function drawHoverFill() {
    if (C.hoverCells.size < 2) return;
    const first = [...C.hoverCells][0].split(',').map(Number);
    const b = C.grid[first[0]]?.[first[1]];
    if (!b) return;
    const base = C.COLORS[b.type % C.COLORS.length];
    const now = performance.now();
    const pulse = 0.28 + 0.1 * Math.sin(now / 140);
    C.ctx.save();
    C.ctx.globalAlpha = pulse;
    C.hoverCells.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      const px = x * C.CELL + C.CELL * 0.07,
        py = y * C.CELL + C.CELL * 0.07,
        sz = C.CELL * 0.86;
      rrect(px, py, sz, sz, sz * 0.22);
      C.ctx.fillStyle = base;
      C.ctx.fill();
    });
    C.ctx.restore();
  }

  function drawIcon(tp, cx, cy, r, cb = false) {
    C.ctx.save();
    if (cb) {
      C.ctx.strokeStyle = 'rgba(0,0,0,.55)';
      C.ctx.lineWidth = Math.max(1.5, r * 0.12);
    }
    C.ctx.fillStyle = 'rgba(255,255,255,.92)';
    C.ctx.beginPath();
    switch (tp % C.COLORS.length) {
      case 0:
        C.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        break;
      case 1:
        C.ctx.moveTo(cx, cy - r);
        C.ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
        C.ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
        C.ctx.closePath();
        break;
      case 2:
        C.ctx.moveTo(cx, cy - r);
        C.ctx.lineTo(cx + r, cy);
        C.ctx.lineTo(cx, cy + r);
        C.ctx.lineTo(cx - r, cy);
        C.ctx.closePath();
        break;
      case 3:
        {
          const s = 5,
            ir = r * 0.45;
          for (let i = 0; i < s * 2; i++) {
            const ra = i % 2 ? ir : r,
              an = (i * Math.PI) / s - Math.PI / 2;
            i
              ? C.ctx.lineTo(cx + Math.cos(an) * ra, cy + Math.sin(an) * ra)
              : C.ctx.moveTo(cx + Math.cos(an) * ra, cy + Math.sin(an) * ra);
          }
          C.ctx.closePath();
        }
        break;
      case 4:
        {
          const t = r * 0.45;
          C.ctx.rect(cx - t, cy - r, t * 2, r * 2);
          C.ctx.rect(cx - r, cy - t, r * 2, t * 2);
        }
        break;
      default:
        C.ctx.arc(cx, cy - r * 0.3, r * 0.55, 0, Math.PI * 2);
        C.ctx.moveTo(cx + r * 0.2, cy + r * 0.2);
        C.ctx.arc(cx, cy + r * 0.1, r * 0.55, 0, Math.PI * 2);
        break;
    }
    C.ctx.fill();
    if (cb) C.ctx.stroke();
    C.ctx.restore();
  }

  function drawSpecialOverlay(sp, cx, cy, r) {
    const now = performance.now();
    const bob = 1 + 0.04 * Math.sin(now / 260);
    const glow = sp === C.SP.BOMB ? '#ff8844' : sp === C.SP.ROCKET ? '#44aaff' : '#ff66ee';
    C.ctx.save();
    C.ctx.translate(cx, cy);
    C.ctx.scale(bob, bob);
    // disco metálico embutido
    const disc = C.ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.2);
    disc.addColorStop(0, 'rgba(255,255,255,.55)');
    disc.addColorStop(0.35, 'rgba(40,44,60,.55)');
    disc.addColorStop(1, 'rgba(10,12,20,.72)');
    C.ctx.fillStyle = disc;
    C.ctx.beginPath();
    C.ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.strokeStyle = glow;
    C.ctx.globalAlpha = 0.85;
    C.ctx.lineWidth = Math.max(1.5, r * 0.12);
    C.ctx.stroke();
    // faíscas orbitando
    C.ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now / 180);
    C.ctx.fillStyle = glow;
    for (let i = 0; i < 3; i++) {
      const a = now / 420 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(a) * r * 1.05;
      const sy = Math.sin(a) * r * 1.05;
      C.ctx.beginPath();
      C.ctx.arc(sx, sy, Math.max(1.2, r * 0.1), 0, Math.PI * 2);
      C.ctx.fill();
    }
    C.ctx.restore();
    if (sp === C.SP.BOMB) drawBombIcon(cx, cy, r);
    else if (sp === C.SP.ROCKET) drawRocketIcon(cx, cy, r);
    else drawRainbowIcon(cx, cy, r);
  }

  function drawBombIcon(cx, cy, r) {
    C.ctx.save();
    const grd = C.ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r * 0.95);
    grd.addColorStop(0, '#5a6278');
    grd.addColorStop(0.55, '#2a2e3c');
    grd.addColorStop(1, '#14161e');
    C.ctx.fillStyle = grd;
    C.ctx.beginPath();
    C.ctx.arc(cx, cy + r * 0.08, r * 0.72, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.strokeStyle = 'rgba(255,255,255,.22)';
    C.ctx.lineWidth = Math.max(1, r * 0.08);
    C.ctx.stroke();
    // pavio
    C.ctx.strokeStyle = '#c4a574';
    C.ctx.lineWidth = Math.max(1.5, r * 0.1);
    C.ctx.lineCap = 'round';
    C.ctx.beginPath();
    C.ctx.moveTo(cx + r * 0.15, cy - r * 0.55);
    C.ctx.quadraticCurveTo(cx + r * 0.45, cy - r * 0.9, cx + r * 0.35, cy - r * 1.05);
    C.ctx.stroke();
    // faísca
    C.ctx.fillStyle = '#ffb347';
    C.ctx.beginPath();
    C.ctx.arc(cx + r * 0.35, cy - r * 1.05, r * 0.16, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.fillStyle = '#fff3c4';
    C.ctx.beginPath();
    C.ctx.arc(cx + r * 0.35, cy - r * 1.05, r * 0.07, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.restore();
  }

  function drawRocketIcon(cx, cy, r) {
    C.ctx.save();
    C.ctx.translate(cx, cy);
    C.ctx.rotate(-0.4);
    // corpo
    const body = C.ctx.createLinearGradient(-r * 0.35, 0, r * 0.35, 0);
    body.addColorStop(0, '#7ec8ff');
    body.addColorStop(0.5, '#3a9de0');
    body.addColorStop(1, '#1e6fad');
    C.ctx.fillStyle = body;
    C.ctx.beginPath();
    C.ctx.moveTo(0, -r * 1.05);
    C.ctx.quadraticCurveTo(r * 0.42, -r * 0.2, r * 0.32, r * 0.55);
    C.ctx.lineTo(-r * 0.32, r * 0.55);
    C.ctx.quadraticCurveTo(-r * 0.42, -r * 0.2, 0, -r * 1.05);
    C.ctx.fill();
    // janela
    C.ctx.fillStyle = '#dff4ff';
    C.ctx.beginPath();
    C.ctx.arc(0, -r * 0.15, r * 0.18, 0, Math.PI * 2);
    C.ctx.fill();
    // aletas
    C.ctx.fillStyle = '#ff6b4a';
    C.ctx.beginPath();
    C.ctx.moveTo(-r * 0.28, r * 0.25);
    C.ctx.lineTo(-r * 0.75, r * 0.7);
    C.ctx.lineTo(-r * 0.22, r * 0.55);
    C.ctx.closePath();
    C.ctx.fill();
    C.ctx.beginPath();
    C.ctx.moveTo(r * 0.28, r * 0.25);
    C.ctx.lineTo(r * 0.75, r * 0.7);
    C.ctx.lineTo(r * 0.22, r * 0.55);
    C.ctx.closePath();
    C.ctx.fill();
    // chama
    C.ctx.fillStyle = '#ffcc44';
    C.ctx.beginPath();
    C.ctx.moveTo(-r * 0.18, r * 0.55);
    C.ctx.lineTo(0, r * 1.05);
    C.ctx.lineTo(r * 0.18, r * 0.55);
    C.ctx.closePath();
    C.ctx.fill();
    C.ctx.restore();
  }

  function drawRainbowIcon(cx, cy, r) {
    C.ctx.save();
    const cols = ['#ef4b5f', '#f5933e', '#f6c945', '#4ecb71', '#3aa6e0', '#b46fe0'];
    C.ctx.lineCap = 'round';
    for (let i = 0; i < cols.length; i++) {
      C.ctx.strokeStyle = cols[i];
      C.ctx.lineWidth = Math.max(1.5, r * 0.14);
      C.ctx.beginPath();
      C.ctx.arc(cx, cy + r * 0.35, r * (0.95 - i * 0.12), Math.PI * 1.05, Math.PI * 1.95);
      C.ctx.stroke();
    }
    C.ctx.fillStyle = 'rgba(255,255,255,.85)';
    C.ctx.beginPath();
    C.ctx.arc(cx - r * 0.55, cy + r * 0.15, r * 0.18, 0, Math.PI * 2);
    C.ctx.arc(cx + r * 0.55, cy + r * 0.15, r * 0.18, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.restore();
  }

  // Overlays de obstáculo (#1)
  function drawGlyph(glyph, cx, cy, sz, al) {
    C.ctx.save();
    C.ctx.globalAlpha = al;
    C.ctx.font = `${(sz * 0.62) | 0}px serif`;
    C.ctx.textAlign = 'center';
    C.ctx.textBaseline = 'middle';
    C.ctx.fillText(glyph, cx, cy + sz * 0.04);
    C.ctx.restore();
  }
  function drawCrate(x, y, sz, al, hp) {
    C.ctx.save();
    C.ctx.globalAlpha = al;
    const grd = C.ctx.createLinearGradient(x, y, x, y + sz);
    grd.addColorStop(0, '#c4894a');
    grd.addColorStop(0.45, '#a06a32');
    grd.addColorStop(1, '#6e451c');
    rrect(x, y, sz, sz, sz * 0.14);
    C.ctx.fillStyle = grd;
    C.ctx.fill();
    C.ctx.strokeStyle = 'rgba(255,255,255,.28)';
    C.ctx.lineWidth = Math.max(1.5, sz * 0.05);
    rrect(x + sz * 0.12, y + sz * 0.12, sz * 0.76, sz * 0.76, sz * 0.08);
    C.ctx.stroke();
    C.ctx.beginPath();
    C.ctx.moveTo(x + sz * 0.12, y + sz * 0.12);
    C.ctx.lineTo(x + sz * 0.88, y + sz * 0.88);
    C.ctx.moveTo(x + sz * 0.88, y + sz * 0.12);
    C.ctx.lineTo(x + sz * 0.12, y + sz * 0.88);
    C.ctx.stroke();
    // highlight madeira
    C.ctx.globalAlpha = al * 0.25;
    C.ctx.fillStyle = '#fff';
    rrect(x + sz * 0.1, y + sz * 0.08, sz * 0.8, sz * 0.18, sz * 0.06);
    C.ctx.fill();
    // HP pips
    const pips = Math.max(1, hp | 0);
    C.ctx.globalAlpha = al;
    for (let i = 0; i < pips; i++) {
      const px = x + sz * 0.22 + i * sz * 0.22;
      const py = y + sz * 0.82;
      C.ctx.beginPath();
      C.ctx.arc(px, py, sz * 0.055, 0, Math.PI * 2);
      C.ctx.fillStyle = i < pips ? '#ffe8a0' : 'rgba(0,0,0,.3)';
      C.ctx.fill();
      C.ctx.strokeStyle = 'rgba(0,0,0,.35)';
      C.ctx.lineWidth = 1;
      C.ctx.stroke();
    }
    C.ctx.restore();
  }
  function drawIceOverlay(x, y, sz, al, hp) {
    C.ctx.save();
    const cracked = hp <= 1;
    C.ctx.globalAlpha = al * (cracked ? 0.5 : 0.78);
    const ice = C.ctx.createLinearGradient(x, y, x + sz, y + sz);
    ice.addColorStop(0, 'rgba(220,245,255,.92)');
    ice.addColorStop(0.45, 'rgba(160,210,240,.78)');
    ice.addColorStop(1, 'rgba(120,180,230,.7)');
    rrect(x, y, sz, sz, sz * 0.22);
    C.ctx.fillStyle = ice;
    C.ctx.fill();
    C.ctx.strokeStyle = 'rgba(255,255,255,.95)';
    C.ctx.lineWidth = Math.max(1.5, sz * 0.05);
    rrect(x + sz * 0.06, y + sz * 0.06, sz * 0.88, sz * 0.88, sz * 0.18);
    C.ctx.stroke();
    // facetas
    C.ctx.globalAlpha = al * 0.45;
    C.ctx.strokeStyle = 'rgba(255,255,255,.85)';
    C.ctx.lineWidth = 1.2;
    C.ctx.beginPath();
    C.ctx.moveTo(x + sz * 0.2, y + sz * 0.25);
    C.ctx.lineTo(x + sz * 0.45, y + sz * 0.55);
    C.ctx.lineTo(x + sz * 0.28, y + sz * 0.78);
    C.ctx.moveTo(x + sz * 0.55, y + sz * 0.2);
    C.ctx.lineTo(x + sz * 0.72, y + sz * 0.5);
    C.ctx.stroke();
    if (cracked) {
      // rachaduras — HP restante = 1
      C.ctx.globalAlpha = al * 0.85;
      C.ctx.strokeStyle = 'rgba(40,80,120,.75)';
      C.ctx.lineWidth = Math.max(1.2, sz * 0.035);
      C.ctx.lineCap = 'round';
      C.ctx.beginPath();
      C.ctx.moveTo(x + sz * 0.18, y + sz * 0.22);
      C.ctx.lineTo(x + sz * 0.42, y + sz * 0.48);
      C.ctx.lineTo(x + sz * 0.34, y + sz * 0.72);
      C.ctx.moveTo(x + sz * 0.42, y + sz * 0.48);
      C.ctx.lineTo(x + sz * 0.68, y + sz * 0.38);
      C.ctx.moveTo(x + sz * 0.55, y + sz * 0.58);
      C.ctx.lineTo(x + sz * 0.78, y + sz * 0.8);
      C.ctx.stroke();
    }
    C.ctx.globalAlpha = al * 0.55;
    C.ctx.fillStyle = '#fff';
    C.ctx.beginPath();
    C.ctx.ellipse(x + sz * 0.32, y + sz * 0.28, sz * 0.12, sz * 0.06, -0.4, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.restore();
  }
  function drawChainOverlay(cx, cy, sz, al) {
    C.ctx.save();
    C.ctx.globalAlpha = al;
    const r = sz * 0.17;
    for (let i = -1; i <= 1; i++) {
      const x = cx + i * r * 1.15;
      const y = cy + i * r * 0.38;
      // sombra do elo
      C.ctx.fillStyle = 'rgba(0,0,0,.35)';
      C.ctx.beginPath();
      C.ctx.ellipse(x + 1.5, y + 2, r * 1.15, r * 0.72, -0.5, 0, Math.PI * 2);
      C.ctx.fill();
      const metal = C.ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      metal.addColorStop(0, '#e8ecf4');
      metal.addColorStop(0.45, '#9aa3b8');
      metal.addColorStop(1, '#5a6378');
      C.ctx.strokeStyle = metal;
      C.ctx.lineWidth = Math.max(2.5, sz * 0.08);
      C.ctx.beginPath();
      C.ctx.ellipse(x, y, r * 1.1, r * 0.7, -0.5, 0, Math.PI * 2);
      C.ctx.stroke();
    }
    C.ctx.fillStyle = 'rgba(255,255,255,.4)';
    C.ctx.beginPath();
    C.ctx.ellipse(cx - r * 0.95, cy - r * 0.55, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2);
    C.ctx.fill();
    C.ctx.restore();
  }
  function drawCollectIcon(cx, cy, sz, al) {
    C.ctx.save();
    C.ctx.globalAlpha = al;
    // caule
    C.ctx.strokeStyle = '#3d8f4a';
    C.ctx.lineWidth = Math.max(1.5, sz * 0.04);
    C.ctx.lineCap = 'round';
    C.ctx.beginPath();
    C.ctx.moveTo(cx, cy - sz * 0.05);
    C.ctx.quadraticCurveTo(cx + sz * 0.08, cy - sz * 0.28, cx + sz * 0.02, cy - sz * 0.38);
    C.ctx.stroke();
    // folha
    C.ctx.fillStyle = '#4ecb71';
    C.ctx.beginPath();
    C.ctx.ellipse(cx + sz * 0.12, cy - sz * 0.32, sz * 0.1, sz * 0.05, 0.5, 0, Math.PI * 2);
    C.ctx.fill();
    const cherry = (x, y) => {
      const g = C.ctx.createRadialGradient(x - sz * 0.04, y - sz * 0.04, 0, x, y, sz * 0.16);
      g.addColorStop(0, '#ff8aaa');
      g.addColorStop(0.55, '#e83b5c');
      g.addColorStop(1, '#a01838');
      C.ctx.fillStyle = g;
      C.ctx.beginPath();
      C.ctx.arc(x, y, sz * 0.15, 0, Math.PI * 2);
      C.ctx.fill();
      C.ctx.fillStyle = 'rgba(255,255,255,.45)';
      C.ctx.beginPath();
      C.ctx.arc(x - sz * 0.05, y - sz * 0.05, sz * 0.04, 0, Math.PI * 2);
      C.ctx.fill();
    };
    cherry(cx - sz * 0.1, cy + sz * 0.08);
    cherry(cx + sz * 0.12, cy + sz * 0.12);
    C.ctx.restore();
  }
  function drawCover() {
    if (!C.coverGrid) return;
    C.ctx.save();
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) {
        if (!C.coverGrid[x] || !C.coverGrid[x][y]) continue;
        const px = x * C.CELL + C.CELL * 0.04,
          py = y * C.CELL + C.CELL * 0.04,
          sz = C.CELL * 0.92;
        C.ctx.globalAlpha = 0.72;
        const cg = C.ctx.createLinearGradient(px, py, px, py + sz);
        cg.addColorStop(0, '#5fc473');
        cg.addColorStop(1, '#2a5f36');
        rrect(px, py, sz, sz, sz * 0.16);
        C.ctx.fillStyle = cg;
        C.ctx.fill();
        // nervuras de folha
        C.ctx.globalAlpha = 0.35;
        C.ctx.strokeStyle = '#1a3d24';
        C.ctx.lineWidth = 1.4;
        C.ctx.beginPath();
        C.ctx.moveTo(px + sz * 0.5, py + sz * 0.12);
        C.ctx.quadraticCurveTo(px + sz * 0.55, py + sz * 0.5, px + sz * 0.48, py + sz * 0.88);
        C.ctx.moveTo(px + sz * 0.5, py + sz * 0.4);
        C.ctx.quadraticCurveTo(px + sz * 0.28, py + sz * 0.5, px + sz * 0.18, py + sz * 0.62);
        C.ctx.moveTo(px + sz * 0.5, py + sz * 0.4);
        C.ctx.quadraticCurveTo(px + sz * 0.72, py + sz * 0.5, px + sz * 0.82, py + sz * 0.62);
        C.ctx.stroke();
        C.ctx.globalAlpha = 0.45;
        C.ctx.strokeStyle = '#1f4a28';
        C.ctx.lineWidth = 2;
        rrect(px, py, sz, sz, sz * 0.16);
        C.ctx.stroke();
        C.ctx.globalAlpha = 0.22;
        C.ctx.fillStyle = '#fff';
        rrect(px + sz * 0.1, py + sz * 0.08, sz * 0.8, sz * 0.22, sz * 0.08);
        C.ctx.fill();
      }
    C.ctx.restore();
  }

  function drawBlock(b, sc, al, isHovered = false) {
    const mg = C.CELL * 0.07,
      sz = (C.CELL - mg * 2) * sc;
    if (sz <= 0.5) return;
    const cx = b.vx + C.CELL / 2,
      cy = b.vy + C.CELL / 2,
      x = cx - sz / 2,
      y = cy - sz / 2,
      base = C.COLORS[b.type % C.COLORS.length];
    const now = performance.now();
    if (b._invalidFlash && now < b._invalidFlash) {
      C.ctx.save();
      C.ctx.globalAlpha = al * 0.45 * (1 - (now - (b._invalidFlash - 220)) / 220);
      rrect(x - 2, y - 2, sz + 4, sz + 4, sz * 0.22 + 2);
      C.ctx.fillStyle = '#ff4444';
      C.ctx.fill();
      C.ctx.restore();
    }
    // Flash branco curto no dano parcial de obstáculo
    if (b._hitAt && now - b._hitAt < 160) {
      const ht = (now - b._hitAt) / 160;
      C.ctx.save();
      C.ctx.globalAlpha = al * (1 - ht) * 0.55;
      rrect(x - 1, y - 1, sz + 2, sz + 2, sz * 0.22 + 1);
      C.ctx.fillStyle = '#ffffff';
      C.ctx.fill();
      C.ctx.restore();
    } else if (b._hitAt && now - b._hitAt >= 160) {
      delete b._hitAt;
    }
    if (isHovered) {
      C.ctx.save();
      C.ctx.shadowColor = lit(base, 0.5);
      C.ctx.shadowBlur = 18;
      C.ctx.globalAlpha = al * 0.65;
      rrect(x - 4, y - 4, sz + 8, sz + 8, sz * 0.22 + 4);
      C.ctx.fillStyle = lit(base, 0.35);
      C.ctx.fill();
      C.ctx.restore();
    }
    if (b.sp !== C.SP.NONE) {
      const pulse = 0.7 + 0.3 * Math.sin(now / 280);
      const gc = b.sp === C.SP.BOMB ? '#ff8844' : b.sp === C.SP.ROCKET ? '#44aaff' : '#ff44ff';
      C.ctx.save();
      C.ctx.globalAlpha = al * pulse * 0.8;
      C.ctx.shadowColor = gc;
      C.ctx.shadowBlur = 18 * pulse;
      rrect(x - 2, y - 2, sz + 4, sz + 4, sz * 0.22 + 2);
      C.ctx.strokeStyle = gc;
      C.ctx.lineWidth = 2.5;
      C.ctx.stroke();
      C.ctx.restore();
    }
    // Corpo: blit do sprite pré-renderizado (1 drawImage); fallback vetorial
    const spr = _getTileSprite(b.type % C.COLORS.length);
    if (spr) {
      const k = sz / spr.szBase;
      C.ctx.save();
      C.ctx.globalAlpha = al;
      C.ctx.drawImage(
        spr.canvas,
        x - spr.pad * k,
        y - spr.pad * k,
        (spr.szBase + spr.pad * 2) * k,
        (spr.szBase + spr.pad * 2) * k
      );
      C.ctx.restore();
    } else {
      C.ctx.save();
      C.ctx.globalAlpha = al;
      _paintTileBody(C.ctx, x, y, sz, base, !C._fxLow);
      C.ctx.restore();
    }
    C.ctx.globalAlpha = al;
    if (b.sp !== C.SP.NONE) drawSpecialOverlay(b.sp, cx, cy, sz * 0.28);
    else if (b.crate > 0) {
      drawCrate(x, y, sz, al, b.crate);
    } else if (b.collect) {
      drawCollectIcon(cx, cy, sz, al);
    } else {
      const cb = TBFeatures && TBFeatures.isColorBlind && TBFeatures.isColorBlind();
      drawIcon(b.type, cx, cy, sz * (cb ? 0.3 : 0.2), cb);
    }
    if (b.chain > 0) drawChainOverlay(cx, cy, sz, al);
    if (b.ice > 0) drawIceOverlay(x, y, sz, al, b.ice);
    C.ctx.globalAlpha = 1;
  }

  function drawTutorialHighlight(now) {
    if (!TBRoadmap || !TBRoadmap.isTutorialCell) return;
    const pulse = 0.55 + 0.45 * Math.sin(now / 220);
    C.ctx.save();
    C.ctx.strokeStyle = `rgba(246,178,62,${pulse})`;
    C.ctx.lineWidth = 3;
    C.ctx.shadowColor = 'rgba(246,178,62,0.9)';
    C.ctx.shadowBlur = 14;
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) {
        if (!TBRoadmap.isTutorialCell(x, y)) continue;
        const px = x * C.CELL + C.CELL * 0.06,
          py = y * C.CELL + C.CELL * 0.06,
          sz = C.CELL * 0.88;
        rrect(px, py, sz, sz, sz * 0.22);
        C.ctx.stroke();
      }
    C.ctx.restore();
  }

  function drawHoverOutline() {
    if (C.hoverCells.size < 2) return;
    const now = performance.now();
    const pulse = 0.65 + 0.35 * Math.sin(now / 180);
    C.ctx.save();
    C.ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.7})`;
    C.ctx.lineWidth = 2;
    C.ctx.shadowColor = 'rgba(255,240,140,0.8)';
    C.ctx.shadowBlur = 10;
    C.hoverCells.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      const px = x * C.CELL + C.CELL * 0.08,
        py = y * C.CELL + C.CELL * 0.08,
        sz2 = C.CELL * 0.84;
      rrect(px, py, sz2, sz2, sz2 * 0.22);
      C.ctx.stroke();
    });
    C.ctx.restore();
  }

  /** Dica de ociosidade: fill + pulso no maior grupo jogável. */
  function drawHintOutline() {
    if (!C.hintCells || !C.hintCells.size || C.hoverCells.size >= 2) return;
    if (C._reduceMotion && C._reduceMotion()) return;
    const now = performance.now();
    const pulse = 0.22 + 0.18 * Math.sin(now / 320);
    C.ctx.save();
    // fill dourado sob os tiles
    C.ctx.globalAlpha = pulse * 0.55;
    C.ctx.fillStyle = '#f6b23e';
    C.hintCells.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      const px = x * C.CELL + C.CELL * 0.08,
        py = y * C.CELL + C.CELL * 0.08,
        sz2 = C.CELL * 0.84;
      rrect(px, py, sz2, sz2, sz2 * 0.22);
      C.ctx.fill();
    });
    C.ctx.globalAlpha = 1;
    C.ctx.strokeStyle = `rgba(246,178,62,${0.45 + pulse})`;
    C.ctx.lineWidth = 2.5;
    C.ctx.setLineDash([5, 4]);
    C.ctx.shadowColor = 'rgba(246,178,62,0.55)';
    C.ctx.shadowBlur = 10;
    C.hintCells.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      const px = x * C.CELL + C.CELL * 0.05,
        py = y * C.CELL + C.CELL * 0.05,
        sz2 = C.CELL * 0.9;
      rrect(px, py, sz2, sz2, sz2 * 0.22);
      C.ctx.stroke();
    });
    C.ctx.restore();
  }

  function drawHoverBadge() {
    if (C.hoverSz < 2) return;
    const pts = C.calcGroupPts(C.hoverSz);
    const special =
      C.hoverSz >= C.RAINBOW_T
        ? 'RAINBOW'
        : C.hoverSz >= C.ROCKET_T
          ? 'ROCKET'
          : C.hoverSz >= C.BOMB_T
            ? 'BOMB'
            : null;
    const label = special ? `${special} +${pts}` : `+${pts} · ×${C.hoverSz}`;
    const fs = C.hoverSz >= C.CHT ? 14 : 12;
    C.ctx.save();
    C.ctx.font = `800 ${fs}px 'Baloo 2',sans-serif`;
    C.ctx.textAlign = 'center';
    C.ctx.textBaseline = 'middle';
    const tw = C.ctx.measureText(label).width;
    let bx = Math.min(C.hoverMX + 20, C.BPX - tw / 2 - 10);
    let by = Math.max(C.hoverMY - 28, 14);
    const accent =
      C.hoverSz >= C.RAINBOW_T
        ? '#ff88ff'
        : C.hoverSz >= C.ROCKET_T
          ? '#44ccff'
          : C.hoverSz >= C.BOMB_T
            ? '#ff9944'
            : C.hoverSz >= C.CHT
              ? '#ffdd44'
              : '#f6b23e';
    C.ctx.fillStyle = 'rgba(17,19,28,0.94)';
    rrect(bx - tw / 2 - 12, by - 13, tw + 24, 26, 10);
    C.ctx.fill();
    C.ctx.strokeStyle = accent;
    C.ctx.lineWidth = 1.8;
    rrect(bx - tw / 2 - 12, by - 13, tw + 24, 26, 10);
    C.ctx.stroke();
    C.ctx.fillStyle = accent;
    C.ctx.fillText(label, bx, by);
    C.ctx.restore();
  }

  function drawParticles(now) {
    const list = C.particles;
    if (!list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i],
        t = (now - p.start) / p.dur;
      if (t >= 1) {
        const last = list.length - 1;
        if (i !== last) list[i] = list[last];
        list.pop();
        continue;
      }
      const px = p.x + p.vx * t,
        py = p.y + p.vy * t + 220 * t * t;
      const alpha = (1 - t) * (1 - t) * 0.92,
        radius = p.r * (1 - t * 0.35);
      C.ctx.save();
      C.ctx.globalAlpha = alpha;
      C.ctx.fillStyle = p.color;
      if (!C._fxLow) {
        C.ctx.shadowColor = p.color;
        C.ctx.shadowBlur = p.sq ? 8 : 6;
      }
      if (p.sq) {
        C.ctx.translate(px, py);
        C.ctx.rotate((p.spin || 0) * now * 0.012);
        C.ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      } else {
        C.ctx.beginPath();
        C.ctx.arc(px, py, radius, 0, Math.PI * 2);
        C.ctx.fill();
      }
      C.ctx.restore();
    }
  }

  function drawFloaters(now) {
    for (let i = C.floaters.length - 1; i >= 0; i--) {
      const f = C.floaters[i],
        t = (now - f.start) / f.dur;
      if (t >= 1) {
        C.floaters.splice(i, 1);
        continue;
      }
      if (t < 0) continue;
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const rise = 70 * t + 10 * Math.sin(t * Math.PI);
      let pop = 1;
      if (t < 0.12) pop = 0.55 + (t / 0.12) * 0.55;
      else if (t < 0.22) pop = 1.1 - (t - 0.12) * 1;
      const tier = f.tier || 0;
      const baseFs = f.big ? 22 : 17;
      const fs = baseFs * pop * (tier >= 2 ? 1.12 : 1);
      const fill = tier >= 2 ? '#ffee66' : tier >= 1 ? '#ffb3ff' : f.color;
      C.ctx.save();
      C.ctx.globalAlpha = alpha;
      C.ctx.font = `800 ${fs}px 'Baloo 2',system-ui,sans-serif`;
      C.ctx.textAlign = 'center';
      C.ctx.textBaseline = 'middle';
      C.ctx.strokeStyle = 'rgba(0,0,0,.6)';
      C.ctx.lineWidth = tier >= 2 ? 4 : 3;
      C.ctx.lineJoin = 'round';
      C.ctx.strokeText(f.text, f.cx, f.cy - rise);
      C.ctx.fillStyle = fill;
      if (tier >= 1) {
        C.ctx.shadowColor = fill;
        C.ctx.shadowBlur = tier >= 2 ? 14 : 8;
      }
      C.ctx.fillText(f.text, f.cx, f.cy - rise);
      C.ctx.restore();
    }
  }

  function isAnimating() {
    if (!C) return false;
    const now = performance.now();
    if (C.pops.length || C.particles.length || C.floaters.some((f) => f.start <= now)) return true;
    if (now < C.shakeUntil || (TBJuice && TBJuice.active(now))) return true;
    if (C.hoverCells.size >= 2) return true;
    if (C.hintCells && C.hintCells.size) return true;
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) {
        const b = C.grid[x][y];
        if (
          b &&
          (b.ad > 0 ||
            b._shake ||
            b._hitAt ||
            (b._bornAt && now - b._bornAt < b._bornDur) ||
            (b._landAt && now - b._landAt < 180))
        )
          return true;
      }
    return false;
  }

  function drawKbFocus() {
    if (!C.kbFocus.active || document.activeElement !== C.canvas) return;
    const px = C.kbFocus.x * C.CELL + C.CELL * 0.08,
      py = C.kbFocus.y * C.CELL + C.CELL * 0.08,
      sz = C.CELL * 0.84;
    C.ctx.save();
    C.ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    C.ctx.lineWidth = 3;
    C.ctx.setLineDash([6, 4]);
    rrect(px, py, sz, sz, sz * 0.22);
    C.ctx.stroke();
    C.ctx.restore();
  }

  function requestDraw() {
    if (!C) return;
    if (!C.rafActive) {
      C.rafActive = true;
      requestAnimationFrame(draw);
    }
  }

  function draw() {
    if (!C || !C.grid.length) {
      if (C) C.rafActive = false;
      return;
    }
    const now = performance.now();
    // Hit-Stop: congela o quadro (não limpa/redesenha) por 20–80 ms para dar impacto.
    if (TBJuice && TBJuice.isFrozen(now)) {
      requestAnimationFrame(draw);
      return;
    }
    if (TBJuice) TBJuice.tick(now); // monitor de FPS → low-power automático
    C._fxLow = !!(TBJuice && TBJuice.isLowPower && TBJuice.isLowPower());
    C.ctx.clearRect(0, 0, C.BPX, C.BPX);
    drawBoardBackground();
    if (C.movesLeft <= 3 && !C.over && C.sGame.classList.contains('active')) {
      const pulse = 0.06 + 0.035 * Math.sin(now / 180);
      C.ctx.fillStyle = `rgba(255,48,48,${pulse})`;
      C.ctx.fillRect(0, 0, C.BPX, C.BPX);
    }
    // Screen shake inteligente (amplitude + leve rotação) via TBJuice.
    let sh = null;
    if (TBJuice) sh = TBJuice.getShake(now);
    else if (now < C.shakeUntil) {
      const decay = (C.shakeUntil - now) / 300;
      sh = {
        x: (Math.random() * 2 - 1) * C.shakeAmp * decay,
        y: (Math.random() * 2 - 1) * C.shakeAmp * decay,
        rot: 0,
      };
    }
    const doShake = !!sh;
    if (doShake) {
      C.ctx.save();
      C.ctx.translate(sh.x, sh.y);
      if (sh.rot) {
        C.ctx.translate(C.BPX / 2, C.BPX / 2);
        C.ctx.rotate(sh.rot);
        C.ctx.translate(-C.BPX / 2, -C.BPX / 2);
      }
    }
    drawCover();
    drawHoverFill();
    drawHoverOutline();
    drawTutorialHighlight(now);
    drawKbFocus();
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) {
        const b = C.grid[x][y];
        if (!b) continue;
        if (b.ad > 0) {
          const t = Math.min(1, (now - b.as) / b.ad);
          b.vy = b.afy + (b.aty - b.afy) * t * t;
          if (t >= 1) {
            b.ad = 0;
            if (!C._fxLow) b._landAt = now;
            // Baque suave de aterrissagem (skip em low-power; throttle interno)
            if (!C._fxLow && C.Sound && typeof C.Sound.land === 'function') C.Sound.land();
          }
        }
        b.vx = x * C.CELL;
        if (b._shake) {
          let sx = 0;
          for (const s of b._shake) if (now >= s.start) sx = s.dx;
          b.vx = b._shake[0].ox + sx;
          if (now > b._shake[0].start + 200) delete b._shake;
        }
        let sc = 1;
        if (b._bornAt) {
          const t = Math.min(1, (now - b._bornAt) / b._bornDur);
          sc = t < 0.6 ? (t / 0.6) * 1.15 : 1 + (1.15 - 1) * (1 - (t - 0.6) / 0.4);
          if (t >= 1) delete b._bornAt;
        }
        const isH = C.hoverCells.has(x + ',' + y);
        if (isH && !b._bornAt) sc *= 1.05;
        // Squash de aterrissagem: achata brevemente ao encostar
        let landSq = 0;
        if (b._landAt) {
          const lt = (now - b._landAt) / 180;
          if (lt >= 1) delete b._landAt;
          else landSq = Math.sin(lt * Math.PI) * 0.16;
        }
        if (landSq > 0) {
          const bcx = b.vx + C.CELL / 2,
            bcy = b.vy + C.CELL / 2;
          C.ctx.save();
          C.ctx.translate(bcx, bcy);
          C.ctx.scale(1 + landSq, 1 - landSq);
          C.ctx.translate(-bcx, -bcy);
          drawBlock(b, sc, 1, isH);
          C.ctx.restore();
        } else {
          drawBlock(b, sc, 1, isH);
        }
      }
    for (let i = C.pops.length - 1; i >= 0; i--) {
      const b = C.pops[i],
        pt = (now - b.popStart) / 240;
      if (pt >= 1) {
        C.pops.splice(i, 1);
        continue;
      }
      const sh = pt < 0.35 ? 0 : Math.min(1, (pt - 0.35) / 0.65);
      const popSc = pt < 0.35 ? 1 + 0.3 * (pt / 0.35) : 1.3 * (1 - sh * 0.85);
      // Squash & stretch: estica na subida, achata ao explodir
      const stretch = pt < 0.35 ? 1 + 0.18 * (pt / 0.35) : 1 - 0.5 * sh;
      const squashX = 2 - stretch;
      const bcx = b.vx + C.CELL / 2,
        bcy = b.vy + C.CELL / 2;
      C.ctx.save();
      C.ctx.translate(bcx, bcy);
      C.ctx.scale(squashX, stretch);
      C.ctx.translate(-bcx, -bcy);
      drawBlock(b, popSc, pt < 0.35 ? 1 : 1 - sh);
      C.ctx.restore();
    }
    drawHintOutline(); // depois dos blocos — senão os tiles opacos cobrem o traço
    drawParticles(now);
    if (TBJuice) TBJuice.render(C.ctx, now, C.BPX); // shockwaves + partículas modernas + flash
    drawFloaters(now);
    drawHoverBadge();
    // Ripple effect
    if (C.ripple) {
      const t = (now - C.ripple.start) / 500;
      if (t < 1) {
        C.ctx.save();
        C.ctx.globalAlpha = (1 - t) * 0.5;
        C.ctx.strokeStyle = C.ripple.color || '#f6b23e';
        C.ctx.lineWidth = 2 + t * 3;
        C.ctx.beginPath();
        C.ctx.arc(C.ripple.x, C.ripple.y, t * C.CELL * 2.8, 0, Math.PI * 2);
        C.ctx.stroke();
        C.ctx.globalAlpha = (1 - t) * 0.25;
        C.ctx.beginPath();
        C.ctx.arc(C.ripple.x, C.ripple.y, t * C.CELL * 1.6, 0, Math.PI * 2);
        C.ctx.stroke();
        C.ctx.restore();
      } else {
        C.ripple = null;
      }
    }
    if (doShake) C.ctx.restore();
    isAnimating() || C.ripple || (TBJuice && TBJuice.active(now))
      ? requestAnimationFrame(draw)
      : (C.rafActive = false);
  }

  /** @type {TBBoardApi} */
  const api = {
    init,
    draw,
    requestDraw,
    boardClearFinale,
    isAnimating,
  };

  /** @type {any} */
  const g = global;
  g.draw = draw;
  g.requestDraw = requestDraw;
  g.boardClearFinale = boardClearFinale;
  g.isAnimating = isAnimating;
  g.TBBoard = api;
})(typeof window !== 'undefined' ? window : globalThis);
