/**
 * Tile Blast — features globais: puzzle diário, perfil, PWA, avaliação.
 */
(function (global) {
  'use strict';

  let C = null;
  let deferredInstall = null;

  const TITLES = [
    { min: 0, icon: '🌱', pt: 'Novato', en: 'Rookie', es: 'Novato' },
    { min: 5, icon: '🗺', pt: 'Explorador', en: 'Explorer', es: 'Explorador' },
    { min: 15, icon: '⭐', pt: 'Veterano', en: 'Veteran', es: 'Veterano' },
    { min: 30, icon: '🏆', pt: 'Mestre', en: 'Master', es: 'Maestro' },
    { min: 50, icon: '👑', pt: 'Lenda', en: 'Legend', es: 'Leyenda' },
    { min: 60, icon: '💎', pt: 'Titã Mundial', en: 'World Titan', es: 'Titán Mundial' },
  ];

  function ready() {
    return !!(C && C.ld);
  }

  function t(key, fb) {
    if (global.TBRuntime && global.TBRuntime.t) return global.TBRuntime.t(key, fb);
    if (global.TBRoadmap && global.TBRoadmap.isReady && global.TBRoadmap.isReady()) {
      const v = global.TBRoadmap.t(key);
      if (v) return v;
    }
    return fb;
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

  function titleLabel(entry) {
    return entry[lang()] || entry.pt;
  }

  function getPlayerTitle(unlocked) {
    const u = unlocked != null ? unlocked : C.getUnlocked();
    let best = TITLES[0];
    TITLES.forEach((e) => {
      if (u >= e.min) best = e;
    });
    return best;
  }

  function dailySeed() {
    const day = Math.floor(Date.now() / 86400000);
    return (day * 7919 + 104729) >>> 0;
  }

  function dailyDayKey() {
    return Math.floor(Date.now() / 86400000);
  }

  function getDailyBest() {
    const s = C.ld();
    const day = dailyDayKey();
    return (s.dailyPuzzle && s.dailyPuzzle[day]) || 0;
  }

  function renderMapTitle() {
    if (!ready()) return;
    const el = document.getElementById('map-player-title');
    if (!el) return;
    const s = C.ld();
    const title = getPlayerTitle();
    const name = s.playerName || t('you', 'Você');
    el.textContent = `${title.icon} ${name} · ${titleLabel(title)}`;
    const notif = document.getElementById('daily-notif');
    if (notif) notif.style.display = getDailyBest() > 0 ? 'none' : 'inline-block';
  }

  function openProfileModal() {
    const s = C.ld();
    const st = s.stats || {};
    const title = getPlayerTitle();
    const name = s.playerName || t('you', 'Você');
    const unl = C.getUnlocked();
    const triples = Object.values(s.stars || {}).filter((v) => v >= 3).length;
    C.showGlobalModal(`
      <div style="font-size:44px;line-height:1">${title.icon}</div>
      <div style="font-size:18px;font-weight:800">${name}</div>
      <div style="font-size:13px;color:var(--accent);font-weight:700;margin-bottom:12px">${titleLabel(title)}</div>
      <div class="profile-stats">
        <div class="profile-stat"><span>${t('levels', 'Fases')}</span><b>${unl}</b></div>
        <div class="profile-stat"><span>3★</span><b>${triples}</b></div>
        <div class="profile-stat"><span>${t('infinite', 'Infinito')}</span><b>${(st.infBest || 0).toLocaleString()}</b></div>
        <div class="profile-stat"><span>🌍 ${t('daily_puzzle', 'Diário')}</span><b>${getDailyBest().toLocaleString()}</b></div>
        <div class="profile-stat"><span>🔥</span><b>${s.winStreak || 0}</b></div>
        <div class="profile-stat"><span>💰</span><b>${C.getCoins().toLocaleString()}</b></div>
      </div>
      <button class="btn btn-g btn-full" style="margin-top:8px" data-action="openPlayerNameModal">✏️ ${t('player_name', 'Nome')}</button>
      <button class="btn btn-p btn-full" style="margin-top:8px" data-action="closeGlobalModal">${t('close', 'Fechar')}</button>
    `);
  }

  function dailyLeaderboardRows() {
    const s = C.ld();
    const lb = s.lb || { daily: [], ghosts: [] };
    const today = dailyDayKey();
    const list = (lb.daily || []).filter((e) => Math.floor(e.date / 86400000) === today);
    list.sort((a, b) => b.score - a.score);
    const name = s.playerName || t('you', 'Você');
    if (!list.length) {
      const ghosts = (lb.ghosts || []).slice(0, 5);
      return ghosts
        .map(
          (g, i) =>
            `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="lb-name">${esc(g.name)}</span><span class="lb-score">${g.score.toLocaleString()}</span></div>`
        )
        .join('');
    }
    return list
      .slice(0, 8)
      .map(
        (e, i) =>
          `<div class="lb-row${e.name === name ? ' lb-me' : ''}"><span class="lb-rank">#${i + 1}</span><span class="lb-name">${esc(e.name)}${e.name === name ? ' ★' : ''}</span><span class="lb-score">${e.score.toLocaleString()}</span></div>`
      )
      .join('');
  }

  async function loadDailyGlobalRows() {
    if (global.TBFirebase && TBFirebase.configValid()) {
      try {
        await TBFirebase.boot();
        const top = await TBFirebase.fetchTop('daily', 8);
        if (top.length) {
          return top
            .map(
              (g) =>
                `<div class="lb-row${g.me ? ' lb-me' : ''}"><span class="lb-rank">#${g.rank}</span><span class="lb-name">${esc(g.name)}${g.me ? ' ★' : ''}</span><span class="lb-score">${g.score.toLocaleString()}</span></div>`
            )
            .join('');
        }
      } catch (e) {
        if (global.TBRuntime && global.TBRuntime.warn)
          global.TBRuntime.warn('TBGlobal.loadDailyGlobalRows', e);
      }
    }
    return dailyLeaderboardRows();
  }

  function openDailyPuzzleModal() {
    const best = getDailyBest();
    const played = best > 0;
    C.showGlobalModal(`
      <div style="font-size:40px">🌍</div>
      <div style="font-size:18px;font-weight:800">${t('daily_puzzle', 'Puzzle Diário Global')}</div>
      <div style="font-size:12px;color:var(--dim);line-height:1.6;margin:8px 0 14px">
        ${t('daily_puzzle_desc', 'O mesmo tabuleiro para todos os jogadores hoje. Faça a maior pontuação em 18 movimentos!')}
      </div>
      <div style="background:rgba(255,255,255,.06);border-radius:12px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;color:var(--dim)">${t('your_best', 'Seu recorde hoje')}</div>
        <div style="font-size:26px;font-weight:800;color:var(--accent)">${best > 0 ? best.toLocaleString() + ' pts' : '—'}</div>
      </div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${t('daily_rank', 'Ranking de hoje')}</div>
      <div id="daily-lb-list" class="lb-list" style="max-height:140px;margin-bottom:12px">…</div>
      <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="startDailyPuzzle">▶ ${played ? t('play_again', 'Jogar novamente') : t('play', 'Jogar')}</button>
      <button class="btn btn-g btn-full" data-action="closeGlobalModal">${t('close', 'Fechar')}</button>
    `);
    loadDailyGlobalRows().then((html) => {
      const el = document.getElementById('daily-lb-list');
      if (el) el.innerHTML = html || '<div style="font-size:12px;color:var(--dim)">—</div>';
    });
  }

  function startDailyPuzzle() {
    C.closeGlobalModal();
    C.startDailyPuzzleGame && C.startDailyPuzzleGame();
  }

  function onDailyPuzzleComplete(score, isNew) {
    const name = C.ld().playerName || t('you', 'Você');
    if (isNew && C.addCoins) {
      C.addCoins(25);
      C.updateMapMeta && C.updateMapMeta();
    }
    if (global.TBRoadmap) TBRoadmap.recordLeaderboardScore('daily', score);
    if (global.TBFirebase && TBFirebase.configValid()) {
      TBFirebase.boot()
        .then(() => TBFirebase.submitScore('daily', score, name))
        .catch(() => {});
    }
    C.checkAchievements && C.checkAchievements();
    TBAnalytics && TBAnalytics.log('daily_complete', { score, isNew });
    try {
      const s = C.ld();
      s.liveOpsValueDelivered = true;
      C.sv(s);
    } catch (e) {
      /* ignore */
    }
    setTimeout(() => {
      C.showGlobalModal(`
        <div style="font-size:40px">🌍</div>
        <div style="font-size:17px;font-weight:800">${t('daily_puzzle', 'Puzzle Diário')}</div>
        <div style="font-size:32px;font-weight:800;color:var(--accent);margin:10px 0">${score.toLocaleString()} pts</div>
        ${isNew ? `<div style="font-size:12px;color:#4ecb71;font-weight:700;margin-bottom:8px">🏅 ${t('new_record', 'Novo recorde!')} · ${t('daily_reward_coins', '+25 moedas pelo recorde!')}</div>` : ''}
        <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="shareDailyScore" data-arg="${score}">📤 ${t('share', 'Compartilhar')}</button>
        <button class="btn btn-g btn-full" data-action="closeAndGoMap">${t('map', 'Mapa')}</button>
      `);
    }, 400);
  }

  function shareDailyScore(score) {
    const text = `Tile Blast 🌍 ${t('daily_puzzle', 'Puzzle Diário')}: ${score.toLocaleString()} pts! Can you beat me?`;
    const url = location.href.split('?')[0] + '?play=daily';
    if (navigator.share) navigator.share({ title: 'Tile Blast', text, url }).catch(() => {});
    else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url);
      C.showToast('📤', t('share', 'Compartilhar'), 'Copiado!');
    }
  }

  function shareChallengeLink(levelId) {
    const idx = levelId != null ? levelId : C.getUnlocked();
    const n = idx + 1;
    const s = C.ld();
    const seed = s.stars && s.stars[idx] >= 3 ? 'master' : 'normal';
    const base = location.href.split('?')[0].split('#')[0];
    const finish = (url) => {
      const text = `${t('challenge_friend', 'Desafio')}: ${t('levels', 'Fase')} ${n} no Tile Blast! ${t('challenge_beat', 'Você consegue superar minha pontuação?')} 🎮`;
      if (navigator.share) {
        navigator.share({ title: 'Tile Blast', text, url }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text + ' ' + url);
        C.showToast('📤', t('share', 'Compartilhar'), t('challenge_link_copied', 'Link copiado!'));
      }
    };
    let url = `${base}?challenge=${n}&seed=${seed}`;
    if (global.TBFirebase && global.TBFirebase.configValid && global.TBFirebase.configValid()) {
      Promise.resolve(global.TBFirebase.boot())
        .then(() => global.TBFirebase.createChallenge({ levelIdx: idx, seed }))
        .then((r) => {
          if (r && r.id && r.nonce) {
            url = `${base}?c=${encodeURIComponent(r.id)}&n=${encodeURIComponent(r.nonce)}&challenge=${n}&seed=${seed}`;
          }
          finish(url);
        })
        .catch(() => finish(url));
      return;
    }
    finish(url);
  }

  function maybePromptInstall() {
    const s = C.ld();
    if (s.pwaPrompted || !deferredInstall) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    s.pwaPrompted = true;
    C.sv(s);
    setTimeout(() => {
      C.showGlobalModal(`
        <div style="font-size:40px">📲</div>
        <div style="font-size:17px;font-weight:800">${t('install_title', 'Instalar Tile Blast')}</div>
        <div style="font-size:13px;color:var(--dim);margin:8px 0 14px;line-height:1.5">${t('install_desc', 'Jogue offline, acesso rápido e experiência em tela cheia.')}</div>
        <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="installPwa">${t('install_btn', 'Instalar')}</button>
        <button class="btn btn-g btn-full" data-action="closeGlobalModal">${t('later', 'Depois')}</button>
      `);
    }, 2500);
  }

  function installPwa() {
    C.closeGlobalModal();
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall.userChoice.then(() => {
      deferredInstall = null;
    });
  }

  function maybePromptRate(stars) {
    if (stars < 3) return;
    const s = C.ld();
    if (s.ratePrompted) return;
    s.wins3Star = (s.wins3Star || 0) + 1;
    if (s.wins3Star < 2) {
      C.sv(s);
      return;
    }
    s.ratePrompted = true;
    C.sv(s);
    setTimeout(() => {
      C.showGlobalModal(`
        <div style="font-size:40px">⭐⭐⭐</div>
        <div style="font-size:17px;font-weight:800">${t('rate_title', 'Gostou do Tile Blast?')}</div>
        <div style="font-size:13px;color:var(--dim);margin:8px 0 14px">${t('rate_desc', 'Sua avaliação ajuda o jogo a crescer no mundo todo!')}</div>
        <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="openStoreRating">⭐ ${t('rate_btn', 'Avaliar')}</button>
        <button class="btn btn-g btn-full" data-action="closeGlobalModal">${t('later', 'Depois')}</button>
      `);
    }, 1800);
  }

  function openStoreRating() {
    C.closeGlobalModal();
    const pkg = 'com.tileblast.game';
    const url = /android/i.test(navigator.userAgent)
      ? `https://play.google.com/store/apps/details?id=${pkg}`
      : 'https://play.google.com/store/apps/details?id=' + pkg;
    window.open(url, '_blank', 'noopener');
  }

  function boot() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstall = e;
    });
    renderMapTitle();
    const wins = C.getUnlocked();
    if (wins >= 2) maybePromptInstall();
    const params = new URLSearchParams(location.search);
    if (params.get('daily') != null || params.get('play') === 'daily') {
      setTimeout(() => openDailyPuzzleModal(), 1500);
    }
  }

  global.TBGlobal = {
    isReady: ready,
    init(cfg) {
      C = cfg;
      boot();
    },
    renderMapTitle,
    openProfileModal,
    openDailyPuzzleModal,
    startDailyPuzzle,
    onDailyPuzzleComplete,
    shareDailyScore,
    shareChallengeLink,
    installPwa,
    maybePromptRate,
    openStoreRating,
    getPlayerTitle,
    dailySeed,
  };
})(typeof window !== 'undefined' ? window : globalThis);
