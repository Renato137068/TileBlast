# Soft launch report — 2026-08-12

Build: **1.4.9**  
Gerado por: `npm run ops:weekly`

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
| Release gate | FAIL/WARN | play-store/reports/release-gate-latest.json | LOCAL |
| Perf lab age (days) | 10 | perf-baseline.json | LOCAL |
| Perf budgets file | present | data/perf-budgets.json | OK |
| Audit report | MISSING | audit-latest.md | MISSING |

## Lab perf (se disponível)

```json
{
  "boot_ready_ms": {
    "p50": 232,
    "p95": 258,
    "samples": 3,
    "higher_is_better": false
  },
  "dom_content_loaded_ms": {
    "p50": 11482,
    "p95": 11568,
    "samples": 3,
    "higher_is_better": false
  },
  "fps_min": {
    "p50": 60,
    "p95": 60,
    "samples": 3,
    "higher_is_better": true
  }
}
```

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
- Skill Cursor: `tileblast-soft-launch`. Checklist: `docs/SOFT-LAUNCH-RITUAL.md`.
