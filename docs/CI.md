# CI / Release secrets (P0.2)

## Jobs em todo PR
- **quality** — format:check, lint, typecheck, coverage, bundle, content:validate, play:validate, release-gate (DEV)
- **e2e** — smoke + gameplay + win/loss/progress/map
- **android-smoke** — `assembleDebug` (sem secrets), sobe APK como artefato

Artefatos: `coverage-report`, `release-gate-reports`, `app-debug-apk`.

## Release AAB (manual)
Actions → CI → Run workflow → marque **build_release**.

Environment GitHub: `release` com secrets:

| Secret | Uso |
|--------|-----|
| `ANDROID_KEYSTORE_BASE64` | keystore `.jks`/`.keystore` em base64 |
| `ANDROID_KEYSTORE_PASSWORD` | senha do store |
| `ANDROID_KEY_ALIAS` | alias da chave |
| `ANDROID_KEY_PASSWORD` | senha da chave |
| `FIREBASE_CONFIG_JS` | conteúdo completo de `firebase-config.js` |
| `IDS_PRODUCAO_ENV` | conteúdo de `IDS-PRODUCAO.env` |

Sem esses secrets o job **falha fechado** (não gera AAB com placeholders).

Local:

```bash
npm run ci:quality
npm run test:e2e
```
