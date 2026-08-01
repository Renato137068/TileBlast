/**
 * Matriz i18n PT/EN/ES — fluxo crítico + overflow + strings longas (P4.2).
 * Uso: node tests/e2e/i18n-matrix.mjs [url]
 */
import { createRequire } from 'module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  assertNoHorizontalOverflow,
  dismissOverlays,
  goMap,
  longLocaleSeed,
  openShop,
  setLang,
  startLevel,
  waitForBoot,
} from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const BASE = process.argv[2] || process.env.TB_TEST_URL || 'http://localhost:8080/';
const LANGS = ['pt', 'en', 'es'];
const OVERFLOW_SELECTORS = [
  '#screen-map .map-top',
  '#map-title',
  '#map-sub',
  '#map-meta',
  '#screen-shop',
  '#shop-title',
  '#hud-obj',
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

const EXPECTED = {
  pt: { play: /jogar/i, shop: /loja/i },
  en: { play: /play/i, shop: /shop/i },
  es: { play: /jugar/i, shop: /tienda/i },
};

export async function runI18nMatrix(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const shotRoot = join(root, 'screenshots', 'i18n');
  mkdirSync(shotRoot, { recursive: true });

  try {
    for (const lang of LANGS) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

      await page.evaluateOnNewDocument((seed) => {
        localStorage.setItem('tbv4', JSON.stringify(seed));
      }, longLocaleSeed(lang));

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await waitForBoot(page);
      await dismissOverlays(page);
      await setLang(page, lang);

      const labels = await page.evaluate(() => {
        const lang =
          (typeof ld === 'function' && ld().lang) ||
          document.documentElement.lang?.slice(0, 2) ||
          '';
        return {
          play: document.getElementById('map-play-btn')?.textContent || '',
          shop: document.querySelector('#map-shop-btn .qlabel')?.textContent || '',
          lang: String(lang).slice(0, 2),
          title: document.getElementById('map-title')?.textContent || '',
        };
      });

      assert(labels.lang === lang || labels.lang.startsWith(lang), `Idioma ${labels.lang} !== ${lang}`);
      assert(EXPECTED[lang].play.test(labels.play), `Play btn [${lang}]: "${labels.play}"`);
      assert(EXPECTED[lang].shop.test(labels.shop), `Shop btn [${lang}]: "${labels.shop}"`);

      await assertNoHorizontalOverflow(page, OVERFLOW_SELECTORS);
      const dir = join(shotRoot, lang);
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: join(dir, '01-map.png'), fullPage: false });

      await openShop(page);
      await assertNoHorizontalOverflow(page, ['#screen-shop', '#shop-title', '.shop-section-title']);
      await page.screenshot({ path: join(dir, '02-shop.png'), fullPage: false });

      await goMap(page);
      await startLevel(page, 0);
      await assertNoHorizontalOverflow(page, ['#screen-game', '#hud-obj', '#pu-bar']);
      await page.screenshot({ path: join(dir, '03-game.png'), fullPage: false });

      assert(errors.length === 0, `Erros JS [${lang}]: ${errors.join(' | ')}`);
      await page.close();
      console.log(`E2E i18n ${lang} OK (shots → screenshots/i18n/${lang}/)`);
    }
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/i18n-matrix.mjs')) {
  runI18nMatrix(BASE).catch((e) => {
    console.error('E2E i18n-matrix FALHOU:', e.message);
    process.exit(1);
  });
}
