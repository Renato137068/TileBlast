# Tile Blast — Arquitetura (estado atual)

> Documento vivo, alinhado ao código e **validado por teste**
> (`tests/integration/architecture.test.js`). Atualize junto com o código.

## Visão geral
O jogo é um conjunto de **scripts clássicos** (sem `import/export`) que se
comunicam por **globais `window.TB*`**. A ordem de carga é a fonte única da
verdade em `scripts/modules.mjs`, espelhada pelas tags `<script>` do
`tile_blast.html` e pelo precache do `sw.js` (os três são mantidos em sincronia
por teste). O tabuleiro é renderizado em **canvas + requestAnimationFrame**.

Build: `scripts/build-bundle.mjs` concatena os módulos (mesma ordem) em
`www/app.bundle.js`. `scripts/minify-www.mjs` minifica o release. Ambos
consomem o mesmo manifesto `modules.mjs`. **Não editar `www/` à mão** —
usar `npm run sync:www`.

## Camadas e módulos (ordem de carga)

| # | Módulo | Provê | Camada | Notas |
|---|--------|-------|--------|-------|
| 1 | tb-config.js | TBConfig | Core | — |
| 2 | tb-state.js | TBState | Core (session) | — |
| 3 | tb-economy.js | TBEconomy | Economy | TBConfig |
| 4 | tb-content.js | TBContent | Content | — |
| 5 | tb-audio.js | TBAudio | Audio | Sound/Haptic |
| 6 | tb-analytics.js | TBAnalytics | Integrations | Antes de tb-global |
| 7 | tb-ui.js | TBUI | UI | — |
| 8 | tb-game-logic.js | TBLogic | Game | — |
| 9 | firebase-config.js | FIREBASE_CONFIG | Integrations | — |
| 10 | tb-firebase.js | TBFirebase | Integrations | — |
| 11 | tb-remote.js | TBRemote | Integrations | — |
| 12 | tb-i18n.js | TBI18n | Meta/i18n | catálogo pt/en/es + apply DOM |
| 13 | tb-achievements.js | TBAchievements | Meta | conquistas estendidas |
| 14 | tb-offers.js | TBOffers | Meta/monetização | BP, piggy, flash, ofertas, interstitial |
| 15 | tb-social.js | TBSocial | Meta | ranking, cloud save, perfil, share |
| 16 | tb-retention.js | TBRetention | Meta | login, changelog, session, push local |
| 17 | tb-roadmap.js | TBRoadmap | Meta | master levels, tutorial, remote, boot (~0.5k) |
| 18 | tb-global.js | TBGlobal | UI/glue | usa TBAnalytics |
| 19 | tb-features.js | TBFeatures | Meta | — |
| 20 | tb-push.js | TBPush | Integrations | — |
| 21 | tb-meta.js | TBMeta | Meta | — |
| 22 | tb-juice.js | TBJuice | Effects | — |
| 23 | tb-runtime.js | TBRuntime | Core | — |
| 24 | tb-secure.js | TBSecure | Core (save) | — |
| 25 | tb-save.js | TBSave | Core (save) | ld/sv, vidas, IAP, toast |
| 25 | tb-shop.js | TBShop | Economy/UI | init |
| 26 | tb-result.js | TBResult | Game/UI | init |
| 27 | tb-map.js | TBMap | Game/UI | init |
| 28 | tb-board.js | TBBoard | Canvas/render | init |
| 29 | tb-xp.js | TBXp | Meta | XP / nível |
| 30 | tb-collection.js | TBCollection | Meta | skins / fundos |
| 31 | tb-chests.js | TBChests | Meta | baús |
| 32 | tb-missions.js | TBMissions | Meta | missões diárias/semanais |
| 33 | tb-events.js | TBEvents | Meta | eventos em rotação |
| 34 | tb-challenges.js | TBChallenges | Meta | desafios diários |
| 35 | tb-meta-ui.js | TBMetaUI + AppTimers | Meta/UI | timers, facade |
| 36 | tb-gameplay.js | TBGameplay | Game | init |
| 37 | tb-music.js | TBMusic / Music | Audio | init |
| 38 | tb-ads.js | TBAds | Monetization | init |
| 39 | tb-playbridge.js | TBPlayBridge / PlayBridge | Integrations | IAP + ads nativos |
| 40 | tb-dialogs.js | TBDialogs | UI | tutorial/mascot/confetti/lives |
| 41 | tb-start.js | TBStart | Game/UI | start level, HUD, win/loss, countdown |
| 42 | tb-grid.js | TBGrid | Game | RNG, buildGrid, obstáculos, color supply |
| 43 | tb-modes.js | TBModes | Game | infinito, time, diário, seletor |
| 44 | tb-a11y.js | TBA11y | UI/a11y | announce, teclado, foco modal |
| 45 | tb-fx.js | TBFx | Effects | layout, partículas, shake, litHex |
| 46 | tb-input.js | TBInput | UI/input | canvas, botões, back, visibility |
| 47 | tb-main.js | (app) | Entry | orquestração |

## Invariantes garantidos por teste
`tests/integration/architecture.test.js`:
1. Todo módulo do manifesto está mapeado; **46** globais TB* de módulo.
2. Nenhuma referência `TB*` sem provedor.
3. Ordem dos `<script>` no HTML === `modules.mjs`.
4. SW precacheia todos os módulos.

## Boot
`tb-main.js` guarda o estado mutável de sessão (`score`, `grid`, `movesLeft`, …)
em `let` de módulo e injeta acessores nos demais módulos via `init(cfg)`. Isso
mantém uma única fonte da verdade sem `window.*` espalhado.

`bootApp()` é só a sequência das fases:

| Fase | O que inicializa |
|------|------------------|
| `_initCoreModules()` | fx, save, a11y, playbridge, music, ads, dialogs, meta-ui |
| *(await)* `loadGameContent()` + `registerTBActions()` | conteúdo de `data/` e allowlist de `data-action` |
| `_initScreenModules()` | shop, result, map |
| `_initGameplayModules()` | board, grid, start, modes, gameplay, input |
| `_initMetaModules()` | roadmap, global, features, meta, push |
| `_bindAudioAndBanners()` | mute inicial, música, banner de evento |
| `_runPostInit()` | timers, missões, baús, render do mapa |

`_sessionCfg()` devolve o bloco de acessores de sessão compartilhado; use
`_mergeCfg(a, b)` para compor cfgs — spread avaliaria os getters.

## Cobertura
Provider **v8**. Thresholds no Vitest (linhas, statements, funções, branches)
com ~3pp de folga sobre o valor atual. `npm run test:coverage`.

## Dívida arquitetural conhecida
- **`tb-main.js`** — wiring de `init(cfg)` ainda denso; próximo alvo: reduzir accessors.
- **Acoplamento por globais** `window.TB*` → migração ESM futura com shim.
- **Identificadores `ld`/`sv`/`C`** → renomear após ESM/bundler.
- **`tb-meta-ui.js`** — agora só timers + facade; missões/XP/coleção/baús/eventos/desafios
  já saíram para módulos próprios.
