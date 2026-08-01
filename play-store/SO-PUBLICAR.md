# Publicar em 15 minutos — só o que só você pode fazer

O projeto já está preparado. **Não precisa programar nada.**

## O que já está pronto no seu PC

| Item | Status |
|------|--------|
| Jogo + Android (Capacitor) | ✅ |
| Textos da loja (PT/EN) | ✅ `play-store/listing/` |
| Ícone 512×512 | ✅ `play-store/assets/icon-512.png` |
| Feature graphic 1024×500 | ✅ `play-store/assets/feature-graphic-1024x500.png` |
| Screenshots | ⚠️ Ver passo 2 abaixo |
| Guias IAP, AdMob, privacidade | ✅ `play-store/console/` |
| Script automático | ✅ `scripts/setup-publish.ps1` |

---

## Passo 0 — Rode UMA vez no PowerShell (na pasta do projeto)

```powershell
cd C:\Users\renat\Downloads\TileBlast
powershell -ExecutionPolicy Bypass -File scripts\setup-publish.ps1
```

Isso gera assets, sincroniza o app e **cria a chave de assinatura** (se tiver Java instalado).

**Sem Java?** Instale só isto (uma vez):

```powershell
winget install Microsoft.OpenJDK.21
```

**Sem Android Studio?** Instale para gerar o `.aab`:

- [Android Studio](https://developer.android.com/studio) → instalar → abrir pasta `android/` → **Build → Generate Signed Bundle / APK** → Android App Bundle → use a keystore em `play-store/signing/tileblast-upload.jks` (senhas em `play-store/signing/SUAS-SENHAS.txt` após o script).

Ou, se o script terminou com sucesso:

```
play-store\release\tileblast-v1.4.6.aab   ← faça upload disto
```

---

## Passo 1 — Conta Google Play (~US$ 25, uma vez)

1. Acesse [play.google.com/console](https://play.google.com/console)
2. Pague a taxa de desenvolvedor (se ainda não tiver conta)
3. **Criar app** → Nome: **Tile Blast** → App → Grátis → Declarar políticas

---

# 2. Screenshots (automático ou manual)

**Automático** (terminal 1: `npm run serve:pwa` — terminal 2:):

```powershell
npm install
npm run play:screenshots
```

Gera `phone-01.png` … `phone-04.png` em `play-store/assets/screenshots/phone/`.

**Manual:** grave no celular e salve como `phone-01.png`, `phone-02.png` (mín. 2).

---

## Passo 3 — Política de privacidade (URL obrigatória)

1. Edite o e-mail em `www/privacy.html` (linha de contato)
2. Hospede a pasta `www/` grátis:
   - **GitHub Pages:** repositório → Settings → Pages → pasta `/www`
   - **Netlify:** arraste a pasta `www` em [app.netlify.com/drop](https://app.netlify.com/drop)
3. Sua URL será algo como: `https://seu-site.netlify.app/privacy.html`
4. Cole essa URL na Play Console → **Política do app**

---

## Passo 4 — Play Console (copiar/colar)

Abra **`play-store/COPIAR-COLAR-CONSOLE.txt`** e siga seção por seção.

Resumo rápido:

| Onde no console | O quê |
|-----------------|-------|
| **Página da loja** | Textos + imagens de `play-store/assets/` |
| **Monetizar → Produtos** | 6 IDs: `starter`, `noads`, `bppremium`, `coins500`, `coins1500`, `coins4000` |
| **Política → Classificação** | Questionário (sem violência; tem anúncios e compras) |
| **Política → Segurança dos dados** | Ver `play-store/console/SEGURANCA-DADOS.md` |
| **AdMob** | Trocar IDs de teste → ver `play-store/console/ADMOB.md` |

---

## Passo 5 — Upload e publicar

1. **Testar → Teste interno** → criar versão → upload do `.aab`
2. Instale no seu celular pelo link de teste
3. Teste: jogar, anúncio, loja
4. **Produção → Criar versão** → mesmo AAB → **Enviar para revisão**

Revisão: algumas horas a ~7 dias.

---

## Arquivos secretos (NÃO compartilhe)

- `play-store/signing/tileblast-upload.jks`
- `play-store/signing/SUAS-SENHAS.txt`
- `android/keystore.properties`

Já estão no `.gitignore`.

---

## Precisa de ajuda?

| Problema | Solução |
|----------|---------|
| Não gera AAB | Instale Android Studio + JDK 21 (`winget install Microsoft.OpenJDK.21`) |
| Anúncio "Test Ad" | Troque IDs AdMob (console/ADMOB.md) |
| Compra não funciona | Ative produtos IAP na Play Console |
| App rejeitado por privacidade | URL da política deve abrir no navegador |

**Checklist completo:** `play-store/CHECKLIST.md`
