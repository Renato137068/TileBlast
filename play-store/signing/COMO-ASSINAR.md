# Chave de assinatura (upload key)

A Google Play exige um **Android App Bundle (AAB)** assinado. Você cria a chave **uma vez** e guarda em local seguro.

## 1. Gerar keystore (só na primeira vez)

No PowerShell, na pasta do projeto:

```powershell
keytool -genkeypair -v `
  -keystore play-store/signing/tileblast-upload.jks `
  -alias tileblast `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storetype JKS
```

Guarde:
- Arquivo `.jks` (backup em nuvem criptografada + cópia offline)
- Senha da keystore
- Senha da chave (alias `tileblast`)

**Nunca commite o `.jks` no Git.**

## 2. Configurar o Gradle

```powershell
copy android\keystore.properties.example android\keystore.properties
```

Edite `android/keystore.properties`:

```properties
storeFile=../play-store/signing/tileblast-upload.jks
storePassword=SUA_SENHA
keyAlias=tileblast
keyPassword=SUA_SENHA
```

## 3. Play App Signing

Na primeira publicação, a Play Console pede para ativar **Play App Signing** (recomendado).

- Você envia o AAB assinado com sua **upload key**
- O Google re-assina com a **app signing key** para distribuição

Se perder a upload key, pode solicitar reset na Play Console (processo demorado). Por isso o backup é crítico.

## 4. Gerar o AAB

```powershell
npm run play:bundle
```

Saída: `play-store/release/tileblast-v1.3.1.aab`
