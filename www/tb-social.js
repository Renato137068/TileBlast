// @ts-check
/**
 * Tile Blast — perfil, ranking, cloud save/export, share.
 * Carregar antes de tb-roadmap.js.
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;
  /** @type {any} */
  const g = global;
  /** @type {any} */
  const TBRuntime = global.TBRuntime;

  function t(key, fallback) {
    if (g.TBI18n && g.TBI18n.t) return g.TBI18n.t(key);
    if (g.TBRoadmap && g.TBRoadmap.t) return g.TBRoadmap.t(key);
    return fallback != null ? fallback : key;
  }

  function escHtml(s) {
    if (TBRuntime && TBRuntime.escapeHtml) return TBRuntime.escapeHtml(s);
    return String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  function checkExtendedAchievements(ctx) {
    if (g.TBAchievements && g.TBAchievements.checkExtendedAchievements)
      g.TBAchievements.checkExtendedAchievements(ctx);
  }

  function getPlayerName() {
    const s = C.ld();
    return s.playerName || t('you');
  }

  function openPlayerNameModal() {
    const name = (C.ld().playerName || '').replace(/"/g, '');
    C.showGlobalModal(`
      <div style="font-size:17px;font-weight:800;margin-bottom:8px;">✏️ ${t('player_name')}</div>
      <input id="player-name-inp" maxlength="16" value="${escHtml(name)}" placeholder="${t('you')}"
        style="width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:var(--text);font-size:15px;margin-bottom:12px;">
      <button class="btn btn-p btn-full" data-action="savePlayerName">${t('save')}</button>
    `);
    setTimeout(() => document.getElementById('player-name-inp')?.focus(), 150);
  }

  function savePlayerName() {
    /** @type {HTMLInputElement|null} */
    const inp = /** @type {HTMLInputElement|null} */ (document.getElementById('player-name-inp'));
    const v = (inp && inp.value.trim()) || t('you');
    const s = C.ld();
    s.playerName = sanitizeLocalName(v);
    C.sv(s);
    C.closeGlobalModal();
    C.showToast('✏️', t('player_name'), s.playerName);
  }

  /** Espelho leve do sanitize server (P3.2). */
  function sanitizeLocalName(name) {
    const block = [
      'admin',
      'moderator',
      'moderador',
      'tileblast',
      'oficial',
      'fuck',
      'shit',
      'puta',
      'caralho',
      'porra',
    ];
    let raw = String(name == null ? '' : name)
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 16);
    if (!raw) return t('you') || 'Jogador';
    const lower = raw.toLowerCase();
    for (let i = 0; i < block.length; i++) {
      if (lower.indexOf(block[i]) >= 0) return t('you') || 'Jogador';
    }
    return raw;
  }

  async function deleteSocialData() {
    if (!ready()) return;
    C.showCustomConfirm(
      t(
        'delete_social_confirm',
        'Apagar nome e rankings públicos desta conta? O progresso do jogo permanece.'
      ),
      async () => {
        const s = C.ld();
        s.playerName = '';
        if (s.lb) {
          s.lb.daily = [];
          s.lb.infinite = [];
        }
        C.sv(s);
        let cloudOk = false;
        if (g.TBFirebase && g.TBFirebase.configValid && g.TBFirebase.configValid()) {
          try {
            await g.TBFirebase.boot();
            const r = await g.TBFirebase.deleteSocialData();
            cloudOk = !!(r && r.ok);
          } catch (e) {
            if (TBRuntime && TBRuntime.warn) TBRuntime.warn('TBSocial.deleteSocialData', e);
          }
        }
        C.showToast(
          '🔒',
          t('delete_social_done', 'Dados sociais apagados'),
          cloudOk
            ? t('delete_social_cloud', 'Nome e ranking na nuvem removidos.')
            : t(
                'delete_social_local',
                'Nome local limpo. Entre na nuvem para limpar o ranking remoto.'
              )
        );
        if (g.TBAnalytics) g.TBAnalytics.log('social_data_deleted', { cloud: cloudOk });
      }
    );
  }

  function openDeleteSocialModal() {
    deleteSocialData();
  }

  async function openLeaderboardModal() {
    const lb = getLeaderboard();
    const s = C.ld();
    const today = Math.floor(Date.now() / 86400000);
    const dailyBest = Math.max(
      0,
      ...lb.daily.filter((e) => Math.floor(e.date / 86400000) === today).map((e) => e.score)
    );
    const infBest = s.stats?.infBest || C.getHS() || 0;

    let globalRows = '';
    let loading = '<div style="font-size:12px;color:var(--dim);padding:8px 0">…</div>';
    C.showGlobalModal(`
      <div style="font-size:18px;font-weight:800;">🏆 ${t('leaderboard')}</div>
      <div class="lb-tabs">
        <div class="lb-stat"><div class="lb-stat-l">${t('challenge')}</div><div class="lb-stat-v">${dailyBest.toLocaleString()}</div></div>
        <div class="lb-stat"><div class="lb-stat-l">${t('infinite')}</div><div class="lb-stat-v">${infBest.toLocaleString()}</div></div>
      </div>
      <div style="font-size:11px;color:var(--dim);margin:8px 0 4px;">${t('global_rank')}</div>
      <div id="lb-global-list" class="lb-list">${loading}</div>
      <button class="btn btn-p btn-full" style="margin-top:12px" data-action="closeGlobalModal">${t('close')}</button>
    `);

    if (g.TBFirebase && g.TBFirebase.configValid()) {
      if (g.TBFeatures && !g.TBFeatures.isOnline()) {
        const el = document.getElementById('lb-global-list');
        if (el)
          el.innerHTML = `<div style="font-size:12px;color:var(--dim)">${t('offline_body')}</div>`;
        return;
      }
      try {
        await g.TBFirebase.boot();
        const top = await g.TBFirebase.fetchTop('infinite', 12);
        if (top.length) {
          globalRows = top
            .map(
              (g) =>
                `<div class="lb-row${g.me ? ' lb-me' : ''}"><span class="lb-rank">#${g.rank}</span><span class="lb-name">${escHtml(g.name)}${g.me ? ' ★' : ''}</span><span class="lb-score">${g.score.toLocaleString()}</span></div>`
            )
            .join('');
        }
      } catch (e) {
        if (TBRuntime && TBRuntime.warn) TBRuntime.warn('TBSocial.renderGlobalLeaderboard', e);
      }
    }
    if (!globalRows) {
      const ghosts = lb.ghosts || [];
      globalRows = ghosts
        .map(
          (g, i) =>
            `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="lb-name">${escHtml(g.name)}</span><span class="lb-score">${g.score.toLocaleString()}</span></div>`
        )
        .join('');
    }
    const el = document.getElementById('lb-global-list');
    if (el) el.innerHTML = globalRows;
  }

  function seedName(seed) {
    const names = [
      'BlastyFan',
      'TileKing',
      'ComboPro',
      'StarHunter',
      'GemMaster',
      'Nova',
      'Pixel',
      'Blast99',
    ];
    return names[seed % names.length] + (seed % 100);
  }

  function getLeaderboard() {
    const s = C.ld();
    if (!s.lb) {
      const ghosts = [];
      for (let i = 0; i < 8; i++) {
        ghosts.push({
          name: seedName(i * 17 + 3),
          score: 8000 - i * 650 + (i % 3) * 120,
          bot: true,
        });
      }
      s.lb = { daily: [], infinite: [], ghosts };
      C.sv(s);
    }
    return s.lb;
  }

  function recordLeaderboardScore(mode, score) {
    if (global.__saveTampered) return; // save adulterado não pontua no ranking
    const s = C.ld();
    const lb = getLeaderboard();
    const name = getPlayerName();
    const entry = { name, score, date: Date.now() };
    if (mode === 'daily') {
      const today = Math.floor(Date.now() / 86400000);
      for (let i = lb.daily.length - 1; i >= 0; i--) {
        if (Math.floor(lb.daily[i].date / 86400000) !== today) lb.daily.splice(i, 1);
      }
      const idx = lb.daily.findIndex((e) => e.name === name);
      if (idx >= 0) {
        if (score <= lb.daily[idx].score) return;
        lb.daily[idx] = entry;
      } else lb.daily.push(entry);
      lb.daily.sort((a, b) => b.score - a.score);
      if (lb.daily.length > 20) lb.daily.length = 20;
    } else {
      const list = lb.infinite;
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      if (list.length > 20) list.length = 20;
    }
    C.sv(s);
    if (g.TBFirebase && g.TBFirebase.configValid()) {
      g.TBFirebase.boot()
        .then(() => g.TBFirebase.submitScore(mode, score, name))
        .catch(() => {});
    }
  }

  function exportSave() {
    const raw = localStorage.getItem(C.SK);
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tileblast-save.json';
    a.click();
    URL.revokeObjectURL(a.href);
    const s = C.ld();
    s.cloudSaved = true;
    C.sv(s);
    checkExtendedAchievements();
    C.showToast('☁️', 'Save exportado', 'Arquivo baixado');
  }

  function importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        JSON.parse(text);
        localStorage.setItem(C.SK, text);
        C.showToast('☁️', 'Save importado', 'Recarregando…');
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        C.showToast('❌', 'Arquivo inválido', '');
      }
    };
    reader.readAsText(file);
  }

  async function cloudSyncFirebase() {
    if (g.TBFeatures && !g.TBFeatures.guardOnline()) return;
    if (!g.TBFirebase || !g.TBFirebase.configValid()) {
      C.showToast('☁️', t('sync_fail'), 'firebase-config.js');
      return cloudBackup();
    }
    try {
      const name = getPlayerName();
      const result = await g.TBFirebase.syncWithLocal(C.SK, C.ld, C.sv, () => name);
      if (result.action === 'download' && result.data) {
        localStorage.setItem(C.SK, result.data);
        const s = C.ld();
        s.cloudSaved = true;
        s.cloudAt = Date.now();
        if (result.playerName) s.playerName = result.playerName;
        C.sv(s);
        C.showToast('☁️', t('sync_ok'), 'Recarregando…');
        setTimeout(() => location.reload(), 700);
        return;
      }
      const s = C.ld();
      s.cloudSaved = true;
      s.cloudAt = Date.now();
      C.sv(s);
      checkExtendedAchievements();
      C.showToast('☁️', t('sync_ok'), new Date().toLocaleTimeString());
    } catch (e) {
      C.showToast('☁️', t('sync_fail'), String(e.message || e));
    }
  }

  function cloudBackup() {
    const raw = localStorage.getItem(C.SK);
    if (!raw) return;
    localStorage.setItem(C.SK + '_cloud', raw);
    const s = C.ld();
    s.cloudSaved = true;
    s.cloudAt = Date.now();
    C.sv(s);
    checkExtendedAchievements();
    C.showToast(
      '☁️',
      'Backup na nuvem',
      'Salvo localmente (Firebase: configure google-services.json)'
    );
  }

  function cloudRestore() {
    const raw = localStorage.getItem(C.SK + '_cloud');
    if (!raw) {
      C.showToast('☁️', 'Sem backup', 'Faça backup primeiro');
      return;
    }
    localStorage.setItem(C.SK, raw);
    C.showToast('☁️', 'Restaurado', 'Recarregando…');
    setTimeout(() => location.reload(), 800);
  }

  // Mapeia navigator.language -> idioma suportado (pt|en|es).

  function shareScore(score, label) {
    const safeLabel = String(label || 'Score')
      .replace(/[<>]/g, '')
      .slice(0, 40);
    const text = `Tile Blast — ${safeLabel}: ${(score || 0).toLocaleString()} pts! 🧡`;
    const url = location.href.split('?')[0].split('#')[0];
    // Sem uid, email, token ou query de sessão
    if (/[?&](uid|email|token|idToken)=/i.test(text + url)) return;
    if (navigator.share) {
      navigator.share({ title: 'Tile Blast', text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url);
      C.showToast('📤', t('share'), 'Link copiado!');
    }
  }

  function ready() {
    return !!(C && C.ld);
  }

  const api = {
    isReady: ready,
    /** @param {Record<string, any>|null|undefined} cfg */
    init(cfg) {
      C = cfg || null;
    },
    getPlayerName,
    openPlayerNameModal,
    savePlayerName,
    sanitizeLocalName,
    deleteSocialData,
    openDeleteSocialModal,
    openLeaderboardModal,
    getLeaderboard,
    recordLeaderboardScore,
    exportSave,
    importSave,
    cloudSyncFirebase,
    cloudBackup,
    cloudRestore,
    shareScore,
  };

  global.TBSocial = api;
})(typeof window !== 'undefined' ? window : globalThis);
