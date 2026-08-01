// @ts-check
/**
 * Tile Blast — modos de jogo (infinito, time challenge, puzzle diário, seletor).
 * Isolado de tb-main; dependências via TBModes.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBModesCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBContent = global.TBContent;
  /** @type {any} */
  const TBJuice = global.TBJuice;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBGlobal = global.TBGlobal;
  /** @type {any} */
  const TBAnalytics = global.TBAnalytics;

  /** @type {any} */
  let C = null;

  let infRound = 1;
  let infTotalScore = 0;
  let _timeLeft = 0;
  let _timeRound = 1;

  /** @param {TBModesCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function makeInfiniteLevel(round) {
    const p = TBLogic.infiniteLevelParams(round);
    return {
      world: C._t('inf_world', '♾️ Infinito'),
      name: C._t('inf_round_name', 'Rodada {n}').replace('{n}', String(round)),
      moves: p.moves,
      objectives: [{ type: 'score', target: p.target }],
    };
  }

  function startInfiniteMode() {
    if (C.getLives() <= 0) {
      C.showNoLivesModal();
      return;
    }
    TBState.isInfiniteMode = true;
    TBState.isMasteryMode = false;
    infRound = 1;
    infTotalScore = 0;
    C._infLv = makeInfiniteLevel(1);
    TBState.lvIdx = 0;
    C.score = 0;
    C.movesLeft = C._infLv.moves;
    C.busy = false;
    C.over = false;
    C.pendingPU = '';
    C.over_used_continue = false;
    C._prevHudScore = 0;
    C.canvas.classList.remove('targeting');
    document.querySelectorAll('.pu-btn').forEach((b) => b.classList.remove('targeting'));
    C.hideResult();
    C.colorProgress = {};
    C.obsProgress = {};
    C.coverGrid = null;
    C.particles = [];
    C.floaters = [];
    C.hoverCells = new Set();
    C.hoverSz = 0;
    if (TBJuice) TBJuice.reset();
    if (typeof C.applyPlayTheme === 'function') C.applyPlayTheme(C._infLv);
    else if (global.TBStart) global.TBStart.applyPlayTheme(C._infLv);
    C.updateHUD();
    C.buildPUBar();
    C.buildGrid();
    C.showScreen('game');
    history.pushState({ screen: 'game', lvIdx: -1 }, '');
    C.showCountdown(C._infLv);
  }

  function _infAdvanceRound() {
    infTotalScore += C.score;
    const s = C.ld();
    if (infTotalScore > (s.inf?.best || 0)) {
      s.inf = { best: infTotalScore };
      C.sv(s);
    }
    const ev = C.getActiveEvent();
    C.addCoins(Math.round(30 * (ev.coinMult || 1)));
    C.addXP(20);
    C.updateMissionProgress('levels_won', 1);
    C.updateChallengeProgress('levels_won', 1);
    C.updateChallengeProgress('score_single', C.score);
    infRound++;
    C._infLv = makeInfiniteLevel(infRound);
    C.Sound.win();
    C.showToast(
      '♾️',
      C._t('inf_round_won', 'Rodada {n} vencida!').replace('{n}', String(infRound - 1)),
      C._t('inf_round_next', '▶ Rodada {n} · Meta: {pts} pts')
        .replace('{n}', String(infRound))
        .replace('{pts}', (infRound * 1200).toLocaleString(C._shopLocale()))
    );
    setTimeout(() => {
      C.score = 0;
      C.movesLeft = C._infLv.moves;
      C.busy = false;
      C.over = false;
      C.colorProgress = {};
      C.obsProgress = {};
      C.coverGrid = null;
      C.particles = [];
      C.floaters = [];
      C.buildGrid();
      C.updateHUD();
      C.showCountdown(C._infLv);
    }, 1600);
  }

  function _infGameOver() {
    C.over = true;
    C.busy = true;
    const s = C.ld();
    const prev = s.inf?.best || 0;
    const isNew = infTotalScore > prev;
    if (isNew) {
      s.inf = { best: infTotalScore };
      C.sv(s);
    }
    if (TBRoadmap) {
      const st = C.ld();
      st.stats = st.stats || {};
      st.stats.infBest = Math.max(st.stats.infBest || 0, infTotalScore);
      C.sv(st);
      TBRoadmap.recordLeaderboardScore('infinite', infTotalScore);
    }
    const totalRounds = infRound - 1;
    const best = Math.max(prev, infTotalScore);
    C.showGlobalModal(`<div style="padding:4px 0;">
    <div style="font-size:40px;margin-bottom:4px;">♾️</div>
    <div style="font-size:18px;font-weight:900;margin-bottom:4px;">${C._t('inf_end_title', 'Fim do Modo Infinito')}</div>
    <div style="font-size:32px;font-weight:900;color:var(--accent);">${infTotalScore.toLocaleString(C._shopLocale())} pts</div>
    ${isNew ? `<div style="font-size:12px;color:#27ae60;font-weight:800;margin:4px 0;">${C._t('inf_new_record', '🏅 Novo Recorde!')}</div>` : ''}
    <div style="font-size:13px;color:var(--dim);margin-top:8px;">${C._t('inf_rounds_done', 'Rodadas completas:')} <b style="color:#fff;">${totalRounds}</b></div>
    <div style="font-size:11px;color:var(--dim);margin-top:3px;">${C._t('inf_record', 'Recorde:')} <b style="color:var(--accent);">${best.toLocaleString(C._shopLocale())} pts</b></div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button class="btn btn-p" style="flex:1;font-size:13px;" data-action="closeAndStartInfinite">${C._t('inf_play_again', '↩ Jogar Novamente')}</button>
      <button class="btn" style="flex:1;font-size:13px;" data-action="closeInfiniteGoMap">🗺 ${C._t('map', 'Mapa')}</button>
    </div>
  </div>`);
  }

  function openInfiniteModal() {
    const s = C.ld();
    const best = s.inf?.best || 0;
    C.showGlobalModal(`<div style="padding:4px 0;">
    <div style="font-size:36px;margin-bottom:4px;">♾️</div>
    <div style="font-size:18px;font-weight:900;margin-bottom:4px;">${C._t('inf_title', 'Modo Infinito')}</div>
    <div style="font-size:12px;color:var(--dim);margin-bottom:12px;line-height:1.5;">${C._t('inf_desc', 'Rodadas sem fim com dificuldade crescente.<br>Cada rodada exige mais pontos e menos movimentos.<br>Sobreviva o máximo que puder!')}</div>
    <div style="background:rgba(255,255,255,.07);border-radius:12px;padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;color:var(--dim);">${C._t('inf_your_record', '🏅 Seu Recorde')}</div>
      <div style="font-size:24px;font-weight:900;color:var(--accent);">${best > 0 ? best.toLocaleString(C._shopLocale()) + ' pts' : '—'}</div>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">${C._t('inf_rules', '⚙️ Rodada 1: 1.200 pts · 20 movimentos<br>Metas e movimentos aumentam a cada rodada.')}</div>
    <button class="btn btn-p" style="width:100%;font-size:15px;font-weight:900;" data-action="closeAndStartInfinite">${C._t('start', '▶ Iniciar')}</button>
    <button class="btn" style="width:100%;margin-top:8px;" data-action="closeGlobalModal">${C._t('close', 'Fechar')}</button>
  </div>`);
  }

  function startTimeChallengeMode() {
    if (!C._contentReady() || !TBContent.isModeUnlocked(C.ld(), 'time_challenge')) {
      C.showToast(
        '🔒',
        C._t('mode_locked', 'Modo bloqueado'),
        C._t('mode_locked_hint', 'Complete mais fases para desbloquear.')
      );
      return;
    }
    if (C.getLives() <= 0) {
      C.showNoLivesModal();
      return;
    }
    clearInterval(C._timeTimer);
    C.isTimeChallengeMode = true;
    TBState.isInfiniteMode = false;
    TBState.isDailyPuzzleMode = false;
    _timeRound = 1;
    C._timeLv = TBContent.buildTimeChallengeLevel(_timeRound);
    _timeLeft = C._timeLv.timerSec || 60;
    TBState.lvIdx = -1;
    C.score = 0;
    C.movesLeft = C._timeLv.moves;
    C.busy = false;
    C.over = false;
    C.pendingPU = '';
    C.colorProgress = {};
    C.obsProgress = {};
    C.coverGrid = null;
    C.particles = [];
    C.floaters = [];
    if (TBJuice) TBJuice.reset();
    if (typeof C.applyPlayTheme === 'function') C.applyPlayTheme(C._timeLv);
    else if (global.TBStart) global.TBStart.applyPlayTheme(C._timeLv);
    C.updateHUD();
    C.buildPUBar();
    C.buildGrid();
    C.showScreen('game');
    history.pushState({ screen: 'game', mode: 'time' }, '');
    document.getElementById('hud-timer')?.classList.add('active');
    C.showCountdown(C._timeLv, () => {
      _startTimeChallengeTimer();
    });
  }

  function _startTimeChallengeTimer() {
    clearInterval(C._timeTimer);
    C._timeTimer = setInterval(() => {
      if (C.over || !C.isTimeChallengeMode) {
        clearInterval(C._timeTimer);
        return;
      }
      _timeLeft--;
      const el = document.getElementById('hud-timer-val');
      if (el) el.textContent = String(Math.max(0, _timeLeft));
      if (_timeLeft <= 0) {
        clearInterval(C._timeTimer);
        _timeChallengeEnd();
      }
    }, 1000);
  }

  function _timeChallengeEnd() {
    C.over = true;
    C.busy = true;
    clearInterval(C._timeTimer);
    document.getElementById('hud-timer')?.classList.remove('active');
    const mult = C._timeLv?.scoreMultiplier || 1.5;
    const finalScore = Math.round(C.score * mult);
    const s = C.ld();
    s.modes = s.modes || {};
    const prev = s.modes.timeChallenge?.best || 0;
    if (finalScore > prev) {
      s.modes.timeChallenge = { best: finalScore, round: _timeRound };
      C.sv(s);
    }
    C.showGlobalModal(`<div style="padding:4px 0;text-align:center;">
    <div style="font-size:36px">⏱</div>
    <div style="font-size:18px;font-weight:900">Time Challenge</div>
    <div style="font-size:28px;font-weight:900;color:var(--accent)">${finalScore.toLocaleString(C._shopLocale())} pts</div>
    <div style="font-size:12px;color:var(--dim)">Multiplicador ${mult}× aplicado</div>
    <button class="btn btn-p" style="width:100%;margin-top:12px" data-action="closeAndRestartTimeChallenge">↩ Jogar novamente</button>
    <button class="btn" style="width:100%;margin-top:8px" data-action="closeTimeChallengeGoMap">🗺 Mapa</button>
  </div>`);
  }

  function openModesModal() {
    if (!C._contentReady()) return;
    const save = C.ld();
    const rows = TBContent.getModes()
      .map((m) => {
        const unlocked = TBContent.isModeUnlocked(save, m.id);
        return `<button class="mode-chip${unlocked ? '' : ' locked'}" type="button" data-action="openMode" data-arg="${m.id}">${m.icon} ${m.label}</button>`;
      })
      .join('');
    C.showGlobalModal(`<div style="padding:4px 0;">
    <div style="font-size:17px;font-weight:900;margin-bottom:8px">🎮 Modos de Jogo</div>
    <div class="modes-panel">${rows}</div>
    <button class="btn" style="width:100%" data-action="closeGlobalModal">Fechar</button>
  </div>`);
  }

  function startDailyPuzzleGame() {
    C.stopRegenInterval();
    if (TBRoadmap) TBRoadmap.clearSession();
    TBState.isInfiniteMode = false;
    TBState.isDailyPuzzleMode = true;
    TBState.isMasteryMode = false;
    TBState.lvIdx = 0;
    const seed = TBGlobal ? TBGlobal.dailySeed() : Math.floor(Date.now() / 86400000);
    C._dailyLv = {
      world: '🌍 Diário',
      name: C._t('daily_puzzle', 'Puzzle Global'),
      moves: 18,
      objectives: [{ type: 'score', target: 1 }],
    };
    C.score = 0;
    C.movesLeft = C._dailyLv.moves;
    C.busy = false;
    C.over = false;
    C.pendingPU = '';
    C.over_used_continue = false;
    C._prevHudScore = 0;
    C.canvas.classList.remove('targeting');
    document.querySelectorAll('.pu-btn').forEach((b) => b.classList.remove('targeting'));
    C.hideResult();
    C.colorProgress = {};
    C.obsProgress = {};
    C.coverGrid = null;
    C.particles = [];
    C.floaters = [];
    C.hoverCells = new Set();
    C.hoverSz = 0;
    if (TBJuice) TBJuice.reset();
    if (typeof C.applyPlayTheme === 'function') C.applyPlayTheme(C._dailyLv);
    else if (global.TBStart) global.TBStart.applyPlayTheme(C._dailyLv);
    C.updateHUD();
    C.buildPUBar();
    C.setGameSeed(seed);
    C.buildGrid();
    C.showScreen('game');
    history.pushState({ screen: 'game', daily: true }, '');
    C.showCountdown(C._dailyLv);
    C.Music.updateTheme();
    TBAnalytics.log('daily_open', { seed, surface: 'game' });
  }

  function resolveDailyPuzzleEnd() {
    C.over = true;
    C.busy = true;
    const day = Math.floor(Date.now() / 86400000);
    const s = C.ld();
    s.dailyPuzzle = s.dailyPuzzle || {};
    const prev = s.dailyPuzzle[day] || 0;
    const isNew = C.score > prev;
    if (isNew) s.dailyPuzzle[day] = C.score;
    C.sv(s);
    C.updateMissionProgress('daily_puzzle', 1);
    C.Sound.win();
    if (TBGlobal) TBGlobal.onDailyPuzzleComplete(C.score, isNew);
    else C.goToMap();
  }

  /** @type {any} */
  const api = {
    init,
    makeInfiniteLevel,
    startInfiniteMode,
    _infAdvanceRound,
    _infGameOver,
    openInfiniteModal,
    startTimeChallengeMode,
    _startTimeChallengeTimer,
    _timeChallengeEnd,
    openModesModal,
    startDailyPuzzleGame,
    resolveDailyPuzzleEnd,
  };

  /** @type {any} */
  const g = global;
  g.makeInfiniteLevel = makeInfiniteLevel;
  g.startInfiniteMode = startInfiniteMode;
  g._infAdvanceRound = _infAdvanceRound;
  g._infGameOver = _infGameOver;
  g.openInfiniteModal = openInfiniteModal;
  g.startTimeChallengeMode = startTimeChallengeMode;
  g._startTimeChallengeTimer = _startTimeChallengeTimer;
  g._timeChallengeEnd = _timeChallengeEnd;
  g.openModesModal = openModesModal;
  g.startDailyPuzzleGame = startDailyPuzzleGame;
  g.resolveDailyPuzzleEnd = resolveDailyPuzzleEnd;
  g.TBModes = api;
})(typeof window !== 'undefined' ? window : globalThis);
