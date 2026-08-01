# Push Notifications — Tile Blast

## Visão geral

O jogo usa `@capacitor/push-notifications` no Android e fallback `Notification` API na web/PWA.

- Permissão pedida após **3 fases** completadas (`TBPush.maybeAskPermission`)
- Token FCM salvo em `save.fcmToken` quando disponível

## Setup local

```bash
npm install
npx cap sync android
```

Configure `android/app/google-services.json` (veja [FIREBASE.md](./FIREBASE.md)).

## Firebase Cloud Messaging — notificação diária às 8h

### 1. Cloud Function (Node.js 20)

Crie `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.dailyPuzzleReminder = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const message = {
      notification: {
        title: 'Tile Blast',
        body: '🌍 Seu Puzzle Diário chegou! Quanto você consegue pontuar hoje?'
      },
      topic: 'daily_puzzle'
    };
    await admin.messaging().send(message);
    return null;
  });
```

### 2. Inscrever tokens no tópico

Quando o app receber o token FCM (`TBPush` → `registration` listener), envie para o Firestore e inscreva no tópico:

```javascript
// Callable ou HTTP function
await admin.messaging().subscribeToTopic([token], 'daily_puzzle');
```

### 3. Deploy

```bash
cd functions
npm install firebase-functions firebase-admin
firebase deploy --only functions:dailyPuzzleReminder
```

### 4. Play Console

- Declarar uso de notificações na ficha do app
- Permissão `POST_NOTIFICATIONS` já está no `AndroidManifest.xml`

## Teste

1. Build debug no dispositivo físico (emulador pode não receber FCM)
2. Complete 3 fases → aceite notificações
3. Envie mensagem de teste no Firebase Console → Messaging → tópico `daily_puzzle`

## Textos sugeridos (i18n)

| Idioma | Body |
|--------|------|
| PT | 🌍 Seu Puzzle Diário chegou! Quanto você consegue pontuar hoje? |
| EN | 🌍 Your Daily Puzzle is here! How high can you score today? |
| ES | 🌍 ¡Tu Puzzle Diario llegó! ¿Cuánto puedes puntuar hoy? |

Use Cloud Functions com segmentação por `save.lang` se quiser localizar por usuário.
