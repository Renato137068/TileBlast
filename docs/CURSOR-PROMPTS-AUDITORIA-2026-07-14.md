# Prompts para o Cursor — Melhorias da Auditoria (2026-07-14)

Prompts derivados da auditoria (`docs/AUDITORIA-COMPLETA-2026-07-14.html`). Cada tarefa é
**independente** — envie uma por sessão do Cursor (modo Agent/Composer).

**Como usar:** cole primeiro o **BLOCO DE CONTEXTO** abaixo, depois o prompt da tarefa
desejada. Ordem sugerida: 🔴 ALTA → 🟡 MÉDIA → 🟢 BAIXA.

---

## 📌 BLOCO DE CONTEXTO (cole no início de CADA sessão)

```
Você está trabalhando no Tile Blast, um jogo puzzle (web empacotado via Capacitor para Android).

Convenções OBRIGATÓRIAS deste repositório:
- Scripts CLÁSSICOS (sem import/export). Módulos se comunicam por globais window.TB*
  (TBConfig, TBEconomy, TBContent, TBLogic, TBRoadmap, TBGlobal, TBMain, etc.).
- A ORDEM DE CARGA é fonte única da verdade em scripts/modules.mjs e precisa estar
  espelhada em: as tags <script> de tile_blast.html E o precache de sw.js.
  O teste tests/integration/architecture.test.js FALHA se os três divergirem.
- Qualquer global TB* novo precisa ser registrado em eslint.config.mjs (lista `app`),
  senão `npm run lint` acusa no-undef.
- O código-fonte fica na RAIZ (tb-*.js). www/ é build gerado — NÃO edite www/ à mão;
  rode `npm run sync:www` (ou build:bundle) para regenerar.
- Formatação: Prettier (npm run format). Estilo do projeto: nomes curtos, pt-BR nos
  comentários de domínio, escape de HTML via _escTB()/TBRuntime.escapeHtml().

GATE DE QUALIDADE (rode ao final de TODA tarefa, tem que ficar verde):
  npm run lint      # ESLint no-undef sobre o bundle concatenado
  npm test          # 195 testes (Vitest) — NÃO pode regredir
Se algo ficar vermelho, conserte antes de encerrar. Ao terminar, liste os arquivos
alterados e mostre os diffs relevantes.
```

---

## 🔴 ALTA — Tarefa 1: Quebrar o monólito `tb-main.js`

```
OBJETIVO: reduzir tb-main.js (~7.243 linhas / 270 funções) extraindo módulos coesos
por domínio, SEM mudar comportamento e mantendo os 195 testes + lint verdes.

Faça de forma INCREMENTAL e segura (um módulo por vez):

1. Mapeie tb-main.js e identifique blocos coesos candidatos a extração. Comece pelo
   mais isolado. Sugestão de ordem (valide no código real antes):
     a) Loja (funções shop*, refreshShopOffers, shopBuyCoin/IAP...) -> tb-shop.js
     b) Tela de resultado/vitória (res-*, render de estrelas/recompensas) -> tb-result.js
     c) Render do mapa/fases (map grid, world cards) -> tb-map.js
   NÃO tente extrair tudo de uma vez.

2. Para CADA módulo extraído:
   - Crie tb-<nome>.js na raiz seguindo o padrão IIFE dos outros:
       (function (global) { 'use strict'; ...; global.TBShop = {...}; })(window);
   - Mova as funções, expondo no global TB<Nome> APENAS o que outros módulos chamam.
     Funções ainda referenciadas por onclick inline no HTML ou por tb-main precisam
     continuar acessíveis (via global TB<Nome>.fn ou re-export em window).
   - Insira o novo módulo na ORDEM CORRETA em scripts/modules.mjs (antes de tb-main.js,
     depois de quem ele depende).
   - Espelhe a MESMA ordem nas tags <script> de tile_blast.html e no ASSETS de sw.js.
   - Registre o novo global (ex.: 'TBShop') na lista `app` de eslint.config.mjs.
   - Atualize a tabela de módulos em docs/ARCHITECTURE.md.
   - Rode `npm run lint && npm test` — os DOIS têm que passar. Só então prossiga para
     o próximo módulo.

3. Se um teste de arquitetura/boot quebrar, é sinal de dessincronização do trio
   modules.mjs / tile_blast.html / sw.js — corrija a ordem.

RESTRIÇÕES:
- Comportamento idêntico. Nada de renomear funções públicas nem alterar lógica.
- Não edite www/ à mão (é build). Rode `npm run sync:www` se precisar validar o bundle.
- Meta desta sessão: extrair 1–2 módulos com verde total. Não force o escopo inteiro.

ENTREGA: para cada módulo extraído, mostre o diff de modules.mjs, tile_blast.html,
sw.js, eslint.config.mjs e o novo arquivo; e a saída de `npm test` verde.
```

