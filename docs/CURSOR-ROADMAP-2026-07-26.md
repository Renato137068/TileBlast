# Roadmap Tile Blast — pronto para enviar ao Cursor

Data: 2026-07-26  
Versão observada: 1.4.8 / versionCode 13  
Objetivo: transformar o Tile Blast em um produto global de referência no segmento de tap-to-blast.

## Contexto objetivo

O loop atual está funcionando e a base técnica é boa:

- 69 arquivos de teste e 461 testes passando.
- E2E passando em smoke, gameplay, vitória, derrota, progresso e mapa.
- `npm run lint` e `npm run typecheck` passando.
- Conteúdo validado: 85 fases, 7 mundos/packs.
- Bundle de 656,8 KB reduzido para 386,1 KB.
- Há PT-BR, EN e ES, CSP, acessibilidade, economia, eventos, daily, coleção, jardim, push, Firebase e ponte Android.

Problemas prioritários observados:

- `firebase-config.js` ainda é placeholder.
- AdMob ainda usa IDs de teste e falta `IDS-PRODUCAO.env`.
- O self-audit alerta que `www` pode ficar desatualizado.
- `npm run format:check` falha em 51 arquivos.
- Cobertura agregada: 65,59%; módulos críticos ainda têm lacunas.
- Não há evidência operacional de dashboard de funil/coortes, soft launch ou validação em aparelhos Android físicos.
- A primeira sessão tem novidades e tutorial em camadas antes do primeiro movimento; a home é densa.

## Regras para executar

1. Trabalhe em fatias pequenas. Antes de editar, leia os arquivos relevantes e os testes existentes.
2. Preserve a arquitetura atual de scripts clássicos/IIFE e a fonte de verdade em `scripts/modules.mjs`; não migre de framework sem uma decisão explícita.
3. Não remova funcionalidades para “simplificar”. Simplifique o caminho do jogador e extraia responsabilidades apenas quando isso reduzir risco.
4. Não invente credenciais, IDs reais, preços ou dados de produção. Use variáveis de ambiente e falhe fechado quando a configuração de release estiver incompleta.
5. Para cada fatia: implemente, crie/ajuste testes, execute os comandos de verificação e registre o resultado.
6. Não marque uma tarefa como concluída apenas porque a UI existe: valide o fluxo completo e o estado offline/online quando aplicável.

## P0 — confiança de release (0–7 dias)

### P0.1 Gate de produção sem placeholders

Arquivos prováveis: `scripts/self-audit.mjs`, `scripts/pre-publish.mjs`, `scripts/play-store-validate.mjs`, `firebase-config.js`, `android/app/src/main/AndroidManifest.xml`, configuração de AdMob/Billing.

Entregas:

- Fazer o gate falhar com erro claro se encontrar AdMob de teste, Firebase placeholder, versão inconsistente, segredo ausente ou `www` divergente da raiz.
- Separar configuração dev/staging/prod sem colocar segredos no repositório.
- Gerar um relatório final de release com versão, hash/artefato, serviços ativos e checklist.
- Garantir que `sync:www`/bundle sejam executados antes do gate.

Aceite:

- Um build de desenvolvimento continua funcionando offline.
- Um build de release com placeholders falha antes de gerar o AAB.
- Um build com configuração válida passa sem warnings críticos.

Verificação:

```text
npm run validate:versions
npm run audit
npm run play:validate
npm run test:all
```

### P0.2 Fechar a cadeia de entrega

Arquivos prováveis: `.github/workflows/test.yml`, `package.json`, scripts de release.

Entregas:

- Adicionar job de `format:check` ao CI.
- Adicionar validação de bundle, conteúdo e Play Store ao CI.
- Adicionar um job de build Android sem segredo, explicitamente marcado como smoke, e um job de release protegido por secrets.
- Publicar como artefatos os relatórios de cobertura, e2e e self-audit.

Aceite: todo PR executa lint, typecheck, formatação, testes, e2e e validações; falha bloqueia merge.

## P1 — ativação e UX (1–2 semanas)

### P1.1 Primeiro movimento em menos de 30 segundos

Arquivos prováveis: `tile_blast.html`, `tb-start.js`, `tb-main.js`, `tb-dialogs.js`, `css/dialogs.css`, `tests/e2e/smoke.mjs`.

Entregas:

- Usuário novo: uma única sequência de onboarding curta, com progresso e opção “pular tutorial”.
- Remover “Novidades” do caminho crítico da primeira sessão; mostrar novidades após a primeira vitória ou no retorno.
- Usuário recorrente: voltar diretamente ao próximo objetivo/fase, sem repetir onboarding.
- Instrumentar tempo até primeiro movimento, conclusão do tutorial e primeira vitória.

Aceite: teste e2e cobre novo usuário, usuário recorrente, skip e retorno; primeiro movimento ocorre em até 30 segundos no fluxo padrão.

