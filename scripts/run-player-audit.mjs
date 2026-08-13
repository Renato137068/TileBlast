/**
 * Jogador-auditor E2E — joga fases e gera achados (gameplay, falhas, UX, monetização).
 * Uso: npm run player:audit
 * Env:
 *   TB_PLAYER_MAX=15     — limita quantas fases (default: todas)
 *   TB_PLAYER_FROM=0     — índice inicial
 *   TB_PLAYER_TO=14      — índice final inclusivo
 *   TB_TEST_PORT=8080
 *   TB_PLAYER_FAST=1     — sleeps curtos (default)
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dismissOverlays, waitForBoot } from '../tests/e2e/helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const port = process.env.TB_TEST_PORT || '8095';
const base = `http://localhost:${port}/`;
const fast = process.env.TB_PLAYER_FAST !== '0';
const moveSleep = fast ? 80 : 400;
const busyWait = fast ? 40 : 150;

const GOD_SEED = {
  tutorialDone: true,
  coachDone: true,
  lastVersionSeen: '1.4.8',
  lastLoginDay: Math.floor(Date.now() / 86400000),
  loginStreak: 5,
  lives: 99,
  unlocked: 200,
  coins: 50000,
  reduceMotion: true,
  colorBlind: false,
  stars: {},
  pu: { bomb: 9, rocket: 9, rainbow: 9, shuffle: 9 },
  remoteCfg: { adDailyLimit: 99, interstitialEvery: 99, interstitialDailyCap: 99, coinMult: 1 },
};

async function loadPuppeteer() {
  try {
    return (await import('puppeteer')).default;
  } catch {
    const require = createRequire(import.meta.url);
    return (await import(require.resolve('puppeteer', { paths: [root] }))).default;
  }
}

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', 'serve', 'www', '-l', port], {
      cwd: root,
      shell: process.platform === 'win32',
      stdio: 'pipe',
    });
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error('Servidor player-audit não subiu'));
    }, 25000);
    const onData = (buf) => {
      if (buf.toString().includes('Accepting connections') && !ready) {
        ready = true;
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
  });
}

function killServer(child) {
  if (!child) return;
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill();
  }
}

/** Bot greedy rápido dentro da página. */
async function playLevelFast(page, maxMoves = 40) {
  return page.evaluate(
    async (limit, sleepMs, busyMs) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      // Pula countdown se ainda visível
      const cd = document.getElementById('cd');
      if (cd?.classList.contains('show')) {
        cd.classList.remove('show');
        cd.setAttribute('aria-hidden', 'true');
      }
      document.documentElement.classList.add('reduce-motion');

      // Objetivos atuais (para priorizar gelo/obstáculos)
      const objs = (typeof TBState !== 'undefined' && TBState.LEVELS && TBState.lvIdx != null
        ? TBState.LEVELS[TBState.lvIdx]?.objectives
        : null) || [];
      const needsIce = objs.some((o) => o && (o.type === 'ice' || o.type === 'obstacle'));
      const needsScore = objs.some((o) => o && o.type === 'score');

      function iceAdjScore(x, y) {
        if (!needsIce || !grid) return 0;
        let n = 0;
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dy] of dirs) {
          const b = grid[x + dx]?.[y + dy];
          if (b && (b.ice || 0) > 0) n += 3 + (b.ice || 0);
        }
        return n;
      }

      function moveScore(cand) {
        // Preferir grupos grandes; em score, peso quadrático; em gelo, adjacência
        const sizeW = needsScore ? cand.size * cand.size : cand.size;
        return sizeW * 10 + iceAdjScore(cand.x, cand.y) + (cand.special ? 8 : 0);
      }

      let moves = 0;
      const t0 = performance.now();
      for (let attempt = 0; attempt < limit; attempt++) {
        if (typeof over !== 'undefined' && over) break;
        if (document.getElementById('result')?.classList.contains('show')) break;
        if (typeof checkWin === 'function' && checkWin()) break;

        let waited = 0;
        while (typeof busy !== 'undefined' && busy && waited < 25) {
          await sleep(busyMs);
          waited++;
        }

        let best = null;
        const W = typeof GW === 'number' ? GW : 8;
        const H = typeof GH === 'number' ? GH : 8;
        for (let x = 0; x < W; x++) {
          for (let y = 0; y < H; y++) {
            const b = grid?.[x]?.[y];
            if (!b) continue;
            if (b.sp !== SP.NONE) {
              const cand = { x, y, size: 2, special: true };
              if (!best || moveScore(cand) > moveScore(best)) best = cand;
              continue;
            }
            const g = getGroup(x, y);
            if (g.length < 2) continue;
            const cand = { x, y, size: g.length, special: false };
            if (!best || moveScore(cand) > moveScore(best)) best = cand;
          }
        }
        if (!best) {
          await sleep(sleepMs * 2);
          continue;
        }
        const before = score;
        handleClick(best.x, best.y);
        await sleep(sleepMs);
        if (score > before || best.special) moves++;
      }

      const resultShow = !!document.getElementById('result')?.classList.contains('show');
      const loseUi = !!document.getElementById('result')?.classList.contains('result--lose');
      const winCheck = typeof checkWin === 'function' ? !!checkWin() : false;
      const scoreNow = typeof score !== 'undefined' ? score : 0;
      // Evita falso WIN (ex.: Ritmo ~1s, 0 cliques, score 0) sem UI de resultado.
      const progressOk = moves > 0 || scoreNow > 0;
      const won = resultShow ? !loseUi : !!(winCheck && progressOk);
      const lost = resultShow
        ? loseUi
        : !!(typeof over !== 'undefined' && over && !won);

      return {
        moves,
        score: typeof score !== 'undefined' ? score : 0,
        movesLeft: typeof movesLeft !== 'undefined' ? movesLeft : -1,
        won,
        lost,
        resultVisible: resultShow,
        durationMs: Math.round(performance.now() - t0),
        lvIdx: typeof TBState !== 'undefined' ? TBState.lvIdx : -1,
      };
    },
    maxMoves,
    moveSleep,
    busyWait
  );
}