---

## 🟡 MÉDIA — Tarefa 2: Adicionar Content-Security-Policy

```
OBJETIVO: adicionar uma CSP como defesa em profundidade para as ~41 escritas de
innerHTML (hoje escapadas por _escTB, mas sem barreira de plataforma).

1. Levante o que a página realmente carrega para NÃO quebrar nada:
   - Fonte Google Fonts (fonts.googleapis.com / fonts.gstatic.com).
   - Firebase (se ativo): domínios *.googleapis.com, *.firebaseio.com, gstatic.
   - AdMob/gtag se presentes.
   - Scripts inline no <head> de tile_blast.html (há um bloco inline que injeta o
     manifest e o onload de fonte) e handlers onclick inline no HTML.

2. Adicione uma <meta http-equiv="Content-Security-Policy"> no <head> de
   tile_blast.html com uma política realista para este app. Ponto de partida:
     default-src 'self';
     img-src 'self' data:;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     font-src 'self' https://fonts.gstatic.com;
     script-src 'self' <domínios necessários p/ firebase/ads, se houver>;
     connect-src 'self' <endpoints firebase/remote-config>;
     frame-src <se houver ad frames>;
     object-src 'none'; base-uri 'self';
   IMPORTANTE: como HÁ scripts inline e onclick inline hoje, ou (a) mantenha
   'unsafe-inline' em script-src temporariamente e abra um item para removê-lo depois
   (ligado à Tarefa 6), ou (b) mova os inline para arquivos e use 'self' puro.
   Deixe explícito no comentário qual escolha foi feita e por quê.

3. Espelhe a mesma <meta> no www/index.html (ou garanta que o pipeline de build a
   propague — verifique scripts/sync-www.js e minify-www.mjs).

4. VALIDE de verdade: rode o app (npm run serve:pwa ou abra www/index.html), abra o
   console e confirme ZERO violações de CSP durante: splash -> mapa -> jogar uma fase
   -> abrir loja -> resultado. Ajuste a política até o console ficar limpo.

5. `npm run lint && npm test` verdes.

ENTREGA: a policy final comentada, lista dos domínios que precisou liberar e por quê,
e confirmação de console sem violações no fluxo testado.
```

---

## 🟡 MÉDIA — Tarefa 3: Encapsular o estado global mutável

```
OBJETIVO: reduzir o acoplamento causado por estado mutável no realm global. Hoje
identificadores como lvIdx, LEVELS, isInfiniteMode, isDailyPuzzleMode são declarados
em tb-main.js e lidos/escritos por módulos satélites (ver a lista `shared` em
eslint.config.mjs). Queremos um ponto único de acesso, SEM regressão.

Abordagem conservadora (preferida, baixo risco):
1. Crie um objeto de estado único, ex.: window.TBState = { lvIdx:0, LEVELS:[],
   isInfiniteMode:false, isDailyPuzzleMode:false, ... } exposto por um módulo novo
   tb-state.js (IIFE, registrado em modules.mjs/tile_blast.html/sw.js/eslint como
   os demais — ver contexto).
2. Faça as variáveis globais atuais passarem a delegar para TBState (ex.: manter
   `lvIdx` como acessor fino, ou migrar os pontos de uso um a um para TBState.lvIdx).
   Migre INCREMENTALMENTE, um identificador por vez, rodando `npm test` a cada passo.
3. Ao final, o objetivo é que `shared` em eslint.config.mjs encolha (idealmente
   desapareça), com os módulos lendo TBState.* em vez de globais soltos.

RESTRIÇÕES:
- Comportamento idêntico; nenhuma mudança de lógica de jogo.
- Se um identificador for muito entrelaçado (ex.: LEVELS), pode deixá-lo para depois
  e documentar no diff — prefira segurança a completude.
- npm run lint && npm test verdes a cada etapa.

ENTREGA: tb-state.js, lista dos identificadores migrados, diff de eslint.config.mjs
(lista `shared` reduzida) e testes verdes.
```

