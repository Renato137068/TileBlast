# Tile Blast — Refatoração AAA · Status & Blueprint

> Gerado nesta sessão. Todas as mudanças preservam 100% das features e passam
> nos testes existentes. Nenhuma funcionalidade removida.

## Rede de segurança
- **Sem git** nesta pasta (montagem Windows bloqueia `.git/config.lock`). O
  versionamento real deve ser inicializado no seu ambiente local:
  `git init && git add -A && git commit -m "baseline"` **antes** de continuar.
- Snapshot dos fontes bons em `outputs/_backups/good-state/`.
- ⚠️ Escritas de arquivos grandes pela pasta montada podem **truncar
  silenciosamente** (aconteceu 1x com `tb-main.js`, recuperado via `www/`).
  Edições no `tb-main.js` (4.8k linhas) devem ser feitas em ambiente local.

---

## ✅ CONCLUÍDO E VALIDADO

### Etapa 1 — Fundação / organização
- 23 documentos `.md`/`.html` de auditoria movidos para `docs/`. Raiz agora só
  tem `privacy.html` (runtime) e `tile_blast.html`.
- Confirmado que `www/` é **artefato de build** (gerado por `scripts/sync-www.js`),
  não deve ser editado à mão.
- **Validação:** nenhum doc é referenciado por código (`grep` limpo).

### Etapa 2 — Modularização do núcleo (extração segura)
- **Problema:** `tile_blast.html` = 5.266 linhas, com **um `<script>` inline de
  4.811 linhas** (289 funções) — núcleo do jogo preso no HTML, não testável.
- **Solução:** extração mecânica do bloco para `tb-main.js` (escopo global e
  ordem de execução idênticos → zero mudança semântica).
- **Resultado:** `tile_blast.html` 5.266 → **455 linhas**; `tb-main.js` criado.
- **Compatibilidade:** `sync-www.js` e `sw.js` atualizados; `www/` regenerado.
- **Validação:** `node --check` OK; boot integration **4/4**; unit **15/15**.

### Etapa 3 — Save seguro / anti-cheat
- **Problema:** save único em `localStorage` (`tbv4`), JSON plano, sem assinatura
  → edição trivial de moedas/vidas/progresso no DevTools.
- **Solução:** `tb-secure.js` — envelope assinado (cyrb53 com salt) com:
  - **Retrocompatível:** saves legados aceitos e migrados na próxima gravação.
  - **Não destrutivo:** adulteração é detectada (`window.__saveTampered`) sem
    apagar o save.
  - Escopo honesto documentado: é **dissuasor**, não garantia criptográfica
    (integridade real exige validação server-side).
- **Integração:** `ld()`/`flushSave()` em `tb-main.js` usam `TBSecure` com
  fallback seguro se o módulo não carregar.
- **Validação:** unit `secure.test.js` **5/5** (ok/tampered/legacy/corrupt/empty);
  boot **4/4**.

### Etapa 5 (fundação) — Performance & memória
- **Problema:** 57 `setTimeout` + 8 `setInterval` + 77 `addEventListener` sem
  limpeza central → leaks em sessões longas de mobile.
- **Entregue:** `tb-runtime.js` — registro de timers/listeners com `clearScope()`
  para desmontar telas por completo. Testado (**4/4**).
- **Pendente (QA em navegador):** migrar os call sites gradualmente para
  `TBRuntime.setTimeout/on(...)` com `scope` por tela (map/shop/battlepass/game).

### Etapa 7 (fundação) — Segurança / XSS
- **Problema:** 26+ sinks `innerHTML`; dados de rede (nomes de ranking, Remote
  Config, cloud) podem injetar HTML.
- **Entregue:** `TBRuntime.escapeHtml()` + `setText()`. Testado.
- **Pendente:** auditar cada `innerHTML` que interpola dado externo e envolver
  com `escapeHtml`. Sinks prioritários: leaderboard (`tb-roadmap.js`), changelog,
  qualquer render que use nome de jogador ou string de Remote Config.

---

## 🔧 BLUEPRINT — pendente (requer ambiente com git + QA em navegador)

