---
name: tileblast-soft-launch
description: >-
  Runs the Tile Blast soft-launch / cohort weekly ritual (retention, win rate,
  ads, crashes, rollback criteria). Use for P4.3, soft launch, coortes,
  ritual semanal, or ops:weekly.
---

# Tile Blast — Soft launch ritual

## Goal

Operar o teste na Play como produto: métricas, decisão go/hold/rollback — não só código.

## Procedure

1. Ler `docs/SOFT-LAUNCH-RITUAL.md`.
2. Rodar `npm run ops:weekly` (gera esqueleto em `play-store/reports/`).
3. Preencher com dados disponíveis (Play Console, analytics buffer, gate reports). Sem dados: marcar **MISSING** e listar como P0 operacional.
4. Decidir por feature/conteúdo: **scale / hold / rollback** com métrica-alvo e limiar.
5. Se houver P0 de produto óbvio e seguro de código → encadear `tileblast-improve`. Caso contrário, só relatório.

## Output

Atualizar `play-store/reports/soft-launch-latest.md` com:

- Semana / coorte / build
- Tabela de métricas (retenção D1, sessões, win rate, ads, crashes, reviews)
- Decisões + critérios de rollback
- Top ações da próxima semana
