// @ts-check
/**
 * Tile Blast — trilha procedural (Music) + toggle UI.
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const Sound = global.TBAudio && global.TBAudio.Sound;

  /** @type {any} */
  let C = null;

  /** @param {Record<string, any>|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // BACKGROUND MUSIC — trilha procedural por mundo
  // ═══════════════════════════════════════════════════════════════
  const MUSIC_THEMES = {
    hub: {
      beat: 0.42,
      wave: 'triangle',
      bassDiv: 4,
      melody: [523, 659, 784, 659, 587, 698, 880, 784, 659, 523, 392, 440, 523, 659, 523],
      bass: [131, 147, 165, 147, 131, 175, 196, 165],
    },
    '🌱 Jardim': {
      beat: 0.36,
      wave: 'triangle',
      bassDiv: 3,
      melody: [587, 698, 784, 880, 784, 698, 587, 523, 587, 659, 784, 659, 587, 523],
      bass: [147, 165, 196, 165, 147, 175],
    },
    '🌲 Floresta': {
      beat: 0.4,
      wave: 'triangle',
      bassDiv: 3,
      melody: [494, 587, 698, 784, 698, 587, 494, 440, 523, 659, 698, 587, 523, 494],
      bass: [123, 147, 165, 147, 131, 165],
    },
    '⛰ Montanha': {
      beat: 0.48,
      wave: 'sine',
      bassDiv: 3,
      melody: [440, 523, 587, 659, 587, 523, 440, 392, 440, 523, 587, 523, 440, 392],
      bass: [110, 123, 131, 123, 110, 98],
    },
    '🌊 Oceano': {
      beat: 0.44,
      wave: 'sine',
      bassDiv: 3,
      melody: [523, 659, 784, 880, 988, 880, 784, 659, 523, 587, 659, 784, 880, 784],
      bass: [131, 165, 196, 175, 147, 165],
    },
    '🔥 Inferno': {
      beat: 0.34,
      wave: 'square',
      bassDiv: 3,
      melody: [392, 466, 523, 587, 523, 466, 392, 349, 392, 466, 523, 587, 659, 587],
      bass: [98, 117, 131, 117, 98, 87],
    },
    '💎 Cristal': {
      beat: 0.4,
      wave: 'sine',
      bassDiv: 4,
      melody: [659, 880, 988, 1047, 988, 880, 784, 659, 587, 659, 784, 880, 988, 880],
      bass: [165, 196, 220, 196, 165, 147],
    },
    infinite: {
      beat: 0.32,
      wave: 'square',
      bassDiv: 3,
      melody: [659, 784, 988, 880, 784, 659, 523, 659, 784, 988, 784, 659, 523, 587],
      bass: [165, 196, 220, 196, 165, 147],
    },
    daily: {
      beat: 0.38,
      wave: 'triangle',
      bassDiv: 3,
      melody: [587, 698, 784, 880, 784, 698, 587, 523, 587, 659, 784, 698, 587, 523],
      bass: [147, 175, 196, 175, 147, 131],
    },
    // Clímax do jogo: tema majestoso, mais lento, com saltos de oitava
    '👑 Lendário': {
      beat: 0.46,
      wave: 'triangle',
      bassDiv: 2,
      melody: [523, 659, 784, 1047, 988, 784, 880, 659, 523, 587, 698, 880, 1047, 880, 784, 659],
      bass: [131, 165, 196, 220, 196, 165, 147, 131],
    },
    // Contra-relógio: rápido e tenso
    '⏱ Desafio Relâmpago': {
      beat: 0.28,
      wave: 'square',
      bassDiv: 2,
      melody: [659, 784, 880, 784, 659, 880, 988, 880, 659, 784, 1047, 988, 880, 784],
      bass: [165, 196, 165, 147, 165, 196, 220, 196],
    },
  };

  // Aliases musicKey (worlds.json) → mesmo objeto do label legado
  MUSIC_THEMES.garden = MUSIC_THEMES['🌱 Jardim'];
  MUSIC_THEMES.forest = MUSIC_THEMES['🌲 Floresta'];
  MUSIC_THEMES.mountain = MUSIC_THEMES['⛰ Montanha'];
  MUSIC_THEMES.ocean = MUSIC_THEMES['🌊 Oceano'];
  MUSIC_THEMES.inferno = MUSIC_THEMES['🔥 Inferno'];
  MUSIC_THEMES.crystal = MUSIC_THEMES['💎 Cristal'];
  MUSIC_THEMES.legendary = MUSIC_THEMES['👑 Lendário'];
  MUSIC_THEMES.time_challenge = MUSIC_THEMES['⏱ Desafio Relâmpago'];

  const Music = (() => {
    let on = true,
      active = false,
      timer = null,
      master = null,
      themeKey = 'hub',
      volMul = 1,
      hardMute = false; // mute de sessão via hud-mute (não persiste; não altera musicOn)
    const VOL = 0.2;
    const effVol = () => VOL * volMul * (on && !hardMute ? 1 : 0);

    function resolveThemeFromLevel(lv) {
      if (!lv) return null;
      // Prefer musicKey do catálogo (escalável — mundos novos só precisam do JSON)
      if (lv.worldId && global.TBContent && typeof global.TBContent.getWorld === 'function') {
        const w = global.TBContent.getWorld(lv.worldId);
        if (w && w.musicKey && MUSIC_THEMES[w.musicKey]) return w.musicKey;
      }
      if (lv.musicKey && MUSIC_THEMES[lv.musicKey]) return lv.musicKey;
      if (lv.world && MUSIC_THEMES[lv.world]) return lv.world;
      return null;
    }

    function getThemeKey() {
      if (typeof C.sGame !== 'undefined' && C.sGame.classList.contains('active')) {
        if (TBState.isDailyPuzzleMode) return 'daily';
        if (TBState.isInfiniteMode) return 'infinite';
        const lv = typeof global._lv === 'function' ? global._lv() : TBState.LEVELS[TBState.lvIdx];
        const fromLv = resolveThemeFromLevel(lv);
        if (fromLv) return fromLv;
        if (TBState.LEVELS[TBState.lvIdx]) {
          const fb = resolveThemeFromLevel(TBState.LEVELS[TBState.lvIdx]);
          if (fb) return fb;
        }
      }
      const unl = C.getUnlocked();
      const hubLv = TBState.LEVELS[Math.min(unl, TBState.LEVELS.length - 1)];
      return resolveThemeFromLevel(hubLv) || 'hub';
    }

    function masterGain() {
      if (master) return master;
      const ac = Sound.getCtx();
      master = ac.createGain();
      master.gain.value = effVol();
      master.connect(ac.destination);
      return master;
    }

    function note(freq, start, dur, vol = 0.26, type = 'triangle') {
      if (!on || !active) return;
      try {
        const ac = Sound.getCtx(),
          mg = masterGain();
        const osc = ac.createOscillator(),
          g = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(g);
        g.connect(mg);
        osc.start(start);
        osc.stop(start + dur + 0.06);
      } catch (e) {}
    }
    function hat(start) {
      if (!on || !active) return;
      try {
        const ac = Sound.getCtx(),
          mg = masterGain(),
          dur = 0.03,
          smp = (ac.sampleRate * dur) | 0,
          buf = ac.createBuffer(1, smp, ac.sampleRate),
          d = buf.getChannelData(0);
        for (let i = 0; i < smp; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 7000;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.05, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        src.connect(f);
        f.connect(g);
        g.connect(mg);
        src.start(start);
        src.stop(start + dur + 0.02);
      } catch (e) {}
    }
    function kick(start) {
      if (!on || !active) return;
      try {
        const ac = Sound.getCtx(),
          mg = masterGain(),
          osc = ac.createOscillator(),
          g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, start);
        osc.frequency.exponentialRampToValueAtTime(50, start + 0.12);
        g.gain.setValueAtTime(0.2, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(g);
        g.connect(mg);
        osc.start(start);
        osc.stop(start + 0.2);
      } catch (e) {}
    }

    function playLoop() {
      if (!on || !active) return;
      themeKey = getThemeKey();
      const th = MUSIC_THEMES[themeKey] || MUSIC_THEMES.hub;
      const ac = Sound.getCtx();
      let t = ac.currentTime + 0.08;
      let maxEnd = t;
      for (let i = 0; i < th.melody.length; i++) {
        note(th.melody[i], t, th.beat * 0.9, 0.26, th.wave);
        if (th.bass && i % th.bassDiv === 0) {
          const bi = Math.floor(i / th.bassDiv) % th.bass.length;
          note(th.bass[bi], t, th.beat * th.bassDiv * 0.95, 0.15, 'sine');
        }
        hat(t);
        if (i % th.bassDiv === 0) kick(t);
        t += th.beat;
        maxEnd = t;
      }
      timer = setTimeout(playLoop, Math.max(0, (maxEnd - ac.currentTime - 0.05) * 1000));
    }

    return {
      isOn() {
        return on;
      },
      // Silêncio total via hud-mute: pausa a trilha sem tocar na preferência salva
      setMuted(v) {
        hardMute = !!v;
        if (master) {
          const ac = Sound.getCtx();
          master.gain.setValueAtTime(effVol(), ac.currentTime);
        }
        if (hardMute) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        } else if (on && active && !timer) {
          playLoop();
        }
      },
      isMuted() {
        return hardMute;
      },
      getTheme() {
        return themeKey;
      },
      setOn(v) {
        on = !!v;
        const s = C.ld();
        s.musicOn = on;
        C.sv(s);
        if (master) {
          const ac = Sound.getCtx();
          master.gain.setValueAtTime(effVol(), ac.currentTime);
        }
        if (on) this.tryStart();
        else this.stop();
        updateMusicToggleUI();
      },
      setVolume(v) {
        volMul = Math.max(0, Math.min(1, v));
        const s = C.ld();
        s.musicVol = volMul;
        C.sv(s);
        if (master) {
          const ac = Sound.getCtx();
          master.gain.setValueAtTime(effVol(), ac.currentTime);
        }
      },
      duck() {
        if (!master) return;
        try {
          const ac = Sound.getCtx(),
            now = ac.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(Math.max(0.0001, effVol() * 0.35), now);
          master.gain.linearRampToValueAtTime(effVol(), now + 0.55);
        } catch (e) {}
      },
      init(enabled) {
        on = enabled !== false;
        const s = C.ld();
        if (s.musicVol != null) volMul = s.musicVol;
        if (s.sfxVol != null && Sound.setVolume) Sound.setVolume(s.sfxVol);
        updateMusicToggleUI();
      },
      updateTheme() {
        const nk = getThemeKey();
        if (nk === themeKey) return;
        // Crossfade curto: abaixa o master, troca o tema, sobe de novo
        const ac = Sound.getCtx();
        const now = ac.currentTime;
        const next = () => {
          themeKey = nk;
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          if (active && on && !hardMute) {
            if (master) {
              try {
                master.gain.cancelScheduledValues(ac.currentTime);
                master.gain.setValueAtTime(0.0001, ac.currentTime);
                master.gain.linearRampToValueAtTime(effVol(), ac.currentTime + 0.35);
              } catch (e) {}
            }
            playLoop();
          }
          updateMusicToggleUI();
        };
        if (master && active && on) {
          try {
            master.gain.cancelScheduledValues(now);
            master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
            master.gain.linearRampToValueAtTime(0.0001, now + 0.22);
          } catch (e) {}
          setTimeout(next, 230);
        } else {
          next();
        }
      },
      tryStart() {
        if (!on || active) return;
        active = true;
        themeKey = getThemeKey();
        playLoop();
      },
      stop() {
        active = false;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      pause() {
        if (master) {
          const ac = Sound.getCtx();
          master.gain.setValueAtTime(0, ac.currentTime);
        }
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      resume() {
        if (!on) return;
        if (master) {
          const ac = Sound.getCtx();
          master.gain.setValueAtTime(effVol(), ac.currentTime);
        }
        if (active && !timer) playLoop();
      },
    };
  })();

  const MUSIC_THEME_LABELS = {
    hub: 'Hub',
    infinite: 'Infinito',
    daily: 'Diário',
    time_challenge: 'Relâmpago',
  };

  /** Nome amigável da trilha: musicKey → label do mundo; senão tira o emoji do label legado. */
  function musicThemeLabel(theme) {
    if (MUSIC_THEME_LABELS[theme]) return MUSIC_THEME_LABELS[theme];
    const TBC = typeof window !== 'undefined' ? /** @type {any} */ (window).TBContent : null;
    if (TBC && typeof TBC.getWorlds === 'function') {
      const w = TBC.getWorlds().find((x) => x.musicKey === theme || x.id === theme);
      if (w && w.label) return w.label;
    }
    return theme.replace(/^[^\s]+\s/, '');
  }

  function updateMusicToggleUI() {
    const btn = document.getElementById('map-music-toggle');
    if (!btn) return;
    const on = Music.isOn();
    btn.textContent = on
      ? `🎵 Música: ${musicThemeLabel(Music.getTheme())}`
      : `🎵 Música: Desligada`;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  /** @type {any} */
  const g = global;
  g.Music = Music;
  g.MUSIC_THEMES = typeof MUSIC_THEMES !== 'undefined' ? MUSIC_THEMES : g.MUSIC_THEMES;
  g.updateMusicToggleUI = updateMusicToggleUI;
  g.TBMusic = { init, Music, updateMusicToggleUI, musicThemeLabel };
})(typeof window !== 'undefined' ? window : globalThis);
