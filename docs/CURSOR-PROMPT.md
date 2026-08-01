# Prompt para o Cursor — Melhorias Tile Blast

Cole este prompt diretamente no Cursor (modo Agent ou Composer).

---

## CONTEXTO DO PROJETO

Você está trabalhando no **Tile Blast**, um jogo puzzle de blocos desenvolvido com:
- **Web app** (HTML/CSS/JS) empacotado via **Capacitor** como APK/AAB Android
- Arquivo principal do jogo: `tile_blast.html` (single-file HTML/CSS/JS)
- Módulos JS: `tb-global.js`, `tb-roadmap.js`, `tb-remote.js`, `tb-firebase.js`
- Android nativo: `android/app/build.gradle`, `android/variables.gradle`
- Configuração Capacitor: `capacitor.config.json`
- Play Store assets: `play-store/` (listings PT-BR, EN-US)
- Package: `com.tileblast.game` | Versão atual: `1.4.9` (versionCode 14)

---

## OBJETIVO

Implementar uma série de melhorias organizadas por prioridade. **Comece sempre pelas tarefas marcadas como 🔴 CRÍTICO**, depois 🟡 ALTA PRIORIDADE e por fim 🟢 MÉDIO PRAZO.

Ao terminar cada tarefa, diga qual foi feita e mostre o diff relevante.

---

## 🔴 TAREFAS CRÍTICAS (necessárias antes de publicar na Play Store)

### CRÍTICO 1 — Ativar minificação no build Android

**Arquivo**: `android/app/build.gradle`

Altere `minifyEnabled false` para `minifyEnabled true` no buildType `release` e garanta que as regras ProGuard corretas existam.

Também crie/atualize `android/app/proguard-rules.pro` com regras para:
- Capacitor (WebView bridge)
- Google AdMob (`com.google.android.gms.ads.**`)
- Google Billing (`com.android.billingclient.**`)
- Firebase (`com.google.firebase.**`)
- UMP (`com.google.android.ump.**`)
- Manter nomes de classes públicas do TileBlastBridge

Exemplo de estrutura esperada no `build.gradle`:
```groovy
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

### CRÍTICO 2 — Script para gerar Feature Graphic PNG

O arquivo `play-store/assets/feature-graphic.svg` existe mas a Play Store exige **PNG 1024×500**.

Crie o script `scripts/generate-feature-graphic.mjs` que:
1. Lê `play-store/assets/feature-graphic.svg`
2. Usa a lib `sharp` (adicione ao `package.json` se necessário) para converter para PNG 1024×500
3. Salva em `play-store/assets/feature-graphic-1024x500.png`
4. Exibe mensagem de sucesso com o tamanho do arquivo gerado

Adicione ao `package.json` o script:
```json
"play:feature-graphic": "node scripts/generate-feature-graphic.mjs"
```

---

### CRÍTICO 3 — Expandir títulos na Play Store

**Arquivos**:
- `play-store/listing/pt-BR/title.txt`
- `play-store/listing/en-US/title.txt`

Altere os títulos para aproveitar melhor o limite de 30 caracteres com keywords relevantes:

- **PT-BR**: `Tile Blast: Puzzle de Blocos` (29 chars)
- **EN-US**: `Tile Blast: Block Puzzle Game` (29 chars)

Também atualize as **short descriptions** para incluir número de fases:
- **PT-BR** (`short-description.txt`): `Puzzle viciante: combine blocos, 60 fases, puzzle diário e modo infinito!` (já está bom — verificar se tem 80 chars ou menos)
- **EN-US** (`short-description.txt`): `Addictive block puzzle: 60 levels, daily challenge, infinite mode & power-ups!`

---

### CRÍTICO 4 — Criar listing em Espanhol

O jogo já tem tradução completa em ES (`tb-roadmap.js` tem `I18N.es` completo), mas falta o listing na Play Store.

Crie a estrutura:
```
play-store/listing/es-419/
  title.txt
  short-description.txt
  full-description.txt
```

**`title.txt`**: `Tile Blast: Puzzle de Bloques` (30 chars)

**`short-description.txt`**: `Puzzle adictivo: combina bloques, 60 niveles, desafío diario y modo infinito!`

**`full-description.txt`**: Adapte a versão PT-BR para espanhol, mantendo a mesma estrutura com emojis e seções. Use os textos já existentes no `I18N.es` do `tb-roadmap.js` como referência de vocabulário. O resultado deve ser natural, não uma tradução literal — use "bloques de colores", "niveles", "potenciadores" (power-ups), "pase de batalla", "misiones diarias", "clasificación global".

---

## 🟡 TAREFAS DE ALTA PRIORIDADE (primeiras 2 semanas após lançamento)

### ALTA 1 — Reduzir frequência de intersticiais

**Arquivo**: `www/remote-config.json` (e `remote-config.json` na raiz se existir)

Altere o valor padrão de `interstitialEvery` de `3` para `5`.

Também atualize o valor padrão em `tb-remote.js` no objeto `DEFAULTS`:
```js
const DEFAULTS = {
  adDailyLimit: 5,
  interstitialEvery: 5,   // era 3
  interstitialDailyCap: 5,
  ...
}
```

E em `tb-roadmap.js` na função `remoteConfig()`:
```js
const def = { adDailyLimit: 5, interstitialEvery: 5, coinMult: 1, starterPrice: 2.99 };
```

---

### ALTA 2 — Push Notifications com Firebase Cloud Messaging

Adicione suporte a push notifications para notificar o usuário sobre o puzzle diário.

**Passo A — Instalar plugin Capacitor Push**:
No `package.json`, adicione `@capacitor/push-notifications` se não existir. Documente no `FIREBASE.md` que é necessário rodar `npx cap sync android` após.

**Passo B — Criar `www/tb-push.js`**:
```js
/**
 * Tile Blast — Push Notifications via Firebase Cloud Messaging.
 * Pede permissão após o usuário completar 3 fases.
 */
