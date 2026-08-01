/**
 * E2E gameplay — inicia fase 1, faz jogada válida, verifica pontuação.
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

export async function runGameplay(baseUrl) {
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

    const result = await playGreedy(page, 5);
    assert(result.moves >= 2, `Poucas jogadas válidas (${result.moves})`);
    assert(result.score > 0, 'Pontuação total zero');
    assert(errors.length === 0, `Erros: ${errors.join(' | ')}`);
    console.log(`E2E gameplay OK: ${result.moves} jogadas, ${result.score} pts`);
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/gameplay.mjs')) {
  const base = process.argv[2] || 'http://localhost:8080/';
  runGameplay(base).catch((e) => {
    console.error('E2E gameplay FALHOU:', e.message);
    process.exit(1);
  });
}
