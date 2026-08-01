# Auditoria Tile Blast — v2
**Data:** 2026-06-29 | **Versão auditada:** 1.4.4 (versionCode 9)

> Segunda rodada de auditoria. Compara o estado atual com a auditoria v1 (nota média 6,9)
> e verifica o que foi implementado desde então.

---

## Resumo Executivo

| Área                  | Nota v1 | Nota v2 | Δ    |
|-----------------------|---------|---------|------|
| UI/UX                 | 7,5     | 7,5     | —    |
| Monetização           | 7,0     | 8,0     | +1,0 |
| Play Store            | 5,5     | 7,0     | +1,5 |
| Android (técnico)     | 6,5     | 8,5     | +2,0 |
| Retenção de Usuários  | 8,0     | 7,5     | -0,5 |
| **Média**             | **6,9** | **7,7** | **+0,8** |

O projeto evoluiu significativamente. As correções técnicas Android foram as mais impactantes.
A retenção recuou levemente porque funcionalidades prometidas (daily login streak, integração push)
ainda não estão conectadas ao fluxo real do jogo.

---

## 1. UI/UX — 7,5/10 *(mantém)*

### ✅ O que está bem
- Design coeso, dark mode nativo, paleta de cores consistente
- Animações de tela (`screenIn`/`screenOut`) fluidas
- Internacionalização completa PT/EN/ES em `I18N` (incluindo keys `daily_reward`, `collect`, `day`)
- Modal de flash deal e win-streak com feedback visual imediato
- Função `shareChallengeLink` implementada em `tb-global.js` — botão de desafio social pronto

### ⚠️ Pendências
- **Push não integrado ao fluxo de vitória:** `tb-push.js` existe e está carregado no `index.html`,
  mas `TBPush.maybeAskPermission()` não é chamada em `tile_blast.html` após vencer uma fase.
  O usuário nunca vê a solicitação de permissão de notificação.
- **Daily Login Streak ausente:** a UI para a recompensa diária (`checkDailyLoginReward`) não foi
  implementada — as keys i18n existem, mas a função e a chamada no `boot()` não.
- Sem skeleton/loading state enquanto o Firebase carrega o leaderboard diário.
- `tile_blast.html` tem 2964 linhas em um único arquivo — dificulta manutenção futura.

### Próximo passo
Integrar `TBPush.maybeAskPermission(C.getUnlocked())` na função de vitória de fase em `tile_blast.html`.

---

## 2. Monetização — 8,0/10 *(era 7,0, +1,0)*

### ✅ O que está bem
- `interstitialEvery: 5` corrigido tanto em `remote-config.json` quanto em `tb-remote.js` DEFAULTS
  e em `tb-roadmap.js` (`remoteConfig()` default agora é 5) — reduz fadiga de anúncios ✅
- `interstitialDailyCap: 5` mantido — proteção contra excesso ✅
- Assinatura "Sem Anúncios" (`no_ads_monthly`) **implementada no jogo:** card na loja,
  `purchaseSubscription()` chama `window.AndroidBridge`, e `applyIapPurchase` já reconhece o ID ✅
- `dynamicOffersEnabled: true` no remote config — sistema de flash deals ativo
- 6 produtos IAP + 2 assinaturas configurados

### ⚠️ Pendências
- **Bug residual:** `maybeShowInterstitial()` em `tb-roadmap.js` linha 825 usa fallback `|| 3`
  (`cfg.interstitialEvery || 3`). Se o remote config retornar `0` ou `null`, o intersticial
  dispara a cada 3 vitórias — ignora o valor configurado. Deveria ser `|| 5`.
- Produtos `no_ads_monthly` e `no_ads_yearly` precisam ser criados na Play Console antes da publicação.
- Preço hardcoded "R$9,90/mês" no card da loja — deveria vir do Billing para respeitar conversão regional.

### Fix urgente (1 linha)
```js
// tb-roadmap.js linha 825
if (interstitialWins % (cfg.interstitialEvery || 5) !== 0) { cb && cb(); return; }
```

---

## 3. Play Store — 7,0/10 *(era 5,5, +1,5)*

### ✅ O que está bem
- Listing em Espanhol (`es-419`) criado com title, short-description e full-description ✅
- `feature-graphic-1024x500.png` gerado e salvo em `play-store/assets/` ✅
- Script `scripts/generate-feature-graphic.mjs` e `play:feature-graphic` no `package.json` ✅
- Short descriptions em PT-BR e EN-US dentro do limite de 80 chars ✅