(function (global) {
  'use strict';

  async function requestPermission() {
    if (!('Notification' in window) && !global.PushNotifications) return;
    const s = localStorage.getItem('tb_save');
    const save = s ? JSON.parse(s) : {};
    if (save.pushAsked) return;
    save.pushAsked = true;
    localStorage.setItem('tb_save', JSON.stringify(save));
    
    // Capacitor nativo
    if (global.PushNotifications) {
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        await PushNotifications.register();
        PushNotifications.addListener('registration', (token) => {
          // Salvar token para backend/Firebase Functions
          if (global.TBFirebase && TBFirebase.configValid()) {
            TBFirebase.boot().then(() => {
              // Salvar token no Firestore se necessário
            });
          }
        });
      }
      return;
    }
    
    // PWA fallback
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  function maybeAskPermission(levelsCompleted) {
    if (levelsCompleted >= 3) requestPermission();
  }

  global.TBPush = { maybeAskPermission, requestPermission };
})(typeof window !== 'undefined' ? window : global);
```

**Passo C — Referenciar no `www/index.html`**:
Adicione `<script src="tb-push.js"></script>` após os outros scripts tb-*.

**Passo D — Chamar em `tile_blast.html`**:
Após uma vitória de fase, adicione:
```js
if (global.TBPush) TBPush.maybeAskPermission(C.getUnlocked());
```

**Passo E — Criar `PUSH-SETUP.md`** na raiz explicando como configurar Firebase Functions para enviar a notificação diária às 8h com o texto: "🌍 Seu Puzzle Diário chegou! Quanto você consegue pontuar hoje?"

---

### ALTA 3 — Daily Login Streak (recompensa diária de login)

**Arquivo**: `tb-roadmap.js`

Adicione um sistema de daily login reward após a função `openDailyPuzzleModal`:

```js
function checkDailyLoginReward() {
  const s = C.ld();
  const today = dailyDayKey();
  const lastLogin = s.lastLoginDay || 0;
  if (lastLogin === today) return; // já coletou hoje
  
  const yesterday = today - 1;
  const streak = lastLogin === yesterday ? (s.loginStreak || 0) + 1 : 1;
  s.loginStreak = streak;
  s.lastLoginDay = today;
  
  // Recompensas progressivas
  const rewards = [10, 15, 20, 25, 30, 40, 100]; // D1 a D7+
  const idx = Math.min(streak - 1, rewards.length - 1);
  const coins = rewards[idx];
  
  C.addCoins && C.addCoins(coins);
  C.sv(s);
  
  // Labels de streak especiais
  const isWeek = streak % 7 === 0;
  
  setTimeout(() => {
    C.showGlobalModal(`
      <div style="font-size:40px">${isWeek ? '🎉' : '📅'}</div>
      <div style="font-size:17px;font-weight:800">${t('daily_reward') || 'Recompensa Diária'}</div>
      <div style="font-size:13px;color:var(--dim);margin:6px 0 10px">${t('day') || 'Dia'} ${streak} ${streak >= 7 ? '🔥' : ''}</div>
      <div style="font-size:32px;font-weight:800;color:var(--accent);margin-bottom:12px">+${coins} 🪙</div>
      ${isWeek ? `<div style="font-size:12px;color:#4ecb71;font-weight:700;margin-bottom:10px">🏆 Sequência de ${streak} dias! Bônus especial!</div>` : ''}
      <button class="btn btn-p btn-full" onclick="closeGlobalModal()">${t('collect') || 'Coletar!'}</button>
    `);
  }, 500);
}
```

Exporte `checkDailyLoginReward` no objeto `TBRoadmap` e chame-a no `boot()` do `TBGlobal` (em `tb-global.js`), dentro da função `boot()`, após `renderMapTitle()`:
```js
TBRoadmap.checkDailyLoginReward && TBRoadmap.checkDailyLoginReward();
```

Também adicione no `I18N` de `tb-roadmap.js` as chaves que já estão referenciadas (`daily_reward`, `collect`, `day`) em todos os 3 idiomas (PT/EN/ES) — provavelmente já existem, apenas verificar.

---

### ALTA 4 — Corrigir `largeHeap` no AndroidManifest

**Arquivo**: `android/app/src/main/AndroidManifest.xml`

Adicione `android:largeHeap="true"` na tag `<application>` para evitar OOM crashes em aparelhos com 2GB RAM rodando o WebView + assets do jogo:

```xml
<application
    android:largeHeap="true"
    ...outras props existentes...
