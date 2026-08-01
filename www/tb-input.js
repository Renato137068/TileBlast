// @ts-check
/**
 * Tile Blast — input / navegação / listeners de UI.
 * TBInput.init(cfg) + TBInput.bind() no boot (após canvas e cfg prontos).
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;
  /** @type {any} */
  const g = global;
  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const AppTimers = global.AppTimers;

  let _bound = false;
  /** @type {any} */
  let _goToMapFn = null;
  /** @type {any} */
  let _handleAppBackFn = null;

  /** @param {Record<string, any>|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function goToMap(reason) {
    if (!_bound) bind();
    if (_goToMapFn) _goToMapFn(reason);
  }

  function handleAppBack() {
    if (!_bound) bind();
    return _handleAppBackFn ? _handleAppBackFn() : false;
  }

  function bind() {
    if (_bound || !C || !C.canvas) return;
    _bound = true;

    // ═══════════════════════════════════════════════════════════════
    // INPUT
    // ═══════════════════════════════════════════════════════════════
    function gpos(cx, cy) {
      const r = C.canvas.getBoundingClientRect();
      return [
        Math.floor(((cx - r.left) * (C.BPX / r.width)) / C.CELL),
        Math.floor(((cy - r.top) * (C.BPX / r.height)) / C.CELL),
      ];
    }

    C.canvas.addEventListener('keydown', (e) => {
      if (!C.sGame.classList.contains('active') || C.busy || C.over) return;
      let nx = C.kbFocus.x,
        ny = C.kbFocus.y;
      switch (e.key) {
        case 'ArrowLeft':
          nx = Math.max(0, nx - 1);
          break;
        case 'ArrowRight':
          nx = Math.min(C.GW - 1, nx + 1);
          break;
        case 'ArrowUp':
          ny = Math.max(0, ny - 1);
          break;
        case 'ArrowDown':
          ny = Math.min(C.GH - 1, ny + 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          C.handleClick(C.kbFocus.x, C.kbFocus.y);
          return;
        default:
          return;
      }
      e.preventDefault();
      C.kbFocus = { x: nx, y: ny, active: true };
      C.syncKbHover();
      C.announce(C.describeCell(nx, ny));
    });

    C.canvas.addEventListener('focus', () => {
      if (!C.grid.length) return;
      C.kbFocus.active = true;
      C.syncKbHover();
      C.announce(C.describeCell(C.kbFocus.x, C.kbFocus.y));
    });

    C.canvas.addEventListener('blur', () => {
      C.kbFocus.active = false;
      if (!C.IS_TOUCH) {
        C.hoverCells = new Set();
        C.hoverSz = 0;
        C.requestDraw();
      }
    });

    C.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const r = C.canvas.getBoundingClientRect();
      const rx = (e.clientX - r.left) * (C.BPX / r.width);
      const ry = (e.clientY - r.top) * (C.BPX / r.height);
      C.ripple = { x: rx, y: ry, start: performance.now() };
      C.requestDraw();
      const [gx, gy] = gpos(e.clientX, e.clientY);
      const b = C.ok(gx, gy) && C.grid[gx][gy];
      if (b) C.ripple.color = C.COLORS[b.type % C.COLORS.length];
      C.kbFocus = { x: gx, y: gy, active: true };
      C.handleClick(gx, gy);
    });

    // Hover only on non-touch devices
    if (!C.IS_TOUCH) {
      let lastHoverCell = '';
      C.canvas.addEventListener('pointermove', (e) => {
        const r = C.canvas.getBoundingClientRect();
        C.hoverMX = (e.clientX - r.left) * (C.BPX / r.width);
        C.hoverMY = (e.clientY - r.top) * (C.BPX / r.height);
        if (C.busy || C.over) {
          if (C.hoverCells.size > 0) {
            C.hoverCells = new Set();
            C.hoverSz = 0;
            C.requestDraw();
          }
          return;
        }
        const gx = Math.floor(C.hoverMX / C.CELL),
          gy = Math.floor(C.hoverMY / C.CELL);
        const cellKey = gx + ',' + gy;
        if (cellKey === lastHoverCell) return; // same cell, skip BFS
        lastHoverCell = cellKey;
        if (!C.ok(gx, gy) || !C.grid[gx][gy] || C.grid[gx][gy].sp !== C.SP.NONE) {
          if (C.hoverCells.size > 0) {
            C.hoverCells = new Set();
            C.hoverSz = 0;
            C.requestDraw();
          }
          return;
        }
        const g = C.getGroup(gx, gy);
        if (g.length < 2) {
          if (C.hoverCells.size > 0) {
            C.hoverCells = new Set();
            C.hoverSz = 0;
            C.requestDraw();
          }
          return;
        }
        const newKeys = new Set(g.map(([x, y]) => x + ',' + y));
        const changed =
          newKeys.size !== C.hoverCells.size || [...newKeys].some((k) => !C.hoverCells.has(k));
        if (changed) {
          C.hoverCells = newKeys;
          C.hoverSz = g.length;
          C.requestDraw();
        }
      });
      C.canvas.addEventListener('pointerleave', () => {
        lastHoverCell = '';
        if (C.hoverCells.size > 0) {
          C.hoverCells = new Set();
          C.hoverSz = 0;
          C.requestDraw();
        }
      });
    }

    C.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Back to map (clears pending power-up)
    function goToMap(reason) {
      const leavingGame =
        C.sGame && C.sGame.classList.contains('active') && !TBState.isInfiniteMode;
      if (
        leavingGame &&
        !C.over &&
        reason !== 'win' &&
        typeof TBAnalytics !== 'undefined' &&
        TBAnalytics.log
      ) {
        const lv = TBState.LEVELS[TBState.lvIdx];
        TBAnalytics.log('level_abandon', {
          level: TBState.lvIdx + 1,
          level_id: lv && lv.id,
          world_id: lv && lv.worldId,
          score: C.score,
          moves_left: C.movesLeft,
          pu_used: C._levelPuUsed || 0,
          reason: reason || 'map',
          mastery: !!TBState.isMasteryMode,
        });
      }
      TBState.isInfiniteMode = false;
      TBState.isDailyPuzzleMode = false;
      TBState.isMasteryMode = false;
      C.isTimeChallengeMode = false;
      C._dailyLv = null;
      C._timeLv = null;
      clearInterval(C._timeTimer);
      document.getElementById('hud-timer')?.classList.remove('active');
      C.setGameSeed(null);
      if (g.TBRoadmap) g.TBRoadmap.clearSession();
      C.over = false;
      C.busy = false;
      C.pendingPU = '';
      C.canvas.classList.remove('targeting');
      C.hideResult();
      C.dismissCoachHint();
      document.getElementById('cd').classList.remove('show');
      C.stopRegenInterval();
      C.checkLifeRegen();
      C.renderMap();
      C.showScreen('map');
      history.replaceState({ screen: 'map' }, '');
      if (g.TBRoadmap) g.TBRoadmap.onReturnToMap(reason || 'map');
      C.Mascot.setMood('idle');
      C.Music.updateTheme();
      C.updateMusicToggleUI();
      C.announceNewUnlocks();
      setTimeout(() => C.Mascot.nextTip(), 600);
      // Pós-1ª vitória / retorno: novidades deferidas do boot.
      if (g.TBRetention && g.TBRetention.showChangelogIfNeeded) {
        setTimeout(() => g.TBRetention.showChangelogIfNeeded(), 900);
      } else if (g.TBRoadmap && g.TBRoadmap.showChangelogIfNeeded) {
        setTimeout(() => g.TBRoadmap.showChangelogIfNeeded(), 900);
      }
    }

    // Buttons
    document.getElementById('res-next').addEventListener('click', () => {
      C.Sound.click();
      C.startGame(TBState.lvIdx + 1);
    });
    document.getElementById('res-retry').addEventListener('click', () => {
      C.Sound.click();
      C.startGame(TBState.lvIdx);
    });
    document.getElementById('res-map').addEventListener('click', () => {
      C.Sound.click();
      goToMap('loss');
    });
    document.getElementById('hud-back').addEventListener('click', () => {
      C.Sound.click();
      goToMap();
    });
    document.getElementById('hud-mute').addEventListener('click', () => {
      const m = !C.Sound.isMuted();
      C.Sound.setMuted(m);
      // Mute unificado: silencia também a música (sem alterar a preferência salva)
      const music = C.Music || global.Music;
      if (music && typeof music.setMuted === 'function') music.setMuted(m);
      const btn = document.getElementById('hud-mute');
      btn.textContent = m ? '🔇' : '🔊';
      btn.setAttribute('aria-label', m ? 'Ativar som' : 'Silenciar som');
      const s = C.ld();
      s.muted = m;
      C.sv(s);
    });
    document.getElementById('complete-replay').addEventListener('click', () => {
      C.Sound.click();
      C.startGame(0);
    });
    document.getElementById('complete-map').addEventListener('click', () => {
      C.Sound.click();
      goToMap();
    });

    // Shop
    document.getElementById('map-play-btn').addEventListener('click', () => {
      const playBtn = document.getElementById('map-play-btn');
      if (playBtn && playBtn.dataset.complete === '1') {
        C.Sound.click();
        if (typeof C.openModesModal === 'function') C.openModesModal();
        return;
      }
      const idx = parseInt(playBtn.dataset.level || '', 10);
      if (!Number.isNaN(idx)) {
        C.Sound.click();
        C.startGame(idx);
      }
    });
    document.getElementById('coach-dismiss').addEventListener('click', () => {
      C.Sound.click();
      C.dismissCoachHint();
    });

    document.getElementById('map-ach-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openAchievementsModal();
    });
    document.getElementById('map-lb-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openLeaderboardModal();
    });
    document.getElementById('map-bp-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openBattlePassModal();
    });
    document.getElementById('bp-banner')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openBattlePassModal();
    });
    document.getElementById('piggy-banner')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openPiggyModal();
    });
    document.getElementById('flash-banner')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openFlashModal();
    });
    document.getElementById('map-restore-btn')?.addEventListener('click', () => {
      C.Sound.click();
      if (!C.PlayBridge.restore())
        C.showToast(
          '💳',
          C._t('restore', 'Restaurar'),
          C._t('restore_android', 'Disponível no app Android com Google Play')
        );
    });
    document.getElementById('map-privacy-btn')?.addEventListener('click', () => {
      C.Sound.click();
      window.open('privacy.html', '_blank', 'noopener');
    });
    document.getElementById('map-lang-btn')?.addEventListener('click', () => {
      C.Sound.click();
      C.showGlobalModal(`
        <div style="font-size:17px;font-weight:800;margin-bottom:10px;">🌐 Idioma</div>
        <button class="btn btn-g btn-full" style="margin-bottom:8px" data-action="setLanguage" data-arg="pt">🇧🇷 Português</button>
        <button class="btn btn-g btn-full" style="margin-bottom:8px" data-action="setLanguage" data-arg="en">🇺🇸 English</button>
        <button class="btn btn-g btn-full" data-action="setLanguage" data-arg="es">🇪🇸 Español</button>
      `);
    });
    document.getElementById('map-export-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.exportSave();
    });
    document
      .getElementById('map-import-btn')
      ?.addEventListener('click', () => document.getElementById('import-file')?.click());
    document.getElementById('import-file')?.addEventListener('change', (e) => {
      const t = /** @type {HTMLInputElement} */ (e.target);
      const f = t.files && t.files[0];
      if (f) g.TBRoadmap.importSave(f);
      t.value = '';
    });
    document.getElementById('map-cloud-backup')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.cloudSyncFirebase();
    });
    document.getElementById('map-cloud-restore')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.cloudRestore();
    });
    document.getElementById('map-player-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.openPlayerNameModal();
    });
    document.getElementById('map-delete-social-btn')?.addEventListener('click', () => {
      C.Sound.click();
      if (g.TBSocial && g.TBSocial.deleteSocialData) g.TBSocial.deleteSocialData();
      else if (g.TBRoadmap && g.TBRoadmap.deleteSocialData) g.TBRoadmap.deleteSocialData();
    });
    document.getElementById('map-whatsnew-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBRoadmap.showChangelogIfNeeded();
    });

    g.onTileBlastConsentUpdate = (granted) => {
      if (!granted)
        C.showToast(
          '🔒',
          C._t('ad_heading', 'Anúncios'),
          C._t('ads_consent', 'Consentimento necessário para anúncios personalizados.')
        );
    };

    if (C.PlayBridge.hasBilling()) setTimeout(() => C.PlayBridge.restore(), 1200);
    document.getElementById('map-shop-btn').addEventListener('click', () => C.openShop());
    document.getElementById('map-garden-btn')?.addEventListener('click', () => {
      C.Sound.click();
      if (g.TBMeta) g.TBMeta.openModal();
    });
    document.getElementById('map-reducemotion-toggle')?.addEventListener('click', () => {
      C.Sound.click();
      const st = C.ld();
      st.reduceMotion = !st.reduceMotion;
      C.sv(st);
      document.documentElement.classList.toggle('reduce-motion', st.reduceMotion);
      const b = document.getElementById('map-reducemotion-toggle');
      if (b) {
        b.setAttribute('aria-pressed', st.reduceMotion ? 'true' : 'false');
        b.textContent = st.reduceMotion
          ? C._t('reduce_motion_on', '🎬 Reduzir animações: Ligado')
          : '🎬 ' + C._t('reduce_motion', 'Reduzir animações');
      }
      C.showToast(
        '🎬',
        C._t('reduce_motion', 'Reduzir animações'),
        st.reduceMotion ? C._t('toggle_on', 'Ativado') : C._t('toggle_off', 'Desativado')
      );
    });
    (function () {
      try {
        if (C.ld().reduceMotion) {
          document.documentElement.classList.add('reduce-motion');
          var _rmb = document.getElementById('map-reducemotion-toggle');
          if (_rmb) {
            _rmb.setAttribute('aria-pressed', 'true');
            _rmb.textContent = C._t('reduce_motion_on', '🎬 Reduzir animações: Ligado');
          }
        }
      } catch (e) {}
    })();
    document.getElementById('map-coll-btn').addEventListener('click', () => {
      C.Sound.click();
      C.openCollectionModal();
    });
    document.getElementById('map-profile-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBGlobal.openProfileModal();
    });
    document.getElementById('map-daily-puzzle-btn')?.addEventListener('click', () => {
      C.Sound.click();
      g.TBGlobal.openDailyPuzzleModal();
    });
    document.getElementById('map-challenge-btn').addEventListener('click', () => {
      C.Sound.click();
      C.openChallengeModal();
    });
    document.getElementById('map-time-btn')?.addEventListener('click', () => {
      C.Sound.click();
      C.startTimeChallengeMode();
    });
    document.getElementById('map-modes-btn')?.addEventListener('click', () => {
      C.Sound.click();
      C.openModesModal();
    });
    document.getElementById('map-worlds-btn')?.addEventListener('click', () => C.openWorldSelect());
    document.getElementById('worlds-back')?.addEventListener('click', () => {
      C.Sound.click();
      C.showScreen('map');
      history.replaceState({ screen: 'map' }, '');
    });
    document.getElementById('shop-back').addEventListener('click', () => {
      C.Sound.click();
      C.showScreen('map');
      C.updateMapMeta();
    });

    document.getElementById('levelup-ok').addEventListener('click', () => {
      C.Sound.click();
      C.closeLevelUpCelebration();
    });

    // Android hardware back button + histórico do navegador
    let _backExitAt = 0;
    function handleAppBack() {
      if (document.getElementById('levelup-overlay').classList.contains('show')) {
        C.closeLevelUpCelebration();
        return true;
      }
      if (document.getElementById('ad-overlay').classList.contains('show')) {
        C.cancelRewardedAd();
        return true;
      }
      if (document.getElementById('global-modal').classList.contains('show')) {
        C.closeGlobalModal();
        return true;
      }
      if (C.sGame.classList.contains('active')) {
        goToMap();
        return true;
      }
      if (C.sComp.classList.contains('active')) {
        goToMap();
        return true;
      }
      if (C.sShop.classList.contains('active')) {
        C.showScreen('map');
        C.updateMapMeta();
        history.replaceState({ screen: 'map' }, '');
        return true;
      }
      if (C.sWorlds && C.sWorlds.classList.contains('active')) {
        C.showScreen('map');
        history.replaceState({ screen: 'map' }, '');
        return true;
      }
      if (C.sMap.classList.contains('active')) {
        const now = Date.now();
        if (now - _backExitAt < 2200) return false;
        _backExitAt = now;
        const msg =
          (g.TBRoadmap && g.TBRoadmap.t('exit_confirm')) || 'Toque voltar novamente para sair';
        C.showToast('👋', '', msg);
        return true;
      }
      return false;
    }
    g.handleAppBack = handleAppBack;
    window.addEventListener('popstate', () => {
      const st = history.state;
      if (st && st.screen === 'map' && !C.sMap.classList.contains('active')) {
        goToMap();
      }
    });

    // Prevent zoom on double-tap (canvas only — não bloqueia scroll na loja/mapa)
    let lastTap = 0;
    document.addEventListener(
      'touchend',
      (e) => {
        if (!(/** @type {Element} */ (e.target).closest('#board'))) return;
        const now = Date.now();
        if (now - lastTap < 300) e.preventDefault();
        lastTap = now;
      },
      { passive: false }
    );

    document.addEventListener('keydown', (e) => {
      C.trapModalFocus(e);
      if (e.key !== 'Escape') return;
      if (document.getElementById('levelup-overlay').classList.contains('show')) {
        C.closeLevelUpCelebration();
        return;
      }
      if (document.getElementById('ad-overlay').classList.contains('show')) {
        C.cancelRewardedAd();
        return;
      }
      if (document.getElementById('global-modal').classList.contains('show')) {
        C.closeGlobalModal();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (C.sGame.classList.contains('active') && !C.over && g.TBRoadmap) {
          g.TBRoadmap.saveSessionSnapshot('game', TBState.lvIdx, TBState.isInfiniteMode);
        }
        AppTimers.pause();
        C.stopRegenInterval();
        C.Sound.suspend();
        C.Music.pause();
        C.flushSave();
      } else {
        AppTimers.resume();
        C.Sound.resume();
        C.Music.resume();
        C.layoutBoard();
        if (C.sMap.classList.contains('active')) C.startRegenInterval();
      }
    });
    window.addEventListener('pagehide', () => {
      if (C.sGame.classList.contains('active') && !C.over && g.TBRoadmap) {
        g.TBRoadmap.saveSessionSnapshot('game', TBState.lvIdx, TBState.isInfiniteMode);
      }
      C.flushSave();
    });

    _goToMapFn = goToMap;
    _handleAppBackFn = handleAppBack;
    // The assignments above capture the INNER function decls (hoisted in bind).
    g.goToMap = goToMap;
    g.handleAppBack = handleAppBack;
  }

  global.TBInput = { init, bind, goToMap, handleAppBack };
})(typeof window !== 'undefined' ? window : globalThis);
