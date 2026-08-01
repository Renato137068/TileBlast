// @ts-check
/**
 * Tile Blast — start level / HUD / vitória-derrota / countdown.
 * Isolado de tb-main; dependências via TBStart.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBStartCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBJuice = global.TBJuice;
  /** @type {any} */
  const TBContent = global.TBContent;
  /** @type {any} */
  const TBAnalytics = global.TBAnalytics;
  /** @type {any} */
  const TBEconomy = global.TBEconomy;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBFeatures = global.TBFeatures;
  /** @type {any} */
  const TBMeta = global.TBMeta;
  /** @type {any} */
  const TBFirebase = global.TBFirebase;

  /** @type {any} */
  let C = null;
  /** @type {Record<string, boolean>|null} */
  let _objDoneCache = null;

  /** @param {TBStartCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  /**
   * Tinge o tabuleiro/HUD com a cor do mundo + invalida cache de fundo.
   * @param {{ worldId?: string, world?: string }|null|undefined} lv
   */
  function applyPlayTheme(lv) {
    if (!C) return;
    let wid = lv && lv.worldId;
    if (!wid && TBContent && typeof TBContent.getWorldForLevelIndex === 'function') {
      const w = TBContent.getWorldForLevelIndex(TBState.lvIdx);
      wid = w && w.id;
    }
    const color =
      TBContent && typeof TBContent.getWorldColor === 'function' && wid
        ? TBContent.getWorldColor(wid)
        : '#f6b23e';
    const cssClass =
      TBContent && typeof TBContent.getWorldCssClass === 'function' && wid
        ? TBContent.getWorldCssClass(wid)
        : '';
    const themeWorld =
      TBContent && typeof TBContent.getWorld === 'function' && wid ? TBContent.getWorld(wid) : null;
    const theme = (themeWorld && themeWorld.theme) || '';
    if (TBState) {
      TBState.playTheme = {
        color: color,
        theme: theme,
        bgTop: (TBState.playTheme && TBState.playTheme.bgTop) || null,
        bgBot: (TBState.playTheme && TBState.playTheme.bgBot) || null,
      };
    }
    if (C) {
      C._playWorldColor = color;
      C._playWorldTheme = theme;
      C._bgCache = null;
    }

    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (root) {
      root.style.setProperty('--play-world-color', color);
      try {
        const n = parseInt(String(color).replace('#', ''), 16);
        const r = (n >> 16) & 255,
          g = (n >> 8) & 255,
          b = n & 255;
        root.style.setProperty('--play-world-rgb', r + ',' + g + ',' + b);
      } catch (_) {
        root.style.setProperty('--play-world-rgb', '246,178,62');
      }
    }
    const sg = typeof document !== 'undefined' ? document.getElementById('screen-game') : null;
    if (sg) {
      const drop = [];
      sg.classList.forEach((c) => {
        if (c.indexOf('world-') === 0) drop.push(c);
      });
      for (let i = 0; i < drop.length; i++) sg.classList.remove(drop[i]);
      if (cssClass) sg.classList.add(cssClass);
    }
  }

  function _lv() {
    if (TBState.isDailyPuzzleMode && C._dailyLv) return C._dailyLv;
    if (C.isTimeChallengeMode && C._timeLv) return C._timeLv;
    return TBState.isInfiniteMode ? C._infLv : TBState.LEVELS[TBState.lvIdx];
  }

  function startGame(idx, opts) {
    opts = opts || {};
    const launch = function () {
      C.stopRegenInterval();
      if (TBRoadmap) TBRoadmap.clearSession();
      TBState.isDailyPuzzleMode = false;
      C._dailyLv = null;
      C.isTimeChallengeMode = false;
      C._timeLv = null;
      clearInterval(C._timeTimer);
      document.getElementById('hud-timer')?.classList.remove('active');
      C.setGameSeed(null);
      if (C.getLives() <= 0) {
        C.showNoLivesModal();
        return;
      }
      TBState.isInfiniteMode = false;
      TBState.isMasteryMode = !!opts.mastery;
      TBState.lvIdx = Math.min(idx, TBState.LEVELS.length - 1);
      const lv = _lv();
      C.score = 0;
      C.movesLeft = lv.moves;
      C.busy = false;
      C.over = false;
      C.pendingPU = '';
      C.over_used_continue = false;
      C._prevHudScore = 0;
      C._levelPuUsed = 0;
      C.canvas.classList.remove('targeting');
      document.querySelectorAll('.pu-btn').forEach((b) => b.classList.remove('targeting'));
      C.hideResult();
      C.colorProgress = {};
      C.obsProgress = {};
      C.coverGrid = null;
      for (const o of lv.objectives) {
        if (o.type === 'color') C.colorProgress[o.color] = 0;
        else if (o.type !== 'score') C.obsProgress[o.type] = 0;
      }
      _objDoneCache = null;
      C.particles = [];
      C.floaters = [];
      C.hoverCells = new Set();
      C.hoverSz = 0;
      if (C.hintCells) C.hintCells.clear();
      else C.hintCells = new Set();
      if (global.TBGameplay && global.TBGameplay.clearIdleHint) global.TBGameplay.clearIdleHint();
      if (TBJuice) TBJuice.reset();
      applyPlayTheme(lv);
      updateHUD();
      C.buildPUBar();
      C.buildGrid(lv.seed != null ? lv.seed : (TBState.lvIdx + 1) * 7919);
      const enteringFromMap = !C.sGame.classList.contains('active');
      C.showScreen('game');
      if (enteringFromMap) {
        history.pushState({ screen: 'game', lvIdx: TBState.lvIdx }, '');
      } else {
        history.replaceState({ screen: 'game', lvIdx: TBState.lvIdx }, '');
      }
      if (TBState.lvIdx === 0 && !C.ld().tutorialDone) {
        C.busy = true;
        C.showTutorial();
      } else {
        showCountdown(lv, C.maybeShowCoach);
      }
      TBAnalytics.log('level_start', {
        level: TBState.lvIdx + 1,
        level_id: lv.id || null,
        world_id: lv.worldId || null,
        infinite: !!TBState.isInfiniteMode,
        daily: !!TBState.isDailyPuzzleMode,
        mastery: !!TBState.isMasteryMode,
      });
      C.Music.updateTheme();
      C.updateMusicToggleUI();
    };
    if (C._contentReady())
      TBContent.ensureIndexLoaded(idx)
        .then(function () {
          TBState.LEVELS = TBContent.getLevels();
          launch();
        })
        .catch(launch);
    else launch();
  }

  function updateHUD() {
    const lv = _lv(),
      lives = C.getLives();
    document.getElementById('hud-lv').textContent = TBState.isDailyPuzzleMode
      ? `${lv.world} · ${lv.name}`
      : C.isTimeChallengeMode
        ? `${lv.world} · ${lv.name}`
        : TBState.isInfiniteMode
          ? `${lv.world} · ${lv.name}`
          : TBState.isMasteryMode
            ? `${lv.world || ''} · Mastery ${TBState.lvIdx + 1}`
            : `${lv.world || ''} · Fase ${TBState.lvIdx + 1}`;
    const scoreEl = document.getElementById('hud-score');
    if (C.score > C._prevHudScore && C._prevHudScore > 0) {
      scoreEl.classList.remove('bump', 'score-surge');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
      if (C.score - C._prevHudScore >= 80) scoreEl.classList.add('score-surge');
    }
    C._prevHudScore = C.score;
    scoreEl.textContent = C.score.toLocaleString(C._shopLocale());
    const pct = Math.min(100, _scoreProgress());
    document.getElementById('prog-b').style.width = pct + '%';
    const prog = document.getElementById('prog-w');
    if (prog) {
      prog.setAttribute('aria-valuenow', String(Math.round(pct)));
      prog.classList.toggle('near-complete', pct >= 75);
    }
    C.updateMissionProgress('score_in_level', 0, C.score);
    const mv = document.getElementById('hud-mv');
    mv.textContent =
      C.movesLeft <= 3 ? `🔥${C.movesLeft}` : C.movesLeft <= 5 ? `⚠️${C.movesLeft}` : C.movesLeft;
    mv.classList.toggle('danger', C.movesLeft <= 5 && C.movesLeft > 2);
    mv.classList.toggle('critical', C.movesLeft <= 3);
    const bw = document.getElementById('board-w');
    if (bw && !C.over) {
      bw.classList.toggle('board-danger', C.movesLeft <= 5);
      bw.classList.toggle('board-critical', C.movesLeft <= 3);
    }
    // Prévia de estrelas (se vencer agora) — motiva jogar melhor
    const starsEl = document.getElementById('hud-stars');
    if (starsEl) {
      const preview = TBState.isInfiniteMode || C.isTimeChallengeMode ? 0 : calcStars();
      const filled = '★'.repeat(preview) + '☆'.repeat(3 - preview);
      if (starsEl.textContent !== filled) {
        starsEl.textContent = filled;
        starsEl.dataset.stars = String(preview);
        starsEl.classList.toggle('hud-stars--hot', preview >= 3);
      }
    }
    document.getElementById('hud-lives').textContent = lives;
    document.getElementById('hud-coins').textContent = C.getCoins();
    _refreshObjDisplay();
  }

  function _scoreProgress() {
    const lv = _lv();
    return TBLogic.objectivesAvgProgress(lv.objectives, C.score, C.colorProgress, C.obsProgress);
  }

  function _refreshObjDisplay() {
    const lv = _lv();
    const el = document.getElementById('hud-obj');
    _objDoneCache = _objDoneCache || {};
    let _anyJustDone = false;
    const _objLabel =
      '<span class="obj-label" aria-hidden="true">' + C._t('objective', 'Objetivo') + '</span>';
    el.innerHTML =
      _objLabel +
      lv.objectives
        .map((o, idx) => {
          let curr, target, icon, color;
          if (o.type === 'score') {
            curr = Math.min(C.score, o.target);
            target = o.target;
            icon = '⭐';
            color = '#f6b23e';
          } else if (o.type === 'color') {
            curr = Math.min(C.colorProgress[o.color] || 0, o.target);
            target = o.target;
            icon = C.ICONS[o.color] ?? '?';
            color = C.COLORS[o.color] ?? '#fff';
          } else {
            curr = Math.min(C.obsProgress[o.type] || 0, o.target);
            target = o.target;
            icon = C.OBS_ICON[o.type] || '❓';
            color = '#8fd3ff';
          }
          const pct = Math.min(100, (curr / target) * 100);
          const done = curr >= target;
          const key = idx + '_' + o.type + (o.color ?? '');
          const justDone = done && !_objDoneCache[key];
          if (done) _objDoneCache[key] = true;
          if (justDone) _anyJustDone = true;
          return `<div class="obj-row${done ? ' obj-done' : ''}${justDone ? ' obj-just-done' : ''}">
      <span class="obj-icon">${icon}</span>
      <div class="obj-track"><div class="obj-fill${done ? ' done' : ''}" style="width:${pct}%;background:${done ? 'var(--success)' : color}"></div></div>
      <span class="obj-val${done ? ' done' : ''}">${done ? '✓' : curr + '/' + target}</span>
    </div>`;
        })
        .join('');
    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    el.style.gap = '6px';
    el.style.alignItems = 'center';
    el.style.width = '100%';
    if (_anyJustDone && !C.over) {
      try {
        C.Sound.objComplete ? C.Sound.objComplete() : C.Sound.star(1);
      } catch (e) {}
      try {
        C.Haptic.medium();
      } catch (e) {}
      if (TBJuice && typeof C.BPX !== 'undefined') {
        TBJuice.flash('#8fd3ff', 0.1, 240);
        TBJuice.confettiBurst(C.BPX / 2, C.CELL * 0.8, {
          count: 14,
          colors: ['#8fd3ff', '#4ecb71', '#f6c945'],
        });
      }
    }
  }

  function calcStars() {
    const lv = _lv();
    const so = (lv.objectives || []).find((o) => o.type === 'score');
    const sr = so ? C.score / so.target : 1.3;
    return TBLogic.calcStarsMerit(C.movesLeft, lv.moves, sr);
  }

  function checkWin() {
    const lv = _lv();
    return TBLogic.checkObjectives(lv.objectives, C.score, C.colorProgress, C.obsProgress);
  }

  function resolveWin() {
    if (TBState.isInfiniteMode) {
      C._infAdvanceRound();
      return;
    }
    C.busy = true;
    C.boardClearFinale(() => {
      const stars = calcStars();
      const coinGain = Math.round(
        (C.COINS_STAR || TBEconomy.COINS_STAR)[stars] *
          C.getEconomyCoinMult(C.getActiveEvent().coinMult || 1)
      );
      C.addCoins(coinGain);
      if (TBJuice && coinGain > 0) {
        const r = C.canvas.getBoundingClientRect();
        const coinsEl = document.getElementById('hud-coins');
        const pill = coinsEl ? coinsEl.closest('.hud-pill') : null;
        TBJuice.coinFly({ x: r.left + r.width / 2, y: r.top + r.height * 0.4 }, coinsEl || pill, {
          count: Math.min(14, Math.max(6, Math.round(coinGain / 8))),
          onEach: () => {
            if (pill) {
              /** @type {HTMLElement} */
              const pillEl = /** @type {HTMLElement} */ (pill);
              pillEl.classList.remove('tbj-bump');
              void pillEl.offsetWidth;
              pillEl.classList.add('tbj-bump');
            }
          },
        });
      }
      if (TBRoadmap) {
        TBRoadmap.addPiggyCoins(coinGain);
        TBRoadmap.addBattlePassXP(40 + stars * 15);
        TBRoadmap.onWinStreak(true);
      }
      const ws = C.ld().winStreak || 0;
      C.updateMissionProgress('win_streak', 0, ws);
      if (TBFeatures) TBFeatures.onWin(C.score);
      if (global.TBPush) global.TBPush.maybeAskPermission(C.getUnlocked());
      const prevStars = C.ld().stars || {};
      const prevStar = prevStars[TBState.lvIdx] || 0;
      const firstWin = !Object.keys(prevStars).some((k) => (prevStars[k] || 0) > 0);
      C._pendingFirstWin = firstWin;
      const lvWin = _lv();
      C.completeLevel(TBState.lvIdx, stars, C.score);
      if (C._contentReady()) {
        const s = C.ld();
        const evUp = TBContent.trackEventProgress(s, 'levels_won', 1);
        if (evUp) C.sv(s);
        const ev = C.getActiveEvent();
        if (ev && ev.ranking && ev.id && TBFirebase && TBFirebase.configValid()) {
          const lbId = TBContent.getEventLeaderboardId(ev.id);
          const nm = s.playerName || 'Jogador';
          TBFirebase.submitEventScore(lbId, C.score + stars * 500, nm);
        }
      }
      if (TBMeta) TBMeta.addStars(stars);
      C.updateMissionProgress('levels_won', 1);
      C.updateChallengeProgress('levels_won', 1);
      let masteryBonus = 0;
      if (TBState.isMasteryMode) {
        if (stars > prevStar) masteryBonus = 25 + (stars - prevStar) * 15;
        else if (stars >= 3) masteryBonus = 40;
        if (masteryBonus > 0) C.addCoins(masteryBonus);
      }
      TBAnalytics.log('level_win', {
        level: TBState.lvIdx + 1,
        level_id: lvWin && lvWin.id,
        world_id: lvWin && lvWin.worldId,
        stars,
        score: C.score,
        moves_left: C.movesLeft,
        pu_used: C._levelPuUsed || 0,
        first_win: firstWin,
        mastery: !!TBState.isMasteryMode,
        mastery_bonus: masteryBonus,
      });
      C.Sound.fanfare(stars);
      const showInter = () => C.showResult(true, stars);
      if (TBRoadmap) TBRoadmap.maybeShowInterstitial(showInter);
      else showInter();
    });
  }

  function _objCompletion() {
    const lv = _lv();
    return TBLogic.objectivesMinProgress(lv.objectives, C.score, C.colorProgress, C.obsProgress);
  }

  function resolveLoss() {
    if (TBRoadmap) {
      TBRoadmap.onWinStreak(false);
      TBRoadmap.onLevelLoss(TBState.lvIdx);
    }
    if (TBState.isInfiniteMode) {
      C.Sound.lose();
      C._infGameOver();
      return;
    }
    C._lastLossNear = TBLogic.isNearMiss(_objCompletion());
    if (C._lastLossNear) C.Sound.nearMiss();
    else C.Sound.lose();
    if (TBLogic.shouldLoseLife(TBState.lvIdx)) C.loseLive();
    const lvLoss = _lv();
    TBAnalytics.log('level_loss', {
      level: TBState.lvIdx + 1,
      level_id: lvLoss && lvLoss.id,
      world_id: lvLoss && lvLoss.worldId,
      near_miss: !!C._lastLossNear,
      score: C.score,
      moves_left: C.movesLeft,
      pu_used: C._levelPuUsed || 0,
      mastery: !!TBState.isMasteryMode,
    });
    C.showResult(false, 0);
  }

  function showCountdown(lv, onReady) {
    const cdEl = document.getElementById('cd');
    const cdN = document.getElementById('cd-n');
    document.getElementById('cd-ph').textContent = TBState.isInfiniteMode
      ? `♾️ ${lv.name}`
      : C._t('phase_named', 'Fase {n}: {name}')
          .replace('{n}', String(TBState.lvIdx + 1))
          .replace('{name}', lv.name);
    const chips = lv.objectives
      .map((o) => {
        if (o.type === 'score') {
          return `<span class="cd-chip">⭐ ${o.target.toLocaleString(C._shopLocale())} pts</span>`;
        }
        if (o.type === 'color') {
          return `<span class="cd-chip">${C.ICONS[o.color] ?? '🎨'} ×${o.target}</span>`;
        }
        const icon = (C.OBS_ICON && C.OBS_ICON[o.type]) || '❓';
        return `<span class="cd-chip">${icon} ×${o.target}</span>`;
      })
      .join('');
    const howHints = {
      ice: C._t('cd_hint_ice', 'Quebre gelo explodindo blocos ao lado'),
      crate: C._t('cd_hint_crate', 'Quebre caixas com grupos vizinhos'),
      collect: C._t('cd_hint_collect', 'Leve as cerejas até o fundo'),
      cover: C._t('cd_hint_cover', 'Exploda blocos sobre a cobertura'),
      chain: C._t('cd_hint_chain', 'Rompa correntes com grupos ao lado'),
    };
    let hint = '';
    for (const o of lv.objectives || []) {
      if (howHints[o.type]) {
        hint = `<div class="cd-hint">${howHints[o.type]}</div>`;
        break;
      }
    }
    document.getElementById('cd-info').innerHTML = chips + hint;
    cdEl.classList.add('show');
    cdEl.setAttribute('aria-hidden', 'false');
    C.busy = true;
    let count = 3;
    cdN.textContent = String(count);
    cdN.classList.remove('pop');
    const tick = () => {
      C.Sound.click();
      cdN.classList.add('pop');
      setTimeout(() => {
        count--;
        if (count > 0) {
          cdN.textContent = String(count);
          cdN.classList.remove('pop');
          setTimeout(tick, 700);
        } else {
          cdN.textContent = '▶';
          cdN.classList.remove('pop');
          setTimeout(() => {
            cdEl.classList.remove('show');
            cdEl.setAttribute('aria-hidden', 'true');
            C.busy = false;
            if (C.grid.length) C.announce(C.describeCell(C.kbFocus.x, C.kbFocus.y));
            if (global.TBGameplay && global.TBGameplay.noteActivity)
              global.TBGameplay.noteActivity();
            if (typeof onReady === 'function') onReady();
          }, 500);
        }
      }, 150);
    };
    setTimeout(tick, 200);
  }

  /** @type {any} */
  const api = {
    init,
    _lv,
    startGame,
    applyPlayTheme,
    updateHUD,
    _scoreProgress,
    _refreshObjDisplay,
    calcStars,
    checkWin,
    resolveWin,
    _objCompletion,
    resolveLoss,
    showCountdown,
  };

  /** @type {any} */
  const g = global;
  g._lv = _lv;
  g.startGame = startGame;
  g.applyPlayTheme = applyPlayTheme;
  g.updateHUD = updateHUD;
  g._scoreProgress = _scoreProgress;
  g._refreshObjDisplay = _refreshObjDisplay;
  g.calcStars = calcStars;
  g.checkWin = checkWin;
  g.resolveWin = resolveWin;
  g._objCompletion = _objCompletion;
  g.resolveLoss = resolveLoss;
  g.showCountdown = showCountdown;
  g.TBStart = api;
})(typeof window !== 'undefined' ? window : globalThis);