### Etapa 4 — Quebrar o "god module" `tb-roadmap.js` (1.335 linhas)
Responsabilidades misturadas: conquistas, leaderboard, battle pass, ofertas
dinâmicas, login diário, changelog, cloud save, settings, i18n.
Plano: dividir em `src/meta/achievements.js`, `src/meta/battlepass.js`,
`src/economy/offers.js`, `src/social/leaderboard.js`, `src/save/cloud.js`,
`src/i18n/index.js`. Introduzir bundler (esbuild já está nas devDeps) com um
entrypoint que concatena `src/**` → substitui as 15+ tags `<script>` por 1.
Manter os `window.TB*` como shim de compatibilidade durante a transição.

### Etapa 6 — UI/UX premium
`css/variables.css` já tem tokens; expandir para escala tipográfica, espaçamento
(4/8pt), elevação e estados. Auditar fluxos para reduzir cliques (loja, vidas,
retorno de partida). Requer validação visual real — não fazer às cegas.

### Etapa 8 — i18n + acessibilidade + escala de conteúdo
Extrair strings PT-BR hardcoded para catálogo (`src/i18n/pt-BR.json` + `en.json`),
consumidas por uma função `t()` central (hoje presa no roadmap). Conteúdo
(fases/mundos) já é data-driven em `data/` — mover a lógica que o consome para
`src/worlds/` para escalar a 1000+ fases sem tocar no núcleo.

### Adoção das fundações (5 e 7)
Migrar timers/listeners para `TBRuntime` e envolver sinks `innerHTML` de dados
externos com `escapeHtml`, tela por tela, com o jogo aberto no navegador para
validar cada mudança.

---

## Ordem recomendada de retomada (em ambiente local com git)
1. `git init` + commit do estado atual.
2. Adotar `TBRuntime`/`escapeHtml` (Etapas 5/7) — mudanças pequenas, validáveis.
3. Introduzir esbuild + `src/` e migrar `tb-roadmap` (Etapa 4).
4. Etapas 6 e 8 com QA visual.

---

## Atualização — Etapa 4 (bundling), Legibilidade e A11y

### Legibilidade / Clean Code — ✅ feito
- Prettier + `.prettierrc`/`.editorconfig`/`.prettierignore`; todo o fonte JS/CSS
  formatado (tb-main.js 4.820→6.945 linhas legíveis). Scripts `npm run format`.
- Build agora minifica tb-main/secure/runtime (não minificava — release −37%).
- Bugs latentes da extração corrigidos: `sync-www`/`validate-versions` liam
  `APP_VERSION` do HTML (migrou p/ tb-main.js) — cache do SW voltou a ser `v146`.
- Pendente (Etapa 4): renomear identificadores de 1–2 letras (semântico, exige
  bundler + QA de navegador).

### Acessibilidade — ✅ feito
- Toggle "Reduzir animações" agora controla também as animações CSS + aplica no boot.
- `:focus-visible` consistente em todos os controles; `css/a11y.css`.
- Modo daltônico reforça a UI colorida (não só o tabuleiro); `prefers-contrast`.

### Etapa 4 — bundler (fatia segura entregue)
- `scripts/modules.mjs`: manifesto canônico único da ordem de carga (antes
  duplicado em vários scripts). `minify-www.mjs` agora consome o manifesto.
- `scripts/build-bundle.mjs` + `npm run build:bundle`: gera `www/app.bundle.js`
  (18 módulos → 1 arquivo minificado, −36%; 18 requisições → 1).
- Teste de equivalência `tests/integration/bundle.test.js`: prova que a
  concatenação carrega sem erro e expõe os 16 globais, e que o artefato está
  completo e em ordem.
- **Pendente (requer QA em navegador):** trocar as 18 tags `<script>` do
  index.html publicado pelo bundle único; migração para `src/` com ES modules
  (import/export) e split dos god-files (`tb-main`, `tb-roadmap`) por domínio;
  renomear identificadores curtos. O bundle já está pronto e testado para esse
  passo — falta apenas validar visualmente no jogo real.

### Segurança / Anti-cheat — ✅ feito (fatia segura)
- **XSS corrigido nos sinks reais:** nomes de jogador no ranking (`${g.name}`,
  2 sinks) e no input de nome, e nome/descrição de evento agora passam por
  `escapeHtml`. Os demais `innerHTML` são template estático/`t()`/números
  (confiáveis) — não tocados. Hardening extra: nome remove `<`/`>` ao salvar.
- **Anti-cheat agora tem efeito:** `window.__saveTampered` (setado quando o save
  falha a assinatura) passou a **bloquear o registro de pontuação no ranking**
  (`recordLeaderboardScore`) — antes o flag era setado mas ninguém reagia.
