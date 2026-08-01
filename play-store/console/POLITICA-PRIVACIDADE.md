# Política de privacidade — hospedagem

A Play Console exige uma **URL pública HTTPS** para a política de privacidade.

## Arquivo fonte

`www/privacy.html` (copiado para o app em `cap:sync`)

## Opções de hospedagem (grátis)

### A) GitHub Pages
1. Crie repositório público ou use o mesmo projeto
2. Ative Pages na branch `main`, pasta `/www` ou `/docs`
3. URL exemplo: `https://seuusuario.github.io/tileblast/privacy.html`

### B) Firebase Hosting
1. `firebase init hosting` → pasta `www`
2. `firebase deploy`
3. URL exemplo: `https://tileblast.web.app/privacy.html`

### C) Netlify / Cloudflare Pages
Arraste a pasta `www/` no painel.

## URL publicada (Renato)

```
https://merry-stroopwafel-49d37d.netlify.app/privacy.html
```

**Importante:** desative "Password protection" no Netlify (Site configuration → Access control → Visitors → Public). A Google precisa abrir a URL sem senha.

## Antes de publicar

1. Edite `www/privacy.html` — troque o e-mail `privacidade@tileblast.game` pelo seu real
2. Faça deploy
3. Cole a URL em:
   - Play Console → Política do app → Política de privacidade
   - AdMob → Configurações do app

## No app

O botão **Política de privacidade** nas configurações abre `privacy.html` localmente. Para revisão da Play Store, a URL externa é obrigatória no console.
