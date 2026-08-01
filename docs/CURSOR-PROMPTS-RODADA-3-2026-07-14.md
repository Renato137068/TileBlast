# Prompts para o Cursor — Rodada 3 (destravar a nota: 87 → 90+)

Derivados de `docs/AUDITORIA-COMPLETA-2026-07-14-v3.html` (nota 87). O foco desta rodada
é o **único teto relevante restante**: o tamanho de `tb-main.js` (~6.443 linhas). Concluir
a extração destrava Arquitetura e Manutenibilidade. Prompts secundários fecham os últimos
follow-ups de produção.

**Como usar:** cole o **BLOCO DE CONTEXTO** primeiro, depois o prompt da tarefa.

---

## 📌 BLOCO DE CONTEXTO (cole no início de CADA sessão)

```
Você está trabalhando no Tile Blast, um jogo puzzle (web empacotado via Capacitor para Android).

Convenções OBRIGATÓRIAS:
- Scripts CLÁSSICOS (sem import/export no runtime). Módulos se comunicam por globais
  window.TB* (TBConfig, TBLogic, TBRoadmap, TBGlobal, TBShop, TBResult, TBMap, TBState, ...).
- ORDEM DE CARGA é fonte única da verdade em scripts/modules.mjs e precisa estar espelhada
  nas tags <script> de tile_blast.html E no precache de sw.js. O teste
  tests/integration/architecture.test.js FALHA se os três divergirem.
- Todo global TB* novo precisa ser registrado na lista `app` de eslint.config.mjs.
- Fonte na RAIZ (tb-*.js). www/ é build gerado — NÃO edite www/ à mão; rode `npm run sync:www`.
- PADRÃO DE MÓDULO DE DOMÍNIO (já usado em tb-shop.js, tb-result.js, tb-map.js): IIFE que
  recebe dependências via TB<Nome>.init(cfg), chamado no boot de tb-main.js (procure por
  "TBShop.init({" / "TBResult.init({" / "TBMap.init({" como referência de estilo). Mantém
  aliases globais para callers legados e para o mapa data-action. Escape via _escTB.
- Eventos de UI por DELEGAÇÃO data-action/data-arg (sem onclick inline).
- CSP ativa SEM 'unsafe-inline' em script-src: nada de <script> inline novo nem eval.
- Novos módulos DEVEM sair já com // @ts-check no topo e entrar no include do jsconfig.json.

GATE DE QUALIDADE (rode ao final de TODA tarefa, tem que ficar verde):
  npm run lint        # no-undef sobre o bundle concatenado
  npm test            # 219 testes (Vitest) — NÃO pode regredir
  npm run typecheck   # tsc --noEmit — sem erros
Ao terminar, liste os arquivos alterados e mostre os diffs relevantes.
```

---

## 🔴 Tarefa 1 (PRINCIPAL) — Extrair o motor de canvas e o HUD de `tb-main.js`