- **Firebase:** a config *web* (`firebase-config.js`) é só placeholder
  (`YOUR_API_KEY`) — nenhum segredo vazado. Adicionado ao `.gitignore` para
  evitar commit futuro de chaves. Nota: a apiKey web do Firebase é **pública por
  design**; a proteção real são **Security Rules + App Check** (server-side),
  não esconder a config.
- **Validação:** `security.test.js` **3/3** (bloqueio de score adulterado,
  registro normal, sanitização de nome); suíte completa verde.
- **Pendente (requer backend/QA):** validação server-side de scores e compras
  (billing verify), Play Integrity; adoção do `escapeHtml` nos demais sinks que
  venham a receber dado remoto (Remote Config/cloud) no futuro.

### Internacionalização (i18n) — ✅ feito (fatia de alto valor)
- Diagnóstico corrigido: o i18n **já era robusto** — catálogo `I18N` com **3
  idiomas de paridade perfeita (pt/en/es, 149 chaves cada)**, `t()` com fallback,
  `setLanguage`, `applyI18n` e seletor de idiomas. Todas as 97 chaves usadas
  existem — nenhuma chave crua vaza.
- **Gap real fechado — auto-detecção:** o jogo sempre abria em PT, mesmo em
  aparelho em inglês/espanhol. Adicionado `detectLanguage(navigator.language)`
  (pt/en/es, padrão internacional `en`) aplicado na 1ª execução — fricção zero
  para o público global.
- **Bug i18n corrigido:** o toast "Idioma alterado" era PT hardcoded (aparecia em
  português mesmo trocando para EN). Agora usa `t('lang_changed')` (nova chave nos
  3 catálogos).
- **Validação:** `i18n.test.js` **4/4** — mapeamento de idioma, auto-detecção no
  boot, troca de catálogo por idioma, e **paridade dos catálogos** (guarda contra
  chave sem tradução no futuro).
- **Pendente (organizacional):** o catálogo ainda vive dentro de `tb-roadmap.js`;
  extrair para `i18n/pt.json`/`en.json`/`es.json` é limpeza que acompanha a
  migração `src/` (Etapa 4). Poucas strings hardcoded remanescentes (ex.: toast de
  reduzir-animações) podem migrar para `t()` gradualmente.

### Arquitetura — ✅ feito (contrato explícito + validado)
- **Grafo de dependências mapeado** e documentado em `docs/ARCHITECTURE.md`
  (camadas, ordem de carga, nuance load-time vs runtime, dívida conhecida).
- **Contrato antes implícito → agora validado por teste** (`architecture.test.js`,
  4/4): (1) nenhuma referência `TB*` sem provedor, (2) ordem dos `<script>` ===
  `modules.mjs` (fonte única), (3) SW precacheia todos os módulos.
- **Bug arquitetural encontrado pelo teste e corrigido:** `TBAnalytics` era um
  `const` escondido em `tb-main.js` consumido por `tb-global.js` (dependência
  invertida). Exposto como global explícito `window.TBAnalytics`.
- **Pendente (migração src/, requer QA de navegador):** split dos god-files por
  domínio, ES modules com DI, renomear identificadores curtos, extrair
  `TBAnalytics` para módulo próprio.

### Monetização — ✅ feito (integridade de compra, fatia segura)
- **Exploit real corrigido:** "restaurar compras" chamava `applyIapPurchase`, que
  reconcedia `meta.coins` — dava para **farmar moedas** repetindo o restore de um
  pacote não-consumível (starter/welcome incluem moedas). Agora o bônus consumível
  (moedas/power-ups) só é concedido **uma vez** para não-consumíveis.
- **Lógica de decisão pura e testável** movida para `TBEconomy`
  (`isNonConsumable`, `shouldGrantIapBonus`), usando os flags reais do catálogo
  (`once`/`noAds`/`bpPremium`/`subscription`).
- **Ledger de recibos:** `applyIapPurchase(itemId, token)` registra o token e
  **bloqueia replay** do mesmo recibo — base direta para a verificação
  server-side futura. `onTileBlastPurchaseSuccess(itemId, token)` repassa o token
  (retrocompatível — funciona sem token).
- **Validação:** `monetization.test.js` **4/4** (classificação + anti-double-grant);
  suíte completa verde.
- **Pendente (requer backend):** verificação server-side de recibos via Play
  Developer API / Firebase Functions (o token já é capturado no ledger); o
  cliente permanece um dissuasor.