### ❌ Ainda não feito
- **Títulos PT-BR e EN-US ainda são "Tile Blast" (9 chars)** — desperdiçam 21 dos 30 caracteres
  permitidos pela Play Store. Keywords como "puzzle", "blocos", "block" ficam de fora.
  - `play-store/listing/pt-BR/title.txt` → deve ser `Tile Blast: Puzzle de Blocos`
  - `play-store/listing/en-US/title.txt` → deve ser `Tile Blast: Block Puzzle Game`

### ⚠️ Observações
- ES-419 title `Tile Blast: Puzzle de Bloques` está correto (30 chars exatos) ✅
- Screenshots ainda precisam ser geradas (`play:screenshots`) antes de submeter
- `CURSOR-PROMPT.md` referencia versionCode 5 / versionName 1.4.0, mas o projeto já está
  em versionCode 9 / versionName 1.4.4 — CURSOR-PROMPT está desatualizado

---

## 4. Android (técnico) — 8,5/10 *(era 6,5, +2,0)*

### ✅ O que foi resolvido (grandes melhorias)
- **`minifyEnabled true` + `shrinkResources true`** no release build ✅ (era o problema crítico #1)
- **`proguard-rules.pro` completo:** regras para Capacitor, AdMob, Billing, Firebase, UMP,
  `TileBlastBridge` e `MainActivity` ✅
- **`android:largeHeap="true"`** no AndroidManifest — evita OOM em aparelhos com 2GB RAM ✅
- `@capacitor/push-notifications: ^7.0.6` instalado no `package.json` ✅
- `sharp: ^0.34.5` instalado para geração de assets ✅
- versionCode 9, versionName 1.4.4 — iterações consistentes ✅
- Signing config lê de `keystore.properties` com guard `if (keystorePropertiesFile.exists())` ✅
- Script `self-audit.mjs` com detecção de IDs de teste, versões, e placeholders ✅

### ⚠️ Pendências
- **Testes unitários falhando (`npm test`):** `rollup` não encontra seu binário nativo
  (`@rollup/rollup-linux-x64-gnu`). Provavelmente problema de instalação — rodar `npm install`
  deve corrigir. Não é bug de código.
- **AdMob com IDs de teste** (detectado pelo self-audit) — esperado em dev, mas bloqueia publicação.
  Rodar `npm run play:admob` antes de submeter.
- **Firebase placeholder** em `firebase-config.js` — esperado em dev.
- `@capacitor/push-notifications` instalado mas `npx cap sync android` precisa ser rodado
  para gerar os arquivos nativos Android correspondentes.
- Target SDK 35 (Android 15) — verificar se a permissão `POST_NOTIFICATIONS`
  (obrigatória no Android 13+) está declarada no AndroidManifest.

---

## 5. Retenção de Usuários — 7,5/10 *(era 8,0, -0,5)*

### ✅ O que está bem
- `tb-push.js` implementado com versão mais robusta que o prompt original:
  salva FCM token, trata `pushNotificationReceived` com toast, tem `init(cfg)` ✅
- `TBPush` carregado no `www/index.html` (linha 991) ✅
- `shareChallengeLink` implementada em `tb-global.js` ✅
- Win streak (`onWinStreak`) com bônus progressivo e badge visual ✅
- Daily Puzzle com leaderboard Firebase ✅
- Battle Pass 30 tiers ativo ✅
- Keys i18n de daily reward (`daily_reward`, `collect`, `day`) presentes nos 3 idiomas ✅

### ❌ Lacunas que puxaram a nota para baixo
- **`checkDailyLoginReward` não implementada** — é o maior ganho de retenção diária que
  existe em jogos casuais. As keys i18n estão prontas, mas a função e a chamada no `boot()`
  nunca foram criadas.
- **Push não dispara na prática:** `TBPush.maybeAskPermission()` não é chamada em nenhum
  ponto de `tile_blast.html`. O usuário instala o app, joga, vence fases — e nunca recebe
  a pergunta de permissão de notificação.
- Nenhum reminder local agendado para o Daily Puzzle.
- `PUSH-SETUP.md` explica o fluxo de Firebase Functions, mas a Cloud Function em si
  ainda não existe.

### Impacto estimado
Um daily login streak com recompensas progressivas (D1→D7) pode aumentar Day-7 retention
em 15–25% em jogos casuais. É a feature de maior ROI ainda pendente.

---

## Checklist Atual de Release

### ✅ Prontos
- [x] `minifyEnabled true` + `shrinkResources true`
- [x] `proguard-rules.pro` completo
- [x] `feature-graphic-1024x500.png`
- [x] Listing ES-419 (title, short, full)
- [x] Short descriptions EN/PT dentro do limite
- [x] `interstitialEvery: 5` no remote-config e DEFAULTS
- [x] `android:largeHeap="true"`
- [x] `@capacitor/push-notifications` instalado
- [x] `shareChallengeLink` implementada
- [x] Assinatura `no_ads_monthly` na loja in-game
- [x] `purchaseSubscription()` conectada ao AndroidBridge

### ❌ Bloqueadores de publicação
- [ ] `play-store/listing/pt-BR/title.txt` → `Tile Blast: Puzzle de Blocos`
- [ ] `play-store/listing/en-US/title.txt` → `Tile Blast: Block Puzzle Game`
- [ ] Substituir IDs de teste do AdMob (`npm run play:admob`)
- [ ] Configurar `firebase-config.js` com projeto real
- [ ] `npx cap sync android` (para ativar push nativo)

### 🟡 Pré-publicação recomendados
- [ ] Fix `interstitialEvery || 3` → `|| 5` em `tb-roadmap.js:825` (1 linha)
- [ ] Integrar `TBPush.maybeAskPermission()` em `tile_blast.html` após vitória de fase
- [ ] Implementar `checkDailyLoginReward()` em `tb-roadmap.js` e chamar no `boot()`
- [ ] Verificar `POST_NOTIFICATIONS` permission no AndroidManifest (Android 13+)
- [ ] Gerar screenshots (`npm run play:screenshots`)
- [ ] Rodar `npm install` para corrigir rollup binário

---

## Prioridade das pendências restantes

| # | Tarefa | Impacto | Esforço | Prioridade |
|---|--------|---------|---------|-----------|
| 1 | Atualizar títulos PT-BR e EN-US | Alto (ASO) | 2 min | 🔴 Crítico |
| 2 | Fix `\|\| 3` → `\|\| 5` em tb-roadmap.js:825 | Médio (UX/receita) | 1 linha | 🔴 Crítico |
| 3 | AdMob IDs reais + firebase-config.js | Bloqueador de receita | 30 min | 🔴 Crítico |
| 4 | `npx cap sync android` | Bloqueador push | 2 min | 🔴 Crítico |
| 5 | Chamar `TBPush.maybeAskPermission()` em tile_blast.html | Alto (retenção) | 5 min | 🟡 Alta |
| 6 | Implementar `checkDailyLoginReward()` | Alto (retenção D7) | 2h | 🟡 Alta |
| 7 | Screenshots Play Store | ASO | 1h | 🟡 Alta |
| 8 | Verificar `POST_NOTIFICATIONS` no AndroidManifest | Compliance Android 13+ | 10 min | 🟡 Alta |

---

*Auditoria v2 gerada em 2026-06-29 — próxima revisão recomendada antes de submeter à Play Store.*

---

## Reconciliação pós-auditoria v2 (2026-06-29, código 1.4.6)

A auditoria v2 foi gerada com base parcialmente desatualizada. Estado **real** após revisão do código:

| Item da auditoria v2 | Status real |
|----------------------|-------------|
| Títulos PT-BR / EN-US na Play Store | ✅ Já corrigidos (`Tile Blast: Puzzle de Blocos` / `Block Puzzle Game`) |
| `TBPush.maybeAskPermission()` após vitória | ✅ Já em `resolveWin()` (`tile_blast.html` ~3933) |
| `checkDailyLoginReward()` implementada | ✅ Em `tb-roadmap.js`, chamada via `checkDailyReward()` no boot |
| `POST_NOTIFICATIONS` no AndroidManifest | ✅ Declarada |
| Skeleton loading no leaderboard | ✅ `#lb-global-list` com placeholder `…` |
| `interstitialEvery \|\| 3` | 🔧 Corrigido para `\|\| 5` em 1.4.6 |
| Daily login duplicado (`checkDailyReward` legado + roadmap) | 🔧 Unificado em 1.4.6 — uma recompensa/dia |
| Lembrete local Daily Puzzle | 🔧 Adicionado em `scheduleLocalReminders()` (8h–11h) |
| Testes `npm test` | ✅ 59+ testes passando (vitest local) |
| AdMob / Firebase / keystore | ❌ Ainda dependem do desenvolvedor |

### Notas revisadas (estimativa pós-1.4.6)

| Área | v2 | Revisado |
|------|-----|----------|
| Retenção | 7,5 | **8,0** (daily unificado + lembrete puzzle) |
| Monetização | 8,0 | **8,2** (fix interstitial) |
| Média | 7,7 | **~7,9** |

### Bloqueadores restantes (só você)
1. `npm run play:admob` com `IDS-PRODUCAO.env`
2. `firebase-config.js` + `google-services.json`
3. `android/keystore.properties`
4. `npm run play:screenshots` antes de submeter
5. Cloud Function FCM (`PUSH-SETUP.md`) — opcional pós-launch