```
OBJETIVO: reduzir tb-main.js (~6.443 linhas) para MENOS DE 3.000 linhas, extraindo os
clusters coesos restantes, seguindo EXATAMENTE o padrão já aplicado em tb-shop.js /
tb-result.js / tb-map.js. Sem mudar comportamento; 219 testes + lint + typecheck verdes.

O maior cluster remanescente é o MOTOR DE RENDERIZAÇÃO do canvas. Extraia nesta ordem
(um módulo por vez, validando o gate entre cada um):

  a) tb-board.js  — renderização do tabuleiro em canvas. Reúne: draw, drawBlock,
     drawBoardBackground, drawParticles, drawFloaters, drawIcon, drawGlyph, drawCrate,
     drawCover, drawIceOverlay, drawSpecialOverlay, drawHoverFill/Outline/Badge,
     drawKbFocus, drawTutorialHighlight, boardClearFinale e helpers de coordenada.
     É o maior ganho de linhas. CUIDADO: essas funções leem estado do jogo (grid,
     seleção, animações) — injete o que for necessário via TBBoard.init(cfg) e/ou leia
     de TBState, sem duplicar estado.

  b) tb-hud.js    — HUD e banners: render de score/movimentos/timer/vidas/objetivos,
     renderXPBar, renderEventBanner, renderChestBar, renderChallengeNotif e afins.

  c) (se sobrar acima de 3.000) tb-dialogs.js — modais/diálogos genéricos, coach/tutorial.

PARA CADA MÓDULO, replique o padrão dos módulos já extraídos:
1. Crie tb-<nome>.js na raiz como IIFE, começando com // @ts-check:
     // @ts-check
     (function (global) { 'use strict';
       let C = null;
       function init(cfg) { C = cfg || null; }
       // ...funções movidas, usando C.* para dependências injetadas...
       global.TB<Nome> = { init, /* apis públicas usadas por tb-main e outros */ };
       // aliases legados necessários (ex.: global.draw = draw;) se callers/RAF os usam.
     })(typeof window !== 'undefined' ? window : globalThis);
2. Mova as funções do cluster. Troque acessos a estado/deps por C.* (injetado no init)
   ou por TBState.* quando for estado compartilhado. NÃO recrie estado local paralelo.
3. Chame TB<Nome>.init({...}) no boot de tb-main.js (mesmo ponto onde TBMap.init etc.
   são chamados), passando as dependências que o módulo consome (contexto do canvas,
   getters de grid/animações, TBLogic, _escTB, etc.).
4. Se o loop de render (requestAnimationFrame) chama `draw()`, garanta que a referência
   continue válida — exponha via alias global ou via C e chame TBBoard.draw().
5. Registre o módulo na ORDEM certa em scripts/modules.mjs (antes de tb-main.js), espelhe
   em tile_blast.html (<script>) e sw.js (ASSETS), registre o global TB<Nome> (e aliases)
   na lista `app` de eslint.config.mjs, e adicione o arquivo ao include de jsconfig.json.
6. Atualize a tabela de módulos em docs/ARCHITECTURE.md.
7. Rode lint + test + typecheck. Só avance com tudo verde.

VALIDAÇÃO EXTRA (render é visual — testes unitários não cobrem pixels):
- Rode os e2e para garantir que o tabuleiro ainda desenha e joga:
    npm run test:e2e   (ou os específicos: test:gameplay, test:win, test:loss, test:map)
- Se possível, abra o app (npm run serve:pwa) e confirme visualmente: splash -> mapa ->
  jogar uma fase (blocos desenham, seleção/hover, partículas, obstáculos gelo/caixa,
  vitória) sem erros no console.

RESTRIÇÕES:
- Comportamento e aparência idênticos; nada de renomear funções públicas nem alterar lógica.
- Não editar www/ à mão. Nenhum <script> inline (CSP). Handlers só via data-action.
- Meta desta sessão: extrair tb-board.js (e, se der, tb-hud.js) com verde total. Se o
  acoplamento do canvas estiver difícil, extraia menos e deixe o resto documentado —
  prefira segurança a completude.

META FINAL DA TAREFA (pode levar mais de uma sessão): tb-main.js < 3.000 linhas.
ENTREGA: por módulo, o novo arquivo + diffs de modules.mjs, tile_blast.html, sw.js,
eslint.config.mjs, jsconfig.json, ARCHITECTURE.md; a nova contagem de linhas de
tb-main.js; e a confirmação dos e2e verdes.
```

---

## 🟡 Tarefa 2 — Comprovar o ciclo server-side em produção

