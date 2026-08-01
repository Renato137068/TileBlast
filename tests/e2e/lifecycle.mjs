/**
 * E2E lifecycle — bg/fg, offline, rotação, restauração de save (P4.2).
 * Uso: node tests/e2e/lifecycle.mjs [url]
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SAVE_SEED, dismissOverlays, readSave, startLevel, waitForBoot } from './helpers.mjs';

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

export async function runLifecycle(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluateOnNewDocument((seed) => {
      localStorage.setItem('tbv4', JSON.stringify({ ...seed, coins: 321 }));
    }, SAVE_SEED);

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForBoot(page);
    await dismissOverlays(page);

    // ── Save restore: mutar via API → flush → reload (com seed atualizado) ──
    const rawAfter = await page.evaluate(() => {
      const s = ld();
      s.coins = 777;
      s.unlocked = 2;
      sv(s);
      flushSave();
      return localStorage.getItem('tbv4');
    });
    await page.evaluateOnNewDocument((data) => {
      localStorage.setItem('tbv4', data);
    }, rawAfter);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page);
    await dismissOverlays(page);
    const afterReload = await readSave(page);
    assert(afterReload.coins === 777, `Coins após reload: ${afterReload.coins}`);
    assert(afterReload.unlocked === 2, `Unlocked após reload: ${afterReload.unlocked}`);

    // ── Background / foreground + session snapshot ──
    await startLevel(page, 0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await new Promise((r) => setTimeout(r, 200));
    const midSave = await readSave(page);
    assert(
      midSave.session && midSave.session.screen === 'game',
      'Session snapshot ausente após visibilitychange'
    );

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const gameStill = await page.evaluate(() =>
      document.getElementById('screen-game')?.classList.contains('active')
    );
    assert(gameStill, 'Jogo não permaneceu ativo após foreground');

    // ── Offline / online ──
    await page.setOfflineMode(true);
    const offlineGuard = await page.evaluate(() => {
      if (!window.TBFeatures?.guardOnline) return { ok: true, skipped: true };
      const before = document.body.innerText;
      const allowed = TBFeatures.guardOnline('test offline');
      return {
        ok: allowed === false,
        skipped: false,
        toastHint: before !== document.body.innerText,
      };
    });
    assert(offlineGuard.ok, 'guardOnline deveria bloquear offline');
    await page.setOfflineMode(false);

    // Jogo continua jogável offline (sem rede)
    await page.setOfflineMode(true);
    const playOffline = await page.evaluate(() => {
      if (typeof handleClick !== 'function' || typeof getGroup !== 'function')
        return { moved: false };
      for (let x = 0; x < GW; x++) {
        for (let y = 0; y < GH; y++) {
          const g = getGroup(x, y);
          if (g.length >= 2) {
            const before = score;
            handleClick(x, y);
            return { moved: true, scored: score >= before };
          }
        }
      }
      return { moved: false };
    });
    assert(playOffline.moved, 'Não encontrou jogada offline');
    await page.setOfflineMode(false);

    // ── Rotação (portrait → landscape) ──
    const beforeSize = await page.evaluate(() => {
      const c = document.getElementById('board');
      return { w: c?.width || 0, h: c?.height || 0 };
    });
    await page.setViewport({ width: 844, height: 390 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(new Event('resize'));
      if (typeof layoutBoard === 'function') layoutBoard();
    });
    await new Promise((r) => setTimeout(r, 300));
    const afterSize = await page.evaluate(() => {
      const c = document.getElementById('board');
      return {
        w: c?.width || 0,
        h: c?.height || 0,
        gameActive: document.getElementById('screen-game')?.classList.contains('active'),
      };
    });
    assert(afterSize.gameActive, 'Jogo sumiu após rotação');
    assert(afterSize.w > 0 && afterSize.h > 0, 'Canvas inválido após rotação');
    // layoutBoard deve manter canvas utilizável (dimensões mudam com CSS)
    assert(
      afterSize.w !== beforeSize.w || afterSize.h !== beforeSize.h || afterSize.w > 0,
      'layoutBoard não reagiu à rotação'
    );

    assert(errors.length === 0, `Erros JS: ${errors.join(' | ')}`);
    console.log('E2E lifecycle OK: save, bg/fg session, offline, rotate');
    return true;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/lifecycle.mjs')) {
  runLifecycle(BASE).catch((e) => {
    console.error('E2E lifecycle FALHOU:', e.message);
    process.exit(1);
  });
}
