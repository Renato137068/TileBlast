// @ts-check
/**
 * Tile Blast - logica pura testavel (pontuacao, flood-fill, obstaculos, save em memoria).
 *
 * @typedef {{ type: number, sp?: number, ice?: number, chain?: number, crate?: number }} TBBlock
 * @typedef {Array<Array<TBBlock|null|undefined>>} TBGrid
 * @typedef {{ scoreMult?: number, comboBonus?: boolean }} TBLogicEvent
 * @typedef {{ type: string, target: number, color?: number }} TBObjective
 * @typedef {{ x: number, y: number, size: number }} TBValidMove
 * @typedef {{ lives?: number, lifeRegenAt?: number|null }} TBLifeSave
 * @typedef {{ unlocked?: number, stars?: Record<number|string, number>, hs?: number }} TBProgressSave
 * @typedef {{ win?: Record<number, number>, score_per_1000?: number }} TBXpDefs
 * @typedef {{ moves: number, target: number }} TBInfiniteParams
 * @typedef {{ level: number, current: number, needed: number, pct: number }} TBXpLevelInfo
 * @typedef {{ sk: string, ml: number, ld: () => Record<string, any>, sv: (s: Record<string, any>) => void, flushSave: () => void, reset: () => void, getLives: () => number }} TBMemSave
 */
