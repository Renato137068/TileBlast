/**
 * Auto-auditoria local — roda testes e sinaliza bloqueadores de release.
 * Modo DEV por padrão (placeholders AdMob/Firebase = avisos).
 * Use `npm run release:gate -- --release` antes do AAB.
 *
 * Flags:
 *   --skip-tests  não roda npm test (útil no CI quando coverage já rodou)
 *   --report      grava play-store/reports/self-audit-latest.json
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReleaseGate } from './release-gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skipTests = process.argv.includes('--skip-tests');
const writeReport = process.argv.includes('--report');
const warnings = [];
const errors = [];

function read(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

console.log('=== Tile Blast — auto-auditoria ===\n');

if (!skipTests) {
  try {
    execSync('npm test', { cwd: root, stdio: 'inherit' });
    console.log('\n✓ Testes unitários/integração OK');
  } catch {
    errors.push('Testes unitários falharam (npm test)');
  }
} else {
  console.log('⏭ Testes pulados (--skip-tests)');
}

try {
  execSync('npm run sync:www', { cwd: root, stdio: 'pipe' });
  execSync('node scripts/validate-versions.mjs', { cwd: root, stdio: 'pipe' });
  console.log('✓ Versões consistentes (+ sync:www)');
} catch {
  errors.push('Versões inconsistentes — rode npm run sync:www');
}

const gate = runReleaseGate({ mode: 'dev' });
warnings.push(...gate.warnings);
errors.push(...gate.blockers);

try {
  execSync('node scripts/validate-content.mjs', { cwd: root, stdio: 'pipe' });
  console.log('✓ Catálogo de conteúdo OK');
} catch {
  warnings.push('content:validate falhou — rode npm run content:validate');
}

const html = read('tile_blast.html');
if (/complete 50 fases/i.test(html)) {
  errors.push('tile_blast.html ainda menciona "50 fases" na meta/descrição');
}

const sw = read('sw.js');
if (!sw.includes('tb-roadmap.js')) warnings.push('sw.js não cacheia módulos JS');

const report = {
  generatedAt: new Date().toISOString(),
  skipTests,
  version: gate.version,
  errors,
  warnings,
  gate,
  ok: errors.length === 0,
};

console.log('');
if (warnings.length) {
  console.log('Avisos:');
  warnings.forEach((w) => console.log('  ⚠', w));
}
if (errors.length) {
  console.log('\nErros:');
  errors.forEach((e) => console.log('  ✗', e));
}

if (writeReport) {
  const outDir = join(root, 'play-store', 'reports');
  mkdirSync(outDir, { recursive: true });
  const latest = join(outDir, 'self-audit-latest.json');
  writeFileSync(latest, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nRelatório: ${relative(root, latest)}`);
}

if (errors.length) process.exit(1);
console.log('\n✓ Auto-auditoria concluída sem erros bloqueantes.');
if (warnings.length) {
  console.log(
    '  (Placeholders de AdMob/Firebase são esperados em DEV — use release:gate --release antes do AAB.)'
  );
}
