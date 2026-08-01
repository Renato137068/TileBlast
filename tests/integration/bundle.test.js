import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { MODULES } from '../../scripts/modules.mjs';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { projectRoot } from '../helpers/load-module.js';

// Concatena os modulos na ordem canonica (como o bundle real), exceto
// tb-main.js (exige DOM completo). Prova que concatenar estes scripts
// classicos nesta ordem equivale a carrega-los como <script> separados:
// carrega sem erro e expoe TODOS os globais. O boot via init() ja e
// coberto por boot.test.js.
function concatCore() {
  return MODULES.filter((f) => f !== 'tb-main.js')
    .map((f) => '/* ' + f + ' */\n' + readFileSync(join(projectRoot, f), 'utf8'))
    .join('\n;');
}

const EXPECTED_GLOBALS = [
  'TBConfig',
  'TBState',
  'TBEconomy',
  'TBContent',
  'TBAudio',
  'TBUI',
  'TBLogic',
  'TBFirebase',
  'TBRemote',
  'TBRoadmap',
  'TBGlobal',
  'TBFeatures',
  'TBPush',
  'TBMeta',
  'TBJuice',
  'TBRuntime',
  'TBSecure',
  'TBShop',
  'TBResult',
  'TBMap',
];

describe('bundle: concatenacao preserva semantica', () => {
  it('carrega sem erro e define todos os globais TB*', () => {
    createMinimalDom();
    const sandbox = {
      window: globalThis,
      document: globalThis.document,
      localStorage: globalThis.localStorage,
      navigator: globalThis.navigator,
      location: globalThis.location,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
      performance: globalThis.performance,
      console: globalThis.console,
      URLSearchParams: globalThis.URLSearchParams,
      Notification: undefined,
    };
    sandbox.global = globalThis;
    expect(() =>
      vm.runInNewContext(concatCore(), sandbox, { filename: 'bundle-core.js' })
    ).not.toThrow();
    for (const g of EXPECTED_GLOBALS) {
      expect(globalThis[g], 'global ' + g + ' ausente').toBeTruthy();
    }
  });

  it('www/app.bundle.js e valido e contem todos os modulos na ordem', () => {
    const bundle = readFileSync(join(projectRoot, 'www', 'app.bundle.js'), 'utf8');
    expect(bundle.length).toBeGreaterThan(100000);
    let lastIdx = -1;
    for (const f of MODULES) {
      const idx = bundle.indexOf('/* ' + f + ' */');
      expect(idx, 'bundle sem ' + f).toBeGreaterThan(-1);
      expect(idx, 'ordem incorreta em ' + f).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});