### Retenção — ✅ feito (congelamento de streak) + achado documentado
- **Feature aditiva de retenção:** streak de login agora tem **congelamento de
  1 dia** — perder exatamente 1 dia NÃO zera a sequência (mantém); 2+ dias zera.
  Padrão de mercado (Duolingo/Royal Match). Lógica extraída para função pura
  `computeLoginStreak` e testada (`retention.test.js` 6/6). Só beneficia o
  jogador; sem exploit (claim segue 1x/dia).
- **Achado NÃO alterado (decisão de produto):** os sistemas diários usam **duas
  fronteiras de dia diferentes** — login-streak/economia/puzzle usam **dia UTC**
  (`Date.now()/86400000`); missões e desafio diário usam **dia local**
  (`_localToday`). Isso desalinha os resets perto da meia-noite. NÃO unifiquei
  porque: mudar a escala do streak zeraria a sequência de todos os jogadores, e a
  escolha UTC×local afeta a UX do mercado-alvo (BR). **Requer sua decisão** de
  qual fronteira adotar; a unificação deve incluir migração dos campos salvos.

### UI/UX — ✅ ferramenta de QA visual + polimento seguro
- **Limitação real confirmada:** o sandbox NÃO baixa o Chromium (403 do host
  do Google), então o redesenho visual não pode ser validado aqui. Mas o
  Puppeteer/harness funciona — o Chrome existe na sua máquina (onde o e2e roda).
- **Entregue — harness de QA visual:** `scripts/screenshot.mjs` + `npm run ui:shots`.
  Sobe www/, semeia um save, dispensa overlays e captura PNGs em `screenshots/`
  (mapa, tabuleiro, loja) em viewport mobile 400×860 @2x. Rode antes/depois de
  cada mudança de UI para comparar — transforma o redesenho premium num loop
  validável localmente.
- **Polimento premium seguro:** feedback de toque (press-down `scale(0.96)`) nos
  botões — microinteração tátil padrão de jogos AAA, só `transform` (barato p/
  GPU), não afeta botões desabilitados. Provadamente seguro (não muda layout).
- **Pendente (rode o harness p/ validar):** redesenho de hierarquia, ritmo de
  espaçamento (tokens 4/8pt já existem), sombras/elevação e grading de cor — tudo
  precisa dos screenshots reais para ser feito sem regressão visual.

### Google Play readiness — ✅ feito (invariantes de publicação testados)
- **Auditoria:** config em boa forma — versões alinhadas (APP_VERSION 1.4.6 =
  gradle 1.4.6, versionCode 11), **targetSdk 35** (cumpre exigência do Play ≥34),
  manifest PWA completo com ícone maskable, permissões justificadas (sem excesso).
- **Entregue — teste de bloqueadores de publicação** (`play-readiness.test.js`,
  6/6): valida sincronia APP_VERSION↔versionName, versionCode inteiro>0, targetSdk
  ≥34, campos obrigatórios do manifest + ícones 192/512/maskable, ícones existem e
  não estão vazios, e o **cache do SW reflete o APP_VERSION** (guarda contra o bug
  de cache que corrigi). Como roda no `npm test`, entra no gate do `pre-publish`.
- **Pendente (requer backend):** Play Integrity server-side (o cliente já captura
  tokens de compra no ledger — mesma base serve para anexar token de integridade);
  preenchimento do formulário de Data Safety no Console (AD_ID/analytics/compras).

### Bugs de runtime corrigidos (achados via console do jogo real)
- **`WORLD_CLS is not defined` (tb-main.js, renderMap):** `WORLD_CLS[lv.world]`
  era referenciado mas a constante nunca existiu — lançava ReferenceError e
  **interrompia a renderização do mapa** quando `wMeta` era nulo. Corrigido para
  `(wMeta && wMeta.cssClass) || ''`. Bug pré-existente, independente do protocolo.
- **`remoteConfig()` quebrava antes do `init` (tb-roadmap.js):** chamava `C.ld()`
  sem checar `C` — crash no caminho de fallback de falha de conteúdo. Corrigido
  para `C ? C.ld() : {}` (usa defaults com segurança). Teste `robustness.test.js` 1/1.
