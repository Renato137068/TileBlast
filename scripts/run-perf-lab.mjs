/**
 * Lab de performance P4.1 — mede startup/boot_ready/FPS em Chrome headless.
 * Uso: npm run sync:www && npm run perf:lab
 * Escreve play-store/reports/perf-baseline.json e falha se regressão >10%.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { FRESH_SEED } from '../tests/e2e/helpers.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.TB_PERF_PORT || '8091';
const base = `http://localhost:${port}/`;
const runs = Number(process.env.TB_PERF_RUNS || 3);
const outPath = join(root, 'play-store', 'reports', 'perf-baseline.json');
const budgetsPath = join(root, 'data', 'perf-budgets.json');

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
      if (!ready) reject(new Error('Servidor perf não subiu'));
    }, 20000);
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

/** @param {number[]} arr */
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(key, values, higherIsBetter = false) {
  return {
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    samples: values.length,
    higher_is_better: higherIsBetter,
  };
}

async function measureOnce(puppeteer) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.evaluateOnNewDocument((seed) => {
    localStorage.setItem('tbv4', JSON.stringify(seed));
  }, FRESH_SEED);

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 45000 });

  await page.waitForFunction(
    () => window.TBRoadmap?.isReady?.() && window.TBFeatures?.isReady?.(),
    { timeout: 20000 }
  );

  const boot = await page.evaluate(() => {
    const events = window.TBAnalytics?.exportEvents?.() || [];
    const ready = events.find((e) => e.name === 'boot_ready');
    const timing = performance.timing || {};
    const dcl =
      timing.domContentLoadedEventEnd && timing.navigationStart
        ? timing.domContentLoadedEventEnd - timing.navigationStart
        : 0;
    return {
      boot_ready_ms: ready?.startup_ms || window.TBAnalytics?.bootReadyMs?.() || 0,
      dom_content_loaded_ms: dcl,
      fps: window.TBJuice?.getLastFps?.() || 0,
      deferred: ready?.deferred || window.TBRuntime?.deferredLoaded?.() || [],
    };
  });

  await new Promise((r) => setTimeout(r, 1200));
  const fpsAfter = await page.evaluate(() => window.TBJuice?.getLastFps?.() || 0);
  await browser.close();

  return {
    dom_content_loaded_ms: boot.dom_content_loaded_ms,
    boot_ready_ms: boot.boot_ready_ms,
    fps_min: Math.min(boot.fps || 60, fpsAfter || 60),
    deferred_loaded: boot.deferred,
  };
}

function checkRegression(prev, next, pct) {
  const failures = [];
  if (!prev || !prev.lab) return failures;
  for (const key of Object.keys(next.lab)) {
    const before = prev.lab[key];
    const after = next.lab[key];
    if (!before || !after) continue;
    if (after.higher_is_better) {
      if (after.p50 < before.p50 * (1 - pct / 100)) {
        failures.push(`${key}.p50 caiu ${before.p50} → ${after.p50}`);
      }
      if (after.p95 < before.p95 * (1 - pct / 100)) {
        failures.push(`${key}.p95 caiu ${before.p95} → ${after.p95}`);
      }
    } else {
      if (after.p50 > before.p50 * (1 + pct / 100)) {
        failures.push(`${key}.p50 subiu ${before.p50} → ${after.p50}`);
      }
      if (after.p95 > before.p95 * (1 + pct / 100)) {
        failures.push(`${key}.p95 subiu ${before.p95} → ${after.p95}`);
      }
    }
  }
  return failures;
}

async function main() {
  const budgets = JSON.parse(readFileSync(budgetsPath, 'utf8'));
  const puppeteer = await loadPuppeteer();
  let child = null;
  if (!(await isUp(base))) {
    child = await startServer();
    await new Promise((r) => setTimeout(r, 800));
  }

  const samples = [];
  try {
    for (let i = 0; i < runs; i++) {
      samples.push(await measureOnce(puppeteer));
      console.log(`  run ${i + 1}/${runs}`, samples[samples.length - 1]);
    }
  } finally {
    if (child) child.kill('SIGTERM');
  }

  const report = {
    generated_at: new Date().toISOString(),
    runs,
    network: '4G-emulated',
    cpu_throttle: 4,
    lab: {
      boot_ready_ms: summarize(
        'boot_ready_ms',
        samples.map((s) => s.boot_ready_ms)
      ),
      dom_content_loaded_ms: summarize(
        'dom_content_loaded_ms',
        samples.map((s) => s.dom_content_loaded_ms)
      ),
      fps_min: summarize(
        'fps_min',
        samples.map((s) => s.fps_min),
        true
      ),
    },
    samples,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : null;
  const failures = [];

  for (const [key, limits] of Object.entries(budgets.lab)) {
    const stat = report.lab[key];
    if (!stat) continue;
    if (limits.p50_max != null && stat.p50 > limits.p50_max) {
      failures.push(`${key}.p50 ${stat.p50} > budget ${limits.p50_max}`);
    }
    if (limits.p95_max != null && stat.p95 > limits.p95_max) {
      failures.push(`${key}.p95 ${stat.p95} > budget ${limits.p95_max}`);
    }
    if (limits.p50_min != null && stat.p50 < limits.p50_min) {
      failures.push(`${key}.p50 ${stat.p50} < budget ${limits.p50_min}`);
    }
    if (limits.p95_min != null && stat.p95 < limits.p95_min) {
      failures.push(`${key}.p95 ${stat.p95} < budget ${limits.p95_min}`);
    }
  }

  if (process.env.TB_PERF_CHECK_REGRESSION === '1' && prev) {
    failures.push(...checkRegression(prev, report, budgets.regression_pct || 10));
  }

  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.lab, null, 2));

  if (failures.length) {
    console.error('\n✗ Perf lab FALHOU:');
    for (const f of failures) console.error('  -', f);
    process.exit(1);
  }
  console.log('\n✓ Perf lab OK →', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
