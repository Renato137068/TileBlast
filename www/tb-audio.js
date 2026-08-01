/* ═══════════════════════════════════════════════════════════════════════════
   TB-AUDIO — Feedback sonoro e tátil (procedural, zero assets)
   ---------------------------------------------------------------------------
   Responsabilidades:
     • Haptic  — vibração/haptics (AndroidBridge, Capacitor Haptics, navigator.vibrate)
     • Sound   — síntese Web Audio (blast, combos, vitória, moedas, obstáculos…)
                 + camada opcional de samples reais (loadSample/playSample)
   Sem dependências de estado de jogo. A trilha musical (Music), que depende do
   contexto de fase/mundo, permanece no script principal.
   Exposto como window.TBAudio = { Haptic, Sound }.
   No script principal usa-se: const Haptic = TBAudio.Haptic, Sound = TBAudio.Sound
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── HAPTIC ────────────────────────────────────────────────────────────────
  const Haptic = (() => {
    let enabled = true;
    const can = () => {
      try {
        return !!navigator.vibrate;
      } catch (e) {
        return false;
      }
    };
    const nativeVibrate = (d) => {
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
          window.AndroidBridge.vibrate(d);
          return true;
        }
      } catch (e) {}
      return false;
    };
    const nativePattern = (csv) => {
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.vibratePattern === 'function') {
          window.AndroidBridge.vibratePattern(csv);
          return true;
        }
      } catch (e) {}
      return false;
    };
    const pulse = (p) => {
      if (!enabled) return;
      if (Array.isArray(p)) {
        if (nativePattern(p.join(','))) return;
      } else if (nativeVibrate(p)) return;
      if (!can()) return;
      try {
        navigator.vibrate(p);
      } catch (e) {}
    };
    const cap = () => window.Capacitor?.Plugins?.Haptics;
    const impact = (style, pattern) => {
      if (!enabled) return;
      const h = cap();
      if (h && typeof h.impact === 'function') {
        h.impact({ style }).catch(() => pulse(pattern));
        return;
      }
      pulse(pattern);
    };
    return {
      setEnabled(v) {
        enabled = v !== false;
      },
      isEnabled() {
        return enabled;
      },
      light() {
        impact('LIGHT', 8);
      },
      medium() {
        impact('MEDIUM', [12, 8, 12]);
      },
      heavy() {
        impact('HEAVY', [20, 12, 20, 12, 35]);
      },
      combo(size) {
        if (size >= 9) this.heavy();
        else if (size >= 5) this.medium();
        else this.light();
      },
      win() {
        impact('HEAVY', [30, 20, 30, 20, 60]);
      },
      lose() {
        impact('MEDIUM', [50, 30, 50]);
      },
    };
  })();

  // ── SOUND (Web Audio — zero assets) ─────────────────────────────────────────
  const Sound = (() => {
    let actx = null,
      muted = false,
      volMul = 1,
      bus = null;
    const effVol = (v) => v * (muted ? 0 : volMul);
    const ctx = () => {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      return actx;
    };
    // Barramento master com limiter (evita saturacao em combos grandes) — mixagem.
    const master = () => {
      if (bus) return bus;
      const ac = ctx();
      const g = ac.createGain();
      g.gain.value = 1;
      try {
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -8;
        comp.knee.value = 6;
        comp.ratio.value = 12;
        comp.attack.value = 0.003;
        comp.release.value = 0.12;
        g.connect(comp);
        comp.connect(ac.destination);
      } catch (e) {
        g.connect(ac.destination);
      }
      bus = g;
      return bus;
    };
    const rv = (c, a) => c + (Math.random() * 2 - 1) * a; // variacao por disparo (anti-fadiga)
    const tone = (freq, dur, type = 'sine', vol = 0.35, delay = 0, vary = 0) => {
      if (muted || volMul <= 0) return;
      try {
        const ac = ctx(),
          osc = ac.createOscillator(),
          g = ac.createGain();
        osc.connect(g);
        g.connect(master());
        osc.type = type;
        osc.frequency.value = vary ? rv(freq, freq * vary) : freq;
        const t = ac.currentTime + delay,
          v = effVol(vol);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      } catch (e) {}
    };
    const noise = (dur, vol = 0.2, delay = 0, hp = 0) => {
      if (muted || volMul <= 0) return;
      try {
        const ac = ctx(),
          smp = Math.max(1, (ac.sampleRate * dur) | 0),
          buf = ac.createBuffer(1, smp, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < smp; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(),
          g = ac.createGain();
        src.buffer = buf;
        let node = src;
        if (hp) {
          try {
            const f = ac.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.value = hp;
            src.connect(f);
            node = f;
          } catch (e) {}
        }
        node.connect(g);
        g.connect(master());
        const t = ac.currentTime + delay;
        g.gain.setValueAtTime(effVol(vol), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.start(t);
        src.stop(t + dur + 0.05);
      } catch (e) {}
    };
    const duck = () => {
      try {
        if (window.Music && window.Music.duck) window.Music.duck();
      } catch (e) {}
    };
    // ── Estrutura para SAMPLES futuros (assets .wav/.mp3) ────────────────────────
    // Hoje o jogo é 100% procedural (zero assets). Esta camada permite trocar/
    // sobrepor cues por samples reais no futuro sem tocar nos pontos de chamada:
    //   Sound.loadSample('blast','sfx/blast.wav'); → Sound.playSample('blast');
    const _samples = {};
    const loadSample = (name, url) => {
      try {
        return fetch(url)
          .then((r) => r.arrayBuffer())
          .then((b) => ctx().decodeAudioData(b))
          .then((buf) => {
            _samples[name] = buf;
            return true;
          })
          .catch(() => false);
      } catch (e) {
        return Promise.resolve(false);
      }
    };
    const hasSample = (name) => !!_samples[name];
    const playSample = (name, opts) => {
      const buf = _samples[name];
      if (!buf || muted || volMul <= 0) return false;
      try {
        const ac = ctx(),
          src = ac.createBufferSource(),
          g = ac.createGain();
        src.buffer = buf;
        src.connect(g);
        g.connect(master());
        const o = opts || {};
        if (o.rate) src.playbackRate.value = o.vary ? rv(o.rate, o.rate * o.vary) : o.rate;
        g.gain.value = effVol(o.vol != null ? o.vol : 0.6);
        src.start(ac.currentTime + (o.delay || 0));
        return true;
      } catch (e) {
        return false;
      }
    };
    return {
      getCtx: ctx,
      loadSample,
      hasSample,
      playSample,
      setMuted(v) {
        muted = v;
      },
      setVolume(v) {
        volMul = Math.max(0, Math.min(1, v));
      },
      getVolume() {
        return volMul;
      },
      isMuted() {
        return muted;
      },
      suspend() {
        try {
          if (actx && actx.state === 'running') actx.suspend();
        } catch (e) {}
      },
      resume() {
        try {
          if (actx && actx.state === 'suspended') actx.resume();
        } catch (e) {}
      },
      // blast escala com o tamanho do grupo (peso + crunch)
      pop(v = 0) {
        this.blast(2 + Math.round((+v || 0) * 6));
      },
      blast(size = 2) {
        // Se houver sample real carregado, usa-o (varia pitch pelo tamanho); senão, procedural.
        if (this.hasSample && this.hasSample('blast')) {
          this.playSample('blast', {
            vol: 0.5,
            rate: 1 + (Math.min(size, 12) - 2) * 0.03,
            vary: 0.06,
          });
          Haptic.light();
          return;
        }
        const s = Math.max(2, size | 0),
          base = 430 + Math.min(s, 12) * 22;
        tone(base, 0.09, 'sine', 0.34, 0, 0.04);
        tone(base * 1.5, 0.07, 'triangle', 0.14, 0, 0.05);
        if (s >= 6) tone(90 + s * 4, 0.12, 'sine', 0.22, 0, 0.05); // sub-thump: peso extra em blasts grandes
        noise(0.05 + Math.min(s, 10) * 0.006, 0.1 + Math.min(s, 12) * 0.012, 0, 1200);
        Haptic.light();
      },
      special() {
        duck();
        tone(180, 0.12, 'square', 0.42);
        tone(320, 0.18, 'sine', 0.32, 0.06);
        tone(540, 0.2, 'triangle', 0.2, 0.1);
        Haptic.medium();
      },
      // Cascata automática: pitch sobe com a profundidade da corrente (1..3)
      cascade(depth = 1, size = 3) {
        const d = Math.max(1, Math.min(4, depth | 0));
        const base = 520 * Math.pow(1.22, d - 1);
        tone(base, 0.08, 'sine', 0.26, 0, 0.03);
        tone(base * 1.5, 0.1, 'triangle', 0.16, 0.03, 0.04);
        tone(base * 2, 0.12, 'sine', 0.1, 0.06, 0.04);
        noise(0.04 + Math.min(size, 8) * 0.004, 0.08, 0, 1600);
      },
      // Aterrissagem dos blocos: baque suave, com throttle anti-metralhadora
      land() {
        const now = performance.now();
        if (this._lastLand && now - this._lastLand < 130) return;
        this._lastLand = now;
        tone(rv(150, 12), 0.05, 'sine', 0.12);
        noise(0.03, 0.04, 0, 500);
      },
      combo() {
        this.comboStep(1);
      },
      // escada de combo: quanto maior a cadeia, mais rica a resposta
      comboStep(n = 1) {
        const steps = Math.min(6, 2 + (+n || 0));
        for (let i = 0; i < steps; i++)
          tone(440 * Math.pow(1.16, i), 0.11, 'sine', 0.3, i * 0.05, 0.02);
        if (n >= 3) {
          tone(1320, 0.3, 'triangle', 0.22, steps * 0.05);
          duck();
        }
      },
      win() {
        this.fanfare(2);
      },
      // fanfarra escalonada por estrelas
      fanfare(stars = 1) {
        duck();
        [523, 659, 784, 1047].forEach((f, i) => {
          tone(f, 0.32, 'triangle', 0.3, i * 0.09);
          tone(f * 2, 0.28, 'sine', 0.12, i * 0.09);
        });
        if (stars >= 2) {
          tone(1047, 0.5, 'sine', 0.32, 0.36);
          tone(1319, 0.5, 'triangle', 0.2, 0.36);
        }
        if (stars >= 3) {
          tone(1568, 0.6, 'sine', 0.3, 0.5);
          tone(2093, 0.55, 'triangle', 0.18, 0.55);
          noise(0.4, 0.05, 0.5, 3000);
        }
        Haptic.win();
      },
      lose() {
        duck();
        [392, 330, 262].forEach((f, i) => tone(f, 0.24, 'sine', 0.28, i * 0.12));
        tone(196, 0.4, 'triangle', 0.2, 0.34);
        Haptic.lose();
      },
      // derrota apertada: nota suspensa "quase la" que convida a revanche
      nearMiss() {
        duck();
        tone(659, 0.16, 'triangle', 0.3);
        tone(784, 0.16, 'triangle', 0.3, 0.12);
        tone(740, 0.5, 'sine', 0.26, 0.26);
        Haptic.medium();
      },
      click() {
        tone(880, 0.05, 'sine', 0.22, 0, 0.03);
        Haptic.light();
      },
      shuffle() {
        noise(0.14, 0.2, 0, 600);
        Haptic.medium();
      },
      levelUp() {
        [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.3, i * 0.08));
        Haptic.heavy();
      },
      // eventos de recompensa antes MUDOS
      coin() {
        tone(1180, 0.06, 'square', 0.16, 0, 0.05);
        tone(1560, 0.09, 'sine', 0.14, 0.04, 0.05);
      },
      chest() {
        duck();
        tone(300, 0.12, 'sine', 0.28);
        tone(600, 0.16, 'triangle', 0.24, 0.1);
        [784, 988, 1319].forEach((f, i) => tone(f, 0.22, 'sine', 0.24, 0.2 + i * 0.07));
        Haptic.medium();
      },
      star(i = 0) {
        tone(1046 * Math.pow(1.12, +i || 0), 0.18, 'triangle', 0.28, 0, 0.02);
        tone(1568, 0.14, 'sine', 0.12, 0.05);
      },
      unlock() {
        duck();
        [523, 784, 1047, 1319].forEach((f, k) => tone(f, 0.24, 'triangle', 0.28, k * 0.07));
        noise(0.2, 0.04, 0.28, 3000);
        Haptic.heavy();
      },
      // quebra de obstaculos — texturas distintas
      iceBreak() {
        noise(0.12, 0.22, 0, 2500);
        tone(1200, 0.08, 'sine', 0.18, 0, 0.06);
        tone(760, 0.1, 'triangle', 0.14, 0.03);
      },
      // Dano parcial (HP ainda > 0) — feedback tátil/sonoro sem “quebra”
      iceChip() {
        noise(0.05, 0.1, 0, 2800);
        tone(rv(980, 40), 0.05, 'sine', 0.12);
      },
      crateBreak() {
        noise(0.14, 0.26, 0, 300);
        tone(150, 0.12, 'square', 0.22);
        Haptic.light();
      },
      crateHit() {
        tone(rv(180, 20), 0.06, 'square', 0.12);
        noise(0.04, 0.1, 0, 400);
      },
      chainBreak() {
        tone(520, 0.06, 'square', 0.24, 0, 0.05);
        tone(360, 0.1, 'square', 0.2, 0.05, 0.05);
        noise(0.06, 0.14, 0.02, 1500);
        Haptic.light();
      },
      chainRattle() {
        tone(rv(440, 30), 0.04, 'square', 0.1);
        tone(rv(320, 20), 0.05, 'square', 0.08, 0.03);
      },
      coverClear() {
        noise(0.07, 0.12, 0, 900);
        tone(660, 0.07, 'triangle', 0.14, 0, 0.04);
        tone(990, 0.09, 'sine', 0.1, 0.04);
      },
      collect() {
        tone(880, 0.1, 'sine', 0.24, 0, 0.03);
        tone(1320, 0.14, 'triangle', 0.2, 0.06, 0.03);
      },
      // objetivo concluído: acorde ascendente curto e alegre
      objComplete() {
        [784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.26, i * 0.06, 0.01));
        tone(2093, 0.24, 'sine', 0.14, 0.22);
        Haptic.medium();
      },
      // climax: board-clear grandioso
      boardClear() {
        duck();
        noise(0.5, 0.14, 0, 400);
        [392, 523, 659, 784, 988, 1319].forEach((f, i) => tone(f, 0.5, 'triangle', 0.26, i * 0.04));
        tone(1568, 0.8, 'sine', 0.3, 0.28);
        Haptic.win();
      },
      // build-up de tensao nos ultimos movimentos
      tension(level = 1) {
        tone(220 + (+level || 0) * 60, 0.12, 'triangle', 0.16, 0, 0.02);
      },
    };
  })();

  window.TBAudio = { Haptic, Sound };
})();