- **Nota:** abrir o jogo com duplo-clique (`file://`) gera os erros de CORS/fetch
  de `data/` e `remote-config.json` — é esperado; o jogo exige servidor local
  (`JOGAR.bat` ou `npm run serve:pwa`). Os fixes acima o tornam mais robusto, mas
  o conteúdo só carrega via http.

### Blindagem contra bugs de "identificador indefinido" (classe do WORLD_CLS)
- **Contexto:** o crash `WORLD_CLS is not defined` (que sumia o mapa) é de uma
  classe inteira — referências a algo que não existe em lugar nenhum — que os
  testes não pegavam.
- **Porteiro de CI:** `npm run lint` (`scripts/lint-globals.mjs` + `eslint.config.mjs`)
  concatena os módulos na ordem canônica (modela o escopo global único do runtime)
  e roda ESLint `no-undef`. Pega exatamente essa classe de bug. Hoje: **limpo**.
- **8 bugs latentes corrigidos:** vários módulos usavam `})(...: global)` como
  fallback de IIFE — `global` não existe no navegador/worker (só no Node). No
  browser não quebrava (curto-circuito via `window`), mas era frágil. Todos
  padronizados para `globalThis` (universal). ESLint confirma 0 `no-undef` em 13k
  linhas — nenhuma outra referência indefinida no código.
- eslint adicionado às devDependencies; `npm run lint` pronto para o gate.

### Retenção (rodada 2) — bônus semanal de login virou real
- **Promessa quebrada corrigida:** o modal do login diário exibia "🏆 Sequência de
  N dias! **Bônus especial!**" a cada 7 dias, mas a recompensa era **idêntica** aos
  outros dias (o `isWeek` era só texto — como o `__saveTampered` que era ignorado).
- **Bônus semanal real:** função pura `computeLoginReward(streak, rewards)` — no
  marco de 7 dias a recompensa **dobra**, entregando o que a UI já anunciava.
  Antecipação semanal é alavanca clássica de retenção. Só beneficia o jogador.
- **Validação:** `retention.test.js` **10/10** (streak-freeze + bônus semanal:
  base, marco×2, teto sem bônus, robustez a streak 0 / rewards vazio).

### Performance + Acessibilidade (rodada 2)
- **Perf — will-change permanente removido:** `.screen.active` tinha
  `will-change: transform, opacity` fixo, mantendo uma camada de composição na
  GPU o tempo todo (desperdício em Android Go/2GB) — o correto é transitório.
  Removido; a animação de entrada segue funcionando. Telas inativas já são
  `display:none` (custo zero) e o loop rAF já para sem tabuleiro — ambos ok.
