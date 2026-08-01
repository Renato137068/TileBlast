// @ts-check
/**
 * Tile Blast — mapa / mundos / meta do mapa / cards de fase.
 * Isolado de tb-main; recebe dependências via TBMap.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBMapCfg
 * @typedef {{
 *   init: (cfg: TBMapCfg|null|undefined) => void,
 *   renderMap: () => void,
 *   updateMapMeta: () => void,
 *   updateMapHint: () => void,
 *   openWorldSelect: () => void,
 *   renderWorldSelect: () => void,
 *   selectWorld: (worldId: string) => void,
 *   getSelectedWorldId: () => string,
 *   setSelectedWorld: (worldId: string) => void,
 *   grantWorldCompletionIfNeeded: (levelIndex: number) => void,
 *   startRegenInterval: () => void,
 *   stopRegenInterval: () => void,
 *   isFeatureUnlocked: (key: string) => boolean,
 *   applyProgressiveUI: () => void,
 *   syncMoreNotif: () => void,
 *   announceNewUnlocks: () => void,
 *   FEATURE_UNLOCKS: Array<Record<string, any>>
 * }} TBMapApi
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBContent = global.TBContent;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBMeta = global.TBMeta;
  /** @type {any} */
  const TBGlobal = global.TBGlobal;

  /** @type {any} */
  let C = null;
  /** @type {ReturnType<typeof setInterval>|null} */
  let regenInterval = null;

  /**
   * @param {TBMapCfg|null|undefined} cfg
   * @returns {void}
   */
  function init(cfg) {
    C = cfg || null;
  }

  /** @returns {boolean} */
  function ready() {
    return !!(C && C.ld);
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

  /** @returns {boolean} */
  function contentReady() {
    if (C && typeof C.contentReady === 'function') return C.contentReady();
    /** @type {any} */
    const Content = global.TBContent;
    return !!(Content && Content.isLoaded());
  }

  function updateMapHint() {
    const hint = document.getElementById('map-hint');
    if (!hint) return;
    const show = C.getUnlocked() === 0 && !C.ld().coachDone;
    hint.classList.toggle('hide', !show);
  }

  function getSelectedWorldId() {
    const s = C.ld();
    if (s.mapWorldId) return s.mapWorldId;
    const unl = C.getUnlocked();
    if (!TBState.LEVELS.length) return 'garden';
    const lv = TBState.LEVELS[Math.min(unl, TBState.LEVELS.length - 1)];
    return lv.worldId || 'garden';
  }

  function setSelectedWorld(worldId) {
    const s = C.ld();
    s.mapWorldId = worldId;
    C.sv(s);
  }

  function openWorldSelect() {
    if (!ready()) return;
    C.Sound.click();
    const wid = getSelectedWorldId();
    const open = function () {
      renderWorldSelect();
      C.showScreen('worlds');
      history.pushState({ screen: 'worlds' }, '');
    };
    if (contentReady())
      TBContent.ensureWorldLoaded(wid)
        .then(function () {
          TBState.LEVELS = TBContent.getLevels();
          open();
        })
        .catch(open);
    else open();
  }

  function renderWorldSelect() {
    const grid = document.getElementById('worlds-grid');
    if (!grid || !contentReady()) return;
    const save = C.ld();
    grid.innerHTML = '';
    TBContent.getWorlds().forEach((w) => {
      const unlocked = TBContent.isWorldUnlocked(save, w.id);
      const prog = TBContent.getWorldProgress(save, w.id);
      const complete = prog.completed >= prog.total && prog.total > 0;
      const claimed = !!(save.worldRewards && save.worldRewards[w.id]);
      const card = document.createElement('div');
      card.className =
        'world-card' +
        (unlocked ? '' : ' locked') +
        (getSelectedWorldId() === w.id ? ' current' : '');
      card.setAttribute('role', 'listitem');
      card.style.setProperty('--world-color', w.color);
      if (!unlocked) {
        card.innerHTML = `<div class="world-card-lock">🔒</div><div class="world-card-name">${w.icon} ${w.label}</div><div class="world-card-desc">Complete o mundo anterior</div>`;
      } else {
        const rw = w.completionReward;
        const rwTxt = rw ? `🎁 ${rw.coins || 0}💰` : '';
        card.innerHTML = `${complete && !claimed ? '<span class="world-card-badge">RECOMPENSA!</span>' : ''}${complete && claimed ? '<span class="world-card-badge claimed">✓</span>' : ''}
        <div class="world-card-icon">${w.icon}</div>
        <div class="world-card-name">${w.label}</div>
        <div class="world-card-desc">${prog.completed}/${prog.total} fases · ${prog.perfect || 0} perfeitas</div>
        <div class="world-card-prog"><i style="width:${prog.pct}%"></i></div>
        <div class="world-card-pct">${prog.pct}% completo</div>
        <div class="world-card-reward">${rwTxt}</div>`;
        card.addEventListener('click', () => selectWorld(w.id));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectWorld(w.id);
          }
        });
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
      }
      grid.appendChild(card);
    });
  }

  function selectWorld(worldId) {
    if (!ready()) return;
    if (contentReady() && !TBContent.isWorldUnlocked(C.ld(), worldId)) {
      C.showToast(
        '🔒',
        t('world_locked', 'Mundo bloqueado'),
        t('world_locked_hint', 'Avance no mapa para desbloquear.')
      );
      return;
    }
    C.Sound.click();
    const enter = function () {
      setSelectedWorld(worldId);
      const w = contentReady() ? TBContent.getWorld(worldId) : null;
      if (w)
        C.Mascot.say(
          t('exploring_world', 'Explorando {name}! {desc}')
            .replace('{name}', w.label)
            .replace('{desc}', w.description || ''),
          5000
        );
      C.showScreen('map');
      renderMap();
      history.replaceState({ screen: 'map' }, '');
    };
    if (contentReady())
      TBContent.ensureWorldLoaded(worldId).then(function () {
        TBState.LEVELS = TBContent.getLevels();
        enter();
      });
    else enter();
  }

  function grantWorldCompletionIfNeeded(levelIndex) {
    if (!contentReady()) return;
    const lv = TBState.LEVELS[levelIndex];
    if (!lv || !lv.worldId) return;
    const s = C.ld();
    const reward = TBContent.claimWorldReward(s, lv.worldId);
    if (!reward) return;
    C.sv(s);
    if (reward.coins) C.addCoins(reward.coins);
    Object.entries(reward).forEach(([k, v]) => {
      if (k !== 'coins' && typeof v === 'number') C.addPU(k, v);
    });
    const w = TBContent.getWorld(lv.worldId);
    C.showToast(
      '🏆',
      t('world_complete', 'Mundo completo!'),
      t('world_reward', '{name} — recompensa coletada!').replace(
        '{name}',
        w ? w.label : t('world_generic', 'Mundo')
      )
    );
    if (global.TBContent && TBContent.getContentOfferForTrigger) {
      const offer = TBContent.getContentOfferForTrigger('world_complete', s);
      if (offer)
        C.showToast(
          '🎁',
          t('special_offer', 'Oferta especial'),
          offer.label || t('pack_in_shop', 'Pacote disponível na loja')
        );
    }
  }

  function stopRegenInterval() {
    clearInterval(regenInterval);
    regenInterval = null;
  }

  function startRegenInterval() {
    if (!ready()) return;
    clearInterval(regenInterval);
    regenInterval = setInterval(() => {
      C.checkLifeRegen();
      updateMapMeta();
    }, 10000);
  }

  // Desbloqueio progressivo de recursos — UX de onboarding (sem alterar mecânica).
  const FEATURE_UNLOCKS = [
    { key: 'worldprog', level: 1, sel: '#world-prog-wrap', icon: '🗺️', name: 'Progresso de Mundo' },
    { key: 'xpbar', level: 2, sel: '#xp-bar-wrap', icon: '⚡', name: 'Nível & XP' },
    { key: 'missions', level: 2, sel: '#map-missions-btn', icon: '📋', name: 'Missões' },
    { key: 'profile', level: 3, sel: '#map-profile-btn', icon: '👤', name: 'Perfil' },
    { key: 'shop', level: 3, sel: '#map-shop-btn', icon: '🛒', name: 'Loja' },
    { key: 'chests', level: 4, sel: '#chest-bar', icon: '🎁', name: 'Baús' },
    { key: 'events', level: 4, sel: '#event-banner', icon: '🗓️', name: 'Eventos' },
    { key: 'daily', level: 4, sel: '#map-daily-puzzle-btn', icon: '🌍', name: 'Puzzle Diário' },
    { key: 'collection', level: 5, sel: '#map-coll-btn', icon: '🎨', name: 'Skins' },
    { key: 'garden', level: 5, sel: '#map-garden-btn', icon: '🌱', name: 'Jardim de Blasty' },
    { key: 'challenge', level: 6, sel: '#map-challenge-btn', icon: '🏆', name: 'Desafio Diário' },
    { key: 'time', level: 5, sel: '#map-time-btn', icon: '⏱', name: 'Time Challenge' },
    {
      key: 'battlepass',
      level: 7,
      sel: '.meta-banners',
      icon: '🎫',
      name: 'Passe & Ofertas',
      extra: '#map-bp-btn',
    },
    { key: 'infinite', level: 8, sel: '#map-modes-btn', icon: '🎮', name: 'Modos de Jogo' },
    { key: 'worlds', level: 1, sel: '#map-worlds-btn', icon: '🌍', name: 'Seleção de Mundos' },
  ];

  function isFeatureUnlocked(key) {
    if (C.ld().unlockAllFeatures) return true;
    const f = FEATURE_UNLOCKS.find((x) => x.key === key);
    if (!f) return true;
    return C.getUnlocked() >= f.level;
  }

  function applyProgressiveUI() {
    FEATURE_UNLOCKS.forEach((f) => {
      const on = isFeatureUnlocked(f.key);
      document.querySelectorAll(f.sel).forEach((el) => el.classList.toggle('feat-locked', !on));
      if (f.extra)
        document.querySelectorAll(f.extra).forEach((el) => el.classList.toggle('feat-locked', !on));
    });
    ['.map-quick-dock', '.map-modes-row', '.map-primary-row'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((row) => {
        const anyVisible = Array.from(row.children).some(
          (c) => !c.classList.contains('feat-locked')
        );
        row.classList.toggle('feat-locked', !anyVisible);
      });
    });
    const morePanel = document.getElementById('map-more-panel');
    const moreToggle = document.getElementById('map-more-toggle');
    if (morePanel && moreToggle) {
      const anyMore = Array.from(morePanel.querySelectorAll('button')).some(
        (b) => !b.classList.contains('feat-locked')
      );
      moreToggle.classList.toggle('feat-locked', !anyMore);
      if (!anyMore) {
        morePanel.classList.remove('open');
        morePanel.hidden = true;
        moreToggle.setAttribute('aria-expanded', 'false');
      }
    }
    const play = document.getElementById('map-play-btn');
    if (play) play.classList.toggle('map-play-btn--hero', C.getUnlocked() < 3);
  }

  function syncMoreNotif() {
    const hub = document.getElementById('map-more-notif');
    if (!hub) return;
    const ids = ['shop-notif', 'missions-notif', 'map-garden-hint', 'challenge-notif'];
    const any = ids.some((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const d = el.style.display;
      return d && d !== 'none';
    });
    hub.style.display = any ? 'inline-block' : 'none';
  }

  function announceNewUnlocks() {
    if (!ready()) return;
    const s = C.ld();
    if (!s.featSeen) {
      s.featSeen = {};
      FEATURE_UNLOCKS.forEach((f) => {
        if (isFeatureUnlocked(f.key)) s.featSeen[f.key] = true;
      });
      C.sv(s);
      return;
    }
    const fresh = FEATURE_UNLOCKS.filter((f) => isFeatureUnlocked(f.key) && !s.featSeen[f.key]);
    if (!fresh.length) return;
    fresh.forEach((f) => {
      s.featSeen[f.key] = true;
    });
    C.sv(s);
    try {
      C.Sound.chest && C.Sound.chest();
    } catch (e) {}
    if (fresh.length === 1) {
      const f = fresh[0];
      C.showToast(
        f.icon,
        t('feature_new', 'Novo recurso!'),
        t('feature_unlocked', '{name} desbloqueado 🎉').replace('{name}', C.locFeatName(f))
      );
    } else {
      const names = fresh.map((f) => `${f.icon} ${C.locFeatName(f)}`).join('<br>');
      C.showGlobalModal(
        `<div style="text-align:center;padding:6px 0;">
      <div style="font-size:40px;margin-bottom:6px;">🎉</div>
      <div style="font-size:18px;font-weight:900;margin-bottom:8px;">${t('features_unlocked_title', 'Novos recursos desbloqueados!')}</div>
      <div style="font-size:14px;line-height:1.9;color:var(--fg);margin-bottom:12px;">${names}</div>
      <button class="btn btn-p" style="width:100%;" data-action="closeGlobalModal">${t('features_explore', 'Explorar! 🚀')}</button>
    </div>`,
        t('features_unlocked_a11y', 'Recursos desbloqueados')
      );
    }
  }

  function updateMapMeta() {
    if (!ready()) return;
    C.checkLifeRegen();
    if (global.TBMeta && TBMeta.isReady && TBMeta.isReady()) TBMeta.updateMapHint();
    const lives = C.getLives(),
      hs = C.getHS(),
      coins = C.getCoins();
    const ML = C.ML;
    document.getElementById('map-lives').textContent = '♥'.repeat(lives) + '♡'.repeat(ML - lives);
    document.getElementById('map-lives').setAttribute('aria-label', `${lives} de ${ML} vidas`);
    const coinsEl = document.getElementById('map-coins');
    if (coinsEl) coinsEl.textContent = `💰 ${coins.toLocaleString(shopLocale())}`;
    document.getElementById('map-hs').textContent = `🏆 ${hs.toLocaleString(shopLocale())} pts`;
    updateRegenDisplay();
    updateWorldProgress();
    updatePlayButton();
    updateMapHint();
    if (global.TBGlobal && TBGlobal.isReady && TBGlobal.isReady()) TBGlobal.renderMapTitle();
    const notif = document.getElementById('shop-notif');
    if (notif) {
      const hasAdReward = C.canWatchAd();
      const canBuySomething = coins >= 40;
      notif.style.display = hasAdReward || canBuySomething ? 'inline-block' : 'none';
    }
    applyProgressiveUI();
    syncMoreNotif();
  }

  function updateWorldProgress() {
    const worldId = getSelectedWorldId();
    if (contentReady()) {
      const w = TBContent.getWorld(worldId);
      const prog = TBContent.getWorldProgress(C.ld(), worldId);
      const nameEl = document.getElementById('world-prog-name');
      const pctEl = document.getElementById('world-prog-pct');
      const fillEl = document.getElementById('world-prog-fill');
      const labelEl = document.getElementById('map-world-label');
      if (nameEl) nameEl.textContent = w ? `${w.icon} ${w.label}` : '';
      if (pctEl) pctEl.textContent = prog.pct + '%';
      if (fillEl) {
        fillEl.style.width = prog.pct + '%';
        if (w) fillEl.style.background = w.color;
      }
      if (labelEl && w) labelEl.textContent = `Explorando: ${w.label}`;
      return;
    }
    const unl = C.getUnlocked();
    if (!TBState.LEVELS.length) return;
    const curWorld = TBState.LEVELS[Math.min(unl, TBState.LEVELS.length - 1)].world;
    const worldLevels = TBState.LEVELS.filter((l) => l.world === curWorld);
    const worldStart = TBState.LEVELS.findIndex((l) => l.world === curWorld);
    const completedInWorld = Math.max(0, Math.min(unl - worldStart, worldLevels.length));
    const pct = Math.round((completedInWorld / worldLevels.length) * 100);
    const nameEl = document.getElementById('world-prog-name');
    const pctEl = document.getElementById('world-prog-pct');
    const fillEl = document.getElementById('world-prog-fill');
    if (nameEl) nameEl.textContent = curWorld;
    if (pctEl) pctEl.textContent = pct + '%';
    if (fillEl) fillEl.style.width = pct + '%';
  }

  function updatePlayButton() {
    const btn = document.getElementById('map-play-btn');
    if (!btn) return;
    const unl = C.getUnlocked();
    const worldsBtn = document.getElementById('map-worlds-btn');
    if (unl >= TBState.LEVELS.length) {
      btn.style.display = '';
      btn.dataset.level = '';
      btn.dataset.complete = '1';
      btn.textContent = t('campaign_complete_cta', '🎮 Abrir modos');
      btn.setAttribute(
        'aria-label',
        t('campaign_complete_aria', 'Campanha completa — abrir modos de jogo')
      );
      if (worldsBtn) worldsBtn.style.display = '';
      return;
    }
    const lv = TBState.LEVELS[unl];
    btn.style.display = '';
    btn.dataset.level = String(unl);
    btn.dataset.complete = '';
    btn.textContent = t('play_phase', '▶ Jogar Fase {n} · {name}')
      .replace('{n}', String(unl + 1))
      .replace('{name}', lv.name);
    btn.setAttribute(
      'aria-label',
      t('play_phase_aria', 'Jogar fase {n}: {name}')
        .replace('{n}', String(unl + 1))
        .replace('{name}', lv.name)
    );
  }

  function updateRegenDisplay() {
    const s = C.ld();
    const lives = s.lives ?? C.ML;
    const el = document.getElementById('map-regen');
    if (!el) return;
    if (lives >= C.ML) {
      el.textContent = '';
      return;
    }
    if (!s.lifeRegenAt) {
      el.textContent = '';
      return;
    }
    const nextRegen = TBLogic.msToNextLife(s.lifeRegenAt, Date.now(), C.LIFE_REGEN_MS);
    el.textContent = t('next_life_in', '⏱ Próxima vida em {time}').replace(
      '{time}',
      TBLogic.formatMsClock(nextRegen)
    );
  }

  function renderMap() {
    if (!ready()) return;
    updateMapMeta();
    const unl = C.getUnlocked();
    const grid = document.getElementById('map-grid');
    grid.innerHTML = '';
    const worldId = getSelectedWorldId();
    const playTag = (global.TBRoadmap && TBRoadmap.t('play_tag')) || 'JOGAR';
    const wMeta = contentReady() ? TBContent.getWorld(worldId) : null;
    if (wMeta) {
      const hdr = document.createElement('div');
      hdr.className = 'map-world-hdr' + (worldId === 'legendary' ? ' map-world-hdr--legend' : '');
      hdr.textContent = `${wMeta.icon} ${wMeta.label}`;
      hdr.style.color = wMeta.color;
      grid.appendChild(hdr);
    }
    TBState.LEVELS.forEach((lv, i) => {
      if (lv.worldId && lv.worldId !== worldId) return;

      const locked = i > unl,
        stars = C.getStars(i),
        played = i < unl,
        isCur = i === unl && !locked;
      const card = document.createElement('div');
      let cls = 'lc';
      if (locked) cls += ' locked';
      else if (isCur) cls += ' cur';
      else if (!played) cls += ' unplayed';
      if (stars === 3 && played) cls += ' perfect';
      const cssClass = (wMeta && wMeta.cssClass) || '';
      if (cssClass) cls += ' ' + cssClass;
      card.className = cls;

      const objIcon = (() => {
        const types = (lv.objectives || []).map((o) => o.type);
        if (types.includes('chain')) return '⛓️';
        if (types.includes('ice')) return '🧊';
        if (types.includes('crate')) return '📦';
        if (types.includes('collect')) return '🍒';
        if (types.includes('cover')) return '🟩';
        if (types.includes('color')) return '🎨';
        if (types.includes('score')) return '⭐';
        return '🎯';
      })();

      if (locked) {
        card.setAttribute('role', 'button');
        card.setAttribute('aria-disabled', 'true');
        card.setAttribute(
          'aria-label',
          t('phase_locked_aria', 'Fase {n}, bloqueada').replace('{n}', String(i + 1))
        );
        card.innerHTML = `<div style="font-size:18px" aria-hidden="true">🔒</div><div class="lc-nm">${t('phase_n', 'Fase {n}').replace('{n}', String(i + 1))}</div>`;
      } else {
        let starsHtml = '';
        if (stars === 0) starsHtml = `<span class="lc-s s0" aria-hidden="true">☆☆☆</span>`;
        else if (stars === 1) starsHtml = `<span class="lc-s s1" aria-hidden="true">★☆☆</span>`;
        else if (stars === 2) starsHtml = `<span class="lc-s s2" aria-hidden="true">★★☆</span>`;
        else starsHtml = `<span class="lc-s s3" aria-hidden="true">★★★</span>`;

        const canMastery = played && stars > 0 && !isCur;
        const masteryTag = canMastery
          ? `<span class="lc-mastery-tag">${stars < 3 ? t('mastery_improve', 'MELHORAR') : t('mastery_tag', 'MASTERY')}</span>`
          : '';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute(
          'aria-label',
          t('phase_aria', 'Fase {n}: {name}, {stars} de 3 estrelas{cur}')
            .replace('{n}', String(i + 1))
            .replace('{name}', lv.name)
            .replace('{stars}', String(stars))
            .replace(
              '{cur}',
              isCur
                ? t('phase_current_suffix', ', fase atual')
                : canMastery
                  ? t('phase_mastery_suffix', ', mastery')
                  : ''
            )
        );
        card.innerHTML = `<div class="lc-n">${i + 1}</div>
        <div class="lc-nm">${lv.name}</div>
        <div style="font-size:10px;color:var(--dim)" aria-hidden="true">${objIcon}</div>
        ${starsHtml}
        ${isCur ? `<span class="lc-play-tag">${playTag}</span>` : masteryTag}`;
        const launch = () => C.startGame(i, canMastery ? { mastery: true } : undefined);
        card.addEventListener('click', launch);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            launch();
          }
        });
      }
      grid.appendChild(card);
    });

    requestAnimationFrame(() => {
      const cur = grid.querySelector('.lc.cur');
      const scrollEl = document.getElementById('map-scroll');
      if (!cur || !scrollEl) return;
      const curEl = /** @type {HTMLElement} */ (cur);
      const y = curEl.offsetTop - scrollEl.clientHeight / 2 + curEl.offsetHeight / 2;
      scrollEl.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });

    startRegenInterval();
  }

  /** @type {TBMapApi} */
  const api = {
    init,
    renderMap,
    updateMapMeta,
    updateMapHint,
    openWorldSelect,
    renderWorldSelect,
    selectWorld,
    getSelectedWorldId,
    setSelectedWorld,
    grantWorldCompletionIfNeeded,
    startRegenInterval,
    stopRegenInterval,
    isFeatureUnlocked,
    applyProgressiveUI,
    syncMoreNotif,
    announceNewUnlocks,
    FEATURE_UNLOCKS,
  };

  /** @type {any} */
  const g = global;
  g.renderMap = renderMap;
  g.updateMapMeta = updateMapMeta;
  g.updateMapHint = updateMapHint;
  g.openWorldSelect = openWorldSelect;
  g.renderWorldSelect = renderWorldSelect;
  g.selectWorld = selectWorld;
  g.getSelectedWorldId = getSelectedWorldId;
  g.setSelectedWorld = setSelectedWorld;
  g.grantWorldCompletionIfNeeded = grantWorldCompletionIfNeeded;
  g.startRegenInterval = startRegenInterval;
  g.stopRegenInterval = stopRegenInterval;
  g.isFeatureUnlocked = isFeatureUnlocked;
  g.applyProgressiveUI = applyProgressiveUI;
  g.syncMoreNotif = syncMoreNotif;
  g.announceNewUnlocks = announceNewUnlocks;
  g.TBMap = api;
})(typeof window !== 'undefined' ? window : globalThis);