### P1.2 Reduzir densidade da home

Entregas:

- Definir uma hierarquia de 3 ações primárias: jogar, daily, evento.
- Agrupar loja/skins/perfil/jardim em um segundo nível sem perder notificações importantes.
- Auditar mobile 320 px, 375 px, 412 px e tablet; não pode haver scroll acidental em CTA ou modal.

Aceite: teste visual/manual documentado e nenhum CTA primário fica abaixo da dobra inicial em telas-alvo.

### P1.3 Telemetria de funil

Eventos mínimos, sem PII:

```text
app_open
onboarding_start / onboarding_skip / onboarding_complete
first_move
level_start / level_win / level_loss
daily_open / daily_complete
ad_offer / ad_reward_granted
iap_view / iap_start / iap_success / iap_restore
push_prompt_shown / push_granted
```

Aceite: cada evento tem schema versionado, timestamp, app version, locale, platform e session id; há dashboard ou export que mostre D1/D7/D30 e conversão.

## P2 — retenção e conteúdo (2–4 semanas)

### P2.1 Calendário de live ops

Arquivos prováveis: `data/events.json`, `data/challenges.json`, `remote-config.json`, `tb-events.js`, `tb-challenges.js`, `tb-retention.js`.

Entregas:

- Calendário de 8 semanas com daily puzzle, evento semanal, desafio social e recompensa de retorno.
- Remote flags para ativar/desativar sem novo binário.
- Fallback offline determinístico e sem recompensa duplicada.
- Push/local reminder somente após valor entregue e consentimento apropriado.

Aceite: simulação de 14 dias demonstra que eventos abrem/fecham corretamente, não duplicam prêmios e funcionam offline.

### P2.2 Balanceamento orientado por dados

Arquivos prováveis: `data/levels/*.json`, `scripts/validate-content.mjs`, testes de conteúdo.

Entregas:

- Medir taxa de vitória, movimentos restantes, abandono e uso de power-up por fase.
- Revisar a concentração de fases “hard”, especialmente o alerta de `legendary` com 70% hard.
- Criar fases de respiro antes/depois de picos e um modo de mastery para rejogar com propósito.

Aceite: cada mundo tem uma curva documentada; mudanças em níveis têm teste de regressão e justificativa de métrica.

**Status (2026-07-26):** feito — `data/balance-curves.json` + `npm run content:analyze`; legendary hard 50% (curva `HMHMMMHMHH`); telemetria `moves_left`/`pu_used`/`level_abandon`/`mastery`; mapa rematch Mastery; `tests/unit/balance-curves.test.js`.

### P2.3 Diferenciação de marca

Entregas:

- Rodar 3 hipóteses de posicionamento com 5–10 jogadores cada.
- Escolher uma assinatura: mecânica, personagem, social ou meta; não tentar comunicar tudo ao mesmo tempo.
- Fazer a primeira vitória demonstrar essa assinatura.

Aceite: uma frase de posicionamento e três provas visíveis no produto; uma hipótese de aquisição testável por mercado.

**Status (2026-07-26):** feito (código; pesquisa com jogadores fica para soft launch).
- Assinatura **mecânica**: “Quanto maior o grupo, maior o especial.”
- Provas: splash/home (`splash_sub`/`map_sub`), onboarding passo 2 (4💣/6🚀/8🌈), primeira vitória (`first_win_title` + chip).
- Hipótese Play: short-desc com a assinatura vs genérico “Explosão de blocos!” — métrica: CTR store listing / install→first_win.
- Teste: `tests/unit/brand-positioning.test.js`.

## P3 — monetização justa e social (4–8 semanas)

### P3.1 Economia e preços reais

Arquivos prováveis: `tb-shop.js`, `tb-offers.js`, `tb-economy.js`, `tb-playbridge.js`, `functions/confirm-iap.js`, `functions/economy-catalog.js`.

Entregas:

- Usar preço/título/moeda retornados pelo Google Play Billing; remover preços hardcoded da UI.
- Testar restore, compra repetida, compra interrompida, refund e reconciliação offline/online.
- Simular economia com 30/90 dias de progressão e limites de anúncios/recompensas.
- Manter rewarded voluntário e intersticial previsível, com cap diário verificável.

Aceite: nenhuma compra pode conceder duas vezes; token é idempotente; preços exibidos correspondem à loja; testes server-side passam.

**Status (2026-07-26):** feito (código; QA device/Play Console pendente).
- Preços: `TileBlastBridge` → `onTileBlastProductDetails` / `getProductDetailsJson`; loja usa `PlayBridge.getStorePrice` (HTML sem R$ hardcoded).
- Idempotência: token client + `iapReceipts` server; `once` já possuído → `already_owned` sem crédito; pending nativo sem grant.
- Simulação: `npm run economy:simulate` + `tests/unit/economy-sim.test.js` (30/90d, cap ads).
- Rewarded voluntário + interstitial com `interstitialDailyCap` (já existente).