- **A11y — avisos `aria-hidden` resolvidos:** `showScreen` agora aplica `inert`
  nas telas inativas, que remove foco/teclado delas (elimina "descendant retained
  focus"). Compatível com WebView moderno (targetSdk 35).
- **Nota:** o gate `npm run lint` pegou um bug que introduzi (aspas de string
  quebradas por escaping → `id !== map` indefinido) ANTES de virar crash —
  demonstrando o valor do porteiro no-undef. Corrigido; lint limpo.
- **Validação:** boot/bundle/arquitetura/play-readiness verdes; `no-undef` limpo.

### Escalabilidade de conteúdo + UI/UX (rodada 2)
- **Escalabilidade — gate de integridade de conteúdo** (`content-integrity.test.js`,
  4/4): valida que manifest↔worlds↔arquivos batem (count === levelCount, cada
  arquivo tem `levels.length` correto), que `unlockAtLevel` segue a **soma
  cumulativa** (progressão sem buracos/sobreposição), e que toda fase tem **id
  único global**, `worldId` correto, `moves` em faixa válida e objetivos válidos.
  Estado atual: 85 fases, 0 duplicados, tudo consistente. Agora dá para adicionar
  500–1000 fases e qualquer inconsistência falha no `npm test` antes de publicar.
- **UI/UX — estado desabilitado consistente:** botões gerais (`.btn`/`.map-qbtn`/
  `.btn-map`) não comunicavam indisponibilidade (só o `.pu-btn` do tabuleiro tinha).
  Adicionado opacidade + cursor `not-allowed`. Seguro e padrão.
- **Pendente UI/UX:** o redesenho premium (hierarquia/espaçamento/grading) segue
  dependendo do loop de screenshots (`npm run ui:shots`) no seu ambiente.
- **Validação:** content-integrity/boot/play-readiness verdes; lint no-undef limpo.

### Performance/Arquitetura — bundle único adotado em produção
- **Adoção segura do bundler:** `npm run build:prod` gera o `www` de produção
  trocando as **18 tags `<script src="tb-*.js">` por 1 `<script src="app.bundle.js">`**
  (18 requisições → 1; carga inicial mais rápida, menos overhead de parse).
- **Por que é seguro:** o bundle é a concatenação byte-a-byte dos mesmos módulos
  na mesma ordem — `bundle.test.js` prova que carrega e expõe os 16 globais
  identicamente. O navegador executa o mesmo código, só que em 1 request.
- **Dev intacto:** `serve:pwa` continua com as 18 tags (depuração por arquivo);
  `build:prod` produz o bundlado sob demanda. `app.bundle.js` no precache do SW
  (offline). `bundle-www.mjs` expõe transformação pura testada.
- **Validação:** `bundled-www.test.js` 2/2 (18 tags → 1, HTML preservado) +
  build:prod rodado ponta-a-ponta (0 tags de módulo restantes); lint limpo.
- **Pendente:** trocar `build:release`/`play:bundle` para usar `build:prod` após
  1 validação visual no jogo — o pipeline atual (18 tags) segue funcionando.

### Segurança — auditoria de XSS/injeção concluída (superfície limpa) + invariante
- **Auditoria completa da superfície de XSS/injeção:**
  - Remote Config (`remote-config.json`/Firestore): só números/IDs/datas — **não
    injeta HTML**. `_remoteOverrides` só filtra evento por ID/data.
  - Conteúdo (mundos/eventos/missões): app-authored (bundled, mesma origem).
  - Sem `eval`/`new Function`/timer-por-string (zero execução dinâmica de código).
  - Params de URL (`?play`, `?challenge`, `?seed`): usados como roteamento/números
    com bounds-check (`parseInt`, faixa validada) — **nunca renderizados** (sem
    XSS refletido/DOM).
  - Dados de usuário/cloud (nome do jogador, nomes de ranking): já escapados.
- **Invariante testado** (`content-safety.test.js`, 7/7): garante que nenhum valor
  string em remote-config/mundos/eventos/missões/desafios/modos contém `<`/`>`
  (HTML) — torna seguros-por-invariante os sinks `innerHTML` que renderizam
  conteúdo. Se alguém adicionar um label com HTML, o `npm test` falha.
- **Conclusão:** superfície client-side de XSS/injeção está limpa e guardada por
  teste. O que resta é genuinamente server-side (billing/score validation,
  Play Integrity), que exige backend.

### Acessibilidade (rodada 3) — inert nos modais + health check completo
- **Modais/overlays:** `TBUI.showModal`/`closeModal` agora aplicam `inert` no
  `#app` de fundo (além do aria-hidden) — move o foco para fora do fundo mesmo
  quando o modal não tem elemento focável, eliminando o resto dos avisos
  "aria-hidden com foco retido". `#global-modal` é irmão de `#app` (confirmado),
  então o inert no fundo não afeta o modal.
- **Incidente/recuperação:** a ferramenta de edição truncou o `tb-ui.js` (perdeu o
  export do IIFE) — recuperei via `www/tb-ui.js` (versão boa) e reapliquei por sed.
  Reforça: edições grandes pela pasta montada precisam de verificação (o
  `node --check` + lint pegaram na hora).
- **Health check:** suíte COMPLETA verde (todas as ~27 suítes, ~160 testes) +
  `npm run lint` limpo, após todas as mudanças da sessão.

## UI/UX ao vivo — rótulo de objetivo (sessão de observação)
- **Item (4) compreensão da meta**: `#hud-obj` renderizava só `[ícone][barra][curr/target]`, sem palavra que indicasse ser a META da fase (padrão AAA: Royal Match/Toy Blast sempre rotulam a área do objetivo).
- Adicionado rótulo localizado `OBJETIVO`/`GOAL`/`OBJETIVO` (pt/en/es) como primeiro chip da linha de objetivos, `aria-hidden` para não repetir no `aria-live` a cada tick de score.
- Arquivos: `tb-roadmap.js` (3 chaves i18n, paridade mantida), `tb-main.js` (`_refreshObjDisplay`), `css/hud.css` (`.obj-label`).
- Validação: `node --check`, `npm run lint` (no-undef limpo), i18n/content-integrity/architecture/play-readiness (18 testes) verdes; `sync-www` propagado (SW `tileblast-v146`).
