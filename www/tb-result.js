// @ts-check
/**
 * Tile Blast — tela de resultado / vitória / game complete.
 * Isolado de tb-main; recebe dependências via TBResult.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBResultCfg
 * @typedef {{
 *   init: (cfg: TBResultCfg|null|undefined) => void,
 *   hideResult: () => void,
 *   showResult: (won: boolean, stars: number) => void,
 *   animateResultStars: (count: number) => void,
 *   showGameComplete: () => void,
 *   awardRandomPU: (stars: number) => string|null|undefined,
 *   finishWinRewards: (stars: number) => void
 * }} TBResultApi
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBEconomy = global.TBEconomy;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBGlobal = global.TBGlobal;

  /** @type {any} */
  let C = null;
  /** @type {ReturnType<typeof setInterval>|null} */
  let _loseTimerInt = null;

  /**
   * @param {TBResultCfg|null|undefined} cfg
   * @returns {void}
   */
  function init(cfg) {
    C = cfg || null;
  }

  /** @returns {boolean} */
  function ready() {
    return !!(C && C.ld && C._lv);
  }

  /**
   * @param {string} key
   * @param {string} [fb]
   * @returns {string}
   */
  function t(key, fb) {
    if (C && typeof C.t === 'function') return C.t(key, fb);
    return fb != null ? fb : key;
  }

  /** @returns {string} */
  function shopLocale() {
    if (C && typeof C.shopLocale === 'function') return C.shopLocale();
    return 'pt-BR';
  }

  /** @returns {void} */
  function hideResult() {
    const el = document.getElementById('result');
    el.classList.remove('show', 'result--near', 'result--lose');
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    const retryBtn = document.getElementById('res-retry');
    if (retryBtn) retryBtn.classList.remove('res-retry--pulse');
    if (_loseTimerInt) {
      clearInterval(_loseTimerInt);
      _loseTimerInt = null;
    }
  }

  function animateResultStars(count) {
    const stEl = document.getElementById('res-st');
    if (!stEl) return;
    stEl.innerHTML = '';
    const Sound = C && C.Sound;
    for (let i = 0; i < 3; i++) {
      const sp = document.createElement('span');
      const lit = i < count;
      sp.className = 'res-star' + (lit ? '' : ' dim');
      sp.textContent = lit ? '★' : '☆';
      if (lit) sp.classList.add('gold');
      stEl.appendChild(sp);
      if (lit)
        setTimeout(
          () => {
            sp.classList.add('show');
            Sound && Sound.star(i);
          },
          120 + i * 200
        );
    }
  }

  /** Mini-resumo dos objetivos na derrota “faltou pouco”. */
  function nearMissObjectiveHtml(lv) {
    const objs = (lv && lv.objectives) || [];
    if (!objs.length) return '';
    const score = C.getScore();
    const colorProgress = C.colorProgress || {};
    const obsProgress = C.obsProgress || {};
    const icons = C.ICONS || [];
    const obsIcon = C.OBS_ICON || {};
    const rows = objs
      .map((o) => {
        let curr = 0;
        let target = o.target || 1;
        let icon = '⭐';
        if (o.type === 'score') {
          curr = Math.min(score, target);
          icon = '⭐';
        } else if (o.type === 'color') {
          curr = Math.min(colorProgress[o.color] || 0, target);
          icon = icons[o.color] ?? '🎨';
        } else {
          curr = Math.min(obsProgress[o.type] || 0, target);
          icon = obsIcon[o.type] || '❓';
        }
        const done = curr >= target;
        const left = Math.max(0, target - curr);
        const pct = Math.min(100, Math.round((curr / target) * 100));
        return `<div class="res-obj-row${done ? ' done' : ''}">
          <span class="res-obj-icon" aria-hidden="true">${icon}</span>
          <div class="res-obj-track"><div class="res-obj-fill" style="width:${pct}%"></div></div>
          <span class="res-obj-val">${done ? '✓' : curr + '/' + target}${!done && left ? ` · −${left}` : ''}</span>
        </div>`;
      })
      .join('');
    return `<div class="res-obj-list">${rows}</div>`;
  }

  function awardRandomPU(stars) {
    if (!ready() || !global.TBLogic) return null;
    const id = TBLogic.rollPowerUp(stars);
    if (id) C.addPU(id);
    return id;
  }

  function _finishWinRewards(stars) {
    if (!ready()) return;
    const score = C.getScore();
    C.updateChallengeProgress && C.updateChallengeProgress('score_single', score);
    const xp = TBLogic.winXpGain(stars, score, C.XP_DEFS);
    setTimeout(() => C.addXP(xp.total), 400);
    setTimeout(() => C.checkAchievements && C.checkAchievements(), 500);
    const chestTier = TBLogic.winChestTier(stars);
    const chestAdded = C.addChest(chestTier);
    if (chestAdded) {
      const cdef = C.CHEST_DEFS[chestTier];
      setTimeout(
        () =>
          C.showToast(
            cdef.icon,
            t('chest_won', 'Baú ganho!'),
            t('chest_added', '{name} adicionado aos slots').replace(
              '{name}',
              C.locChestLabel(chestTier, cdef.label)
            )
          ),
        700
      );
    }
  }

  function showResult(won, stars) {
    if (!ready()) return;
    C.setOver(true);
    C.setBusy(true);
    const lv = C._lv(),
      lives = C.getLives();
    const score = C.getScore();
    const Sound = C.Sound;
    const Mascot = C.Mascot;
    const COINS_STAR = C.COINS_STAR;
    const PU_DEFS = C.PU_DEFS;

    if (won) {
      const puAwarded = awardRandomPU(stars);
      if (TBState.lvIdx >= TBState.LEVELS.length - 1) {
        if (stars === 3) C.spawnConfetti();
        _finishWinRewards(stars);
        setTimeout(() => showGameComplete(), 600);
        return;
      }
      const resEl = document.getElementById('result');
      resEl.classList.remove('result--near', 'result--lose');
      const retryWin = document.getElementById('res-retry');
      if (retryWin) retryWin.classList.remove('res-retry--pulse');
      document.getElementById('res-em').innerHTML = Mascot.resultHtml(
        stars === 3 ? 'excited' : 'happy'
      );
      animateResultStars(stars);
      const firstWin = !!C._pendingFirstWin;
      C._pendingFirstWin = false;
      if (firstWin) {
        document.getElementById('res-ti').textContent = t(
          'first_win_title',
          'Primeira explosão!'
        );
        document.getElementById('res-su').textContent = t(
          'brand_signature',
          'Quanto maior o grupo, maior o especial.'
        );
      } else {
        document.getElementById('res-ti').textContent =
          stars === 3 ? t('perfect', 'Perfeito!') : t('level_win', 'Você venceu!');
        document.getElementById('res-su').textContent = lv.name;
      }
      const rewardsEl = document.getElementById('res-rewards');
      if (rewardsEl) {
        rewardsEl.innerHTML = `<span class="res-chip">${score.toLocaleString(shopLocale())} pts</span><span class="res-chip">💰 +${COINS_STAR[stars]}</span>`;
        if (COINS_STAR[stars] > 0) {
          for (let _c = 0; _c < 3; _c++) setTimeout(() => Sound.coin(), 700 + _c * 90);
        }
        if (puAwarded) {
          const pd = PU_DEFS.find((p) => p.id === puAwarded);
          if (pd) rewardsEl.innerHTML += `<span class="res-chip">${pd.label} ${pd.desc}</span>`;
        }
        if (firstWin) {
          rewardsEl.innerHTML += `<span class="res-chip res-chip--brand">${t('brand_proof_specials', '4💣 · 6🚀 · 8🌈')}</span>`;
        }
      }
      document.getElementById('res-next').style.display = '';
      document.getElementById('res-retry').style.display = 'none';
      const shareBtn = document.getElementById('res-share');
      if (shareBtn) {
        shareBtn.style.display = '';
        shareBtn.textContent = '📤 ' + (global.TBRoadmap ? TBRoadmap.t('share') : 'Compartilhar');
        shareBtn.onclick = () => {
          Sound.click();
          TBRoadmap && TBRoadmap.shareScore(score, lv.name);
        };
      }
      const chBtn = document.getElementById('res-challenge');
      if (chBtn) {
        if (stars === 3 && !TBState.isInfiniteMode && !TBState.isDailyPuzzleMode) {
          chBtn.style.display = '';
          chBtn.textContent = '📤 ' + t('challenge_friend_btn', 'Desafiar Amigo');
          chBtn.onclick = () => {
            Sound.click();
            global.TBGlobal && TBGlobal.shareChallengeLink(TBState.lvIdx);
          };
        } else chBtn.style.display = 'none';
      }
      // Hide continue buttons on win
      const rc = document.getElementById('res-continues');
      if (rc) rc.style.display = 'none';
      resEl.classList.add('show');
      resEl.setAttribute('aria-hidden', 'false');
      resEl.inert = false;
      if (stars === 3) C.spawnConfetti();
      if (global.TBGlobal) TBGlobal.maybePromptRate(stars);
      C.announce(`Vitória! ${stars} estrelas. ${score.toLocaleString(shopLocale())} pontos.`);
      setTimeout(() => document.getElementById('res-next').focus(), 150);
      _finishWinRewards(stars);
    } else {
      const resEl = document.getElementById('result');
      const near = !!C.getLastLossNear();
      const lv = C._lv();
      document.getElementById('res-em').innerHTML = Mascot.resultHtml(near ? 'think' : 'sad');
      animateResultStars(0);
      const nearGap = near ? nearMissObjectiveHtml(lv) : '';
      document.getElementById('res-rewards').innerHTML = near
        ? `<span class="res-chip">🔥 ${t('so_close', 'Faltou pouco!')}</span>${nearGap}`
        : '';
      document.getElementById('res-ti').textContent = near
        ? t('so_close', 'Faltou pouco!')
        : lives <= 0
          ? t('game_over', 'Game Over!')
          : t('no_moves', 'Sem movimentos!');
      const _resSu = document.getElementById('res-su');
      if (_resSu)
        _resSu.textContent = near
          ? t('so_close_sub', 'Você estava quase lá — tente de novo!')
          : lv.name;
      document.getElementById('res-next').style.display = 'none';
      const retryBtn = document.getElementById('res-retry');
      retryBtn.style.display = lives > 0 ? '' : 'none';
      retryBtn.classList.toggle('res-retry--pulse', near && lives > 0);
      resEl.classList.toggle('result--near', near);
      resEl.classList.toggle('result--lose', !near);
      const shareBtnL = document.getElementById('res-share');
      if (shareBtnL) shareBtnL.style.display = 'none';
      const chBtnL = document.getElementById('res-challenge');
      if (chBtnL) chBtnL.style.display = 'none';

      // Continue buttons (only once per attempt)
      const rc = document.getElementById('res-continues');
      if (rc) {
        if (!C.getOverUsedContinue()) {
          const contCost = TBEconomy.LOSS_CONTINUE.coinCost;
          const canCoin = C.getCoins() >= contCost;
          const canAd = C.canWatchAd();
          rc.style.display = canCoin || canAd ? '' : 'none';
          const contMoves = TBEconomy.LOSS_CONTINUE.moves;
          rc.innerHTML = `
          <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">${t('continue_from', 'Continuar de onde parou:')}</div>
          ${canCoin ? `<button id="res-cont-coin" class="btn btn-p btn-full" type="button" style="min-height:44px;margin-bottom:6px;">${t('continue_coins', '💰 Continuar ({n} moedas)').replace('{n}', String(contCost))}</button>` : ''}
          ${canAd ? `<button id="res-cont-ad" class="btn btn-p btn-full" type="button" style="min-height:44px;">${t('continue_ad', '📺 Continuar (Anúncio)')}</button>` : ''}
        `;
          if (canCoin)
            document.getElementById('res-cont-coin').addEventListener('click', () => {
              if (C.getCoins() < contCost) {
                C.showToast('💰', t('shop_insufficient', 'Moedas insuficientes!'), '');
                return;
              }
              C.addCoins(-contCost);
              C.setOverUsedContinue(true);
              C.setOver(false);
              C.setBusy(false);
              hideResult();
              C.addMovesLeft(contMoves);
              C.updateHUD();
              Sound.levelUp();
              C.showToast(
                '💰',
                t('continuing', 'Continuando!'),
                t('continue_moves', '+{n} movimentos adicionados').replace('{n}', String(contMoves))
              );
            });
          if (canAd)
            document.getElementById('res-cont-ad').addEventListener('click', () => {
              C.showRewardedAd(() => {
                C.setOverUsedContinue(true);
                C.setOver(false);
                C.setBusy(false);
                hideResult();
                C.addMovesLeft(contMoves);
                C.updateHUD();
                Sound.levelUp();
                C.showToast(
                  '📺',
                  t('continuing', 'Continuando!'),
                  t('continue_moves', '+{n} movimentos adicionados').replace(
                    '{n}',
                    String(contMoves)
                  )
                );
              }, null);
            });
        } else {
          rc.style.display = 'none';
        }
      }

      if (lives <= 0) {
        const suEl = document.getElementById('res-su');
        function updateLoseTimer() {
          const s2 = C.ld();
          if (!s2.lifeRegenAt) {
            suEl.innerHTML = '💔 ' + t('no_lives', 'Sem vidas!');
            return;
          }
          const nextRegen = TBLogic.msToNextLife(s2.lifeRegenAt, Date.now(), C.LIFE_REGEN_MS);
          suEl.innerHTML = t(
            'no_lives_next',
            '💔 Sem vidas! Próxima em <strong style="color:var(--accent)">{time}</strong>'
          ).replace('{time}', TBLogic.formatMsClock(nextRegen));
        }
        updateLoseTimer();
        _loseTimerInt = setInterval(() => {
          C.checkLifeRegen();
          const l2 = C.getLives();
          if (l2 > 0 || !document.getElementById('result').classList.contains('show')) {
            if (_loseTimerInt) {
              clearInterval(_loseTimerInt);
              _loseTimerInt = null;
            }
            if (l2 > 0) {
              document.getElementById('res-su').textContent = near
                ? `${t('so_close_sub', 'Você estava quase lá — tente de novo!')} • ${score.toLocaleString(shopLocale())} pts`
                : `${t('goal_miss', 'Meta não atingida')} • ${score.toLocaleString(shopLocale())} pts`;
              document.getElementById('res-retry').style.display = '';
              document.getElementById('res-retry').classList.toggle('res-retry--pulse', near);
            }
            return;
          }
          updateLoseTimer();
        }, 1000);
      } else if (!near) {
        // Não sobrescrever so_close_sub no near-miss (antes apagava "quase lá").
        document.getElementById('res-su').textContent =
          `${t('goal_miss', 'Meta não atingida')} • ${score.toLocaleString(shopLocale())} pts`;
      } else {
        document.getElementById('res-su').textContent =
          `${t('so_close_sub', 'Você estava quase lá — tente de novo!')} • ${score.toLocaleString(shopLocale())} pts`;
      }
      resEl.classList.add('show');
      resEl.setAttribute('aria-hidden', 'false');
      resEl.inert = false;
      const loseMsg = document.getElementById('res-ti').textContent;
      C.announce(loseMsg + (lives <= 0 ? ' Sem vidas restantes.' : ''));
      if (retryBtn && retryBtn.style.display !== 'none') setTimeout(() => retryBtn.focus(), 150);
    }
  }

  function showGameComplete() {
    if (!ready()) return;
    const rec = t('complete_record', 'Recorde: {n} pts').replace(
      '{n}',
      C.getHS().toLocaleString(shopLocale())
    );
    document.getElementById('complete-score').textContent = `🏆 ${rec}`;
    if (global.TBRoadmap) TBRoadmap.applyI18n();
    C.showScreen('complete');
    C.spawnConfetti(90);
    C.Sound.levelUp();
    C.triggerShake(3, 500);
    setTimeout(() => {
      const h = document.getElementById('complete-heading');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus();
      }
    }, 150);
  }

  /** @type {TBResultApi} */
  const api = {
    init,
    hideResult,
    showResult,
    animateResultStars,
    showGameComplete,
    awardRandomPU,
    finishWinRewards: _finishWinRewards,
  };

  /** @type {any} */
  const g = global;
  g.hideResult = hideResult;
  g.showResult = showResult;
  g.animateResultStars = animateResultStars;
  g.showGameComplete = showGameComplete;
  g.awardRandomPU = awardRandomPU;
  g.TBResult = api;
})(typeof window !== 'undefined' ? window : globalThis);