### P3.2 Social seguro

Arquivos prováveis: `tb-social.js`, `functions/submit-score.js`, `functions/play-verify.js`, `firestore.rules`.

Entregas:

- Ranking com anti-cheat, rate limit, nomes moderáveis e exclusão de dados.
- Desafio compartilhável com deep link, estado expirável e proteção contra replay.
- Compartilhar resultado sem expor PII.

Aceite: score impossível é rejeitado; regra Firestore é testada; usuário consegue apagar nome/dados sociais.

**Status (2026-07-26):** feito (código; deploy Functions/Rules + QA device pendente).
- Ranking: caps + rate limit/hora + nome moderado (`sanitizePlayerName`) + write só via Callable.
- Desafio: `createChallenge`/`claimChallenge` com TTL 7d, nonce e anti-replay; deep link `?c=&n=` + `seed`.
- Share sem PII; botão **Apagar dados sociais** + `deleteSocialData`.
- Rules: `challenges/*` deny write; testes em `tests/unit/social-secure.test.js`.

## P4 — escala global (8–12 semanas)

### P4.1 Performance real

**Status:** implementado (budgets CI, lab, lazy-load `tb-push`, telemetria `boot_ready`).

Entregas:

- Definir budgets: startup, primeiro input, FPS de animação, memória e tamanho de download.
- Perfilar Android low-end e rede 3G/4G; registrar p50/p95.
- Lazy-load de módulos não críticos sem quebrar a fonte de verdade de módulos.

Aceite: budgets publicados, medidos no CI/lab e sem regressão acima de 10%.

- Budgets: `data/perf-budgets.json`, gate `npm run perf:budgets` no CI.
- Lab: `npm run perf:lab` (Puppeteer, 4G, CPU 4×) → `play-store/reports/perf-baseline.json`.
- Lazy-load: `DEFERRED_MODULES` + `TBRuntime.loadDeferredModules()` (`tb-push.js`).
- Telemetria: `boot_ready` (`startup_ms`), `TBJuice.getLastFps()`.
- Docs: `docs/PERF-BUDGETS.md`.

### P4.2 QA global e acessibilidade

**Status:** implementado (axe CI, matriz i18n, lifecycle e2e, checklist manual).

Entregas:

- Axe/contraste automatizados e matriz manual de teclado, leitor de tela, daltonismo e redução de movimento.
- QA de PT-BR, EN e ES com strings longas, plural, datas, moeda e overflow.
- Teste de rotação, background/foreground, perda de processo, offline/online e restauração de save.

Aceite: zero blocker P0/P1 de acessibilidade; cada locale passa em screenshot/fluxo crítico.

- Gate: `tests/e2e/a11y.mjs` (axe WCAG 2.1 + contraste `--text`/`--dim`) via `npm run test:a11y` / `test:e2e`.
- Locales: `tests/e2e/i18n-matrix.mjs` → `screenshots/i18n/{pt,en,es}/`.
- Lifecycle: `tests/e2e/lifecycle.mjs` (save, visibilitychange, offline, rotate).
- Checklist: `docs/P4.2-QA-CHECKLIST.md`.

### P4.3 Operação por coortes

**Status:** scaffold operacional (ritual + relatório + skills de agente). Soft launch real depende de dados Play Console.

Entregas:

- Soft launch em um mercado pequeno com grupos de controle.
- Ritual semanal: retenção, sessões, vitória, dificuldade, anúncios, receita, crashes, reviews e tickets.
- Rollback de conteúdo/remote config e changelog voltado ao jogador.

Aceite: nenhuma feature global é escalada sem uma métrica-alvo, grupo de controle e critério de rollback.

- Ritual: `docs/SOFT-LAUNCH-RITUAL.md` + `npm run ops:weekly` → `play-store/reports/soft-launch-latest.md`.
- Agentes: skills `tileblast-audit`, `tileblast-improve`, `tileblast-soft-launch` + regras em `.cursor/rules/`.
- `AGENTS.md` na raiz.

## Ordem recomendada de execução

1. P0.1 gate de produção.
2. P0.2 CI completo.
3. P1.1 primeiro movimento e onboarding.
4. P1.3 telemetria/funil.
5. P2.1 live ops.
6. P2.2 balanceamento.
7. P3.1 economia/Billing.
8. P3.2 social.
9. P4.1 performance.
10. P4.2 QA global e P4.3 soft launch.

## Comando de verificação final

Depois de cada marco, execute:

```text
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run test:e2e
npm run content:validate:strict
npm run play:validate
npm run audit
```

Se algum comando falhar, corrija a causa ou registre explicitamente a exceção no relatório do marco. Nunca esconda o warning para fazer o release parecer verde.
