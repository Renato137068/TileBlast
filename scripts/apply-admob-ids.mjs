/**
 * Aplica IDs AdMob de produção nos arquivos Android (cross-platform).
 * Uso: node scripts/apply-admob-ids.mjs [caminho/IDS-PRODUCAO.env]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = process.argv[2] || join(root, 'play-store/console/IDS-PRODUCAO.env');

if (!existsSync(envFile)) {
  console.error(`Crie ${envFile} a partir de IDS-PRODUCAO.env.example`);
  process.exit(1);
}

const vars = {};
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('=');
  vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

for (const k of ['ADMOB_APP_ID', 'ADMOB_REWARDED', 'ADMOB_INTERSTITIAL']) {
  if (!vars[k] || /XXXX|YYYY|ZZZZ|WWWW|3940256099942544/.test(vars[k])) {
    console.error(`Preencha ${k} em ${envFile} com ID real (não placeholder/teste)`);
    process.exit(1);
  }
}

const manifest = join(root, 'android/app/src/main/AndroidManifest.xml');
let m = readFileSync(manifest, 'utf8');
m = m.replace(/android:value="ca-app-pub-[^"]+"/, `android:value="${vars.ADMOB_APP_ID}"`);
writeFileSync(manifest, m);

for (const rel of [
  'android/app/src/main/java/com/tileblast/game/TileBlastBridge.java',
  'android-native/TileBlastBridge.java',
]) {
  const path = join(root, rel);
  if (!existsSync(path)) continue;
  let b = readFileSync(path, 'utf8');
  b = b.replace(
    /REWARDED_AD_UNIT\s*=\s*"ca-app-pub-[^"]+"/,
    `REWARDED_AD_UNIT = "${vars.ADMOB_REWARDED}"`
  );
  b = b.replace(
    /INTERSTITIAL_AD_UNIT\s*=\s*"ca-app-pub-[^"]+"/,
    `INTERSTITIAL_AD_UNIT = "${vars.ADMOB_INTERSTITIAL}"`
  );
  writeFileSync(path, b);
}

console.log('✓ AdMob IDs aplicados (android + android-native). Rode: npm run cap:sync');
