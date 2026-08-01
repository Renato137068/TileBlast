// @ts-check
/**
 * Tile Blast — baús (slots, unlock, recompensas)
 * Extraído de tb-meta-ui.js. TBChests.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBChestsCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBJuice = global.TBJuice;
  /** @type {any} */
  const TBConfig = global.TBConfig;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  /** @param {TBChestsCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  const CHEST_DEFS = {
    bronze: {
      icon: '🟫',
      label: 'Baú de Bronze',
      timerMs: 30 * 60 * 1000,
      coinsMin: 50,
      coinsMax: 100,
      puCount: 1,
      color: '#cd7f32',
    },
    silver: {
      icon: '🥈',
      label: 'Baú de Prata',
      timerMs: 2 * 60 * 60 * 1000,
      coinsMin: 100,
      coinsMax: 200,
      puCount: 2,
      color: '#c0c0c0',
    },
    gold: {
      icon: '🥇',
      label: 'Baú de Ouro',
      timerMs: 8 * 60 * 60 * 1000,
      coinsMin: 200,
      coinsMax: 400,
      puCount: 3,
      color: '#ffd700',
    },
    epic: {
      icon: '💜',
      label: 'Baú Épico',
      timerMs: 12 * 60 * 60 * 1000,
      coinsMin: 400,
      coinsMax: 700,
      puCount: 4,
      color: '#b06aff',
    },
    legendary: {
      icon: '🔥',
      label: 'Baú Lendário',
      timerMs: 24 * 60 * 60 * 1000,
      coinsMin: 700,
      coinsMax: 1200,
      puCount: 6,
      color: '#ff6b35',
    },
  };
  const CHEST_SLOTS = TBConfig.CHEST_SLOTS;
  const CHEST_SAVE_KEY = TBConfig.CHEST_SAVE_KEY;
  const CHEST_PU_POOL = ['bomb', 'rainbow', 'moves', 'shuffle'];

  // Retorna array de slots (null = vazio, objeto = baú)
  function getChests() {
    const s = C.ld();
    if (!s[CHEST_SAVE_KEY] || s[CHEST_SAVE_KEY].length !== CHEST_SLOTS) {
      s[CHEST_SAVE_KEY] = Array(CHEST_SLOTS).fill(null);
      C.sv(s);
    }
    return s[CHEST_SAVE_KEY];
  }

  // Tenta adicionar baú ao primeiro slot livre. Retorna true se adicionado.
  function addChest(tier) {
    const s = C.ld();
    const chests = s[CHEST_SAVE_KEY] || Array(CHEST_SLOTS).fill(null);
    const freeIdx = chests.findIndex((c) => c === null);
    if (freeIdx === -1) return false; // sem slot livre
    chests[freeIdx] = { tier, unlockedAt: null, openableAt: null };
    s[CHEST_SAVE_KEY] = chests;
    C.sv(s);
    renderChestBar();
    return true;
  }

  // Inicia o timer de abertura de um slot (se não iniciado)
  function _startChestUnlock(slotIdx) {
    const s = C.ld();
    const chests = s[CHEST_SAVE_KEY];
    if (!chests || !chests[slotIdx]) return;
    const slot = chests[slotIdx];
    if (slot.unlockedAt) return; // já iniciado
    // Apenas um baú pode estar sendo aberto por vez
    const alreadyUnlocking = chests.some(
      (c, i) => i !== slotIdx && c && c.unlockedAt && c.openableAt > Date.now()
    );
    if (alreadyUnlocking) {
      C.showToast(
        '⏳',
        C._t('chest_busy', 'Já abrindo um baú!'),
        C._t('chest_busy_hint', 'Aguarde ou pule o timer')
      );
      return;
    }
    const def = CHEST_DEFS[slot.tier];
    slot.unlockedAt = Date.now();
    slot.openableAt = Date.now() + def.timerMs;
    s[CHEST_SAVE_KEY] = chests;
    C.sv(s);
    C.closeGlobalModal();
    renderChestBar();
    C.showToast(
      def.icon,
      C._t('chest_opening', 'Abrindo {name}').replace(
        '{name}',
        (
          global._locChestLabel ||
          function (t, f) {
            return f || t;
          }
        )(slot.tier, def.label)
      ),
      C._t('chest_timer_started', 'Timer iniciado!')
    );
  }

  // Verifica se o timer expirou
  function _chestReady(slot) {
    return slot && slot.openableAt && Date.now() >= slot.openableAt;
  }

  // Formata tempo restante em HH:MM:SS ou Xh Ym
  function _chestTimeLeft(slot) {
    if (!slot || !slot.openableAt) return '';
    const ms = Math.max(0, slot.openableAt - Date.now());
    if (ms === 0) return C._t('chest_open_now', 'ABRIR!');
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // Calcula recompensas ao abrir
  function _calcChestRewards(tier) {
    const def = CHEST_DEFS[tier];
    const chestMult =
      (typeof global.getActiveEvent === 'function' ? global.getActiveEvent() : { chestMult: 1 })
        .chestMult || 1;
    const coins = Math.round(
      (def.coinsMin + Math.floor(Math.random() * (def.coinsMax - def.coinsMin + 1))) * chestMult
    );
    const pus = {};
    for (let i = 0; i < def.puCount; i++) {
      const pu = CHEST_PU_POOL[Math.floor(Math.random() * CHEST_PU_POOL.length)];
      pus[pu] = (pus[pu] || 0) + 1;
    }
    return { coins, pus };
  }

  // Abre um baú pronto e dá recompensas
  function openChest(slotIdx) {
    const s = C.ld();
    const chests = s[CHEST_SAVE_KEY];
    if (!chests || !chests[slotIdx]) return;
    const slot = chests[slotIdx];
    if (!_chestReady(slot)) return;
    const rewards = _calcChestRewards(slot.tier);
    const def = CHEST_DEFS[slot.tier];
    C.Sound.chest();
    C.addCoins(rewards.coins);
    Object.entries(rewards.pus).forEach(([pu, amt]) => C.addPU(pu, amt));
    chests[slotIdx] = null;
    s[CHEST_SAVE_KEY] = chests;
    C.sv(s);
    C.closeGlobalModal();
    renderChestBar();
    (global.addXP || function () {})((global.XP_DEFS || {}).chest[slot.tier] || 10);
    // Mostra recompensas
    const puStrs = Object.entries(rewards.pus).map(([pu, amt]) => {
      const pd = C.PU_DEFS.find((p) => p.id === pu);
      return `${pd ? pd.label : pu} ×${amt}`;
    });
    const rewardLines = [
      C._t('chest_coins', '💰 +{n} moedas').replace('{n}', String(rewards.coins)),
      ...puStrs.map((s) => `🎁 ${s}`),
    ].join('<br>');
    C.showGlobalModal(`
    <div class="chm-wrap">
      <div class="chm-icon">${def.icon}</div>
      <div class="chm-title">${C._t('chest_opened', '{name} Aberto!').replace(
        '{name}',
        (
          global._locChestLabel ||
          function (t, f) {
            return f || t;
          }
        )(slot.tier, def.label)
      )}</div>
      <div class="chm-reward-reveal" style="font-size:15px;line-height:1.8;">${rewardLines}</div>
      <button class="btn btn-p" style="width:100%;margin-top:8px;" data-action="C.closeGlobalModal">${C._t('chest_great', '✨ Ótimo!')}</button>
    </div>
  `);
    // Abertura de baú com clarão radial + pop do ícone + moedas voando ao contador.
    if (TBJuice) {
      const icon = document.querySelector('.chm-icon');
      if (icon) {
        icon.classList.add('tbj-chest-pop');
        const r = icon.getBoundingClientRect();
        const target = document.getElementById('map-coins') || document.getElementById('hud-coins');
        if (rewards.coins > 0 && target) {
          TBJuice.coinFly({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, target, {
            count: Math.min(16, Math.max(8, Math.round(rewards.coins / 10))),
            onEach: () => {
              target.classList.remove('tbj-bump');
              void target.offsetWidth;
              target.classList.add('tbj-bump');
            },
          });
        }
      }
    }
    C.checkAchievements();
    if (TBRoadmap) TBRoadmap.statBump('chestsOpened');
    const dropped = (
      global.tryDropCollFromChest ||
      function () {
        return null;
      }
    )(slot.tier);
    if (dropped)
      setTimeout(
        () =>
          C.showToast(
            '🎨',
            C._t('item_unlocked', 'Item Desbloqueado!'),
            (
              global._locCollName ||
              function (_i, n) {
                return n;
              }
            )(dropped)
          ),
        600
      );
  }

  // Pula timer com anúncio ou grátis (no-ads)
  function _chestSkipLabel() {
    return C.hasNoAds()
      ? C._t('chest_skip_vip', '⚡ Abrir agora (VIP)')
      : C._t('chest_skip_ad', '📺 Pular com Anúncio');
  }
  function skipChestFree(slotIdx) {
    const s = C.ld();
    const chests = s[CHEST_SAVE_KEY];
    if (!chests || !chests[slotIdx]) return;
    if (!chests[slotIdx].unlockedAt) chests[slotIdx].unlockedAt = Date.now();
    chests[slotIdx].openableAt = Date.now() - 1;
    s[CHEST_SAVE_KEY] = chests;
    C.sv(s);
    C.closeGlobalModal();
    renderChestBar();
    openChestModal(slotIdx);
  }
  function skipChestTimer(slotIdx) {
    if (C.hasNoAds()) {
      skipChestFree(slotIdx);
      return;
    }
    C.showRewardedAd(() => {
      const s = C.ld();
      const chests = s[CHEST_SAVE_KEY];
      if (!chests || !chests[slotIdx]) return;
      chests[slotIdx].openableAt = Date.now() - 1;
      s[CHEST_SAVE_KEY] = chests;
      C.sv(s);
      C.closeGlobalModal();
      renderChestBar();
      openChestModal(slotIdx);
    }, null);
  }

  // Modal de ação do baú
  function openChestModal(slotIdx) {
    C.Sound.click();
    const chests = getChests();
    const slot = chests[slotIdx];
    if (!slot) {
      return;
    }
    const def = CHEST_DEFS[slot.tier];
    const label = (
      global._locChestLabel ||
      function (t, f) {
        return f || t;
      }
    )(slot.tier, def.label);
    const ready = _chestReady(slot);
    const unlocking = slot.unlockedAt && !ready;
    const idle = !slot.unlockedAt;

    let body = '';
    if (ready) {
      body = `
      <div class="chm-wrap">
        <div class="chm-icon">${def.icon}</div>
        <div class="chm-title">${label}</div>
        <div class="chm-sub">${C._t('chest_ready', 'Pronto para abrir!')}</div>
        <button class="btn btn-p" style="width:100%;font-size:16px;margin-bottom:8px;" data-action="openChest" data-arg="${slotIdx}">${C._t('chest_open_btn', '🎉 Abrir Agora!')}</button>
        <button class="btn" style="width:100%;font-size:13px;" data-action="C.closeGlobalModal">${C._t('close', 'Fechar')}</button>
      </div>`;
    } else if (unlocking) {
      const timeLeft = _chestTimeLeft(slot);
      body = `
      <div class="chm-wrap">
        <div class="chm-icon">${def.icon}</div>
        <div class="chm-title">${label}</div>
        <div class="chm-sub">${C._t('chest_unlocking', 'Abrindo...')}</div>
        <div class="chm-timer" id="chm-live-timer">${timeLeft}</div>
        <button class="btn" style="width:100%;font-size:13px;background:#44c8ff;color:#001622;border:none;padding:10px;border-radius:12px;cursor:pointer;margin-bottom:8px;" data-action="${C.hasNoAds() ? 'skipChestFree' : 'skipChestTimer'}" data-arg="${slotIdx}">${_chestSkipLabel()}</button>
        <button class="btn" style="width:100%;font-size:13px;" data-action="C.closeGlobalModal">${C._t('close', 'Fechar')}</button>
      </div>`;
    } else {
      // idle — pedir para iniciar
      body = `
      <div class="chm-wrap">
        <div class="chm-icon">${def.icon}</div>
        <div class="chm-title">${label}</div>
        <div class="chm-sub">${C._t('chest_waiting', 'Recompensa esperando você!')}</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:14px;">${C._t('chest_timer_label', '⏱ Timer: {time}').replace('{time}', _chestLabelTimer(def.timerMs))}</div>
        <button class="btn btn-p" style="width:100%;font-size:15px;margin-bottom:8px;" data-action="startChestUnlock" data-arg="${slotIdx}">${C._t('chest_start', '🔓 Iniciar Abertura')}</button>
        <button class="btn" style="width:100%;font-size:13px;background:#44c8ff;color:#001622;border:none;padding:10px;border-radius:12px;cursor:pointer;margin-bottom:8px;" data-action="${C.hasNoAds() ? 'skipChestFree' : 'skipChestTimer_idle'}" data-arg="${slotIdx}">${C.hasNoAds() ? C._t('chest_skip_vip', '⚡ Abrir agora (VIP)') : C._t('chest_open_ad', '📺 Abrir com Anúncio')}</button>
        <button class="btn" style="width:100%;font-size:13px;" data-action="C.closeGlobalModal">${C._t('close', 'Fechar')}</button>
      </div>`;
    }
    C.showGlobalModal(body);
    // Atualiza timer ao vivo se desbloqueando
    if (unlocking) {
      const iv = setInterval(() => {
        const el = document.getElementById('chm-live-timer');
        if (!el) {
          clearInterval(iv);
          return;
        }
        const c2 = getChests();
        const s2 = c2[slotIdx];
        if (!s2) {
          clearInterval(iv);
          return;
        }
        if (_chestReady(s2)) {
          clearInterval(iv);
          C.closeGlobalModal();
          renderChestBar();
          openChestModal(slotIdx);
          return;
        }
        el.textContent = _chestTimeLeft(s2);
      }, 1000);
    }
  }

  // Pula timer sem ter iniciado (anúncio direto de idle)
  function skipChestTimer_idle(slotIdx) {
    if (C.hasNoAds()) {
      skipChestFree(slotIdx);
      return;
    }
    C.showRewardedAd(() => {
      const s = C.ld();
      const chests = s[CHEST_SAVE_KEY];
      if (!chests || !chests[slotIdx]) return;
      if (!chests[slotIdx].unlockedAt) chests[slotIdx].unlockedAt = Date.now();
      chests[slotIdx].openableAt = Date.now() - 1;
      s[CHEST_SAVE_KEY] = chests;
      C.sv(s);
      C.closeGlobalModal();
      renderChestBar();
      openChestModal(slotIdx);
    }, null);
  }

  // Formata timer em texto legível (ex: "30 min", "8h")
  function _chestLabelTimer(ms) {
    const h = ms / 3600000;
    if (h < 1) return `${Math.round(ms / 60000)} min`;
    return `${h}h`;
  }

  // Renderiza a barra de baús no mapa
  function renderChestBar() {
    const bar = document.getElementById('chest-bar');
    if (!bar) return;
    const chests = getChests();
    bar.innerHTML = chests
      .map((slot, idx) => {
        if (!slot) {
          return `<div class="chest-slot chest-empty"><div class="chest-icon">📦</div><div class="chest-label">Vazio</div></div>`;
        }
        const def = CHEST_DEFS[slot.tier];
        const ready = _chestReady(slot);
        const unlocking = slot.unlockedAt && !ready;
        let cls = ready ? 'chest-ready' : unlocking ? 'chest-unlocking' : '';
        let timerHtml = ready
          ? `<div class="chest-open-badge">ABRIR!</div>`
          : unlocking
            ? `<div class="chest-timer" id="ct-${idx}">${_chestTimeLeft(slot)}</div>`
            : `<div class="chest-label">${_chestLabelTimer(def.timerMs)}</div>`;
        return `<div class="chest-slot ${cls}" data-action="openChestModal" data-arg="${idx}">
      <div class="chest-icon">${def.icon}</div>
      ${timerHtml}
    </div>`;
      })
      .join('');
  }

  // Tick dos timers na barra (chamado a cada segundo)
  function _tickChestTimers() {
    const chests = getChests();
    let needRerender = false;
    chests.forEach((slot, idx) => {
      if (!slot || !slot.unlockedAt) return;
      if (_chestReady(slot)) {
        // Se acabou de ficar pronto, re-renderiza para mostrar "ABRIR!"
        const el = document.getElementById('ct-' + idx);
        if (el) needRerender = true;
      } else {
        const el = document.getElementById('ct-' + idx);
        if (el) el.textContent = _chestTimeLeft(slot);
      }
    });
    if (needRerender) renderChestBar();
  }

  /** @type {any} */
  const api = {
    init,
    CHEST_DEFS,
    getChests,
    addChest,
    renderChestBar,
    tickChestTimers: _tickChestTimers,
    startChestUnlock: _startChestUnlock,
    openChest,
    openChestModal,
    skipChestFree,
    skipChestTimer,
    skipChestTimer_idle,
  };

  /** @type {any} */
  const g = global;
  g.CHEST_DEFS = CHEST_DEFS;
  g.getChests = getChests;
  g.addChest = addChest;
  g.renderChestBar = renderChestBar;
  g._tickChestTimers = _tickChestTimers;
  g._startChestUnlock = _startChestUnlock;
  g.openChest = openChest;
  g.openChestModal = openChestModal;
  g.skipChestFree = skipChestFree;
  g.skipChestTimer = skipChestTimer;
  g.skipChestTimer_idle = skipChestTimer_idle;
  g.TBChests = api;
})(typeof window !== 'undefined' ? window : globalThis);
