# Firebase — Tile Blast

## 1. Criar projeto

1. [Firebase Console](https://console.firebase.google.com/) → Novo projeto
2. Ative **Authentication** → Sign-in method → **Anônimo**
3. Ative **Firestore Database** (modo produção, região mais próxima)

## 2. Regras Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /saves/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /leaderboards/{board}/scores/{entry} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == entry;
    }
  }
}
```

## 3. App Web

```bash
cp firebase-config.example.js firebase-config.js
```

Preencha com o snippet do Firebase. Rode `npm run sync:www`.

## 4. Android

1. Adicione app Android (`com.tileblast.game`) no Firebase
2. `google-services.json` → `android/app/google-services.json`
3. Dependências Firebase no `build.gradle` (ver PLAYSTORE.md)
4. `npm run cap:sync`

## Push Notifications

1. Instale o plugin: `npm install @capacitor/push-notifications`
2. Rode `npx cap sync android` após alterações em `www/` ou plugins
3. Siga [PUSH-SETUP.md](./PUSH-SETUP.md) para Cloud Function do puzzle diário

## Collections

| Caminho | Uso |
|---------|-----|
| `saves/{uid}` | Save JSON |
| `leaderboards/daily_{day}/scores/{uid}` | Desafio diário |
| `leaderboards/infinite_all/scores/{uid}` | Infinito |
