/**
 * Gate de confiança de release (P0.1).
 *
 * Modos:
 *   dev     — avisos para placeholders (CI/local); não bloqueia AAB smoke
 *   release — placeholders AdMob/Firebase/IDS/keystore viram bloqueadores
 *
 * Uso:
 *   node scripts/release-gate.mjs              # dev
 *   node scripts/release-gate.mjs --release    # release (TB_RELEASE=1 também)
 *   node scripts/release-gate.mjs --release --sync --report
 *
 * Aceite:
 *   - Dev continua OK offline com placeholders
 *   - Release com placeholders falha antes do AAB
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlayStore } from './play-store-validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADMOB_TEST_PUB = '3940256099942544';

const argv = process.argv.slice(2);
const isRelease =
  argv.includes('--release') ||
  process.env.TB_RELEASE === '1' ||
  process.env.TB_ENV === 'production';
const doSync = argv.includes('--sync');
const writeReport = argv.includes('--report') || isRelease;

/**
 * @param {string} filePath
 * @returns {string|null}
 */
function fileHash(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash('sha256').update(readFileSync(filePath)).digest('hex').slice(0, 16);
}

/**
 * Paridade raiz ↔ www para arquivos espelhados pelo sync.
 * JSON compara semanticamente (whitespace); demais arquivos por hash.
 * @returns {{ blockers: string[], warnings: string[], checked: number, mismatched: string[] }}
 */
export function checkWwwParity(projectRoot = root) {
  const blockers = [];
  const warnings = [];
  const mismatched = [];
  const pairs = [
    ['tb-main.js', 'www/tb-main.js'],
    ['tb-gameplay.js', 'www/tb-gameplay.js'],
    ['tb-board.js', 'www/tb-board.js'],
    ['tb-retention.js', 'www/tb-retention.js'],
    ['manifest.json', 'www/manifest.json'],
    ['tile_blast.html', 'www/index.html'],
  ];

  function sameContent(srcPath, destPath) {
    if (srcPath.endsWith('.json')) {
      try {
        return (
          JSON.stringify(JSON.parse(readFileSync(srcPath, 'utf8'))) ===
          JSON.stringify(JSON.parse(readFileSync(destPath, 'utf8')))
        );
      } catch {
        return false;
      }
    }
    return fileHash(srcPath) === fileHash(destPath);
  }

  let checked = 0;
  for (const [src, dest] of pairs) {
    const a = join(projectRoot, src);
    const b = join(projectRoot, dest);
    if (!existsSync(a)) continue;
    checked++;
    if (!existsSync(b)) {
      blockers.push(`www ausente: ${dest} (rode npm run sync:www)`);
      mismatched.push(dest);
      continue;
    }
    if (!sameContent(a, b)) {
      mismatched.push(dest);
      blockers.push(`www divergente: ${src} ≠ ${dest} (rode npm run sync:www / build:bundle)`);
    }
  }

  const appVer = (readFileSync(join(projectRoot, 'tb-main.js'), 'utf8').match(
    /APP_VERSION\s*=\s*'([^']+)'/
  ) || [])[1];
  const sw = existsSync(join(projectRoot, 'www/sw.js'))
    ? readFileSync(join(projectRoot, 'www/sw.js'), 'utf8')
    : '';
  if (appVer && sw) {
    const expected = `tileblast-v${appVer.replace(/\./g, '')}`;
    if (!sw.includes(expected)) {
      blockers.push(`www/sw.js cache ≠ ${expected} — rode npm run sync:www`);
    }
  } else if (!sw) {
    warnings.push('www/sw.js ausente');
  }

  return { blockers, warnings, checked, mismatched };
}

/**
 * @returns {Record<string, string>}
 */
