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
const outDir = join(root, 'play-store', 'assets', 'screenshots', 'phone');
const BASE = process.env.TB_SCREENSHOT_URL || 'http://localhost:8080/index.html';

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

async function main() {
  mkdirSync(outDir, { recursive: true });
  let puppeteer;
  try {
    puppeteer = await loadPuppeteer();
  } catch {
    console.error('Instale puppeteer: npm install puppeteer --save-dev');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  console.log('Abrindo', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await dismissModals(page);

  const shots = [
    { file: 'phone-01.png', action: async () => {} },
    {
      file: 'phone-02.png',
      action: async () => {
        await page.click('#map-play-btn');
        await page.waitForSelector('#screen-game.active', { timeout: 10000 });
        await page.evaluate(() => {
          const cd = document.getElementById('cd');
          if (cd) cd.classList.remove('show');
        });
        await new Promise((r) => setTimeout(r, 500));
      },
    },
    {
      file: 'phone-03.png',
      action: async () => {
        await page.evaluate(() => {
          if (typeof goToMap === 'function') goToMap();
          else if (typeof showScreen === 'function') showScreen('map');
        });
        await page.waitForSelector('#screen-map.active', { timeout: 8000 });
        await page.click('#map-shop-btn, #map-coll-btn').catch(() => page.click('#map-shop-btn'));
        await page.waitForSelector('#screen-shop.active', { timeout: 8000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 400));
      },
    },
    {
      file: 'phone-04.png',
      action: async () => {
        await page.evaluate(() => {
          if (typeof showScreen === 'function') showScreen('map');
        });
        await page.waitForSelector('#screen-map.active', { timeout: 8000 });
        await page.click('#map-daily-puzzle-btn');
        await page.waitForSelector('#global-modal.show', { timeout: 8000 });
      },
    },
  ];

  for (const s of shots) {
    await s.action();
    const path = join(outDir, s.file);
    await page.screenshot({ path, type: 'png' });
    console.log('OK', path);
  }

  await browser.close();
  console.log('\nScreenshots salvos em play-store/assets/screenshots/phone/');
}

main().catch((e) => {
  console.error(e.message);
  console.error('\nInicie o servidor: npx serve www -l 8765');
  process.exit(1);
});
