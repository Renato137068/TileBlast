/**
 * Checklist automatizado antes de publicar na Play Store.
 * Sempre roda o gate em modo RELEASE (placeholders = falha).
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blockers = [];
const warnings = [];

console.log('=== Tile Blast — pré-publicação ===\n');

try {
  execSync('npm run build:bundle', { cwd: root, stdio: 'inherit' });
} catch {
  blockers.push('build:bundle falhou');
}

try {
  execSync('npm test', { cwd: root, stdio: 'inherit' });
} catch {
  blockers.push('Testes unitários falharam');
}

try {
  execSync('node scripts/run-e2e.mjs', { cwd: root, stdio: 'inherit' });
} catch {
  blockers.push('Testes E2E falharam');
}

try {
  execSync('node scripts/validate-versions.mjs', { cwd: root, stdio: 'inherit' });
} catch {
  blockers.push('Versões inconsistentes — rode npm run sync:www');
}

try {
  execSync('node scripts/release-gate.mjs --release --report', { cwd: root, stdio: 'inherit' });
} catch {
  blockers.push('release-gate (RELEASE) falhou — veja play-store/reports/release-gate-latest.json');
}

console.log('\n--- Resumo ---');
if (warnings.length) {
  console.log('\nAvisos:');
  warnings.forEach((w) => console.log('  ⚠', w));
}
if (blockers.length) {
  console.log('\nBloqueadores:');
  blockers.forEach((b) => console.log('  ✗', b));
  process.exit(1);
}
console.log('\n✓ Pronto para build de release (npm run play:bundle)');
