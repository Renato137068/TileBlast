# Soft launch / coortes (P4.3)

Tile Blast está em **testes na Play Store**. Nenhuma feature global escala sem métrica-alvo, grupo de controle e critério de rollback.

## Ritual semanal

Comando: `npm run ops:weekly` → atualiza `play-store/reports/soft-launch-latest.md`.

| Métrica | Fonte | Alvo inicial (ajustar com dados) | Rollback se |
|---------|-------|----------------------------------|-------------|
| Crash-free users | Play Console | ≥ 99% | < 98% por 2 dias |
| ANR rate | Play Console | < 0.5% | ≥ 0.47% (limite Play) |
| D1 retention | Analytics / Play | baseline + não cair >10% | queda >15% vs semana anterior |
| Win rate (early levels) | `level_win` / `level_start` | 55–75% fase 1–10 | <40% ou >90% sustentado |
| TTFM / first_move | `first_move.ttfm_ms` | p50 estável | regressão >20% |
| Ad reward complete | ads events | estável | queda brusca + reviews |
| IAP errors | Billing / Functions | ~0 `already_owned` anômalo | spike de falhas |
| Reviews 1★ (tema) | Play | sem spike | menção a progressão/billing |

## Grupos de controle

- Manter **um mercado / faixa** como controle quando testar live ops, preços ou dificuldade.
- Mudança de conteúdo: preferir remote config / pack com flag e kill switch documentado.

## Changelog ao jogador

Toda build de teste com mudança perceptível: 3 bullets em linguagem de jogador (não jargão técnico) em `play-store/` ou notas internas.

## Agentes

- Audit: skill `tileblast-audit`
- Implementar achados: `tileblast-improve`
- Ritual: `tileblast-soft-launch`
