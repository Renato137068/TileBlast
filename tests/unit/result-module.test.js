import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const LEVEL = {
  world: '🌲 Floresta',
  name: 'Clareira',
  objectives: [
    { type: 'score', target: 1000 },
    { type: 'color', color: 1, target: 10 },
  ],
};

function resultDom() {
  document.body.innerHTML = `
    <div id="result" aria-hidden="true"></div>
    <div id="res-em"></div>
    <div id="res-st"></div>
    <div id="res-rewards"></div>
    <div id="res-ti"></div>
    <div id="res-su"></div>
    <button id="res-next"></button>
    <button id="res-retry"></button>
    <button id="res-share"></button>
    <button id="res-challenge"></button>
    <div id="res-continues"></div>
    <div id="complete-score"></div>
    <div id="screen-complete"></div>
    <div id="complete-heading"></div>
  `;
}

function makeCfg(overrides = {}) {
  let save = { lifeRegenAt: null };
  return {
    ld: () => save,
    sv: (s) => {
      save = s;
    },
    t: (_k, f) => f,
    shopLocale: () => 'pt-BR',
    Sound: {
      star: vi.fn(),
      coin: vi.fn(),
      click: vi.fn(),
      levelUp: vi.fn(),
    },
    Mascot: {
      resultHtml: (mood) => `<div data-mood="${mood}">mascot</div>`,
    },
    showScreen: vi.fn(),
    getCoins: () => 200,
    addCoins: vi.fn(),
    getLives: () => 3,
    getHS: () => 9000,
    getScore: () => 800,
    getLastLossNear: () => false,
    getOverUsedContinue: () => true,
    setOver: vi.fn(),
    setBusy: vi.fn(),
    setOverUsedContinue: vi.fn(),
    addMovesLeft: vi.fn(),
    updateHUD: vi.fn(),
    canWatchAd: () => false,
    showRewardedAd: vi.fn(),
    showToast: vi.fn(),
    announce: vi.fn(),
    spawnConfetti: vi.fn(),
    triggerShake: vi.fn(),
    checkLifeRegen: vi.fn(),
    addPU: vi.fn(),
    addXP: vi.fn(),
    addChest: vi.fn(() => false),
    checkAchievements: vi.fn(),
    updateChallengeProgress: vi.fn(),
    locChestLabel: (_t, label) => label,
    _lv: () => LEVEL,
    COINS_STAR: [0, 15, 25, 40],
    PU_DEFS: [{ id: 'bomb', label: '💣', desc: 'Bomba' }],
    CHEST_DEFS: { bronze: { icon: '📦', label: 'Bronze' } },
    XP_DEFS: { win: [0, 20, 35, 50], score_per_1000: 5 },
    LIFE_REGEN_MS: 1800000,
    colorProgress: { 1: 9 },
    obsProgress: {},
    ICONS: ['🔴', '🔵', '🟢'],
    COLORS: ['#f00', '#00f', '#0f0'],
    OBS_ICON: { ice: '🧊' },
    ...overrides,
  };
}

describe('tb-result', () => {
  /** @type {any} */
  let R;

  beforeEach(() => {
    delete globalThis.TBResult;
    delete globalThis.TBState;
    delete globalThis.TBEconomy;
    delete globalThis.TBLogic;
    resultDom();
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-economy.js');
    mountModule('tb-result.js');
    globalThis.TBState.LEVELS = [LEVEL, { ...LEVEL, name: 'Seguinte' }];
    globalThis.TBState.lvIdx = 0;
    globalThis.TBState.isInfiniteMode = false;
    globalThis.TBState.isDailyPuzzleMode = false;
    R = globalThis.TBResult;
  });

  it('hideResult remove classes e esconde o painel', () => {
    const el = document.getElementById('result');
    el.classList.add('show', 'result--near', 'result--lose');
    document.getElementById('res-retry').classList.add('res-retry--pulse');
    R.init(makeCfg());
    R.hideResult();
    expect(el.classList.contains('show')).toBe(false);
    expect(el.classList.contains('result--near')).toBe(false);
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(document.getElementById('res-retry').classList.contains('res-retry--pulse')).toBe(false);
  });

  it('animateResultStars monta 3 estrelas e ilumina conforme count', () => {
    const cfg = makeCfg();
    R.init(cfg);
    R.animateResultStars(2);
    const spans = document.querySelectorAll('#res-st .res-star');
    expect(spans).toHaveLength(3);
    expect(spans[0].textContent).toBe('★');
    expect(spans[1].textContent).toBe('★');
    expect(spans[2].textContent).toBe('☆');
    expect(spans[0].classList.contains('gold')).toBe(true);
    expect(spans[2].classList.contains('dim')).toBe(true);
  });

  it('showResult(false) near-miss renderiza gap HTML dos objetivos', () => {
    const cfg = makeCfg({
      getLastLossNear: () => true,
      getScore: () => 900,
      colorProgress: { 1: 9 },
    });
    R.init(cfg);
    R.showResult(false, 0);
    const rewards = document.getElementById('res-rewards').innerHTML;
    expect(rewards).toContain('Faltou pouco!');
    expect(rewards).toContain('res-obj-list');
    expect(rewards).toContain('900/1000');
    expect(rewards).toContain('9/10');
    expect(rewards).toContain('−1');
    expect(document.getElementById('res-ti').textContent).toBe('Faltou pouco!');
    expect(document.getElementById('res-su').textContent).toMatch(/quase lá/i);
    expect(document.getElementById('result').classList.contains('result--near')).toBe(true);
    expect(document.getElementById('res-retry').classList.contains('res-retry--pulse')).toBe(true);
    expect(document.getElementById('res-em').innerHTML).toContain('data-mood="think"');
  });

  it('showResult(false) normal loss mostra derrota sem gap HTML', () => {
    const cfg = makeCfg({
      getLastLossNear: () => false,
      getLives: () => 2,
      getScore: () => 120,
    });
    R.init(cfg);
    R.showResult(false, 0);
    expect(document.getElementById('res-rewards').innerHTML).toBe('');
    expect(document.getElementById('res-ti').textContent).toBe('Sem movimentos!');
    expect(document.getElementById('res-su').textContent).toContain('Meta não atingida');
    expect(document.getElementById('result').classList.contains('result--lose')).toBe(true);
    expect(document.getElementById('result').classList.contains('result--near')).toBe(false);
    expect(document.getElementById('res-em').innerHTML).toContain('data-mood="sad"');
    expect(document.getElementById('res-next').style.display).toBe('none');
    expect(document.getElementById('res-retry').style.display).not.toBe('none');
    expect(cfg.setOver).toHaveBeenCalledWith(true);
    expect(cfg.announce).toHaveBeenCalled();
  });
});
