import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../helpers/load-module.js';
import { validatePlayStore } from '../../scripts/play-store-validate.mjs';

const read = (f) => readFileSync(join(projectRoot, f), 'utf8');
const appVer = read('tb-main.js').match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
const gradle = read('android/app/build.gradle');
const vars = read('android/variables.gradle');

describe('Play readiness: bloqueadores de publicacao', () => {
  it('APP_VERSION (tb-main) === versionName (gradle)', () => {
    const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
    expect(appVer, 'APP_VERSION nao encontrado').toBeTruthy();
    expect(versionName, 'versionName != APP_VERSION').toBe(appVer);
  });

  it('versionCode e inteiro positivo', () => {
    const code = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
    expect(Number.isInteger(code)).toBe(true);
    expect(code).toBeGreaterThan(0);
  });

  it('targetSdkVersion cumpre a exigencia atual do Play (>= 34)', () => {
    const target = Number(vars.match(/targetSdkVersion\s*=\s*(\d+)/)?.[1]);
    expect(target, 'targetSdk abaixo de 34 bloqueia upload').toBeGreaterThanOrEqual(34);
  });

  it('nome do pacote consistente: gradle applicationId === namespace === Capacitor appId', () => {
    const applicationId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1];
    const namespace = gradle.match(/namespace\s+"([^"]+)"/)?.[1];
    const capAppId = JSON.parse(read('capacitor.config.json')).appId;
    expect(applicationId, 'applicationId ausente no build.gradle').toBeTruthy();
    // applicationId é o packageName publicado — a validação de IAP e o Firebase
    // casam por ele; divergir do appId do Capacitor quebra a publicação.
    expect(capAppId, 'Capacitor appId != applicationId').toBe(applicationId);
    expect(namespace, 'namespace != applicationId').toBe(applicationId);
    // A cópia sincronizada em android/app/src/main/assets deve refletir o mesmo.
    const assetsCfg = 'android/app/src/main/assets/capacitor.config.json';
    if (existsSync(join(projectRoot, assetsCfg))) {
      expect(
        JSON.parse(read(assetsCfg)).appId,
        'assets/capacitor.config.json dessincronizado'
      ).toBe(applicationId);
    }
  });

  it('manifest.json tem campos obrigatorios de PWA/TWA + icones', () => {
    const m = JSON.parse(read('manifest.json'));
    for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) {
      expect(m[k], 'manifest sem ' + k).toBeTruthy();
    }
    const sizes = m.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(
      m.icons.some((i) => (i.purpose || '').includes('maskable')),
      'falta icone maskable'
    ).toBe(true);
  });

  it('icones 192 e 512 existem e nao estao vazios', () => {
    for (const f of ['icon-192.png', 'icon-512.png']) {
      const p = join(projectRoot, f);
      expect(existsSync(p), f + ' ausente').toBe(true);
      expect(statSync(p).size, f + ' vazio/corrompido').toBeGreaterThan(500);
    }
  });

  it('cache do SW reflete o APP_VERSION (guarda o bug corrigido)', () => {
    const swPath = join(projectRoot, 'www', 'sw.js');
    if (!existsSync(swPath)) return;
    const expected = 'tileblast-v' + appVer.replace(/\./g, '');
    expect(readFileSync(swPath, 'utf8').includes(expected), 'cache do SW != ' + expected).toBe(
      true
    );
  });

  it('listings + assets passam validatePlayStore (sem bloqueadores de texto/assets)', () => {
    const r = validatePlayStore(projectRoot, { mode: 'dev' });
    expect(r.blockers, r.blockers.join(' | ')).toEqual([]);
    expect(r.info.campaignLevels).toBeGreaterThanOrEqual(60);
    expect(r.info.screenshotCount).toBeGreaterThanOrEqual(2);
  });

  it('detecta AdMob de teste (aviso esperado em DEV)', () => {
    const r = validatePlayStore(projectRoot, { mode: 'dev' });
    expect(r.info.admobTestIds).toBe(true);
    expect(r.warnings.some((w) => /AdMob/i.test(w))).toBe(true);
    expect(r.blockers.some((b) => /AdMob/i.test(b))).toBe(false);
  });

  it('modo RELEASE promove AdMob/Firebase/IDS a bloqueadores', () => {
    const r = validatePlayStore(projectRoot, { mode: 'release' });
    expect(r.info.mode).toBe('release');
    expect(r.blockers.some((b) => /AdMob/i.test(b))).toBe(true);
    expect(r.blockers.some((b) => /Firebase|IDS-PRODUCAO|keystore/i.test(b))).toBe(true);
  });
});
