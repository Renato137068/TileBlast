# Melhorias de UX — Tela Inicial e Onboarding Progressivo

**Data:** 11 Jul 2026
**Versão do app:** 1.4.6 (versionCode 11)
**Escopo:** Exclusivamente UX/apresentação da tela inicial (`#screen-map`).
**Regra respeitada:** Nenhuma mecânica de jogo foi alterada. Todas as funcionalidades
existentes foram preservadas — apenas mudou **quando e como** elas aparecem.

---

## 1. Objetivo

Reduzir a carga cognitiva do **primeiro acesso**. Antes, um jogador novo via
simultaneamente ~20 elementos concorrendo por atenção (XP, eventos, baús, banners de
passe/cofrinho/oferta, progresso de mundo, e um dock com 8 botões secundários), diluindo
a ação principal — **jogar a primeira fase**.

A solução implementa um **sistema de desbloqueio progressivo**: recursos secundários
aparecem gradualmente conforme o jogador conclui fases, no estilo dos grandes jogos casuais
(Royal Match, Toon Blast), que só revelam Loja/Passe/Eventos depois das primeiras vitórias.

---

## 2. Resumo das alterações

| # | Alteração | Arquivo(s) |
|---|-----------|------------|
| 1 | Config de desbloqueio `FEATURE_UNLOCKS` + funções de gating | `tile_blast.html` |
| 2 | CSS `.feat-locked` (oculta) + `.map-play-btn--hero` (destaque) | `tile_blast.html` |
| 3 | Aplicação do gating em `updateMapMeta()` | `tile_blast.html` |
| 4 | Anúncio de novos desbloqueios em `goToMap()` e no boot | `tile_blast.html` |
| 5 | **Correção de bug pré-existente** que travava o boot no splash | `tb-meta.js`, `tile_blast.html` |
| — | Propagação para `www/index.html` via `scripts/sync-www.js` | `www/*` |

---

## 3. Detalhamento

### 3.1 Sistema de desbloqueio progressivo (`FEATURE_UNLOCKS`)

Nova tabela declarativa que mapeia cada recurso secundário → número de fases concluídas
necessárias para revelá-lo, com o seletor DOM correspondente:

| Recurso | Aparece após concluir | Elemento |
|---------|----------------------|----------|
| Progresso de Mundo | 1 fase | `#world-prog-wrap` |
| Nível & XP | 2 fases | `#xp-bar-wrap` |
| Missões | 2 fases | `#map-missions-btn` |
| Perfil | 3 fases | `#map-profile-btn` |
| Loja | 3 fases | `#map-shop-btn` |
| Baús | 4 fases | `#chest-bar` |
| Eventos | 4 fases | `#event-banner` |
| Puzzle Diário | 4 fases | `#map-daily-puzzle-btn` |
| Skins | 5 fases | `#map-coll-btn` |
| Jardim de Blasty | 5 fases | `#map-garden-btn` |
| Desafio Diário | 6 fases | `#map-challenge-btn` |
| Passe & Ofertas | 7 fases | `.meta-banners` + `#map-bp-btn` |
| Modo Infinito | 8 fases | `#map-inf-btn` |

**Funções adicionadas:**

- `isFeatureUnlocked(key)` — retorna se um recurso já foi liberado (baseado em `getUnlocked()`).
- `applyProgressiveUI()` — aplica/remove a classe `.feat-locked` em cada recurso e esconde
  linhas do dock/modos que ficaram totalmente vazias. Também aplica o destaque `--hero` no
  botão Jogar enquanto `getUnlocked() < 3`.
- `announceNewUnlocks()` — quando o jogador cruza um limiar, exibe um toast comemorativo
  (1 recurso) ou um modal (vários). Na primeira execução registra um **baseline** para não
  inundar jogadores que já haviam progredido antes desta atualização.

**Justificativa:** abordagem declarativa e centralizada — fácil de ajustar os limiares,
sem espalhar `if` pelo código. Nada é removido do DOM; apenas ocultado via CSS, então toda
a lógica existente continua funcionando quando o recurso reaparece.

**Escape hatch:** `ld().unlockAllFeatures === true` revela tudo (útil para QA/testes).

---

### 3.2 CSS — ocultação e destaque

```css
.feat-locked{ display:none !important; }
.map-play-btn--hero{ font-size:18px; padding:16px 18px; animation:playPulseHero 2s ...; }
```

- `.feat-locked` — mecanismo único e reversível de ocultação (respeita `prefers-reduced-motion`
  já existente).
- `.map-play-btn--hero` — reforça o botão **Jogar** como ação primária no início da jornada
  (fonte/padding maiores + brilho pulsante mais forte), mantendo o design premium (mesma
  paleta dourada).

