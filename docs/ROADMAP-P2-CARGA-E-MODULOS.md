# P2 — Reduzir custo de carga e quebrar módulos gigantes

Plano concreto para os itens P2 do roadmap de auditoria (2026-07-31). São
mudanças **arquiteturais** que alteram o comportamento real de carga/UX e
tocam pontos sincronizados por teste — devem ser feitas com validação de
produto, não às cegas.

## 1. Lazy-load do catálogo i18n (maior ganho)

**Situação:** `tb-i18n.js` tem ~77 KB; o catálogo `I18N.{pt,en,es}` é carregado
inteiro no boot como script clássico, mesmo o jogador usando um só idioma.

**Alvo:** carregar só `pt` no primeiro paint e buscar `en`/`es` sob demanda em
`setLanguage`.

**Passos:**
1. Separar o catálogo (`I18N`) da lógica de aplicação — ver item 2.
2. Extrair `en`/`es` para `data/i18n/en.json` e `data/i18n/es.json`.
3. Em `setLanguage(lang)`: se o dicionário não estiver carregado, `fetch` do
   JSON (com fila offline, como as demais chamadas de rede) e só então aplicar.
4. Manter `pt` embutido como fallback síncrono.
5. Ajustar `sw.js` para (a) não precachear os JSON extras e (b) cacheá-los
   sob demanda (runtime cache) — hoje o precache é derivado de `modules.mjs`.

**Riscos/sincronias:** `scripts/modules.mjs` (fonte única), precache do `sw.js`,
`scripts/build-bundle.mjs`, `tests/integration/architecture.test.js` e o
`i18n-matrix.mjs` (e2e). Medir com `npm run perf:lab` antes/depois e apertar
`data/perf-budgets.json`.

## 2. Quebrar `tb-i18n.js` e `tb-main.js`

**tb-i18n.js:** separar `catálogo de textos` (dados) de `aplicação` (lógica
`t()`, `setLanguage`, `applyI18n`). O catálogo vira dado (JSON/módulo de dados);
a lógica fica num módulo enxuto. Habilita o item 1.

**tb-main.js (1982 linhas, 0% de cobertura):** a própria `docs/ARCHITECTURE.md`
já aponta "reduzir accessors". Extrair grupos de `data-action` e wiring de
`init(cfg)` para submódulos coesos. Depois, cobrir via teste de boot em
happy-dom (maior alavanca de cobertura rumo aos 75%).

**Ordem sugerida:** (2) primeiro — a separação catálogo/lógica destrava (1) e
reduz o risco de cada passo.
