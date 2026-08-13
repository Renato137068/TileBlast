# Tile Blast — Agent guide

Repo: [Renato137068/TileBlast](https://github.com/Renato137068/TileBlast)  
Jogo Capacitor/Android em **testes na Play Store**.

## Skills do projeto

| Skill | Quando |
|-------|--------|
| `tileblast-audit` | Saúde do produto, priorização, “o que melhorar” |
| `tileblast-improve` | Implementar achados P0/P1 |
| `tileblast-player-auditor` | Bot joga fases + achados (balance/UX/monetização) |
| `tileblast-soft-launch` | Ritual semanal de coortes / ops |
| `tileblast-loop` | Trabalho autônomo: queimar o backlog em N iterações |

## Comandos úteis

```text
npm run ops:weekly
npm run player:audit
TB_PLAYER_MAX=15 npm run player:audit
npm run release:gate
npm run test:a11y
npm run perf:budgets
npm run sync:www
npm run ci:quality
```

## Paralelismo sugerido

1. `player:audit` (amostra ou full) → relatório em `play-store/reports/player-audit-latest.md`
2. Em paralelo: `tileblast-improve` nos P0/P1 do relatório
3. Re-audit do mesmo range após o fix

Coordenação entre agentes é por arquivo: `play-store/reports/backlog.md` (marcar `doing` + dono antes de editar código).

## Regras

Ver `.cursor/rules/` — fonte de verdade na raiz (`tileblast-core`), Play safety (`tileblast-play-safety`), autonomia e parada (`tileblast-autonomy`).  
Commit/push/release só com confirmação explícita — única exceção: commits em branch `auto/*` durante um loop.
