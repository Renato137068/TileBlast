# Prompts para o Cursor — Rodada 2 (follow-ups da Auditoria v2)

Derivados de `docs/AUDITORIA-COMPLETA-2026-07-14-v2.html` (nota 85). São os 4 follow-ups
restantes. Cada tarefa é **independente** — envie uma por sessão do Cursor.

**Como usar:** cole o **BLOCO DE CONTEXTO** primeiro, depois o prompt da tarefa.

---

## 📌 BLOCO DE CONTEXTO (cole no início de CADA sessão)

```
Você está trabalhando no Tile Blast, um jogo puzzle (web empacotado via Capacitor para Android).

Convenções OBRIGATÓRIAS deste repositório:
- Scripts CLÁSSICOS (sem import/export no runtime). Módulos se comunicam por globais
  window.TB* (TBConfig, TBEconomy, TBLogic, TBRoadmap, TBGlobal, TBShop, TBState, ...).
- A ORDEM DE CARGA é fonte única da verdade em scripts/modules.mjs e precisa estar
  espelhada nas tags <script> de tile_blast.html E no precache de sw.js. O teste
  tests/integration/architecture.test.js FALHA se os três divergirem.
- Todo global TB* novo precisa ser registrado na lista `app` de eslint.config.mjs.
- Fonte na RAIZ (tb-*.js). www/ é build gerado — NÃO edite www/ à mão; rode
  `npm run sync:www` para regenerar.
- PADRÃO DE MÓDULO DE DOMÍNIO (já usado em tb-shop.js): IIFE que recebe dependências
  via TB<Nome>.init(cfg) chamado no boot de tb-main.js; mantém aliases globais para
  callers legados e para o mapa data-action; escape de HTML via _escTB/TBRuntime.escapeHtml.
- Eventos de UI usam DELEGAÇÃO por data-action/data-arg (não recriar onclick inline).
- CSP ativa SEM 'unsafe-inline' em script-src: nada de <script> inline novo nem eval.

GATE DE QUALIDADE (rode ao final de TODA tarefa, tem que ficar verde):
  npm run lint        # ESLint no-undef sobre o bundle concatenado
  npm test            # 206 testes (Vitest) — NÃO pode regredir
  npm run typecheck   # tsc --noEmit — sem erros
Ao terminar, liste os arquivos alterados e mostre os diffs relevantes.
```

---

## 🔴 Tarefa 1 (continuação) — Extrair mais domínios de `tb-main.js`

```
OBJETIVO: continuar fatiando tb-main.js (~7.026 linhas) seguindo EXATAMENTE o padrão
já aplicado em tb-shop.js, até trazer o arquivo para < 3.000 linhas. Sem mudar
comportamento; 206 testes + lint + typecheck verdes.

Alvos sugeridos (extraia UM por vez, do mais isolado ao mais acoplado — valide no
código real antes de decidir a ordem):
  a) Tela de resultado/vitória (res-*, estrelas, recompensas, continues) -> tb-result.js
  b) Render do mapa e cards de fase/mundo -> tb-map.js
  c) HUD do jogo (score, movimentos, timer, vidas, objetivos) -> tb-hud.js

Para CADA módulo, replique o padrão do tb-shop.js:
1. Crie tb-<nome>.js na raiz como IIFE:
     (function (global) { 'use strict';
       let C = null;
       function init(cfg) { C = cfg || null; }
       // ...funções movidas...
       global.TB<Nome> = { init, /* apis públicas */ };
       // aliases legados p/ callers e data-action, ex.: global.renderResult = render;
     })(typeof window !== 'undefined' ? window : globalThis);
2. Mova as funções do domínio; troque dependências diretas por C.* (as deps injetadas
   no init). Preserve os aliases globais que o mapa data-action e outros módulos usam.
3. Chame TB<Nome>.init({...}) no boot de tb-main.js, passando as dependências que o
   módulo consome (mesmo estilo do TBShop.init).
4. Registre o módulo na ORDEM certa em scripts/modules.mjs (antes de tb-main.js),
   espelhe em tile_blast.html (<script>) e sw.js (ASSETS), e registre o global TB<Nome>
   (e os aliases expostos) na lista `app` de eslint.config.mjs.
5. Atualize a tabela de módulos em docs/ARCHITECTURE.md.
6. Rode lint + test + typecheck. Só avance para o próximo módulo com tudo verde.

RESTRIÇÕES:
- Comportamento idêntico; nada de renomear funções públicas nem tocar em lógica de jogo.
- Não editar www/ à mão. Se precisar validar o bundle: npm run sync:www.
- Nenhum <script> inline (CSP). Handlers só via data-action.
- Meta desta sessão: 1–2 módulos com verde total. Não force o escopo inteiro de uma vez.

ENTREGA: por módulo, o novo arquivo + diffs de modules.mjs, tile_blast.html, sw.js,
eslint.config.mjs, ARCHITECTURE.md, e a nova contagem de linhas de tb-main.js.
```

