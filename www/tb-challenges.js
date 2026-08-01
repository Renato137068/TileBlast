// @ts-check
/**
 * Tile Blast — desafios diários
 * Extraído de tb-meta-ui.js. TBChallenges.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBChallengesCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBContent = global.TBContent;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;

  /** @type {any} */
  let C = null;

  /** @param {TBChallengesCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function _locChallengeName(ch) {
    return C._t('ch_' + ch.id + '_name', ch.name);
  }

  function _locChallengeDesc(ch) {
    const templates = {
      blocks_popped: 'ch_t_blocks',
      combos_made: 'ch_t_combos',
      specials_made: 'ch_t_specials',
      levels_won: 'ch_t_levels',
      score_single: 'ch_t_score',
      color_popped: 'ch_t_color',
    };
    const key = templates[ch.type];
    let desc = key ? C._t(key, ch.desc) : ch.desc;
    desc = desc.replace('{n}', Number(ch.target).toLocaleString(C._shopLocale()));
    if (ch.type === 'color_popped') {
      const color =
        TBRoadmap && TBRoadmap.colorName ? TBRoadmap.colorName(ch.colorIdx) : String(ch.colorIdx);
      desc = desc.replace('{color}', color);
    }
    return desc;
  }

  const CHALLENGE_DEFS = [
    {
      id: 'bp1',
      icon: '💥',
      name: 'Destruidor de Blocos',
      desc: 'Exploda 120 blocos hoje',
      type: 'blocks_popped',
      target: 120,
      reward: { coins: 150, xp: 100 },
    },
    {
      id: 'cm1',
      icon: '🔥',
      name: 'Mestre dos Combos',
      desc: 'Faça 8 combos hoje',
      type: 'combos_made',
      target: 8,
      reward: { coins: 200, xp: 120 },
    },
    {
      id: 'sm1',
      icon: '⭐',
      name: 'Criador de Especiais',
      desc: 'Crie 4 tiles especiais',
      type: 'specials_made',
      target: 4,
      reward: { coins: 175, xp: 110 },
    },
    {
      id: 'lw1',
      icon: '🏆',
      name: 'Vencedor Implacável',
      desc: 'Vença 5 fases hoje',
      type: 'levels_won',
      target: 5,
      reward: { coins: 200, xp: 130 },
    },
    {
      id: 'ss1',
      icon: '🎯',
      name: 'Atirador de Elite',
      desc: 'Alcance 4.000 pts em uma partida',
      type: 'score_single',
      target: 4000,
      reward: { coins: 225, xp: 140 },
    },
    {
      id: 'cp1',
      icon: '🔴',
      name: 'Fúria Vermelha',
      desc: 'Exploda 50 blocos vermelhos',
      type: 'color_popped',
      target: 50,
      colorIdx: 0,
      reward: { coins: 180, xp: 115 },
    },
    {
      id: 'bp2',
      icon: '💥',
      name: 'Implacável',
      desc: 'Exploda 200 blocos hoje',
      type: 'blocks_popped',
      target: 200,
      reward: { coins: 250, xp: 160 },
    },
    {
      id: 'cm2',
      icon: '🌈',
      name: 'Combo Frenético',
      desc: 'Faça 15 combos hoje',
      type: 'combos_made',
      target: 15,
      reward: { coins: 275, xp: 175 },
    },
    {
      id: 'sm2',
      icon: '✨',
      name: 'Arquiteto Especial',
      desc: 'Crie 8 tiles especiais',
      type: 'specials_made',
      target: 8,
      reward: { coins: 250, xp: 160 },
    },
    {
      id: 'lw2',
      icon: '👑',
      name: 'Conquistador',
      desc: 'Vença 8 fases hoje',
      type: 'levels_won',
      target: 8,
      reward: { coins: 300, xp: 190 },
    },
    {
      id: 'ss2',
      icon: '🎯',
      name: 'Lendário',
      desc: 'Alcance 6.000 pts em uma partida',
      type: 'score_single',
      target: 6000,
      reward: { coins: 350, xp: 220 },
    },
    {
      id: 'cp2',
      icon: '🔵',
      name: 'Fúria Azul',
      desc: 'Exploda 60 blocos azuis',
      type: 'color_popped',
      target: 60,
      colorIdx: 2,
      reward: { coins: 250, xp: 165 },
    },
  ];

  function _epochDay() {
    return TBLogic.epochDay();
  }

  function getDailyChallenge() {
    if (TBContent && TBContent.isLoaded())
      return TBContent.getDailyChallengeForDay(_epochDay()) || CHALLENGE_DEFS[0];
    const idx = _epochDay() % CHALLENGE_DEFS.length;
    return CHALLENGE_DEFS[idx];
  }

  function getDailyChallengeState() {
    const s = C.ld();
    const today = _epochDay();
    if (!s.dch || s.dch.day !== today) {
      s.dch = { day: today, progress: 0, done: false };
      C.sv(s);
    }
    return s.dch;
  }

  function updateChallengeProgress(type, amount, extra) {
    const ch = getDailyChallenge();
    if (ch.type !== type) return;
    const st = getDailyChallengeState();
    if (st.done) return;
    if (type === 'color_popped' && extra !== ch.colorIdx) return;
    const s = C.ld();
    if (!s.dch || s.dch.done) return;
    if (type === 'score_single') {
      if (amount < ch.target) return;
      s.dch.progress = amount;
    } else {
      s.dch.progress = Math.min((s.dch.progress || 0) + amount, ch.target);
    }
    const completed = s.dch.progress >= ch.target && !s.dch.done;
    if (completed) s.dch.done = true;
    C.sv(s);
    renderChallengeNotif();
    if (completed) _completeDailyChallenge(ch);
  }

  function _completeDailyChallenge(ch) {
    const r = ch.reward;
    C.addCoins(r.coins);
    if (typeof global.addXP === 'function') global.addXP(r.xp);
    if (TBRoadmap) TBRoadmap.statBump('challengesDone');
    C.checkAchievements();
    setTimeout(
      () =>
        C.showToast(
          '🏆',
          C._t('challenge_done', 'Desafio Concluído!'),
          C._t('reward_coins_xp', '+{coins} moedas · +{xp} XP')
            .replace('{coins}', String(r.coins))
            .replace('{xp}', String(r.xp))
        ),
      400
    );
  }

  function renderChallengeNotif() {
    const st = getDailyChallengeState();
    const dot = document.getElementById('challenge-notif');
    if (!dot) return;
    dot.style.display = st.done ? 'none' : '';
    if (global.TBMap && typeof global.TBMap.syncMoreNotif === 'function') {
      global.TBMap.syncMoreNotif();
    }
  }

  function openChallengeModal() {
    const ch = getDailyChallenge();
    const st = getDailyChallengeState();
    const prog = Math.min(st.progress || 0, ch.target);
    const pct = Math.round((prog / ch.target) * 100);
    const done = st.done;
    const tomorrow = (_epochDay() + 1) * 86400000;
    const msLeft = tomorrow - Date.now();
    const hLeft = Math.floor(msLeft / 3600000);
    const mLeft = Math.floor((msLeft % 3600000) / 60000);
    const timeStr = `${hLeft}h ${mLeft.toString().padStart(2, '0')}m`;

    const descFull = _locChallengeDesc(ch);

    const rewardRows = `<div style="display:flex;gap:8px;justify-content:center;margin:10px 0;">
    <div style="background:rgba(255,255,255,.07);border-radius:8px;padding:8px 14px;text-align:center;">
      <div style="font-size:18px;">💰</div><div style="font-size:12px;font-weight:800;color:#f6c945;">+${ch.reward.coins}</div>
    </div>
    <div style="background:rgba(255,255,255,.07);border-radius:8px;padding:8px 14px;text-align:center;">
      <div style="font-size:18px;">⚡</div><div style="font-size:12px;font-weight:800;color:#a78bfa;">+${ch.reward.xp} XP</div>
    </div>
  </div>`;

    const progressBlock = done
      ? `<div class="dch-done-badge">✅ ${C._t('challenge_done', 'Desafio Concluído!')}</div>`
      : `<div class="dch-prog-wrap"><div class="dch-prog-bar" style="width:${pct}%"></div></div>
       <div style="font-size:11px;color:var(--dim);text-align:right;">${prog}/${ch.target} (${pct}%)</div>`;

    C.showGlobalModal(`<div style="padding:4px 0;">
    <div style="font-size:28px;margin-bottom:4px;">${ch.icon}</div>
    <div style="font-size:17px;font-weight:900;margin-bottom:2px;">${_locChallengeName(ch)}</div>
    <div style="font-size:12px;color:var(--dim);margin-bottom:10px;">${descFull}</div>
    ${progressBlock}
    <div style="font-size:10px;color:var(--dim);margin:6px 0 2px;">${C._t('rewards_on_complete', 'Recompensas ao completar:')}</div>
    ${rewardRows}
    <div style="font-size:10px;color:var(--dim);margin-top:6px;">${C._t('new_challenge_in', 'Novo desafio em')} <b style="color:var(--accent);">${timeStr}</b></div>
    <button class="btn btn-p" style="width:100%;margin-top:12px;" data-action="C.closeGlobalModal">${C._t('close', 'Fechar')}</button>
  </div>`);
  }

  /** @type {any} */
  const api = {
    init,
    getDailyChallenge,
    getDailyChallengeState,
    updateChallengeProgress,
    renderChallengeNotif,
    openChallengeModal,
    CHALLENGE_DEFS,
  };

  /** @type {any} */
  const g = global;
  g.updateChallengeProgress = updateChallengeProgress;
  g.getDailyChallenge = getDailyChallenge;
  g.getDailyChallengeState = getDailyChallengeState;
  g.renderChallengeNotif = renderChallengeNotif;
  g.openChallengeModal = openChallengeModal;
  g.TBChallenges = api;
})(typeof window !== 'undefined' ? window : globalThis);
