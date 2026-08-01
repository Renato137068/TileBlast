// @ts-check
/**
 * Tile Blast — retenção: login diário, changelog, session continue, push local.
 * Carregar antes de tb-roadmap.js. TBRoadmap delega a API pública.
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;
  /** @type {any} */
  const g = global;

  function t(key, fallback) {
    if (g.TBI18n && g.TBI18n.t) return g.TBI18n.t(key);
    if (g.TBRoadmap && g.TBRoadmap.t) return g.TBRoadmap.t(key);
    return fallback != null ? fallback : key;
  }

  function _economy() {
    return g.TBEconomy || null;
  }

  const CHANGELOG = [
    {
      v: '1.4.9',
      items: [
        '🛠️ Ajustes de estabilidade e polimento geral',
        '⚡ Pequenas melhorias de desempenho',
      ],
    },
    {
      v: '1.4.8',
      items: [
        '🎮 HUD redesenhado: movimentos em destaque + metas com brilho',
        '💎 Power-ups com bevel, shimmer e badge de contagem',
        '✨ Especiais com disco metálico e faíscas orbitando',
        '🧊 Gelo rachado, correntes metálicas, caixas com HP e cover com nervuras',
        '💥 Chunks crocantes no blast + moldura do tabuleiro tipo cabinet',
      ],
    },
    {
      v: '1.4.7',
      items: [
        '💡 Dica automática quando você fica pensando demais',
        '⭐ Prévia de estrelas ao vivo no HUD',
        '🎨 Tiles mais nítidos e jogo mais leve (atlas de sprites)',
        '🔊 Sons novos: dano em obstáculos, cascata e trilhas Lendário/Relâmpago',
        '⚖️ Dificuldade suavizada em picos (Jardim, Cristal, Lendário)',
      ],
    },
    {
      v: '1.4.6',
      items: [
        '🔧 Fix interstitialEvery fallback (3→5)',
        '📅 Daily login unificado + barra D1–D7',
        '🔔 Lembrete local do Puzzle Diário (8h–11h)',
        '✅ Reconciliação auditoria v2',
      ],
    },
    {
      v: '1.4.5',
      items: [
        '🎯 hasMoves corrigido (especiais + flood-fill)',
        '🏆 E2E de vitória na fase 1',
        '🧪 Helpers E2E compartilhados + testes findValidMove',
        '📋 Auto-auditoria valida versões',
      ],
    },
    {
      v: '1.4.4',
      items: [
        '⚡ Cache do tabuleiro otimizado (menos CPU por frame)',
        '🔄 Service Worker versionado com APP_VERSION',
        '✅ validate-versions + hasMoves testável',
        '📦 Preload de assets críticos',
      ],
    },
    {
      v: '1.4.3',
      items: [
        '✨ Floaters com pop animado + cores MEGA/ULTRA',
        '🔴 Pulso vermelho no tabuleiro aos 3 movimentos',
        '📋 npm run prepublish — checklist automático',
        '🎮 E2E: 2+ jogadas consecutivas validadas',
      ],
    },
    {
      v: '1.4.2',
      items: [
        '🔥 Combos MEGA/ULTRA com i18n + brilho animado',
        '🎮 Teste E2E de gameplay (jogada real no tabuleiro)',
        '📦 Minificação JS para release (npm run build:www)',
        '⭐ Lógica de estrelas e combos testável em TBLogic',
      ],
    },
    {
      v: '1.4.1',
      items: [
        '👑 10 fases lendárias rebalanceadas (51–60) com nomes únicos',
        '🗺 Mapa lendário com visual dourado + tag JOGAR traduzida',
        '🎯 HUD crítico mais claro aos 3 movimentos',
        '🧪 28+ testes automatizados + smoke E2E',
      ],
    },
    {
      v: '1.4.0',
      items: [
        '📅 Episódio semanal + ranking local com recompensa',
        '👁 Modo daltônico e ícones maiores nos blocos',
        '🔊 Sliders de volume música/FX',
        '📋 Missões Puzzle Diário e sequência de vitórias',
        '🌐 i18n ampliado + tutorial curto no mobile',
        '🤝 Convite por link (?challenge=N)',
      ],
    },
    {
      v: '1.3.1',
      items: [
        '📱 Otimização Android: edge-to-edge, splash nativo, botão voltar',
        '👆 Alvos de toque 44px+ e modais roláveis',
        '⚡ Performance em aparelhos mid-range',
        '📳 Vibração nativa no app',
      ],
    },
    {
      v: '1.3.0',
      items: [
        '🌍 Puzzle Diário Global (mesmo tabuleiro para todos)',
        '👤 Perfil com título e estatísticas',
        '📲 Instalar PWA + prompt de avaliação',
        '📤 Compartilhar recorde diário com link',
      ],
    },
    {
      v: '1.2.0',
      items: [
        '🎫 Passe Premium (IAP) com recompensas extras',
        '⚡ Ofertas dinâmicas por comportamento',
        '📡 Remote Config (JSON + Firestore)',
        '🌐 Mais textos traduzidos PT/EN/ES',
      ],
    },
    {
      v: '1.1.0',
      items: [
        '☁️ Cloud save Firebase + ranking global',
        '🌐 i18n ampliado PT/EN/ES',
        '🔒 UMP consentimento (Android)',
        '📤 Compartilhar recorde',
        '▶ Continuar partida',
      ],
    },
    {
      v: '1.0.0',
      items: [
        '🎮 85 fases + modo infinito',
        '🎫 Passe de batalha',
        '🏅 35 conquistas',
        '🐷 Cofrinho e ofertas',
      ],
    },
  ];

  function dailyDayKey() {
    return Math.floor(Date.now() / 86400000);
  }

  // Streak de login com "congelamento" de 1 dia (retencao): perder exatamente
  // 1 dia NAO zera a sequencia (mantem); 2+ dias zera; dia consecutivo soma 1.
  // 'today'/'lastLogin' sao chaves de dia inteiras (UTC epoch day).
  function computeLoginStreak(lastLogin, today, currentStreak) {
    const cur = currentStreak || 0;
    if (!lastLogin) return 1; // primeiro login
    const gap = today - lastLogin;
    if (gap <= 0) return Math.max(1, cur); // mesmo dia / relogio atrasado: mantem
    if (gap === 1) return cur + 1; // consecutivo
    if (gap === 2) return Math.max(1, cur); // 1 dia perdido: congela (nao zera)
    return 1; // 2+ dias perdidos: zera
  }

  // Recompensa do login diario. Marco semanal (a cada 7 dias) DOBRA — entrega o
  // "Bonus especial!" que a UI ja promete (antes era so texto, sem bonus real).
  function computeLoginReward(streak, rewards) {
    const list = rewards && rewards.length ? rewards : [10, 15, 20, 25, 30, 40, 100];
    const base = list[Math.min(Math.max(streak, 1) - 1, list.length - 1)] || 0;
    const isWeek = streak > 0 && streak % 7 === 0;
    return { coins: isWeek ? base * 2 : base, isWeek, base };
  }

  function checkDailyLoginReward() {
    const s = C.ld();
    const today = dailyDayKey();
    const lastLogin = s.lastLoginDay || 0;
    if (lastLogin === today) return;

    const streak = computeLoginStreak(lastLogin, today, s.loginStreak);
    s.loginStreak = streak;
    s.lastLoginDay = today;

    const rewards = (_economy() && _economy().DAILY_LOGIN_REWARDS) || [10, 15, 20, 25, 30, 40, 100];
    const coins = computeLoginReward(streak, rewards).coins;

    let returnBonus = 0;
    if (
      lastLogin > 0 &&
      today - lastLogin >= 3 &&
      global.TBContent &&
      typeof global.TBContent.claimReturnReward === 'function'
    ) {
      const claim = global.TBContent.claimReturnReward(s, Date.now());
      if (claim && claim.ok && claim.reward && claim.reward.coins) {
        returnBonus = claim.reward.coins || 0;
      }
    }

    C.addCoins && C.addCoins(coins + returnBonus);
    s.liveOpsValueDelivered = true;
    C.sv(s);
    C.updateMapMeta && C.updateMapMeta();

    const isWeek = streak % 7 === 0;
    const streakBar = rewards
      .map(
        (c, i) =>
          `<div style="width:28px;height:28px;border-radius:8px;background:${i < streak ? 'var(--accent)' : 'rgba(255,255,255,.1)'};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${i < streak ? '#1a1200' : 'var(--dim)'}">${c}</div>`
      )
      .join('');

    setTimeout(() => {
      C.showGlobalModal(`
        <div style="font-size:40px">${isWeek ? '🎉' : returnBonus ? '👋' : '📅'}</div>
        <div style="font-size:17px;font-weight:800">${t('daily_reward')}</div>
        <div style="font-size:13px;color:var(--dim);margin:6px 0 10px">${t('day')} ${streak} ${streak >= 7 ? '🔥' : ''}</div>
        <div style="display:flex;gap:6px;justify-content:center;margin:8px 0">${streakBar}</div>
        <div style="font-size:32px;font-weight:800;color:var(--accent);margin-bottom:12px">+${coins + returnBonus} 🪙</div>
        ${returnBonus ? `<div style="font-size:12px;color:#4ecb71;font-weight:700;margin-bottom:8px">🎁 ${t('return_bonus', 'Bônus de retorno')} +${returnBonus}</div>` : ''}
        ${isWeek ? `<div style="font-size:12px;color:#4ecb71;font-weight:700;margin-bottom:10px">🏆 ${t('login_streak_bonus', 'Sequência de')} ${streak} ${t('login_streak_days', 'dias! Bônus especial!')}</div>` : ''}
        <button class="btn btn-p btn-full" data-action="closeGlobalModal">${t('collect')}</button>
      `);
    }, 500);
  }

  /** Já venceu alguma fase da campanha? (novidades ficam fora do 1º caminho). */
  function hasWonAnyLevel(s) {
    if (!s) return false;
    if ((s.unlocked || 0) > 0) return true;
    const stars = s.stars;
    if (!stars) return false;
    return Object.keys(stars).some((k) => (stars[k] || 0) > 0);
  }

  function showChangelogIfNeeded() {
    const ver = global.APP_VERSION || '1.0.0';
    const s = C.ld();
    if (s.lastVersionSeen === ver) return;
    // Primeira sessão / antes da 1ª vitória: não bloquear o caminho crítico.
    if (!hasWonAnyLevel(s)) return;
    const block = CHANGELOG.find((c) => c.v === ver) || CHANGELOG[0];
    const items = block.items.map((i) => `<li style="margin:4px 0">${i}</li>`).join('');
    C.showGlobalModal(`
      <div style="font-size:18px;font-weight:800;">✨ ${t('whats_new')} v${ver}</div>
      <ul style="text-align:left;font-size:13px;color:var(--dim);line-height:1.5;margin:10px 0;padding-left:18px">${items}</ul>
      <button class="btn btn-p btn-full" data-action="dismissChangelog">${t('close')}</button>
    `);
  }

  function dismissChangelog() {
    const s = C.ld();
    s.lastVersionSeen = global.APP_VERSION || '1.2.0';
    C.sv(s);
    C.closeGlobalModal();
  }

  function saveSessionSnapshot(screen, lv, inf) {
    const s = C.ld();
    s.session = { screen, lv, inf: !!inf, at: Date.now() };
    C.sv(s);
  }

  function offerContinueSession() {
    const s = C.ld();
    const sess = s.session;
    if (!sess || sess.screen !== 'game' || Date.now() - sess.at > 1800000) return;
    C.showGlobalModal(`
      <div style="font-size:17px;font-weight:800;">▶ ${t('continue_game')}</div>
      <div style="font-size:13px;color:var(--dim);margin:8px 0 14px;">${t('level_win')}</div>
      <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="resumeSession">${t('continue_game')}</button>
      <button class="btn btn-g btn-full" data-action="clearSessionGoMap">${t('map')}</button>
    `);
  }

  function resumeSession() {
    const s = C.ld();
    const sess = s.session;
    if (!sess) return;
    C.closeGlobalModal();
    if (sess.inf && C.startInfiniteMode) C.startInfiniteMode();
    else if (typeof sess.lv === 'number' && C.startGame) C.startGame(sess.lv);
  }

  function clearSession() {
    const s = C.ld();
    delete s.session;
    C.sv(s);
  }

  function scheduleLocalReminders() {
    const s = C.ld();
    const rc = (s && s.remoteCfg) || {};
    if (rc.liveOpsRemindersEnabled === false) return;
    // Só após valor entregue (login/daily) + permissão — evita spam pré-valor.
    if (!s.liveOpsValueDelivered && !s.tutorialDone) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (s.pushScheduled) return;
    s.pushScheduled = true;
    C.sv(s);
    setInterval(() => {
      if (!document.hidden) return;
      if (C.getLives() >= C.ML) {
        try {
          new Notification('Tile Blast', { body: t('push_lives_full'), icon: 'icon-192.png' });
        } catch (e) {
          /* ignore */
        }
      }
      const today = dailyDayKey();
      const st = C.ld();
      if (st.dailyPuzzleReminded === today) return;
      const h = new Date().getHours();
      if (h < 8 || h >= 11) return;
      const played = !!(st.dailyPuzzle && st.dailyPuzzle[today]);
      if (played) return;
      st.dailyPuzzleReminded = today;
      C.sv(st);
      try {
        new Notification('Tile Blast', { body: t('push_daily'), icon: 'icon-192.png' });
      } catch (e) {
        /* ignore */
      }
    }, 600000);
  }

  function requestPushPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      if (global.TBAnalytics) global.TBAnalytics.log('push_granted', { surface: 'retention_boot' });
      scheduleLocalReminders();
    } else if (Notification.permission !== 'denied') {
      if (global.TBAnalytics) global.TBAnalytics.log('push_prompt_shown', { surface: 'retention' });
      Notification.requestPermission().then((p) => {
        if (p === 'granted') {
          if (global.TBAnalytics) global.TBAnalytics.log('push_granted', { surface: 'retention' });
          scheduleLocalReminders();
        }
      });
    }
  }

  function maybeRequestPushAfterProgress() {
    const u = C.getUnlocked();
    const s = C.ld();
    if (u < 5 || s.pushAsked) return;
    s.pushAsked = true;
    C.sv(s);
    setTimeout(() => requestPushPermission(), 2000);
  }

  function ready() {
    return !!(C && C.ld);
  }

  /** Hooks de boot (changelog + continue session + reminders). */
  function bootRetention() {
    if (global.TBAnalytics && typeof global.TBAnalytics.markOpen === 'function') {
      global.TBAnalytics.markOpen();
      global.TBAnalytics.log('app_open', {});
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
      scheduleLocalReminders();
    // Novidades só após já ter progresso (recorrente / pós-1ª vitória).
    setTimeout(() => showChangelogIfNeeded(), 1200);
    setTimeout(() => offerContinueSession(), 2800);
  }

  const api = {
    isReady: ready,
    /** @param {Record<string, any>|null|undefined} cfg */
    init(cfg) {
      C = cfg || null;
    },
    bootRetention,
    dailyDayKey,
    computeLoginStreak,
    computeLoginReward,
    checkDailyLoginReward,
    hasWonAnyLevel,
    showChangelogIfNeeded,
    dismissChangelog,
    saveSessionSnapshot,
    offerContinueSession,
    resumeSession,
    clearSession,
    scheduleLocalReminders,
    requestPushPermission,
    maybeRequestPushAfterProgress,
  };

  global.TBRetention = api;
})(typeof window !== 'undefined' ? window : globalThis);
