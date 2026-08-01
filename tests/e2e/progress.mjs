/**
 * E2E progresso — vitória desbloqueia fase 2 e grava estrelas.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SAVE_SEED, dismissOverlays, playGreedy, startLevel, waitForBoot } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

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

export async function runProgress(baseUrl) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await page.evaluateOnNewDocument((seed) => {
      localStorage.setItem('tbv4', JSON.stringify(seed));
    }, SAVE_SEED);

    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForBoot(page);
    await dismissOverlays(page);
    await startLevel(page, 0);

    await playGreedy(page, 28);

    await page.waitForFunction(
      () => document.getElementById('result')?.classList.contains('show'),
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      if (typeof flushSave === 'function') flushSave();
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.waitForFunction(() => typeof getUnlocked === 'function' && getUnlocked() >= 1, {
      timeout: 8000,
    });

    const save = await page.evaluate(() => ({
      unlocked: typeof getUnlocked === 'function' ? getUnlocked() : 0,
      stars: [typeof getStars === 'function' ? getStars(0) : 0],
      hs: typeof getHS === 'function' ? getHS() : 0,
    }));
    assert((save.unlocked ?? 0) >= 1, `unlocked=${save.unlocked}`);
    assert((save.stars?.[0] ?? 0) >= 1, `stars[0]=${save.stars?.[0]}`);
    assert((save.hs ?? 0) >= 500, `hs=${save.hs}`);

    await page.evaluate(() => document.getElementById('result')?.classList.remove('show'));
    await page.evaluate(() => {
      if (typeof goToMap === 'function') goToMap();
    });
    await page.waitForFunction(
      () => document.getElementById('screen-map')?.classList.contains('active'),
      { timeout: 8000 }
    );

    const map = await page.evaluate(() => ({
      unlockedCards: document.querySelectorAll('#map-grid .lc:not(.locked)').length,
      phase2: [...document.querySelectorAll('#map-grid .lc:not(.locked) .lc-n')].some(
        (el) => el.textContent === '2'
      ),
    }));

    assert(map.unlockedCards >= 2, `Cartas desbloqueadas: ${map.unlockedCards}`);
    assert(map.phase2, 'Fase 2 não aparece desbloqueada no mapa');
    assert(errors.length === 0, `Erros: ${errors.join(' | ')}`);
    console.log(`E2E progress OK: unlocked=${save.unlocked}, stars=${save.stars?.[0]}`);
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/progress.mjs')) {
  const base = process.argv[2] || 'http://localhost:8080/';
  runProgress(base).catch((e) => {
    console.error('E2E progress FALHOU:', e.message);
    process.exit(1);
  });
}
