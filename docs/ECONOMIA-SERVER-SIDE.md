# Economia server-side — design e fundação

> Documento vivo. O jogo **continua 100% jogável offline**. A autoridade de
> moedas/IAP migra gradualmente para Cloud Functions + Firestore Rules.

## Problema

Hoje `addCoins`, `recordAdWatch`, `applyIapPurchase` e streaks vivem no
`localStorage` (save assinado por `TBSecure` — deterrent, não autoridade).
Um cliente modificado pode:

- zerar o cap diário de anúncios e farmar moedas;
- gravar `boughtStarter` / `noAds` sem receipt;
- subir score impossível no ranking (`submitScore` / `submitEventScore` escritas
  direto no Firestore pelo SDK do cliente).

Firebase Auth anônimo + Cloud Functions Callable + Security Rules permitem
mover a **autoridade** desses eventos para o servidor sem exigir login Google.

## Eventos que precisam de autoridade do servidor

| Evento | Risco se client-trust | Validação server |
|--------|----------------------|------------------|
| Concessão de moedas por anúncio recompensado | Farm infinito | Callable `grantAdReward`: rate-limit por dia (`adGrants`), valor fixo da tabela server |
| Cap diário de anúncios | Bypass local de `adsToday` | Contador só incrementado na Function; cliente só exibe |
| Compra IAP (Google Play Billing) | Entitlement falso | Callable `confirmIapPurchase` com **purchase token** → Google Play Developer API |
| Recompensa login / streak | Moedas/dia fabricadas | Callable `claimDailyLogin` com dia UTC e streak derivado do ledger |
| Submissão de score (ranking / eventos) | Rankings adulterados | Callable `submitScore` (ou Rules + Function) com caps por modo; idealmente anti-replay |

Fora do escopo imediato (podem ficar client-side por mais tempo): gasto de
moedas em PU, vitória de fase (coins de estrela), baús — desde que o **saldo
autoritativo** venha do servidor e o cliente só aplique deltas reconciliados.

## Modelo de dados (Firestore)

```
users/{uid}
  coins: number                 # saldo autoritativo (só Functions escrevem)
  entitlements: {
    noAds: bool
    starter: bool
    bpPremium: bool
    welcome: bool
    …
  }
  adGrants: {
    dayKey: string              # "YYYY-MM-DD" UTC
    count: number
    lastAt: timestamp
  }
  ledgerAt: timestamp
  v: string

users/{uid}/ledger/{entryId}    # append-only (só Function)
  type: "ad" | "iap" | …
  delta: number
  meta: map
  at: timestamp
  requestId: string

iapReceipts/{sha256(purchaseToken)}   # idempotência global IAP (só Function)
  uid, productId, packageName, kind, deltaCoins, at

# Rankings — fase 2: só Function escreve
leaderboards/{boardId}/scores/{uid}
```

## Security Rules (resumo)

Arquivo canônico: [`firestore.rules`](../firestore.rules).

- `users/{uid}` / `ledger`: leitura dono; **escrita negada** ao cliente.
- `iapReceipts/**`: default deny (só Admin SDK).
- `saves/{uid}`: dono lê/escreve progresso (não misturar saldo autoritativo).
- `leaderboards/**`: na fase 1 o dono ainda escreve; fase 2 → Callable only.

## Fluxo IAP (fase 3 — implementado)

```
Android Billing          Cliente (tb-main)              Callable                 Play API / Firestore
       |                        |                           |                              |
       |-- purchase ok -------->|                           |                              |
       |   (productId, token)   |                           |                              |
       |                        |-- applyIapPurchase local  |                              |
       |                        |   (UX imediata)           |                              |
       |                        |-- queueIapConfirm ------->|                              |
       |                        |   (fila offline)          |-- verify token ------------->|
       |                        |                           |-- iapReceipts idempotência   |
       |                        |                           |-- users/{uid} coins/ent ---->|
       |                        |<- { coins, entitlements }-|                              |
       |                        |-- reconcileServerEconomy  |                              |
```

1. `onTileBlastPurchaseSuccess(itemId, token)` aplica bônus **local** (jogo nunca trava).
2. `TBFirebase.queueIapConfirm(productId, token)` enfileira `confirmIapPurchase`.
3. Function valida args → Google Play `androidpublisher` → grava `iapReceipts` + `users/{uid}`.
4. ACK → `reconcileServerEconomy` (server wins em `coins` / entitlements).
5. Sem config / offline: item permanece em `tb_callable_queue` até `flushCallableQueue`.

### Contrato da ponte nativa (Android)

`TileBlastBridge.java` é quem produz o token. Sem ele a Function não tem o que
verificar e a compra fica só local — por isso o token faz parte do contrato:

| Callback JS | Assinatura | Origem no Java |
|-------------|-----------|----------------|
| `onTileBlastPurchaseSuccess` | `(productId, purchaseToken)` | `handlePurchase()` → `purchase.getPurchaseToken()` |
| `onTileBlastRestore` | `([{ id, token }, …])` | `restorePurchasesInternal()` → `queryPurchasesAsync` |
| `onTileBlastPurchaseError` | `(motivo)` | `onPurchasesUpdated` / `launchBillingFlow` |

