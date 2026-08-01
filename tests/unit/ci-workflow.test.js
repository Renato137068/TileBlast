import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../helpers/load-module.js';

describe('CI workflow (P0.2)', () => {
  const ciPath = join(projectRoot, '.github/workflows/ci.yml');
  const yaml = existsSync(ciPath) ? readFileSync(ciPath, 'utf8') : '';

  it('ci.yml existe e substitui o workflow antigo', () => {
    expect(existsSync(ciPath)).toBe(true);
    expect(existsSync(join(projectRoot, '.github/workflows/test.yml'))).toBe(false);
  });

  it('jobs obrigatórios: quality, e2e, android-smoke, android-release', () => {
    for (const job of ['quality:', 'e2e:', 'android-smoke:', 'android-release:']) {
      expect(yaml.includes(job), `faltando job ${job}`).toBe(true);
    }
  });

  it('quality bloqueia em format, lint, typecheck, coverage, content, play:validate, gate', () => {
    for (const cmd of [
      'format:check',
      'npm run lint',
      'npm run typecheck',
      'test:coverage',
      'content:validate',
      'play:validate',
      'release-gate.mjs',
    ]) {
      expect(yaml.includes(cmd), `faltando step ${cmd}`).toBe(true);
    }
  });

  it('publica artefatos de coverage e relatórios', () => {
    expect(yaml.includes('coverage-report')).toBe(true);
    expect(yaml.includes('release-gate-reports')).toBe(true);
    expect(yaml.includes('app-debug-apk')).toBe(true);
  });

  it('android-release exige secrets e falha fechado', () => {
    expect(yaml.includes('ANDROID_KEYSTORE_BASE64')).toBe(true);
    expect(yaml.includes('build_release')).toBe(true);
    expect(yaml.includes('environment: release')).toBe(true);
  });

  it('android-smoke monta assembleDebug sem keystore', () => {
    expect(yaml.includes('assembleDebug')).toBe(true);
    expect(yaml.includes('sem secrets') || yaml.includes('Android smoke')).toBe(true);
  });
});
