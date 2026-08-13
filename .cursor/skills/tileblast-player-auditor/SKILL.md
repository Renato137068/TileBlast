---
name: tileblast-player-auditor
description: >-
  Runs an automated Tile Blast player that clears levels and reports
  improvement opportunities across gameplay, balance, monetization, UI/UX,
  and stability. Use when the user asks for player audit, jogar todas as
  fases, bot jogador, playtest automatizado, or parallel improve from play findings.
---

# Tile Blast — Player auditor

## Goal

Atuar como jogador onisciente: percorrer fases, observar falhas, balanceamento, monetização e UX, e **gerar achados acionáveis** para `tileblast-improve` — inclusive em paralelo.

## Commands

```bash
npm run sync:www
npm run player:audit              # todas as fases (pode demorar)
TB_PLAYER_MAX=15 npm run player:audit   # amostra rápida
TB_PLAYER_FROM=0 TB_PLAYER_TO=14 npm run player:audit
```

Relatórios:
- `play-store/reports/player-audit-latest.md`
- `play-store/reports/player-audit-latest.json`

## Procedure

1. Rodar `player:audit` (começar com `TB_PLAYER_MAX=15` se tempo curto; full antes de release).
2. Ler o MD: priorizar **P0** (estabilidade) → **P1** (balance/monetização) → **P2**.
3. Para cada P0/P1: abrir fatia com skill `tileblast-improve` (1–3 itens por vez).
4. **Paralelo recomendado:** um agente implementa P0 enquanto outro continua o audit no restante das fases / mundos (`TB_PLAYER_FROM`/`TO`).
5. Re-rodar o mesmo range após o fix para confirmar regressão.

## What the bot sees

| Área | Sinais |
|------|--------|
| Stability | pageerror, fase não inicia, sem tela de resultado |
| Balance | loss do bot greedy, vitória no último move, muitos moves sobrando |
| Monetization | preços IAP vazios, falta de sinks/ads na loja |
| UX | mapa vazio, CTA Jogar quebrado, sessão longa demais |

## Parallel with improve

Não espere o audit full terminar para melhorar:

1. Agente A: `TB_PLAYER_MAX=20 npm run player:audit` → lista P0/P1  
2. Agente B: `tileblast-improve` nos achados  
3. Agente A: continua `TB_PLAYER_FROM=20` …  

Não commit/push/release sem confirmação (Play safety).

## Output to user

- Verdict (ex.: “12 achados, 2 P0”)
- Top 5 ações
- Comando exato para re-validar
