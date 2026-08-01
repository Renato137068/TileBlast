# Guia completo — Publicar Tile Blast na Google Play

> **Atalho:** [ENTREGA-FINAL.md](./ENTREGA-FINAL.md) · Duplo clique em `PUBLICAR.bat` na raiz do projeto

Este guia cobre tudo que você precisa nos próximos dias.

## Informações do app

| Campo | Valor |
|-------|-------|
| Nome | Tile Blast |
| Package / appId | `com.tileblast.game` |
| Formato de upload | **AAB** (Android App Bundle) — obrigatório |
| Versão atual | 1.3.1 (versionCode 4) |
| Min SDK | 23 (Android 6.0) |
| Target SDK | 35 |

---

## Estrutura de pastas `play-store/`

```
play-store/
├── PUBLICACAO.md          ← este guia
├── CHECKLIST.md           ← marque antes de enviar
├── assets/                ← imagens para a loja (formatos aceitos)
│   ├── icon-512.png       ← 512×512 PNG (ícone da loja)
│   ├── feature-graphic-1024x500.png
│   └── screenshots/phone/ ← 1080×1920 (substitua placeholders)
├── listing/               ← textos copiar/colar no console
│   ├── pt-BR/
│   └── en-US/
├── signing/               ← keystore + instruções
├── release/               ← AAB gerado (upload aqui)
└── console/               ← IAP, AdMob, privacidade, classificação
```

---

## Passo a passo (ordem recomendada)

### Dia 1 — Contas e configuração

1. **Conta Google Play Developer** — taxa única ~US$ 25 em [play.google.com/console](https://play.google.com/console)
2. **Criar app** → Nome: Tile Blast → Idioma padrão: Português (Brasil) → App → Grátis
3. **AdMob** — criar app Android, anotar App ID e ad units → `console/ADMOB.md`
4. **Política de privacidade** — hospedar `www/privacy.html` → `console/POLITICA-PRIVACIDADE.md`
5. **Firebase** (opcional) — `google-services.json` em `android/app/`

### Dia 2 — Console e monetização

6. **Produtos IAP** — criar 6 produtos → `console/PRODUTOS-IAP.md`
7. **Classificação de conteúdo** → `console/CLASSIFICACAO.md`
8. **Segurança dos dados** → `console/SEGURANCA-DADOS.md`
9. **Página da loja** — upload de assets + textos de `listing/`

### Dia 3 — Build e teste

10. **Chave de assinatura** → `signing/COMO-ASSINAR.md`
11. **Gerar assets**:
    ```powershell
    npm run play:assets
    ```
12. **Screenshots reais** — grave 2–8 telas no celular (1080×1920), substitua os `PLACEHOLDER` em `assets/screenshots/phone/`
13. **Build AAB**:
    ```powershell
    npm run play:bundle
    ```
14. **Teste interno** — Play Console → Testar → Teste interno → upload do `.aab`

### Dia 4 — Revisão e publicação

15. Preencher **CHECKLIST.md**
16. Enviar para **Produção** (ou teste fechado primeiro)
17. Aguardar revisão (algumas horas a 7 dias)

---

## Formatos aceitos pela Play Store

| Asset | Formato | Tamanho | Onde colocar |
|-------|---------|---------|--------------|
| Ícone da loja | PNG ou JPEG | **512×512** px, até 1 MB | `assets/icon-512.png` |
| Feature graphic | PNG ou JPEG | **1024×500** px | `assets/feature-graphic-1024x500.png` |
| Screenshots (phone) | PNG ou JPEG | **2–8** imagens, ratio 16:9 ou **9:16**, lado curto ≥320 px | `assets/screenshots/phone/` |
| App bundle | **.aab** | Assinado | `release/tileblast-v*.aab` |

Tablet screenshots são opcionais para v1.

---

## Comandos npm

| Comando | O que faz |
|---------|-----------|
| `npm run play:assets` | Gera ícone, feature graphic e placeholders de screenshot |
| `npm run play:bundle` | Sync + Gradle `bundleRelease` → copia AAB para `play-store/release/` |
| `npm run cap:sync` | Atualiza `www/` no projeto Android |

---

## Antes do upload final

- [ ] IDs AdMob de **produção** (não teste)
- [ ] `privacy.html` online com e-mail real
- [ ] 6 produtos IAP ativos na Play Console
- [ ] Screenshots **reais** (não placeholder)
- [ ] Testou compra e anúncio em build de teste
- [ ] `versionCode` incrementado a cada novo upload

Para incrementar versão, edite `android/app/build.gradle`:
```gradle
versionCode 5        // sempre +1 a cada upload
versionName "1.3.2"
```

---

## Links úteis

- [Play Console](https://play.google.com/console)
- [Requisitos de metadados](https://support.google.com/googleplay/android-developer/answer/9866151)
- [App bundles](https://developer.android.com/guide/app-bundle)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
