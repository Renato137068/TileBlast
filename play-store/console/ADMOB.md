# AdMob — IDs de produção

**Antes de publicar**, substitua os IDs de **teste** do Google pelos seus IDs reais do [AdMob](https://admob.google.com).

## Onde alterar

### 1. App ID (AndroidManifest.xml)

Arquivo: `android/app/src/main/AndroidManifest.xml`

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

### 2. Ad units (TileBlastBridge.java)

Arquivo: `android/app/src/main/java/com/tileblast/game/TileBlastBridge.java`

```java
private static final String REWARDED_AD_UNIT = "ca-app-pub-XXXXXXXX/ZZZZZZZZZZ";
private static final String INTERSTITIAL_AD_UNIT = "ca-app-pub-XXXXXXXX/WWWWWWWWWW";
```

## Checklist AdMob

- [ ] Conta AdMob criada e vinculada à Play Console
- [ ] App Android registrado no AdMob (`com.tileblast.game`)
- [ ] Unidades: **Rewarded** e **Interstitial** criadas
- [ ] UMP (consentimento GDPR) — já implementado no bridge
- [ ] Política de privacidade publicada (URL na Play Console)

## Teste

Enquanto usar IDs de teste, anúncios mostram "Test Ad". Troque antes da revisão final.
