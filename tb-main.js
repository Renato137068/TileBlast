/* ═══════════════════════════════════════════════════════════════════════════
   TILE BLAST — SHELL PRINCIPAL (orquestração do jogo)
   ---------------------------------------------------------------------------
   Este script concentra o núcleo de gameplay (tabuleiro/canvas, HUD, loja,
   baús, missões, eventos, boot). Ele CONSOME os módulos carregados acima:

     • TBConfig  (tb-config.js)     — constantes/tabelas/thresholds/chaves
     • TBAudio   (tb-audio.js)      — Sound + Haptic  → aliases: Sound, Haptic
     • TBUI      (tb-ui.js)         — Toast + Modal    → showToast/showGlobalModal
     • TBLogic   (tb-game-logic.js) — regras puras (grupos, pontos, objetivos)
     • TBRoadmap (tb-roadmap.js)    — save, i18n (t), fases, progressão
     • TBMeta/TBJuice/TBFeatures/…  — meta, game-feel, features
     • TBShop  (tb-shop.js)     — loja (UI + soft/IAP/ads)
     • TBResult (tb-result.js)  — tela de resultado / vitória / continue
     • TBMap   (tb-map.js)      — mapa, mundos, cards de fase, meta UI
     • TBState (tb-state.js)    — estado de sessão (lvIdx, LEVELS, modos)

   Convenção de nomes: módulos globais em window.TB* (namespace TB); dentro
   deste shell mantêm-se aliases léxicos curtos (Sound, Haptic) nos call sites.

   NOTA ARQUITETURAL: a extração física de board/HUD para módulos próprios foi
   DEFERIDA de forma deliberada — esse núcleo é fortemente acoplado a globais do
   canvas e NÃO possui cobertura unitária (apenas e2e). Extraí-lo agora traria
   risco de regressão desproporcional ao ganho. A modularização priorizou
   primeiro o que tem baixo acoplamento (config, CSS, áudio, UI). Ver
   ARCHITECTURE.md ("Próximos passos") para o plano de continuação.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const APP_VERSION = '1.4.9';
window.APP_VERSION = APP_VERSION;
const IS_ANDROID = /Android/i.test(navigator.userAgent);
const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.() || window.AndroidBridge);
const IS_FILE_PROTOCOL = location.protocol === 'file:';
window.__lowEndDevice = IS_ANDROID && (navigator.deviceMemory ? navigator.deviceMemory <= 4 : true);
if (IS_FILE_PROTOCOL && !IS_NATIVE) {
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:200001;background:#b91c1c;color:#fff;padding:10px 14px;font:13px/1.45 system-ui,sans-serif;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.35)';
    bar.innerHTML =
      'Abra pelo servidor local: execute <b>JOGAR.bat</b> ou <code>npm run serve:pwa</code> — não abra o .html com duplo clique.';
    document.body.prepend(bar);
    document.documentElement.style.setProperty('--safe-top', '52px');
  });
}
window.__androidInsets = function (top, right, bottom, left, ime) {
  const r = document.documentElement;
  r.style.setProperty('--safe-top', (top || 0) + 'px');
  r.style.setProperty('--safe-right', (right || 0) + 'px');
  r.style.setProperty('--safe-bottom', (bottom || 0) + 'px');
  r.style.setProperty('--safe-left', (left || 0) + 'px');
  document.body.classList.toggle('keyboard-open', (ime || 0) > 0);
};
function _t(k, f) {
  if (window.TBRuntime && window.TBRuntime.t) return window.TBRuntime.t(k, f);
  return (window.TBRoadmap && TBRoadmap.t(k)) || f;
}

// ACCESSIBILITY → tb-a11y.js (TBA11y.init)
// kbFocus fica no main (estado compartilhado com input/board)
let kbFocus = { x: 0, y: 0, active: false };
let _nlmTimerInt = null;
// _loseTimerInt → TBResult (tb-result.js)

// hideResult / showResult / animateResultStars / showGameComplete / awardRandomPU
// → TBResult (tb-result.js); aliases globais mantidos para callers.

// ═══════════════════════════════════════════════════════════════
// GLOBAL MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════
function _clearModalTimers() {
  if (_nlmTimerInt) {
    clearInterval(_nlmTimerInt);
    _nlmTimerInt = null;
  }
}
// Modal global e Toast centralizados em tb-ui.js (window.TBUI).
function showGlobalModal(html, title = 'Diálogo') {
  return TBUI.showModal(html, title);
}
function closeGlobalModal() {
  _clearModalTimers();
  TBUI.closeModal();
}
function showCustomConfirm(msg, onOk) {
  showGlobalModal(
    `
    <div style="font-size:22px" aria-hidden="true">⚠️</div>
    <div style="font-size:16px;font-weight:700;">${msg}</div>
    <div style="display:flex;gap:12px;width:100%;">
      <button data-action="closeGlobalModal" class="btn btn-g" style="flex:1;font-size:14px;">${_t('cancel', 'Cancelar')}</button>
      <button id="gm-ok-btn" class="btn btn-p" style="flex:1;font-size:14px;">${_t('confirm', 'Confirmar')}</button>
    </div>
  `,
    _t('confirm_action', 'Confirmar ação')
  );
  document.getElementById('gm-ok-btn').addEventListener('click', () => {
    closeGlobalModal();
    onOk();
  });
}

// ═══════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK (navigator.vibrate + Capacitor Haptics)
// ═══════════════════════════════════════════════════════════════
// Áudio (Sound) e háptica (Haptic) centralizados em tb-audio.js (window.TBAudio).
const Haptic = TBAudio.Haptic;

// ═══════════════════════════════════════════════════════════════
// SOUND (Web Audio — zero assets)
// ═══════════════════════════════════════════════════════════════
const Sound = TBAudio.Sound;

// Music → tb-music.js (TBMusic.init)

// Mascot / dialogs extras → tb-dialogs.js

// SAVE / IAP / economia helpers / toast → tb-save.js (TBSave.init)
// Aliases: ld, sv, getLives, addCoins, applyIapPurchase, showToast, ML, IAP_META, …

// Achievements → tb-dialogs.js

// Modos (infinito / time / diário / seletor) → tb-modes.js (TBModes.init)
// Meta UI facade → tb-meta-ui.js (eventos/desafios em tb-events / tb-challenges)
// Aliases globais via TBMetaUI (registerEventDecorator, addXP, renderChestBar, …)

// AppTimers → tb-meta-ui.js

// Loja: implementação em tb-shop.js (TBShop). Aliases globais (openShop, shopBuyCoin…)
// são registrados pelo módulo; aqui só o init no boot.

/** @type {any} */
const PlayBridge = window.PlayBridge;

