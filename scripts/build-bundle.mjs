/**
 * build-bundle.mjs — gera um bundle único minificado (www/app.bundle.js)
 * a partir dos módulos na ORDEM canônica (scripts/modules.mjs).
 *
 * Por quê: hoje o app carrega 18 <script> separados. Concatená-los na
 * mesma ordem (todos são scripts clássicos, sem import/export) é
 * semanticamente idêntico e reduz 18 requisições → 1.
 *
 * Segurança: cada arquivo é minificado isoladamente (mesma operação já
 * usada no release) e juntado com "\n;" para evitar qualquer efeito de
 * ASI (inserção automática de ponto e vírgula) na fronteira entre arquivos.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { MODULES } from './modules.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'www', 'app.bundle.js');

const chunks = [];
let rawBytes = 0;
for (const file of MODULES) {
  const path = join(root, file);
  if (!existsSync(path)) {
    console.warn(`  (aviso) ausente: ${file}`);
    continue;
  }
  const src = readFileSync(path, 'utf8');
  rawBytes += src.length;
  const out = transformSync(src, { minify: true, loader: 'js' });
  chunks.push(`/* ${file} */\n${out.code}`);
}

const banner = '/* Tile Blast bundle — gerado por build-bundle.mjs. NÃO editar. */\n';
const bundle = banner + chunks.join('\n;');
writeFileSync(outFile, bundle);

console.log(
  `Bundle: ${MODULES.length} módulos → www/app.bundle.js ` +
    `(${rawBytes} → ${bundle.length} bytes, ${Math.round((1 - bundle.length / rawBytes) * 100)}% menor)`
);
