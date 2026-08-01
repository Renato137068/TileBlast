import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function mapDom() {
  createMinimalDom();
  const extra = `
    <div id="map-lives"></div>
    <div id="map-coins"></div>
    <div id="map-hs"></div>
    <div id="map-regen"></div>
    <div id="map-hint"></div>
    <div id="map-grid"></div>
    <div id="map-scroll"></div>
    <div id="world-prog-name"></div>
    <div id="world-prog-pct"></div>
    <div id="world-prog-fill"></div>
    <div id="map-world-label"></div>
    <button id="map-worlds-btn"></button>
    <span id="shop-notif" style="display:none"></span>
  `;
  document.body.insertAdjacentHTML('beforeend', extra);
  if (!document.getElementById('map-play-btn')) {
    const b = document.createElement('button');
    b.id = 'map-play-btn';
    document.body.appendChild(b);
  }
}

function makeCfg(overrides = {}) {
  let save = { unlocked: 1, lives: 3, coachDone: true, stars: { 0: 2 } };
  return {
    ld: () => save,
    sv: (s) => {
      save = s;
    },
    t: (_k, f) => f,
    shopLocale: () => 'pt-BR',
    contentReady: () => false,
    getUnlocked: () => save.unlocked ?? 0,
    getLives: () => save.lives ?? 3,
    getCoins: () => 120,
    getHS: () => 4500,
    getStars: (i) => (save.stars && save.stars[i]) || 0,
    ML: 5,
    LIFE_REGEN_MS: 1800000,
    checkLifeRegen: vi.fn(),
    canWatchAd: () => false,
    startGame: vi.fn(),
    Sound: { click: vi.fn(), chest: vi.fn() },
    showToast: vi.fn(),
    showGlobalModal: vi.fn(),
    Mascot: { say: vi.fn() },
    locFeatName: (f) => f.name,
    ...overrides,
  };
}

const LEVELS = [
  {
    world: '🌱 Jardim',
    worldId: 'garden',
    name: 'Início',
    objectives: [{ type: 'score', target: 500 }],
  },
  {
    world: '🌱 Jardim',
    worldId: 'garden',
    name: 'Trilha',
    objectives: [{ type: 'color', color: 0, target: 8 }],
  },
  {
    world: '🌲 Floresta',
    worldId: 'forest',
    name: 'Gelo',
    objectives: [{ type: 'score', target: 800 }],
  },
];

describe('tb-map', () => {
  /** @type {any} */
  let Map;

  beforeEach(() => {
    delete globalThis.TBMap;
    delete globalThis.TBState;
    delete globalThis.TBLogic;
    delete globalThis.TBContent;
    mapDom();
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-map.js', {
      history: { pushState: vi.fn(), replaceState: vi.fn() },
      requestAnimationFrame: (cb) => cb(0),
    });
    Map = globalThis.TBMap;
    globalThis.TBState.LEVELS = LEVELS.slice();
    globalThis.TBState.lvIdx = 0;
  });

  it('updatePlayButton usa texto i18n da fase atual', () => {
    const cfg = makeCfg();
    cfg.ld().unlocked = 1;
    Map.init(cfg);
    Map.updateMapMeta();
    const btn = document.getElementById('map-play-btn');
    expect(btn.textContent).toContain('Jogar Fase 2');
    expect(btn.textContent).toContain('Trilha');
    expect(btn.dataset.level).toBe('1');
    expect(btn.dataset.complete).toBe('');
  });

  it('updatePlayButton mostra CTA de campanha completa', () => {
    const cfg = makeCfg();
    cfg.ld().unlocked = LEVELS.length;
    Map.init(
      makeCfg({
        getUnlocked: () => LEVELS.length,
        ld: () => ({ unlocked: LEVELS.length, lives: 5, coachDone: true, stars: {} }),
      })
    );
    Map.updateMapMeta();
    const btn = document.getElementById('map-play-btn');
    expect(btn.textContent).toBe('🎮 Abrir modos');
    expect(btn.dataset.complete).toBe('1');
    expect(btn.getAttribute('aria-label')).toContain('Campanha completa');
  });

  it('updateMapMeta / renderMap smoke com DOM mínimo', () => {
    const cfg = makeCfg();
    Map.init(cfg);
    expect(() => Map.renderMap()).not.toThrow();
    expect(document.getElementById('map-lives').textContent).toContain('♥');
    expect(document.getElementById('map-coins').textContent).toContain('120');
    expect(document.getElementById('map-hs').textContent).toMatch(/4[.\s\u00a0]?500/);
    const cards = document.querySelectorAll('#map-grid .lc');
    expect(cards.length).toBeGreaterThan(0);
    expect(document.querySelector('#map-grid .lc.cur')).toBeTruthy();
    Map.stopRegenInterval();
  });
});
