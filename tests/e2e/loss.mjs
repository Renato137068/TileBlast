/**
 * E2E derrota — esgota movimentos sem atingir meta.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SAVE_SEED, dismissOverlays, playSmallest, startLevel, waitForBoot } from './helpers.mjs';

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

export async function runLoss(baseUrl) {
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

    await page.evaluate(() => {
      setGameSeed(424242);
      buildGrid(424242);
    });

    const play = await playSmallest(page, 30);
    // Força derrota de forma determinística (playSmallest pode vencer a fase 1).
    await page.evaluate(() => {
      score = 0;
      colorProgress = {};
      obsProgress = {};
      movesLeft = 0;
      busy = false;
      over = false;
      hideResult();
      resolveLoss();
    });

    await page.waitForFunction(
      () => document.getElementById('result')?.classList.contains('show'),
      { timeout: 8000 }
    );

    const ui = await page.evaluate(() => ({
      title: document.getElementById('res-ti')?.textContent || '',
      retryVisible: document.getElementById('res-retry')?.style.display !== 'none',
      nextVisible: document.getElementById('res-next')?.style.display !== 'none',
    }));

    assert(
      /sem movimentos|game over|derrota|no_moves/i.test(ui.title),
      `Título inesperado: ${ui.title}`
    );
    assert(ui.retryVisible, 'Botão tentar novamente não visível');
    assert(!ui.nextVisible, 'Botão próxima fase não deveria aparecer');
    assert(errors.length === 0, `Erros: ${errors.join(' | ')}`);
    console.log(`E2E loss OK: ${play.moves} jogadas, ${play.score} pts`);
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/loss.mjs')) {
  const base = process.argv[2] || 'http://localhost:8080/';
  runLoss(base).catch((e) => {
    console.error('E2E loss FALHOU:', e.message);
    process.exit(1);
  });
}
