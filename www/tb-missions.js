// @ts-check
/**
 * Tile Blast — missões diárias e semanais
 * Extraído de tb-meta-ui.js. TBMissions.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBMissionsCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBContent = global.TBContent;
  /** @type {any} */
  const TBFeatures = global.TBFeatures;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  /** @param {TBMissionsCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // DAILY MISSIONS SYSTEM (pool carregado de data/missions.json via TBContent)
  // ═══════════════════════════════════════════════════════════════
  let MISSION_POOL = [];
  let WEEKLY_MISSION_POOL = [];
  function _syncMissionPools() {
    if (!C || !C._contentReady()) return;
    MISSION_POOL = TBContent.getDailyMissionPool();
    WEEKLY_MISSION_POOL = TBContent.getWeeklyMissionPool();
  }
  function _dmCount() {
    return (C._contentReady() && TBContent.getDailyMissionCount()) || 3;
  }
  function _wmCount() {
    return (C._contentReady() && TBContent.getWeeklyMissionCount()) || 5;
  }
  const DM_SAVE_KEY = 'dm';
  const WM_SAVE_KEY = 'wm';

  function _missionLabel(def) {
    if (TBFeatures && TBFeatures.missionLabel) return TBFeatures.missionLabel(def);
    return def.label.replace('{n}', String(def.target));
  }
  function _dmToday() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function _dmRewardLabel(reward) {
    if (reward.pu) {
      const pd = C.PU_DEFS.find((p) => p.id === reward.pu);
      return `${pd ? pd.label + ' ' : ''} ${pd ? pd.desc : reward.pu}`;
    }
    return C._t('reward_coins_n', '💰 +{n} moedas').replace('{n}', String(reward.coins));
  }

  // Retorna ou gera missões do dia (persiste no localStorage)
  function getDailyMissions() {
    const s = C.ld();
    s[DM_SAVE_KEY] = s[DM_SAVE_KEY] || {};
    const dm = s[DM_SAVE_KEY];
    if (dm.date === _dmToday() && dm.missions && dm.missions.length === _dmCount()) return dm;
    // Novo dia: gerar missões sem repetição de tipo
    const usedTypes = new Set();
    const picked = [];
    const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
    for (const m of shuffled) {
      if (picked.length >= _dmCount()) break;
      if (usedTypes.has(m.type + (m.color ?? ''))) continue;
      usedTypes.add(m.type + (m.color ?? ''));
      picked.push({ poolIdx: MISSION_POOL.indexOf(m), progress: 0, claimed: false });
    }
    dm.date = _dmToday();
    dm.missions = picked;
    C.sv(s);
    return dm;
  }

  // Atualiza progresso de missões diárias e semanais pelo tipo de evento
  function updateMissionProgress(type, amount, extra) {
    const s = C.ld();
    const dm = s[DM_SAVE_KEY];
    if (!dm || dm.date !== _dmToday() || !dm.missions) return;
    let changed = false;
    for (const slot of dm.missions) {
      if (slot.claimed) continue;
      const def = MISSION_POOL[slot.poolIdx];
      if (def.type !== type) continue;
      // Para color_popped, verificar cor correta
      if (type === 'color_popped' && def.color !== extra) continue;
      // Para score_in_level, usar max (não soma)
      if (type === 'score_in_level') {
        if ((extra || 0) > slot.progress) {
          slot.progress = extra;
          changed = true;
        }
        continue;
      }
      if (type === 'win_streak') {
        if ((extra || 0) > slot.progress) {
          slot.progress = extra;
          changed = true;
        }
        continue;
      }
      if (type === 'daily_puzzle') {
        slot.progress = Math.min(slot.progress + amount, def.target);
        changed = true;
        continue;
      }
      slot.progress = Math.min(slot.progress + amount, def.target);
      changed = true;
    }
    if (changed) {
      C.sv(s);
      _updateMissionsNotif();
    }
    // Propagar também para missões semanais
    _updateWeeklyProgress(type, amount, extra);
  }

  // Verifica se o jogador pode coletar uma missão
  function _missionComplete(slot) {
    const def = MISSION_POOL[slot.poolIdx];
    return !slot.claimed && slot.progress >= def.target;
  }

  // Coleta recompensa de missão
  function claimMission(slotIdx) {
    const s = C.ld();
    const dm = s[DM_SAVE_KEY];
    if (!dm || !dm.missions) return;
    const slot = dm.missions[slotIdx];
    if (!slot || slot.claimed) return;
    const def = MISSION_POOL[slot.poolIdx];
    if (slot.progress < def.target) return;
    slot.claimed = true;
    // Aplicar recompensa
    if (def.reward.coins) C.addCoins(def.reward.coins);
    if (def.reward.pu) C.addPU(def.reward.pu, def.reward.amount || 1);
    if (TBRoadmap) TBRoadmap.statBump('missionsDone');
    C.sv(s);
    _updateMissionsNotif();
    // Atualizar modal se aberto
    const modal = document.getElementById('dm-modal-content');
    if (modal) _renderMissionsModal();
    // Toast
    const rewardStr = _dmRewardLabel(def.reward);
    C.showToast(
      '✅',
      C._t('mission_complete', 'Missão completa!'),
      C._t('reward_label', 'Recompensa: {reward}').replace('{reward}', rewardStr)
    );
    C.checkAchievements();
    (global.addXP || function () {})((global.XP_DEFS || {}).daily_mission);
  }

  // Atualiza o ponto vermelho no botão de missões (diárias ou semanais)
  function _updateMissionsNotif() {
    const dot = document.getElementById('missions-notif');
    if (!dot) return;
    const dm = getDailyMissions();
    const wm = getWeeklyMissions();
    const hasClaimable =
      dm.missions.some((s) => _missionComplete(s)) ||
      wm.missions.some((s) => _wmMissionComplete(s));
    dot.style.display = hasClaimable ? '' : 'none';
    if (global.TBMap && typeof global.TBMap.syncMoreNotif === 'function') {
      global.TBMap.syncMoreNotif();
    }
  }

  // Tempo restante para reset (HH:MM)
  function _dmTimeUntilReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  // Renderiza conteúdo do painel de missões diárias
  function _renderMissionsModal() {
    const dm = getDailyMissions();
    const container = document.getElementById('dm-modal-content');
    if (!container) return;
    container.innerHTML = `
    <div class="dm-reset">Reinicia em ${_dmTimeUntilReset()}</div>
    ${dm.missions
      .map((slot, idx) => {
        const def = MISSION_POOL[slot.poolIdx];
        const pct = Math.min(100, (slot.progress / def.target) * 100);
        const done = slot.progress >= def.target;
        const claimed = slot.claimed;
        const label = _missionLabel(def);
        const rewardStr = _dmRewardLabel(def.reward);
        return `<div class="dm-card ${done && !claimed ? 'dm-done' : ''} ${claimed ? 'dm-claimed' : ''}">
        <div class="dm-top">
          <div class="dm-icon">${def.icon}</div>
          <div class="dm-info">
            <div class="dm-label">${label}</div>
            <div class="dm-reward">🎁 ${rewardStr}</div>
          </div>
        </div>
        <div class="dm-bottom">
          <div class="dm-bar-wrap"><div class="dm-bar-fill ${done ? 'dm-bar-done' : ''}" style="width:${pct}%"></div></div>
          <div class="dm-prog ${done ? 'dm-prog-done' : ''}">${done ? '✓' : slot.progress + '/' + def.target}</div>
        </div>
        ${done && !claimed ? `<button class="dm-claim-btn" data-action="claimMission" data-arg="${idx}">Coletar Recompensa</button>` : ''}
        ${claimed ? `<div class="dm-claimed-badge">✅ Coletado</div>` : ''}
      </div>`;
      })
      .join('')}
  `;
  }

  // Abre modal de missões com abas Diárias / Semanais
  function openMissionsModal() {
    C.Sound.click();
    C.showGlobalModal(`
    <div class="dm-header">📋 Missões</div>
    <div class="ms-tabs">
      <button class="ms-tab active" data-action="switchMissionTab" data-arg="daily">📋 Diárias</button>
      <button class="ms-tab" data-action="switchMissionTab" data-arg="weekly">🗓 Semanais</button>
    </div>
    <div id="ms-tab-daily"><div id="dm-modal-content"></div></div>
    <div id="ms-tab-weekly" style="display:none"><div id="wm-modal-content"></div></div>
    <button class="btn btn-g btn-full" type="button" style="margin-top:14px" data-action="C.closeGlobalModal">← ${C._t('map', 'Voltar ao mapa')}</button>
  `);
    _renderMissionsModal();
  }

  // ═══════════════════════════════════════════════════════════════
  // WEEKLY MISSIONS LOGIC
  // ═══════════════════════════════════════════════════════════════

  // Retorna a data da segunda-feira da semana atual (chave de semana)
  function _wmWeekKey() {
    const d = new Date();
    const day = d.getDay(); // 0=Dom … 6=Sáb
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return `${mon.getFullYear()}-${mon.getMonth() + 1}-${mon.getDate()}`;
  }

  // Retorna ou gera missões da semana
  function getWeeklyMissions() {
    const s = C.ld();
    s[WM_SAVE_KEY] = s[WM_SAVE_KEY] || {};
    const wm = s[WM_SAVE_KEY];
    if (wm.week === _wmWeekKey() && wm.missions && wm.missions.length === _wmCount()) return wm;
    const usedTypes = new Set();
    const picked = [];
    const shuffled = [...WEEKLY_MISSION_POOL].sort(() => Math.random() - 0.5);
    for (const m of shuffled) {
      if (picked.length >= _wmCount()) break;
      if (usedTypes.has(m.type + (m.color ?? ''))) continue;
      usedTypes.add(m.type + (m.color ?? ''));
      picked.push({ poolIdx: WEEKLY_MISSION_POOL.indexOf(m), progress: 0, claimed: false });
    }
    wm.week = _wmWeekKey();
    wm.missions = picked;
    C.sv(s);
    return wm;
  }

  // Tempo restante até segunda-feira (reinício da semana)
  function _wmTimeUntilReset() {
    const now = new Date();
    const day = now.getDay();
    const daysUntilMon = day === 0 ? 1 : 8 - day;
    const nextMon = new Date(now);
    nextMon.setDate(now.getDate() + daysUntilMon);
    nextMon.setHours(0, 0, 0, 0);
    const diff = nextMon.getTime() - now.getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
  }

  // Missão semanal completa e não coletada?
  function _wmMissionComplete(slot) {
    const def = WEEKLY_MISSION_POOL[slot.poolIdx];
    return !slot.claimed && slot.progress >= def.target;
  }

  // Atualiza progresso das missões semanais (chamado internamente)
  function _updateWeeklyProgress(type, amount, extra) {
    const s = C.ld();
    const wm = s[WM_SAVE_KEY];
    if (!wm || wm.week !== _wmWeekKey() || !wm.missions) return;
    let changed = false;
    for (const slot of wm.missions) {
      if (slot.claimed) continue;
      const def = WEEKLY_MISSION_POOL[slot.poolIdx];
      if (def.type !== type) continue;
      if (type === 'color_popped' && def.color !== extra) continue;
      if (type === 'score_in_level') {
        if ((extra || 0) > slot.progress) {
          slot.progress = extra;
          changed = true;
        }
        continue;
      }
      if (type === 'win_streak') {
        if ((extra || 0) > slot.progress) {
          slot.progress = extra;
          changed = true;
        }
        continue;
      }
      if (type === 'daily_puzzle') {
        slot.progress = Math.min(slot.progress + amount, def.target);
        changed = true;
        continue;
      }
      slot.progress = Math.min(slot.progress + amount, def.target);
      changed = true;
    }
    if (changed) {
      C.sv(s);
      _updateMissionsNotif();
    }
  }

  // Coleta recompensa de missão semanal
  function claimWeeklyMission(slotIdx) {
    const s = C.ld();
    const wm = s[WM_SAVE_KEY];
    if (!wm || !wm.missions) return;
    const slot = wm.missions[slotIdx];
    if (!slot || slot.claimed) return;
    const def = WEEKLY_MISSION_POOL[slot.poolIdx];
    if (slot.progress < def.target) return;
    slot.claimed = true;
    if (def.reward.coins) C.addCoins(def.reward.coins);
    if (def.reward.pu) C.addPU(def.reward.pu, def.reward.amount || 1);
    C.sv(s);
    _updateMissionsNotif();
    const cont = document.getElementById('wm-modal-content');
    if (cont) _renderWeeklyMissionsModal();
    C.showToast(
      '✅',
      C._t('mission_weekly_complete', 'Missão semanal completa!'),
      C._t('reward_label', 'Recompensa: {reward}').replace('{reward}', _dmRewardLabel(def.reward))
    );
    C.checkAchievements();
    (global.addXP || function () {})((global.XP_DEFS || {}).weekly_mission);
    // Todas as 5 missões semanais coletadas → Baú Épico
    const wm2 = C.ld()[WM_SAVE_KEY];
    if (wm2 && wm2.missions && wm2.missions.every((m) => m.claimed)) {
      const added = (global.addChest || function () {})('epic');
      if (added)
        setTimeout(
          () =>
            C.showToast(
              '💜',
              C._t('epic_chest_won', 'Baú Épico ganho!'),
              C._t('weekly_all_done', 'Todas as missões semanais completas!')
            ),
          600
        );
    }
  }

  // Renderiza conteúdo do painel de missões semanais
  function _renderWeeklyMissionsModal() {
    const wm = getWeeklyMissions();
    const container = document.getElementById('wm-modal-content');
    if (!container) return;
    container.innerHTML = `
    <div class="dm-reset">Reinicia em ${_wmTimeUntilReset()}</div>
    ${wm.missions
      .map((slot, idx) => {
        const def = WEEKLY_MISSION_POOL[slot.poolIdx];
        const pct = Math.min(100, (slot.progress / def.target) * 100);
        const done = slot.progress >= def.target;
        const claimed = slot.claimed;
        const label = _missionLabel(def);
        const rewardStr = _dmRewardLabel(def.reward);
        return `<div class="dm-card ${done && !claimed ? 'dm-done' : ''} ${claimed ? 'dm-claimed' : ''}">
        <div class="dm-top">
          <div class="dm-icon">${def.icon}</div>
          <div class="dm-info">
            <div class="dm-label">${label}</div>
            <div class="dm-reward">🎁 ${rewardStr}</div>
          </div>
        </div>
        <div class="dm-bottom">
          <div class="dm-bar-wrap"><div class="dm-bar-fill ${done ? 'dm-bar-done' : ''}" style="width:${pct}%"></div></div>
          <div class="dm-prog ${done ? 'dm-prog-done' : ''}">${done ? '✓' : slot.progress.toLocaleString(C._shopLocale()) + '/' + def.target.toLocaleString(C._shopLocale())}</div>
        </div>
        ${done && !claimed ? `<button class="dm-claim-btn" data-action="claimWeeklyMission" data-arg="${idx}">Coletar Recompensa</button>` : ''}
        ${claimed ? `<div class="dm-claimed-badge">✅ Coletado</div>` : ''}
      </div>`;
      })
      .join('')}
  `;
  }

  // Alterna entre abas do modal de missões
  function _switchMissionTab(tab, btn) {
    document.querySelectorAll('.ms-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    const daily = document.getElementById('ms-tab-daily');
    const weekly = document.getElementById('ms-tab-weekly');
    if (!daily || !weekly) return;
    daily.style.display = tab === 'daily' ? '' : 'none';
    weekly.style.display = tab === 'weekly' ? '' : 'none';
    if (tab === 'weekly') _renderWeeklyMissionsModal();
  }

  /** @type {any} */
  const api = {
    init,
    syncMissionPools: _syncMissionPools,
    updateMissionProgress,
    openMissionsModal,
    claimMission,
    claimWeeklyMission,
    getDailyMissions,
    getWeeklyMissions,
    updateMissionsNotif: _updateMissionsNotif,
  };

  /** @type {any} */
  const g = global;
  g._syncMissionPools = _syncMissionPools;
  g.getDailyMissions = getDailyMissions;
  g.getWeeklyMissions = getWeeklyMissions;
  g.updateMissionProgress = updateMissionProgress;
  g.claimMission = claimMission;
  g.claimWeeklyMission = claimWeeklyMission;
  g._switchMissionTab = _switchMissionTab;
  g._updateMissionsNotif = _updateMissionsNotif;
  g.openMissionsModal = openMissionsModal;
  g.TBMissions = api;
})(typeof window !== 'undefined' ? window : globalThis);
