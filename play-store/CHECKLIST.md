# Checklist final — envio para revisão

Marque cada item antes de clicar em **Enviar para revisão**.

## Conta e app

- [ ] Conta Play Developer ativa (pagamento único feito)
- [ ] App criado com package `com.tileblast.game`
- [ ] País/regiões de distribuição selecionados

## Build técnico

- [ ] `npm run test:all` passou (35+ testes + smoke + gameplay)
- [ ] `npm run build:release` executado (JS minificado no Android)
- [ ] AdMob IDs de **produção** no Manifest e `TileBlastBridge.java`
- [ ] `android/keystore.properties` configurado (não commitado)
- [ ] `npm run play:bundle` gerou AAB em `play-store/release/`
- [ ] Testado em celular real (Android 10+): jogo, voltar, loja, anúncio, compra teste

## Play Console — política

- [ ] Política de privacidade (URL HTTPS)
- [ ] Classificação de conteúdo (IARC) concluída
- [ ] Segurança dos dados preenchida
- [ ] Declaração de anúncios: **Sim, contém anúncios**
- [ ] Compras no app declaradas

## Monetização

- [ ] 6 produtos IAP criados e **ativos** (IDs exatos)
- [ ] Produto de assinatura mensal "no_ads_monthly" ($1.99/mês) criado na Play Console
- [ ] Produto de assinatura anual "no_ads_yearly" ($14.99/ano) criado na Play Console
- [ ] Conta de teste de licença adicionada
- [ ] AdMob vinculado ao app na Play Console

## Página da loja

- [x] Título (máx. 30 caracteres) — `listing/pt-BR/title.txt` (+ en/es) — validado por `npm run play:validate`
- [x] Descrição curta (máx. 80) — UTF-8 corrigido; 85 fases alinhadas ao conteúdo
- [x] Descrição completa — `listing/*/full-description.txt`
- [x] Ícone 512×512 — `assets/icon-512.png`
- [x] Feature graphic 1024×500 — `assets/feature-graphic-1024x500.png`
- [x] Mínimo **2 screenshots** reais (9:16) — `assets/screenshots/phone/phone-0N.png`
- [ ] Categoria: **Jogos** → Puzzle / Casual
- [ ] E-mail de contato do desenvolvedor

## Opcional (recomendado)

- [x] Listing em inglês (`listing/en-US/`)
- [x] Listing em espanhol (`listing/es-419/`)
- [ ] Firebase `google-services.json` para analytics
- [ ] Faixa de teste interno com amigos antes de produção

## Hardening automatizado (repo)

```bash
npm run play:validate      # listings, assets, AdMob teste, screenshots
npm run play:prepublish    # testes + e2e + validate + versões
npm run play:admob         # aplica IDS-PRODUCAO.env → Manifest + bridges
```

## Economia server-side (ver `docs/ECONOMIA-SERVER-SIDE.md`)

Fundação no repo: `TBFirebase.callFunction` / fila offline, `firestore.rules`,
`functions/grantAdReward` + **`confirmIapPurchase`** (Play receipt) +
**`submitScore` / `submitEventScore`** (rankings fase 4; Rules negam write cliente).

Itens abaixo **não** bloqueiam o envio atual (offline-first), mas são necessários
antes de tratar o servidor como **única** autoridade de moedas/IAP:

- [ ] Projeto Firebase com Blaze (Functions) e `firebase deploy --only functions,firestore:rules`
- [ ] Auth anônimo habilitado; Rules publicadas (cliente não escreve `users/*/coins` nem `leaderboards/*/scores`)
- [ ] Emulador / staging: validar `grantAdReward` rate-limit (cap diário)
- [ ] Service account **Google Play Android Developer API** criada e ligada no Play Console
- [ ] Secret `PLAY_SERVICE_ACCOUNT_JSON` via `firebase functions:secrets:set` (nunca no git)
- [ ] `ANDROID_PACKAGE_NAME=com.tileblast.game` confirmado no ambiente da Function
- [ ] Deploy `confirmIapPurchase` e teste com conta de licença (purchaseToken real)
- [ ] Verificar doc `iapReceipts/{hash}` + reconciliação de `users/{uid}.entitlements` após compra
- [ ] Ligar modo “server wins” total (retirar crédito local otimista de ads/IAP) só após estável
- [x] Migrar `submitScore` / `submitEventScore` para Callable + negar write em `leaderboards` (código pronto; falta deploy)
- [ ] Play Integrity / SSV de rewarded ads (opcional) amarrado a `grantAdReward`
## Após aprovação

- [ ] Link da loja no app (`TBGlobal.openStoreRating`)
- [ ] Monitorar crashes na Play Console
- [ ] Responder avaliações