`onTileBlastRestore` também aceita o formato legado (`['id', …]`); nesse caso o
grant é aplicado localmente e **nada** é enviado para validação, porque não há
token. O restore com tokens revalida todos os entitlements no servidor.

Strings interpoladas no `evaluateJavascript` passam por `jsEscape()` (aspas,
barras e quebras de linha) — nunca concatene valores crus.

### Idempotência

- Mesmo `purchaseToken` + mesmo `uid` → `{ granted:false, reason:'duplicate' }` **sem** recreditar.
- Token já de outro `uid` → `HttpsError('already-exists')`.

### Erros Callable

| Código | Quando |
|--------|--------|
| `unauthenticated` | Sem Auth |
| `invalid-argument` | productId/token ausente ou product desconhecido |
| `permission-denied` | Recibo rejeitado pela Play / não purchased |
| `already-exists` | Token usado por outra conta |
| `failed-precondition` | Secret Play ausente no ambiente |
| `resource-exhausted` | Cap diário de ads (`grantAdReward`) |

## Deploy e secrets (zero no git)

### 1. Service account (Play Developer API)

1. Google Cloud Console → IAM → criar service account (ex.: `tileblast-play-iap`).
2. Role: acesso à **Android Publisher** (ou JSON baixado + vincular no Play Console →
   Setup → API access → link service account → permission **View financial data** /
   manage orders conforme doc Play).
3. Baixar JSON da chave → **nunca** commit (já no `.gitignore`: `**/service-account*.json`).

### 2. Secret na Function

```bash
# Na raiz do projeto Firebase (Blaze)
firebase functions:secrets:set PLAY_SERVICE_ACCOUNT_JSON
# Cole o JSON completo da service account quando solicitado.

# Opcional (default: com.tileblast.game)
# Em runtime / .env local de emulador:
# ANDROID_PACKAGE_NAME=com.tileblast.game
```

O callable `confirmIapPurchase` declara `secrets: [PLAY_SERVICE_ACCOUNT_JSON]`
(Firebase Functions v2 / Secret Manager).

### 3. Dependências e deploy

```bash
cd functions
npm install          # firebase-admin, firebase-functions, googleapis
cd ..
firebase deploy --only functions,firestore:rules
```

Emulador (opcional):

```bash
# export PLAY_SERVICE_ACCOUNT_JSON='{"client_email":...}'
firebase emulators:start --only functions,firestore
```

### 4. Cliente

```js
TBFirebase.queueIapConfirm(productId, purchaseToken);
TBFirebase.onEconomyReconcile(reconcileServerEconomy); // registrado no boot
await TBFirebase.flushCallableQueue();
```

Fallback: qualquer falha retorna `{ ok:false, … }` / fica na fila — **não lança**.

## Fluxo ads (`grantAdReward`)

Shadow mode: após `recordAdWatch`, `queueAdGrantShadow` enfileira sem alterar
UX local. Rate-limit e crédito autoritativo vivem na Function (`functions/iap-logic.js`).

## Fases de migração

| Fase | Estado | Comportamento |
|------|--------|---------------|
| **0** | client-trust | Save local manda |
| **1** | shadow ads | Rules + `grantAdReward` + fila |
| **2** | dual-write | Function grava coins; cliente reconcilia |
| **3** | IAP receipt | `confirmIapPurchase` + Play API + `iapReceipts` |
| **4 — agora** | rankings | `submitScore` / `submitEventScore` só via Function; Rules `leaderboards` write deny |

## Rankings (fase 4)

```
Cliente                         Callable                      Firestore
   |-- submitScore(mode,score) -->|                              |
   |                              |-- valida mode/caps/nome      |
   |                              |-- boardId = daily_N|infinite |
   |                              |-- best-score only ---------->| leaderboards/{id}/scores/{uid}
   |<- { ok, written, score } ----|                              |
```

- Board id **sempre** calculado no servidor (`score-logic.boardIdForMode`) — o cliente não escolhe o path.
- Eventos: `eventLeaderboardId` precisa casar `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`.
- Caps: daily 500k · infinite/event 10M.
- Cliente: `TBFirebase.submitScore` / `submitEventScore` → `callFunction` (sem `ref.set`).
- Rules: leitura autenticada; **create/update/delete negados** ao SDK cliente.

## Testes

Lógica pura + mocks da Play API: `tests/unit/functions-iap.test.js`
(roda em `npm test` / gate). Sem need de `functions/node_modules` para esses
casos (verity injetável).

Scores / rankings: `tests/unit/functions-score.test.js` + regressão em
`tests/unit/anticheat-cloud.test.js`.

Ponte JS (grant local, repasse de token, restore, ads): `tests/unit/playbridge.test.js`.
Camada de save/entitlements (`applyIapPurchase`, `reconcileServerEconomy`,
idempotência por token): `tests/unit/save-module.test.js`.

## Follow-up

- Conta de licença de teste + compra real reconciliada (validação ponta a ponta na Play Console).
- Retirar crédito local otimista de ads/IAP quando servidor for autoridade total.
- Deploy Rules + Functions: `firebase deploy --only functions,firestore:rules`.
- Itens em [`play-store/CHECKLIST.md`](../play-store/CHECKLIST.md).