---

## 🟡 Tarefa 2 — Tornar a cobertura de testes representativa

```
CONTEXTO DO PROBLEMA: a cobertura está configurada (vitest.config.js + script
test:coverage), mas reporta ~1,5% de linhas. Motivo: os testes carregam os módulos
como scripts clássicos via tests/helpers/load-module.js usando vm.runInNewContext,
e o provider v8 do Vitest NÃO instrumenta código executado assim. Só tb-secure.js e
tb-runtime.js (que usam module.exports e são importados normalmente) aparecem com
cobertura real. Os 206 testes exercitam muito mais do que o número sugere.

OBJETIVO: fazer a métrica refletir a realidade, escolhendo UMA das abordagens abaixo.
Avalie as duas e implemente a de melhor custo/benefício, explicando a escolha:

OPÇÃO A (preferida se viável) — instrumentar o loader:
  - Fazer tests/helpers/load-module.js instrumentar o código antes do vm.runInNewContext,
    ou trocar o mecanismo para que o v8 coverage do Vitest rastreie os módulos.
    Investigue: usar `vm.SourceTextModule`/`Script` com o coverage do V8, ou registrar
    os arquivos de forma que o Istanbul/v8 os enxergue. Mantenha os 206 testes passando.

OPÇÃO B (pragmática) — cobertura só onde é medível + honestidade:
  - Restringir coverage.include aos módulos realmente instrumentados hoje
    (ex.: tb-secure.js, tb-runtime.js e quaisquer outros carregados via import/require)
    para o número deixar de ser enganoso, e documentar no README/relatório que os
    módulos carregados por vm têm cobertura funcional via os 206 testes, não capturada
    pela métrica v8.
  - Opcional: migrar 1–2 módulos de lógica pura adicionais (ex.: tb-game-logic.js) para
    também exportarem via module.exports e serem importados nos testes, aumentando a
    cobertura MEDÍVEL de forma legítima.

REQUISITOS COMUNS:
- Após a mudança, `npm run test:coverage` roda limpo e o % reportado é interpretável.
- Reporte na resposta os números finais (statements/branches/functions/lines) e explique
  o que passou a ser medido.
- NÃO adicione threshold que quebre o CI ainda; apenas torne a métrica confiável.
- 206 testes + lint + typecheck verdes.

ENTREGA: a abordagem escolhida (com justificativa), diffs de vitest.config.js e/ou do
loader, e o novo relatório de cobertura.
```

---

## 🟡 Tarefa 3 — Fechar o ciclo server-side da economia (produção)

