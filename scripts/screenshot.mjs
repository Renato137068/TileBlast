/**
 * screenshot.mjs — captura telas reais do jogo (viewport mobile) para QA visual.
 *
 * Uso (na sua máquina, onde o Chrome do Puppeteer está disponível):
 *   npm run ui:shots
 *
 * Sobe um servidor estático de www/, carrega o jogo com um save semeado,
 * dispensa overlays e salva PNGs em screenshots/ : mapa, tabuleiro, loja,
 * configurações. Rode antes e depois de mudanças de UI para comparar.
 *
 * Requer Chrome do Puppeteer instalado:  npx puppeteer browsers install chrome
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(root, 'www');
const OUT = path.join(root, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function serve() {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/') u = '/index.html';
    const fp = path.join(WWW, u);
    fs.readFile(fp, (e, d) => {
      if (e) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'text/plain' });
      res.end(d);
    });
  });
  return server;
}

const SEED = {
  tutorialDone: true,
  lastVersionSeen: '1.4.6',
  lastLoginDay: Math.floor(Date.now() / 86400000),
  loginStreak: 3,
  lives: 5,
  unlocked: 8,
  coins: 1240,
  hs: 9500,
  playerName: 'Player',
  stars: { 0: 3, 1: 2, 2: 3, 3: 1, 4: 2, 5: 3, 6: 1, 7: 2 },
};

async function dismiss(page) {
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      document.getElementById('splash')?.classList.add('hide');
      document.querySelectorAll('#global-modal button, #result button').forEach((b) => {
        if (/fechar|coletar|ok|depois|later|close|collect|continuar/i.test(b.textContent || ''))
          b.click();
      });
      document.getElementById('global-modal')?.classList.remove('show');
      document.getElementById('result')?.classList.remove('show');
    });
    await new Promise((r) => setTimeout(r, 300));
  }
}

const shots = [
  ['01-map', async () => {}],
  [
    '02-board',
    async (p) => {
      await p.evaluate(() => {
        if (typeof startGame === 'function') startGame(0);
      });
      await p
        .waitForFunction(
          () => document.getElementById('screen-game')?.classList.contains('active'),
          { timeout: 6000 }
        )
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 900));
    },
  ],
  [
    '03-shop',
    async (p) => {
      await p.evaluate(() => {
        document.getElementById('screen-game')?.classList.remove('active');
        if (typeof openShop === 'function') openShop();
      });
      await new Promise((r) => setTimeout(r, 700));
    },
  ],
];

const server = serve();
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

let browser;
try {
  browser = await puppeteer.launch({
    headless: 'new',
    executablePath: puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-gpu'],
  });
} catch (e) {
  console.error('Chrome do Puppeteer nao encontrado. Rode: npx puppeteer browsers install chrome');
  server.close();
  process.exit(1);
}
const page = await browser.newPage();
await page.setViewport({
  width: 400,
  height: 860,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await page.evaluateOnNewDocument((s) => localStorage.setItem('tbv4', JSON.stringify(s)), SEED);
await page.goto(`http://localhost:${port}/index.html`, {
  waitUntil: 'networkidle2',
  timeout: 20000,
});
await page
  .waitForFunction(() => window.TBRoadmap?.isReady?.() && window.TBFeatures?.isReady?.(), {
    timeout: 12000,
  })
  .catch(() => {});
await dismiss(page);

for (const [name, setup] of shots) {
  await setup(page);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('  ✓ screenshots/' + name + '.png');
}

await browser.close();
server.close();
console.log('Pronto. Telas em: ' + OUT);
