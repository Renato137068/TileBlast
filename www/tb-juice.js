/* ═══════════════════════════════════════════════════════════════════════════
   TB-JUICE — Camada de Game Feel (100% desacoplada)
   ---------------------------------------------------------------------------
   Fornece "juice" reutilizável sem conhecer regras, UI ou economia do jogo:
     • Partículas modernas   → sparks, estrelas, glow, poeira, fumaça, confete
     • Explosões / Shockwave → anel de expansão + flash radial + fade
     • Screen Shake          → inteligente (amplitude + rotação, decaimento easeOut)
     • Hit-Stop              → congelamento de quadro curto (20–80 ms)
     • Easing                → biblioteca de curvas (nada de linear)
     • Coin-Fly              → moedas que voam até o contador (DOM/WAAPI)
     • Flash de tela         → clarão board-space
     • Monitor de FPS        → ativa modo low-power automaticamente

   USO (o jogo só dispara efeitos e chama render dentro do próprio loop):
     TBJuice.init({ reduceMotion: fn, lowPower: bool });
     TBJuice.setCell(CELL);                       // a cada layout
     TBJuice.burst(x, y, { color, intensity });   // ao destruir/combo
     TBJuice.shockwave(x, y, { color, intensity });
     TBJuice.shake(amp, dur, { rot });
     TBJuice.hitStop(ms);
     // dentro de draw(canvas):
     if (TBJuice.isFrozen(now)) { requestAnimationFrame(draw); return; }
     TBJuice.tick(now);
     ...aplica getShake()...  TBJuice.render(ctx, now, boardPx);

   Zero assets. Respeita prefers-reduced-motion e modo low-power.
   ═══════════════════════════════════════════════════════════════════════════ */
