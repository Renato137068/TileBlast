// @ts-check
/**
 * TB-CONTENT — Catálogo de conteúdo, mundos, eventos e modos de jogo.
 * Lazy-load de packs por mundo · missões JSON · admin schema · ranking eventos.
 *
 * @typedef {Record<string, any>} TBContentSave
 * @typedef {Record<string, any>} TBContentLevel
 * @typedef {Record<string, any>} TBContentWorld
 */
(function (global) {
  'use strict';

  var CONTENT_VERSION = 2;
  var _worlds = [];
  var _manifest = { packs: [] };
  var _levels = [];
  var _levelById = {};
  var _indexById = {};
  var _loadedPacks = {};
  var _events = { rotation: [], seasonal: [], weekly: [], rotationMs: 259200000 };
  var _modes = [];
  var _challenges = [];
  var _missions = { daily: [], weekly: [], dailyCount: 3, weeklyCount: 5 };
  var _adminSchema = null;
  var _remoteOverrides = {};
  var _metaLoaded = false;
  var _baseUrl = 'data/';

  function _legacyWorldLabel(worldId) {
    var icons = {
      garden: '🌱 Jardim',
      forest: '🌲 Floresta',
      mountain: '⛰ Montanha',
      ocean: '🌊 Oceano',
      inferno: '🔥 Inferno',
      crystal: '💎 Cristal',
      legendary: '👑 Lendário',
    };
    return icons[worldId] || worldId;
  }

  function _toRuntimeLevel(entry) {
    return {
      id: entry.id,
      worldId: entry.worldId,
      world: _legacyWorldLabel(entry.worldId),
      name: entry.name,
      moves: entry.moves,
      objectives: entry.objectives,
      setup: entry.setup,
      pattern: entry.pattern,
      seed: entry.seed,
      difficulty: entry.difficulty,
      reward: entry.reward,
      mode: entry.mode || 'classic_blast',
      order: entry.order,
    };
  }

  function _packStartIndex(worldId) {
    var idx = 0;
    for (var i = 0; i < _manifest.packs.length; i++) {
      if (_manifest.packs[i].worldId === worldId) return idx;
      idx += _manifest.packs[i].count;
    }
    return idx;
  }

  function _worldIdForIndex(index) {
    var idx = 0;
    for (var i = 0; i < _manifest.packs.length; i++) {
      var p = _manifest.packs[i];
      if (index >= idx && index < idx + p.count) return p.worldId;
      idx += p.count;
    }
    return null;
  }

  function _rebuildIndex() {
    _levelById = {};
    _indexById = {};
    _levels.sort(function (a, b) {
      return a.index - b.index;
    });
    _levels.forEach(function (lv, i) {
      lv.index = i;
      _levelById[lv.id] = lv;
      _indexById[lv.id] = i;
    });
  }

  function _ingestPack(pack, startIndex) {
    if (!pack || !pack.levels) return;
    var worldId = pack.worldId;
    var filtered = _levels.filter(function (l) {
      return l.worldId !== worldId;
    });
    var incoming = pack.levels.map(function (entry, i) {
      var rt = _toRuntimeLevel(entry);
      rt.index = startIndex + i;
      rt.order = entry.order || i + 1;
      return rt;
    });
    _levels = filtered.concat(incoming);
    _rebuildIndex();
    _loadedPacks[worldId] = true;
  }

  function getTotalLevelCount() {
    return _manifest.packs.reduce(function (s, p) {
      return s + p.count;
    }, 0);
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return r.json();
    });
  }

  function loadMeta(baseUrl) {
    if (baseUrl) _baseUrl = baseUrl.replace(/\/?$/, '/');
    var root = _baseUrl;
    return fetchJson(root + 'worlds.json').then(function (worlds) {
      return fetchJson(root + 'levels/manifest.json').then(function (manifest) {
        _worlds = worlds.worlds || worlds;
        _manifest = manifest;
        return Promise.all([
          fetchJson(root + 'events.json').catch(function () {
            return _events;
          }),
          fetchJson(root + 'modes.json').catch(function () {
            return { modes: [] };
          }),
          fetchJson(root + 'challenges.json').catch(function () {
            return { challenges: [] };
          }),
          fetchJson(root + 'missions.json').catch(function () {
            return _missions;
          }),
          fetchJson(root + 'admin-schema.json').catch(function () {
            return null;
          }),
        ]).then(function (parts) {
          _events = parts[0] || _events;
          _modes = (parts[1] && parts[1].modes) || [];
          _challenges = (parts[2] && parts[2].challenges) || [];
          _missions = parts[3] || _missions;
          _adminSchema = parts[4];
          _metaLoaded = true;
          applyRemoteOverrides(_remoteOverrides);
        });
      });
    });
  }

  function loadWorldPack(worldId) {
    if (_loadedPacks[worldId]) return Promise.resolve(getLevelsForWorld(worldId));
    var info = _manifest.packs.find(function (p) {
      return p.worldId === worldId;
    });
    if (!info) return Promise.reject(new Error('Pack não encontrado: ' + worldId));
    return fetchJson(_baseUrl + 'levels/' + info.file).then(function (pack) {
      _ingestPack(pack, _packStartIndex(worldId));
      return getLevelsForWorld(worldId);
    });
  }

  function loadAllPacks() {
    // Serial ingest: parallel Promise.all + shared _levels races drop/reorder packs.
    var chain = Promise.resolve();
    (_manifest.packs || []).forEach(function (p) {
      chain = chain.then(function () {
        return loadWorldPack(p.worldId);
      });
    });
    return chain;
  }

  function getPreloadWorldIds(unlocked) {
    unlocked = unlocked != null ? unlocked : 0;
    var out = {};
    out.garden = true;
    _worlds.forEach(function (w) {
      if (unlocked >= (w.unlockAtLevel || 0)) out[w.id] = true;
    });
    _worlds.forEach(function (w) {
      if (unlocked >= (w.unlockAtLevel || 0) - 3) out[w.id] = true;
    });
    return Object.keys(out);
  }

  function load(baseUrl, options) {
    options = options || {};
    return loadMeta(baseUrl)
      .then(function () {
        var preload = options.preloadWorlds;
        if (!preload && options.unlocked != null) preload = getPreloadWorldIds(options.unlocked);
        if (!preload) preload = ['garden'];
        if (options.loadAll) return loadAllPacks();
        // Serial preload: same shared-_levels race as loadAllPacks.
        var chain = Promise.resolve();
        preload.forEach(function (worldId) {
          chain = chain.then(function () {
            return loadWorldPack(worldId);
          });
        });
        return chain;
      })
      .then(function () {
        return getLevels();
      });
  }

  function loadFromData(data) {
    data = data || {};
    _worlds = (data.worlds && data.worlds.worlds) || data.worlds || [];
    if (data.manifest) _manifest = data.manifest;
    _levels = [];
    _loadedPacks = {};
    if (data.levelPacks) {
      data.levelPacks.forEach(function (pack) {
        _ingestPack(pack, _packStartIndex(pack.worldId));
      });
    }
    _events = data.events || _events;
    _modes = (data.modes && data.modes.modes) || data.modes || [];
    _challenges = (data.challenges && data.challenges.challenges) || data.challenges || [];
    _missions = data.missions || _missions;
    _adminSchema = data.adminSchema || _adminSchema;
    _metaLoaded = true;
    return getLevels();
  }

  function ensureWorldLoaded(worldId) {
    return loadWorldPack(worldId);
  }

  function ensureIndexLoaded(index) {
    var wid = _worldIdForIndex(index);
    if (!wid) return Promise.resolve();
    return loadWorldPack(wid);
  }

  function applyRemoteOverrides(cfg) {
    _remoteOverrides = cfg || {};
    if (cfg && cfg.disabledEvents && _events.seasonal) {
      _events.seasonal.forEach(function (ev) {
        if (cfg.disabledEvents.indexOf(ev.id) >= 0) ev.enabled = false;
      });
    }
    if (cfg && cfg.activeEventId && _events.seasonal) {
      _events.seasonal.forEach(function (ev) {
        if (cfg.disabledEvents && cfg.disabledEvents.indexOf(ev.id) >= 0) {
          ev.enabled = false;
          return;
        }
        if (cfg.activeEventId) ev.enabled = ev.id === cfg.activeEventId ? true : ev.enabled;
      });
    }
    if (cfg && cfg.eventOverrides && _events.seasonal) {
      var o = cfg.eventOverrides;
      _events.seasonal = _events.seasonal.map(function (ev) {
        return ev.id === o.id ? Object.assign({}, ev, o) : ev;
      });
    }
  }

  function _remoteFlag(key, fallback) {
    var rc = _remoteOverrides || {};
    if (rc[key] != null) return rc[key];
    return fallback;
  }

  function _liveOpsOn() {
    return _remoteFlag('liveOpsEnabled', true) !== false;
  }

  function _calendarOn() {
    return _liveOpsOn() && _remoteFlag('liveOpsCalendarEnabled', true) !== false;
  }

  /** Índice da semana do calendário (0–7), determinístico offline. */
  function getLiveOpsWeekIndex(now) {
    now = typeof now === 'number' ? now : Date.now();
    var cal = (_events && _events.calendar) || {};
    var weekMs = cal.weekMs || 604800000;
    var anchor = cal.anchorMs != null ? cal.anchorMs : 1704067200000;
    var weeks = cal.weeks || [];
    var n = weeks.length || 8;
    var offset = Number(_remoteFlag('calendarWeekOffset', 0)) || 0;
    var raw = Math.floor((now - anchor) / weekMs) + offset;
    var idx = ((raw % n) + n) % n;
    var disabled = _remoteFlag('disabledCalendarWeeks', []) || [];
    if (disabled.indexOf(idx) >= 0 || disabled.indexOf(weeks[idx] && weeks[idx].id) >= 0) {
      // Semana desabilitada: cai na próxima habilitada (offline estável).
      for (var i = 1; i <= n; i++) {
        var j = (idx + i) % n;
        if (disabled.indexOf(j) < 0 && disabled.indexOf(weeks[j] && weeks[j].id) < 0) return j;
      }
    }
    return idx;
  }

  function getLiveOpsSlot(now) {
    now = typeof now === 'number' ? now : Date.now();
    var cal = (_events && _events.calendar) || {};
    var weeks = cal.weeks || [];
    if (!_calendarOn() || !weeks.length) {
      return {
        enabled: false,
        weekIndex: 0,
        weekKey: 'legacy',
        rotationId: null,
        weeklyEventId: null,
        challengeId: null,
        socialLevel: null,
        returnReward: null,
        slot: null,
      };
    }
    var idx = getLiveOpsWeekIndex(now);
    var slot = weeks[idx] || weeks[0];
    var weekMs = cal.weekMs || 604800000;
    var anchor = cal.anchorMs != null ? cal.anchorMs : 1704067200000;
    var period = Math.floor((now - anchor) / weekMs);
    var weekStart = anchor + period * weekMs;
    return {
      enabled: true,
      weekIndex: idx,
      weekKey: (slot.id || 'w' + idx) + '_' + period,
      weekStart: weekStart,
      weekEnd: weekStart + weekMs,
      rotationId: slot.rotationId || null,
      weeklyEventId: slot.weeklyEventId || null,
      challengeId: slot.challengeId || null,
      socialLevel: slot.socialLevel != null ? slot.socialLevel : null,
      returnReward: slot.returnReward || null,
      theme: slot.theme || '',
      slot: slot,
    };
  }

  function getWeeklyEventById(id) {
    return (
      (_events.weekly || []).find(function (w) {
        return w.id === id;
      }) || null
    );
  }

  function getActiveWeeklyEvent(now) {
    if (!_liveOpsOn() || _remoteFlag('liveOpsWeeklyEnabled', true) === false) return null;
    var info = getLiveOpsSlot(now);
    if (!info.enabled || !info.weeklyEventId) return null;
    var ev = getWeeklyEventById(info.weeklyEventId);
    if (!ev) return null;
    return Object.assign({}, ev, {
      calendar: true,
      weekKey: info.weekKey,
      weekIndex: info.weekIndex,
      endsAt: info.weekEnd,
    });
  }

  function getSocialChallengeTarget(now) {
    if (!_liveOpsOn() || _remoteFlag('liveOpsSocialEnabled', true) === false) return null;
    var info = getLiveOpsSlot(now);
    if (!info.enabled || info.socialLevel == null) return null;
    return { level: info.socialLevel, weekKey: info.weekKey, weekIndex: info.weekIndex };
  }

  function _claimKey(kind, weekKey) {
    return kind + ':' + weekKey;
  }

  function hasLiveOpsClaim(save, kind, weekKey) {
    save = save || {};
    var claims = save.liveOpsClaims || {};
    return !!claims[_claimKey(kind, weekKey)];
  }

  function markLiveOpsClaim(save, kind, weekKey, meta) {
    save = save || {};
    save.liveOpsClaims = save.liveOpsClaims || {};
    var key = _claimKey(kind, weekKey);
    if (save.liveOpsClaims[key]) return false;
    save.liveOpsClaims[key] = Object.assign({ at: Date.now() }, meta || {});
    return true;
  }

  /** Recompensa de retorno da semana — uma vez por weekKey. */
  function claimReturnReward(save, now) {
    if (!_liveOpsOn() || _remoteFlag('liveOpsReturnEnabled', true) === false) {
      return { ok: false, reason: 'disabled' };
    }
    var info = getLiveOpsSlot(now);
    if (!info.enabled || !info.returnReward) return { ok: false, reason: 'no_slot' };
    if (!markLiveOpsClaim(save, 'return', info.weekKey, { coins: info.returnReward.coins || 0 })) {
      return { ok: false, reason: 'already_claimed' };
    }
    return { ok: true, reward: info.returnReward, weekKey: info.weekKey };
  }

  /** Simula N dias a partir de t0 (aceite P2.1). */
  function simulateLiveOpsDays(t0, days, opts) {
    opts = opts || {};
    var save = opts.save || {};
    var out = [];
    var dayMs = 86400000;
    for (var d = 0; d < days; d++) {
      var t = t0 + d * dayMs + (opts.hourMs || 12 * 3600000);
      var slot = getLiveOpsSlot(t);
      var rot = getActiveRotationEvent(t);
      var weekly = getActiveWeeklyEvent(t);
      var ch = getDailyChallengeForDay(Math.floor(t / dayMs));
      var social = getSocialChallengeTarget(t);
      var ret = null;
      if (opts.claimReturn) {
        ret = claimReturnReward(save, t);
      }
      out.push({
        day: d,
        ts: t,
        weekIndex: slot.weekIndex,
        weekKey: slot.weekKey,
        rotationId: rot && rot.id,
        weeklyEventId: weekly && weekly.id,
        challengeId: ch && ch.id,
        socialLevel: social && social.level,
        returnClaim: ret,
      });
    }
    return { days: out, save: save };
  }

  function migrateSave(save) {
    save = save || {};
    if ((save.contentVersion || 1) >= CONTENT_VERSION) return save;
    if ((save.unlocked || 0) > 9) save.unlocked = (save.unlocked || 0) + 5;
    save.contentVersion = CONTENT_VERSION;
    return save;
  }

  // ── LevelCatalog ───────────────────────────────────────────────────────────
  function getLevels() {
    return _levels.slice();
  }
  function getLevelCount() {
    return _levels.length;
  }
  function getLevel(index) {
    if (_levels[index]) return _levels[index];
    return null;
  }
  function getLevelById(id) {
    return _levelById[id] || null;
  }
  function indexOfLevelId(id) {
    return _indexById[id] != null ? _indexById[id] : -1;
  }
  function getLevelsForWorld(worldId) {
    return _levels.filter(function (l) {
      return l.worldId === worldId;
    });
  }
  function isPackLoaded(worldId) {
    return !!_loadedPacks[worldId];
  }

  // ── WorldManager ───────────────────────────────────────────────────────────
  function getWorlds() {
    return _worlds.slice();
  }
  function getWorld(id) {
    return (
      _worlds.find(function (w) {
        return w.id === id;
      }) || null
    );
  }
  function getWorldForLevelIndex(index) {
    var wid = _worldIdForIndex(index);
    return wid ? getWorld(wid) : null;
  }
  function isWorldUnlocked(save, worldId) {
    save = save || {};
    var w = getWorld(worldId);
    if (!w) return false;
    return (save.unlocked != null ? save.unlocked : 0) >= (w.unlockAtLevel || 0);
  }
  function getWorldProgress(save, worldId) {
    save = save || {};
    var info = _manifest.packs.find(function (p) {
      return p.worldId === worldId;
    });
    var total = info ? info.count : getLevelsForWorld(worldId).length;
    if (!total) return { completed: 0, total: 0, pct: 0, stars: 0, perfect: 0 };
    var start = _packStartIndex(worldId);
    var unlocked = save.unlocked != null ? save.unlocked : 0;
    var starsMap = save.stars || {};
    var completed = 0,
      stars = 0,
      perfect = 0;
    for (var i = 0; i < total; i++) {
      var gi = start + i;
      if (gi < unlocked) {
        completed++;
        var st = starsMap[gi] || 0;
        stars += st;
        if (st === 3) perfect++;
      }
    }
    return {
      completed: completed,
      total: total,
      pct: total ? Math.round((completed / total) * 100) : 0,
      stars: stars,
      perfect: perfect,
    };
  }
  function isWorldComplete(save, worldId) {
    var p = getWorldProgress(save, worldId);
    return p.total > 0 && p.completed >= p.total;
  }
  function getWorldCompletionReward(worldId) {
    var w = getWorld(worldId);
    return w && w.completionReward ? w.completionReward : null;
  }
  function claimWorldReward(save, worldId) {
    save = save || {};
    save.worldRewards = save.worldRewards || {};
    if (save.worldRewards[worldId]) return null;
    if (!isWorldComplete(save, worldId)) return null;
    var reward = getWorldCompletionReward(worldId);
    if (!reward) return null;
    save.worldRewards[worldId] = true;
    return reward;
  }
  function getWorldColor(worldId) {
    var w = getWorld(worldId);
    return w ? w.color : '#888';
  }
  function getWorldCssClass(worldId) {
    var w = getWorld(worldId);
    return w ? w.cssClass : '';
  }
  function getWorldSkinId(worldId) {
    var w = getWorld(worldId);
    return w ? w.skinId : null;
  }

  // ── Missions ───────────────────────────────────────────────────────────────
  function getDailyMissionPool() {
    return (_missions.daily || []).slice();
  }
  function getWeeklyMissionPool() {
    return (_missions.weekly || []).slice();
  }
  function getDailyMissionCount() {
    return _missions.dailyCount || 3;
  }
  function getWeeklyMissionCount() {
    return _missions.weeklyCount || 5;
  }

  // ── EventManager ───────────────────────────────────────────────────────────
  function _parseMd(date, month, day) {
    var y = date.getFullYear();
    var start = new Date(y, month - 1, day);
    if (date < start) start.setFullYear(y - 1);
    return start;
  }
  function _seasonalActive(ev, now) {
    if (_remoteOverrides.activeEventId && ev.id !== _remoteOverrides.activeEventId) return false;
    if (_remoteOverrides.activeEventStart && _remoteOverrides.activeEventEnd) {
      var s = new Date(_remoteOverrides.activeEventStart);
      var e = new Date(_remoteOverrides.activeEventEnd);
      return now >= s && now <= e && ev.id === _remoteOverrides.activeEventId;
    }
    var start = _parseMd(now, ev.startMonth, ev.startDay);
    var end = new Date(start.getFullYear(), ev.endMonth - 1, ev.endDay, 23, 59, 59);
    if (ev.endMonth < ev.startMonth && now.getMonth() + 1 <= ev.endMonth) {
      start.setFullYear(now.getFullYear() - 1);
      end.setFullYear(now.getFullYear());
    }
    return now >= start && now <= end;
  }
  function getActiveSeasonalEvents(now) {
    now = now || new Date();
    return (_events.seasonal || []).filter(function (ev) {
      return ev.enabled !== false && _seasonalActive(ev, now);
    });
  }
  function getActiveRotationEvent(now) {
    now = now || Date.now();
    var list = _events.rotation || [];
    if (!list.length) return null;
    if (_calendarOn() && _liveOpsOn()) {
      var info = getLiveOpsSlot(now);
      if (info.enabled && info.rotationId) {
        var found = list.find(function (r) {
          return r.id === info.rotationId;
        });
        if (found) {
          return Object.assign({}, found, {
            calendar: true,
            weekKey: info.weekKey,
            weekIndex: info.weekIndex,
          });
        }
      }
    }
    var ms = _events.rotationMs || 259200000;
    return list[Math.floor(now / ms) % list.length];
  }
  function getActiveEvent(now) {
    var ts = typeof now === 'number' ? now : Date.now();
    var seasonal = getActiveSeasonalEvents(typeof now === 'number' ? new Date(now) : now);
    var base = getActiveRotationEvent(ts) || {
      coinMult: 1,
      xpMult: 1,
      scoreMult: 1,
      chestMult: 1,
    };
    if (!seasonal.length) return base;
    var merged = JSON.parse(JSON.stringify(base));
    seasonal.forEach(function (ev) {
      ['coinMult', 'xpMult', 'scoreMult', 'chestMult', 'comboBonus'].forEach(function (k) {
        if (ev[k] != null) merged[k] = Math.max(merged[k] || 1, ev[k]);
      });
      merged.id = ev.id;
      merged.icon = ev.icon;
      merged.name = ev.name;
      merged.desc = ev.desc;
      merged.seasonal = true;
      merged.ranking = ev.ranking;
      merged.objective = ev.objective;
      merged.reward = ev.reward;
    });
    return merged;
  }
  function getAllRotationEvents() {
    return (_events.rotation || []).slice();
  }
  function getSeasonalEvents() {
    return (_events.seasonal || []).slice();
  }
  function getWeeklyEvents() {
    return (_events.weekly || []).slice();
  }
  function getEventTimeLeft(now) {
    now = now || Date.now();
    if (_calendarOn() && _liveOpsOn()) {
      var info = getLiveOpsSlot(now);
      if (info.enabled && info.weekEnd) return Math.max(0, info.weekEnd - now);
    }
    var ms = _events.rotationMs || 259200000;
    return (Math.floor(now / ms) + 1) * ms - now;
  }
  function getEventLeaderboardId(eventId) {
    var week = Math.floor(Date.now() / (7 * 86400000));
    return 'event_' + eventId + '_' + week;
  }
  function trackEventProgress(save, type, amount) {
    save = save || {};
    var active = getActiveSeasonalEvents();
    if (!active.length) return null;
    save.eventProgress = save.eventProgress || {};
    var updated = null;
    active.forEach(function (ev) {
      if (!ev.objective || ev.objective.type !== type) return;
      // Chave por janela do evento (mês/ano), não por dia — evita reset diário.
      var key =
        ev.id +
        '_' +
        (ev.startMonth || 0) +
        '_' +
        (ev.endMonth || 0) +
        '_' +
        new Date().getFullYear();
      var prog = save.eventProgress[key] || { progress: 0, done: false, claimed: false };
      if (prog.done) {
        updated = { event: ev, progress: prog };
        return;
      }
      prog.progress = Math.min((prog.progress || 0) + amount, ev.objective.target);
      if (prog.progress >= ev.objective.target) prog.done = true;
      save.eventProgress[key] = prog;
      updated = { event: ev, progress: prog };
    });
    return updated;
  }

  /** Concede reward sazonal uma vez (anti-duplicata). */
  function claimSeasonalEventReward(save, eventId) {
    save = save || {};
    save.eventProgress = save.eventProgress || {};
    var active = getActiveSeasonalEvents().filter(function (ev) {
      return ev.id === eventId;
    });
    if (!active.length) return { ok: false, reason: 'inactive' };
    var ev = active[0];
    var key =
      ev.id +
      '_' +
      (ev.startMonth || 0) +
      '_' +
      (ev.endMonth || 0) +
      '_' +
      new Date().getFullYear();
    var prog = save.eventProgress[key];
    if (!prog || !prog.done) return { ok: false, reason: 'incomplete' };
    if (prog.claimed) return { ok: false, reason: 'already_claimed' };
    prog.claimed = true;
    save.eventProgress[key] = prog;
    return { ok: true, reward: ev.reward || {}, event: ev };
  }

  // ── GameModeRegistry ───────────────────────────────────────────────────────
  function getModes() {
    return _modes.slice();
  }
  function getMode(id) {
    return (
      _modes.find(function (m) {
        return m.id === id;
      }) || null
    );
  }
  function isModeUnlocked(save, modeId) {
    var m = getMode(modeId);
    if (!m) return false;
    return (save.unlocked != null ? save.unlocked : 0) >= (m.unlockAtLevel || 0);
  }
  function buildTimeChallengeLevel(round) {
    var m = getMode('time_challenge');
    var proc = (m && m.procedural) || {
      moves: 999,
      objectives: [{ type: 'score', target: 3000 }],
      worldLabel: '⏱ Desafio Relâmpago',
    };
    var target = proc.objectives[0].target + (round || 0) * 400;
    return {
      id: 'time-challenge-' + (round || 1),
      worldId: 'time',
      world: proc.worldLabel || '⏱ Desafio Relâmpago',
      name: 'Rodada ' + (round || 1),
      moves: proc.moves,
      objectives: [{ type: 'score', target: target }],
      mode: 'time_challenge',
      timerSec: (m && m.timerSec) || 60,
      scoreMultiplier: (m && m.scoreMultiplier) || 1.5,
      seed: 9000 + (round || 1) * 17,
    };
  }
  function getDailyChallengeDefs() {
    return _challenges.slice();
  }
  function getDailyChallengeForDay(epochDay) {
    if (!_challenges.length) return null;
    if (_calendarOn() && _liveOpsOn() && _remoteFlag('liveOpsDailyEnabled', true) !== false) {
      var ts = epochDay * 86400000 + 12 * 3600000;
      var info = getLiveOpsSlot(ts);
      if (info.enabled && info.challengeId) {
        var found = _challenges.find(function (c) {
          return c.id === info.challengeId;
        });
        if (found) return Object.assign({}, found, { calendar: true, weekKey: info.weekKey });
      }
    }
    return _challenges[epochDay % _challenges.length];
  }

  var CONTENT_MONETIZATION = {
    progressOffers: [
      {
        id: 'world_unlock_boost',
        trigger: 'world_complete',
        sku: 'value_boost',
        label: 'Pacote Impulso',
      },
      { id: 'stuck_level', trigger: 'fail_streak_3', sku: 'rescue', label: 'Pacote Resgate' },
      { id: 'event_return', trigger: 'event_active', sku: 'weekly_pack', label: 'Pacote Semanal' },
    ],
    eventBonusAds: { reward: { coins: 75 }, dailyLimit: 3 },
    premiumBoosters: { star_rainbow: { label: 'Arco-íris Estelar', eventOnly: true } },
  };

  function getContentOfferForTrigger(trigger) {
    return (
      CONTENT_MONETIZATION.progressOffers.find(function (o) {
        return o.trigger === trigger;
      }) || null
    );
  }

  /** @type {any} */
  const g = global;
  g.TBContent = {
    CONTENT_VERSION: CONTENT_VERSION,
    load: load,
    loadMeta: loadMeta,
    loadFromData: loadFromData,
    loadWorldPack: loadWorldPack,
    loadAllPacks: loadAllPacks,
    ensureWorldLoaded: ensureWorldLoaded,
    ensureIndexLoaded: ensureIndexLoaded,
    getPreloadWorldIds: getPreloadWorldIds,
    applyRemoteOverrides: applyRemoteOverrides,
    migrateSave: migrateSave,
    isLoaded: function () {
      return _metaLoaded && _levels.length > 0;
    },
    isMetaLoaded: function () {
      return _metaLoaded;
    },
    isPackLoaded: isPackLoaded,
    getTotalLevelCount: getTotalLevelCount,
    getLevels: getLevels,
    getLevelCount: getLevelCount,
    getLevel: getLevel,
    getLevelById: getLevelById,
    indexOfLevelId: indexOfLevelId,
    getLevelsForWorld: getLevelsForWorld,
    getWorlds: getWorlds,
    getWorld: getWorld,
    getWorldForLevelIndex: getWorldForLevelIndex,
    isWorldUnlocked: isWorldUnlocked,
    getWorldProgress: getWorldProgress,
    isWorldComplete: isWorldComplete,
    getWorldCompletionReward: getWorldCompletionReward,
    claimWorldReward: claimWorldReward,
    getWorldColor: getWorldColor,
    getWorldCssClass: getWorldCssClass,
    getWorldSkinId: getWorldSkinId,
    getDailyMissionPool: getDailyMissionPool,
    getWeeklyMissionPool: getWeeklyMissionPool,
    getDailyMissionCount: getDailyMissionCount,
    getWeeklyMissionCount: getWeeklyMissionCount,
    getActiveEvent: getActiveEvent,
    getActiveSeasonalEvents: getActiveSeasonalEvents,
    getActiveRotationEvent: getActiveRotationEvent,
    getAllRotationEvents: getAllRotationEvents,
    getSeasonalEvents: getSeasonalEvents,
    getWeeklyEvents: getWeeklyEvents,
    getWeeklyEventById: getWeeklyEventById,
    getActiveWeeklyEvent: getActiveWeeklyEvent,
    getLiveOpsWeekIndex: getLiveOpsWeekIndex,
    getLiveOpsSlot: getLiveOpsSlot,
    getSocialChallengeTarget: getSocialChallengeTarget,
    hasLiveOpsClaim: hasLiveOpsClaim,
    markLiveOpsClaim: markLiveOpsClaim,
    claimReturnReward: claimReturnReward,
    claimSeasonalEventReward: claimSeasonalEventReward,
    simulateLiveOpsDays: simulateLiveOpsDays,
    getEventTimeLeft: getEventTimeLeft,
    getEventLeaderboardId: getEventLeaderboardId,
    trackEventProgress: trackEventProgress,
    getModes: getModes,
    getMode: getMode,
    isModeUnlocked: isModeUnlocked,
    buildTimeChallengeLevel: buildTimeChallengeLevel,
    getDailyChallengeDefs: getDailyChallengeDefs,
    getDailyChallengeForDay: getDailyChallengeForDay,
    CONTENT_MONETIZATION: CONTENT_MONETIZATION,
    getContentOfferForTrigger: getContentOfferForTrigger,
    getAdminSchema: function () {
      return _adminSchema;
    },
    _legacyWorldLabel: _legacyWorldLabel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