```
OBJETIVO: o código de validação de IAP (confirmIapPurchase) e grantAdReward está pronto
e testado (functions/index.js + tests/unit/functions-iap.test.js). Falta o caminho de
PRODUÇÃO: deploy, secret real e prova ponta a ponta. Nada de segredos no repo.

1. Deploy documentado e reproduzível:
   - Escreva/atualize um passo-a-passo em docs/ECONOMIA-SERVER-SIDE.md (ou functions/README.md):
     criar o projeto Firebase, habilitar Cloud Functions v2, criar a service account do
     Google Play (androidpublisher), e registrar o secret via `firebase functions:secrets:set`
     (o código já lê playSaSecret / PLAY_SERVICE_ACCOUNT_JSON).
   - Comando de deploy: `firebase deploy --only functions` (e firestore rules:
     `firebase deploy --only firestore:rules`).
2. Cliente:
   - Confirme que o wrapper no cliente chama confirmIapPurchase após a compra no billing
     nativo e reconcilia o saldo com o retorno do servidor, com fallback offline (fila).
     Se algo estiver stubado, finalize.
3. Prova ponta a ponta (sandbox):
   - Descreva/execute um teste com a conta de teste de licença da Play Console (compra
     sandbox) validando: compra -> confirmIapPurchase -> crédito aplicado -> repetir o
     mesmo purchaseToken -> NÃO recredita (idempotência).
   - Registre o resultado em play-store/CHECKLIST.md.

RESTRIÇÕES: zero segredos no repo; jogo offline intacto; 219 testes + lint + typecheck verdes.
ENTREGA: doc de deploy, diffs do cliente (se houver), itens marcados no checklist e o
relato do teste sandbox (ou o roteiro exato, se o ambiente Play não estiver disponível aqui).
```

---

## 🟢 Tarefa 3 (opcional) — Ativar thresholds de cobertura no CI

```
CONTEXTO: a cobertura agora é representativa (~34% global; lógica de jogo/economia entre
77% e 99,7%). Vale travar o que já está bom para evitar regressão.

1. Em vitest.config.js, adicione coverage.thresholds SÓ para os módulos de lógica pura já
   bem cobertos (per-file), sem quebrar por causa dos módulos de UI que dependem de e2e:
     coverage: {
       ...,
       thresholds: {
         'tb-game-logic.js': { lines: 95, functions: 95 },
         'tb-economy.js':    { lines: 90 },
         'tb-secure.js':     { lines: 90 },
         // adicione outros conforme a cobertura atual comportar
       }
     }
   Ajuste os números para logo ABAIXO do valor atual de cada arquivo (margem de segurança),
   nunca acima. NÃO imponha threshold global que quebre por causa de tb-main/tb-map/tb-shop.
2. No CI (.github/workflows/test.yml), troque `npm test` por `npm run test:coverage` no job
   unit-and-boot (ou adicione um step) para os thresholds valerem no pipeline.
3. Rode `npm run test:coverage` localmente e confirme verde.

RESTRIÇÕES: não alterar testes existentes; 219 testes + lint + typecheck verdes.
ENTREGA: diff de vitest.config.js e test.yml e a saída de cobertura passando os thresholds.
```

---

## Ordem recomendada

| # | Tarefa | Prioridade | Impacto na nota |
|---|--------|-----------|-----------------|
| 1 | Extrair canvas + HUD de `tb-main.js` (< 3.000 linhas) | 🔴 Alta | Destrava Arquitetura e Manutenibilidade → caminho para 90+ |
| 2 | Comprovar server-side em produção | 🟡 Média | Consolida Segurança; fecha o último "código pronto, falta provar" |
| 3 | Thresholds de cobertura no CI | 🟢 Baixa | Protege o ganho de QA contra regressão |

- **A Tarefa 1 é onde está travada a maior parte do peso residual.** Priorize-a.
- Cada módulo novo já sai com `// @ts-check` — sem retrabalho depois.
- Regra de ouro: **`npm run lint && npm test && npm run typecheck` verdes** + **sincronizar o
  trio `scripts/modules.mjs` / `tile_blast.html` / `sw.js`** ao mexer em módulos, e rodar os
  **e2e** quando mexer em renderização.
```