window.TBJuice = (function () {
  'use strict';

  // ── Configuração / performance ─────────────────────────────────────────────
  const cfg = {
    lowPower: false, // reduz partículas/blur; setado por device ou monitor FPS
    particleCap: 260, // teto de partículas simultâneas
    quality: 1, // multiplicador de densidade (1 normal, ~0.55 low)
  };
  let _forcedLow = false; // true se init/lowEndDevice pediu low — não auto-recupera
  let _rm = function () {
    return false;
  }; // verificador de reduce-motion (injetado)
  let CELL = 44; // tamanho de célula (para raios padrão)

  function init(opts) {
    opts = opts || {};
    if (typeof opts.reduceMotion === 'function') _rm = opts.reduceMotion;
    if (opts.lowPower) setLowPower(true, { forced: true });
    return API;
  }
  function setCell(px) {
    if (px > 0) CELL = px;
  }
  function setLowPower(on, opts) {
    cfg.lowPower = !!on;
    cfg.quality = on ? 0.55 : 1;
    cfg.particleCap = on ? 120 : 260;
    if (opts && opts.forced) _forcedLow = !!on;
    if (!on) {
      _lowStreak = 0;
      _hiStreak = 0;
    }
  }

  // ── Easing — evita animações lineares (aceleração/desaceleração/elasticidade) ─
  const ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    outElastic: (t) => {
      if (t === 0 || t === 1) return t;
      const p = 0.32;
      return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    },
    outBounce: (t) => {
      const n = 7.5625,
        d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  // ── Utilitário de cor: clareia hex em direção ao branco ────────────────────
  function _lit(hex, a) {
    if (typeof hex !== 'string' || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgb(${(r + (255 - r) * a) | 0},${(g + (255 - g) * a) | 0},${(b + (255 - b) * a) | 0})`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIT-STOP — congelamento de quadro curto (impacto)
  // ═══════════════════════════════════════════════════════════════════════════
  let _frozenUntil = 0;
  function hitStop(ms) {
    if (_rm() || cfg.lowPower) return; // sem hit-stop em reduce-motion/low-power
    const d = Math.max(0, Math.min(80, ms || 0)); // teto 80 ms: nunca "trava" de fato
    _frozenUntil = Math.max(_frozenUntil, performance.now() + d);
  }
  function isFrozen(now) {
    return now < _frozenUntil;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN SHAKE — inteligente: amplitude + rotação, decaimento easeOut
  // ═══════════════════════════════════════════════════════════════════════════
  let _shake = { amp: 0, rot: 0, until: 0, dur: 1 };
  function shake(amp, dur, opts) {
    if (_rm()) return;
    dur = dur || 260;
    amp = amp * (cfg.lowPower ? 0.7 : 1);
    const now = performance.now();
    // Combina impactos: mantém o mais forte ainda ativo (evita "cancelar" tremor)
    if (amp >= _shake.amp || now >= _shake.until) {
      _shake = { amp: amp, rot: (opts && opts.rot) || 0, until: now + dur, dur: dur };
    }
  }
  function getShake(now) {
    if (now >= _shake.until) return null;
    const left = (_shake.until - now) / _shake.dur; // 1 → 0
    const k = left * left; // easeOut no decaimento
    const a = _shake.amp * k;
    return {
      x: (Math.random() * 2 - 1) * a,
      y: (Math.random() * 2 - 1) * a,
      rot: (Math.random() * 2 - 1) * _shake.rot * k * 0.01745, // graus → rad
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTÍCULAS — pool único, motion em forma fechada (barato e previsível)
  // Convenção (igual ao motor existente): vx/vy = deslocamento TOTAL na vida;
  // g = gravidade aplicada como +g*t*t (t normalizado 0..1).
  // ═══════════════════════════════════════════════════════════════════════════
  const P = [];
  /** Remove índice i em O(1) (ordem irrelevante para partículas/ondas). */
  function _swapPop(arr, i) {
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
  }
  function _push(p) {
    P.push(p);
    // Drop mais antigo em O(1) — evita shift() O(n) no pico de combos
    while (P.length > cfg.particleCap) _swapPop(P, 0);
  }

  /**
   * Emite um "burst" de partículas modernas escalado pela intensidade.
   * @param {number} x,y     centro em coordenadas do canvas (board-space)
   * @param {object} o       { color, intensity(0..1), count, speed }
   */
  function burst(x, y, o) {
    if (_rm()) return;
    o = o || {};
    const inten = o.intensity != null ? o.intensity : 0.5;
    const color = o.color || '#ffd23e';
    const q = cfg.quality;
    const now = performance.now();
    const spd = (o.speed || 130) * (0.6 + inten);
    const nSpark = ((o.count != null ? o.count : 8 + inten * 24) * q) | 0;

    // Sparks/faíscas — finas, brilhantes, caem com gravidade
    for (let i = 0; i < nSpark; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random());
      _push({
        k: 'spark',
        x,
        y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s - 40,
        r: 1.2 + Math.random() * 2.2 + inten * 1.6,
        color: Math.random() < 0.5 ? color : _lit(color, 0.45),
        start: now,
        dur: 340 + Math.random() * 260 + inten * 160,
        g: 520,
        spin: (Math.random() - 0.5) * 0.4,
      });
    }
    // Estrelas — só em intensidade média+; giram e brilham
    const nStar = ((inten > 0.35 ? 2 + inten * 6 : 0) * q) | 0;
    for (let i = 0; i < nStar; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = spd * (0.5 + Math.random() * 0.7);
      _push({
        k: 'star',
        x,
        y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s - 60,
        r: 3 + Math.random() * 3 + inten * 3,
        color: '#fff8d6',
        start: now,
        dur: 520 + Math.random() * 320,
        g: 360,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.5,
      });
    }
    // Glow central — clarão suave que dissipa (dá "peso")
    _push({
      k: 'glow',
      x,
      y,
      vx: 0,
      vy: 0,
      r: CELL * (0.5 + inten),
      color,
      start: now,
      dur: 240 + inten * 220,
      g: 0,
    });
    // Chunks — pedaços do tile (crocância estilo Candy Crush)
    const nChunk = ((4 + inten * 10) * q) | 0;
    for (let i = 0; i < nChunk; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = spd * (0.35 + Math.random() * 0.9);
      _push({
        k: 'chunk',
        x,
        y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s - 50,
        r: 3.5 + Math.random() * 4 + inten * 3,
        color: Math.random() < 0.65 ? color : _lit(color, 0.35),
        start: now,
        dur: 420 + Math.random() * 280 + inten * 120,
        g: 680,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.55,
      });
    }
    // Poeira/fumaça leve subindo — só em impactos grandes
    if (inten > 0.55 && !cfg.lowPower) {
      const nSmoke = ((3 + inten * 5) * q) | 0;
      for (let i = 0; i < nSmoke; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const s = 40 + Math.random() * 60;
        _push({
          k: 'smoke',
          x: x + (Math.random() - 0.5) * 10,
          y,
          vx: Math.cos(ang) * s,
          vy: Math.sin(ang) * s,
          r: 6 + Math.random() * 8 + inten * 8,
          color: 'rgba(255,255,255,0.5)',
          start: now,
          dur: 620 + Math.random() * 420,
          g: -40,
        });
      }
    }
  }

  /** Confete em canvas (board-space) — para vitórias/board-clear. */
  function confettiBurst(x, y, o) {
    if (_rm()) return;
    o = o || {};
    const palette = o.colors || ['#ef4b5f', '#3aa6e0', '#4ecb71', '#f6c945', '#b46fe0', '#f6b23e'];
    const n = ((o.count || 26) * cfg.quality) | 0;
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const s = 140 + Math.random() * 220;
      _push({
        k: 'confetti',
        x: x + (Math.random() - 0.5) * CELL,
        y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s,
        r: 3 + Math.random() * 4,
        color: palette[i % palette.length],
        start: now,
        dur: 900 + Math.random() * 700,
        g: 900,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.9,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCKWAVE — explosão: anel de expansão + flash radial + fade
  // ═══════════════════════════════════════════════════════════════════════════
  const W = [];
  function shockwave(x, y, o) {
    if (_rm()) return;
    o = o || {};
    const inten = o.intensity != null ? o.intensity : 0.5;
    W.push({
      x,
      y,
      color: o.color || '#ffffff',
      start: performance.now(),
      dur: o.dur || 320 + inten * 280,
      rMax: (o.radius || CELL * 2) * (0.7 + inten * 1.7),
      lw: (o.lineWidth || 3) + inten * 4,
      flash: o.flash != null ? o.flash : inten,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FLASH de tela (board-space)
  // ═══════════════════════════════════════════════════════════════════════════
  let _flash = null;
  function flash(color, alpha, dur) {
    if (_rm()) return;
    _flash = {
      color: color || '#fff',
      a: alpha || 0.25,
      start: performance.now(),
      dur: dur || 220,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — desenha shockwaves + partículas + flash. Chamado DENTRO do draw()
  // do jogo, já em board-space (dentro da transform de shake). bw = lado do board.
  // ═══════════════════════════════════════════════════════════════════════════
  function _star(ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
  }

  function render(ctx, now, bw) {
    const lp = cfg.lowPower;

    // Shockwaves ------------------------------------------------------------
    for (let i = W.length - 1; i >= 0; i--) {
      const w = W[i],
        t = (now - w.start) / w.dur;
      if (t >= 1) {
        _swapPop(W, i);
        continue;
      }
      const e = ease.outCubic(t);
      const r = w.rMax * e;
      ctx.save();
      ctx.globalAlpha = (1 - t) * (1 - t) * 0.9;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = w.lw * (1 - t * 0.7);
      if (!lp) {
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 16 * (1 - t);
      }
      ctx.beginPath();
      ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // Flash radial central (só na 1ª metade)
      if (w.flash > 0 && t < 0.5 && !lp) {
        ctx.globalAlpha = (0.5 - t) * w.flash * 0.9;
        const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, r || 1);
        g.addColorStop(0, w.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Partículas ------------------------------------------------------------
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i],
        t = (now - p.start) / p.dur;
      if (t >= 1) {
        _swapPop(P, i);
        continue;
      }
      const px = p.x + p.vx * t;
      const py = p.y + p.vy * t + (p.g || 0) * t * t;

      if (p.k === 'glow') {
        // clarão suave (curva "sino": sobe e desce)
        const bell = Math.sin(Math.min(1, t) * Math.PI);
        const r = p.r * (0.6 + t * 0.8);
        ctx.save();
        ctx.globalAlpha = bell * (lp ? 0.35 : 0.55);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, _lit(p.color, 0.5));
        g.addColorStop(0.5, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.k === 'smoke') {
        const r = p.r * (0.6 + t * 1.6);
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.k === 'star') {
        const alpha = 1 - t;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        if (!lp) {
          ctx.shadowColor = '#ffec99';
          ctx.shadowBlur = 8;
        }
        _star(ctx, px, py, p.r * (1 - t * 0.3), (p.rot || 0) + (p.spin || 0) * now * 0.02);
        ctx.restore();
      } else if (p.k === 'chunk') {
        const alpha = (1 - t) * (1 - t) * 0.95;
        const r = p.r * (1 - t * 0.25);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.rotate((p.rot || 0) + (p.spin || 0) * now * 0.025);
        ctx.fillStyle = p.color;
        if (!lp) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
        }
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#fff';
        ctx.fillRect(-r * 0.55, -r * 0.55, r * 0.7, r * 0.35);
        ctx.restore();
      } else if (p.k === 'confetti') {
        const alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.rotate((p.rot || 0) + (p.spin || 0) * now * 0.02);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      } else {
        // spark
        const alpha = (1 - t) * (1 - t) * 0.95;
        const r = p.r * (1 - t * 0.35);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (!lp) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.2, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Flash de tela ---------------------------------------------------------
    if (_flash) {
      const t = (now - _flash.start) / _flash.dur;
      if (t >= 1) {
        _flash = null;
      } else {
        ctx.save();
        ctx.globalAlpha = (1 - t) * _flash.a;
        ctx.fillStyle = _flash.color;
        ctx.fillRect(0, 0, bw, bw);
        ctx.restore();
      }
    }
  }

  /** Há algo animando? (mantém o rAF do jogo vivo) */
  function active(now) {
    return P.length > 0 || W.length > 0 || _flash != null || isFrozen(now) || _shake.until > now;
  }

  function reset() {
    P.length = 0;
    W.length = 0;
    _flash = null;
    _shake = { amp: 0, rot: 0, until: 0, dur: 1 };
    _frozenUntil = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COIN-FLY — moedas voam do ponto de origem até o contador (DOM + WAAPI)
  // ═══════════════════════════════════════════════════════════════════════════
  let _coinLayer = null;
  function _layer() {
    if (_coinLayer && document.body.contains(_coinLayer)) return _coinLayer;
    _coinLayer = document.createElement('div');
    _coinLayer.id = 'tbj-fx-layer';
    _coinLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(_coinLayer);
    return _coinLayer;
  }

  /**
   * @param {object} from   { x, y } em coordenadas de viewport (origem)
   * @param {Element} toEl   elemento-alvo (ex.: contador de moedas)
   * @param {object} o       { count, glyph, onEach, onDone }
   */
  function coinFly(from, toEl, o) {
    o = o || {};
    const onEach = o.onEach,
      onDone = o.onDone;
    if (!toEl || _rm()) {
      // fallback: sem animação, aplica efeito imediato
      if (onEach) for (let i = 0; i < (o.count || 1); i++) onEach(i);
      if (onDone) onDone();
      return;
    }
    const tr = toEl.getBoundingClientRect();
    const tx = tr.left + tr.width / 2,
      ty = tr.top + tr.height / 2;
    const layer = _layer();
    const n = Math.min(o.count || 10, cfg.lowPower ? 8 : 16);
    let done = 0;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'tbj-coin';
      el.textContent = o.glyph || '🪙';
      const sx = from.x + (Math.random() * 2 - 1) * 34;
      const sy = from.y + (Math.random() * 2 - 1) * 34;
      el.style.left = sx + 'px';
      el.style.top = sy + 'px';
      layer.appendChild(el);
      // Arco: ponto médio elevado para dar curva orgânica
      const midX = (sx + tx) / 2 + (Math.random() * 2 - 1) * 40;
      const midY = Math.min(sy, ty) - 60 - Math.random() * 40;
      const anim = el.animate(
        [
          { transform: 'translate(0,0) scale(0.6)', opacity: 0.2 },
          {
            transform: `translate(${midX - sx}px,${midY - sy}px) scale(1.15)`,
            opacity: 1,
            offset: 0.5,
          },
          { transform: `translate(${tx - sx}px,${ty - sy}px) scale(0.7)`, opacity: 0.9 },
        ],
        {
          duration: 520 + Math.random() * 220,
          delay: i * 45 + Math.random() * 40,
          easing: 'cubic-bezier(.4,0,.5,1)',
          fill: 'forwards',
        }
      );
      anim.onfinish = () => {
        el.remove();
        if (onEach) onEach(i);
        if (++done >= n && onDone) onDone();
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MONITOR DE FPS — ativa low-power se cair de forma sustentada
  // ═══════════════════════════════════════════════════════════════════════════
  let _last = 0,
    _frames = 0,
    _accum = 0,
    _lowStreak = 0,
    _hiStreak = 0,
    _lastFps = 60;
  function tick(now) {
    if (_last) {
      const dt = now - _last;
      if (dt < 500) {
        _accum += dt;
        _frames++;
      } // ignora saltos (aba oculta)
      if (_accum >= 1000) {
        const fps = (_frames * 1000) / _accum;
        _lastFps = fps;
        _accum = 0;
        _frames = 0;
        if (fps < 45) {
          _lowStreak++;
          _hiStreak = 0;
        } else {
          _lowStreak = Math.max(0, _lowStreak - 1);
          _hiStreak++;
        }
        if (_lowStreak >= 3 && !cfg.lowPower)
          setLowPower(true); // degrada suavemente
        // Recupera qualidade após ~5s estáveis ≥52fps (só se não for device low-end forçado)
        else if (_hiStreak >= 5 && cfg.lowPower && !_forcedLow) setLowPower(false);
      }
    }
    _last = now;
  }

  // ── API pública ────────────────────────────────────────────────────────────
  const API = {
    init,
    setCell,
    setLowPower,
    ease,
    isLowPower: () => cfg.lowPower,
    hitStop,
    isFrozen,
    shake,
    getShake,
    burst,
    confettiBurst,
    shockwave,
    flash,
    render,
    active,
    reset,
    coinFly,
    tick,
    getLastFps: () => Math.round(_lastFps * 10) / 10,
    getFpsStats: () => ({ fps: Math.round(_lastFps * 10) / 10, lowPower: !!cfg.lowPower }),
  };
  return API;
})();
