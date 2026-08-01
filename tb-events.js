// @ts-check
/**
 * Tile Blast — eventos em rotação
 * Extraído de tb-meta-ui.js. TBEvents.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBEventsCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBContent = global.TBContent;
  /** @type {any} */
  const TBConfig = global.TBConfig;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBRuntime = global.TBRuntime;

  /** @type {any} */
  let C = null;

  /** @param {TBEventsCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function _locEventField(ev, field) {
    if (!ev || !ev.id) return (ev && ev[field]) || '';
    return C._t('ev_' + ev.id + '_' + field, ev[field] || '');
  }

  const EVENT_DURATION_MS = TBConfig.EVENT_DURATION_MS; // 3 days per slot
  const EVENT_DEFS = [
    {
      id: 'coins',
      icon: '💰',
      name: 'Chuva de Moedas',
      desc: '2× moedas ao completar fases',
      coinMult: 2,
      xpMult: 1,
      scoreMult: 1,
      chestMult: 1,
    },
    {
      id: 'xp',
      icon: '⚡',
      name: 'Surto de XP',
      desc: '2× XP de todas as fontes',
      coinMult: 1,
      xpMult: 2,
      scoreMult: 1,
      chestMult: 1,
    },
    {
      id: 'score',
      icon: '🎯',
      name: 'Explosão Score',
      desc: '1.5× pontuação em partidas',
      coinMult: 1,
      xpMult: 1,
      scoreMult: 1.5,
      chestMult: 1,
    },
    {
      id: 'chest',
      icon: '🎁',
      name: 'Festa dos Baús',
      desc: 'Baús dão +50% recompensas',
      coinMult: 1,
      xpMult: 1,
      scoreMult: 1,
      chestMult: 1.5,
    },
    {
      id: 'combo',
      icon: '🌈',
      name: 'Combo Frenético',
      desc: 'Combos ativam com 3+ blocos',
      coinMult: 1,
      xpMult: 1,
      scoreMult: 1,
      chestMult: 1,
      comboBonus: true,
    },
    {
      id: 'frenzy',
      icon: '🔥',
      name: 'Frenesi Total',
      desc: '2× moedas E 2× XP',
      coinMult: 2,
      xpMult: 2,
      scoreMult: 1,
      chestMult: 1,
    },
  ];

  // Hooks explícitos para módulos satélites (ex.: tb-features/episódios semanais)
  // estenderem eventos sem monkey-patch. Decorators de evento recebem/retornam o
  // objeto de evento; decorators de banner recebem o elemento DOM já renderizado.
  const _eventDecorators = [];
  const _bannerDecorators = [];
  function registerEventDecorator(fn) {
    if (typeof fn === 'function') _eventDecorators.push(fn);
  }
  function registerBannerDecorator(fn) {
    if (typeof fn === 'function') _bannerDecorators.push(fn);
  }

  function getActiveEvent() {
    let ev;
    if (TBContent && TBContent.isLoaded()) ev = TBContent.getActiveEvent();
    else ev = EVENT_DEFS[Math.floor(Date.now() / EVENT_DURATION_MS) % EVENT_DEFS.length];
    for (const d of _eventDecorators) {
      try {
        ev = d(ev) || ev;
      } catch (e) {
        /* decorator não deve derrubar o evento */
      }
    }
    return ev;
  }

  function _eventTimeLeft() {
    if (TBContent && TBContent.isLoaded()) return TBContent.getEventTimeLeft();
    const slot = Math.floor(Date.now() / EVENT_DURATION_MS);
    return (slot + 1) * EVENT_DURATION_MS - Date.now();
  }

  function _fmtEvTime(ms) {
    return TBLogic.formatEvTime(ms);
  }

  function _escTB(s) {
    return TBRuntime && TBRuntime.escapeHtml ? TBRuntime.escapeHtml(s) : String(s == null ? '' : s);
  }
  function renderEventBanner() {
    const ev = getActiveEvent();
    const el = document.getElementById('event-banner');
    if (!el) return;
    const name = _locEventField(ev, 'name');
    const desc = _locEventField(ev, 'desc');
    const timeLeft = _fmtEvTime(_eventTimeLeft());
    el.innerHTML = `<span class="ev-icon" aria-hidden="true">${ev.icon}</span><div class="ev-info"><span class="ev-name">${_escTB(name)}</span><span class="ev-desc">${_escTB(desc)}</span></div><span class="ev-time">${timeLeft}</span>`;
    el.setAttribute(
      'aria-label',
      C._t('event_active_a11y', 'Evento ativo: {name}. {desc}. Tempo restante: {time}')
        .replace('{name}', name)
        .replace('{desc}', desc)
        .replace('{time}', timeLeft)
    );
    for (const d of _bannerDecorators) {
      try {
        d(el);
      } catch (e) {
        /* decorator de banner não deve derrubar a renderização */
      }
    }
  }

  function openEventModal() {
    const ev = getActiveEvent();
    const rows = EVENT_DEFS.map((e) => {
      const active = e.id === ev.id;
      const name = _locEventField(e, 'name');
      const desc = _locEventField(e, 'desc');
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:${active ? 'rgba(246,201,69,.15)' : 'rgba(255,255,255,.04)'};border:1px solid ${active ? 'rgba(246,201,69,.4)' : 'transparent'};margin-bottom:4px;">
      <span style="font-size:20px;">${e.icon}</span>
      <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:${active ? '#f6c945' : 'var(--fg)'};">${name}${active ? C._t('event_active_mark', ' ← ATIVO') : ''}</div><div style="font-size:10px;color:var(--dim);">${desc}</div></div>
    </div>`;
    }).join('');
    let weeklyHtml = '';
    try {
      const weekly =
        global.TBContent && typeof global.TBContent.getActiveWeeklyEvent === 'function'
          ? global.TBContent.getActiveWeeklyEvent()
          : null;
      if (weekly) {
        const obj = weekly.objective ? `${weekly.objective.type} ×${weekly.objective.target}` : '';
        weeklyHtml = `<div style="margin:10px 0 8px;padding:10px;border-radius:10px;background:rgba(78,203,113,.12);border:1px solid rgba(78,203,113,.35)">
          <div style="font-size:12px;font-weight:800;color:#4ecb71">${weekly.icon || '📅'} ${C._t('weekly_event', 'Evento semanal')}: ${weekly.name}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:4px">${weekly.desc || ''}${obj ? ' · ' + obj : ''}</div>
        </div>`;
      }
      const social =
        global.TBContent && typeof global.TBContent.getSocialChallengeTarget === 'function'
          ? global.TBContent.getSocialChallengeTarget()
          : null;
      if (social && social.level != null) {
        weeklyHtml += `<button class="btn btn-g btn-full" style="margin-bottom:8px" data-action="shareSocialChallenge" data-arg="${social.level}">📤 ${C._t('challenge_friend_btn', 'Desafiar Amigo')} · ${C._t('phase_n', 'Fase {n}').replace('{n}', String(social.level))}</button>`;
      }
    } catch (e) {
      /* ignore */
    }
    C.showGlobalModal(`<div style="padding:4px 0;">
    <div style="font-size:17px;font-weight:900;margin-bottom:2px;">${C._t('events_title', '🗓 Eventos em Rotação')}</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px;">${C._t('event_ends_in', 'Evento atual termina em')} <b style="color:var(--accent);">${_fmtEvTime(_eventTimeLeft())}</b></div>
    ${weeklyHtml}
    ${rows}
    <button class="btn btn-p" style="width:100%;margin-top:10px;" data-action="closeGlobalModal">${C._t('close', 'Fechar')}</button>
  </div>`);
  }

  /** @type {any} */
  const api = {
    init,
    getActiveEvent,
    renderEventBanner,
    openEventModal,
    registerEventDecorator,
    registerBannerDecorator,
    EVENT_DEFS,
  };

  /** @type {any} */
  const g = global;
  g.getActiveEvent = getActiveEvent;
  g.renderEventBanner = renderEventBanner;
  g.openEventModal = openEventModal;
  g.registerEventDecorator = registerEventDecorator;
  g.registerBannerDecorator = registerBannerDecorator;
  g.TBEvents = api;
})(typeof window !== 'undefined' ? window : globalThis);