// checkLifeRegen / checkDailyReward → tb-dialogs.js

// Tutorial / coach → tb-dialogs.js

// Confetti → tb-dialogs.js

// ═══════════════════════════════════════════════════════════════
// LEVELS — carregados de data/ via TBContent.load() → TBState.LEVELS
// ═══════════════════════════════════════════════════════════════

function _contentReady() {
  return window.TBContent && TBContent.isLoaded();
}

async function loadGameContent() {
  if (!window.TBContent) throw new Error('TBContent não carregado');
  const s = ld();
  if (TBContent.migrateSave) {
    TBContent.migrateSave(s);
    sv(s);
  }
  const rc = getRemoteEconomyCfg();
  if (TBContent.applyRemoteOverrides) TBContent.applyRemoteOverrides(rc);
  await TBContent.load('data/', { unlocked: s.unlocked || 0 });
  TBState.LEVELS = TBContent.getLevels();
  _syncMissionPools();
  TBContent.loadAllPacks()
    .then(function () {
      TBState.LEVELS = TBContent.getLevels();
    })
    .catch(function () {});
  return TBState.LEVELS;
}

// getSelectedWorldId / openWorldSelect / grantWorldCompletionIfNeeded → TBMap

// Estado compartilhado dos modos (TBModes muta via getters/setters no init)
let isTimeChallengeMode = false,
  _timeLv = null,
  _timeTimer = null;
let _infLv = null;
let _dailyLv = null;

// MAP DOM
const sMap = document.getElementById('screen-map');
const sGame = document.getElementById('screen-game');
const sComp = document.getElementById('screen-complete');
const sShop = document.getElementById('screen-shop');
const sWorlds = document.getElementById('screen-worlds');
// Transição por contexto: mergulhar na fase, recuar para o mapa, subir no resultado.
const SCREEN_ENTER_ANIM = {
  'map>game': 'enter-dive',
  'complete>game': 'enter-dive',
  'game>map': 'enter-back',
  'complete>map': 'enter-back',
  'shop>map': 'enter-back',
  'worlds>map': 'enter-back',
  'game>complete': 'enter-rise',
  'map>shop': 'enter-side',
  'map>worlds': 'enter-side',
  'worlds>game': 'enter-dive',
};
const SCREEN_EL = { map: sMap, game: sGame, complete: sComp, shop: sShop, worlds: sWorlds };
let _prevScreen = null;

function applyScreenEnterAnim(id) {
  const el = SCREEN_EL[id];
  if (!el) return;
  el.classList.remove('enter-dive', 'enter-back', 'enter-rise', 'enter-side');
  const anim = _prevScreen && _prevScreen !== id ? SCREEN_ENTER_ANIM[_prevScreen + '>' + id] : null;
  if (anim) el.classList.add(anim);
  _prevScreen = id;
}

const showScreen = (id) => {
  applyScreenEnterAnim(id);
  sMap.classList.toggle('active', id === 'map');
  sGame.classList.toggle('active', id === 'game');
  sComp.classList.toggle('active', id === 'complete');
  sShop.classList.toggle('active', id === 'shop');
  if (sWorlds) sWorlds.classList.toggle('active', id === 'worlds');
  sMap.setAttribute('aria-hidden', id === 'map' ? 'false' : 'true');
  sGame.setAttribute('aria-hidden', id === 'game' ? 'false' : 'true');
  sComp.setAttribute('aria-hidden', id === 'complete' ? 'false' : 'true');
  sShop.setAttribute('aria-hidden', id === 'shop' ? 'false' : 'true');
  if (sWorlds) sWorlds.setAttribute('aria-hidden', id === 'worlds' ? 'false' : 'true');
  // inert nas telas inativas: remove foco/teclado delas (resolve avisos aria-hidden).
  sMap.inert = id !== 'map';
  sGame.inert = id !== 'game';
  sComp.inert = id !== 'complete';
  sShop.inert = id !== 'shop';
  if (sWorlds) sWorlds.inert = id !== 'worlds';
  document.body.style.overflow = id === 'game' ? 'hidden' : '';
  if (id === 'game') {
    setTimeout(() => canvas.focus(), 120);
    // Recalcula o tabuleiro agora que a tela de jogo está visível e mensurável
    // (o dimensionamento sensível à altura precisa do layout real).
    if (window.TBFx && typeof TBFx.layoutBoard === 'function') {
      requestAnimationFrame(() => TBFx.layoutBoard());
    }
  }
  Music.updateTheme();
  updateMusicToggleUI();
};

// FEATURE_UNLOCKS / renderMap / updateMapMeta / startRegenInterval → TBMap (tb-map.js)

document.getElementById('map-settings-toggle').addEventListener('click', () => {
  const panel = document.getElementById('map-settings-panel');
  const open = panel.classList.toggle('open');
  const btn = document.getElementById('map-settings-toggle');
  btn.textContent = open ? '✕ Fechar configurações' : '⚙️ Configurações';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    const more = document.getElementById('map-more-panel');
    const moreBtn = document.getElementById('map-more-toggle');
    if (more) {
      more.classList.remove('open');
      more.hidden = true;
    }
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
    panel.scrollTop = 0;
    const first = panel.querySelector('button, input');
    if (first) setTimeout(() => /** @type {HTMLElement} */ (first).focus(), 60);
  } else {
    btn.focus();
  }
});

document.getElementById('map-more-toggle')?.addEventListener('click', () => {
  const panel = document.getElementById('map-more-panel');
  const btn = document.getElementById('map-more-toggle');
  if (!panel || !btn) return;
  const open = !panel.classList.contains('open');
  panel.classList.toggle('open', open);
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const label = btn.querySelector('.map-more-label');
  if (label) label.textContent = open ? '✕ Fechar' : '⋯ Mais';
  if (open) {
    document.getElementById('map-settings-panel')?.classList.remove('open');
    const setBtn = document.getElementById('map-settings-toggle');
    if (setBtn) {
      setBtn.setAttribute('aria-expanded', 'false');
      setBtn.textContent = '⚙️ Configurações';
    }
    panel.scrollTop = 0;
    const first = panel.querySelector('button:not(.feat-locked)');
    if (first) setTimeout(() => /** @type {HTMLElement} */ (first).focus(), 60);
  } else {
    btn.focus();
  }
});

document.getElementById('map-music-toggle').addEventListener('click', () => {
  Sound.click();
  Music.setOn(!Music.isOn());
});

