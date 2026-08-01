import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../helpers/load-module.js';

/**
 * tb-main.js chama bootApp() no load — não montamos o IIFE completo aqui.
 * Este suite vincula as funções públicas/faseadas do boot ao inventário de testes
 * (cobertura comportamental via e2e + play-readiness + architecture).
 */
describe('tb-main (API surface)', () => {
  const src = readFileSync(join(projectRoot, 'tb-main.js'), 'utf8');

  it('expõe APP_VERSION e fases de boot', () => {
    expect(src).toMatch(/APP_VERSION\s*=\s*'1\.\d+\.\d+'/);
    expect(src).toContain('window.APP_VERSION');
    for (const fn of [
      'bootApp',
      '_initCoreModules',
      '_initScreenModules',
      '_initGameplayModules',
      '_initMetaModules',
      '_bindAudioAndBanners',
      '_runPostInit',
      '_mergeCfg',
      '_sessionCfg',
      'registerTBActions',
    ]) {
      expect(src).toContain(`function ${fn}`);
    }
  });

  it('delega input/board/gameplay aos módulos TB*', () => {
    expect(src).toMatch(/TBInput\.(init|bind)/);
    expect(src).toMatch(/TBBoard\.init/);
    expect(src).toMatch(/TBGameplay\.init/);
    expect(src).toMatch(/TBGlobal\.init/);
  });
});
