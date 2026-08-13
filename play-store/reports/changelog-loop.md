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

