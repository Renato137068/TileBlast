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

/** Contexto 2D no-op: métodos desconhecidos viram funções vazias; setTransform e
 * ellipse existem (a guarda do tb-board exige) e medidas devolvem valores seguros. */
function canvas2dProxy() {
  const grad = { addColorStop() {} };
  return new Proxy(
    { __canvas: null },
    {
      get(t, p) {
        if (p === 'canvas') return t.__canvas;
        if (p === 'measureText') return () => ({ width: 0 });
        if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (
          p === 'createLinearGradient' ||
          p === 'createRadialGradient' ||
          p === 'createConicGradient' ||
          p === 'createPattern'
        ) {
          return () => grad;
        }
        if (p in t) return t[p];
        return () => {};
      },
      set(t, p, v) {
        t[p] = v;
        return true;
      },
    }
  );
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

  // Canvas 2D ausente/incompleto em happy-dom → contexto no-op para tb-board
  // (draw usa clearRect/setTransform/… e lançaria em ctx nulo dentro do rAF).
  const Canvas = globalThis.HTMLCanvasElement || win.HTMLCanvasElement;
  if (Canvas) {
    Canvas.prototype.getContext = function getContext(type) {
      if (type !== '2d') return null;
      const ctx = canvas2dProxy();
      ctx.__canvas = this;
      return ctx;
    };
  }

  // Element.animate ausente em happy-dom → stub que dispara onfinish (deixa a
  // finalização de vitória/animações sequenciadas prosseguir e cobrir os callbacks).
  const El = globalThis.Element || win.Element;
  if (El && !El.prototype.animate) {
    El.prototype.animate = function animate() {
      const a = {
        cancel() {},
        finish() {},
        play() {},
        pause() {},
        addEventListener() {},
        removeEventListener() {},
      };
      Object.defineProperty(a, 'onfinish', {
        configurable: true,
        get() {
          return null;
        },
        set(fn) {
          if (typeof fn === 'function') setTimeout(fn, 0);
        },
      });
      return a;
    };
  }
  // fetch → serve os arquivos reais de data/ do disco (sem sockets), para o
  // conteúdo/níveis carregarem e o boot poder iniciar uma partida real.
  const resp = (ok, status, text) => ({
    ok,
    status,
    json: () => (ok ? Promise.resolve(JSON.parse(text)) : Promise.reject(new Error('404'))),
    text: () => Promise.resolve(ok ? text : ''),
    headers: { get: () => null },
  });
  const stubFetch = (url) => {
    const m = String(url).match(/data\/(.+)$/);
    if (m) {
      try {
        const file = join(projectRoot, 'data', m[1].split(/[?#]/)[0]);
        return Promise.resolve(resp(true, 200, readFileSync(file, 'utf8')));
      } catch {
        /* arquivo inexistente → 404 abaixo */
      }
    }
    return Promise.resolve(resp(false, 404, ''));
  };
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

/**
 * Inicia uma fase real e a joga: clica na grade 8x8 (dispara grupos, cascatas,
 * gravidade, especiais) e força ambos os desfechos. Cobre tb-start (startGame,
 * win/loss), tb-gameplay (handleClick, gatherBlast, gravity, settle) e tb-board.
 */
async function playMatch() {
  snapshot.levelsLoaded = globalThis.TBState?.LEVELS?.length || 0;
  snapshot.moves = 0;
  snapshot.resolvedWin = false;
  snapshot.resolvedLoss = false;
  const startGame = globalThis.startGame;
  if (typeof startGame !== 'function' || !snapshot.levelsLoaded) return;

  // Fase > 0 evita o galho de tutorial (que trava com busy=true no nível 0).
  try {
    startGame(2);
  } catch {
    /* */
  }
  // launch é async (ensureIndexLoaded) e o countdown segura busy ~3,5s.
  await new Promise((r) => setTimeout(r, 4200));

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      try {
        globalThis.handleClick(x, y);
        snapshot.moves++;
      } catch {
        /* célula pode estar bloqueada/animando — ok */
      }
      await new Promise((r) => setTimeout(r, 12)); // deixa a cascata assentar
    }
  }

  for (const name of ['hasMoves', 'reshuffleBoard', 'shuffleTypes', 'checkWin', 'calcStars']) {
    try {
      globalThis[name]?.();
    } catch {
      /* */
    }
  }
  try {
    globalThis.resolveWin();
    snapshot.resolvedWin = true;
  } catch {
    /* */
  }
  await new Promise((r) => setTimeout(r, 150));
  try {
    globalThis.resolveLoss();
    snapshot.resolvedLoss = true;
  } catch {
    /* */
  }
  await new Promise((r) => setTimeout(r, 150));
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

  await playMatch();

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

  it('carrega os níveis reais de data/ no boot', () => {
    expect(snapshot.levelsLoaded).toBeGreaterThan(0);
  });

  it('joga uma partida: clica na grade e resolve win/loss', () => {
    expect(snapshot.moves).toBeGreaterThanOrEqual(60);
    expect(snapshot.resolvedWin).toBe(true);
    expect(snapshot.resolvedLoss).toBe(true);
  });
});
