// @ts-check
/**
 * Tile Blast — conquistas estendidas (EXT_ACHIEVEMENTS + check/modal).
 * Carregar antes de tb-roadmap.js.
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;
  /** @type {any} */
  const TBRuntime = global.TBRuntime;
  /** @type {any} */
  const g = global;

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

  const EXT_ACHIEVEMENTS = [
    { id: 'twenty_levels', icon: '🗺', title: 'Explorador', sub: '20 fases completadas' },
    { id: 'thirty_levels', icon: '🏔', title: 'Alpinista', sub: '30 fases completadas' },
    { id: 'fifty_levels', icon: '🏅', title: 'Veterano', sub: '50 fases completadas' },
    { id: 'sixty_levels', icon: '👑', title: 'Lenda Viva', sub: '85 fases completadas' },
    {
      id: 'master_clear',
      icon: '💎',
      title: 'Mestre Supremo',
      sub: 'Concluiu episódios lendários',
    },
    { id: 'ten_triples', icon: '✨', title: 'Estrela Cadente', sub: '3 estrelas em 10 fases' },
    { id: 'twenty_triples', icon: '🌠', title: 'Constelação', sub: '3 estrelas em 20 fases' },
    { id: 'combo5', icon: '💥', title: 'Combo Iniciante', sub: 'Combo de 5+ blocos' },
    { id: 'combo10', icon: '🔥', title: 'Combo Master', sub: 'Combo de 10+ blocos' },
    { id: 'combo15', icon: '⚡', title: 'Combo Lendário', sub: 'Combo de 15+ blocos' },
    { id: 'coins1k', icon: '🪙', title: 'Tesouro', sub: '1.000 moedas acumuladas' },
    { id: 'coins5k', icon: '💎', title: 'Fortuna', sub: '5.000 moedas acumuladas' },
    { id: 'coins10k', icon: '🏦', title: 'Magnata', sub: '10.000 moedas acumuladas' },
    { id: 'chest10', icon: '📦', title: 'Colecionador', sub: 'Abriu 10 baús' },
    { id: 'chest50', icon: '🎁', title: 'Caçador de Baús', sub: 'Abriu 50 baús' },
    { id: 'mission10', icon: '📋', title: 'Trabalhador', sub: '10 missões diárias concluídas' },
    { id: 'mission50', icon: '📊', title: 'Estrategista', sub: '50 missões diárias concluídas' },
    { id: 'challenge7', icon: '🏆', title: 'Desafiante', sub: '7 desafios diários concluídos' },
    { id: 'inf_5k', icon: '♾️', title: 'Infinito I', sub: '5.000 pts no modo infinito' },
    { id: 'inf_15k', icon: '♾️', title: 'Infinito II', sub: '15.000 pts no modo infinito' },
    { id: 'inf_30k', icon: '♾️', title: 'Infinito III', sub: '30.000 pts no modo infinito' },
    { id: 'winstreak3', icon: '🔥', title: 'Em Chamas', sub: 'Sequência de 3 vitórias' },
    { id: 'winstreak5', icon: '🌋', title: 'Imparável', sub: 'Sequência de 5 vitórias' },
    { id: 'winstreak10', icon: '👹', title: 'Demônio', sub: 'Sequência de 10 vitórias' },
    { id: 'bp_tier10', icon: '🎫', title: 'Passe Bronze', sub: 'Nível 10 do passe de batalha' },
    { id: 'bp_tier20', icon: '🎟', title: 'Passe Prata', sub: 'Nível 20 do passe de batalha' },
    { id: 'bp_tier30', icon: '🏅', title: 'Passe Ouro', sub: 'Nível 30 do passe de batalha' },
    { id: 'piggy_full', icon: '🐷', title: 'Cofrinho Cheio', sub: 'Encheu o cofrinho' },
    { id: 'skin5', icon: '🎨', title: 'Estilista', sub: '5 skins desbloqueadas' },
    { id: 'skin10', icon: '🖌', title: 'Artista', sub: '10 skins desbloqueadas' },
    { id: 'xp50', icon: '⚡', title: 'Nível 50', sub: 'Alcançou nível 50 de XP' },
    { id: 'xp100', icon: '🌟', title: 'Nível 100', sub: 'Alcançou nível 100 de XP' },
    { id: 'no_lives_used', icon: '❤️', title: 'Invencível', sub: 'Venceu 5 fases sem perder vida' },
    { id: 'ad_watch5', icon: '📺', title: 'Apoiador', sub: 'Assistiu 5 anúncios' },
    { id: 'iap_buyer', icon: '💳', title: 'Patrono', sub: 'Realizou uma compra' },
    { id: 'cloud_save', icon: '☁️', title: 'Na Nuvem', sub: 'Salvou progresso na nuvem' },
    {
      id: 'weekly_10k',
      icon: '📅',
      title: 'Campeão Semanal',
      sub: '10.000 pts no ranking semanal',
    },
    { id: 'invite_friend', icon: '🤝', title: 'Embaixador', sub: 'Entrou por convite de amigo' },
    { id: 'a11y_cb', icon: '👁', title: 'Visão Clara', sub: 'Ativou o modo daltônico' },
  ];

  function getAllAchievements() {
    return (C.ACHIEVEMENTS || []).concat(EXT_ACHIEVEMENTS);
  }

  function checkExtendedAchievements(ctx) {
    const s = C.ld();
    s.ach = s.ach || {};
    s.stats = s.stats || {
      chestsOpened: 0,
      missionsDone: 0,
      challengesDone: 0,
      adsWatched: 0,
      maxCombo: 0,
      infBest: 0,
      winsNoLife: 0,
    };
    const u = C.getUnlocked();
    const coins = C.getCoins();
    const stars = s.stars || {};
    const triples = Object.values(stars).filter((v) => v >= 3).length;
    const skins = (s.collUnlocked || []).length;
    const bp = g.TBOffers && g.TBOffers.getBattlePass ? g.TBOffers.getBattlePass() : { tier: 0 };
    /** @type {Array<[string, boolean]>} */
    const checks = [
      ['twenty_levels', u >= 20],
      ['thirty_levels', u >= 30],
      ['fifty_levels', u >= 50],
      ['sixty_levels', u >= C.LEVELS.length],
      ['master_clear', u >= C.LEVELS.length],
      ['ten_triples', triples >= 10],
      ['twenty_triples', triples >= 20],
      ['combo5', (s.stats.maxCombo || 0) >= 5],
      ['combo10', s.stats.maxCombo >= 10],
      ['combo15', s.stats.maxCombo >= 15],
      ['coins1k', coins >= 1000],
      ['coins5k', coins >= 5000],
      ['coins10k', coins >= 10000],
      ['chest10', s.stats.chestsOpened >= 10],
      ['chest50', s.stats.chestsOpened >= 50],
      ['mission10', s.stats.missionsDone >= 10],
      ['mission50', s.stats.missionsDone >= 50],
      ['challenge7', s.stats.challengesDone >= 7],
      ['inf_5k', s.stats.infBest >= 5000],
      ['inf_15k', s.stats.infBest >= 15000],
      ['inf_30k', s.stats.infBest >= 30000],
      ['winstreak3', (s.winStreak || 0) >= 3],
      ['winstreak5', s.winStreak >= 5],
      ['winstreak10', s.winStreak >= 10],
      ['bp_tier10', bp.tier >= 10],
      ['bp_tier20', bp.tier >= 20],
      ['bp_tier30', bp.tier >= 30],
      ['piggy_full', (s.piggy || 0) >= 500],
      ['skin5', skins >= 5],
      ['skin10', skins >= 10],
      ['xp50', (s.xpLevel || 1) >= 50],
      ['xp100', s.xpLevel >= 100],
      ['no_lives_used', s.stats.winsNoLife >= 5],
      ['ad_watch5', s.stats.adsWatched >= 5],
      ['iap_buyer', !!s.boughtAnyIAP],
      ['cloud_save', !!s.cloudSaved],
      ['weekly_10k', !!(s.weekly && s.weekly.score >= 10000)],
      ['invite_friend', !!s.ach.invite_friend],
      ['a11y_cb', !!s.colorBlind],
    ];
    let first = null;
    checks.forEach(([id, cond]) => {
      if (cond && !s.ach[id]) {
        s.ach[id] = true;
        if (!first) first = id;
      }
    });
    if (first) {
      C.sv(s);
      const a = getAllAchievements().find((x) => x.id === first);
      if (a) setTimeout(() => C.showToast(a.icon, a.title, a.sub), 900);
    } else if (ctx) C.sv(s);
  }

  function openAchievementsModal() {
    const s = C.ld();
    const ach = s.ach || {};
    const all = getAllAchievements();
    const done = all.filter((a) => ach[a.id]).length;
    const grid = all
      .map((a) => {
        const ok = !!ach[a.id];
        return `<div class="ach-cell ${ok ? 'done' : 'locked'}">
        <div class="ach-cell-icon">${ok ? a.icon : '🔒'}</div>
        <div class="ach-cell-title">${a.title}</div>
        <div class="ach-cell-sub">${ok ? a.sub : '???'}</div>
      </div>`;
      })
      .join('');
    C.showGlobalModal(`
      <div style="font-size:18px;font-weight:800;margin-bottom:4px;">🏅 ${t('achievements')}</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:10px;">${done}/${all.length} desbloqueadas</div>
      <div class="ach-grid">${grid}</div>
      <button class="btn btn-p btn-full" style="margin-top:12px" data-action="closeGlobalModal">${t('close')}</button>
    `);
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
    EXT_ACHIEVEMENTS,
    getAllAchievements,
    checkExtendedAchievements,
    openAchievementsModal,
  };

  global.TBAchievements = api;
})(typeof window !== 'undefined' ? window : globalThis);