---

## 🟡 MÉDIA — Tarefa 4: Validação server-side da economia (design + fundação)

```
OBJETIVO: hoje moedas/vidas/IAP são "client-trust" (o cliente é a autoridade). Como
o jogo já usa Firebase, projete e comece a fundação de validação no servidor para os
eventos sensíveis, SEM quebrar o jogo offline.

Esta é uma tarefa de DESIGN + primeiro passo, não a reescrita completa:

1. Escreva docs/ECONOMIA-SERVER-SIDE.md descrevendo:
   - Quais eventos precisam de autoridade do servidor: concessão de moedas por anúncio,
     validação de compra IAP (receipt do Google Play Billing), cap diário de anúncios,
     recompensa de login/streak, submissão de score no ranking.
   - Modelo de dados no Firestore (coleção users/{uid}: coins, entitlements, adGrants
     com timestamps para rate-limit) e regras de segurança (Security Rules) que impedem
     o cliente de escrever coins diretamente — só Cloud Functions escrevem.
   - Fluxo: cliente chama uma Callable Function -> function valida (rate-limit / receipt)
     -> escreve saldo -> cliente reconcilia. Offline: fila local que sincroniza depois.

2. Implemente a FUNDAÇÃO mínima (sem cobrar dinheiro real ainda):
   - Um wrapper em tb-firebase.js (ou módulo novo) para chamar Callable Functions,
     com fallback gracioso quando offline/sem config (o jogo NÃO pode travar).
   - Firestore Security Rules de exemplo em um arquivo firestore.rules (negando escrita
     de coins pelo cliente).
   - Esqueleto de Cloud Function (pasta functions/ ou doc) para grantAdReward com
     rate-limit por timestamp — pode ser stub documentado se não houver ambiente Node
     de functions no repo.

3. Deixe claro o que fica para follow-up (validação de receipt IAP real exige conta
   Play + service account) e adicione itens a play-store/CHECKLIST.md.

RESTRIÇÕES: jogo offline continua funcionando; nada de segredos no repo; lint+test verdes.
ENTREGA: o doc de design, firestore.rules, o wrapper client com fallback, e o esqueleto
de function (ou sua especificação).
```

---

## 🟢 BAIXA — Tarefa 5: Cobertura de testes no CI

```
OBJETIVO: medir e publicar cobertura de testes (hoje não há métrica configurada).

1. Adicione o provider de cobertura do Vitest ao devDependencies
   (@vitest/coverage-v8, versão compatível com vitest ^3).
2. Configure em vitest.config.js: test.coverage = { provider: 'v8',
   reporter: ['text','text-summary','html','lcov'], reportsDirectory: './coverage',
   include: ['tb-*.js'], exclude: ['www/**','tests/**','scripts/**','android/**'] }.
   Ajuste include/exclude para refletir o código de produção real (módulos tb-*.js na raiz).
3. Adicione script em package.json: "test:coverage": "vitest run --coverage".
4. Adicione ./coverage/ ao .gitignore.
5. No workflow .github/workflows/test.yml, no job unit-and-boot, troque `npm test` por
   `npm run test:coverage` (ou adicione um passo) para o resumo de cobertura aparecer
   nos logs do CI. NÃO adicione threshold que quebre o build ainda — apenas relate.
6. Rode `npm run test:coverage` localmente e reporte os percentuais globais (statements/
   branches/functions/lines) na sua resposta.

RESTRIÇÕES: os 195 testes continuam verdes; não altere testes existentes.
ENTREGA: diffs de vitest.config.js, package.json, .gitignore, test.yml e o % de cobertura obtido.
```

---

## 🟢 BAIXA — Tarefa 6: Migrar handlers `onclick` inline para listeners

