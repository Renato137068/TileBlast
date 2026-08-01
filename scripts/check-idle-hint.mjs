/**
 * Verificação manual: a dica de ociosidade aparece após ~7,5s sem interação?
 * Sobe um servidor em www/, inicia a fase 1 headless, espera o idle e
 * escaneia os pixels do canvas atrás do contorno dourado (#f6b23e).
 * Uso: node scripts/check-idle-hint.mjs
 */
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import { SAVE_SEED, dismissOverlays, startLevel, waitForBoot } from '../tests/e2e/helpers.mjs';

const port = process.env.TB_TEST_PORT || '8123';
const child = spawn('npx', ['--yes', 'serve', 'www', '-l', port], { shell: true, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server timeout')), 20000);
  const on = (buf) => {
    if (String(buf).includes('Accepting')) {
      clearTimeout(t);
      resolve();
    }
  };
  child.stdout.on('data', on);
  child.stderr.on('data', on);
});

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.evaluateOnNewDocument(
  (seed) => localStorage.setItem('tbv4', JSON.stringify(seed)),
  SAVE_SEED
);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle2', timeout: 30000 });
await waitForBoot(page);
await dismissOverlays(page);
await startLevel(page, 3);
await page.waitForFunction(
  () => !document.getElementById('countdown')?.classList.contains('show'),
  {
    timeout: 10000,
  }
);

// Espião: showIdleHint consulta TBLogic.findLargestGroup — se não for chamado
// em ~8s, o timer não foi armado ou os guards retornaram cedo.
const spyCalls = await page.evaluate(
  () =>
    new Promise((res) => {
      const L = window.TBLogic;
      let calls = 0;
      const orig = L.findLargestGroup;
      L.findLargestGroup = (...a) => {
        calls++;
        return orig(...a);
      };
      setTimeout(() => {
        L.findLargestGroup = orig;
        res(calls);
      }, 8600);
    })
);

const countGold = () =>
  page.evaluate(() => {
    const cv = document.getElementById('board');
    const g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [r, gr, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      // tom da dica: rgba(246,178,62,·) — tolerância p/ blend com fundo
      if (a > 40 && Math.abs(r - 246) < 26 && Math.abs(gr - 178) < 26 && Math.abs(b - 62) < 30) n++;
    }
    return n;
  });

const baseline = await countGold();
// espera IDLE_HINT_MS (7,5s) + margem; amostra algumas vezes por causa do pulso
let peak = 0;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 900));
  peak = Math.max(peak, await countGold());
  if (i === 10) {
    const board = await page.$('#board');
    if (board) await board.screenshot({ path: 'idle-hint-check.png' });
  }
}
console.log(
  JSON.stringify(
    // traço fino com blend sobre os tiles: bastam algumas dezenas de pixels novos
    { spyCalls, baseline, peakAfterIdle: peak, hintVisible: peak > baseline + 40, errors },
    null,
    2
  )
);
await browser.close();
child.kill();
process.exit(0);
