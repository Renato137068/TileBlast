# ✅ Pacote de publicação — Tile Blast

**Tudo que foi automatizado está pronto.** Siga só o arquivo:

## → [SO-PUBLICAR.md](./SO-PUBLICAR.md)

Ou dê **duplo clique** em `PUBLICAR.bat` na raiz do projeto.

---

## Já feito por você (no projeto)

| Item | Local |
|------|--------|
| App Android `com.tileblast.game` v1.3.1 | `android/` |
| Ícone loja 512×512 | `assets/icon-512.png` |
| Feature graphic 1024×500 | `assets/feature-graphic-1024x500.png` |
| **4 screenshots reais** (mapa, jogo, loja, diário) | `assets/screenshots/phone/phone-01..04.png` |
| Textos PT + EN | `listing/` |
| Textos para copiar no console | `COPIAR-COLAR-CONSOLE.txt` |
| Guias IAP, AdMob, privacidade, classificação | `console/` |
| Script keystore + AAB | `scripts/setup-publish.ps1` |
| Script screenshots | `npm run play:screenshots` |
| Script AdMob produção | `npm run play:admob` |

---

## O que só VOCÊ pode fazer (contas Google)

1. **Conta Play Developer** (~US$ 25) — criar app e enviar AAB  
2. **AdMob** — criar app, colar IDs em `console/IDS-PRODUCAO.env` → `npm run play:admob`  
3. **Política de privacidade** — hospedar `www/privacy.html` (Netlify Drop = 1 minuto)  
4. **AAB assinado** — rode `PUBLICAR.bat` ou instale Android Studio se o script falhar  

**Não é possível** publicar na Play Store sem sua conta Google e login — isso é regra da plataforma, não do projeto.

---

## Ordem rápida (15–30 min)

```
1. PUBLICAR.bat
2. play-store/SO-PUBLICAR.md passos 1–5
3. Upload play-store/release/*.aab (ou gerar no Android Studio)
```

Boa publicação! 🚀