```
OBJETIVO: remover atributos onclick inline do HTML (ex.: onclick="shopBuyCoin('bomb')",
onclick="openMissionsModal()", onclick="TBRoadmap.purchaseSubscription(...)"), movendo
para addEventListener em JS. Isso melhora a separação de responsabilidades e permite
uma CSP sem 'unsafe-inline' em script-src (ver Tarefa 2).

1. Faça um levantamento de TODOS os onclick inline em tile_blast.html (e no HTML gerado
   por template literals dentro de tb-*.js, se houver — esses são mais delicados).
2. Estratégia recomendada por DELEGAÇÃO de eventos, para não ter que religar handlers
   criados dinamicamente:
   - Troque onclick="shopBuyCoin('bomb')" por data-action="shopBuyCoin" data-arg="bomb".
   - Num ponto de init (ex.: tb-main.js boot), registre UM listener delegado que lê
     data-action/data-arg e chama a função correspondente de um mapa de ações permitido.
   - Isso cobre inclusive elementos inseridos via innerHTML depois.
3. Migre de forma incremental por tela (loja, mapa, resultado...), rodando os e2e
   relevantes (npm run test:e2e ou os específicos: test:gameplay, test:win, test:loss)
   para garantir que os cliques ainda funcionam.
4. Após a migração, valide manualmente o fluxo principal no browser: cada botão migrado
   ainda responde.

RESTRIÇÕES: comportamento idêntico; sem regressão nos e2e; lint+test verdes.
Se algum handler for arriscado de migrar, deixe-o e documente — prefira segurança.
ENTREGA: lista dos handlers migrados, o mecanismo de delegação e confirmação dos e2e verdes.
```

---

## 🟢 BAIXA — Tarefa 7: Segurança de tipos incremental (`@ts-check` + JSDoc)

```
OBJETIVO: introduzir checagem de tipos leve, sem migrar para TypeScript nem mudar o
runtime (continua JS clássico). Comece pelos módulos de LÓGICA PURA, que são os mais
fáceis e de maior retorno.

1. Adicione um jsconfig.json na raiz com checkJs seletivo, ou use o comentário
   // @ts-check no topo dos módulos-alvo. Comece por:
     - tb-game-logic.js (lógica pura, já bem estruturada)
     - tb-secure.js
     - tb-economy.js
2. Anote as funções públicas desses módulos com JSDoc (@param/@returns/@typedef) até
   o `tsc --noEmit` (via typescript como devDependency, SEM emitir) não acusar erros
   nesses arquivos. Adicione um script "typecheck": "tsc --noEmit -p jsconfig.json"
   e rode-o.
3. NÃO tente tipar tb-main.js/tb-roadmap.js agora (muito grande — fica para depois da
   Tarefa 1). Restrinja o escopo do typecheck aos arquivos já anotados via include.
4. Opcional: adicione um job/step de typecheck no CI marcado como não-bloqueante
   (continue-on-error) para dar visibilidade sem travar merges.

RESTRIÇÕES: zero mudança de comportamento (JSDoc/comentários apenas); lint+test verdes.
ENTREGA: jsconfig.json, os módulos anotados, o script typecheck e sua saída limpa nos
arquivos escolhidos.
```

---

## Ordem recomendada e observações

| # | Tarefa | Prioridade | Depende de | Esforço |
|---|--------|-----------|-----------|---------|
| 1 | Quebrar `tb-main.js` | 🔴 Alta | — | Alto (incremental) |
| 3 | Encapsular estado global | 🟡 Média | ajuda 1 | Médio |
| 6 | Remover `onclick` inline | 🟢 Baixa | facilita 2 | Médio |
| 2 | Content-Security-Policy | 🟡 Média | 6 (ideal) | Baixo |
| 4 | Economia server-side | 🟡 Média | — | Alto (design) |
| 5 | Cobertura no CI | 🟢 Baixa | — | Baixo |
| 7 | `@ts-check` + JSDoc | 🟢 Baixa | 1 (ideal) | Baixo |

- **Faça 6 antes de 2**: remover os `onclick` inline permite uma CSP mais forte
  (sem `'unsafe-inline'` em `script-src`).
- **Tarefas 1 e 3 se reforçam**: extrair módulos fica mais limpo com o estado num
  objeto único (`TBState`).
- Regra de ouro em todas: **`npm run lint && npm test` verdes** e **sincronizar o trio
  `scripts/modules.mjs` / `tile_blast.html` / `sw.js`** sempre que mexer em módulos.
