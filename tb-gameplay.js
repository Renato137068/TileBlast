// @ts-check
/**
 * Tile Blast — motor de jogabilidade (grupos, clique, especiais, obstáculos, PU,
 * gravidade + cascata automática pós-queda). Isolado de tb-main; dependências via TBGameplay.init(cfg).
 *
 * @typedef {Record<string, any>} TBGameplayCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBState = global.TBState;
  /** @type {any} */
  const TBLogic = global.TBLogic;
  /** @type {any} */
  const TBJuice = global.TBJuice;
  /** @type {any} */
  const TBFeatures = global.TBFeatures;
  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBAnalytics = global.TBAnalytics;

  /** @type {any} */
  let C = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let _idleHintTimer = null;
  const IDLE_HINT_MS = 7500;

  /**
   * @param {TBGameplayCfg|null|undefined} cfg
   * @returns {void}
   */
  function init(cfg) {
    C = cfg || null;
    if (C) C.hintCells = C.hintCells || new Set();
  }

  function clearIdleHint() {
    if (_idleHintTimer) {
      clearTimeout(_idleHintTimer);
      _idleHintTimer = null;
    }
    if (C && C.hintCells && C.hintCells.size) {
      C.hintCells.clear();
      C.requestDraw && C.requestDraw();
    }
  }

  function noteActivity() {
    clearIdleHint();
    if (!C || C.over || C.busy) return;
    _idleHintTimer = setTimeout(showIdleHint, IDLE_HINT_MS);
  }

  function showIdleHint() {
    _idleHintTimer = null;
    if (!C || C.over || C.busy || !C.sGame || !C.sGame.classList.contains('active')) return;
    if (C._reduceMotion && C._reduceMotion()) return;
    // Prefere o maior grupo; senão qualquer jogada válida
    const grp =
      TBLogic.findLargestGroup != null
        ? TBLogic.findLargestGroup(C.grid, C.GW, C.GH, C.SP.NONE, 2)
        : null;
    let cells = grp;
    if (!cells || !cells.length) {
      const mv = TBLogic.findValidMove(C.grid, C.GW, C.GH, C.SP.NONE);
      if (!mv) return;
      cells = getGroup(mv.x, mv.y);
    }
    if (!cells || cells.length < 2) return;
    C.hintCells = new Set(cells.map(([x, y]) => x + ',' + y));
    C.requestDraw();
    // Reagenda para manter a dica viva / trocar grupo
    _idleHintTimer = setTimeout(() => {
      clearIdleHint();
      noteActivity();
    }, 4500);
  }

  // FLOOD FILL
  // ═══════════════════════════════════════════════════════════════
  const isBlocked = (b) => !!(b && (b.ice > 0 || b.chain > 0 || b.crate > 0 || b.collect));
  function getGroup(sx, sy) {
    if (!C.ok(sx, sy) || !C.grid[sx][sy]) return [];
    const t = C.grid[sx][sy].type,
      vis = new Set(),
      stk = [[sx, sy]],
      g = [];
    if (C.grid[sx][sy].sp !== C.SP.NONE || isBlocked(C.grid[sx][sy])) return [];
    while (stk.length) {
      const [x, y] = stk.pop(),
        k = x + ',' + y;
      if (vis.has(k) || !C.ok(x, y)) continue;
      const b = C.grid[x][y];
      if (!b || b.sp !== C.SP.NONE || b.type !== t || isBlocked(b)) continue;
      vis.add(k);
      g.push([x, y]);
      stk.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return g;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLICK
  // ═══════════════════════════════════════════════════════════════
  function handleClick(gx, gy) {
    if (!C) return;
    if (C.busy || C.over || !C.ok(gx, gy)) return;
    const b = C.grid[gx][gy];
    if (!b) return;
    clearIdleHint();
    if (C.pendingPU !== '') {
      executePU(gx, gy, C.pendingPU);
      C.pendingPU = '';
      C.canvas.classList.remove('targeting');
      document.querySelectorAll('.pu-btn').forEach((b) => b.classList.remove('targeting'));
      return;
    }
    if (b.sp !== C.SP.NONE) {
      if (typeof TBAnalytics !== 'undefined' && TBAnalytics.logFirstMove) {
        TBAnalytics.logFirstMove({ level: TBState.lvIdx + 1, via: 'special' });
      }
      C.busy = true;
      activateSpecial(gx, gy, b.sp);
      return;
    }
    const g = getGroup(gx, gy);
    if (g.length < 2) {
      shakeBlock(gx, gy);
      noteActivity();
      return;
    }
    if (typeof TBAnalytics !== 'undefined' && TBAnalytics.logFirstMove) {
      TBAnalytics.logFirstMove({ level: TBState.lvIdx + 1, via: 'group', size: g.length });
    }
    C.dismissCoachHint();
    if (TBRoadmap) TBRoadmap.clearBoardTutorialHighlight();
    C.busy = true;
    C.hoverCells = new Set();
    C.hoverSz = 0;
    removeGroup(g);
    setTimeout(() => settleBoard(afterMove), 200);
  }

  function afterMove() {
    if (TBState.isDailyPuzzleMode) {
      if (C.movesLeft <= 0) {
        C.resolveDailyPuzzleEnd();
        return;
      }
      C.busy = false;
      if (!hasMoves()) {
        showNoMv();
        setTimeout(reshuffleBoard, 600);
      }
      noteActivity();
      return;
    }
    if (C.checkWin()) {
      C.resolveWin();
      return;
    }
    C.movesLeft--;
    C.updateHUD();
    if (C.movesLeft > 0 && C.movesLeft <= 3) C.Sound.tension(4 - C.movesLeft);
    if (C.movesLeft <= 0) {
      C.resolveLoss();
      return;
    }
    C.busy = false;
    if (!hasMoves()) {
      showNoMv();
      setTimeout(reshuffleBoard, 600);
    }
    noteActivity();
  }

  // ═══════════════════════════════════════════════════════════════
  // REMOVE GROUP
  // ═══════════════════════════════════════════════════════════════
  function removeGroup(grp, opts) {
    opts = opts || {};
    const cascade = !!opts.cascade;
    const scoreMult = cascade ? (C.CASCADE_SCORE_MULT != null ? C.CASCADE_SCORE_MULT : 0.5) : 1;
    const now = performance.now();
    const fcx = grp.reduce((a, [x]) => a + x, 0) / grp.length;
    const fcy = grp.reduce((a, [, y]) => a + y, 0) / grp.length;
    let best = grp[0],
      bestD = Infinity;
    for (const p of grp) {
      const d = Math.hypot(p[0] - fcx, p[1] - fcy);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const [cx, cy] = best;
    const gtype = C.grid[grp[0][0]][grp[0][1]].type;
    const cnt = grp.length;
    if (TBRoadmap && !cascade) {
      const s = C.ld();
      s.stats = s.stats || {};
      if (cnt > (s.stats.maxCombo || 0)) {
        s.stats.maxCombo = cnt;
        C.sv(s);
      }
    }
    const color = C.COLORS[gtype % C.COLORS.length];
    C.spawnParticles(grp, color);
    // Juice escalonado por tamanho do grupo (combo): 2→brilho, 4→explosão média,
    // 6→explosão grande, 8+→épico (shockwave + hit-stop + flash de tela).
    // Cascata: juice mais leve (sem hit-stop/flash).
    if (TBJuice) {
      const jx = cx * C.CELL + C.CELL / 2,
        jy = cy * C.CELL + C.CELL / 2;
      const inten = Math.max(0, Math.min(1, (cnt - 2) / 10));
      TBJuice.burst(jx, jy, { color, intensity: (0.25 + inten * 0.75) * (cascade ? 0.55 : 1) });
      if (!cascade && cnt >= C.BOMB_T)
        TBJuice.shockwave(jx, jy, { color: C.litHex(color, 0.45), intensity: inten });
      if (!cascade && cnt >= C.ROCKET_T) TBJuice.hitStop(cnt >= C.RAINBOW_T ? 48 : 30);
      if (!cascade && cnt >= C.RAINBOW_T) TBJuice.flash(C.litHex(color, 0.6), 0.16, 240);
    }
    const pts = Math.round(C.calcGroupPts(cnt) * scoreMult);
    const floaterTier = cascade ? 0 : cnt >= C.CHT ? 2 : cnt >= C.CMT ? 1 : 0;
    C.spawnFloater(`+${pts}`, cx, cy, color, { big: !cascade && cnt >= 5, tier: floaterTier });
    // Cascata não cria especiais — recompensa de especial fica na jogada manual
    const sp = cascade
      ? C.SP.NONE
      : cnt >= C.RAINBOW_T
        ? C.SP.RAINBOW
        : cnt >= C.ROCKET_T
          ? C.SP.ROCKET
          : cnt >= C.BOMB_T
            ? C.SP.BOMB
            : C.SP.NONE;
    if (sp !== C.SP.NONE) {
      const spLabel = sp === C.SP.RAINBOW ? '🌈' : sp === C.SP.ROCKET ? '🚀' : '💣';
      C.floaters.push({
        text: spLabel,
        cx: cx * C.CELL + C.CELL / 2,
        cy: (cy - 1) * C.CELL + C.CELL / 2,
        color: '#fff',
        start: performance.now() + 150,
        dur: 700,
      });
    }
    for (const [x, y] of grp) {
      const b = C.grid[x][y];
      if (b) {
        b.popStart = now;
        C.pops.push(b);
      }
      C.grid[x][y] = null;
    }
    // Obstáculos (#1): limpa cobertura sob o grupo e danifica gelo/caixa/corrente adjacentes.
    for (const [x, y] of grp) clearCoverAt(x, y);
    damageAdjacentObstacles(grp);
    if (cascade) {
      // Cascata: pontos reduzidos, sem multiplicador de combo / XP de combo
      // (som próprio disparado em tryAutoCascade com pitch por profundidade)
      const ev = C.getActiveEvent();
      C.score += Math.round(cnt * C.PPB * scoreMult * (ev.scoreMult || 1));
      if (gtype >= 0) {
        const lv = C._lv();
        const obj = lv.objectives.find((o) => o.type === 'color' && o.color === gtype);
        if (obj && C.colorProgress[gtype] !== undefined)
          C.colorProgress[gtype] = Math.min((C.colorProgress[gtype] || 0) + cnt, obj.target);
      }
      C.updateHUD();
    } else {
      addScore(cnt, gtype);
    }
    // Missões: blocos explodidos e cor
    C.updateMissionProgress('blocks_popped', cnt);
    C.updateMissionProgress('color_popped', cnt, gtype);
    C.updateChallengeProgress('blocks_popped', cnt);
    C.updateChallengeProgress('color_popped', cnt, gtype);
    if (sp !== C.SP.NONE && C.ok(cx, cy) && !C.grid[cx][cy]) {
      const nb = C.mkB(cx, cy, gtype, sp);
      C.grid[cx][cy] = nb;
      nb._bornAt = performance.now();
      nb._bornDur = 220;
      // Missão: tile especial criado
      C.updateMissionProgress('specials_made', 1);
      C.updateChallengeProgress('specials_made', 1);
    }
    C.requestDraw();
  }

  // ═══════════════════════════════════════════════════════════════
  // ADD SCORE
  // ═══════════════════════════════════════════════════════════════
  function addScore(n, blockType = -1) {
    const ev = C.getActiveEvent();
    const m = TBLogic.comboMultiplier(n, ev);
    C.score += Math.round(n * C.PPB * m * (ev.scoreMult || 1));
    if (m > 1) {
      C.Sound.comboStep(n >= C.CHT ? 4 : n >= C.CMT ? 2 : 1);
      C.Haptic.combo(n);
      C.triggerShake(m >= C.CHM ? 6 : 3, 220);
      const el = document.getElementById('combo');
      const tier =
        m >= C.CHM ? C._t('combo_ultra', 'ULTRA') : m >= C.CMM ? C._t('combo_mega', 'MEGA') : '';
      const label = C._t('combo_label', 'Combo ×{m}! +{n}')
        .replace('{m}', m.toFixed(1))
        .replace('{n}', String(n));
      el.textContent = tier ? `🔥 ${tier} ${label}` : `🔥 ${label}`;
      el.classList.remove('combo-active', 'combo-mega', 'combo-ultra');
      if (m >= C.CHM) el.classList.add('combo-ultra');
      else if (m >= C.CMM) el.classList.add('combo-mega');
      void el.offsetWidth;
      el.classList.add('combo-active');
      clearTimeout(C.comboTimer);
      C.comboTimer = setTimeout(() => {
        el.classList.remove('combo-active');
      }, 900);
      // Missão: combo feito
      C.updateMissionProgress('combos_made', 1);
      C.updateChallengeProgress('combos_made', 1);
      C.addXP(C.XP_DEFS.combo);
    } else {
      C.Sound.blast(n);
    }
    if (blockType >= 0) {
      const lv = C._lv();
      const obj = lv.objectives.find((o) => o.type === 'color' && o.color === blockType);
      if (obj && C.colorProgress[blockType] !== undefined)
        C.colorProgress[blockType] = Math.min((C.colorProgress[blockType] || 0) + n, obj.target);
    }
    C.updateHUD();
  }

  // ═══════════════════════════════════════════════════════════════
  // SPECIALS
  // ═══════════════════════════════════════════════════════════════
  // Reação em cadeia (#4/#8): coleta todas as células a destruir, expandindo por
  // qualquer especial atingido no caminho. Retorna {cells:[[x,y]...], chain:int}.
  function gatherBlast(sx, sy, sp) {
    const cells = new Set();
    const queue = [[sx, sy, sp, false]];
    let chain = 0,
      rainbows = 0;
    const add = (tx, ty) => {
      if (C.ok(tx, ty) && C.grid[tx][ty]) cells.add(tx + ',' + ty);
    };
    const seenSpecials = new Set([sx + ',' + sy]);
    while (queue.length) {
      const [cx, cy, csp, chained] = queue.pop();
      chain++;
      add(cx, cy);
      if (csp === C.SP.RAINBOW) rainbows++;
      let tg = [];
      if (csp === C.SP.BOMB) tg = chained ? bomb5Targets(cx, cy) : bombTargets(cx, cy);
      else if (csp === C.SP.ROCKET) tg = chained ? crossTargets(cx, cy) : rocketTargets(cx, cy);
      else if (csp === C.SP.RAINBOW) {
        tg = /** @type {any[]} */ (rainbowTargets()[0]);
      }
      for (const [tx, ty] of tg) {
        add(tx, ty);
        const nb = C.grid[tx][ty];
        const key = tx + ',' + ty;
        if (nb && nb.sp !== C.SP.NONE && !seenSpecials.has(key)) {
          seenSpecials.add(key);
          queue.push([tx, ty, nb.sp, true]);
        }
      }
    }
    if (rainbows >= 2) {
      for (let x = 0; x < C.GW; x++)
        for (let y = 0; y < C.GH; y++) if (C.grid[x][y]) cells.add(x + ',' + y);
    }
    return { cells: [...cells].map((k) => k.split(',').map(Number)), chain };
  }

  function activateSpecial(x, y, sp) {
    C.Sound.special();
    const now = performance.now();
    const res = gatherBlast(x, y, sp);
    const cells = res.cells;
    const isCombo = res.chain >= 2;
    C.triggerShake(isCombo ? 16 : sp === C.SP.RAINBOW ? 12 : 8, isCombo ? 480 : 350);
    if (isCombo && C.Haptic && C.Haptic.combo) C.Haptic.combo(cells.length);
    const spColor =
      sp === C.SP.BOMB
        ? '#ff8844'
        : sp === C.SP.ROCKET
          ? '#44aaff'
          : sp === C.SP.RAINBOW
            ? '#ff44ff'
            : '#ffd23e';
    // Contabiliza objetivos (cor + obstáculos + coleta) e limpa cobertura.
    trackDestroyed(cells);
    C.spawnParticles(cells, spColor);
    C.spawnFloater(`+${cells.length}`, x, y, spColor, { big: true, tier: 2 });
    // Explosão do especial: shockwave + faíscas + hit-stop (mais forte em cadeia).
    if (TBJuice) {
      const jx = x * C.CELL + C.CELL / 2,
        jy = y * C.CELL + C.CELL / 2;
      const inten = isCombo ? 1 : sp === C.SP.RAINBOW ? 0.9 : 0.7;
      TBJuice.shockwave(jx, jy, { color: spColor, intensity: inten, radius: C.CELL * 3 });
      TBJuice.burst(jx, jy, { color: spColor, intensity: inten });
      TBJuice.hitStop(isCombo ? 60 : 40);
      if (isCombo || sp === C.SP.RAINBOW) TBJuice.flash(spColor, 0.18, 260);
    }
    if (isCombo) showComboBurst(res.chain, cells.length);
    for (const [tx, ty] of cells) {
      const tb = C.grid[tx][ty];
      if (tb) {
        tb.popStart = now;
        C.pops.push(tb);
      }
      C.grid[tx][ty] = null;
    }
    addScore(cells.length, -1);
    C.requestDraw();
    setTimeout(() => {
      settleBoard(() => {
        if (C.checkWin()) {
          C.resolveWin();
          return;
        }
        C.movesLeft--;
        C.updateHUD();
        if (C.movesLeft <= 0) {
          C.resolveLoss();
          return;
        }
        C.busy = false;
        if (!hasMoves()) {
          showNoMv();
          setTimeout(reshuffleBoard, 600);
        }
      });
    }, 200);
  }

  const bombTargets = (cx, cy) => {
    const t = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const nx = cx + dx,
          ny = cy + dy;
        if (C.ok(nx, ny) && C.grid[nx][ny]) t.push([nx, ny]);
      }
    return t;
  };
  const rocketTargets = (cx, cy) => {
    const t = [];
    for (let x = 0; x < C.GW; x++) if (C.grid[x][cy]) t.push([x, cy]);
    return t;
  };
  const rainbowTargets = () => {
    const freq = {};
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) {
        const b = C.grid[x][y];
        if (b && b.sp === C.SP.NONE) freq[b.type] = (freq[b.type] || 0) + 1;
      }
    let best = -1,
      bv = 0;
    for (const k in freq)
      if (freq[k] > bv) {
        bv = freq[k];
        best = +k;
      }
    const t = [];
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) if (C.grid[x][y] && C.grid[x][y].type === best) t.push([x, y]);
    return [t, best];
  };
  // Alvos ampliados quando o especial é acionado em cadeia (espetáculo #8).
  const bomb5Targets = (cx, cy) => {
    const t = [];
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++) {
        const nx = cx + dx,
          ny = cy + dy;
        if (C.ok(nx, ny) && C.grid[nx][ny]) t.push([nx, ny]);
      }
    return t;
  };
  const crossTargets = (cx, cy) => {
    const t = [];
    for (let x = 0; x < C.GW; x++) if (C.grid[x][cy]) t.push([x, cy]);
    for (let y = 0; y < C.GH; y++) if (C.grid[cx][y]) t.push([cx, y]);
    return t;
  };

  // ═══════════════════════════════════════════════════════════════
  // OBSTÁCULOS — dano, cobertura, coleta (#1)
  // ═══════════════════════════════════════════════════════════════
  function bumpObs(type, n = 1) {
    const lv = C._lv();
    const obj = (lv.objectives || []).find((o) => o.type === type);
    if (!obj) return;
    C.obsProgress[type] = Math.min((C.obsProgress[type] || 0) + n, obj.target);
  }
  function clearCoverAt(x, y) {
    if (C.coverGrid && C.coverGrid[x] && C.coverGrid[x][y]) {
      C.coverGrid[x][y] = false;
      bumpObs('cover', 1);
      if (C.Sound && C.Sound.coverClear) {
        const now = performance.now();
        if (!C._lastCoverSfx || now - C._lastCoverSfx > 70) {
          C._lastCoverSfx = now;
          C.Sound.coverClear();
        }
      }
    }
  }
  // Contabiliza tudo que foi destruído numa jogada: cor, gelo/caixa/coleta e cobertura.
  function trackDestroyed(cells) {
    const lv = C._lv();
    for (const [x, y] of cells) {
      const b = C.grid[x] && C.grid[x][y];
      clearCoverAt(x, y);
      if (!b) continue;
      if (b.ice > 0) {
        bumpObs('ice', 1);
        continue;
      }
      if (b.crate > 0) {
        bumpObs('crate', 1);
        continue;
      }
      if (b.collect) {
        bumpObs('collect', 1);
        continue;
      }
      if (b.chain > 0) {
        bumpObs('chain', 1);
        continue;
      }
      if (b.sp === C.SP.NONE && b.type >= 0) {
        const colorObj = (lv.objectives || []).find(
          (o) => o.type === 'color' && o.color === b.type
        );
        if (colorObj && C.colorProgress[b.type] !== undefined)
          C.colorProgress[b.type] = Math.min((C.colorProgress[b.type] || 0) + 1, colorObj.target);
      }
    }
  }
  // Dano de adjacência: gelo/corrente/caixa vizinhos a células explodidas cedem 1 de vida.
  function damageAdjacentObstacles(popped) {
    const hits = TBLogic.adjacentObstacleCells(popped, C.grid, C.GW, C.GH);
    for (const { x, y } of hits) {
      const b = C.grid[x][y];
      if (!b) continue;
      if (b.ice > 0) {
        b.ice--;
        b._hitAt = performance.now();
        if (b.ice <= 0) {
          bumpObs('ice', 1);
          b._thawAt = performance.now();
          C.Sound.iceBreak();
        } else if (C.Sound.iceChip) {
          C.Sound.iceChip();
        }
      } else if (b.chain > 0) {
        b.chain--;
        b._hitAt = performance.now();
        if (b.chain <= 0) {
          bumpObs('chain', 1);
          C.Sound.chainBreak();
        } else if (C.Sound.chainRattle) {
          C.Sound.chainRattle();
        }
      } else if (b.crate > 0) {
        b.crate--;
        b._hitAt = performance.now();
        if (b.crate <= 0) {
          bumpObs('crate', 1);
          C.grid[x][y] = null;
          C.Sound.crateBreak();
        } else if (C.Sound.crateHit) {
          C.Sound.crateHit();
        }
      }
    }
  }
  // Coleta itens que chegaram à base após a gravidade; repete a gravidade se coletou.
  function collectBottomTokens() {
    let any = false;
    for (let x = 0; x < C.GW; x++) {
      const b = C.grid[x][C.GH - 1];
      if (b && b.collect) {
        bumpObs('collect', 1);
        b.popStart = performance.now();
        C.pops.push(b);
        C.grid[x][C.GH - 1] = null;
        any = true;
        C.Sound.collect();
        C.spawnFloater('🍒', x, C.GH - 1, '#ff5b7a');
      }
    }
    return any;
  }
  /**
   * Gravidade + tokens + cascata balanceada: só grupos ≥ CASCADE_MIN,
   * um grupo (o maior) por passo, sem especiais, pontuação reduzida —
   * até CASCADE_MAX. Especiais nunca disparam sozinhos.
   * @param {() => void} after
   * @param {number} [cascadeDepth]
   */
  function settleBoard(after, cascadeDepth) {
    const depth = cascadeDepth || 0;
    applyGravity();
    setTimeout(() => {
      if (collectBottomTokens()) {
        applyGravity();
        setTimeout(() => tryAutoCascade(after, depth), 280);
      } else {
        tryAutoCascade(after, depth);
      }
    }, 320);
  }

  /**
   * @param {() => void} after
   * @param {number} depth
   */
  function tryAutoCascade(after, depth) {
    const max = (C.CASCADE_MAX != null ? C.CASCADE_MAX : 3) | 0;
    const min = (C.CASCADE_MIN != null ? C.CASCADE_MIN : 3) | 0;
    if (depth >= max) {
      after();
      return;
    }
    // Um grupo por passo (o maior) — evita derreter o tabuleiro de uma vez
    const grp =
      TBLogic.findLargestGroup != null
        ? TBLogic.findLargestGroup(C.grid, C.GW, C.GH, C.SP.NONE, min)
        : null;
    if (!grp || grp.length < min) {
      after();
      return;
    }
    C.busy = true;
    showComboBurst(depth + 2, grp.length);
    if (C.Sound && typeof C.Sound.cascade === 'function') C.Sound.cascade(depth + 1, grp.length);
    removeGroup(grp, { cascade: true });
    setTimeout(() => settleBoard(after, depth + 1), 200);
  }
  function showComboBurst(chain, cnt) {
    const el = document.getElementById('combo');
    if (!el) return;
    el.textContent = `💥 COMBO ×${chain}! +${cnt}`;
    el.classList.remove('combo-active', 'combo-mega', 'combo-ultra');
    void el.offsetWidth;
    el.classList.add('combo-active', 'combo-ultra');
    clearTimeout(C.comboTimer);
    C.comboTimer = setTimeout(() => el.classList.remove('combo-active'), 1000);
  }

  // ═══════════════════════════════════════════════════════════════
  // POWER-UPS
  // ═══════════════════════════════════════════════════════════════
  // Longpress tooltip element
  let _puTipEl = null;
  function _showPUTip(btn, desc) {
    _hidePUTip();
    _puTipEl = document.createElement('div');
    _puTipEl.textContent = desc;
    Object.assign(_puTipEl.style, {
      position: 'fixed',
      background: 'rgba(17,19,28,.95)',
      color: '#f1f2f6',
      fontSize: '12px',
      padding: '5px 10px',
      borderRadius: '8px',
      border: '1px solid rgba(246,178,62,.4)',
      pointerEvents: 'none',
      zIndex: '9999',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(0,0,0,.4)',
    });
    document.body.appendChild(_puTipEl);
    const r = btn.getBoundingClientRect();
    _puTipEl.style.left = `${r.left + r.width / 2 - _puTipEl.offsetWidth / 2}px`;
    _puTipEl.style.top = `${r.top - _puTipEl.offsetHeight - 6}px`;
  }
  function _hidePUTip() {
    if (_puTipEl) {
      _puTipEl.remove();
      _puTipEl = null;
    }
  }

  /** Ícone SVG custom por power-up (substitui emoji — render consistente e
   * coeso em qualquer Android). Fallback: o próprio label (ex.: "+5"). */
  function _puIconHTML(id, label) {
    const svg = {
      bomb: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="11" cy="15" r="7" fill="#2b3350"/><ellipse cx="8.6" cy="12.6" rx="2.2" ry="1.3" fill="#5b6690" opacity=".65"/><path d="M15 8.5 Q18.5 6.5 18.5 3.2" stroke="#8a6a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="18.5" cy="3.2" r="2.3" fill="#ffb14a"/><circle cx="18.5" cy="3.2" r="1" fill="#fff3c4"/></svg>`,
      rainbow: `<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="none" stroke-width="2.4" stroke-linecap="round"><path d="M4 18 A8 8 0 0 1 20 18" stroke="#ef4b5f"/><path d="M6.4 18 A5.6 5.6 0 0 1 17.6 18" stroke="#f6c945"/><path d="M8.8 18 A3.2 3.2 0 0 1 15.2 18" stroke="#4ecb71"/></svg>`,
      shuffle: `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="#cdd6ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5l10 10H20"/><path d="M16.5 3.5 20 7l-3.5 3.5"/><path d="M3 17h3.5l2.6-2.6"/><path d="M14 9.6 16.5 7"/></svg>`,
    };
    return svg[id] || `<span class="pu-txt">${label}</span>`;
  }

  function buildPUBar() {
    const bar = document.getElementById('pu-bar');
    bar.innerHTML = '';
    C.PU_DEFS.forEach(({ id, label, desc }) => {
      const col = document.createElement('div');
      col.className = 'pu-col';
      const btn = document.createElement('button');
      btn.id = `pub-${id}`;
      btn.className = 'pu-btn';
      btn.dataset.pu = id;
      btn.innerHTML = _puIconHTML(id, label);
      btn.addEventListener('click', () => tapPU(id));
      // Longpress tooltip
      let lpTimer = null;
      btn.addEventListener('pointerdown', () => {
        lpTimer = setTimeout(() => _showPUTip(btn, desc), 500);
      });
      btn.addEventListener('pointerup', () => {
        clearTimeout(lpTimer);
        setTimeout(_hidePUTip, 800);
      });
      btn.addEventListener('pointerleave', () => {
        clearTimeout(lpTimer);
        _hidePUTip();
      });
      col.appendChild(btn);
      col.insertAdjacentHTML(
        'beforeend',
        `<span class="pu-desc">${desc}</span><span id="puc-${id}" class="pu-cnt">0</span>`
      );
      bar.appendChild(col);
    });
    refreshPUBar();
  }

  function refreshPUBar() {
    C.PU_DEFS.forEach(({ id }) => {
      const c = C.getPUCount(id);
      const cnt = document.getElementById(`puc-${id}`);
      // "+" quando vazio (convida a adquirir, estilo Toy Blast) em vez de "0"
      // de placeholder; o badge também muda de cor via classe pu-cnt--empty.
      if (cnt) {
        cnt.textContent = c > 0 ? String(c) : '+';
        cnt.classList.toggle('pu-cnt--empty', c <= 0);
      }
      const btn = document.getElementById(`pub-${id}`);
      if (btn) {
        /** @type {any} */ (btn).disabled = c <= 0;
        btn.classList.toggle('pu-ready', c > 0);
      }
    });
  }

  function tapPU(id) {
    if (C.busy || C.over) return;
    if (!C.usePU(id)) {
      refreshPUBar();
      return;
    }
    C.Sound.click();
    C.updateMissionProgress('powerups_used', 1);
    C._levelPuUsed = (C._levelPuUsed || 0) + 1;
    if (typeof TBAnalytics !== 'undefined' && TBAnalytics.log) {
      TBAnalytics.log('powerup_used', {
        id,
        level: TBState.lvIdx + 1,
        mastery: !!TBState.isMasteryMode,
      });
    }
    document.querySelectorAll('.pu-btn').forEach((b) => b.classList.remove('targeting'));
    if (id === 'moves') {
      C.movesLeft += 5;
      C.updateHUD();
      refreshPUBar();
      return;
    }
    if (id === 'shuffle') {
      C.busy = true;
      reshuffleBoard();
      C.busy = false;
      refreshPUBar();
      return;
    }
    C.pendingPU = id;
    C.canvas.classList.add('targeting');
    const btn = document.getElementById(`pub-${id}`);
    if (btn) btn.classList.add('targeting');
    refreshPUBar();
  }

  function executePU(gx, gy, pu) {
    C.busy = true;
    C.Sound.special();
    C.triggerShake(8, 300);
    const now = performance.now();
    let targets = [],
      emitType = -1;
    if (pu === 'bomb') targets = bombTargets(gx, gy);
    else {
      const r = rainbowTargets();
      targets = /** @type {any[]} */ (r[0]);
      emitType = /** @type {number} */ (r[1]);
    }
    const puColor = pu === 'bomb' ? '#ff8844' : '#ff44ff';
    C.spawnParticles(targets, puColor);
    C.spawnFloater(`+${targets.length}`, gx, gy, puColor);
    // Booster: explosão dedicada (shockwave + faíscas + hit-stop + flash).
    if (TBJuice) {
      const jx = gx * C.CELL + C.CELL / 2,
        jy = gy * C.CELL + C.CELL / 2;
      TBJuice.shockwave(jx, jy, { color: puColor, intensity: 0.85, radius: C.CELL * 3 });
      TBJuice.burst(jx, jy, { color: puColor, intensity: 0.9 });
      TBJuice.hitStop(45);
      TBJuice.flash(puColor, 0.16, 240);
    }
    trackDestroyed(targets);
    for (const [tx, ty] of targets) {
      const b = C.grid[tx][ty];
      if (b) {
        b.popStart = now;
        C.pops.push(b);
      }
      C.grid[tx][ty] = null;
    }
    damageAdjacentObstacles(targets);
    addScore(targets.length, emitType);
    C.requestDraw();
    setTimeout(
      () =>
        settleBoard(() => {
          if (C.checkWin()) {
            C.resolveWin();
            return;
          }
          C.busy = false;
          if (!hasMoves()) {
            showNoMv();
            setTimeout(reshuffleBoard, 600);
          }
        }),
      200
    );
  }

  function shakeBlock(gx, gy) {
    const b = C.grid[gx][gy];
    if (!b) return;
    const ox = b.vx;
    const t = performance.now();
    b._shake = [
      { t: 0, dx: 6 },
      { t: 50, dx: -6 },
      { t: 100, dx: 3 },
      { t: 150, dx: 0 },
    ].map((s) => ({ ...s, ox, start: t + s.t }));
    b._invalidFlash = t + 220;
    C.Sound.click();
    C.Haptic.light();
    C.spawnFloater('×2 mín.', gx, gy, '#ff6b6b');
    C.requestDraw();
  }

  // ═══════════════════════════════════════════════════════════════
  // GRAVITY
  // ═══════════════════════════════════════════════════════════════
  // Cores ainda necessárias por objetivos de cor (para RNG misericordioso #6).
  function neededColors() {
    const lv = C._lv();
    const out = [];
    for (const o of lv.objectives || [])
      if (o.type === 'color' && (C.colorProgress[o.color] || 0) < o.target) out.push(o.color);
    return out;
  }
  function applyGravity() {
    const now = performance.now();
    const needs = neededColors();
    for (let x = 0; x < C.GW; x++) {
      let wy = C.GH - 1;
      for (let y = C.GH - 1; y >= 0; y--) {
        const b = C.grid[x][y];
        if (!b) continue;
        if (y !== wy) {
          C.grid[x][y] = null;
          C.grid[x][wy] = b;
          b.y = wy;
          fall(b, wy, now, false);
        }
        wy--;
      }
      for (let y = wy; y >= 0; y--) {
        if (!C.grid[x][y]) {
          const t = TBLogic.mercyRefillType(C._gameRng || Math.random, C.rnd(), needs, 0.3);
          const b = C.mkB(x, y, t);
          b.vy = -C.CELL * 2;
          C.grid[x][y] = b;
          fall(b, y, now, true);
        }
      }
    }
    C.requestDraw();
  }
  const fall = (b, ty, now, fa) => {
    b.afy = b.vy;
    b.aty = ty * C.CELL;
    b.as = now;
    b.ad = fa ? 280 : 220;
  };

  // ═══════════════════════════════════════════════════════════════
  // NO MOVES
  // ═══════════════════════════════════════════════════════════════
  function hasMoves() {
    return TBLogic.hasMoves(C.grid, C.GW, C.GH, C.SP.NONE);
  }
  function shuffleTypes() {
    const free = (b) => b && b.sp === C.SP.NONE && !isBlocked(b);
    const t = [];
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) if (free(C.grid[x][y])) t.push(C.grid[x][y].type);
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(C._rand() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    let i = 0;
    for (let x = 0; x < C.GW; x++)
      for (let y = 0; y < C.GH; y++) if (free(C.grid[x][y])) C.grid[x][y].type = t[i++];
  }
  function reshuffleBoard() {
    let a = 0;
    shuffleTypes();
    while (!hasMoves() && a++ < 20) shuffleTypes();
    C.requestDraw();
  }
  function showNoMv() {
    const el = document.getElementById('no-mv');
    C.Sound.shuffle();
    el.classList.add('show');
    clearTimeout(C.noMvTimer);
    C.noMvTimer = setTimeout(() => el.classList.remove('show'), 1200);
  }

  /** @type {any} */
  const api = {
    init,
    getGroup,
    handleClick,
    afterMove,
    removeGroup,
    addScore,
    gatherBlast,
    activateSpecial,
    buildPUBar,
    refreshPUBar,
    tapPU,
    executePU,
    applyGravity,
    hasMoves,
    reshuffleBoard,
    showNoMv,
    showComboBurst,
    settleBoard,
    noteActivity,
    clearIdleHint,
  };

  /** @type {any} */
  const g = global;
  g.isBlocked = isBlocked;
  g.getGroup = getGroup;
  g.handleClick = handleClick;
  g.afterMove = afterMove;
  g.removeGroup = removeGroup;
  g.addScore = addScore;
  g.gatherBlast = gatherBlast;
  g.activateSpecial = activateSpecial;
  g.bombTargets = bombTargets;
  g.rocketTargets = rocketTargets;
  g.rainbowTargets = rainbowTargets;
  g.bomb5Targets = bomb5Targets;
  g.crossTargets = crossTargets;
  g.bumpObs = bumpObs;
  g.clearCoverAt = clearCoverAt;
  g.trackDestroyed = trackDestroyed;
  g.damageAdjacentObstacles = damageAdjacentObstacles;
  g.collectBottomTokens = collectBottomTokens;
  g.settleBoard = settleBoard;
  g.showComboBurst = showComboBurst;
  g._showPUTip = _showPUTip;
  g._hidePUTip = _hidePUTip;
  g.buildPUBar = buildPUBar;
  g.refreshPUBar = refreshPUBar;
  g.tapPU = tapPU;
  g.executePU = executePU;
  g.shakeBlock = shakeBlock;
  g.neededColors = neededColors;
  g.applyGravity = applyGravity;
  g.fall = fall;
  g.hasMoves = hasMoves;
  g.shuffleTypes = shuffleTypes;
  g.reshuffleBoard = reshuffleBoard;
  g.showNoMv = showNoMv;
  g.TBGameplay = api;
})(typeof window !== 'undefined' ? window : globalThis);
