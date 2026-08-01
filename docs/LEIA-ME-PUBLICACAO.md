# Tile Blast — Publicação Google Play

## Comece aqui (1 arquivo)

### **[play-store/SO-PUBLICAR.md](../play-store/SO-PUBLICAR.md)**

Ou dê duplo clique em **`PUBLICAR.bat`** na raiz do projeto.

---

## O que só você pode fazer (exige sua conta Google)

- Pagar taxa Play Developer (~US$ 25)
- Criar app na Play Console
- Upload do arquivo `.aab`
- Criar conta AdMob e colar IDs reais
- Hospedar URL da política de privacidade

## O que já está feito no projeto

- App Android `com.tileblast.game` v1.4.6
- Assets loja: ícone, feature graphic, templates screenshot
- Textos PT/EN para a página da loja
- Scripts: `npm run play:setup`, `npm run play:bundle`
- Guias IAP, AdMob, classificação, dados

## Estrutura

```
play-store/
  SO-PUBLICAR.md      ← guia de 5 passos
  COPIAR-COLAR-CONSOLE.txt
  assets/             ← imagens para upload
  listing/            ← textos
  release/            ← AAB gerado aqui
  signing/            ← chave (gerada pelo script)
  console/            ← IAP, AdMob, privacidade
```
