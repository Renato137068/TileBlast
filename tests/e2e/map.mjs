/**
 * E2E mapa — clica na fase 2 e inicia o jogo.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SAVE_SEED, dismissOverlays, waitForBoot, waitForCountdown } from './helpers.mjs';

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

export async function runMap(baseUrl) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    const seed = { ...SAVE_SEED, unlocked: 1, stars: { 0: 2 } };
    await page.evaluateOnNewDocument((s) => {
      localStorage.setItem('tbv4', JSON.stringify(s));
    }, seed);

    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForBoot(page);
    await dismissOverlays(page);

    const clicked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#map-grid .lc:not(.locked)')];
      const card = cards.find((c) => c.querySelector('.lc-n')?.textContent === '2');
      if (!card) return false;
      card.click();
      return true;
    });
    assert(clicked, 'Carta da fase 2 não encontrada');

    await page.waitForFunction(
      () => document.getElementById('screen-game')?.classList.contains('active'),
      { timeout: 8000 }
    );
    await waitForCountdown(page);

    const hud = await page.evaluate(() => ({
      phase:
        document.getElementById('cd-ph')?.textContent ||
        document.querySelector('.hud-lv')?.textContent ||
        '',
      moves: document.getElementById('hud-mv')?.textContent,
      gameActive: document.getElementById('screen-game')?.classList.contains('active'),
    }));

    assert(hud.gameActive, 'Tela de jogo não ativa');
    assert(/fase 2|primeiros passos/i.test(hud.phase), `Fase inesperada: ${hud.phase}`);
    assert(hud.moves && hud.moves.length > 0, 'HUD de movimentos vazio');
    assert(errors.length === 0, `Erros: ${errors.join(' | ')}`);
    console.log('E2E map OK: fase 2 iniciada pelo mapa');
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/map.mjs')) {
  const base = process.argv[2] || 'http://localhost:8080/';
  runMap(base).catch((e) => {
    console.error('E2E map FALHOU:', e.message);
    process.exit(1);
  });
}