>
```

---

## 🟢 TAREFAS DE MÉDIO PRAZO (30–60 dias)

### MÉDIO 1 — Desafio do Amigo (share link para desafio)

**Arquivo**: `tb-global.js`

Adicione a função `shareChallengeLink(levelId)` que gera um link `?challenge=LEVELID&seed=SEED`:

```js
function shareChallengeLink(levelId) {
  const seed = C.ld().stars?.[levelId] >= 3 ? 'master' : 'normal';
  const url = location.href.split('?')[0] + `?challenge=${levelId}&seed=${seed}`;
  const text = `Consegui completar a fase ${levelId} no Tile Blast! Você consegue superar minha pontuação? 🎮`;
  if (navigator.share) {
    navigator.share({ title: 'Tile Blast', text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text + ' ' + url);
    C.showToast('📤', 'Link copiado!', 'Compartilhe com um amigo');
  }
}
```

Adicione a função ao objeto `TBGlobal` exportado e adicione um botão "Desafiar Amigo 📤" na tela de vitória de fases com 3 estrelas.

---

### MÉDIO 2 — Produto de assinatura "Sem Anúncios"

**Arquivo**: `play-store/CHECKLIST.md`

Adicione à seção de Monetização:
```
- [ ] Produto de assinatura mensal "no_ads_monthly" ($1.99/mês) criado na Play Console
- [ ] Produto de assinatura anual "no_ads_yearly" ($14.99/ano) criado na Play Console
```

**Arquivo**: `tb-roadmap.js`

Na função `openShopModal()` (ou onde a loja for aberta), adicione uma seção de assinatura antes dos IAPs existentes com card destacado:
```js
// Card de assinatura — adicionar no início da lista de produtos
const subCard = `
  <div class="shop-item featured">
    <div style="font-size:24px">🚫📺</div>
    <div style="font-weight:800">Sem Anúncios</div>
    <div style="font-size:12px;color:var(--dim)">Jogue sem interrupções</div>
    <div style="font-size:18px;font-weight:800;color:var(--accent);margin:4px 0">R$9,90/mês</div>
    <button class="btn btn-p" onclick="TBRoadmap.purchaseSubscription('no_ads_monthly')">Assinar</button>
  </div>`;
```

Implemente `purchaseSubscription(productId)` que chama o billing nativo via `TileBlastBridge`.

---

### MÉDIO 3 — Otimização de performance do HTML principal

**Arquivo**: `tile_blast.html`

Sem alterar a funcionalidade, aplique as seguintes otimizações:

1. Adicione `loading="lazy"` em imagens e elementos não críticos no carregamento inicial.
2. Mova os scripts `tb-global.js`, `tb-roadmap.js`, `tb-firebase.js`, `tb-remote.js` para o final do `<body>` com atributo `defer` se ainda não estiverem.
3. Adicione `<link rel="preconnect" href="https://fonts.googleapis.com">` e `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` no `<head>` para carregar Baloo 2 mais rápido.
4. Adicione `will-change: transform` apenas nas animações de tela (`screenIn`/`screenOut`) e remova de elementos estáticos.

---

## CHECKLIST FINAL APÓS IMPLEMENTAR TUDO

Após fazer todas as mudanças, verifique:

- [ ] `android/app/build.gradle` tem `minifyEnabled true` e `shrinkResources true`
- [ ] `android/app/proguard-rules.pro` tem regras para Capacitor, AdMob, Billing, Firebase
- [ ] `play-store/assets/feature-graphic-1024x500.png` existe (gerado pelo script)
- [ ] `play-store/listing/pt-BR/title.txt` tem no máximo 30 chars
- [ ] `play-store/listing/en-US/title.txt` tem no máximo 30 chars
- [ ] `play-store/listing/es-419/` existe com todos os 3 arquivos
- [ ] `remote-config.json` tem `interstitialEvery: 5`
- [ ] `tb-remote.js` DEFAULTS tem `interstitialEvery: 5`
- [ ] `www/tb-push.js` criado e referenciado no `www/index.html`
- [ ] Daily login streak implementado em `tb-roadmap.js`
- [ ] `android:largeHeap="true"` no AndroidManifest.xml
- [ ] `PUSH-SETUP.md` criado com instruções de Firebase Functions
- [ ] Função `shareChallengeLink` adicionada ao `tb-global.js`

---

## NOTAS IMPORTANTES

- **Não altere** a lógica de jogo em `tile_blast.html` — apenas performance e referências a scripts externos.
- **Não commite** `android/keystore.properties`, `firebase-config.js`, ou `google-services.json`.
- O campo `versionCode` no `build.gradle` deve ser incrementado para `5` e `versionName` para `"1.4.0"` após as mudanças.
- Sempre rodar `npx cap sync android` após mudanças em `www/` ou plugins Capacitor.
- Os arquivos `www/` são o build de produção — o source de `tb-*.js` fica na raiz e é copiado para `www/` pelo script `scripts/sync-www.js`.