async function dismissResultContinue(page) {
  await page.evaluate(() => {
    const res = document.getElementById('result');
    if (res) {
      res.classList.remove('show');
      res.setAttribute('aria-hidden', 'true');
      res.inert = true;
    }
    if (typeof goToMap === 'function') goToMap();
  });
  await new Promise((r) => setTimeout(r, fast ? 120 : 400));
}

async function scanSurfaces(page) {
  return page.evaluate(() => {
    const findings = [];
    // Map UX
    if (typeof goToMap === 'function') goToMap();
    const mapCards = document.querySelectorAll('#map-grid .lc').length;
    if (mapCards < 5) findings.push({ area: 'ux', pri: 'P1', msg: `Mapa com só ${mapCards} cards visíveis` });

    const playBtn = document.getElementById('map-play-btn');
    if (!playBtn || !(playBtn.textContent || '').trim()) {
      findings.push({ area: 'ux', pri: 'P0', msg: 'Botão Jogar ausente/vazio' });
    }

    // Shop / monetização
    if (typeof openShop === 'function') openShop();
    const iap = [...document.querySelectorAll('.shop-item.iap .shop-item-price')].map((el) =>
      (el.textContent || '').trim()
    );
    const emptyPrice = iap.filter((t) => !t || t === '.' || t === '…' || t === '-');
    if (emptyPrice.length) {
      findings.push({
        area: 'monetization',
        pri: 'P1',
        msg: `${emptyPrice.length} preços IAP vazios/placeholder na loja`,
      });
    }
    const coinItems = document.querySelectorAll('[data-action="shopBuyCoin"]').length;
    if (coinItems === 0) {
      findings.push({ area: 'monetization', pri: 'P2', msg: 'Nenhum item de compra por moedas visível' });
    }

    const adHints = [...document.querySelectorAll('[data-action*="d"], [data-action*="Ad"], .shop-item')]
      .map((el) => el.getAttribute('data-action') || '')
      .filter((a) => /ad|reward|watch/i.test(a));
    if (adHints.length === 0) {
      findings.push({
        area: 'monetization',
        pri: 'P2',
        msg: 'Nenhuma ação explícita de rewarded ad detectada na loja (pode ser OK se nativo)',
      });
    }

    if (typeof goToMap === 'function') goToMap();
    return {
      findings,
      mapCards,
      iapPriceSamples: iap.slice(0, 6),
      coinItems,
    };
  });
}

