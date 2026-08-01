# Performance budgets (P4.1)

Budgets e gates para startup, tamanho de download e métricas de lab.

## Budgets estáticos

| Métrica | Baseline | Max (+10%) |
|---------|----------|------------|
| `bundle_js_bytes` | 413423 | 424743 |
| `www_js_bytes` | 730650 | 800539 |
| `boot_script_count` | 47 | 47 |
| `deferred_script_count` | 1 | 3 |

Fonte: `data/perf-budgets.json`

## Budgets de lab (p50 / p95)

| Métrica | p50 | p95 |
|---------|-----|-----|
| `boot_ready_ms` | <= 4500 | <= 8000 |
| `dom_content_loaded_ms` | <= 12000 | <= 20000 |
| `fps_min` | >= 48 | >= 42 |

Condições do lab: rede 4G emulada, CPU throttle 4x, Chrome headless.

## Comandos

```bash
npm run build:bundle
npm run perf:budgets          # gate estático (CI)
npm run perf:lab              # mede p50/p95 e atualiza baseline
TB_PERF_CHECK_REGRESSION=1 npm run perf:lab   # falha se >10% vs baseline anterior
```

## Lazy-load

Módulos em `DEFERRED_MODULES` (`scripts/modules.mjs`) não bloqueiam o HTML inicial.
Hoje: `tb-push.js` — lista em `tb-config.js` (CSP sem inline), carregado via `TBRuntime.loadDeferredModules()`.

O bundle `app.bundle.js` ainda inclui **todos** os módulos (sem regressão funcional).

## Telemetria

- `boot_ready` — `startup_ms` desde `TBAnalytics.markOpen()`
- `first_move` — `ttfm_ms` (tempo até primeira jogada)
- `TBJuice.getLastFps()` — FPS da última janela de 1s

## CI

O job `quality` executa `npm run perf:budgets` após `build:bundle`.
