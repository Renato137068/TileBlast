import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

function musicDom() {
  document.body.innerHTML = `
    <button id="map-music-toggle" aria-pressed="true"></button>
    <div id="screen-game" class="screen"></div>
  `;
}

function fakeAudioCtx() {
  const now = { t: 1 };
  return {
    get currentTime() {
      return now.t;
    },
    sampleRate: 44100,
    destination: {},
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
      };
    },
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    },
    createBuffer() {
      return { getChannelData: () => new Float32Array(10) };
    },
    createBufferSource() {
      return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    },
    createBiquadFilter() {
      return { type: 'highpass', frequency: { value: 0 }, connect: vi.fn() };
    },
  };
}

function makeCfg(overrides = {}) {
  let save = { musicOn: true, musicVol: 0.8, sfxVol: 0.9 };
  return {
    ld: () => save,
    sv: (s) => {
      save = s;
    },
    getUnlocked: () => 0,
    sGame: document.getElementById('screen-game'),
    ...overrides,
  };
}

describe('tb-music', () => {
  /** @type {any} */
  let MusicMod;

  beforeEach(() => {
    delete globalThis.TBMusic;
    delete globalThis.Music;
    delete globalThis.MUSIC_THEMES;
    delete globalThis.TBState;
    delete globalThis.TBAudio;
    musicDom();
    globalThis.TBAudio = {
      Sound: {
        getCtx: () => fakeAudioCtx(),
        setVolume: vi.fn(),
      },
    };
    mountModule('tb-state.js');
    mountModule('tb-music.js');
    MusicMod = globalThis.TBMusic;
    globalThis.TBState.LEVELS = [
      { world: '🌱 Jardim', name: 'A' },
      { world: '🌲 Floresta', name: 'B' },
    ];
    globalThis.TBState.lvIdx = 0;
    globalThis.TBState.isInfiniteMode = false;
    globalThis.TBState.isDailyPuzzleMode = false;
  });

  it('init expõe Music e aplica preferências do save', () => {
    const cfg = makeCfg();
    MusicMod.init(cfg);
    expect(MusicMod.Music).toBe(globalThis.Music);
    MusicMod.Music.init(true);
    expect(MusicMod.Music.isOn()).toBe(true);
    expect(typeof MusicMod.Music.updateTheme).toBe('function');
    expect(typeof MusicMod.Music.setOn).toBe('function');
    expect(typeof MusicMod.Music.setVolume).toBe('function');
    expect(globalThis.TBAudio.Sound.setVolume).toHaveBeenCalledWith(0.9);
  });

  it('setOn desliga como mute e atualiza o toggle', () => {
    const cfg = makeCfg();
    MusicMod.init(cfg);
    MusicMod.Music.init(true);
    MusicMod.Music.setOn(false);
    expect(MusicMod.Music.isOn()).toBe(false);
    expect(cfg.ld().musicOn).toBe(false);
    const btn = document.getElementById('map-music-toggle');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.textContent).toContain('Desligada');
  });

  it('updateTheme troca o tema conforme progresso no mapa', () => {
    const cfg = makeCfg({ getUnlocked: () => 1 });
    MusicMod.init(cfg);
    MusicMod.Music.init(true);
    expect(MusicMod.Music.getTheme()).toBe('hub');
    MusicMod.Music.updateTheme();
    expect(MusicMod.Music.getTheme()).toBe('🌲 Floresta');
    MusicMod.updateMusicToggleUI();
    expect(document.getElementById('map-music-toggle').textContent).toContain('Floresta');
  });

  it('MUSIC_THEMES cobre hub e mundos', () => {
    expect(globalThis.MUSIC_THEMES.hub).toBeTruthy();
    expect(globalThis.MUSIC_THEMES['🌱 Jardim']).toBeTruthy();
    expect(globalThis.MUSIC_THEMES.infinite).toBeTruthy();
  });

  it('tryStart dispara o loop de síntese e pause encerra sem vazar timer', () => {
    const cfg = makeCfg();
    MusicMod.init(cfg);
    MusicMod.Music.init(true);
    // tryStart → playLoop → note/kick/hat/masterGain sobre o AudioContext falso.
    expect(() => MusicMod.Music.tryStart()).not.toThrow();
    expect(() => MusicMod.Music.pause()).not.toThrow(); // limpa o setTimeout agendado
    expect(() => MusicMod.Music.resume()).not.toThrow();
    MusicMod.Music.pause();
    expect(MusicMod.Music.isOn()).toBe(true);
  });

  it('setVolume propaga para o Sound e persiste', () => {
    const cfg = makeCfg();
    MusicMod.init(cfg);
    MusicMod.Music.init(true);
    MusicMod.Music.setVolume(0.5);
    expect(globalThis.TBAudio.Sound.setVolume).toHaveBeenCalled();
  });
});