document.getElementById('map-reset').addEventListener('click', () => {
  showCustomConfirm(
    'Resetar todo o progresso?<br><small style="color:var(--dim)">Esta ação não pode ser desfeita.</small>',
    () => {
      resetAll();
      document.getElementById('map-settings-panel').classList.remove('open');
      document.getElementById('map-settings-toggle').textContent = '⚙️ Configurações';
      renderMap();
    }
  );
});

// ═══════════════════════════════════════════════════════════════
// GAME CONSTANTS (responsive)
// ═══════════════════════════════════════════════════════════════
// Constantes centralizadas em tb-config.js (window.TBConfig). Valores idênticos
// aos originais; nomes léxicos preservados para não impactar os call sites.
const GW = TBConfig.GW,
  GH = TBConfig.GH,
  TC = TBConfig.TC,
  PPB = TBConfig.PPB,
  CMT = TBConfig.CMT,
  CMM = TBConfig.CMM,
  CHT = TBConfig.CHT,
  CHM = TBConfig.CHM;
// Limiares dos especiais rebaixados (#5): o Arco-íris (8) agora aparece de forma
// realista num tabuleiro 8x8/6 cores; Bomba(4)/Foguete(6) surgem com mais frequência.
const BOMB_T = TBConfig.BOMB_T,
  ROCKET_T = TBConfig.ROCKET_T,
  RAINBOW_T = TBConfig.RAINBOW_T;
const SP = TBConfig.SP;
// Obstáculos (#1): ícones e ordem de "vida" padrão.
const OBS_ICON = TBConfig.OBS_ICON;
const COLORS = TBConfig.COLORS;
const ICONS = TBConfig.ICONS;
const COINS_STAR = TBEconomy.COINS_STAR;
const PU_DEFS = [
  { id: 'bomb', label: '💣', desc: 'Bomba' },
  { id: 'rainbow', label: '🌈', desc: 'Arco-íris' },
  { id: 'moves', label: '+5', desc: '+Movimentos' },
  { id: 'shuffle', label: '🔀', desc: 'Embaralhar' },
];

// Responsive canvas size (atualizado em layoutBoard ao rotacionar/redimensionar)
let CELL, BPX, dpr;

// Estado do jogo (declarado antes de layoutBoard — relayoutGridBlocks usa grid)
let grid = [],
  pops = [],
  score = 0,
  movesLeft = 0,
  busy = false,
  over = false;
// lvIdx / isInfiniteMode / isDailyPuzzleMode → TBState (tb-state.js)
// _infLv / _dailyLv / isTimeChallengeMode → declarados junto aos modos (acima)
let colorProgress = {},
  pendingPU = '',
  over_used_continue = false;
// Progresso de obstáculos/coleta (#1) keyed por tipo: ice/crate/collect/cover.
let obsProgress = {},
  coverGrid = null;
let _lastLossNear = false;
let comboTimer = null,
  noMvTimer = null,
  rafActive = false;
// Perf: flag de "efeitos reduzidos" recalculada 1x por frame em draw().
// Quando TBJuice detecta FPS baixo sustentado (<45fps), desliga sombras caras do
// canvas (drop-shadow dos blocos e glow das partículas) para recuperar 60 FPS.
// Em dispositivos capazes, permanece false → aparência 100% preservada.
let _fxLow = false;
let particles = [];
let floaters = [];
let _prevHudScore = 0;
let _bgCache = null;
let shakeUntil = 0,
  shakeAmp = 0;
let hoverCells = new Set(),
  hoverSz = 0;
let hintCells = new Set();
let hoverMX = 0,
  hoverMY = 0;
let ripple = null;

// Touch device detection
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ═══════════════════════════════════════════════════════════════
// CANVAS SETUP + FX → tb-fx.js (TBFx.init + bindLayout)
// ═══════════════════════════════════════════════════════════════
const canvas = document.getElementById('board');
// Perf: contexto opaco (alpha:false). O fundo do tabuleiro (_bgCache) cobre 100%
// do canvas a cada frame e o border-radius é aplicado via CSS, então desativar o
// canal alpha economiza composição na GPU sem qualquer mudança visual.
const ctx = canvas.getContext('2d', { alpha: false });

function _fxCfg() {
  return {
    get CELL() {
      return CELL;
    },
    set CELL(v) {
      CELL = v;
    },
    get BPX() {
      return BPX;
    },
    set BPX(v) {
      BPX = v;
    },
    get dpr() {
      return dpr;
    },
    set dpr(v) {
      dpr = v;
    },
    get GW() {
      return GW;
    },
    get GH() {
      return GH;
    },
    get CHT() {
      return CHT;
    },
    get IS_ANDROID() {
      return IS_ANDROID;
    },
    get canvas() {
      return canvas;
    },
    get ctx() {
      return ctx;
    },
    get grid() {
      return grid;
    },
    get pops() {
      return pops;
    },
    get particles() {
      return particles;
    },
    set particles(v) {
      particles = v;
    },
    get floaters() {
      return floaters;
    },
    set floaters(v) {
      floaters = v;
    },
    get _bgCache() {
      return _bgCache;
    },
    set _bgCache(v) {
      _bgCache = v;
    },
    get shakeAmp() {
      return shakeAmp;
    },
    set shakeAmp(v) {
      shakeAmp = v;
    },
    get shakeUntil() {
      return shakeUntil;
    },
    set shakeUntil(v) {
      shakeUntil = v;
    },
    ld,
    get getActiveEvent() {
      return getActiveEvent;
    },
    get requestDraw() {
      return requestDraw;
    },
  };
}
if (window.TBFx) {
  TBFx.init(_fxCfg());
  TBFx.bindLayout();
}

// START LEVEL / HUD / win-loss / countdown → tb-start.js (TBStart.init)
// GRID → tb-grid.js (TBGrid.init)
// Modos (daily/infinite/time) → tb-modes.js (TBModes.init)
// showNoLivesModal → tb-dialogs.js | showResult → tb-result.js

// ═══════════════════════════════════════════════════════════════
// Gameplay (grupos/clique/especiais/PU/gravidade) → tb-gameplay.js
// Aliases: handleClick, getGroup, removeGroup, addScore, buildPUBar, …

// ═══════════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════════
// Canvas paint → tb-board.js (TBBoard.init + aliases draw/requestDraw/boardClearFinale)

// ═══════════════════════════════════════════════════════════════
// INPUT → tb-input.js (TBInput.init + TBInput.bind)
// ═══════════════════════════════════════════════════════════════
function goToMap(reason) {
  if (window.TBInput) return TBInput.goToMap(reason);
}
function handleAppBack() {
  return window.TBInput ? TBInput.handleAppBack() : false;
}
window.handleAppBack = handleAppBack;

