// @ts-check
/**
 * Tile Blast — geração de tabuleiro, RNG, obstáculos, anti-azar de cores.
 * Isolado de tb-main; dependências via TBGrid.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBGridCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  let C = null;
  /** @type {(() => number)|null} */
  let _gameRng = null;

  /** @param {TBGridCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function setGameSeed(seed) {
    _gameRng = seed != null ? TBLogic.makeSeededRng(seed >>> 0) : null;
  }

  function _rand() {
    return _gameRng ? _gameRng() : Math.random();
  }

  const rnd = () => Math.floor(_rand() * C.TC);
  const mkB = (x, y, t, sp) => {
    if (sp === undefined) sp = C.SP.NONE;
    const px = x * C.CELL,
      py = y * C.CELL;
    return { type: t, sp, x, y, vx: px, vy: py, afy: py, aty: py, as: 0, ad: 0 };
  };
  const ok = (x, y) => x >= 0 && x < C.GW && y >= 0 && y < C.GH;

  function buildGrid(seed) {
    if (seed != null) setGameSeed(seed);
    C.grid = [];
    C.pops = [];
    for (let x = 0; x < C.GW; x++) {
      const c = [];
      for (let y = 0; y < C.GH; y++) c.push(mkB(x, y, rnd()));
      C.grid.push(c);
    }
    placeObstacles();
    ensureColorSupply();
    let a = 0;
    while (!C.hasMoves() && a++ < 20) C.shuffleTypes();
    C.kbFocus = { x: 0, y: 0, active: false };
    C.requestDraw();
  }

  function _spread() {
    const cols = [...Array(C.GW).keys()];
    cols.sort((a, b) => {
      const ra = ((a * 2654435761) >>> 0) % C.GW,
        rb = ((b * 2654435761) >>> 0) % C.GW;
      return ra - rb;
    });
    return cols;
  }

  function orderedCells(pattern) {
    const cells = [];
    if (pattern === 'band') {
      const cy = 2 + Math.floor(_rand() * Math.max(1, C.GH - 4));
      for (let d = 0; d < C.GH; d++)
        for (const yy of [cy - d, cy + d]) {
          if (yy < 0 || yy >= C.GH) continue;
          for (let x = 0; x < C.GW; x++) cells.push([x, yy]);
        }
    } else if (pattern === 'wall') {
      for (let y = C.GH - 1; y >= 0; y--) for (let x = 0; x < C.GW; x++) cells.push([x, y]);
    } else if (pattern === 'top') {
      const cols = _spread();
      for (let y = 0; y < C.GH; y++) for (const x of cols) cells.push([x, y]);
    } else if (pattern === 'lake') {
      const cx = 1 + Math.floor(_rand() * (C.GW - 2)),
        cy = Math.floor(C.GH / 2) + Math.floor(_rand() * (C.GH / 2));
      const all = [];
      for (let x = 0; x < C.GW; x++) for (let y = 0; y < C.GH; y++) all.push([x, y]);
      all.sort(
        (a, b) =>
          Math.abs(a[0] - cx) + Math.abs(a[1] - cy) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy))
      );
      return all;
    } else {
      const all = [];
      for (let x = 0; x < C.GW; x++) for (let y = 0; y < C.GH; y++) all.push([x, y]);
      for (let i = all.length - 1; i > 0; i--) {
        const k = Math.floor(_rand() * (i + 1));
        [all[i], all[k]] = [all[k], all[i]];
      }
      return all;
    }
    return cells;
  }

  function placeObstacles() {
    C.coverGrid = null;
    const lv = C._lv();
    const objs = lv.objectives || [];
    const setup = lv.setup || {};
    const pat = lv.pattern || {};
    const placeable = (x, y) => {
      const b = C.grid[x][y];
      return b && b.sp === C.SP.NONE && !C.isBlocked(b);
    };
    const fill = (pattern, n, apply) => {
      const order = orderedCells(pattern);
      let done = 0;
      for (const [x, y] of order) {
        if (done >= n) break;
        if (placeable(x, y)) {
          apply(x, y);
          done++;
        }
      }
    };
    for (const o of objs) {
      if (o.type === 'ice') {
        const hp = setup.iceHp || 1;
        fill(pat.ice || 'band', o.target, (x, y) => {
          C.grid[x][y].ice = hp;
        });
      } else if (o.type === 'crate') {
        const hp = setup.crateHp || 1;
        fill(pat.crate || 'wall', o.target, (x, y) => {
          C.grid[x][y].crate = hp;
        });
      } else if (o.type === 'collect') {
        fill(pat.collect || 'top', o.target, (x, y) => {
          C.grid[x][y].collect = true;
        });
      } else if (o.type === 'chain') {
        const hp = setup.chainHp || 1;
        fill(pat.chain || 'scatter', o.target, (x, y) => {
          C.grid[x][y].chain = hp;
        });
      } else if (o.type === 'cover') {
        C.coverGrid = Array.from({ length: C.GW }, () => Array.from({ length: C.GH }, () => false));
        fill(pat.cover || 'lake', o.target, (x, y) => {
          C.coverGrid[x][y] = true;
        });
      }
    }
  }

  function ensureColorSupply() {
    const lv = C._lv();
    const objs = lv.objectives || [];
    for (const o of objs) {
      if (o.type !== 'color') continue;
      let cnt = 0;
      for (let x = 0; x < C.GW; x++)
        for (let y = 0; y < C.GH; y++) {
          const b = C.grid[x][y];
          if (b && b.sp === C.SP.NONE && !C.isBlocked(b) && b.type === o.color) cnt++;
        }
      const want = Math.min(o.target, 10);
      if (cnt >= want) continue;
      const free = [];
      for (let x = 0; x < C.GW; x++)
        for (let y = 0; y < C.GH; y++) {
          const b = C.grid[x][y];
          if (b && b.sp === C.SP.NONE && !C.isBlocked(b) && b.type !== o.color) free.push([x, y]);
        }
      for (let i = free.length - 1; i > 0; i--) {
        const k = Math.floor(_rand() * (i + 1));
        [free[i], free[k]] = [free[k], free[i]];
      }
      for (let i = 0; i < free.length && cnt < want; i++) {
        const [x, y] = free[i];
        C.grid[x][y].type = o.color;
        cnt++;
      }
    }
  }

  /** @type {any} */
  const api = {
    init,
    setGameSeed,
    _rand,
    rnd,
    mkB,
    ok,
    buildGrid,
    _spread,
    orderedCells,
    placeObstacles,
    ensureColorSupply,
  };

  /** @type {any} */
  const g = global;
  g.setGameSeed = setGameSeed;
  g._rand = _rand;
  g.rnd = rnd;
  g.mkB = mkB;
  g.ok = ok;
  g.buildGrid = buildGrid;
  g._spread = _spread;
  g.orderedCells = orderedCells;
  g.placeObstacles = placeObstacles;
  g.ensureColorSupply = ensureColorSupply;
  g.TBGrid = api;
})(typeof window !== 'undefined' ? window : globalThis);
