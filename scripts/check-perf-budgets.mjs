/**
 * Verifica budgets estáticos de performance (P4.1).
 * Uso: npm run build:bundle && npm run perf:budgets
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES, BOOT_MODULES, DEFERRED_MODULES } from './modules.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const budgetsPath = join(root, 'data', 'perf-budgets.json');
const bundlePath = join(root, 'www', 'app.bundle.js');
function sumModuleBytes(files) {
  let total = 0;
  for (const file of files) {
    const path = join(root, file);
    if (!existsSync(path)) throw new Error(`Módulo ausente: ${file}`);
    total += statSync(path).size;
  }
  return total;
}

function readHtmlBootScripts() {
  const html = readFileSync(join(root, 'tile_blast.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+\.js)"/g)].map((m) => m[1]);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function checkStatic(budgets) {
  const failures = [];
  const metrics = {};

  if (!existsSync(bundlePath)) {
    failures.push('www/app.bundle.js ausente — rode npm run build:bundle');
  } else {
    const bundleBytes = statSync(bundlePath).size;
    metrics.bundle_js_bytes = bundleBytes;
    if (bundleBytes > budgets.static.bundle_js_bytes.max) {
      failures.push(
        `bundle_js_bytes ${bundleBytes} > max ${budgets.static.bundle_js_bytes.max}`
      );
    }
  }

  const wwwJsBytes = sumModuleBytes(MODULES);
  metrics.www_js_bytes = wwwJsBytes;
  if (wwwJsBytes > budgets.static.www_js_bytes.max) {
    failures.push(`www_js_bytes ${wwwJsBytes} > max ${budgets.static.www_js_bytes.max}`);
  }

  const htmlScripts = readHtmlBootScripts();
  metrics.boot_script_count = htmlScripts.length;
  if (htmlScripts.length !== BOOT_MODULES.length) {
    failures.push(
      `boot_script_count HTML=${htmlScripts.length} !== BOOT_MODULES=${BOOT_MODULES.length}`
    );
  }
  if (htmlScripts.join('|') !== BOOT_MODULES.join('|')) {
    failures.push('ordem dos <script> no HTML !== BOOT_MODULES');
  }
  if (htmlScripts.length > budgets.static.boot_script_count.max) {
    failures.push(
      `boot_script_count ${htmlScripts.length} > max ${budgets.static.boot_script_count.max}`
    );
  }

  metrics.deferred_script_count = DEFERRED_MODULES.length;
  if (DEFERRED_MODULES.length > budgets.static.deferred_script_count.max) {
    failures.push(
      `deferred_script_count ${DEFERRED_MODULES.length} > max ${budgets.static.deferred_script_count.max}`
    );
  }

  for (const mod of DEFERRED_MODULES) {
    if (!MODULES.includes(mod)) failures.push(`DEFERRED_MODULES inválido: ${mod}`);
    if (htmlScripts.includes(mod)) failures.push(`módulo adiado ainda no HTML: ${mod}`);
  }

  const cfg = readFileSync(join(root, 'tb-config.js'), 'utf8');
  const cfgDeferred = cfg.match(/__TB_DEFERRED_MODULES__\s*=\s*(\[[^\]]*\])/);
  if (!cfgDeferred) {
    failures.push('tb-config.js sem __TB_DEFERRED_MODULES__');
  } else {
    const parsed = JSON.parse(cfgDeferred[1].replace(/'/g, '"'));
    if (parsed.join('|') !== DEFERRED_MODULES.join('|')) {
      failures.push('tb-config __TB_DEFERRED_MODULES__ !== DEFERRED_MODULES do manifesto');
    }
  }

  return { failures, metrics };
}

function main() {
  const budgets = loadJson(budgetsPath);
  const staticResult = checkStatic(budgets);
  const failures = [...staticResult.failures];

  const report = {
    generated_at: new Date().toISOString(),
    version: budgets.version,
    static: staticResult.metrics,
    ok: failures.length === 0,
    failures,
  };

  console.log(JSON.stringify(report, null, 2));
  if (failures.length) {
    console.error('\n✗ Perf budgets FALHARAM:');
    for (const f of failures) console.error('  -', f);
    process.exit(1);
  }
  console.log('\n✓ Perf budgets OK');
}

main();
