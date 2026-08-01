/**
 * E2E vitória — fase 1 (500 pts) com jogadas greedy.
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

export async function runWin(baseUrl) {
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

    const play = await playGreedy(page, 28);
    assert(
      play.score >= 500 || play.won || play.resultVisible,
      `Não atingiu vitória (score ${play.score})`
    );

    await page.waitForFunction(
      () => document.getElementById('result')?.classList.contains('show'),
      { timeout: 8000 }
    );

    const ui = await page.evaluate(() => ({
      title: document.getElementById('res-ti')?.textContent || '',
      nextVisible: document.getElementById('res-next')?.style.display !== 'none',
    }));

    assert(/venceu|perfect|perfeito|win/i.test(ui.title), `Título inesperado: ${ui.title}`);
    assert(ui.nextVisible, 'Botão próxima fase não visível');
    assert(errors.length === 0, `Erros: ${errors.join(' | ')}`);
    console.log(`E2E win OK: ${play.moves} jogadas, ${play.score} pts`);
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/win.mjs')) {
  const base = process.argv[2] || 'http://localhost:8080/';
  runWin(base).catch((e) => {
    console.error('E2E win FALHOU:', e.message);
    process.exit(1);
  });
}
