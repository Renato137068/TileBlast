/**
 * Valida consistência de versão entre HTML, Gradle e service worker.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const html = read('tile_blast.html');
const gradle = read('android/app/build.gradle');
const wwwSw = existsSync(join(root, 'www/sw.js')) ? read('www/sw.js') : '';

const htmlVer = read('tb-main.js').match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
const gradleVer = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const gradleCode = gradle.match(/versionCode\s+(\d+)/)?.[1];

if (!htmlVer) errors.push('APP_VERSION não encontrado em tile_blast.html');
if (!gradleVer) errors.push('versionName não encontrado em build.gradle');
if (htmlVer && gradleVer && htmlVer !== gradleVer) {
  errors.push(`Versão divergente: HTML=${htmlVer}, Gradle=${gradleVer}`);
}

if (htmlVer && wwwSw) {
  const expected = `tileblast-v${htmlVer.replace(/\./g, '')}`;
  if (!wwwSw.includes(expected)) {
    errors.push(`www/sw.js cache não sincronizado (esperado ${expected}) — rode npm run sync:www`);
  }
}

if (gradleCode && parseInt(gradleCode, 10) < 1) {
  errors.push('versionCode inválido');
}

console.log('=== Validação de versões ===');
console.log(`  HTML:    ${htmlVer || '?'}`);
console.log(`  Gradle:  ${gradleVer || '?'} (code ${gradleCode || '?'})`);
if (wwwSw && htmlVer) {
  console.log(`  SW cache: tileblast-v${htmlVer.replace(/\./g, '')}`);
}

if (errors.length) {
  console.error('\nErros:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}
console.log('\n✓ Versões consistentes');