function classifyLevel(row, lvMeta) {
  const out = [];
  if (row.jsError) {
    out.push({
      area: 'stability',
      pri: 'P0',
      level: row.idx,
      msg: `Erro JS na fase ${row.idx + 1}: ${row.jsError}`,
    });
  }
  if (!row.resultVisible && !row.won && !row.lost) {
    out.push({
      area: 'gameplay',
      pri: 'P0',
      level: row.idx,
      msg: `Fase ${row.idx + 1}: sem resultado claro (nem vitória nem derrota)`,
    });
  }
  if (row.lost || (row.resultVisible && !row.won)) {
    out.push({
      area: 'balance',
      pri: 'P1',
      level: row.idx,
      msg: `Fase ${row.idx + 1} (${lvMeta?.name || '?'}): bot greedy perdeu — revisar dificuldade/moves`,
    });
  }
  if (row.won && row.movesLeft === 0) {
    out.push({
      area: 'balance',
      pri: 'P1',
      level: row.idx,
      msg: `Fase ${row.idx + 1}: vitória no último movimento — margem zero`,
    });
  }
  if (row.won && typeof row.movesLeft === 'number' && row.movesLeft >= 12 && row.idx >= 5) {
    out.push({
      area: 'balance',
      pri: 'P2',
      level: row.idx,
      msg: `Fase ${row.idx + 1}: vitória com ${row.movesLeft} moves sobrando — possível fácil demais`,
    });
  }
  if (row.durationMs > 25000) {
    out.push({
      area: 'ux',
      pri: 'P2',
      level: row.idx,
      msg: `Fase ${row.idx + 1}: ${Math.round(row.durationMs / 1000)}s de sessão bot — sensação lenta`,
    });
  }
  return out;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(`# Player audit — ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push(`Fases: **${report.played}** · Vitórias: **${report.wins}** · Derrotas: **${report.losses}** · Erros JS: **${report.js_errors}**`);
  lines.push('');
  lines.push('## Achados priorizados');
  lines.push('');
  if (!report.findings.length) {
    lines.push('_Nenhum achado automático._');
  } else {
    lines.push('| Pri | Área | Fase | Achado |');
    lines.push('|-----|------|------|--------|');
    for (const f of report.findings) {
      lines.push(
        `| ${f.pri} | ${f.area} | ${f.level != null ? f.level + 1 : '—'} | ${f.msg.replace(/\|/g, '/')} |`
      );
    }
  }
  lines.push('');
  lines.push('## Próximos passos (agentes)');
  lines.push('');
  lines.push('1. Skill `tileblast-improve` nos P0/P1.');
  lines.push('2. Re-rodar `npm run player:audit` após mudanças de balance/UX.');
  lines.push('3. Em paralelo: `tileblast-audit` / soft-launch para ops.');
  lines.push('');
  lines.push('## Amostra de níveis');
  lines.push('');
  lines.push('| # | Nome | Resultado | Moves | Left | Score | ms |');
  lines.push('|---|------|-----------|-------|------|-------|----|');
  for (const r of report.levels.slice(0, 30)) {
    const res = r.won ? 'WIN' : r.lost ? 'LOSS' : '?';
    lines.push(
      `| ${r.idx + 1} | ${(r.name || '').slice(0, 24)} | ${res} | ${r.moves} | ${r.movesLeft} | ${r.score} | ${r.durationMs} |`
    );
  }
  if (report.levels.length > 30) lines.push(`| … | +${report.levels.length - 30} fases | | | | | |`);
  lines.push('');
  return lines.join('\n');
}

export async function runPlayerAudit(baseUrl = base) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const findings = [];
  const levels = [];

  try {
    await page.evaluateOnNewDocument((seed) => {
      localStorage.setItem('tbv4', JSON.stringify(seed));
    }, GOD_SEED);

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForBoot(page);
    await dismissOverlays(page);

    // Garante packs carregados
    await page.evaluate(async () => {
      document.documentElement.classList.add('reduce-motion');
      if (window.TBContent?.loadAllPacks) {
        try {
          await TBContent.loadAllPacks();
          if (window.TBState) TBState.LEVELS = TBContent.getLevels();
        } catch (e) {
          /* ignore */
        }
      }
    });

    const meta = await page.evaluate(() => {
      const list = window.TBState?.LEVELS || window.TBContent?.getLevels?.() || [];
      return list.map((lv, i) => ({
        idx: i,
        name: lv.name || `Fase ${i + 1}`,
        worldId: lv.worldId || '',
        moves: lv.moves,
        objectives: (lv.objectives || []).map((o) => o.type),
      }));
    });

    let from = Number(process.env.TB_PLAYER_FROM || 0);
    let to = process.env.TB_PLAYER_TO != null ? Number(process.env.TB_PLAYER_TO) : meta.length - 1;
    const max = process.env.TB_PLAYER_MAX != null ? Number(process.env.TB_PLAYER_MAX) : null;
    if (max != null && Number.isFinite(max)) to = Math.min(to, from + max - 1);
    from = Math.max(0, from);
    to = Math.min(meta.length - 1, to);

    console.log(`Player audit: fases ${from}–${to} (${to - from + 1} de ${meta.length})`);

    const surfaces = await scanSurfaces(page);
    findings.push(...surfaces.findings);

    for (let idx = from; idx <= to; idx++) {
      pageErrors.length = 0;
      const lvMeta = meta[idx] || { name: `Fase ${idx + 1}` };

      await page.evaluate((i) => {
        document.getElementById('splash')?.classList.add('hide');
        document.getElementById('global-modal')?.classList.remove('show');
        document.getElementById('result')?.classList.remove('show');
        // Vidas infinitas práticas
        if (typeof ld === 'function' && typeof sv === 'function') {
          const s = ld();
          s.lives = 99;
          sv(s);
        }
        if (typeof startGame === 'function') startGame(i);
      }, idx);

      try {
        await page.waitForFunction(
          () => document.getElementById('screen-game')?.classList.contains('active'),
          { timeout: 8000 }
        );
      } catch {
        findings.push({
          area: 'stability',
          pri: 'P0',
          level: idx,
          msg: `Fase ${idx + 1}: não entrou em screen-game`,
        });
        levels.push({
          idx,
          name: lvMeta.name,
          won: false,
          lost: true,
          error: 'no-game-screen',
        });
        continue;
      }

      await new Promise((r) => setTimeout(r, fast ? 50 : 200));
      const result = await playLevelFast(page, 45);
      const jsError = pageErrors[0] || null;
      const row = {
        idx,
        name: lvMeta.name,
        worldId: lvMeta.worldId,
        ...result,
        jsError,
      };
      levels.push(row);
      findings.push(...classifyLevel(row, lvMeta));

      const tag = row.won ? 'WIN' : row.lost ? 'LOSS' : '?';
      console.log(
        `  [${idx + 1}/${to + 1}] ${tag} ${lvMeta.name} moves=${row.moves} left=${row.movesLeft} ${row.durationMs}ms`
      );

      await dismissResultContinue(page);
      await dismissOverlays(page);
    }

    // Ordena achados P0 > P1 > P2
    const rank = { P0: 0, P1: 1, P2: 2 };
    findings.sort((a, b) => (rank[a.pri] ?? 9) - (rank[b.pri] ?? 9));

    const report = {
      generated_at: new Date().toISOString(),
      total_levels: meta.length,
      range: { from, to },
      played: levels.length,
      wins: levels.filter((l) => l.won).length,
      losses: levels.filter((l) => !l.won).length,
      js_errors: levels.filter((l) => l.jsError).length,
      surfaces,
      findings,
      levels,
    };

    const outDir = join(root, 'play-store', 'reports');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'player-audit-latest.json'), JSON.stringify(report, null, 2) + '\n');
    writeFileSync(join(outDir, 'player-audit-latest.md'), buildMarkdown(report));
    console.log('\n✓ Relatórios → play-store/reports/player-audit-latest.{md,json}');
    console.log(`  Achados: ${findings.length} (P0=${findings.filter((f) => f.pri === 'P0').length})`);
    return report;
  } finally {
    await browser.close();
  }
}

async function main() {
  let child = null;
  if (!(await isUp(base))) {
    console.log(`Subindo www em ${base}...`);
    // sync esperado via npm script
    child = await startServer();
    await new Promise((r) => setTimeout(r, 600));
  }
  try {
    await runPlayerAudit(base);
  } finally {
    killServer(child);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('run-player-audit.mjs')) {
  main().catch((e) => {
    console.error('Player audit FALHOU:', e.message);
    process.exit(1);
  });
}
