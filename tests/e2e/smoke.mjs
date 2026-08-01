/**
 * Smoke E2E — splash → mapa → fase 1.
 * Uso: node tests/e2e/smoke.mjs [url]
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { dismissOverlays, waitForBoot } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const BASE = process.argv[2] || process.env.TB_TEST_URL || 'http://localhost:8080/';

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

export async function runSmoke(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForBoot(page);
    await new Promise((r) => setTimeout(r, 3200));
    await dismissOverlays(page);

    const boot = await page.evaluate(() => ({
      roadmap: !!(window.TBRoadmap && TBRoadmap.isReady && TBRoadmap.isReady()),
      features: !!(window.TBFeatures && TBFeatures.isReady && TBFeatures.isReady()),
      logic: !!window.TBLogic,
      mapActive: document.getElementById('screen-map')?.classList.contains('active'),
    }));
    assert(boot.roadmap, 'TBRoadmap não inicializou');
    assert(
      boot.features,
      `TBFeatures não inicializou${errors.length ? ': ' + errors.join(' | ') : ''}`
    );
    assert(boot.logic, 'TBLogic ausente');
    assert(boot.mapActive, 'Mapa não está ativo');

    const mapCards = await page.evaluate(() => document.querySelectorAll('#map-grid .lc').length);
    // Mapa filtrado por mundo selecionado (ex.: garden); não lista todas as fases.
    assert(mapCards >= 10, `Esperado ≥10 fases no mundo atual, obteve ${mapCards}`);

    const playBtn = await page.$('#map-play-btn');
    assert(playBtn, 'Botão Jogar não encontrado');
    await page.evaluate(() => {
      const btn = document.getElementById('map-play-btn');
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => document.getElementById('screen-game')?.classList.contains('active'),
      { timeout: 12000 }
    );

    const canvas = await page.$('#board');
    assert(canvas, 'Canvas do jogo não encontrado');

    const hud = await page.evaluate(() => ({
      score: document.getElementById('hud-score')?.textContent,
      moves: document.getElementById('hud-mv')?.textContent,
      gameActive: document.getElementById('screen-game')?.classList.contains('active'),
    }));
    assert(hud.gameActive, 'Tela de jogo não ativa');
    assert(hud.moves && hud.moves.length > 0, 'HUD de movimentos vazio');

    assert(errors.length === 0, `Erros no console: ${errors.join(' | ')}`);
    console.log('E2E smoke OK:', baseUrl);
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/e2e/smoke.mjs')) {
  runSmoke(BASE).catch((e) => {
    console.error('E2E smoke FALHOU:', e.message);
    process.exit(1);
  });
}