(function (global) {
  'use strict';

  const SCORE = { PPB: 10, CMT: 5, CMM: 1.5, CHT: 8, CHM: 2.0 };

  /**
   * @param {number} cnt
   * @param {TBLogicEvent} [event]
   * @returns {number}
   */
  function calcGroupPts(cnt, event) {
    const m = comboMultiplier(cnt, event);
    const ev = event || {};
    return Math.round(cnt * SCORE.PPB * m * (ev.scoreMult || 1));
  }

  /**
   * @param {number} cnt
   * @param {TBLogicEvent} [event]
   * @returns {number}
   */
  function comboMultiplier(cnt, event) {
    const ev = event || {};
    const comboThresh = ev.comboBonus ? 3 : SCORE.CMT;
    if (cnt >= SCORE.CHT) return SCORE.CHM;
    if (cnt >= comboThresh) return SCORE.CMM;
    return 1;
  }

  /**
   * @param {number} movesLeft
   * @param {number} totalMoves
   * @returns {number}
   */
  function calcStars(movesLeft, totalMoves) {
    if (!totalMoves) return 1;
    const r = movesLeft / totalMoves;
    return r > 0.6 ? 3 : r > 0.3 ? 2 : 1;
  }

  /**
   * @param {TBGrid} grid
   * @param {number} gw
   * @param {number} gh
   * @param {number} [spNone]
   * @returns {TBValidMove|null}
   */
  function findValidMove(grid, gw, gh, spNone) {
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) {
        const g = getGroup(grid, x, y, gw, gh, spNone);
        if (g.length >= 2) return { x, y, size: g.length };
      }
    }
    return null;
  }

  /**
   * Maior grupo cor ≥ minSize (cascata automática pós-queda).
   * @param {TBGrid} grid
   * @param {number} gw
   * @param {number} gh
   * @param {number} [spNone]
   * @param {number} [minSize]
   * @returns {Array<[number, number]>|null}
   */
  function findLargestGroup(grid, gw, gh, spNone, minSize) {
    const min = minSize == null ? 2 : minSize;
    const groups = findMatchingGroups(grid, gw, gh, spNone, min);
    let best = null;
    for (let i = 0; i < groups.length; i++) {
      if (!best || groups[i].length > best.length) best = groups[i];
    }
    return best;
  }

  /**
   * Grupos cor ≥ minSize (não sobrepostos) — cascata pós-queda.
   * @param {TBGrid} grid
   * @param {number} gw
   * @param {number} gh
   * @param {number} [spNone]
   * @param {number} [minSize]
   * @returns {Array<Array<[number, number]>>}
   */
  function findMatchingGroups(grid, gw, gh, spNone, minSize) {
    const min = minSize == null ? 2 : minSize;
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {Array<Array<[number, number]>>} */
    const groups = [];
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) {
        const key = x + ',' + y;
        if (seen.has(key)) continue;
        const g = getGroup(grid, x, y, gw, gh, spNone);
        if (!g.length) continue;
        for (let i = 0; i < g.length; i++) seen.add(g[i][0] + ',' + g[i][1]);
        if (g.length >= min) groups.push(g);
      }
    }
    return groups;
  }

  /**
   * @param {TBGrid} grid
   * @param {number} gw
   * @param {number} gh
   * @param {number} [spNone]
   * @returns {boolean}
   */
  function hasMoves(grid, gw, gh, spNone) {
    const none = spNone == null ? 0 : spNone;
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) {
        if (grid[x]?.[y]?.sp !== none) return true;
      }
    }
    return !!findValidMove(grid, gw, gh, spNone);
  }

  /**
   * Flood-fill de grupo da mesma cor (sem especiais/obstáculos).
   * @param {TBGrid} grid
   * @param {number} sx
   * @param {number} sy
   * @param {number} gw
   * @param {number} gh
   * @param {number} [spNone]
   * @returns {Array<[number, number]>}
   */
  function getGroup(grid, sx, sy, gw, gh, spNone) {
    const none = spNone == null ? 0 : spNone;
    /**
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    function ok(x, y) {
      return x >= 0 && x < gw && y >= 0 && y < gh;
    }
    if (!ok(sx, sy) || !grid[sx][sy]) return [];
    const t = grid[sx][sy].type;
    const vis = new Set();
    /** @type {Array<[number, number]>} */
    const stk = [[sx, sy]];
    /** @type {Array<[number, number]>} */
    const g = [];
    if (grid[sx][sy].sp !== none) return [];
    // Blocos sob obstaculo bloqueante (gelo/corrente) ou caixas nao formam grupo.
    if (grid[sx][sy].ice > 0 || grid[sx][sy].chain > 0 || grid[sx][sy].crate > 0) return [];
    while (stk.length) {
      const cell = stk.pop();
      if (!cell) continue;
      const x = cell[0];
      const y = cell[1];
      const k = x + ',' + y;
      if (vis.has(k) || !ok(x, y)) continue;
      const b = grid[x][y];
      if (!b || b.sp !== none || b.type !== t) continue;
      if ((b.ice || 0) > 0 || (b.chain || 0) > 0 || (b.crate || 0) > 0) continue;
      vis.add(k);
      g.push([x, y]);
      stk.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return g;
  }

  /**
   * @param {string} [key]
   * @param {number} [maxLives]
   * @returns {TBMemSave}
   */
  function createMemSave(key, maxLives) {
    const sk = key || 'tbv4';
    const ml = maxLives == null ? 5 : maxLives;
    let cache = null;
    let dirty = false;
    let timer = null;
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;

    function ld() {
      if (cache !== null) return cache;
      try {
        cache = storage ? JSON.parse(storage.getItem(sk) || '{}') : {};
      } catch {
        cache = {};
      }
      if (!cache || typeof cache !== 'object') cache = {};
      return cache;
    }

    function flushSave() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!dirty || cache === null || !storage) return;
      storage.setItem(sk, JSON.stringify(cache));
      dirty = false;
    }

    function sv(s) {
      cache = s;
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flushSave, 400);
    }

    function reset() {
      cache = null;
      dirty = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (storage) storage.removeItem(sk);
    }

    function getLives() {
      return Math.min(ld().lives ?? ml, ml);
    }

    return { sk, ml, ld, sv, flushSave, reset, getLives };
  }

  /**
   * @param {TBGrid} grid
   * @param {number} gw
   * @param {number} gh
   * @param {number} [spNone]
   * @returns {TBValidMove|null}
   */
  function findSmallestMove(grid, gw, gh, spNone) {
    let best = null;
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) {
        const g = getGroup(grid, x, y, gw, gh, spNone);
        if (g.length >= 2 && (!best || g.length < best.size)) best = { x, y, size: g.length };
      }
    }
    return best;
  }

  // Vitória: score / cor / obstáculos. obsProgress separado; se omitido, o 3º
  // mapa ainda serve para obstáculos (compat com testes antigos).
  /**
   * @param {TBObjective[]|null|undefined} objectives
   * @param {number} score
   * @param {Record<string|number, number>} [colorProgress]
   * @param {Record<string, number>} [obsProgress]
   * @returns {boolean}
   */
  function checkObjectives(objectives, score, colorProgress, obsProgress) {
    const cp = colorProgress || {};
    const op = obsProgress != null ? obsProgress : cp;
    return (objectives || []).every((o) => {
      if (o.type === 'score') return score >= o.target;
      if (o.type === 'color') return (cp[o.color] || 0) >= o.target;
      return (op[o.type] || 0) >= o.target;
    });
  }

  // Progresso médio dos objetivos em 0–100 (barra / HUD).
  /**
   * @param {TBObjective[]|null|undefined} objectives
   * @param {number} score
   * @param {Record<string|number, number>} [colorProgress]
   * @param {Record<string, number>} [obsProgress]
   * @returns {number}
   */
  function objectivesAvgProgress(objectives, score, colorProgress, obsProgress) {
    const objs = objectives || [];
    if (!objs.length) return 0;
    const cp = colorProgress || {};
    const op = obsProgress || {};
    let sum = 0;
    for (const o of objs) {
      if (o.type === 'score') sum += Math.min(1, score / (o.target || 1));
      else if (o.type === 'color') sum += Math.min(1, (cp[o.color] || 0) / (o.target || 1));
      else sum += Math.min(1, (op[o.type] || 0) / (o.target || 1));
    }
    return Math.min(100, (sum / objs.length) * 100);
  }

  // Menor taxa de conclusão entre objetivos (0–1) — “quase vitória”.
  /**
   * @param {TBObjective[]|null|undefined} objectives
   * @param {number} score
   * @param {Record<string|number, number>} [colorProgress]
   * @param {Record<string, number>} [obsProgress]
   * @returns {number}
   */
  function objectivesMinProgress(objectives, score, colorProgress, obsProgress) {
    const objs = objectives || [];
    if (!objs.length) return 1;
    const cp = colorProgress || {};
    const op = obsProgress || {};
    let mn = 1;
    for (const o of objs) {
      let c;
      if (o.type === 'score') c = Math.min(1, score / (o.target || 1));
      else if (o.type === 'color') c = Math.min(1, (cp[o.color] || 0) / (o.target || 1));
      else c = Math.min(1, (op[o.type] || 0) / (o.target || 1));
      mn = Math.min(mn, c);
    }
    return mn;
  }

  /**
   * @param {number} minProgress
   * @param {number} [threshold]
   * @returns {boolean}
   */
  function isNearMiss(minProgress, threshold) {
    return minProgress >= (threshold == null ? 0.8 : threshold);
  }

  // Tier do baú de vitória a partir das estrelas.
  /**
   * @param {number} stars
   * @returns {'gold'|'silver'|'bronze'}
   */
  function winChestTier(stars) {
    const s = stars | 0;
    if (s >= 3) return 'gold';
    if (s === 2) return 'silver';
    return 'bronze';
  }

  // XP de vitória (estrelas + contribuição por score). Puro.
  /**
   * @param {number} stars
   * @param {number} score
   * @param {TBXpDefs} [xpDefs]
   * @returns {{ xpWin: number, xpScore: number, total: number }}
   */
  function winXpGain(stars, score, xpDefs) {
    const defs = xpDefs || {};
    const winTable = defs.win || {};
    const xpWin = winTable[Math.min(stars | 0, 3)] || 0;
    const per = defs.score_per_1000 || 0;
    const xpScore = Math.floor((score || 0) / 1000) * per;
    return { xpWin, xpScore, total: xpWin + xpScore };
  }

  // Portão de vidas: fases iniciais (0..freeUntil-1) não consomem vida.
  /**
   * @param {number} levelIndex
   * @param {number} [freeUntil]
   * @returns {boolean}
   */
  function shouldLoseLife(levelIndex, freeUntil) {
    const free = freeUntil == null ? 5 : freeUntil;
    return (levelIndex | 0) >= free;
  }

  /**
   * @param {number} movesLeft
   * @param {number} totalMoves
   * @param {number} [scoreRatio]
   * @returns {number}
   */
  function calcStarsMerit(movesLeft, totalMoves, scoreRatio) {
    if (!totalMoves) return 1;
    const mr = movesLeft / totalMoves;
    const sr = scoreRatio == null ? 1 : scoreRatio;
    if (mr >= 0.35 && sr >= 1.2) return 3;
    if (mr >= 0.15 || sr >= 1.4) return 2;
    return 1;
  }

  /**
   * @param {Array<[number, number]|number[]>|null|undefined} popped
   * @param {TBGrid} grid
   * @param {number} gw
   * @param {number} gh
   * @returns {Array<{ x: number, y: number }>}
   */
  function adjacentObstacleCells(popped, grid, gw, gh) {
    const seen = new Set();
    /** @type {Array<{ x: number, y: number }>} */
    const out = [];
    /**
     * @param {TBBlock|null|undefined} b
     * @returns {boolean}
     */
    const isObs = (b) => !!(b && ((b.ice || 0) > 0 || (b.crate || 0) > 0 || (b.chain || 0) > 0));
    for (const p of popped || []) {
      const px = p[0],
        py = p[1];
      const neigh = [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ];
      for (const n of neigh) {
        const nx = n[0],
          ny = n[1];
        if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
        const k = nx + ',' + ny;
        if (seen.has(k)) continue;
        const b = grid[nx] && grid[nx][ny];
        if (isObs(b)) {
          seen.add(k);
          out.push({ x: nx, y: ny });
        }
      }
    }
    return out;
  }

  /**
   * @param {(() => number)|undefined} rng
   * @param {number} baseType
   * @param {number[]} [neededColors]
   * @param {number} [chance]
   * @returns {number}
   */
  function mercyRefillType(rng, baseType, neededColors, chance) {
    const rand = () => (typeof rng === 'function' ? rng() : Math.random());
    const needs = neededColors || [];
    if (needs.length && rand() < (chance == null ? 0.35 : chance)) {
      const pick = needs[Math.floor(rand() * needs.length)];
      if (pick != null) return pick;
    }
    return baseType;
  }

  // RNG determinístico (mulberry32) — mesma sequência para o mesmo seed.
  // Usado por buildGrid(lv.seed) para tabuleiros reproduzíveis por fase.
  /**
   * @param {number} seed
   * @returns {() => number}
   */
  function makeSeededRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Cálculo puro da regeneração de vidas por tempo decorrido.
  // Retorna o novo estado {lives, lifeRegenAt, changed} sem tocar no save.
  /**
   * @param {TBLifeSave|null|undefined} save
   * @param {number} now
   * @param {number|null|undefined} maxLives
   * @param {number} regenMs
   * @returns {{ lives: number, lifeRegenAt: number|null, changed: boolean }}
   */
  function computeLifeRegen(save, now, maxLives, regenMs) {
    const s = save || {};
    const max = maxLives == null ? 5 : maxLives;
    const lives = s.lives == null ? max : s.lives;
    if (lives >= max) {
      return { lives: max, lifeRegenAt: null, changed: s.lifeRegenAt != null };
    }
    if (s.lifeRegenAt == null) {
      return { lives, lifeRegenAt: now, changed: true };
    }
    const elapsed = now - s.lifeRegenAt;
    const regenCount = Math.floor(elapsed / regenMs);
    if (regenCount <= 0) {
      return { lives, lifeRegenAt: s.lifeRegenAt, changed: false };
    }
    const newLives = Math.min(max, lives + regenCount);
    const lifeRegenAt = newLives >= max ? null : s.lifeRegenAt + regenCount * regenMs;
    return { lives: newLives, lifeRegenAt, changed: true };
  }

  // Milissegundos até a próxima vida regenerar. Sem timer => intervalo cheio.
  /**
   * @param {number|null|undefined} lifeRegenAt
   * @param {number} now
   * @param {number} regenMs
   * @returns {number}
   */
  function msToNextLife(lifeRegenAt, now, regenMs) {
    if (lifeRegenAt == null) return regenMs;
    const elapsed = now - lifeRegenAt;
    return Math.max(0, regenMs - (((elapsed % regenMs) + regenMs) % regenMs));
  }

  // Sorteio puro de power-up ao concluir fase. rng() opcional (default Math.random).
  // < 2 estrelas nunca dá prêmio; 3 estrelas têm chance maior.
  /**
   * @param {number} stars
   * @param {(() => number)|undefined} [rng]
   * @returns {string|null}
   */
  function rollPowerUp(stars, rng) {
    if (stars < 2) return null;
    const rand = typeof rng === 'function' ? rng : Math.random;
    if (rand() > (stars === 3 ? 0.35 : 0.55)) return null;
    const options = ['bomb', 'rainbow', 'moves', 'shuffle'];
    return options[Math.floor(rand() * options.length)] || null;
  }

  // Formata milissegundos como m:ss (ex.: contagem regressiva de vidas).
  /**
   * @param {number} ms
   * @returns {string}
   */
  function formatMsClock(ms) {
    ms = Math.max(0, ms | 0);
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + String(sec).padStart(2, '0');
  }

  // Tempo restante de eventos: "2h 05m"
  /**
   * @param {number} ms
   * @returns {string}
   */
  function formatEvTime(ms) {
    ms = Math.max(0, ms | 0);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h + 'h ' + String(m).padStart(2, '0') + 'm';
  }

  // BCP-47 tag para toLocaleString a partir do código curto (pt/en/es).
  /**
   * @param {string} [lang]
   * @returns {string}
   */
  function localeTag(lang) {
    const code = String(lang || 'pt')
      .slice(0, 2)
      .toLowerCase();
    if (code === 'es') return 'es-ES';
    if (code === 'en') return 'en-US';
    return 'pt-BR';
  }

  // Dia de época UTC (milissegundos / 86400000).
  /**
   * @param {number} [now]
   * @returns {number}
   */
  function epochDay(now) {
    return Math.floor((now == null ? Date.now() : now) / 86400000);
  }

  // Chave de data local YYYY-MM-DD (calendário do dispositivo).
  /**
   * @param {Date|number|string} [date]
   * @returns {string}
   */
  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  /**
   * @param {Date|number|string} [date]
   * @returns {string}
   */
  function localYesterdayKey(date) {
    const d = date instanceof Date ? new Date(date.getTime()) : new Date(date || Date.now());
    d.setDate(d.getDate() - 1);
    return localDateKey(d);
  }

  // XP cumulativo para alcançar o nível (índice 0 = Nv.1).
  const LEVEL_XP = [
    0, 150, 400, 750, 1200, 1800, 2600, 3600, 5000, 7000, 9500, 12500, 16000, 20500, 26000,
  ];

  /**
   * @param {number} lvl
   * @returns {number}
   */
  function xpForLevel(lvl) {
    if (lvl <= 0) return 0;
    const idx = lvl - 1;
    if (idx < LEVEL_XP.length) return LEVEL_XP[idx];
    let base = LEVEL_XP[LEVEL_XP.length - 1];
    for (let i = LEVEL_XP.length; i < lvl; i++) base += 6000 + (i - 14) * 1500;
    return base;
  }

  // Nível atual + progresso na barra a partir do XP total.
  /**
   * @param {number} totalXP
   * @returns {TBXpLevelInfo}
   */
  function xpLevelInfo(totalXP) {
    const xp = Math.max(0, totalXP | 0);
    let lvl = 1;
    while (xpForLevel(lvl + 1) <= xp) lvl++;
    const curFloor = xpForLevel(lvl);
    const nextFloor = xpForLevel(lvl + 1);
    const needed = nextFloor - curFloor;
    const current = xp - curFloor;
    const pct = needed > 0 ? Math.round((current / needed) * 100) : 100;
    return { level: lvl, current, needed, pct };
  }

  // Parâmetros da fase do Modo Infinito: menos movimentos e alvo maior a cada
  // rodada. Puro e determinístico — a apresentação (nome/mundo) fica no shell.
  /**
   * @param {number} round
   * @returns {TBInfiniteParams}
   */
  function infiniteLevelParams(round) {
    const r = Math.max(1, round | 0);
    return {
      moves: Math.max(10, 20 - Math.floor((r - 1) / 5)),
      target: r * 1200,
    };
  }

  /**
   * @param {TBProgressSave} save
   * @param {number} levelIndex
   * @param {number} stars
   * @param {number} score
   * @returns {TBProgressSave}
   */
  function applyLevelComplete(save, levelIndex, stars, score) {
    const s = { ...save };
    const prev = s.unlocked ?? 0;
    s.unlocked = Math.max(prev, levelIndex + 1);
    s.stars = { ...(s.stars || {}) };
    s.stars[levelIndex] = Math.max(s.stars[levelIndex] ?? 0, stars);
    s.hs = Math.max(s.hs ?? 0, score);
    return s;
  }

  /** @type {any} */
  const api = {
    SCORE,
    calcGroupPts,
    comboMultiplier,
    calcStars,
    calcStarsMerit,
    getGroup,
    findValidMove,
    findLargestGroup,
    findMatchingGroups,
    findSmallestMove,
    hasMoves,
    checkObjectives,
    objectivesAvgProgress,
    objectivesMinProgress,
    isNearMiss,
    winChestTier,
    winXpGain,
    shouldLoseLife,
    applyLevelComplete,
    createMemSave,
    adjacentObstacleCells,
    mercyRefillType,
    makeSeededRng,
    computeLifeRegen,
    msToNextLife,
    rollPowerUp,
    infiniteLevelParams,
    formatMsClock,
    formatEvTime,
    localeTag,
    epochDay,
    localDateKey,
    localYesterdayKey,
    xpForLevel,
    xpLevelInfo,
    LEVEL_XP,
  };
  /** @type {any} */
  const g = global;
  g.TBLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
