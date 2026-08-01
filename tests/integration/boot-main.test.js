import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import { projectRoot } from '../helpers/load-module.js';

// Ordem do manifesto (scripts/modules.mjs) até imediatamente antes de tb-main.
const MODULES = [
  'tb-config.js',
  'tb-state.js',
  'tb-economy.js',
  'tb-content.js',
  'tb-audio.js',
  'tb-analytics.js',
  'tb-ui.js',
  'tb-game-logic.js',
  'firebase-config.js',
  'tb-firebase.js',
  'tb-remote.js',
  'tb-i18n.js',
  'tb-achievements.js',
  'tb-offers.js',
  'tb-social.js',
  'tb-retention.js',
  'tb-roadmap.js',
  'tb-global.js',
  'tb-features.js',
  'tb-push.js',
  'tb-meta.js',
  'tb-juice.js',
  'tb-runtime.js',
  'tb-secure.js',
  'tb-save.js',
  'tb-shop.js',
  'tb-result.js',
  'tb-map.js',
  'tb-board.js',
  'tb-xp.js',
  'tb-collection.js',
  'tb-chests.js',
  'tb-missions.js',
  'tb-events.js',
  'tb-challenges.js',
  'tb-meta-ui.js',
  'tb-gameplay.js',
  'tb-music.js',
  'tb-ads.js',
  'tb-playbridge.js',
  'tb-dialogs.js',
  'tb-start.js',
  'tb-grid.js',
  'tb-modes.js',
  'tb-a11y.js',
  'tb-fx.js',
  'tb-input.js',
];

/**
 * Executa um script clássico no CONTEXTO ATUAL (não num sandbox isolado), para
 * que refs cruas entre módulos (`TBContent`, `Sound`, …) resolvam no globalThis
 * compartilhado — como no navegador. Filename file:// preserva a atribuição de
 * cobertura do provider v8 (ver tests/helpers/load-module.js).
 */
function runInGlobal(relPath) {
  const abs = join(projectRoot, relPath);
  const code = readFileSync(abs, 'utf8');
  vm.runInThisContext(code, { filename: pathToFileURL(abs).href });
}

const snapshot = {};
let bootError = null;

/** Nó de áudio genérico: qualquer acesso/chamada devolve outro nó; sets são
 * ignorados; `.value` é 0. Cobre toda a superfície Web Audio usada sem lançar. */
function audioNodeProxy() {
  const fn = function () {
    return audioNodeProxy();
  };
  return new Proxy(fn, {
    apply: () => audioNodeProxy(),
    get: (_t, prop) => {
      if (prop === 'value') return 0;
      if (prop === Symbol.toPrimitive) return () => 0;
      return audioNodeProxy();
    },
    set: () => true,
  });
}

function installBrowserStubs() {
  const win = globalThis.window || globalThis;
  // Web Audio ausente em happy-dom → stub no-op para tb-audio/tb-music.
  const AC = function AudioContext() {
    return audioNodeProxy();
  };
  win.AudioContext = AC;
  win.webkitAudioContext = AC;
  globalThis.AudioContext = AC;
  // fetch → 404 resolvido (sem sockets/ECONNREFUSED); callers tratam !ok.
  const stubFetch = () =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: { get: () => null },
    });
  globalThis.fetch = stubFetch;
  win.fetch = stubFetch;
  if (!globalThis.matchMedia) {
    globalThis.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
  if (win && !win.matchMedia) win.matchMedia = globalThis.matchMedia;
}

async function bootFullApp() {
  const html = readFileSync(join(projectRoot, 'tile_blast.html'), 'utf8');
  const bodyInner = html
    .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  document.body.innerHTML = bodyInner;

  installBrowserStubs();

  for (const m of MODULES) runInGlobal(m);
  runInGlobal('tb-main.js');

  // Deixa os awaits do bootApp (loadGameContent/deferred) assentarem.
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 20));

  // Smoke dos pontos de entrada registrados (render/navegação/modais): cada um
  // defensivo. Exercita handlers data-action que o boot define mas não dispara,
  // cobrindo caminhos reais de UI sem depender de interação.
  const ENTRY_POINTS = [
    'updateHUD',
    'buildPUBar',
    'refreshPUBar',
    'renderMap',
    'updateMapMeta',
    'updateMapHint',
    'applyProgressiveUI',
    'announceNewUnlocks',
    'renderXPBar',
    'renderChestBar',
    'renderEventBanner',
    'renderChallengeNotif',
    'refreshShopUI',
    'refreshShopOffers',
    'openShop',
    'openMissionsModal',
    'openCollectionModal',
    'openModesModal',
    'openInfiniteModal',
    'checkLifeRegen',
    'checkDailyReward',
    'hideResult',
    'goToMap',
  ];
  snapshot.exercised = 0;
  for (const name of ENTRY_POINTS) {
    const fn = globalThis[name];
    if (typeof fn !== 'function') continue;
    try {
      fn();
      snapshot.exercised++;
    } catch {
      /* ponto de entrada pode exigir estado específico — ok ignorar aqui */
    }
  }

  // Snapshot ANTES do beforeEach global (tests/setup.js) reescrever os globais.
  snapshot.appVersion = globalThis.APP_VERSION;
  snapshot.hasBoard = !!globalThis.TBBoard;
  snapshot.hasGameplay = !!globalThis.TBGameplay;
  snapshot.hasMap = !!globalThis.TBMap;
  snapshot.hasSave = !!globalThis.TBSave;
  snapshot.hasStart = !!globalThis.TBStart;
  snapshot.actionsRegistered =
    typeof globalThis.openShop === 'function' || typeof globalThis.goToMap === 'function';
  snapshot.levels = Array.isArray(globalThis.TBState?.LEVELS)
    ? globalThis.TBState.LEVELS.length
    : 0;
}

describe('boot completo do app (tb-main)', () => {
  beforeAll(async () => {
    try {
      await bootFullApp();
    } catch (err) {
      bootError = err;
    }
  });

  it('não lança durante a sequência de boot', () => {
    expect(bootError).toBeNull();
  });

  it('tb-main define APP_VERSION = 1.4.9 no boot', () => {
    expect(snapshot.appVersion).toBe('1.4.9');
  });

  it('monta os módulos de tela e jogo no globalThis', () => {
    expect(snapshot.hasBoard).toBe(true);
    expect(snapshot.hasGameplay).toBe(true);
    expect(snapshot.hasMap).toBe(true);
    expect(snapshot.hasSave).toBe(true);
    expect(snapshot.hasStart).toBe(true);
  });

  it('registra as ações globais data-action (registerTBActions rodou)', () => {
    expect(snapshot.actionsRegistered).toBe(true);
  });

  it('exercita os pontos de entrada de UI sem derrubar o app', () => {
    expect(snapshot.exercised).toBeGreaterThanOrEqual(8);
  });
});
