# Changelog loop

## Iteração 2 — 2026-08-12 — TB-004
- **Problema/evidência:** Combo Jardim LOSS (score 1170 / target 1800).
- **Mudança:** `data/levels/garden.json` — Combo Jardim moves 23→26, score target 1800→1400.
- **Validação:** `npm run content:validate:strict` → `✓ Conteúdo OK`; `TB_PLAYER_FROM=13 TB_PLAYER_TO=13 npm run player:audit` → `Achados: 0 (P0=0)` / WIN idx 13; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** gate DEV OK. Nota: meta.name no log veio “Verde Floresta” (mismatch de catálogo — ver TB-006).
- **Status:** feito


