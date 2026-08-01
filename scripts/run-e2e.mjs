/**
 * Sobe servidor local (se necessário) e roda smoke E2E.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSmoke } from '../tests/e2e/smoke.mjs';
import { runGameplay } from '../tests/e2e/gameplay.mjs';
import { runWin } from '../tests/e2e/win.mjs';
import { runLoss } from '../tests/e2e/loss.mjs';
import { runProgress } from '../tests/e2e/progress.mjs';
import { runMap } from '../tests/e2e/map.mjs';
import { runOnboarding } from '../tests/e2e/onboarding.mjs';
import { runHomeDensity } from '../tests/e2e/home-density.mjs';
import { runA11y } from '../tests/e2e/a11y.mjs';
import { runI18nMatrix } from '../tests/e2e/i18n-matrix.mjs';
import { runLifecycle } from '../tests/e2e/lifecycle.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const port = process.env.TB_TEST_PORT || '8080';
const base = `http://localhost:${port}/`;

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', 'serve', 'www', '-l', port], {
      cwd: root,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error('Servidor local não subiu a tempo'));
    }, 20000);
    child.stdout.on('data', (buf) => {
      const t = buf.toString();
      if (t.includes('Accepting connections') && !ready) {
        ready = true;
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on('data', (buf) => {
      const t = buf.toString();
      if (t.includes('Accepting connections') && !ready) {
        ready = true;
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on('error', reject);
  });
}

async function main() {
  let child = null;
  const owned = !(await isUp(base));
  if (owned) {
    console.log(`Subindo servidor em ${base}...`);
    child = await startServer();
    await new Promise((r) => setTimeout(r, 800));
  }
  try {
    await runSmoke(base);
    await runOnboarding(base);
    await runHomeDensity(base);
    await runGameplay(base);
    await runWin(base);
    await runLoss(base);
    await runProgress(base);
    await runMap(base);
    await runA11y(base);
    await runI18nMatrix(base);
    await runLifecycle(base);
  } finally {
    if (child) {
      // No Windows (shell:true) kill() mata só o cmd; derruba a árvore inteira
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill();
      }
    }
  }
  console.log('E2E: todos os testes OK');
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  }
);
