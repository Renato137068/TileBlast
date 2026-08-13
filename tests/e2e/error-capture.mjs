/**
 * E2E TB-101 — captura global de erro JS (error + unhandledrejection).
 * Uso: node tests/e2e/error-capture.mjs [url]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SAVE_SEED, dismissOverlays, waitForBoot } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const port = process.env.TB_TEST_PORT || '8096';
const BASE = process.argv[2] || process.env.TB_TEST_URL || `http://localhost:${port}/`;

async function loadPuppeteer() {
  try {
    return (await import('puppeteer')).default;
  } catch {
    const require = createRequire(import.meta.url);
    return (await import(require.resolve('puppeteer', { paths: [root] }))).default;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
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
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error('Servidor error-capture não subiu'));
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

function killServer(child) {
  if (!child) return;
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill();
  }
}

export async function runErrorCapture(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    await page.evaluateOnNewDocument((seed) => {
      localStorage.setItem('tbv4', JSON.stringify({ ...seed, lang: 'en' }));
    }, SAVE_SEED);

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForBoot(page);
    await dismissOverlays(page);

    const installed = await page.evaluate(() => {
      if (window.TBState) TBState.lvIdx = 4;
      if (window.TBAnalytics && typeof TBAnalytics.log === 'function') {
        TBAnalytics.log('level_start', { level: 4 });
      }
      return !!(window.TBRuntime && typeof TBRuntime.captureError === 'function');
    });
    assert(installed, 'TBRuntime.captureError ausente após boot');

    await page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'tb-101-probe',
          error: new Error('tb-101-probe'),
          filename: 'e2e-error-capture.js',
          lineno: 42,
        })
      );
    });

    const shot = await page.waitForFunction(
      () => {
        const ev = window.TBAnalytics && TBAnalytics.exportEvents ? TBAnalytics.exportEvents() : [];
        const hit = ev.find((e) => e && e.name === 'client_error' && /tb-101-probe/.test(e.message || ''));
        if (!hit) return null;
        let queued = [];
        try {
          queued = JSON.parse(localStorage.getItem('tb_callable_queue') || '[]');
        } catch (e) {
          queued = [];
        }
        const cf = queued.find((x) => x && x.name === 'client_error');
        return {
          message: hit.message,
          level: hit.level,
          v: hit.v,
          lang: hit.lang,
          last_event: hit.last_event,
          queued: !!(cf && cf.data && /tb-101-probe/.test(cf.data.message || '')),
          callableName: cf ? cf.name : '',
        };
      },
      { timeout: 8000 }
    );

    const row = await shot.jsonValue();
    assert(row && row.message === 'tb-101-probe', `client_error message inesperado: ${row && row.message}`);
    assert(row.level === 4, `level esperado 4, obteve ${row.level}`);
    assert(row.v, 'versão ausente no client_error');
    assert(row.lang, 'lang ausente no client_error');
    assert(row.last_event === 'level_start', `last_event esperado level_start, obteve ${row.last_event}`);
    assert(row.queued, 'callable client_error não enfileirado');
    assert(row.callableName === 'client_error', 'nome do callable incorreto');

    console.log(
      `E2E error-capture OK: client_error level=${row.level} v=${row.v} lang=${row.lang} last=${row.last_event}`
    );
    return true;
  } finally {
    await browser.close();
  }
}

async function main() {
  let child = null;
  if (!(await isUp(BASE))) {
    console.log(`Subindo www em ${BASE}...`);
    child = await startServer();
    await new Promise((r) => setTimeout(r, 600));
  }
  try {
    await runErrorCapture(BASE);
  } finally {
    killServer(child);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/error-capture.mjs')) {
  main().catch((e) => {
    console.error('E2E error-capture FALHOU:', e.message);
    process.exit(1);
  });
}
