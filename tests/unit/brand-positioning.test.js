import { describe, expect, it, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule, projectRoot } from '../helpers/load-module.js';

describe('P2.3 brand positioning', () => {
  it('PT/EN/ES compartilham a assinatura mecânica (especiais por tamanho)', () => {
    createMinimalDom();
    mountModule('tb-i18n.js');
    const { pt, en, es } = TBI18n.I18N;
    expect(pt.brand_signature).toMatch(/maior o grupo.*maior o especial/i);
    expect(en.brand_signature).toMatch(/bigger the group.*bigger the special/i);
    expect(es.brand_signature).toMatch(/mayor el grupo.*mayor el especial/i);
    expect(pt.splash_sub).toBe(pt.brand_signature);
    expect(en.splash_sub).toBe(en.brand_signature);
    expect(es.splash_sub).toBe(es.brand_signature);
    expect(pt.map_sub).toContain('maior o especial');
    expect(pt.brand_proof_specials).toMatch(/4.*6.*8/);
    expect(pt.first_win_title).toBeTruthy();
  });

  it('Play short-desc PT testa a hipótese de aquisição da assinatura', () => {
    const short = readFileSync(
      join(projectRoot, 'play-store/listing/pt-BR/short-description.txt'),
      'utf8'
    ).trim();
    expect(short.length).toBeLessThanOrEqual(80);
    expect(short).toMatch(/Quanto maior o grupo, maior o especial/);
  });
});

describe('P2.3 primeira vitória demonstra assinatura', () => {
  const LEVEL = {
    world: '🌲',
    name: 'Aquecimento',
    objectives: [{ type: 'score', target: 500 }],
  };

  beforeEach(() => {
    delete globalThis.TBResult;
    delete globalThis.TBState;
    document.body.innerHTML = `
      <div id="result"></div><div id="res-em"></div><div id="res-st"></div>
      <div id="res-rewards"></div><div id="res-ti"></div><div id="res-su"></div>
      <button id="res-next"></button><button id="res-retry"></button>
      <button id="res-share"></button><button id="res-challenge"></button>
      <div id="res-continues"></div>
      <div id="complete-score"></div><div id="screen-complete"></div><div id="complete-heading"></div>
    `;
    mountModule('tb-config.js');
    mountModule('tb-game-logic.js');
    mountModule('tb-state.js');
    mountModule('tb-economy.js');
    mountModule('tb-result.js');
    TBState.LEVELS = [LEVEL, { ...LEVEL, name: 'Seguinte' }];
    TBState.lvIdx = 0;
    TBState.isInfiniteMode = false;
    TBState.isDailyPuzzleMode = false;
  });

  it('showResult com _pendingFirstWin exibe frase + prova 4/6/8', () => {
    const cfg = {
      ld: () => ({}),
      sv: vi.fn(),
      t: (_k, f) => f,
      shopLocale: () => 'pt-BR',
      Sound: { star: vi.fn(), coin: vi.fn(), click: vi.fn(), levelUp: vi.fn() },
      Mascot: { resultHtml: () => 'm' },
      showScreen: vi.fn(),
      getCoins: () => 0,
      addCoins: vi.fn(),
      getLives: () => 3,
      getHS: () => 0,
      getScore: () => 400,
      getLastLossNear: () => false,
      getOverUsedContinue: () => false,
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
      _pendingFirstWin: true,
      COINS_STAR: [0, 15, 25, 40],
      PU_DEFS: [],
      CHEST_DEFS: { bronze: { icon: '📦', label: 'Bronze' } },
      XP_DEFS: { win: [0, 20, 35, 50], score_per_1000: 5 },
      LIFE_REGEN_MS: 1,
      colorProgress: {},
      obsProgress: {},
      ICONS: [],
      COLORS: [],
      OBS_ICON: {},
    };
    TBResult.init(cfg);
    TBResult.showResult(true, 2);
    expect(document.getElementById('res-ti').textContent).toBe('Primeira explosão!');
    expect(document.getElementById('res-su').textContent).toMatch(/maior o grupo/i);
    expect(document.getElementById('res-rewards').innerHTML).toContain('res-chip--brand');
    expect(cfg._pendingFirstWin).toBe(false);
  });
});
