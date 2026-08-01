# Cloud Functions — Tile Blast

Autoridade econômica (ads + IAP) e rankings. Detalhes:
[`docs/ECONOMIA-SERVER-SIDE.md`](../docs/ECONOMIA-SERVER-SIDE.md).

## Conteúdo

| Export | Papel |
|--------|--------|
| `grantAdReward` | Rate-limit diário + crédito de moedas em `users/{uid}` |
| `confirmIapPurchase` | Valida `purchaseToken` via Play Developer API; idempotência em `iapReceipts` |
| `submitScore` | Ranking daily/infinite — board id no servidor; best-score only |
| `submitEventScore` | Ranking de eventos sazonais |

Lógica pura (testável sem Admin SDK): `iap-logic.js`, `economy-catalog.js`,
`confirm-iap.js`, `play-verify.js`, `score-logic.js`, `submit-score.js`.

## Setup (deploy)

1. `npm i -g firebase-tools` e `firebase login`
2. Projeto Blaze + `firebase init` (Firestore + Functions)
3. Service account Play API → Secret:
   `firebase functions:secrets:set PLAY_SERVICE_ACCOUNT_JSON`
4. `cd functions && npm i` (inclui `googleapis`)
5. `firebase deploy --only functions,firestore:rules`

**Não commitar** service accounts, `.runtimeconfig.json` com segredos, nem
chaves da Play API.

## Teste

- Unitários no monorepo: `npm test` → `functions-iap.test.js`, `functions-score.test.js`
- Emuladores: `firebase emulators:start --only functions,firestore`
  (opcional: `PLAY_SERVICE_ACCOUNT_JSON` no env do emulador)