```
CONTEXTO: a fundação existe — firestore.rules nega escrita de coins/entitlements pelo
cliente, e functions/index.js já tem grantAdReward (onCall, com rate-limit). Falta a
validação de compra IAP real (hoje é um stub documentado: confirmIapPurchase) e o
caminho de deploy/testes.

OBJETIVO: implementar confirmIapPurchase de ponta a ponta (com verificação de receipt
do Google Play) e deixar as functions testáveis, SEM commitar segredos e SEM quebrar o
jogo offline.

1. Cloud Function confirmIapPurchase (functions/index.js):
   - onCall que recebe { productId, purchaseToken } do cliente.
   - Verifica a compra na Google Play Developer API (androidpublisher) usando uma
     service account. NÃO commite a chave: leia de variável de ambiente / secret do
     Firebase (functions:config ou Secret Manager). Documente onde configurar.
   - Idempotência: registrar o purchaseToken consumido (coleção iapReceipts) para não
     creditar duas vezes. Se já processado, retornar sucesso sem recreditar.
   - Ao validar, escrever coins/entitlements no doc users/{uid} (só a function escreve;
     as rules já bloqueiam o cliente).
   - Erros claros via HttpsError (invalid-argument, permission-denied, already-exists).

2. Cliente (tb-firebase.js ou wrapper existente):
   - Ao concluir uma compra no billing nativo (TileBlastBridge), chamar confirmIapPurchase
     e só então refletir o saldo/entitlement, reconciliando com o retorno do servidor.
   - Fallback gracioso: se offline/sem config, enfileirar para reconciliar depois — o
     jogo NÃO pode travar.

3. Testes:
   - Adicionar testes unitários para a lógica pura das functions (rate-limit, idempotência,
     mapeamento productId->coins) com a Play API mockada. Colocar em functions/ ou tests/
     conforme o setup do projeto. Devem rodar no gate.
   - Garantir que os 206 testes atuais continuam verdes.

4. Documentação:
   - Atualizar docs/ECONOMIA-SERVER-SIDE.md com o fluxo final e os passos de deploy
     (firebase deploy --only functions), config de secrets e criação da service account.
   - Adicionar itens correspondentes em play-store/CHECKLIST.md.

RESTRIÇÕES: zero segredos no repo; jogo offline intacto; lint + test + typecheck verdes.
ENTREGA: diffs de functions/index.js, do wrapper no cliente, dos novos testes, do doc
e do checklist; e a saída dos testes das functions verdes.
```

---

## 🟢 Tarefa 4 — Expandir `@ts-check` para mais módulos

```
CONTEXTO: hoje @ts-check + JSDoc cobrem tb-game-logic.js, tb-economy.js e tb-secure.js,
com jsconfig.json e `npm run typecheck` (tsc --noEmit) limpo.

OBJETIVO: ampliar a checagem de tipos para mais módulos, priorizando os de baixo
acoplamento e os recém-extraídos, mantendo tudo JS clássico (sem migrar para TS) e o
typecheck limpo.

1. Próximos alvos (adicione // @ts-check no topo e anote JSDoc até o tsc passar):
     - tb-state.js (pequeno, fonte de estado — ótimo candidato)
     - tb-runtime.js
     - tb-shop.js  (e os módulos que a Tarefa 1 extrair: tb-result.js, tb-map.js, tb-hud.js)
     - tb-content.js / tb-config.js se o esforço for baixo
2. Para cada módulo:
   - Anote funções públicas com @param/@returns e use @typedef para estruturas
     recorrentes (ex.: o objeto de save, cfg do init(cfg), o formato de item da loja).
   - Inclua o arquivo no `include` do jsconfig.json.
   - Rode `npm run typecheck` e resolva os erros com anotações/asserções JSDoc — NÃO
     mude comportamento nem silencie com @ts-ignore sem justificativa em comentário.
3. NÃO force tb-main.js/tb-roadmap.js ainda (grandes demais). Restrinja o escopo do
   typecheck aos arquivos já anotados.
4. Opcional: no CI (.github/workflows/test.yml), adicionar um step `npm run typecheck`
   marcado como não-bloqueante (continue-on-error) para dar visibilidade.

RESTRIÇÕES: só JSDoc/comentários — zero mudança de runtime; 206 testes + lint + typecheck verdes.
ENTREGA: lista dos módulos anotados, diff do jsconfig.json e a saída limpa do typecheck.
```

---

## Ordem recomendada

| # | Tarefa | Prioridade | Observação |
|---|--------|-----------|------------|
| 1 | Extrair mais de `tb-main.js` | 🔴 Alta | Maior impacto em arquitetura/manutenibilidade; é o teto da nota. |
| 4 | Expandir `@ts-check` | 🟢 Baixa | Fazer **junto/depois** da 1 — anote cada módulo assim que for extraído. |
| 2 | Cobertura representativa | 🟡 Média | Independente; melhora a confiança na métrica de QA. |
| 3 | Fechar ciclo IAP server-side | 🟡 Média | Maior esforço; exige conta Play + service account. Faça por último. |

- **Combine 1 + 4**: cada módulo novo já sai com `@ts-check` — evita retrabalho.
- Regra de ouro em todas: **`npm run lint && npm test && npm run typecheck` verdes** e
  **sincronizar o trio `scripts/modules.mjs` / `tile_blast.html` / `sw.js`** ao mexer em módulos.
