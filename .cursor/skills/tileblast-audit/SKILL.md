---
name: tileblast-audit
description: >-
  Audits Tile Blast (Play testing) for release risk, funil, economy, a11y,
  performance, and soft-launch readiness. Use when the user asks for audit,
  health check, review do projeto, o que melhorar, ou priorização pós-release.
---

# Tile Blast — Audit

## Goal

Entregar um relatório priorizado (P0/P1/P2) acionável para um jogo **já em testes na Play Store**. Não “reescrever o app”.

## Procedure

1. Ler `docs/CURSOR-ROADMAP-2026-07-26.md` (status P4.x) e `docs/SOFT-LAUNCH-RITUAL.md` se existir.
2. Rodar o que couber (não inventar verde):
   - `npm run release:gate` (ou `--report`)
   - `npm run content:validate`
   - `npm run perf:budgets` (após `build:bundle` se necessário)
   - `npm run test:unit` (ou subset se tempo curto)
   - Opcional: `npm run test:a11y`, `npm run audit`
3. Inspecionar gaps conhecidos: placeholders (`firebase-config`, AdMob), `www` desatualizado, funil analytics, economia, social, crashes/ANRs (se houver logs/Play Console).
4. Classificar achados:
   - **P0** — quebra release/testes, perda de progresso, billing, crash
   - **P1** — funil/retenção/ads/UX bloqueante
   - **P2** — polish, dívida, nice-to-have

## Output format

```markdown
# Audit Tile Blast — YYYY-MM-DD

## Verdict
[1–2 frases]

## Top 10 (priorizado)
| Pri | Área | Achado | Ação sugerida | Esforço |
|-----|------|--------|---------------|---------|

## Gates
- release-gate: OK/FAIL — …
- content/perf/a11y: …

## Não fazer agora
[itens fora de escopo]
```

Salvar cópia em `play-store/reports/audit-latest.md` se o usuário quiser persistir (perguntar só se dirty tree grande).

## After audit

Oferecer: “Implementar top N com skill `tileblast-improve`?”