// ═══════════════════════════════════════════════════════════════
// DATA-ACTION — allowlist para TBUI.bindActionDelegation
// ═══════════════════════════════════════════════════════════════
function registerTBActions() {
  if (!window.TBUI || !TBUI.registerActions) return;
  const n = (a) => (a == null || a === '' ? NaN : Number(a));
  TBUI.registerActions({
    closeGlobalModal: () => closeGlobalModal(),
    openMissionsModal: () => openMissionsModal(),
    shopBuyCoin: (arg) => shopBuyCoin(arg),
    shopBuyIAP: (arg) => shopBuyIAP(arg),
    shopAdReward: (arg) => shopAdReward(arg),
    shopBuyDailyDeal: () => shopBuyDailyDeal(),
    purchaseSubscription: (arg) =>
      window.TBRoadmap && TBRoadmap.purchaseSubscription && TBRoadmap.purchaseSubscription(arg),
    claimMission: (arg) => claimMission(n(arg)),
    claimWeeklyMission: (arg) => claimWeeklyMission(n(arg)),
    switchMissionTab: (arg, _a2, el) => _switchMissionTab(arg, el),
    closeAndStartInfinite: () => {
      closeGlobalModal();
      startInfiniteMode();
    },
    closeInfiniteGoMap: () => {
      closeGlobalModal();
      TBState.isInfiniteMode = false;
      goToMap();
    },
    closeAndRestartTimeChallenge: () => {
      closeGlobalModal();
      isTimeChallengeMode = false;
      startTimeChallengeMode();
    },
    closeTimeChallengeGoMap: () => {
      closeGlobalModal();
      isTimeChallengeMode = false;
      goToMap();
    },
    closeAndGoMap: () => {
      closeGlobalModal();
      goToMap();
    },
    collSetTab: (arg) => _collSetTab(arg),
    equipColl: (tab, id) => _equipColl(tab, id),
    openChest: (arg) => openChest(n(arg)),
    openChestModal: (arg) => openChestModal(n(arg)),
    startChestUnlock: (arg) => _startChestUnlock(n(arg)),
    skipChestFree: (arg) => skipChestFree(n(arg)),
    skipChestTimer: (arg) => skipChestTimer(n(arg)),
    skipChestTimer_idle: (arg) => skipChestTimer_idle(n(arg)),
    closeTutorialAndStart: () => closeTutorialAndStart(),
    onboardingNext: () => onboardingNext(),
    skipOnboarding: () => skipOnboarding(),
    setLanguage: (arg) => {
      if (window.TBRoadmap) TBRoadmap.setLanguage(arg);
      closeGlobalModal();
    },
    savePlayerName: () => window.TBRoadmap && TBRoadmap.savePlayerName(),
    buyBpPremium: () => window.TBRoadmap && TBRoadmap.buyBpPremium(),
    breakPiggy: () => window.TBRoadmap && TBRoadmap.breakPiggy(),
    claimDynamicOffer: () => window.TBRoadmap && TBRoadmap.claimDynamicOffer(),
    claimFlash: () => window.TBRoadmap && TBRoadmap.claimFlash(),
    dismissChangelog: () => window.TBRoadmap && TBRoadmap.dismissChangelog(),
    resumeSession: () => window.TBRoadmap && TBRoadmap.resumeSession(),
    clearSessionGoMap: () => {
      if (window.TBRoadmap) TBRoadmap.clearSession();
      closeGlobalModal();
    },
    openPlayerNameModal: () => window.TBRoadmap && TBRoadmap.openPlayerNameModal(),
    shareWeekly: () => window.TBFeatures && TBFeatures.shareWeekly(),
    startDailyPuzzle: () => window.TBGlobal && TBGlobal.startDailyPuzzle(),
    shareDailyScore: (arg) => window.TBGlobal && TBGlobal.shareDailyScore(n(arg)),
    shareSocialChallenge: (arg) => {
      const phase = Number(arg);
      const idx = Number.isFinite(phase) && phase > 0 ? phase - 1 : 0;
      if (window.TBGlobal && TBGlobal.shareChallengeLink) TBGlobal.shareChallengeLink(idx);
    },
    installPwa: () => window.TBGlobal && TBGlobal.installPwa(),
    openStoreRating: () => window.TBGlobal && TBGlobal.openStoreRating(),
    metaBuild: (arg) => window.TBMeta && TBMeta.doBuild(arg),
    metaRush: (arg) => window.TBMeta && TBMeta.doRush(arg),
    openMode: (id) => {
      if (id === 'time_challenge') {
        closeGlobalModal();
        startTimeChallengeMode();
      } else if (id === 'infinite') {
        closeGlobalModal();
        openInfiniteModal();
      } else if (id === 'daily_challenge') {
        closeGlobalModal();
        openChallengeModal();
      } else if (id === 'classic_blast') {
        closeGlobalModal();
        showToast('💥', 'Classic Blast', 'Toque em uma fase no mapa!');
      } else {
        closeGlobalModal();
      }
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════

/**
 * Junta objetos de cfg preservando getters/setters (spread os avaliaria).
 * @param {...Record<string, any>} objs
 * @returns {Record<string, any>}
 */
function _mergeCfg(...objs) {
  const out = {};
  for (const o of objs) Object.defineProperties(out, Object.getOwnPropertyDescriptors(o));
  return out;
}

/**
 * Estado mutável de sessão compartilhado pelos módulos de gameplay.
 * Getters/setters mantêm as `let` de tb-main como fonte única da verdade.
 */
function _sessionCfg() {
  return {
    get score() {
      return score;
    },
    set score(v) {
      score = v;
    },
    get movesLeft() {
      return movesLeft;
    },
    set movesLeft(v) {
      movesLeft = v;
    },
    get busy() {
      return busy;
    },
    set busy(v) {
      busy = v;
    },
    get over() {
      return over;
    },
    set over(v) {
      over = v;
    },
    get pendingPU() {
      return pendingPU;
    },
    set pendingPU(v) {
      pendingPU = v;
    },
    get over_used_continue() {
      return over_used_continue;
    },
    set over_used_continue(v) {
      over_used_continue = v;
    },
    get _prevHudScore() {
      return _prevHudScore;
    },
    set _prevHudScore(v) {
      _prevHudScore = v;
    },
    get colorProgress() {
      return colorProgress;
    },
    set colorProgress(v) {
      colorProgress = v;
    },
    get obsProgress() {
      return obsProgress;
    },
    set obsProgress(v) {
      obsProgress = v;
    },
    get coverGrid() {
      return coverGrid;
    },
    set coverGrid(v) {
      coverGrid = v;
    },
    get particles() {
      return particles;
    },
    set particles(v) {
      particles = v;
    },
    get floaters() {
      return floaters;
    },
    set floaters(v) {
      floaters = v;
    },
    get hoverCells() {
      return hoverCells;
    },
    set hoverCells(v) {
      hoverCells = v;
    },
    get hoverSz() {
      return hoverSz;
    },
    set hoverSz(v) {
      hoverSz = v;
    },
    get hintCells() {
      return hintCells;
    },
    set hintCells(v) {
      hintCells = v;
    },
    get _dailyLv() {
      return _dailyLv;
    },
    set _dailyLv(v) {
      _dailyLv = v;
    },
    get _infLv() {
      return _infLv;
    },
    set _infLv(v) {
      _infLv = v;
    },
    get isTimeChallengeMode() {
      return isTimeChallengeMode;
    },
    set isTimeChallengeMode(v) {
      isTimeChallengeMode = v;
    },
    get _timeLv() {
      return _timeLv;
    },
    set _timeLv(v) {
      _timeLv = v;
    },
    get _timeTimer() {
      return _timeTimer;
    },
    set _timeTimer(v) {
      _timeTimer = v;
    },
  };
}

async function bootApp() {
  _initCoreModules();

  try {
    await loadGameContent();
  } catch (err) {
    console.error('[TileBlast] Falha ao carregar conteúdo data/', err);
  }

  registerTBActions();

  if (window.TBFirebase && typeof TBFirebase.onEconomyReconcile === 'function') {
    TBFirebase.onEconomyReconcile(reconcileServerEconomy);
  }

  _initScreenModules();
  _initGameplayModules();

  if (window.TBRuntime && typeof TBRuntime.loadDeferredModules === 'function') {
    try {
      await TBRuntime.loadDeferredModules();
    } catch (err) {
      TBRuntime.warn('deferred', err);
    }
  }

  _initMetaModules();
  _bindAudioAndBanners();
  _runPostInit();
}

/** Módulos que não dependem do conteúdo de data/ (save, fx, bridge, diálogos). */
function _initCoreModules() {
  if (window.TBFx) TBFx.init(_fxCfg());

  if (window.TBSave)
    TBSave.init({
      _t,
      showGlobalModal,
      get triggerShake() {
        return triggerShake;
      },
      get unlockWorldSkin() {
        return unlockWorldSkin;
      },
      get _locCollName() {
        return _locCollName;
      },
    });

  if (window.TBA11y)
    TBA11y.init({
      get ok() {
        return ok;
      },
      get grid() {
        return grid;
      },
      SP,
      get getGroup() {
        return getGroup;
      },
      get kbFocus() {
        return kbFocus;
      },
      set kbFocus(v) {
        kbFocus = v;
      },
      IS_TOUCH,
      get hoverCells() {
        return hoverCells;
      },
      set hoverCells(v) {
        hoverCells = v;
      },
      get hoverSz() {
        return hoverSz;
      },
      set hoverSz(v) {
        hoverSz = v;
      },
      get requestDraw() {
        return requestDraw;
      },
    });

  if (window.TBPlayBridge)
    TBPlayBridge.init({
      applyIapPurchase,
      get IAP_META() {
        return IAP_META;
      },
      refreshShopUI,
      updateMapMeta,
      showToast,
      _t,
      checkAchievements,
      ld,
      sv,
      IS_NATIVE,
    });

  if (window.TBMusic)
    TBMusic.init({
      get sGame() {
        return sGame;
      },
      ld,
      sv,
      get getUnlocked() {
        return getUnlocked;
      },
    });
  if (window.TBAds)
    TBAds.init({
      ld,
      sv,
      _localToday,
      showGlobalModal,
      closeGlobalModal,
      _t,
      IS_NATIVE,
      get PlayBridge() {
        return PlayBridge;
      },
      Sound,
      Haptic,
      showToast,
    });
  if (window.TBDialogs)
    TBDialogs.init({
      _t,
      ld,
      sv,
      showToast,
      showGlobalModal,
      closeGlobalModal,
      getCoins,
      getUnlocked,
      IS_NATIVE,
      IS_TOUCH,
      Sound,
      Haptic,
      get updateMapHint() {
        return updateMapHint;
      },
      get showCountdown() {
        return showCountdown;
      },
      get _lv() {
        return _lv;
      },
      get _reduceMotion() {
        return _reduceMotion;
      },
      LIFE_REGEN_MS,
      ML,
      get canWatchAd() {
        return canWatchAd;
      },
      get showRewardedAd() {
        return showRewardedAd;
      },
      setLives,
      getLives,
      _localToday,
      addCoins,
      get unlockWorldSkin() {
        return unlockWorldSkin;
      },
      get _locCollName() {
        return _locCollName;
      },
      get applyEquipped() {
        return applyEquipped;
      },
      get openShop() {
        return openShop;
      },
      get updateMapMeta() {
        return updateMapMeta;
      },
    });

  if (window.TBMetaUI)
    TBMetaUI.init({
      _t,
      ld,
      sv,
      showToast,
      showGlobalModal,
      closeGlobalModal,
      _shopLocale,
      Sound,
      Haptic,
      get spawnConfetti() {
        return spawnConfetti;
      },
      get _reduceMotion() {
        return _reduceMotion;
      },
      get _contentReady() {
        return _contentReady;
      },
      showRewardedAd,
      get showScreen() {
        return showScreen;
      },
      get showNoLivesModal() {
        return showNoLivesModal;
      },
      get showCountdown() {
        return showCountdown;
      },
      get updateHUD() {
        return updateHUD;
      },
      get buildPUBar() {
        return buildPUBar;
      },
      get buildGrid() {
        return buildGrid;
      },
      get hideResult() {
        return hideResult;
      },
      checkAchievements,
      Mascot,
      addCoins,
      addPU,
      getLives,
      getUnlocked,
      hasNoAds,
      get PU_DEFS() {
        return PU_DEFS;
      },
      WORLD_SKIN_MAP,
      TBAnalytics,
    });
}

/** Telas: loja, resultado e mapa. Dependem do conteúdo já carregado. */
function _initScreenModules() {
  if (window.TBShop)
    TBShop.init({
      ld,
      t: _t,
      Sound,
      showScreen,
      getCoins,
      addCoins,
      addPU,
      getLives,
      setLives,
      ML,
      PU_DEFS,
      SHOP_COIN_PRICES,
      IAP_META,
      getRemoteEconomyCfg,
      getIAPMeta,
      hasNoAds,
      getAdState,
      getAdDailyLimit,
      canWatchAd,
      showCustomConfirm,
      showGlobalModal,
      closeGlobalModal,
      showToast,
      showRewardedAd,
      PlayBridge,
      applyIapPurchase,
      checkAchievements,
      checkLifeRegen,
      updateMapMeta,
    });

  if (window.TBResult)
    TBResult.init({
      ld,
      t: _t,
      shopLocale: _shopLocale,
      Sound,
      Mascot,
      showScreen,
      getCoins,
      addCoins,
      addPU,
      addChest,
      addXP,
      getLives,
      getHS,
      getScore: () => score,
      getLastLossNear: () => _lastLossNear,
      getOverUsedContinue: () => over_used_continue,
      setOverUsedContinue: (v) => {
        over_used_continue = v;
      },
      setOver: (v) => {
        over = v;
      },
      setBusy: (v) => {
        busy = v;
      },
      addMovesLeft: (n) => {
        movesLeft += n;
      },
      _lv,
      COINS_STAR,
      PU_DEFS,
      CHEST_DEFS,
      XP_DEFS,
      LIFE_REGEN_MS,
      locChestLabel: _locChestLabel,
      updateChallengeProgress,
      checkAchievements,
      showToast,
      showRewardedAd,
      canWatchAd,
      spawnConfetti,
      announce,
      updateHUD,
      checkLifeRegen,
      triggerShake,
      get colorProgress() {
        return colorProgress;
      },
      get obsProgress() {
        return obsProgress;
      },
      ICONS,
      COLORS,
      OBS_ICON,
    });

  if (window.TBMap)
    TBMap.init({
      ld,
      sv,
      t: _t,
      shopLocale: _shopLocale,
      Sound,
      Mascot,
      showScreen,
      showToast,
      showGlobalModal,
      getCoins,
      addCoins,
      addPU,
      getLives,
      getHS,
      getUnlocked,
      getStars,
      ML,
      LIFE_REGEN_MS,
      contentReady: _contentReady,
      checkLifeRegen,
      canWatchAd,
      locFeatName: _locFeatName,
      startGame,
    });
}

/** Tabuleiro, grid, start/HUD, modos, gameplay e input. */
function _initGameplayModules() {
  if (window.TBBoard)
    TBBoard.init({
      get ctx() {
        return ctx;
      },
      get canvas() {
        return canvas;
      },
      get CELL() {
        return CELL;
      },
      get BPX() {
        return BPX;
      },
      get dpr() {
        return dpr;
      },
      get GW() {
        return GW;
      },
      get GH() {
        return GH;
      },
      get grid() {
        return grid;
      },
      get pops() {
        return pops;
      },
      get particles() {
        return particles;
      },
      get floaters() {
        return floaters;
      },
      get coverGrid() {
        return coverGrid;
      },
      get hoverCells() {
        return hoverCells;
      },
      get hoverSz() {
        return hoverSz;
      },
      get hintCells() {
        return hintCells;
      },
      set hintCells(v) {
        hintCells = v;
      },
      get hoverMX() {
        return hoverMX;
      },
      get hoverMY() {
        return hoverMY;
      },
      get kbFocus() {
        return kbFocus;
      },
      get ripple() {
        return ripple;
      },
      set ripple(v) {
        ripple = v;
      },
      get rafActive() {
        return rafActive;
      },
      set rafActive(v) {
        rafActive = v;
      },
      get _fxLow() {
        return _fxLow;
      },
      set _fxLow(v) {
        _fxLow = v;
      },
      get _bgCache() {
        return _bgCache;
      },
      set _bgCache(v) {
        _bgCache = v;
      },
      get movesLeft() {
        return movesLeft;
      },
      get over() {
        return over;
      },
      get shakeUntil() {
        return shakeUntil;
      },
      get shakeAmp() {
        return shakeAmp;
      },
      get sGame() {
        return sGame;
      },
      get score() {
        return score;
      },
      set score(v) {
        score = v;
      },
      PPB,
      SP,
      COLORS,
      BOMB_T,
      ROCKET_T,
      RAINBOW_T,
      CHT,
      gatherBlast,
      spawnParticles,
      spawnConfetti,
      triggerShake,
      updateHUD,
      showComboBurst,
      calcGroupPts,
      Sound,
      Haptic,
      get requestDraw() {
        return requestDraw;
      },
    });

  if (window.TBGrid)
    TBGrid.init({
      get grid() {
        return grid;
      },
      set grid(v) {
        grid = v;
      },
      get pops() {
        return pops;
      },
      set pops(v) {
        pops = v;
      },
      get coverGrid() {
        return coverGrid;
      },
      set coverGrid(v) {
        coverGrid = v;
      },
      get kbFocus() {
        return kbFocus;
      },
      set kbFocus(v) {
        kbFocus = v;
      },
      get CELL() {
        return CELL;
      },
      get GW() {
        return GW;
      },
      get GH() {
        return GH;
      },
      TC,
      SP,
      get _lv() {
        return _lv;
      },
      get hasMoves() {
        return hasMoves;
      },
      get shuffleTypes() {
        return shuffleTypes;
      },
      get isBlocked() {
        return isBlocked;
      },
      get requestDraw() {
        return requestDraw;
      },
    });

  if (window.TBStart)
    TBStart.init(
      _mergeCfg(_sessionCfg(), {
        get _lastLossNear() {
          return _lastLossNear;
        },
        set _lastLossNear(v) {
          _lastLossNear = v;
        },
        get canvas() {
          return canvas;
        },
        get sGame() {
          return sGame;
        },
        get grid() {
          return grid;
        },
        get kbFocus() {
          return kbFocus;
        },
        get CELL() {
          return CELL;
        },
        get BPX() {
          return BPX;
        },
        ICONS,
        COLORS,
        OBS_ICON,
        COINS_STAR,
        Sound,
        Haptic,
        get Music() {
          return Music;
        },
        ld,
        sv,
        _t,
        _shopLocale,
        getLives,
        getCoins,
        getUnlocked,
        addCoins,
        loseLive,
        completeLevel,
        stopRegenInterval,
        setGameSeed,
        hideResult,
        showNoLivesModal,
        showTutorial,
        maybeShowCoach,
        showScreen,
        updateMusicToggleUI,
        buildPUBar,
        buildGrid,
        boardClearFinale,
        showResult,
        announce,
        describeCell,
        _contentReady,
        getEconomyCoinMult,
        getActiveEvent,
        updateMissionProgress,
        updateChallengeProgress,
        _infAdvanceRound,
        _infGameOver,
      })
    );

  if (window.TBModes)
    TBModes.init(
      _mergeCfg(_sessionCfg(), {
        get canvas() {
          return canvas;
        },
        Sound,
        get Music() {
          return Music;
        },
        ld,
        sv,
        _t,
        _shopLocale,
        getLives,
        addCoins,
        showNoLivesModal,
        hideResult,
        showGlobalModal,
        showToast,
        showScreen,
        updateHUD,
        buildPUBar,
        buildGrid,
        setGameSeed,
        showCountdown,
        stopRegenInterval,
        goToMap,
        _contentReady,
        getActiveEvent,
        addXP,
        updateMissionProgress,
        updateChallengeProgress,
      })
    );

  if (window.TBGameplay)
    TBGameplay.init({
      get grid() {
        return grid;
      },
      set grid(v) {
        grid = v;
      },
      get pops() {
        return pops;
      },
      get score() {
        return score;
      },
      set score(v) {
        score = v;
      },
      get movesLeft() {
        return movesLeft;
      },
      set movesLeft(v) {
        movesLeft = v;
      },
      get busy() {
        return busy;
      },
      set busy(v) {
        busy = v;
      },
      get over() {
        return over;
      },
      set over(v) {
        over = v;
      },
      get CELL() {
        return CELL;
      },
      get BPX() {
        return BPX;
      },
      get GW() {
        return GW;
      },
      get GH() {
        return GH;
      },
      SP,
      COLORS,
      ICONS,
      OBS_ICON,
      Sound,
      Haptic,
      get requestDraw() {
        return requestDraw;
      },
      spawnParticles,
      spawnFloater,
      spawnConfetti,
      triggerShake,
      get updateHUD() {
        return updateHUD;
      },
      get checkWin() {
        return checkWin;
      },
      get resolveWin() {
        return resolveWin;
      },
      get resolveLoss() {
        return resolveLoss;
      },
      calcGroupPts,
      get getActiveEvent() {
        return getActiveEvent;
      },
      BOMB_T,
      ROCKET_T,
      RAINBOW_T,
      CHT,
      CMT,
      CMM,
      CHM,
      PPB,
      TC,
      ok,
      rnd,
      mkB,
      get _lv() {
        return _lv;
      },
      get colorProgress() {
        return colorProgress;
      },
      set colorProgress(v) {
        colorProgress = v;
      },
      get obsProgress() {
        return obsProgress;
      },
      set obsProgress(v) {
        obsProgress = v;
      },
      get coverGrid() {
        return coverGrid;
      },
      set coverGrid(v) {
        coverGrid = v;
      },
      get particles() {
        return particles;
      },
      set particles(v) {
        particles = v;
      },
      get floaters() {
        return floaters;
      },
      set floaters(v) {
        floaters = v;
      },
      get hoverCells() {
        return hoverCells;
      },
      set hoverCells(v) {
        hoverCells = v;
      },
      get hoverSz() {
        return hoverSz;
      },
      set hoverSz(v) {
        hoverSz = v;
      },
      get hintCells() {
        return hintCells;
      },
      set hintCells(v) {
        hintCells = v;
      },
      get sGame() {
        return sGame;
      },
      get _reduceMotion() {
        return _reduceMotion;
      },
      get hoverMX() {
        return hoverMX;
      },
      set hoverMX(v) {
        hoverMX = v;
      },
      get hoverMY() {
        return hoverMY;
      },
      set hoverMY(v) {
        hoverMY = v;
      },
      get pendingPU() {
        return pendingPU;
      },
      set pendingPU(v) {
        pendingPU = v;
      },
      get comboTimer() {
        return comboTimer;
      },
      set comboTimer(v) {
        comboTimer = v;
      },
      get noMvTimer() {
        return noMvTimer;
      },
      set noMvTimer(v) {
        noMvTimer = v;
      },
      get canvas() {
        return canvas;
      },
      get PU_DEFS() {
        return PU_DEFS;
      },
      getPUCount,
      usePU,
      addPU,
      get addXP() {
        return addXP;
      },
      get XP_DEFS() {
        return XP_DEFS;
      },
      get updateMissionProgress() {
        return updateMissionProgress;
      },
      get updateChallengeProgress() {
        return updateChallengeProgress;
      },
      announce,
      syncKbHover,
      get kbFocus() {
        return kbFocus;
      },
      set kbFocus(v) {
        kbFocus = v;
      },
      litHex,
      get _fxLow() {
        return _fxLow;
      },
      set _fxLow(v) {
        _fxLow = v;
      },
      IS_TOUCH,
      _t,
      ld,
      sv,
      showToast,
      getCoins,
      addCoins,
      TBAnalytics,
      get isTimeChallengeMode() {
        return isTimeChallengeMode;
      },
      get boardClearFinale() {
        return boardClearFinale;
      },
      get dismissCoachHint() {
        return dismissCoachHint;
      },
      get resolveDailyPuzzleEnd() {
        return resolveDailyPuzzleEnd;
      },
      get _rand() {
        return _rand;
      },
    });

  if (window.TBInput) {
    TBInput.init({
      get canvas() {
        return canvas;
      },
      get BPX() {
        return BPX;
      },
      get CELL() {
        return CELL;
      },
      get sGame() {
        return sGame;
      },
      get sComp() {
        return sComp;
      },
      get sShop() {
        return sShop;
      },
      get sWorlds() {
        return sWorlds;
      },
      get sMap() {
        return sMap;
      },
      get busy() {
        return busy;
      },
      set busy(v) {
        busy = v;
      },
      get over() {
        return over;
      },
      set over(v) {
        over = v;
      },
      get kbFocus() {
        return kbFocus;
      },
      set kbFocus(v) {
        kbFocus = v;
      },
      GW,
      GH,
      handleClick,
      syncKbHover,
      announce,
      describeCell,
      get grid() {
        return grid;
      },
      IS_TOUCH,
      get hoverCells() {
        return hoverCells;
      },
      set hoverCells(v) {
        hoverCells = v;
      },
      get hoverSz() {
        return hoverSz;
      },
      set hoverSz(v) {
        hoverSz = v;
      },
      get hintCells() {
        return hintCells;
      },
      set hintCells(v) {
        hintCells = v;
      },
      requestDraw,
      get ripple() {
        return ripple;
      },
      set ripple(v) {
        ripple = v;
      },
      ok,
      COLORS,
      getGroup,
      SP,
      get hoverMX() {
        return hoverMX;
      },
      set hoverMX(v) {
        hoverMX = v;
      },
      get hoverMY() {
        return hoverMY;
      },
      set hoverMY(v) {
        hoverMY = v;
      },
      get isTimeChallengeMode() {
        return isTimeChallengeMode;
      },
      set isTimeChallengeMode(v) {
        isTimeChallengeMode = v;
      },
      get _dailyLv() {
        return _dailyLv;
      },
      set _dailyLv(v) {
        _dailyLv = v;
      },
      get _timeLv() {
        return _timeLv;
      },
      set _timeLv(v) {
        _timeLv = v;
      },
      get _timeTimer() {
        return _timeTimer;
      },
      setGameSeed,
      hideResult,
      dismissCoachHint,
      stopRegenInterval,
      checkLifeRegen,
      renderMap,
      showScreen,
      updateMusicToggleUI,
      announceNewUnlocks,
      startGame,
      ld,
      sv,
      _t,
      get PlayBridge() {
        return PlayBridge;
      },
      showToast,
      showGlobalModal,
      openShop,
      openCollectionModal,
      openChallengeModal,
      startTimeChallengeMode,
      openModesModal,
      openWorldSelect,
      updateMapMeta,
      closeLevelUpCelebration,
      cancelRewardedAd,
      closeGlobalModal,
      trapModalFocus,
      layoutBoard,
      startRegenInterval,
      flushSave,
      Sound,
      get Music() {
        return Music;
      },
      get Mascot() {
        return Mascot;
      },
      get pendingPU() {
        return pendingPU;
      },
      set pendingPU(v) {
        pendingPU = v;
      },
    });
    TBInput.bind();
  }
}

/** Roadmap, global, features, meta e push. */
function _initMetaModules() {
  TBRoadmap.init({
    ld,
    sv,
    getCoins,
    addCoins,
    addPU,
    getUnlocked,
    getHS,
    getLives,
    hasNoAds,
    showGlobalModal,
    closeGlobalModal,
    showToast,
    showScreen,
    refreshShopUI,
    updateMapMeta,
    renderMap,
    IAP_META,
    applyIapPurchase,
    ACHIEVEMENTS,
    LEVELS: TBState.LEVELS,
    SK,
    ML,
    AD_DAILY_LIMIT,
    checkAchievements,
    updateMusicToggleUI,
    PlayBridge,
    grid,
    getGroup,
    requestDraw,
    GW,
    GH,
    startGame,
    startInfiniteMode,
    shopBuyIAP,
    openShop,
    addPU,
    showNoLivesModal,
    startDailyPuzzleGame,
    goToMap,
  });

  TBGlobal.init({
    ld,
    sv,
    getCoins,
    addCoins,
    getUnlocked,
    getLives,
    showGlobalModal,
    closeGlobalModal,
    showToast,
    startDailyPuzzleGame,
    showNoLivesModal,
    updateMapMeta,
    checkAchievements,
  });

  TBFeatures.init({
    ld,
    sv,
    getCoins,
    addCoins,
    getUnlocked,
    getLives,
    showGlobalModal,
    closeGlobalModal,
    showToast,
    startGame,
    LEVELS: TBState.LEVELS,
    requestDraw,
    Sound,
    checkAchievements,
  });

  if (window.TBMeta)
    TBMeta.init({
      ld,
      sv,
      getCoins,
      addCoins,
      addChest,
      showGlobalModal,
      closeGlobalModal,
      showToast,
      updateMapMeta,
      Sound,
    });

  if (window.TBPush) TBPush.init({ ld, sv });
}

/** Estado inicial de áudio e listeners do banner de evento. */
function _bindAudioAndBanners() {
  Sound.setMuted(!!ld().muted);
  Music.init(ld().musicOn !== false);
  // Mute unificado + preferência de vibração persistidas
  if (ld().muted && Music.setMuted) Music.setMuted(true);
  if (Haptic.setEnabled) Haptic.setEnabled(!ld().hapticsOff);
  const _muteBtn = document.getElementById('hud-mute');
  if (_muteBtn) {
    _muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
    _muteBtn.setAttribute('aria-label', Sound.isMuted() ? 'Ativar som' : 'Silenciar som');
  }

  const _evBanner = document.getElementById('event-banner');
  if (_evBanner) {
    _evBanner.addEventListener('click', () => openEventModal());
    _evBanner.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEventModal();
      }
    });
  }
}

/** Timers, sincronizações de meta e primeira renderização do mapa. */
function _runPostInit() {
  AppTimers.start();
  checkLifeRegen();
  // Fila de Callables econômicos (shadow) — nunca bloqueia o boot.
  if (window.TBFirebase && typeof TBFirebase.flushCallableQueue === 'function') {
    TBFirebase.flushCallableQueue().catch(function () {});
  }
  checkDailyReward();
  checkAchievements();
  getDailyMissions();
  getWeeklyMissions();
  _updateMissionsNotif();
  getChests();
  syncWorldSkins();
  renderChestBar();
  renderXPBar();
  renderEventBanner();
  applyEquipped();
  getDailyChallengeState();
  renderChallengeNotif();
  renderMap();
  updateMapMeta();
  announceNewUnlocks();
  showScreen('map');
  history.replaceState({ screen: 'map' }, '');
  if (window.TBAnalytics && typeof TBAnalytics.markBootReady === 'function') {
    TBAnalytics.markBootReady({
      deferred: window.TBRuntime && TBRuntime.deferredLoaded ? TBRuntime.deferredLoaded() : [],
    });
  }
}

bootApp();

requestAnimationFrame(() => {
  setTimeout(
    () => {
      const sp = document.getElementById('splash');
      if (sp) {
        sp.classList.add('hide');
        sp.setAttribute('aria-hidden', 'true');
      }
      Mascot.say(Mascot.TIPS[0], 6000);
    },
    IS_NATIVE ? 350 : 900
  );
});
setTimeout(() => {
  const sp = document.getElementById('splash');
  if (sp && !sp.classList.contains('hide')) {
    sp.classList.add('hide');
    sp.setAttribute('aria-hidden', 'true');
  }
}, 5000);

function _unlockAudio() {
  Sound.getCtx();
  Music.tryStart();
}
document.addEventListener('pointerdown', _unlockAudio, { once: true });
document.addEventListener('keydown', _unlockAudio, { once: true });

if ('serviceWorker' in navigator && !IS_NATIVE) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
