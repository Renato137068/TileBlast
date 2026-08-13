---
name: tileblast-loop
description: >-
  Runs the Tile Blast continuous improvement loop: load backlog, pick the
  highest-priority item, implement one slice, verify with real npm commands,
  record evidence, repeat until a stop condition or the iteration cap. Use
  when the user asks para trabalhar sozinho, loop autonomo, ciclo continuo de
  melhoria, "rode N iteracoes", queimar o backlog, or autonomous burn-down.
---

# Tile Blast — loop autônomo

Orquestra as skills que já existem. **Não** re-audita o projeto do zero e **não** cria um sistema de relatórios novo: usa `tileblast-audit` e `tileblast-player-auditor` para encher o backlog, e `tileblast-improve` para executar.

Regras de decisão e parada: `.cursor/rules/tileblast-autonomy.mdc`.

## Estado compartilhado (arquivos, não memória)

| Arquivo | Papel |
|---|---|
| `play-store/reports/backlog.md` | fila única de trabalho — **fonte de verdade do loop** |
| `play-store/reports/changelog-loop.md` | o que mudou + evidência, um bloco por iteração |
| `play-store/reports/player-audit-latest.md` | achados do bot jogador |
| `play-store/reports/audit-latest.md` | achados da auditoria técnica |
| `docs/CURSOR-ROADMAP-2026-07-26.md` | marcos P4.x |

Dois agentes em paralelo coordenam **por esses arquivos**: antes de editar código, marcar o item como `doing` no backlog com o próprio nome. Nunca dois agentes no mesmo ID.

## Iteração

### 1. Carregar

Ler `backlog.md`. Se estiver vazio, desatualizado (>3 dias) ou sem P0/P1 com evidência:

- técnico / release / economia → skill `tileblast-audit`
- jogabilidade / balance / monetização / UX in-game → skill `tileblast-player-auditor`:

```bash
npm run sync:www
npm run player:audit                      # todas as fases (demora)
TB_PLAYER_MAX=15 npm run player:audit     # amostra rápida (bash)
```

PowerShell (Windows): `$env:TB_PLAYER_MAX=15; npm run player:audit`

Converter achados em itens de backlog. **Nesta fase só se escreve em `play-store/reports/`** — nada de código.

### 2. Escolher

Maior prioridade primeiro; empate desempata por menor esforço. **Um item.**

### 3. Implementar

Skill `tileblast-improve`. Editar sempre na **raiz** (`tb-*.js`, `tile_blast.html`, `css/`, `data/`, `functions/`), nunca `www/`.

### 4. Verificar — comandos reais

Escolher pela área tocada. Rodar de fato; colar a linha final da saída.

| Tocou | Rodar |
|---|---|
| qualquer módulo JS | `npm run test:unit` + `npm run lint` |
| boot / ordem de módulos | `npm run test:boot` + `npm run sync:www` |
| gameplay / tabuleiro | `npm run test:gameplay`, `npm run test:win`, `npm run test:loss` |
| mapa / progressão / save | `npm run test:map`, `npm run test:progress`, `npm run test:lifecycle` |
| UI / onboarding / a11y | `npm run test:a11y`, `npm run test:onboarding`, `npm run ui:shots` |
| i18n | `npm run test:i18n:matrix` |
| conteúdo / níveis / economia | `npm run content:validate:strict`, `npm run economy:simulate` |
| perf / bundle | `npm run build:bundle && npm run perf:budgets` |
| tipos | `npm run typecheck` |
| **antes de fechar a iteração** | `npm run release:gate` |
| **antes de fechar o bloco todo** | `npm run ci:quality` |

Falhou? Consertar dentro da mesma fatia. Falhou 2×: `git restore` da fatia, item vira `bloqueado`, seguir para o próximo.

### 5. Registrar

Append em `changelog-loop.md`:

```markdown
## Iteração N — YYYY-MM-DD — <ID do backlog>
- **Problema/evidência:** …
- **Mudança:** arquivos tocados
- **Validação:** `comando` → última linha da saída
- **Regressão checada:** …
- **Status:** feito | bloqueado (motivo)
```

### 6. Fechar

Marcar `done` no backlog. Se houver branch `auto/*`: `git commit -m "loop: <ID> <resumo>"`. Sem push.

### 7. Próximo

Voltar ao passo 1 até bater uma condição de parada de `tileblast-autonomy` ou o teto de iterações.

## Formato do backlog

```markdown
# Backlog Tile Blast — atualizado YYYY-MM-DD

| ID | Pri | Área | Problema | Evidência | Ação | Validação | Esforço | Status | Dono |
|----|-----|------|----------|-----------|------|-----------|---------|--------|------|
| TB-001 | P0 | save | … | `player-audit-latest.md` L42 | … | `npm run test:progress` | M | todo | — |
```

Status: `todo` · `doing` · `done` · `bloqueado` · `precisa-decisão`

## Relatório final (ao parar)

- **Por que parou** (qual condição bateu)
- **Iterações rodadas** e itens fechados por prioridade
- **Comandos executados** com resultado real
- **Bloqueados** e o que falta
- **Precisa da sua decisão** — lista explícita
- **Próxima prioridade recomendada** — um item, com o comando para começar

Nada de nota inventada. Placar só derivado de `release:gate` / `test:coverage` / `perf:budgets` / contagem do `player:audit`, com a fonte citada.
