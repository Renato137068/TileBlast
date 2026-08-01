/**
 * E2E onboarding — usuário novo, skip, recorrente e TTFM < 30s.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  FRESH_SEED,
  RETURNING_SEED,
  dismissOverlays,
  playGreedy,
  waitForBoot,
} from './helpers.mjs';

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

async function openWithSeed(browser, baseUrl, seed) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem('tbv4', JSON.stringify(s));
  }, seed);
  const t0 = Date.now();
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await waitForBoot(page);
  return { page, errors, t0 };
}

async function hideSplash(page) {
  await page.evaluate(() => document.getElementById('splash')?.classList.add('hide'));
}

export async function runOnboarding(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // ── Novo: onboarding aparece; Novidades NÃO no boot ──
    {
      const { page, errors } = await openWithSeed(browser, baseUrl, FRESH_SEED);
      await hideSplash(page);
      await new Promise((r) => setTimeout(r, 1500));
      const boot = await page.evaluate(() => {
        const modal = document.getElementById('global-modal');
        const html = modal?.innerHTML || '';
        return {
          mapActive: document.getElementById('screen-map')?.classList.contains('active'),
          modalShow: !!modal?.classList.contains('show'),
          hasWhatsNew: /novidades|what's new|novedades/i.test(html),
        };
      });
      assert(boot.mapActive, 'Mapa deveria estar ativo para usuário novo');
      assert(!boot.hasWhatsNew, 'Novidades não devem aparecer no boot da 1ª sessão');
      await page.evaluate(() => {
        const btn = document.getElementById('map-play-btn');
        if (btn) btn.click();
      });
      await page.waitForFunction(
        () => document.getElementById('screen-game')?.classList.contains('active'),
        { timeout: 12000 }
      );
      await page.waitForFunction(
        () => {
          const modal = document.getElementById('global-modal');
          return (
            modal?.classList.contains('show') &&
            /pular tutorial|skip tutorial|saltar tutorial/i.test(modal.innerHTML || '')
          );
        },
        { timeout: 8000 }
      );
      const save = await page.evaluate(() => {
        if (typeof ld === 'function') return ld();
        if (window.TBSave?.ld) return window.TBSave.ld();
        try {
          const raw = localStorage.getItem('tbv4');
          if (window.TBSecure?.unwrap) return window.TBSecure.unwrap(raw).data || {};
          return JSON.parse(raw || '{}');
        } catch {
          return {};
        }
      });
      assert(!save.tutorialDone, 'tutorialDone ainda false antes do skip/complete');
      assert(!errors.length, `pageerror novo: ${errors.join(' | ')}`);
      await page.close();
    }

    // ── Skip: primeiro movimento < 30s ──
    {
      const { page, errors, t0 } = await openWithSeed(browser, baseUrl, FRESH_SEED);
      await hideSplash(page);
      await page.evaluate(() => {
        const btn = document.getElementById('map-play-btn');
        if (btn) btn.click();
      });
      await page.waitForFunction(
        () =>
          document.getElementById('global-modal')?.classList.contains('show') &&
          /pular tutorial|skip tutorial|saltar tutorial/i.test(
            document.getElementById('global-modal')?.innerHTML || ''
          ),
        { timeout: 10000 }
      );
      await page.evaluate(() => {
        const btn = [
          ...document.querySelectorAll('#global-modal button[data-action="skipOnboarding"]'),
        ][0];
        if (btn) btn.click();
        else
          [...document.querySelectorAll('#global-modal button')]
            .find((b) => /pular|skip|saltar/i.test(b.textContent || ''))
            ?.click();
      });
      await page.waitForFunction(
        () =>
          typeof busy !== 'undefined' && !busy && typeof grid !== 'undefined' && grid.length > 0,
        { timeout: 15000 }
      );
      const coachShown = await page.evaluate(() =>
        document.getElementById('coach-overlay')?.classList.contains('show')
      );
      assert(!coachShown, 'Coach overlay não deve aparecer após skip');
      const play = await playGreedy(page, 5);
      assert(
        play.moves > 0,
        `Esperado ao menos 1 movimento após skip (got ${JSON.stringify(play)})`
      );
      const elapsed = Date.now() - t0;
      assert(elapsed <= 30000, `Primeiro movimento em ${elapsed}ms (limite 30000)`);
      const save = await page.evaluate(() => {
        if (typeof ld === 'function') return ld();
        if (window.TBSave?.ld) return window.TBSave.ld();
        try {
          const raw = localStorage.getItem('tbv4');
          if (window.TBSecure?.unwrap) return window.TBSecure.unwrap(raw).data || {};
          return JSON.parse(raw || '{}');
        } catch {
          return {};
        }
      });
      assert(save.tutorialDone === true, 'tutorialDone após skip');
      assert(save.coachDone === true, 'coachDone após skip');
      assert(!errors.length, `pageerror skip: ${errors.join(' | ')}`);
      await page.close();
    }

    // ── Recorrente: sem onboarding, joga direto ──
    {
      const { page, errors } = await openWithSeed(browser, baseUrl, RETURNING_SEED);
      await dismissOverlays(page);
      await page.evaluate(() => {
        if (typeof startGame === 'function') startGame(4);
      });
      await page.waitForFunction(
        () => document.getElementById('screen-game')?.classList.contains('active'),
        { timeout: 10000 }
      );
      const modalDuring = await page.evaluate(() => {
        const modal = document.getElementById('global-modal');
        if (!modal?.classList.contains('show')) return false;
        return /pular tutorial|skip tutorial|blasty ensina|blasty teaches|blasty enseña/i.test(
          modal.innerHTML || ''
        );
      });
      assert(!modalDuring, 'Recorrente não deve ver onboarding');
      await page.waitForFunction(
        () =>
          typeof busy !== 'undefined' && !busy && typeof grid !== 'undefined' && grid.length > 0,
        { timeout: 15000 }
      );
      const play = await playGreedy(page, 5);
      assert(play.moves > 0, `Recorrente deve conseguir jogar (got ${JSON.stringify(play)})`);
      assert(!errors.length, `pageerror recorrente: ${errors.join(' | ')}`);
      await page.close();
    }

    console.log('E2E onboarding OK');
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/e2e/onboarding.mjs')) {
  runOnboarding(BASE).catch((e) => {
    console.error('E2E onboarding FALHOU:', e.message);
    process.exit(1);
  });
}
