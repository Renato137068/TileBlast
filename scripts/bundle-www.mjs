/**
 * bundle-www.mjs — versão de PRODUÇÃO do index: troca as 18 tags
 * <script src="tb-*.js"> por um único <script src="app.bundle.js">.
 *
 * Seguro: o bundle é a concatenação byte-a-byte dos mesmos módulos na
 * mesma ordem (provado por tests/integration/bundle.test.js), então o
 * navegador executa exatamente o mesmo código — só que em 1 requisição.
 *
 * Uso (produção):  npm run build:prod
 * O dev (`serve:pwa`) continua com as 18 tags para depuração por arquivo.
 *
 * Exporta `bundleIndexHtml(html, modules)` (pura) para teste.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES } from './modules.mjs';

/** Substitui o bloco de tags de módulo por uma única tag do bundle. */
export function bundleIndexHtml(html, modules) {
  let out = html;
  let inserted = false;
  for (const m of modules) {
    const tag = `<script src="${m}"></script>`;
    if (!out.includes(tag)) continue;
    if (!inserted) {
      out = out.replace(tag, '<script src="app.bundle.js"></script>');
      inserted = true;
    } else {
      out = out.replace(tag + '\n', '').replace(tag, '');
    }
  }
  return out;
}

// CLI: aplica no www/index.html gerado.
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const idx = path.join(root, 'www', 'index.html');
  const bundle = path.join(root, 'www', 'app.bundle.js');
  if (!fs.existsSync(bundle)) {
    console.error('www/app.bundle.js ausente — rode `node scripts/build-bundle.mjs` antes.');
    process.exit(1);
  }
  const html = fs.readFileSync(idx, 'utf8');
  const bundled = bundleIndexHtml(html, MODULES);
  fs.writeFileSync(idx, bundled);
  const remaining = MODULES.filter((m) => bundled.includes(`<script src="${m}"></script>`)).length;
  console.log(
    `www/index.html: 18 tags → 1 (app.bundle.js). Tags de módulo restantes: ${remaining}`
  );
}
