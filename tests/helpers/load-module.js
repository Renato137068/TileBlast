import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Carrega um script clássico (IIFE / window.TB*) num sandbox.
 *
 * `filename` DEVE ser um URL `file://` absoluto: o provider v8 do Vitest
 * filtra scripts sem esse esquema, então `vm.runInNewContext` com um nome
 * relativo (ex.: "tb-logic.js") ficava invisível na cobertura (~1,5%).
 * Com file:// o Profiler.Coverage do V8 atribui hits ao arquivo real.
 */
export function loadScript(relativePath, extra = {}) {
  const abs = join(root, relativePath);
  const code = readFileSync(abs, 'utf8');
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
    ...extra,
  };
  sandbox.global = globalThis;
  // Module + exports: permite que scripts com dual export (tb-secure / tb-runtime)
  // também funcionem quando carregados via este helper.
  if (sandbox.module == null) {
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;
  }
  vm.runInNewContext(code, sandbox, { filename: pathToFileURL(abs).href });
  return sandbox;
}

export function mountModule(relativePath, extra) {
  loadScript(relativePath, extra);
  for (const key of [
    'TBI18n',
    'TBOffers',
    'TBAchievements',
    'TBSocial',
    'TBRetention',
    'TBRoadmap',
    'TBFeatures',
    'TBGlobal',
    'TBLogic',
    'TBRemote',
    'TBFirebase',
    'TBPush',
  ]) {
    if (globalThis[key]) {
      // ensure vitest globals can use bare identifiers in tests
    }
  }
  return globalThis;
}

/** Carrega i18n + achievements + offers + social + retention + roadmap. */
export function mountRoadmap(extra) {
  mountModule('tb-i18n.js', extra);
  mountModule('tb-achievements.js', extra);
  mountModule('tb-offers.js', extra);
  mountModule('tb-social.js', extra);
  mountModule('tb-retention.js', extra);
  mountModule('tb-roadmap.js', extra);
  return globalThis;
}

export const projectRoot = root;
