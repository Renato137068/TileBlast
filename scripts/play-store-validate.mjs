/**
 * Validação pura da pasta play-store / Android para publicação.
 * Usada por pre-publish, self-audit e tests/integration/play-readiness.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADMOB_TEST_PUB = '3940256099942544';
const LIMITS = { title: 30, short: 80, full: 4000 };

export function projectRootFrom(metaUrl = import.meta.url) {
  return join(dirname(fileURLToPath(metaUrl)), '..');
}

function read(root, rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function hasMojibake(s) {
  return /Ã.|Â¡|Â¿|â€/.test(s);
}

/**
 * @param {string} root
 * @param {{ mode?: 'dev'|'release' }} [opts]
 * @returns {{ blockers: string[], warnings: string[], info: Record<string, unknown> }}
 */
export function validatePlayStore(root, opts = {}) {
  const mode = opts.mode === 'release' ? 'release' : 'dev';
  const blockers = [];
  const warnings = [];
  const info = {};
  info.mode = mode;

  const locales = ['pt-BR', 'en-US', 'es-419'];
  let campaignLevels = null;
  try {
    const worlds = JSON.parse(read(root, 'data/worlds.json') || '{}');
    campaignLevels = (worlds.worlds || []).reduce((a, w) => a + (w.levelCount || 0), 0);
    info.campaignLevels = campaignLevels;
  } catch {
    warnings.push('data/worlds.json ilegível');
  }

  for (const loc of locales) {
    const base = `play-store/listing/${loc}`;
    const title = read(root, `${base}/title.txt`).trim();
    const short = read(root, `${base}/short-description.txt`).trim();
    const full = read(root, `${base}/full-description.txt`).trim();
    if (!title) blockers.push(`${loc}: title.txt ausente`);
    else if (title.length > LIMITS.title)
      blockers.push(`${loc}: title > ${LIMITS.title} chars (${title.length})`);
    if (!short) blockers.push(`${loc}: short-description ausente`);
    else if (short.length > LIMITS.short)
      blockers.push(`${loc}: short-description > ${LIMITS.short} chars (${short.length})`);
    if (!full) blockers.push(`${loc}: full-description ausente`);
    else if (full.length > LIMITS.full)
      blockers.push(`${loc}: full-description > ${LIMITS.full} chars (${full.length})`);
    for (const [label, text] of [
      ['title', title],
      ['short', short],
      ['full', full],
    ]) {
      if (text && hasMojibake(text))
        blockers.push(`${loc}: ${label} com encoding quebrado (mojibake)`);
    }
    if (campaignLevels && short && !short.includes(String(campaignLevels))) {
      warnings.push(`${loc}: short-description não cita ${campaignLevels} fases (conteúdo atual)`);
    }
    if (campaignLevels && full && !full.includes(String(campaignLevels))) {
      warnings.push(`${loc}: full-description não cita ${campaignLevels} fases (conteúdo atual)`);
    }
  }

  const manifest = read(root, 'android/app/src/main/AndroidManifest.xml');
  const bridge = read(root, 'android/app/src/main/java/com/tileblast/game/TileBlastBridge.java');
  const bridgeRef = read(root, 'android-native/TileBlastBridge.java');
  const testAdMob =
    manifest.includes(ADMOB_TEST_PUB) ||
    bridge.includes(ADMOB_TEST_PUB) ||
    bridgeRef.includes(ADMOB_TEST_PUB);
  info.admobTestIds = testAdMob;
  if (testAdMob) {
    const msg = 'AdMob ainda usa IDs de TESTE — npm run play:admob após IDS-PRODUCAO.env';
    if (mode === 'release') blockers.push(msg);
    else warnings.push(msg);
  }

  if (!existsSync(join(root, 'play-store/console/IDS-PRODUCAO.env'))) {
    const msg = 'IDS-PRODUCAO.env ausente (copie de IDS-PRODUCAO.env.example)';
    if (mode === 'release') blockers.push(msg);
    else warnings.push(msg);
  }

  if (/YOUR_API_KEY/.test(read(root, 'firebase-config.js'))) {
    const msg = 'Firebase não configurado — cloud save/ranking callables inativos';
    if (mode === 'release') blockers.push(msg);
    else warnings.push(msg);
  }

  const icon = join(root, 'play-store/assets/icon-512.png');
  const feat = join(root, 'play-store/assets/feature-graphic-1024x500.png');
  if (!existsSync(icon) || statSync(icon).size < 500)
    blockers.push('icon-512.png ausente/inválido');
  if (!existsSync(feat) || statSync(feat).size < 500)
    blockers.push('feature-graphic-1024x500.png ausente/inválido');

  const phoneDir = join(root, 'play-store/assets/screenshots/phone');
  if (!existsSync(phoneDir)) {
    blockers.push('screenshots/phone ausente');
  } else {
    const real = readdirSync(phoneDir).filter(
      (n) => /^phone-\d+\.png$/i.test(n) && !/PLACEHOLDER/i.test(n)
    );
    info.screenshotCount = real.length;
    if (real.length < 2) blockers.push('Menos de 2 screenshots reais (phone-XX.png)');
    const placeholders = readdirSync(phoneDir).filter((n) => /PLACEHOLDER/i.test(n));
    if (placeholders.length)
      warnings.push(`${placeholders.length} screenshot(s) PLACEHOLDER ainda presentes`);
  }

  // Paridade bridge Android vs referência
  const rew = (src) => (src.match(/REWARDED_AD_UNIT\s*=\s*"([^"]+)"/) || [])[1];
  const inter = (src) => (src.match(/INTERSTITIAL_AD_UNIT\s*=\s*"([^"]+)"/) || [])[1];
  if (
    bridge &&
    bridgeRef &&
    (rew(bridge) !== rew(bridgeRef) || inter(bridge) !== inter(bridgeRef))
  ) {
    warnings.push('AdMob units divergem entre android/…/TileBlastBridge.java e android-native/');
  }

  if (!existsSync(join(root, 'android/keystore.properties'))) {
    const msg = 'android/keystore.properties ausente — necessário para AAB assinado';
    if (mode === 'release') blockers.push(msg);
    else warnings.push(msg);
  }

  return { blockers, warnings, info, LIMITS };
}

/** CLI: node scripts/play-store-validate.mjs [--release] */
if (process.argv[1] && /play-store-validate\.mjs$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const root = projectRootFrom(import.meta.url);
  const mode =
    process.argv.includes('--release') || process.env.TB_RELEASE === '1' ? 'release' : 'dev';
  const r = validatePlayStore(root, { mode });
  console.log(`=== Play Store validate (${mode}) ===`);
  console.log('info', r.info);
  if (r.warnings.length) {
    console.log('\nAvisos:');
    r.warnings.forEach((w) => console.log('  ⚠', w));
  }
  if (r.blockers.length) {
    console.log('\nBloqueadores:');
    r.blockers.forEach((b) => console.log('  ✗', b));
    process.exit(1);
  }
  console.log('\n✓ Listings/assets OK para checklist técnico');
}
