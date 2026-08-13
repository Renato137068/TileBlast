# Backlog Tile Blast — atualizado 2026-08-12

Fila única de trabalho do loop autônomo (etapa **Carregar** / `tileblast-loop`).
Fontes desta carga: `npm run release:gate` + `TB_PLAYER_MAX=15` `npm run player:audit` → `player-audit-latest.md`.

Prioridade: **P0** quebra release/crash/save/billing · **P1** funil/retenção/UX bloqueante/balance · **P2** dívida e polish.
Status: `todo` · `doing` · `done` · `bloqueado` · `precisa-decisão`

> Nota da amostra: o audit rodou fases **6–20** (índices 5–19) porque `TB_PLAYER_FROM` estava setado no shell; 15 fases, 13 WIN / 2 LOSS, 0 erros JS.

| ID | Pri | Área | Problema | Evidência | Ação | Validação | Esforço | Status | Dono |
|----|-----|------|----------|-----------|------|-----------|---------|--------|------|
| TB-001 | P1 | release | Firebase ainda placeholder — cloud save/ranking inativos | `release:gate` → `✗ firebase: placeholder` / aviso “Firebase não configurado” | Configurar `firebase-config.js` de produção (ou documentar bloqueio explícito no gate PROD) | `npm run release:gate` (e gate `--release` quando credenciais existirem) | L | precisa-decisão | — |
| TB-002 | P1 | release | AdMob produção: `IDS-PRODUCAO.env` ausente; units de TESTE | `release:gate` → `✗ admob_ids_file` + aviso IDs de TESTE | Preencher `play-store/console/IDS-PRODUCAO.env` e `npm run play:admob` | `npm run release:gate` | M | precisa-decisão | — |
| TB-003 | P1 | balance | Fase 12 (Trilha Verde): bot perdeu com moves esgotados | `player-audit-latest.md` L9; amostra L42 LOSS moves=24 left=0 score=910 | Revisar moves/objetivos em `data/levels/garden.json` (Trilha Verde) | `TB_PLAYER_FROM=11 TB_PLAYER_TO=11 npm run player:audit` | S | done | loop-auto |
| TB-004 | P1 | balance | Fase 14 (Combo Jardim): bot perdeu com moves esgotados | `player-audit-latest.md` L10; amostra L43 LOSS moves=24 left=0 score=1170 | Revisar moves/objetivos (Combo Jardim) | `TB_PLAYER_FROM=13 TB_PLAYER_TO=13 npm run player:audit` | S | done | loop-auto |
| TB-005 | P1 | balance | Fase 16 (Primeiro Gelo): vitória no último movimento (margem zero) | `player-audit-latest.md` L11; amostra L44 WIN moves=26 left=0 | +1–2 moves ou aliviar objetivo de gelo | `TB_PLAYER_FROM=15 TB_PLAYER_TO=15 npm run player:audit` | S | done | loop-auto |
| TB-006 | P1 | stability | Fase 9 (Ritmo): “WIN” em ~1,2s com 0 moves e score 0 — possível falso positivo / skip | `player-audit-latest.md` amostra L38: WIN moves=0 left=20 score=0 durationMs=1242 | Investigar detecção de vitória/countdown no player-audit e no fluxo real de Ritmo | `TB_PLAYER_FROM=8 TB_PLAYER_TO=8 npm run player:audit` + `npm run test:gameplay` | M | todo | — |
| TB-007 | P1 | balance | Fase 18 (Violeta): vitória com 1 move restante (quase margem zero) | `player-audit-latest.md` amostra L46 WIN left=1 | Ajuste fino de moves/objetivo | `TB_PLAYER_FROM=17 TB_PLAYER_TO=17 npm run player:audit` | S | todo | — |
| TB-008 | P2 | balance | Fase 7: vitória com 16 moves sobrando — possível fácil demais | `player-audit-latest.md` L12 | Apertar moves ou subir target (com cuidado no onboarding) | `TB_PLAYER_FROM=6 TB_PLAYER_TO=6 npm run player:audit` | S | todo | — |
| TB-009 | P2 | balance | Fase 9: vitória com 20 moves sobrando (ligado ao caso TB-006) | `player-audit-latest.md` L13 | Resolver TB-006 antes; reavaliar Ritmo | idem TB-006 | S | todo | — |
| TB-010 | P2 | balance | Fase 10: vitória com 14 moves sobrando | `player-audit-latest.md` L14 | Revisar curva Colheita | `TB_PLAYER_FROM=9 TB_PLAYER_TO=9 npm run player:audit` | S | todo | — |
| TB-011 | P2 | balance | Fase 13: vitória com 20 moves sobrando | `player-audit-latest.md` L15 | Apertar Dupla Colheita | `TB_PLAYER_FROM=12 TB_PLAYER_TO=12 npm run player:audit` | S | todo | — |
| TB-012 | P2 | ux | Fase 14: sessão bot ~25s — sensação lenta | `player-audit-latest.md` L16 | Reduzir anim/busy em reduce-motion ou duração de cascata | `npm run test:a11y` + re-audit fase 14 | M | todo | — |
| TB-013 | P2 | ux | Fase 16: sessão bot ~29s — sensação lenta | `player-audit-latest.md` L17 | Idem UX/juice em gelo | re-audit fase 16 | M | todo | — |
| TB-014 | P2 | balance | Fase 17: vitória com 13 moves sobrando | `player-audit-latest.md` L18 | Ajuste Degelo | `TB_PLAYER_FROM=16 TB_PLAYER_TO=16 npm run player:audit` | S | todo | — |
| TB-015 | P2 | balance | Fase 19: vitória com 13 moves sobrando | `player-audit-latest.md` L19 | Ajuste Gelo Duplo | `TB_PLAYER_FROM=18 TB_PLAYER_TO=18 npm run player:audit` | S | todo | — |
| TB-016 | P2 | balance | Fase 20: vitória com 19 moves sobrando | `player-audit-latest.md` L20 | Ajuste Floresta Congelada | `TB_PLAYER_FROM=19 TB_PLAYER_TO=19 npm run player:audit` | S | todo | — |

## Fechados

_(mover itens `done` para cá, com a data e o commit)_
