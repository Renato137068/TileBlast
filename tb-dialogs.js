// @ts-check
/**
 * Tile Blast — diálogos / mascote / achievements / confetti / no-lives.
 * Dependências via TBDialogs.init(cfg) no boot (quando aplicável).
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBConfig = global.TBConfig;
  /** @type {any} */
  const TBAnalytics = global.TBAnalytics;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const Sound = global.Sound || (global.TBAudio && global.TBAudio.Sound);
  /** @type {any} */
  const Haptic = global.Haptic || (global.TBAudio && global.TBAudio.Haptic);

  /** @type {any} */
  let C = null;
  let _nlmTimerInt = null;
  function _clearModalTimers() {
    if (_nlmTimerInt) {
      clearInterval(_nlmTimerInt);
      _nlmTimerInt = null;
    }
  }

  /** @param {Record<string, any>|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // MASCOT — Blasty (+ skins)
  // ═══════════════════════════════════════════════════════════════
  const BLASTY_SKIN_FILTERS = {
    default: '',
    garden: 'hue-rotate(85deg) saturate(1.25) brightness(1.05)',
    forest: 'hue-rotate(130deg) saturate(1.2)',
    mountain: 'hue-rotate(195deg) saturate(1.1) brightness(1.08)',
    ocean: 'hue-rotate(215deg) saturate(1.35) brightness(1.1)',
    inferno: 'hue-rotate(-25deg) saturate(1.45) brightness(1.05)',
    fire: 'hue-rotate(-20deg) saturate(1.6) brightness(1.1)',
    star: 'brightness(1.25) saturate(1.6) contrast(1.05)',
    gem: 'hue-rotate(175deg) saturate(1.4) brightness(1.1)',
    crown: 'hue-rotate(35deg) saturate(1.5) brightness(1.15)',
    dragon: 'hue-rotate(-35deg) saturate(1.7) contrast(1.1)',
    ninja: 'saturate(0.15) brightness(0.88) contrast(1.2)',
    wizard: 'hue-rotate(250deg) saturate(1.3)',
    robot: 'saturate(0) brightness(1.15) contrast(1.15)',
  };

  const WORLD_SKIN_MAP = {
    '🌱 Jardim': 'av_w_garden',
    '🌲 Floresta': 'av_w_forest',
    '⛰ Montanha': 'av_w_mountain',
    '🌊 Oceano': 'av_w_ocean',
    '🔥 Inferno': 'av_w_inferno',
  };

  const Mascot = (() => {
    const TIP_KEYS = ['tip_0', 'tip_1', 'tip_2', 'tip_3', 'tip_4', 'tip_5', 'tip_6', 'tip_7'];
    const TIP_FB = [
      'Oi! Sou o Blasty — toque em 2+ blocos iguais! 👋',
      '4+ blocos criam uma 💣 Bomba!',
      '6+ blocos criam um 🚀 Foguete!',
      '8+ blocos criam um 🌈 Arco-íris!',
      'Cada mundo tem sua trilha sonora — ouça! 🎵',
      'Desbloqueie skins do Blasty na Coleção! 🎨',
      'Complete missões diárias para moedas extras!',
      'Fases com 3 estrelas ganham mais moedas ⭐',
    ];
    const WORLD_TIP_KEYS = {
      '🌱 Jardim': 'tip_w_garden',
      '🌲 Floresta': 'tip_w_forest',
      '⛰ Montanha': 'tip_w_mountain',
      '🌊 Oceano': 'tip_w_ocean',
      '🔥 Inferno': 'tip_w_inferno',
    };
    const WORLD_TIP_FB = {
      tip_w_garden:
        'Bem-vindo ao Jardim! Toque em 2+ blocos iguais. Grupos grandes viram especiais! 🌱',
      tip_w_forest: 'Gelo 🧊 na Floresta! Exploda blocos AO LADO do gelo para quebrá-lo. ❄️',
      tip_w_mountain: 'Caixas 📦 na Montanha! Estale grupos vizinhos às caixas para destruí-las.',
      tip_w_ocean: 'Cerejas 🍒 no Oceano! Abra caminho para levá-las até o fundo do tabuleiro.',
      tip_w_inferno:
        'Lava 🟩 no Inferno! Exploda blocos SOBRE a cobertura para limpá-la. Combine especiais! 🔥',
    };
    let tipIdx = 0,
      _bubbleTimer = null,
      _currentSkin = 'default';
    const MOODS = {
      idle: 'mascot-idle',
      happy: 'mascot-happy',
      sad: 'mascot-sad',
      excited: 'mascot-excited',
      think: 'mascot-think',
    };
    // Expressão facial real por humor (troca o próprio SVG, não só a animação).
    const MOOD_SVG = {
      idle: 'mascot.svg',
      happy: 'mascot-happy.svg',
      sad: 'mascot-sad.svg',
      excited: 'mascot-excited.svg',
      think: 'mascot-think.svg',
    };
    function svgForMood(mood) {
      return MOOD_SVG[mood] || MOOD_SVG.idle;
    }
    function filterFor(skin) {
      return BLASTY_SKIN_FILTERS[skin || 'default'] || '';
    }
    function applySkin(skinId) {
      _currentSkin = skinId || 'default';
      const f = filterFor(_currentSkin);
      document.querySelectorAll('.mascot-img').forEach((img) => {
        /** @type {HTMLElement} */ (img).style.filter = f;
      });
    }
    function wrapEl(id) {
      return document.getElementById(id);
    }
    function setMood(mood, elId = 'map-mascot-wrap') {
      const wrap = wrapEl(elId);
      if (!wrap) return;
      const sm = elId === 'map-mascot-wrap' ? ' mascot-wrap--sm' : '';
      wrap.className = `mascot-wrap${sm} ${MOODS[mood] || MOODS.idle}`;
      // Troca a expressão facial (SVG) além da animação do wrapper.
      const img = wrap.querySelector('.mascot-img');
      if (img) img.setAttribute('src', svgForMood(mood));
    }
    function say(text, duration = 5000) {
      const b = wrapEl('map-mascot-bubble');
      if (!b) return;
      b.textContent = text;
      b.classList.remove('hide');
      clearTimeout(_bubbleTimer);
      _bubbleTimer = setTimeout(() => b.classList.add('hide'), duration);
    }
    function sayWorld(world) {
      const key = WORLD_TIP_KEYS[world];
      if (key) say(C._t(key, WORLD_TIP_FB[key]), 6000);
    }
    function nextTip() {
      const i = tipIdx % TIP_KEYS.length;
      say(C._t(TIP_KEYS[i], TIP_FB[i]));
      tipIdx++;
    }
    function react(mood) {
      setMood(mood);
      if (mood === 'happy' || mood === 'excited') setTimeout(() => setMood('idle'), 900);
      if (mood === 'sad') setTimeout(() => setMood('idle'), 1200);
    }
    function previewHtml(skinId) {
      const f = filterFor(skinId);
      return `<img class="mascot-img coll-skin-prev" src="mascot.svg" alt="" style="filter:${f}">`;
    }
    function resultHtml(mood) {
      const cls = MOODS[mood] || MOODS.idle;
      const f = filterFor(_currentSkin);
      return `<div class="mascot-wrap mascot-wrap--md ${cls} result-mascot"><img class="mascot-img" src="${svgForMood(mood)}" alt="Blasty" style="filter:${f}"></div>`;
    }
    return {
      setMood,
      say,
      sayWorld,
      nextTip,
      react,
      applySkin,
      previewHtml,
      resultHtml,
      get TIPS() {
        return TIP_KEYS.map((k, i) => C._t(k, TIP_FB[i]));
      },
    };
  })();

  // ═══════════════════════════════════════════════════════════════
  // ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════════════
  const ACHIEVEMENTS = [
    {
      id: 'first_win',
      icon: '🏆',
      title: 'Primeira Vitória!',
      sub: 'Quanto maior o grupo, maior o especial.',
    },
    { id: 'ten_levels', icon: '🌟', title: 'Veterano!', sub: '10 fases completadas' },
    { id: 'five_stars', icon: '⭐', title: 'Perfeccionista!', sub: '3 estrelas em 5 fases' },
    { id: 'rich', icon: '💰', title: 'Bem de vida!', sub: 'Acumulou 500 moedas' },
    { id: 'streak7', icon: '🔥', title: 'Sequência de 7!', sub: '7 dias de recompensa diária' },
    { id: 'daily_world', icon: '🌍', title: 'Cidadão Global!', sub: 'Completou o Puzzle Diário' },
  ];
  function checkAchievements() {
    const s = C.ld();
    s.ach = s.ach || {};
    let changed = false,
      first = null;
    const u = s.unlocked || 0,
      coins = C.getCoins();
    const stars = s.stars || {};
    const triples = Object.values(stars).filter((v) => v >= 3).length;
    const checks = [
      ['first_win', u >= 1],
      ['ten_levels', u >= 10],
      ['five_stars', triples >= 5],
      ['rich', coins >= 500],
      ['streak7', (s.drStreak || 0) >= 7],
      ['daily_world', Object.keys(s.dailyPuzzle || {}).length >= 1],
    ];
    checks.forEach((pair) => {
      const id = /** @type {string} */ (pair[0]);
      const cond = !!pair[1];
      if (cond && !s.ach[id]) {
        s.ach[id] = true;
        changed = true;
        if (!first) first = id;
      }
    });
    if (changed) {
      C.sv(s);
    }
    if (first) {
      const a = ACHIEVEMENTS.find((x) => x.id === first);
      if (a) setTimeout(() => C.showToast(a.icon, a.title, a.sub), 900);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING (tutorial curto unificado + skip)
  // ═══════════════════════════════════════════════════════════════
  let _onboardingStep = 0;

  function _onboardingStepsHtml() {
    const bombT = (TBConfig && TBConfig.BOMB_T) || 4;
    const rocketT = (TBConfig && TBConfig.ROCKET_T) || 6;
    const rainbowT = (TBConfig && TBConfig.RAINBOW_T) || 8;
    const specialsLine = `💣 <strong style="color:#ff9944">${bombT}+</strong> → ${C._t('tut_bomb', 'Bomba')} · 🚀 <strong style="color:#44ccff">${rocketT}+</strong> → ${C._t('tut_rocket', 'Foguete')} · 🌈 <strong style="color:#ff88ff">${rainbowT}+</strong> → ${C._t('tut_rainbow', 'Arco-íris')}`;
    const mobile = window.innerWidth < 520 || C.IS_NATIVE;
    const step1Body = mobile
      ? `👆 ${C._t('tut_tap', 'Toque')} <strong>${C._t('tut_groups', 'grupos de 2+ blocos')}</strong> ${C._t('tut_same_color', 'da mesma cor')}<br>🌟 ${C._t('tut_more_pts', 'Mais blocos = mais pontos + multiplicador')}`
      : `👆 <strong style="color:var(--text)">${C._t('tut_tap', 'Toque')}</strong> ${C._t('tut_groups_long', 'em grupos de 2+ blocos da mesma cor para explodi-los')}<br>
      🌟 ${C._t('tut_more_pts', 'Mais blocos = mais pontos + multiplicador')}`;
    const step2Body = `<strong>${C._t('brand_signature', 'Quanto maior o grupo, maior o especial.')}</strong><br>${specialsLine}<br>🎯 ${C._t('tut_objectives', 'Complete os objetivos antes dos movimentos acabarem')}`;
    return [
      {
        title: C._t('tut_title', 'Blasty ensina'),
        body: step1Body,
      },
      {
        title: C._t('onboarding_specials_title', 'Especiais e metas'),
        body: step2Body,
      },
    ];
  }

  function _onboardingProgress(step, total) {
    let dots = '';
    for (let i = 0; i < total; i++) {
      const on = i === step;
      dots += `<span aria-hidden="true" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 3px;background:${on ? 'var(--accent)' : 'rgba(255,255,255,.22)'}"></span>`;
    }
    return `<div style="font-size:11px;color:var(--dim);margin:4px 0 10px;font-weight:700">${C._t(
      'onboarding_progress',
      'Passo {n} de {total}'
    )
      .replace('{n}', String(step + 1))
      .replace('{total}', String(total))}<br>${dots}</div>`;
  }

  function renderOnboardingStep() {
    const steps = _onboardingStepsHtml();
    const total = steps.length;
    if (_onboardingStep < 0) _onboardingStep = 0;
    if (_onboardingStep >= total) _onboardingStep = total - 1;
    const step = steps[_onboardingStep];
    const isLast = _onboardingStep >= total - 1;
    const primaryAction = isLast ? 'closeTutorialAndStart' : 'onboardingNext';
    const primaryLabel = isLast
      ? `${C._t('tut_go', 'Vamos lá!')} 🚀`
      : C._t('onboarding_next', 'Próximo');
    C.showGlobalModal(`
    <div class="mascot-wrap mascot-wrap--md mascot-idle" style="margin:0 auto">
      <img class="mascot-img" src="mascot.svg" alt="Blasty">
    </div>
    ${_onboardingProgress(_onboardingStep, total)}
    <div style="font-size:18px;font-weight:800;">${step.title}</div>
    <div style="font-size:13px;color:var(--dim);line-height:1.7;text-align:left;width:100%;margin:8px 0 12px">${step.body}</div>
    <button class="btn btn-p" style="width:100%;font-size:15px;" data-action="${primaryAction}">${primaryLabel}</button>
    <button class="btn btn-g" style="width:100%;font-size:13px;margin-top:8px;" data-action="skipOnboarding">${C._t('onboarding_skip', 'Pular tutorial')}</button>
  `);
  }

  /** Tutorial unificado (substitui modal + coach no 1º caminho). */
  function showTutorial(onDone) {
    _onboardingStep = 0;
    if (typeof TBAnalytics !== 'undefined' && TBAnalytics.log) {
      TBAnalytics.log('onboarding_start', { steps: 2 });
    }
    renderOnboardingStep();
  }

  function onboardingNext() {
    _onboardingStep += 1;
    renderOnboardingStep();
  }

  function finishOnboarding(source) {
    const s = C.ld();
    s.tutorialDone = true;
    s.coachDone = true;
    C.sv(s);
    if (typeof TBAnalytics !== 'undefined' && TBAnalytics.log) {
      if (source === 'skip') TBAnalytics.log('onboarding_skip', { step: _onboardingStep + 1 });
      else {
        TBAnalytics.log('onboarding_complete', { source: source || 'modal' });
        TBAnalytics.log('tutorial_complete', { source: source || 'modal' });
      }
    }
    C.closeGlobalModal();
    C.updateMapHint();
    // Coach já absorvido no onboarding — vai direto à contagem.
    C.showCountdown(C._lv(), null);
  }

  function skipOnboarding() {
    finishOnboarding('skip');
  }

  function closeTutorialAndStart() {
    finishOnboarding('complete');
  }

  // C.updateMapHint / renderMap / updateMapMeta / mundos → TBMap (tb-map.js)

  function showCoachHint() {
    if (C.ld().coachDone) return;
    const el = document.getElementById('coach-overlay');
    if (!el) return;
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
    el.inert = false;
    setTimeout(() => document.getElementById('coach-dismiss')?.focus(), 200);
  }

  function dismissCoachHint() {
    const el = document.getElementById('coach-overlay');
    if (!el || !el.classList.contains('show')) return;
    const s = C.ld();
    if (!s.coachDone) {
      s.coachDone = true;
      C.sv(s);
      TBAnalytics.log('tutorial_complete', {});
    }
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    C.updateMapHint();
    if (TBRoadmap) setTimeout(() => TBRoadmap.showBoardTutorialHighlight(), 300);
  }

  // Blasty ensina mecânicas novas (por objetivo) e na 1ª fase de cada mundo.
  const ICE_TIP = [
    '🧊',
    'mech_ice_title',
    'mech_ice_body',
    'Gelo!',
    'Exploda blocos AO LADO do gelo para quebrá-lo.',
  ];
  const CRATE_TIP = [
    '📦',
    'mech_box_title',
    'mech_box_body',
    'Caixas!',
    'Estale grupos vizinhos às caixas para destruí-las.',
  ];
  const COLLECT_TIP = [
    '🍒',
    'mech_cherry_title',
    'mech_cherry_body',
    'Coleta!',
    'Abra caminho e leve as cerejas até o fundo.',
  ];
  const COVER_TIP = [
    '🟩',
    'mech_lava_title',
    'mech_lava_body',
    'Cobertura de lava!',
    'Exploda blocos SOBRE a cobertura. Combine especiais! 💥',
  ];
  const CHAIN_TIP = [
    '⛓️',
    'mech_chain_title',
    'mech_chain_body',
    'Correntes!',
    'Exploda AO LADO das correntes para rompê-las. Dois arco-íris juntos limpam o tabuleiro!',
  ];
  const LEGEND_TIP = [
    '👑',
    'mech_legend_title',
    'mech_legend_body',
    'Reino Lendário!',
    'Fases densas: misture especiais e gerencie poucos movimentos. Boa sorte!',
  ];

  /** @type {Record<string, string[]>} */
  const MECHANIC_INTRO = {
    ice: ICE_TIP,
    crate: CRATE_TIP,
    collect: COLLECT_TIP,
    cover: COVER_TIP,
    chain: CHAIN_TIP,
  };

  /** Chaves por worldId e rótulo legado (emoji + nome). */
  const WORLD_MECHANIC_TIP = {
    forest: ICE_TIP,
    '🌲 Floresta': ICE_TIP,
    mountain: CRATE_TIP,
    '⛰ Montanha': CRATE_TIP,
    ocean: COLLECT_TIP,
    '🌊 Oceano': COLLECT_TIP,
    inferno: COVER_TIP,
    '🔥 Inferno': COVER_TIP,
    crystal: CHAIN_TIP,
    '💎 Cristal': CHAIN_TIP,
    legendary: LEGEND_TIP,
    '👑 Lendário': LEGEND_TIP,
  };

  function _showMechanicModal(tip) {
    C.Sound.unlock();
    const title = C._t(tip[1], tip[3]);
    const body = C._t(tip[2], tip[4]);
    setTimeout(() => {
      C.showGlobalModal(`
      <div class="mascot-wrap mascot-wrap--md mascot-excited" style="margin:0 auto 6px">
        <img class="mascot-img" src="mascot.svg" alt="Blasty">
      </div>
      <div style="font-size:28px;line-height:1;margin-bottom:4px" aria-hidden="true">${tip[0]}</div>
      <div style="font-size:18px;font-weight:800;">${title}</div>
      <div style="font-size:13px;color:var(--dim);line-height:1.55;margin:8px 0 12px;">${body}</div>
      <button class="btn btn-p btn-full" type="button" data-action="closeGlobalModal" style="min-height:44px;">
        ${C._t('got_it', 'Entendi!')} ✓
      </button>
    `);
    }, 450);
  }

  function maybeShowWorldIntro() {
    if (TBState.isInfiniteMode || TBState.isDailyPuzzleMode) return;
    const lv = TBState.LEVELS[TBState.lvIdx];
    if (!lv) return;
    const s = C.ld();
    s.mechIntro = s.mechIntro || {};
    s.worldIntro = s.worldIntro || {};

    // 1) Ensina na 1ª vez que o objetivo aparece (ex.: correntes no Cristal-06).
    for (const o of lv.objectives || []) {
      const tip = MECHANIC_INTRO[o.type];
      if (tip && !s.mechIntro[o.type]) {
        s.mechIntro[o.type] = true;
        C.sv(s);
        _showMechanicModal(tip);
        return;
      }
    }

    // 2) Fallback: 1ª fase do mundo (compatível com saves/testes por rótulo).
    const firstOfWorld =
      TBState.lvIdx === 0 ||
      (TBState.LEVELS[TBState.lvIdx - 1] && TBState.LEVELS[TBState.lvIdx - 1].world !== lv.world);
    if (!firstOfWorld) return;
    const tip = WORLD_MECHANIC_TIP[lv.worldId] || WORLD_MECHANIC_TIP[lv.world];
    if (!tip) return;
    const key = lv.worldId || lv.world;
    if (s.worldIntro[key] || s.worldIntro[lv.world]) return;
    s.worldIntro[key] = true;
    if (lv.world) s.worldIntro[lv.world] = true;
    C.sv(s);
    _showMechanicModal(tip);
  }
  function maybeShowCoach() {
    if (TBState.lvIdx === 0 && !C.ld().coachDone) showCoachHint();
    maybeShowWorldIntro();
  }

  const CONFETTI_COLORS = TBConfig.CONFETTI_COLORS;
  let _confettiTimer = null;
  function spawnConfetti(count) {
    const n = count != null ? count : window.innerWidth < 520 ? 28 : 40;
    if (C._reduceMotion()) return;
    // Em partida: confete no canvas (TBJuice) — evita duplicar com #confetti-layer
    const onGame =
      typeof document !== 'undefined' &&
      document.getElementById('screen-game') &&
      document.getElementById('screen-game').classList.contains('active');
    if (onGame && global.TBJuice && typeof global.TBJuice.confettiBurst === 'function' && C.BPX) {
      const c = C.BPX / 2;
      global.TBJuice.confettiBurst(c, Math.min(c * 0.35, C.CELL * 2), {
        count: Math.min(n, 48),
        colors: CONFETTI_COLORS,
      });
      return;
    }
    const layer = document.getElementById('confetti-layer');
    if (!layer) return;
    layer.innerHTML = '';
    layer.classList.add('active');
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
      p.style.animationDelay = Math.random() * 0.35 + 's';
      p.style.setProperty('--drift', Math.random() * 100 - 50 + 'px');
      if (Math.random() < 0.35) p.style.borderRadius = '50%';
      layer.appendChild(p);
    }
    clearTimeout(_confettiTimer);
    _confettiTimer = setTimeout(() => {
      layer.classList.remove('active');
      layer.innerHTML = '';
    }, 3200);
  }

  function showNoLivesModal() {
    _clearModalTimers();
    function getNextRegenMs() {
      return TBLogic.msToNextLife(C.ld().lifeRegenAt, Date.now(), C.LIFE_REGEN_MS);
    }
    const adAvail = C.canWatchAd();
    C.showGlobalModal(`
    <div style="font-size:36px;margin-bottom:6px" aria-hidden="true">💔</div>
    <div style="font-size:20px;font-weight:800;color:#ef4b5f">${C._t('no_lives', 'Sem Vidas!')}</div>
    <div style="color:var(--dim);font-size:13px;margin-top:4px">${C._t('next_life_prompt', 'Próxima vida em:')}</div>
    <div id="nlm-timer" style="margin:10px 0;font-size:28px;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums">⏱ ...</div>
    ${
      adAvail
        ? `<button id="nlm-ad" class="btn btn-p btn-full" type="button" style="min-height:44px;margin-bottom:8px;">📺 ${C._t('watch_ad_life', 'Assistir anúncio → +1 vida')}</button>`
        : ''
    }
    <div style="display:flex;gap:8px;width:100%;">
      <button id="nlm-shop" class="btn btn-g" type="button" style="flex:1;min-height:44px;">🛒 ${C._t('shop', 'Loja')}</button>
      <button id="nlm-ok" class="btn btn-g" type="button" style="flex:1;min-height:44px;">OK</button>
    </div>
  `);
    document.getElementById('nlm-ok').addEventListener('click', () => {
      C.closeGlobalModal();
    });
    document.getElementById('nlm-shop').addEventListener('click', () => {
      C.closeGlobalModal();
      C.openShop();
    });
    if (adAvail) {
      document.getElementById('nlm-ad').addEventListener('click', () => {
        C.closeGlobalModal();
        C.showRewardedAd(() => {
          C.setLives(Math.min(C.ML, C.getLives() + 1));
          checkLifeRegen();
          C.updateMapMeta();
          C.showToast(
            '❤️',
            C._t('life_gained', '+1 Vida!'),
            C._t('life_extra', 'Você ganhou uma vida extra!')
          );
        }, null);
      });
    }
    function tick() {
      const el = document.getElementById('nlm-timer');
      if (el) el.textContent = '⏱ ' + TBLogic.formatMsClock(getNextRegenMs());
    }
    tick();
    _nlmTimerInt = setInterval(() => {
      checkLifeRegen();
      const lives = C.getLives();
      if (lives > 0) {
        C.closeGlobalModal();
        C.updateMapMeta();
        return;
      }
      tick();
    }, 1000);
    if (TBRoadmap) setTimeout(() => TBRoadmap.evaluateDynamicOffers('no_lives'), 900);
  }

  // Life regeneration checker
  function checkLifeRegen() {
    const s = C.ld();
    if ((s.lives ?? C.ML) >= C.ML) {
      if (s.lifeRegenAt) {
        delete s.lifeRegenAt;
        C.sv(s);
      }
      return;
    }
    if (!s.lifeRegenAt) {
      s.lifeRegenAt = Date.now();
      C.sv(s);
      return;
    }
    const r = TBLogic.computeLifeRegen(s, Date.now(), C.ML, C.LIFE_REGEN_MS);
    if (r.changed) {
      const s2 = C.ld();
      s2.lives = r.lives;
      if (r.lifeRegenAt == null) delete s2.lifeRegenAt;
      else s2.lifeRegenAt = r.lifeRegenAt;
      C.sv(s2);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DAILY REWARD (unificado via TBRoadmap.checkDailyLoginReward)
  // ═══════════════════════════════════════════════════════════════
  function checkDailyReward() {
    if (TBRoadmap?.prepareReturnPlayerOffer) TBRoadmap.prepareReturnPlayerOffer();
    if (TBRoadmap?.checkDailyLoginReward) {
      const s = C.ld();
      const today = C._localToday();
      const dayNum = Math.floor(Date.now() / 86400000);
      if (s.drDate) {
        if (s.drDate === today && s.lastLoginDay !== dayNum) {
          s.lastLoginDay = dayNum;
          s.loginStreak = Math.max(s.loginStreak || 0, s.drStreak || 1);
        }
        delete s.drDate;
        delete s.drStreak;
        C.sv(s);
      }
      TBRoadmap.checkDailyLoginReward();
    }
  }
  /** @type {any} */
  const api = {
    init,
    Mascot,
    WORLD_SKIN_MAP,
    BLASTY_SKIN_FILTERS,
    ACHIEVEMENTS,
    checkAchievements,
    showTutorial,
    closeTutorialAndStart,
    onboardingNext,
    skipOnboarding,
    showCoachHint,
    dismissCoachHint,
    maybeShowWorldIntro,
    maybeShowCoach,
    spawnConfetti,
    showNoLivesModal,
    checkLifeRegen,
    checkDailyReward,
  };

  /** @type {any} */
  const g = global;
  g.Mascot = Mascot;
  g.WORLD_SKIN_MAP = WORLD_SKIN_MAP;
  g.BLASTY_SKIN_FILTERS = BLASTY_SKIN_FILTERS;
  g.ACHIEVEMENTS = ACHIEVEMENTS;
  g.checkAchievements = checkAchievements;
  g.showTutorial = showTutorial;
  g.closeTutorialAndStart = closeTutorialAndStart;
  g.onboardingNext = onboardingNext;
  g.skipOnboarding = skipOnboarding;
  g.showCoachHint = showCoachHint;
  g.dismissCoachHint = dismissCoachHint;
  g.maybeShowWorldIntro = maybeShowWorldIntro;
  g.maybeShowCoach = maybeShowCoach;
  g.spawnConfetti = spawnConfetti;
  g.showNoLivesModal = showNoLivesModal;
  g.checkLifeRegen = checkLifeRegen;
  g.checkDailyReward = checkDailyReward;
  g.TBDialogs = api;
})(typeof window !== 'undefined' ? window : globalThis);
