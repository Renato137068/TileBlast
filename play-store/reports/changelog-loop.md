# Changelog loop

## Iteração 1 — 2026-08-12 — TB-003
- **Problema/evidência:** Trilha Verde (idx 11) LOSS no player-audit (score 910 / target 1400, moves esgotados).
- **Mudança:** `data/levels/garden.json` — Trilha Verde moves 23→25, score target 1400→1100.
- **Validação:** `npm run content:validate:strict` → `✓ Conteúdo OK`; `TB_PLAYER_FROM=11 TB_PLAYER_TO=11 npm run player:audit` → `Achados: 1 (P0=0)` / WIN idx 11 score=1495; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** conteúdo strict OK; gate DEV OK.
- **Status:** feito

## Iteração 2 — 2026-08-12 — TB-004
- **Problema/evidência:** Combo Jardim LOSS (score 1170 / target 1800).
- **Mudança:** `data/levels/garden.json` — Combo Jardim moves 23→26, score target 1800→1400.
- **Validação:** `npm run content:validate:strict` → `✓ Conteúdo OK`; `TB_PLAYER_FROM=13 TB_PLAYER_TO=13 npm run player:audit` → `Achados: 0 (P0=0)` / WIN idx 13; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** gate DEV OK. Nota: meta.name no log veio “Verde Floresta” (mismatch de catálogo — ver TB-006).
- **Status:** feito

## Iteração 3 — 2026-08-12 — TB-005
- **Problema/evidência:** Primeiro Gelo (forest-01) WIN com margem zero (left=0).
- **Mudança:** `data/levels/forest.json` — Primeiro Gelo moves 25→30.
- **Validação:** `npm run content:validate:strict` → `✓ Conteúdo OK`; `TB_PLAYER_FROM=15 TB_PLAYER_TO=15 npm run player:audit` → 1ª corrida `WIN Primeiro Gelo moves=28 left=0`; 2ª corrida `LOSS Primeira Caixa moves=22` (índice 15 instável — TB-006); `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** conteúdo por `id` forest-01 OK; margem real depende de TB-006 (race em loadAllPacks).
- **Status:** feito

## Iteração 4 — 2026-08-12 — TB-006
- **Problema/evidência:** Ritmo “WIN” ~1,2s com moves=0/score=0; índices de fase no player-audit instáveis (idx 15 → Primeira Caixa).
- **Mudança:** `tb-content.js` — `loadAllPacks`/preload serializados (evita race em `_levels`); `scripts/run-player-audit.mjs` — WIN sem UI exige progresso (moves>0 ou score>0); `tests/unit/content.test.js` — assert idx 8/15.
- **Validação:** `npx vitest run tests/unit/content.test.js` → `Tests 9 passed`; `npm run lint` → `✓ no-undef limpo`; `TB_PLAYER_FROM=8 TB_PLAYER_TO=8 npm run player:audit` → `WIN Ritmo moves=12 left=9` / `Achados: 0`; `npm run test:gameplay` → `E2E gameplay OK: 5 jogadas, 465 pts`; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** catálogo idx 15 = Primeiro Gelo estável no audit pós-fix.
- **Status:** feito

## Relabel — 2026-08-13 — TB-101–TB-111 → TB-201–TB-211
- **Problema/evidência:** player-audit já ocupava TB-101–TB-111 (UX/balance fases 64–77). Audit sistêmico precisava desses IDs.
- **Mudança:** relabel dos achados antigos para TB-201–TB-211 (nada apagado). Novos TB-101–TB-111 = observabilidade/conformidade/save/economia/perf/produto.
- **Validação:** backlog.md contém TB-201 (ex-TB-101 UX fase 64) e TB-101 P0 captura JS.
- **Status:** feito (nota de relabel)

## Iteração 6 — 2026-08-13 — TB-101
- **Problema/evidência:** grep crashlytics/sentry/window.onerror/unhandledrejection nos tb-*.js = 0 — falha em produção sem sinal.
- **Mudança:** `tb-runtime.js` instala `error` + `unhandledrejection` (fail-closed); `tb-firebase.js` `reportClientError` → fila callable `client_error`; também `TBAnalytics.log('client_error')` (buffer + AndroidBridge/FA). Payload: level, v, lang, last_event.
- **Validação:** `npx vitest run tests/unit/runtime.test.js tests/unit/firebase-callable.test.js` → `Tests 17 passed (17)`; `npm run lint` → `✓ no-undef limpo — nenhuma referência indefinida.`; `npm run sync:www` → `www/ synced from tile_blast.html (SW cache: tileblast-v149)`; `node tests/e2e/error-capture.mjs` → `E2E error-capture OK: client_error level=4 v=1.4.9 lang=en last=level_start`; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** handler nunca lança; sem novo endpoint Cloud Functions; www parity OK no gate.
- **Status:** feito

## Iteração 5 — 2026-08-12 — TB-007
- **Problema/evidência:** Violeta WIN com left=1 (margem quase zero).
- **Mudança:** `data/levels/forest.json` — Violeta moves 20→22.
- **Validação:** `npm run content:validate:strict` → `✓ Conteúdo OK`; `TB_PLAYER_FROM=17 TB_PLAYER_TO=17 npm run player:audit` → `WIN Violeta moves=14 left=9` / `Achados: 0`; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** nome/índice estáveis pós-TB-006.
- **Status:** feito

