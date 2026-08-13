/**
 * Ritual semanal soft launch (P4.3) — agrega artefatos locais num relatório.
 * Uso: npm run ops:weekly
 * Não substitui Play Console; marca MISSING onde não há dado.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'play-store', 'reports');
const outFile = join(outDir, 'soft-launch-latest.md');

function readJson(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function fileAgeDays(path) {
  if (!existsSync(path)) return null;
  return Math.round((Date.now() - statSync(path).mtimeMs) / 86400000);
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  const gate = readJson(join(outDir, 'release-gate-latest.json'));
  const perf = readJson(join(outDir, 'perf-baseline.json'));
  const audit = existsSync(join(outDir, 'audit-latest.md'));
  const budgetsOk = existsSync(join(root, 'data', 'perf-budgets.json'));

  let appVer = 'unknown';
  try {
    const mainJs = readFileSync(join(root, 'tb-main.js'), 'utf8');
    const m = mainJs.match(/APP_VERSION\s*=\s*'([^']+)'/);
    if (m) appVer = m[1];
  } catch {
    /* ignore */
  }

  const gateStatus = gate?.ok === true ? 'OK' : gate ? 'FAIL/WARN' : 'MISSING';
  const perfAge = fileAgeDays(join(outDir, 'perf-baseline.json'));

  const md = `# Soft launch report — ${today}

Build: **${appVer}**  
Gerado por: \`npm run ops:weekly\`

## Decisão da semana

- [ ] **Hold** — manter coorte atual
- [ ] **Scale** — expandir testes (só com métricas abaixo verdes)
- [ ] **Rollback** — reverter conteúdo/remote config/feature

Critério usado: _preencher_

## Métricas

| Métrica | Valor | Fonte | Status |
|---------|-------|-------|--------|
| Crash-free | MISSING | Play Console | MISSING |
| ANR | MISSING | Play Console | MISSING |
| D1 retention | MISSING | Analytics / Play | MISSING |
| Win rate early | MISSING | Funil TBAnalytics | MISSING |
| TTFM p50 | MISSING | first_move | MISSING |
| Ads / IAP health | MISSING | Console / Functions | MISSING |
| Release gate | ${gateStatus} | play-store/reports/release-gate-latest.json | ${gate ? 'LOCAL' : 'MISSING'} |
| Perf lab age (days) | ${perfAge ?? 'MISSING'} | perf-baseline.json | ${perf ? 'LOCAL' : 'MISSING'} |
| Perf budgets file | ${budgetsOk ? 'present' : 'MISSING'} | data/perf-budgets.json | ${budgetsOk ? 'OK' : 'MISSING'} |
| Audit report | ${audit ? 'present' : 'MISSING'} | audit-latest.md | ${audit ? 'OK' : 'MISSING'} |

## Lab perf (se disponível)

${
  perf?.lab
    ? '```json\n' + JSON.stringify(perf.lab, null, 2) + '\n```'
    : '_Rodar `npm run perf:lab` para preencher._'
}

## Top ações (próximos 7 dias)

1. …
2. …
3. …

## Rollback log

| Data | O que | Motivo | Resultado |
|------|-------|--------|-----------|
| | | | |

## Notas

- Preencher linhas MISSING com Play Console / painel de analytics.
- Skill Cursor: \`tileblast-soft-launch\`. Checklist: \`docs/SOFT-LAUNCH-RITUAL.md\`.
`;

  writeFileSync(outFile, md);
  console.log('✓ Soft launch report →', outFile);
}

main();