function loadAdmobEnv(projectRoot = root) {
  const p = join(projectRoot, 'play-store/console/IDS-PRODUCAO.env');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function isPlaceholderAdMobId(id) {
  if (!id) return true;
  return (
    id.includes('XXXX') ||
    id.includes(ADMOB_TEST_PUB) ||
    /ca-app-pub-0{8,}/.test(id) ||
    id.includes('YYYYYYYYYY') ||
    id.includes('ZZZZZZZZZZ') ||
    id.includes('WWWWWWWWWW')
  );
}

function uniq(arr) {
  return [...new Set(arr)];
}

/**
 * @param {{ mode?: 'dev'|'release', projectRoot?: string }} opts
 */
export function runReleaseGate(opts = {}) {
  const mode = opts.mode || (isRelease ? 'release' : 'dev');
  const projectRoot = opts.projectRoot || root;
  const blockers = [];
  const warnings = [];
  const checklist = [];

  const appVer = (readFileSync(join(projectRoot, 'tb-main.js'), 'utf8').match(
    /APP_VERSION\s*=\s*'([^']+)'/
  ) || [])[1];
  const gradle = readFileSync(join(projectRoot, 'android/app/build.gradle'), 'utf8');
  const versionName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
  const versionCode = (gradle.match(/versionCode\s+(\d+)/) || [])[1];

  checklist.push({
    id: 'versions',
    ok: !!(appVer && versionName && appVer === versionName),
    detail: `APP_VERSION=${appVer} versionName=${versionName} code=${versionCode}`,
  });
  if (!appVer || !versionName) blockers.push('Versão ausente em tb-main.js ou build.gradle');
  else if (appVer !== versionName) {
    blockers.push(`Versão divergente: APP_VERSION=${appVer} ≠ versionName=${versionName}`);
  }

  const store = validatePlayStore(projectRoot, { mode });
  blockers.push(...store.blockers);
  warnings.push(...store.warnings);

  const parity = checkWwwParity(projectRoot);
  if (mode === 'release') blockers.push(...parity.blockers);
  else {
    for (const b of parity.blockers) warnings.push(b);
    warnings.push(...parity.warnings);
  }
  checklist.push({
    id: 'www_parity',
    ok: parity.blockers.length === 0,
    detail: `${parity.checked} arquivos checados, ${parity.mismatched.length} divergentes`,
  });

  const firebaseSrc = existsSync(join(projectRoot, 'firebase-config.js'))
    ? join(projectRoot, 'firebase-config.js')
    : join(projectRoot, 'firebase-config.example.js');
  const firebase = readFileSync(firebaseSrc, 'utf8');
  const firebasePlaceholder = /YOUR_API_KEY/.test(firebase) || /apiKey:\s*['"]YOUR_/.test(firebase);
  checklist.push({
    id: 'firebase',
    ok: !firebasePlaceholder,
    detail: firebasePlaceholder ? 'placeholder' : 'configurado',
  });

  const admobEnv = loadAdmobEnv(projectRoot);
  const hasIdsFile = existsSync(join(projectRoot, 'play-store/console/IDS-PRODUCAO.env'));
  const idsValid =
    hasIdsFile &&
    !isPlaceholderAdMobId(admobEnv.ADMOB_APP_ID) &&
    !isPlaceholderAdMobId(admobEnv.ADMOB_REWARDED) &&
    !isPlaceholderAdMobId(admobEnv.ADMOB_INTERSTITIAL);
  checklist.push({
    id: 'admob_ids_file',
    ok: idsValid,
    detail: !hasIdsFile
      ? 'IDS-PRODUCAO.env ausente'
      : idsValid
        ? 'IDs de produção'
        : 'IDs placeholder/teste',
  });
  if (mode === 'release' && hasIdsFile && !idsValid) {
    blockers.push('IDS-PRODUCAO.env ainda tem IDs placeholder/teste');
  }

  const hasKeystore = existsSync(join(projectRoot, 'android/keystore.properties'));
  checklist.push({
    id: 'keystore',
    ok: hasKeystore,
    detail: hasKeystore ? 'presente' : 'ausente',
  });

  const blockersU = uniq(blockers);
  const warningsU = uniq(warnings).filter((w) => !blockersU.includes(w));

  return {
    generatedAt: new Date().toISOString(),
    mode,
    version: appVer || null,
    versionCode: versionCode ? Number(versionCode) : null,
    artifactHint: 'play-store/release/*.aab (após play:bundle)',
    services: {
      firebase: !firebasePlaceholder,
      admobProduction: !store.info.admobTestIds && idsValid,
      billing: true,
      push: existsSync(join(projectRoot, 'tb-push.js')),
    },
    checklist,
    www: { checked: parity.checked, mismatched: parity.mismatched },
    playStore: store.info,
    blockers: blockersU,
    warnings: warningsU,
    ok: blockersU.length === 0,
  };
}

function printReport(report) {
  console.log(`=== Tile Blast — release-gate (${report.mode}) ===\n`);
  console.log(`Versão: ${report.version} (code ${report.versionCode})`);
  console.log(
    `Serviços: firebase=${report.services.firebase ? 'on' : 'off'} · admobProd=${
      report.services.admobProduction ? 'on' : 'off'
    } · push=${report.services.push ? 'on' : 'off'}`
  );
  console.log('\nChecklist:');
  for (const c of report.checklist) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.id}: ${c.detail}`);
  }
  if (report.warnings.length) {
    console.log('\nAvisos:');
    report.warnings.forEach((w) => console.log('  ⚠', w));
  }
  if (report.blockers.length) {
    console.log('\nBloqueadores:');
    report.blockers.forEach((b) => console.log('  ✗', b));
  }
}

function main() {
  if (doSync) {
    console.log('>> sync:www + bundle…');
    execSync('npm run build:bundle', { cwd: root, stdio: 'inherit' });
  }

  const report = runReleaseGate({ mode: isRelease ? 'release' : 'dev' });
  printReport(report);

  if (writeReport) {
    const outDir = join(root, 'play-store', 'reports');
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = join(outDir, `release-gate-${stamp}.json`);
    const latest = join(outDir, 'release-gate-latest.json');
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(latest, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nRelatório: ${relative(root, latest)}`);
  }

  if (!report.ok) {
    console.log('\n✗ Gate falhou — corrija os bloqueadores antes do AAB.');
    process.exit(1);
  }
  console.log(
    report.mode === 'release'
      ? '\n✓ Gate de RELEASE OK — pronto para AAB.'
      : '\n✓ Gate de DEV OK (placeholders permitidos).'
  );
}

if (process.argv[1] && /release-gate\.mjs$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main();
}