**Justificativa:** hierarquia visual clara — com os elementos secundários ocultos e o botão
Jogar realçado, o novo jogador tem um único caminho óbvio.

---

### 3.3 Integração (wiring)

- `updateMapMeta()` passa a chamar `applyProgressiveUI()` ao final. Como `updateMapMeta` já é
  invocado em todos os pontos de atualização do mapa (boot, `renderMap`, timer de regen,
  retorno ao mapa), o gating fica sempre consistente.
- `goToMap()` e o **boot** passam a chamar `announceNewUnlocks()` para comemorar recursos
  recém-liberados ao retornar ao mapa após vencer uma fase.

**Justificativa:** um único ponto de aplicação (`applyProgressiveUI` em `updateMapMeta`)
garante que a UI nunca fique dessincronizada, sem duplicar lógica.

---

### 3.4 Correção de bug pré-existente de boot (crítico)

Durante a validação no navegador, o jogo **travava no splash** (tela inicial nunca carregava).
Causa-raiz (independente das melhorias acima):

```
TBRoadmap.init() → boot() → applyI18n() → C.renderMap()
   → updateMapMeta() → TBMeta.updateMapHint()  ← acessa C.ld() com C === null
```

`applyI18n()` chama `renderMap()` no boot (com `#screen-map` já `active`), mas isso ocorre
**antes** de `TBMeta.init()`. A função `TBMeta.updateMapHint()` era a **única** do módulo
`tb-meta.js` sem o guard `ready()` que todas as outras possuem — então acessava `C.ld()` com
`C` nulo e lançava `TypeError`, abortando todo o boot.

**Correção (mínima e defensiva, alinhada ao padrão do próprio módulo):**

- `tb-meta.js` → `updateMapHint()` agora inicia com `if (!ready()) return;`
- `tile_blast.html` → a chamada passou a checar prontidão:
  `if (window.TBMeta && TBMeta.isReady && TBMeta.isReady()) TBMeta.updateMapHint();`

**Impacto:** o boot passa a concluir normalmente; a dica do Jardim simplesmente não é
desenhada até o `TBMeta` estar pronto (comportamento correto, sem perda de funcionalidade).

---

## 4. Antes × Depois (primeiro acesso, jogador novo)

**Antes:** título, mascote, vidas, moedas, recorde, barra de XP, banner de evento, barra de
progresso de mundo, barra de baús, banners de Passe/Cofrinho/Oferta, mapa, botão Jogar, dock
de 5 botões, linha de 3 modos, e configurações — tudo visível de uma vez.

**Depois (verificado no navegador):** apenas
1. Título + subtítulo
2. Mascote + vidas + moedas + recorde (status essencial)
3. Mapa de fases (Fase 1 destacada, demais bloqueadas)
4. **▶ Jogar Fase 1 · Aquecimento** (botão-herói, ação principal)
5. Configurações (recolhido)

Os elementos secundários voltam a aparecer, com destaque comemorativo, conforme o jogador
avança pelas fases.

---

## 5. Preservação de funcionalidades

- Nenhum elemento foi removido do DOM nem teve seus handlers alterados.
- A ocultação é 100% via CSS reversível; ao atingir o limiar, o recurso reaparece intacto.
- Nenhuma regra de jogo, pontuação, economia, objetivos ou salvamento foi tocada.
- `www/index.html` sincronizado a partir do `tile_blast.html`.

---

## 6. Impacto esperado na experiência

- **Menor carga cognitiva no D0:** foco total na primeira partida → maior taxa de conclusão
  do FTUE (First Time User Experience).
- **Curiosidade e recompensa:** cada desbloqueio vira um micro-momento de progresso
  ("Novo recurso!"), reforçando a sensação de avanço — alavanca clássica de retenção early-game.
- **Ação principal inequívoca:** botão Jogar realçado reduz hesitação e time-to-first-match.
- **Design premium preservado:** mesma identidade visual, apenas mais respirável.

---

## 7. Validação

- ✅ `npx vitest run` — 78 testes passando (12 arquivos).
- ✅ Boot verificado no navegador: carrega até o mapa (antes travava no splash).
- ✅ Primeiro acesso (save vazio) confirmado via árvore de acessibilidade: apenas Fase 1,
  botão Jogar e Configurações interativos; recursos secundários ausentes/ocultos.
- ✅ `applyProgressiveUI()` alterna corretamente `.feat-locked` conforme `getUnlocked()`.

---

## 8. Ajuste/Configuração futura

Para mudar quando cada recurso aparece, basta editar o campo `level` em `FEATURE_UNLOCKS`
(em `tile_blast.html`) e rodar `npm run sync:www` (ou `node scripts/sync-www.js`).
Para revelar tudo em QA: definir `unlockAllFeatures: true` no save.
