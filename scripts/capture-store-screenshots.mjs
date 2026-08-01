/**
 * Captura screenshots reais do jogo para a Play Store.
 * Requer servidor local: npm run serve:pwa (outro terminal)
 * Uso: node scripts/capture-store-screenshots.mjs
 */
import { createRequire } from 'module';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const shotsRoot = join(root, 'play-store', 'assets', 'screenshots');
const BASE = process.env.TB_SCREENSHOT_URL || 'http://localhost:8080/index.html';

// Perfil retrato da Play Store. IMPORTANTE: usa viewport CSS de celular real
// (css 360×640) × deviceScaleFactor 3 → saída 1080×1920. Capturar direto em
// 1080 de largura com dsf 1 faz o app (largura máx.) flutuar num viewport
// gigante — daí as versões antigas apareciam pequenas com muito vazio.
// Tablet NÃO é gerado: o jogo é phone-first (largura de app travada) e não
// preenche telas de tablet — screenshots ficariam com a UI pequena centralizada.
// Habilitar tablet exige antes um layout responsivo de tablet no jogo.
const DEVICES = [{ name: 'phone', dir: 'phone', cssW: 360, cssH: 640, dsf: 3 }];

async function loadPuppeteer() {
  try {
    return (await import('puppeteer')).default;
  } catch {
    const require = createRequire(import.meta.url);
    const puppeteerPath = require.resolve('puppeteer', { paths: [root] });
    return (await import(puppeteerPath)).default;
  }
}

async function dismissModals(page) {
  await page.evaluate(() => {
    const close = () => {
      document.querySelectorAll('#global-modal.show button').forEach((b) => {
        if (/fechar|coletar|ok|depois|later/i.test(b.textContent || '')) b.click();
      });
      const sp = document.getElementById('splash');
      if (sp) sp.classList.add('hide');
    };
    close();
    setTimeout(close, 400);
    setTimeout(close, 1200);
  });
  await new Promise((r) => setTimeout(r, 1600));
}

/** Sequência de 4 telas (mapa, jogo, loja, diário) para um dado prefixo. */
function buildShots(page, prefix) {
  return [
    { file: `${prefix}-01.png`, action: async () => {} },
    {
      file: `${prefix}-02.png`,
      action: async () => {
        // Clique via DOM (evaluate) é robusto a visibilidade/animação.
        await page.evaluate(() => document.getElementById('map-play-btn')?.click());
        await page.waitForSelector('#screen-game.active', { timeout: 10000 });
        // Dispensa o tutorial de onboarding e o countdown para um tabuleiro limpo.
        await page.evaluate(() => {
          if (typeof skipOnboarding === 'function') skipOnboarding();
          const cd = document.getElementById('cd');
          if (cd) cd.classList.remove('show');
          const gm = document.getElementById('global-modal');
          if (gm) gm.classList.remove('show');
        });
        await new Promise((r) => setTimeout(r, 600));
      },
    },
    {
      file: `${prefix}-03.png`,
      action: async () => {
        await page.evaluate(() => {
          if (typeof goToMap === 'function') goToMap();
          else if (typeof showScreen === 'function') showScreen('map');
        });
        await page.waitForSelector('#screen-map.active', { timeout: 8000 });
        // A loja vive no hub secundário (#map-more-panel) — abre e clica.
        await page.evaluate(() => document.getElementById('map-more-toggle')?.click());
        await new Promise((r) => setTimeout(r, 400));
        await page.evaluate(() => document.getElementById('map-shop-btn')?.click());
        await page.waitForSelector('#screen-shop.active', { timeout: 6000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 400));
      },
    },
    {
      file: `${prefix}-04.png`,
      action: async () => {
        await page.evaluate(() => {
          if (typeof showScreen === 'function') showScreen('map');
        });
        await page.waitForSelector('#screen-map.active', { timeout: 8000 });
        await page.evaluate(() => document.getElementById('map-daily-puzzle-btn')?.click());
        await page.waitForSelector('#global-modal.show', { timeout: 8000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      },
    },
  ];
}

async function captureDevice(browser, device) {
  const outDir = join(shotsRoot, device.dir);
  mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({
    width: device.cssW,
    height: device.cssH,
    deviceScaleFactor: device.dsf,
  });
  const outW = device.cssW * device.dsf;
  const outH = device.cssH * device.dsf;
  console.log(`\n[${device.name} → ${outW}x${outH}] abrindo`, BASE);
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await dismissModals(page);
  for (const s of buildShots(page, device.dir)) {
    await s.action();
    const path = join(outDir, s.file);
    await page.screenshot({ path, type: 'png' });
    console.log('OK', path);
  }
  await page.close();
}

async function main() {
  let puppeteer;
  try {
    puppeteer = await loadPuppeteer();
  } catch {
    console.error('Instale puppeteer: npm install puppeteer --save-dev');
    process.exit(1);
  }

  // Filtro opcional: TB_SCREENSHOT_DEVICES="phone,tablet-7" (default: todos).
  const only = (process.env.TB_SCREENSHOT_DEVICES || '').trim();
  const wanted = only ? new Set(only.split(/[,\s]+/)) : null;
  const devices = wanted ? DEVICES.filter((d) => wanted.has(d.dir)) : DEVICES;

  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: null });
  for (const device of devices) await captureDevice(browser, device);
  await browser.close();
  console.log('\nScreenshots salvos em play-store/assets/screenshots/phone/');
}

main().catch((e) => {
  console.error(e.message);
  console.error('\nInicie o servidor: npx serve www -l 8765');
  process.exit(1);
});
