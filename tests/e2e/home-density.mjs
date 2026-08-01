/**
 * E2E home density — CTAs primários na dobra; hub Mais colapsado.
 * Viewports: 320 / 375 / 412 (+ altura típica).
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { RETURNING_SEED, dismissOverlays, waitForBoot } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const BASE = process.argv[2] || process.env.TB_TEST_URL || 'http://localhost:8080/';

const VIEWPORTS = [
  { w: 320, h: 568, name: '320' },
  { w: 375, h: 667, name: '375' },
  { w: 412, h: 915, name: '412' },
  { w: 768, h: 1024, name: 'tablet' },
];

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

export async function runHomeDensity(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument((seed) => {
        localStorage.setItem('tbv4', JSON.stringify(seed));
      }, RETURNING_SEED);
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await waitForBoot(page);
      await dismissOverlays(page);
      await page.evaluate(() => {
        document.getElementById('splash')?.classList.add('hide');
        document.getElementById('map-more-panel')?.classList.remove('open');
        const mp = document.getElementById('map-more-panel');
        if (mp) mp.hidden = true;
        document.getElementById('map-settings-panel')?.classList.remove('open');
      });

      const layout = await page.evaluate(() => {
        const play = document.getElementById('map-play-btn');
        const daily = document.getElementById('map-daily-puzzle-btn');
        const event = document.getElementById('event-banner');
        const more = document.getElementById('map-more-panel');
        const primary = document.querySelector('.map-primary');
        const bottom = document.querySelector('.map-bottom');
        const vh = window.innerHeight;
        const playBox = play?.getBoundingClientRect();
        const dailyBox = daily?.getBoundingClientRect();
        const eventBox = event?.getBoundingClientRect();
        return {
          playInPrimary: !!(primary && play && primary.contains(play)),
          dailyInPrimary: !!(primary && daily && primary.contains(daily)),
          eventInPrimary: !!(primary && event && primary.contains(event)),
          primaryInBottom: !!(bottom && primary && bottom.contains(primary)),
          moreCollapsed: !!(more && !more.classList.contains('open')),
          playBottom: playBox ? playBox.bottom : -1,
          dailyBottom: dailyBox ? dailyBox.bottom : -1,
          eventBottom: eventBox ? eventBox.bottom : -1,
          vh,
        };
      });

      assert(layout.playInPrimary, `[${vp.name}] Play fora de .map-primary`);
      assert(layout.dailyInPrimary, `[${vp.name}] Diário fora de .map-primary`);
      assert(layout.eventInPrimary, `[${vp.name}] Evento fora de .map-primary`);
      assert(layout.primaryInBottom, `[${vp.name}] .map-primary fora de .map-bottom`);
      assert(layout.moreCollapsed, `[${vp.name}] Hub Mais deveria iniciar colapsado`);
      assert(
        layout.playBottom > 0 && layout.playBottom <= layout.vh + 2,
        `[${vp.name}] Play abaixo da dobra (bottom=${layout.playBottom}, vh=${layout.vh})`
      );
      assert(
        layout.dailyBottom > 0 && layout.dailyBottom <= layout.vh + 2,
        `[${vp.name}] Diário abaixo da dobra (bottom=${layout.dailyBottom})`
      );
      assert(
        layout.eventBottom > 0 && layout.eventBottom <= layout.vh + 2,
        `[${vp.name}] Evento abaixo da dobra (bottom=${layout.eventBottom})`
      );

      await page.close();
    }
    console.log('E2E home-density OK:', VIEWPORTS.map((v) => v.name).join(', '));
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/e2e/home-density.mjs')) {
  runHomeDensity(BASE).catch((e) => {
    console.error('E2E home-density FALHOU:', e.message);
    process.exit(1);
  });
}
