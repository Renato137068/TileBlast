/**
 * Minifica módulos JS em www/ (release).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { MODULES } from './modules.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
const files = MODULES;

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const path = join(www, file);
  if (!existsSync(path)) continue;
  const src = readFileSync(path, 'utf8');
  const out = transformSync(src, { minify: true, loader: 'js' });
  writeFileSync(path, out.code);
  totalBefore += src.length;
  totalAfter += out.code.length;
  console.log(`  ${file}: ${src.length} → ${out.code.length} bytes`);
}

console.log(
  `Minificado www/: ${totalBefore} → ${totalAfter} bytes (−${Math.round((1 - totalAfter / totalBefore) * 100)}%)`
);
