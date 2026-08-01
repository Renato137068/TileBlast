/**
 * E2E acessibilidade — axe-core (P0/P1) + contraste de tokens CSS + toggles.
 * Uso: node tests/e2e/a11y.mjs [url]
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { SAVE_SEED, dismissOverlays, startLevel, waitForBoot } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const BASE = process.argv[2] || process.env.TB_TEST_URL || 'http://localhost:8080/';

/** Impactos axe que bloqueiam CI (P0/P1). */
const BLOCK_IMPACTS = new Set(['critical', 'serious']);

/** Exclusões: canvas/decorativos (contraste de bitmap não é WCAG útil). */
const AXE_EXCLUDE = [['#board'], ['#confetti-layer'], ['#splash'], ['.mascot-img'], ['#ad-overlay']];

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

function summarizeViolations(results) {
  const blockers = (results.violations || []).filter((v) =>
    (v.impact ? BLOCK_IMPACTS.has(v.impact) : true)
  );
  return blockers.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }));
}

async function runAxe(page, label) {
  const results = await new AxePuppeteer(page)
    .exclude(AXE_EXCLUDE)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blockers = summarizeViolations(results);
  if (blockers.length) {
    const detail = blockers
      .map((b) => `${b.impact}/${b.id}: ${b.help} → ${b.nodes.join(', ')}`)
      .join('\n  ');
    throw new Error(`Axe P0/P1 em ${label}:\n  ${detail}`);
  }
  return { label, passes: results.passes?.length || 0, incomplete: results.incomplete?.length || 0 };
}

/** Contraste relativo WCAG entre duas cores CSS computadas. */
function contrastRatio(fg, bg) {
  function parse(c) {
    const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
  }
  const a = parse(fg);
  const b = parse(bg);
  if (!a || !b) return 0;
  const L = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const L1 = L(a);
  const L2 = L(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

async function checkTokenContrast(page) {
  const colors = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      text: cs.getPropertyValue('--text').trim() || body.color,
      dim: cs.getPropertyValue('--dim').trim() || '',
      accent: cs.getPropertyValue('--accent').trim() || '',
      bg: body.backgroundColor,
    };
  });

  // Resolve variáveis se forem nomes (ex.: #fff) via elemento probe
  const resolved = await page.evaluate((c) => {
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const out = {};
    for (const [k, v] of Object.entries(c)) {
      probe.style.color = v || 'inherit';
      out[k] = getComputedStyle(probe).color;
    }
    probe.style.backgroundColor = c.bg || '#000';
    out.bg = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return out;
  }, colors);

  const textBg = contrastRatio(resolved.text, resolved.bg);
  assert(textBg >= 4.5, `Contraste --text/bg ${textBg.toFixed(2)} < 4.5`);
  if (resolved.dim) {
    const dimBg = contrastRatio(resolved.dim, resolved.bg);
    // Texto secundário: AA large-text floor 3:1; pedimos ≥3
    assert(dimBg >= 3, `Contraste --dim/bg ${dimBg.toFixed(2)} < 3`);
  }
  return { textBg: Math.round(textBg * 100) / 100 };
}

export async function runA11y(baseUrl = BASE) {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await page.evaluateOnNewDocument((seed) => {
      localStorage.setItem('tbv4', JSON.stringify(seed));
    }, SAVE_SEED);

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForBoot(page);
    await dismissOverlays(page);

    const contrast = await checkTokenContrast(page);
    const mapAxe = await runAxe(page, 'map');

    // Abrir settings (toggles a11y)
    await page.evaluate(() => {
      document.getElementById('map-settings-toggle')?.click();
    });
    await page.waitForSelector('#map-settings-panel:not([hidden])', { timeout: 5000 }).catch(() => {});

    await page.evaluate(() => {
      if (window.TBFeatures?.toggleColorBlind) TBFeatures.toggleColorBlind();
      else document.getElementById('map-colorblind-toggle')?.click();
    });
    const cbOn = await page.evaluate(() =>
      document.documentElement.classList.contains('colorblind-mode')
    );
    assert(cbOn, 'Modo daltônico não ativou colorblind-mode');

    await page.evaluate(() => {
      document.getElementById('map-reducemotion-toggle')?.click();
    });
    const rmOn = await page.evaluate(() =>
      document.documentElement.classList.contains('reduce-motion')
    );
    assert(rmOn, 'Reduzir animações não ativou reduce-motion');

    const settingsAxe = await runAxe(page, 'settings');

    await startLevel(page, 0);
    const gameAxe = await runAxe(page, 'game');

    // Teclado no tabuleiro: foco + seta
    await page.focus('#board');
    await page.keyboard.press('ArrowRight');
    const announced = await page.evaluate(() => {
      const el = document.getElementById('board-status');
      return (el && el.textContent) || '';
    });
    assert(announced.length > 0, 'Live region do tabuleiro vazia após navegação por teclado');

    assert(errors.length === 0, `Erros JS: ${errors.join(' | ')}`);
    console.log(
      `E2E a11y OK: map/settings/game axe limpo, contraste text=${contrast.textBg}, kb announce ok`
    );
    return { mapAxe, settingsAxe, gameAxe, contrast };
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tests/e2e/a11y.mjs')) {
  runA11y(BASE).catch((e) => {
    console.error('E2E a11y FALHOU:', e.message);
    process.exit(1);
  });
}
