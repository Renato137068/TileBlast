# Tile Blast — Google Play

> **Guia completo de publicação:** [`play-store/PUBLICACAO.md`](play-store/PUBLICACAO.md)  
> **Checklist antes de enviar:** [`play-store/CHECKLIST.md`](play-store/CHECKLIST.md)

Jogo web empacotado com **Capacitor** para Android.

## Comandos rápidos (publicação)

```powershell
npm run play:assets    # ícone, feature graphic, screenshots template
npm run play:bundle    # gera AAB assinado → play-store/release/
```

## Estrutura

| Pasta / arquivo | Uso |
|-----------------|-----|
| `tile_blast.html` | Fonte do jogo (edite aqui) |
| `www/` | Build web copiado para o app (`npm run sync:www`) |
| `android/` | Projeto Android (Capacitor) |
| **`play-store/`** | **Assets, textos, AAB, guias para a Play Store** |

## Desenvolvimento

```bash
npm run sync:www
npm run serve:pwa
npm run cap:sync
npm run cap:open
```

## Play Console — resumo

| Item | Detalhe |
|------|---------|
| appId | `com.tileblast.game` |
| Upload | AAB assinado (`play-store/release/`) |
| Ícone loja | `play-store/assets/icon-512.png` |
| Feature graphic | `play-store/assets/feature-graphic-1024x500.png` |
| Textos | `play-store/listing/pt-BR/` |
| IAP | `play-store/console/PRODUTOS-IAP.md` |
| AdMob | `play-store/console/ADMOB.md` |
| Privacidade | `play-store/console/POLITICA-PRIVACIDADE.md` |
| Assinatura | `play-store/signing/COMO-ASSINAR.md` |

## Bridge Android

`TileBlastBridge.java` — Billing, AdMob, UMP, analytics. Ver tabela em `play-store/PUBLICACAO.md`.
