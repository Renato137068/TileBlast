/**
 * lint-globals.mjs — porteiro contra bugs de "identificador indefinido".
 *
 * Concatena os módulos na ordem canônica (modelando o escopo global único do
 * runtime) e roda ESLint `no-undef` sobre o resultado. Pega exatamente a classe
 * de bug que quebrou o mapa (`WORLD_CLS is not defined`) — referências a algo
 * que não existe em lugar nenhum — sem o ruído de globais cross-file.
 *
 * Uso: npm run lint
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { MODULES } from './modules.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(root, '.tb-concat.tmp.js');

const concat = MODULES.map(
  (f) => `/* ==== ${f} ==== */\n` + fs.readFileSync(path.join(root, f), 'utf8')
).join('\n;\n');
fs.writeFileSync(tmp, concat);

const res = spawnSync('npx', ['--yes', 'eslint@9', path.basename(tmp)], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

try {
  fs.unlinkSync(tmp);
} catch (e) {
  /* ignore */
}

if (res.status === 0) console.log('✓ no-undef limpo — nenhuma referência indefinida.');
process.exit(res.status ?? 1);
