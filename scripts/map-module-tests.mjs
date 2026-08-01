/**
 * Inventário: cada módulo em scripts/modules.mjs deve aparecer em algum teste.
 * Uso: node scripts/map-module-tests.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES } from './modules.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const testsDir = join(root, 'tests');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const testFiles = walk(testsDir);
const bodies = testFiles.map((p) => ({
  path: relative(root, p).replace(/\\/g, '/'),
  text: readFileSync(p, 'utf8'),
}));

const rows = MODULES.map((m) => {
  const base = m.replace(/\.js$/, '');
  const hits = bodies
    .filter(
      (b) =>
        b.text.includes(`'${m}'`) ||
        b.text.includes(`"${m}"`) ||
        b.text.includes(`\`${m}\``) ||
        b.text.includes(m) ||
        (base !== m && b.text.includes(base))
    )
    .map((b) => b.path);
  return { module: m, tests: [...new Set(hits)] };
});

const missing = rows.filter((r) => r.tests.length === 0);
for (const r of rows) {
  const tag = r.tests.length ? 'OK  ' : 'MISS';
  console.log(
    `${tag} ${r.module.padEnd(22)} ${r.tests.map((t) => t.replace(/^tests\//, '')).join(', ') || '—'}`
  );
}
console.log(`\n${rows.length - missing.length}/${rows.length} modules linked`);
if (missing.length) {
  console.error('Missing:', missing.map((m) => m.module).join(', '));
  process.exitCode = 1;
}
