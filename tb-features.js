/**
 * Tile Blast v1.4 — episódio semanal, ranking semanal, a11y, convite, offline.
 */
(function (global) {
  'use strict';

  let C = null;

  const WEEKLY_EPISODES = [
    {
      icon: '🌱',
      pt: 'Jardim Semanal',
      en: 'Garden Week',
      es: 'Semana Jardín',
      coinMult: 1.2,
      xpMult: 1.1,
    },
    {
      icon: '🌲',
      pt: 'Floresta Semanal',
      en: 'Forest Week',
      es: 'Semana Bosque',
      coinMult: 1.15,
      xpMult: 1.15,
    },
    {
      icon: '⛰',
      pt: 'Montanha Semanal',
      en: 'Mountain Week',
      es: 'Semana Montaña',
      coinMult: 1.25,
      xpMult: 1,
    },
    {
      icon: '🌊',
      pt: 'Oceano Semanal',
      en: 'Ocean Week',
      es: 'Semana Océano',
      coinMult: 1.2,
      xpMult: 1.2,
    },
    {
      icon: '🔥',
      pt: 'Inferno Semanal',
      en: 'Inferno Week',
      es: 'Semana Infierno',
      coinMult: 1.3,
      xpMult: 1.1,
    },
    {
      icon: '💎',
      pt: 'Tesouro Semanal',
      en: 'Treasure Week',
      es: 'Semana Tesoro',
      coinMult: 1.35,
      xpMult: 1,
    },
    {
      icon: '⭐',
      pt: 'Estrelas Semanal',
      en: 'Star Week',
      es: 'Semana Estrellas',
      coinMult: 1.1,
      xpMult: 1.25,
    },
  ];

  function t(key, fb) {
    if (global.TBRuntime && global.TBRuntime.t) return global.TBRuntime.t(key, fb);
    if (global.TBRoadmap && global.TBRoadmap.isReady && global.TBRoadmap.isReady()) {
      const v = global.TBRoadmap.t(key);
      if (v) return v;
    }
    return fb;
  }

  function ready() {
    return !!(C && C.ld);
  }

  function lang() {
    if (!ready()) return 'pt';
    return (C.ld().lang || 'pt').slice(0, 2);
  }

  function esc(v) {
    if (global.TBRuntime && global.TBRuntime.escapeHtml) return global.TBRuntime.escapeHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function weekKey() {
    return Math.floor(Date.now() / (7 * 86400000));
  }

  function getWeeklyEpisode() {
    const ep = WEEKLY_EPISODES[weekKey() % WEEKLY_EPISODES.length];
    const name = ep[lang()] || ep.pt;
    return { icon: ep.icon, name, coinMult: ep.coinMult, xpMult: ep.xpMult };
  }

  function getWeeklyStats() {
    const s = C.ld();
    const wk = weekKey();
    if (!s.weekly || s.weekly.week !== wk) {
      const prev = s.weekly;
      if (prev && prev.week !== wk && prev.score > 0 && !prev.rewarded) {
        s._weeklyPendingReward = Math.min(200, 40 + Math.floor(prev.score / 500));
      }
      s.weekly = { week: wk, score: 0, bestRun: 0 };
    }
    return s.weekly;
  }

  function addWeeklyScore(pts) {
    if (!pts) return;
    const s = C.ld();
    const w = getWeeklyStats();
    w.score += pts;
    w.bestRun = Math.max(w.bestRun || 0, pts);
    C.sv(s);
    checkWeeklyAchievements();
  }

  function checkWeeklyAchievements() {
    const s = C.ld();
    const w = s.weekly || {};
    if (w.score >= 10000 && !s.ach.weekly_10k) {
      s.ach = s.ach || {};
      s.ach.weekly_10k = true;
      C.sv(s);
      C.showToast(
        '📅',
        t('ach_weekly_10k', 'Campeão Semanal'),
        t('ach_weekly_10k_sub', '10.000 pts na semana')
      );
    }
  }

  function maybeGrantWeeklyReward() {
    const s = C.ld();
    if (!s._weeklyPendingReward) return;
    const coins = s._weeklyPendingReward;
    delete s._weeklyPendingReward;
    C.addCoins(coins);
    C.sv(s);
    C.updateMapMeta && C.updateMapMeta();
    setTimeout(() => {
      C.showToast('📅', t('weekly_reward', 'Recompensa semanal'), `+${coins} 💰`);
    }, 2000);
  }

  function openWeeklyRankModal() {
    const w = getWeeklyStats();
    const s = C.ld();
    const lb = s.weeklyLb || [];
    const name = s.playerName || t('you', 'Você');
    const ep = getWeeklyEpisode();
    const rows = lb.length
      ? lb
          .slice(0, 10)
          .map(
            (e, i) =>
              `<div class="lb-row${e.name === name ? ' lb-me' : ''}"><span class="lb-rank">#${i + 1}</span><span class="lb-name">${esc(e.name)}</span><span class="lb-score">${e.score.toLocaleString()}</span></div>`
          )
          .join('')
      : `<div style="font-size:12px;color:var(--dim)">${t('weekly_empty', 'Jogue para entrar no ranking!')}</div>`;

    C.showGlobalModal(`
      <div style="font-size:40px">${ep.icon}</div>
      <div style="font-size:17px;font-weight:800">${t('weekly_rank', 'Ranking Semanal')}</div>
      <div style="font-size:12px;color:var(--accent);margin:4px 0 10px">${ep.name}</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px">${t('weekly_pts', 'Seus pts esta semana')}: <b>${w.score.toLocaleString()}</b></div>
      <div class="lb-list" style="max-height:160px;margin-bottom:12px">${rows}</div>
      <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="shareWeekly">📤 ${t('share', 'Compartilhar')}</button>
      <button class="btn btn-g btn-full" data-action="closeGlobalModal">${t('close', 'Fechar')}</button>
    `);
  }

  function recordWeeklyLocal(score) {
    const s = C.ld();
    const name = s.playerName || t('you', 'Você');
    s.weeklyLb = s.weeklyLb || [];
    const idx = s.weeklyLb.findIndex((e) => e.name === name);
    const entry = {
      name,
      score: idx >= 0 ? Math.max(s.weeklyLb[idx].score, score) : score,
      week: weekKey(),
    };
    if (idx >= 0) s.weeklyLb[idx] = entry;
    else s.weeklyLb.push(entry);
    s.weeklyLb = s.weeklyLb
      .filter((e) => e.week === weekKey())
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
    C.sv(s);
  }

  function shareWeekly() {
    const w = getWeeklyStats();
    const text = `Tile Blast 📅 ${t('weekly_rank', 'Ranking Semanal')}: ${w.score.toLocaleString()} pts!`;
    const url = location.href.split('?')[0] + '?play=daily';
    if (navigator.share) navigator.share({ title: 'Tile Blast', text, url }).catch(() => {});
    else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url);
      C.showToast('📤', t('share', 'Compartilhar'), 'OK');
    }
  }

  function shareChallenge(levelIdx) {
    const lv = C.LEVELS[levelIdx];
    if (!lv) return;
    const n = levelIdx + 1;
    const text = `Tile Blast — ${t('challenge_friend', 'Desafio')}: Fase ${n} (${lv.name})!`;
    const url = `${location.href.split('?')[0]}?challenge=${n}`;
    if (navigator.share) navigator.share({ title: 'Tile Blast', text, url }).catch(() => {});
    else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url);
      C.showToast('📤', t('share', 'Compartilhar'), 'Link copiado!');
    }
  }

  function isColorBlind() {
    if (!ready()) return false;
    return !!C.ld().colorBlind;
  }

  function toggleColorBlind() {
    const s = C.ld();
    s.colorBlind = !s.colorBlind;
    if (s.colorBlind && !s.ach.a11y_cb) {
      s.ach = s.ach || {};
      s.ach.a11y_cb = true;
      C.sv(s);
      C.checkAchievements && C.checkAchievements();
    }
    C.sv(s);
    C.requestDraw && C.requestDraw();
    updateColorBlindUI();
    C.showToast(
      '👁',
      t('colorblind', 'Modo daltônico'),
      s.colorBlind ? t('on', 'Ativado') : t('off', 'Desativado')
    );
  }

  function updateColorBlindUI() {
    if (!ready()) return;
    const btn = document.getElementById('map-colorblind-toggle');
    if (!btn) return;
    const on = isColorBlind();
    btn.textContent =
      (on ? '👁 ' : '👁 ') +
      t('colorblind', 'Modo daltônico') +
      ': ' +
      (on ? t('on', 'On') : t('off', 'Off'));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    document.documentElement.classList.toggle('colorblind-mode', on);
  }

  function isOnline() {
    return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  }

  function guardOnline(fallbackMsg) {
    if (isOnline()) return true;
    C.showToast(
      '📴',
      t('offline_title', 'Sem internet'),
      fallbackMsg || t('offline_body', 'Conecte-se para usar este recurso.')
    );
    return false;
  }

  function handleDeepLinks() {
    const p = new URLSearchParams(location.search);
    const cid = p.get('c');
    const nonce = p.get('n');
    const seedParam = p.get('seed') === 'master' ? 'master' : 'normal';

    const launchLevel = (levelIdx, seed) => {
      const s = C.ld();
      s.fromInvite = true;
      if (!s.ach) s.ach = {};
      if (!s.ach.invite_friend) {
        s.ach.invite_friend = true;
        C.checkAchievements && C.checkAchievements();
      }
      C.sv(s);
      setTimeout(() => {
        if (C.getUnlocked() >= levelIdx) {
          const mastery = seed === 'master';
          if (typeof C.startGame === 'function')
            C.startGame(levelIdx, mastery ? { mastery: true } : undefined);
        } else {
          C.showToast(
            '🔒',
            t('level_locked', 'Fase bloqueada'),
            t('unlock_first', 'Avance no mapa primeiro')
          );
        }
      }, 1600);
    };

    if (
      cid &&
      nonce &&
      global.TBFirebase &&
      global.TBFirebase.configValid &&
      global.TBFirebase.configValid()
    ) {
      Promise.resolve(global.TBFirebase.boot())
        .then(() => global.TBFirebase.claimChallenge(cid, nonce))
        .then((r) => {
          if (r && r.ok && typeof r.levelIdx === 'number') {
            launchLevel(r.levelIdx, r.seed || seedParam);
            return;
          }
          fallbackChallengeParam();
        })
        .catch(() => fallbackChallengeParam());
      return;
    }

    fallbackChallengeParam();

    function fallbackChallengeParam() {
      const ch = parseInt(p.get('challenge') || p.get('level') || '0', 10);
      if (ch >= 1 && ch <= (C.LEVELS || []).length) {
        launchLevel(ch - 1, seedParam);
      }
      if (p.get('from') === 'invite' && !C.ld().ach.invite_friend) {
        const s = C.ld();
        s.ach = s.ach || {};
        s.ach.invite_friend = true;
        C.sv(s);
        C.checkAchievements && C.checkAchievements();
      }
    }
  }

  // Estende os eventos via hooks explícitos do tb-main (sem monkey-patch).
  function registerEventHooks() {
    if (global._evHooksBound) return;
    global._evHooksBound = true;
    if (global.registerEventDecorator) {
      global.registerEventDecorator(function (ev) {
        const ep = getWeeklyEpisode();
        if (!ep) return ev;
        return {
          ...ev,
          coinMult: (ev.coinMult || 1) * (ep.coinMult || 1),
          xpMult: (ev.xpMult || 1) * (ep.xpMult || 1),
        };
      });
    }
    if (global.registerBannerDecorator) {
      global.registerBannerDecorator(function (el) {
        const ep = getWeeklyEpisode();
        if (!el || !ep) return;
        const nameEl = el.querySelector('.ev-name');
        if (nameEl) nameEl.textContent += ` · ${ep.icon} ${ep.name}`;
      });
    }
  }

  function bindVolumeControls() {
    const m = document.getElementById('vol-music');
    const s = document.getElementById('vol-sfx');
    const st = C.ld();
    if (m) {
      m.value = Math.round((st.musicVol != null ? st.musicVol : 1) * 100);
      m.addEventListener('input', () => {
        const v = m.value / 100;
        const save = C.ld();
        save.musicVol = v;
        C.sv(save);
        global.Music && Music.setVolume && Music.setVolume(v);
      });
    }
    if (s) {
      s.value = Math.round((st.sfxVol != null ? st.sfxVol : 1) * 100);
      s.addEventListener('input', () => {
        const v = s.value / 100;
        const save = C.ld();
        save.sfxVol = v;
        C.sv(save);
        global.Sound && Sound.setVolume && Sound.setVolume(v);
      });
    }
  }

  function _updateHapticsToggleUI() {
    const btn = document.getElementById('map-haptics-toggle');
    if (!btn) return;
    const off = !!C.ld().hapticsOff;
    btn.textContent = off ? '📳 Vibração: Desligada' : '📳 Vibração: Ligada';
    btn.setAttribute('aria-pressed', off ? 'false' : 'true');
  }

  function bindUI() {
    document.getElementById('map-colorblind-toggle')?.addEventListener('click', () => {
      C.Sound && C.Sound.click();
      toggleColorBlind();
    });
    document.getElementById('map-haptics-toggle')?.addEventListener('click', () => {
      C.Sound && C.Sound.click();
      const save = C.ld();
      save.hapticsOff = !save.hapticsOff;
      C.sv(save);
      const H = global.TBAudio && global.TBAudio.Haptic;
      if (H && H.setEnabled) H.setEnabled(!save.hapticsOff);
      if (!save.hapticsOff && H && H.light) H.light();
      _updateHapticsToggleUI();
    });
    _updateHapticsToggleUI();
    document.getElementById('map-weekly-rank-btn')?.addEventListener('click', () => {
      C.Sound && C.Sound.click();
      openWeeklyRankModal();
    });
    document.getElementById('map-notify-btn')?.addEventListener('click', () => {
      C.Sound && C.Sound.click();
      if (global.TBRoadmap) global.TBRoadmap.requestPushPermission();
    });
    updateColorBlindUI();
    bindVolumeControls();
  }

  function onWin(score) {
    addWeeklyScore(score);
    recordWeeklyLocal(score);
  }

  function boot() {
    registerEventHooks();
    getWeeklyStats();
    maybeGrantWeeklyReward();
    handleDeepLinks();
    bindUI();

    window.addEventListener('online', () => C.showToast('🌐', t('online', 'Conectado'), ''));
    window.addEventListener('offline', () =>
      C.showToast(
        '📴',
        t('offline_title', 'Sem internet'),
        t('offline_play', 'Modo offline — progresso salvo localmente.')
      )
    );

    if (global.TBRoadmap) {
      const origShare = global.TBRoadmap.shareScore;
      global.TBRoadmap.shareScore = function (score, label) {
        const st = global.TBState;
        if (st && !st.isInfiniteMode && !st.isDailyPuzzleMode) {
          shareChallenge(st.lvIdx);
          return;
        }
        origShare(score, label);
      };
    }
  }

  global.TBFeatures = {
    isReady: ready,
    init(cfg) {
      C = cfg;
      boot();
    },
    getWeeklyEpisode,
    addWeeklyScore,
    onWin,
    openWeeklyRankModal,
    shareChallenge,
    isColorBlind,
    toggleColorBlind,
    guardOnline,
    isOnline,
    updateColorBlindUI,
    missionLabel(def) {
      if (!def) return '';
      if (def.type === 'color_popped' && (def.color != null || def.color === 0)) {
        const color =
          global.TBRoadmap && TBRoadmap.colorName
            ? TBRoadmap.colorName(def.color)
            : String(def.color);
        return t('ms_color_named', 'Explodir {n} blocos {color}')
          .replace('{n}', String(def.target))
          .replace('{color}', color);
      }
      const templates = {
        blocks_popped: t('ms_blocks', 'Explodir {n} blocos'),
        color_popped: t('ms_color', 'Explodir {n} blocos de cor'),
        levels_won: t('ms_levels', 'Vencer {n} fase(s)'),
        specials_made: t('ms_specials', 'Criar {n} tile(s) especial(is)'),
        powerups_used: t('ms_powerups', 'Usar {n} power-up(s)'),
        combos_made: t('ms_combos', 'Fazer {n} combos (5+)'),
        score_in_level: t('ms_score', 'Fazer {n} pts em uma fase'),
        daily_puzzle: t('ms_daily', 'Jogar o Puzzle Diário'),
        win_streak: t('ms_streak', 'Sequência de {n} vitórias'),
      };
      return (templates[def.type] || def.label).replace('{n}', String(def.target));
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
