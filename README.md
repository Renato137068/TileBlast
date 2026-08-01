# Tile Blast

Puzzle *tap-to-blast* em HTML5 canvas, empacotado como PWA e como app Android
(Capacitor). Sem framework e sem build obrigatório: o jogo roda abrindo o HTML.

- **Pacote Android:** `com.tileblast.game`
- **Versão do app:** `1.4.9` (constante `APP_VERSION` em `tb-main.js`)
- **Requisitos:** Node.js 18+ (só para scripts, testes e build)

## Começando

```bash
npm install
npm run serve:pwa        # http://localhost:8080
```

No Windows, `JOGAR.bat` faz o mesmo com duplo clique.

Para abrir sem servidor, basta abrir `tile_blast.html` no navegador — o service
worker e os recursos de rede ficam desligados no protocolo `file:`.

## Como o código está organizado

Os módulos são **scripts clássicos** (sem `import`/`export`) que se comunicam por
globais `window.TB*`. Cada um é uma IIFE que expõe `init(cfg)` para receber suas
dependências, e `tb-main.js` orquestra o boot.

A ordem de carga vive em `scripts/modules.mjs` e é a fonte única da verdade:
`tile_blast.html`, o precache do `sw.js` e o bundle de release derivam dela, e um
teste falha se os três saírem de sincronia.

Detalhes de camadas, fases do boot e dívida conhecida em
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```
tb-*.js            módulos do jogo (raiz)
css/               estilos
data/              níveis, eventos e conteúdo remoto
functions/         Cloud Functions (economia server-side)
android/           projeto Capacitor
www/               saída gerada — nunca editar à mão
tests/             unit + integração (Vitest) e e2e (Puppeteer)
docs/              arquitetura, auditorias e guias
play-store/        assets e checklist de publicação
```

## Scripts

| Comando | O que faz |
|---------|-----------|
| `npm test` | Unit + integração (Vitest) |
| `npm run test:coverage` | Cobertura v8 com thresholds |
| `npm run test:e2e` | E2E em Chrome headless (sobe `www/` em :8080) |
| `npm run test:all` | `test` + `test:e2e` |
| `npm run lint` | Referências globais indefinidas no bundle concatenado |
| `npm run typecheck` | `tsc --noEmit` sobre o JSDoc |
| `npm run format` | Prettier |
| `npm run sync:www` | Regenera `www/` a partir da raiz |
| `npm run build:prod` | Bundle + minificação para release |
| `npm run android` | Sync + abre o projeto no Android Studio |
| `npm run play:release` | Gate completo + assets + AAB assinado |

Se o `test:e2e` reclamar que não achou o Chrome, rode
`npx puppeteer browsers install chrome`.

## Antes de commitar

```bash
npm run lint && npm run typecheck && npm test && npm run test:e2e
```

Ao adicionar um módulo `tb-*.js`, registre-o em `scripts/modules.mjs`,
`tile_blast.html`, `sw.js`, `scripts/sync-www.js`, `eslint.config.mjs`,
`jsconfig.json` e na tabela de `docs/ARCHITECTURE.md` — os testes de arquitetura
cobrem essa lista.

## Backend e monetização

Anúncios recompensados e IAP passam pela ponte nativa (`tb-playbridge.js` ↔
`TileBlastBridge.java`). Compras são creditadas localmente para a UX não travar e
validadas no servidor via `confirmIapPurchase` com o *purchase token* da Play.
O desenho completo está em
[`docs/ECONOMIA-SERVER-SIDE.md`](docs/ECONOMIA-SERVER-SIDE.md).

Configuração do Firebase: copie `firebase-config.example.js` para
`firebase-config.js`. Sem config válida o jogo funciona 100% offline — as
chamadas ficam numa fila local e são reenviadas depois.

## Publicação

Guia passo a passo em
[`docs/LEIA-ME-PUBLICACAO.md`](docs/LEIA-ME-PUBLICACAO.md) e
[`play-store/SO-PUBLICAR.md`](play-store/SO-PUBLICAR.md).
