# Changelog loop

## Iteração 1 — 2026-08-12 — TB-003
- **Problema/evidência:** Trilha Verde (idx 11) LOSS no player-audit (score 910 / target 1400, moves esgotados).
- **Mudança:** `data/levels/garden.json` — Trilha Verde moves 23→25, score target 1400→1100.
- **Validação:** `npm run content:validate:strict` → `✓ Conteúdo OK`; `TB_PLAYER_FROM=11 TB_PLAYER_TO=11 npm run player:audit` → `Achados: 1 (P0=0)` / WIN idx 11 score=1495; `npm run release:gate` → `✓ Gate de DEV OK (placeholders permitidos).`
- **Regressão checada:** conteúdo strict OK; gate DEV OK.
- **Status:** feito

