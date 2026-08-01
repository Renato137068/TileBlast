import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES, BOOT_MODULES, DEFERRED_MODULES } from '../../scripts/modules.mjs';
import { projectRoot } from '../helpers/load-module.js';

// Os 40 globais TB* que constituem o CONTRATO de modulos (window.X = ...).
const MODULE_GLOBALS = {
  'tb-config.js': 'TBConfig',
  'tb-state.js': 'TBState',
  'tb-economy.js': 'TBEconomy',
  'tb-content.js': 'TBContent',
  'tb-audio.js': 'TBAudio',
  'tb-analytics.js': 'TBAnalytics',
  'tb-ui.js': 'TBUI',
  'tb-game-logic.js': 'TBLogic',
  'tb-firebase.js': 'TBFirebase',
  'tb-remote.js': 'TBRemote',
  'tb-i18n.js': 'TBI18n',
  'tb-achievements.js': 'TBAchievements',
  'tb-offers.js': 'TBOffers',
  'tb-social.js': 'TBSocial',
  'tb-retention.js': 'TBRetention',
  'tb-roadmap.js': 'TBRoadmap',
  'tb-global.js': 'TBGlobal',
  'tb-features.js': 'TBFeatures',
  'tb-push.js': 'TBPush',
  'tb-meta.js': 'TBMeta',
  'tb-juice.js': 'TBJuice',
  'tb-runtime.js': 'TBRuntime',
  'tb-secure.js': 'TBSecure',
  'tb-save.js': 'TBSave',
  'tb-shop.js': 'TBShop',
  'tb-result.js': 'TBResult',
  'tb-map.js': 'TBMap',
  'tb-board.js': 'TBBoard',
  'tb-xp.js': 'TBXp',
  'tb-collection.js': 'TBCollection',
  'tb-chests.js': 'TBChests',
  'tb-missions.js': 'TBMissions',
  'tb-events.js': 'TBEvents',
  'tb-challenges.js': 'TBChallenges',
  'tb-meta-ui.js': 'TBMetaUI',
  'tb-gameplay.js': 'TBGameplay',
  'tb-music.js': 'TBMusic',
  'tb-ads.js': 'TBAds',
  'tb-playbridge.js': 'TBPlayBridge',
  'tb-dialogs.js': 'TBDialogs',
  'tb-start.js': 'TBStart',
  'tb-grid.js': 'TBGrid',
  'tb-modes.js': 'TBModes',
  'tb-a11y.js': 'TBA11y',
  'tb-fx.js': 'TBFx',
  'tb-input.js': 'TBInput',
  'tb-main.js': null,
  'firebase-config.js': null,
};
const read = (f) => readFileSync(join(projectRoot, f), 'utf8');

/** Remove comentários para não contar typedefs/JSDoc (@typedef TBBlock, etc.) como globais. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Qualquer global TB* realmente definido no bundle (window/global/g.TBX= OU const/let/var TBX=).
function providedGlobals() {
  const provided = new Set();
  for (const f of MODULES) {
    const src = stripComments(read(f));
    for (const m of src.matchAll(/(?:window|globalThis|global|g)\.(TB[A-Z]\w+)\s*=/g)) {
      provided.add(m[1]);
    }
    for (const m of src.matchAll(/\b(?:const|let|var)\s+(TB[A-Z]\w+)\s*=/g)) provided.add(m[1]);
  }
  return provided;
}

describe('arquitetura: contrato de modulos globais', () => {
  it('todo modulo do manifesto esta mapeado; 46 globais de modulo', () => {
    for (const f of MODULES) expect(MODULE_GLOBALS).toHaveProperty(f);
    expect(new Set(Object.values(MODULE_GLOBALS).filter(Boolean)).size).toBe(46);
  });

  it('nenhuma referencia TB* sem provedor (integridade de dependencias)', () => {
    const provided = providedGlobals();
    const dangling = {};
    for (const f of MODULES) {
      const refs = new Set(
        [...stripComments(read(f)).matchAll(/\b(TB[A-Z][a-z][A-Za-z]+)\b/g)].map((m) => m[1])
      );
      for (const r of refs) {
        if (r !== MODULE_GLOBALS[f] && !provided.has(r)) (dangling[f] ||= []).push(r);
      }
    }
    expect(dangling, 'referencias a globais inexistentes: ' + JSON.stringify(dangling)).toEqual({});
  });

  it('ordem dos <script> no HTML === BOOT_MODULES (adiados fora do HTML)', () => {
    const order = [...read('tile_blast.html').matchAll(/<script src="([^"]+\.js)"/g)].map(
      (m) => m[1]
    );
    expect(order).toEqual(BOOT_MODULES);
    expect(BOOT_MODULES.length + DEFERRED_MODULES.length).toBe(MODULES.length);
    for (const d of DEFERRED_MODULES) {
      expect(order).not.toContain(d);
      expect(MODULES).toContain(d);
    }
  });

  it('service worker precacheia todos os modulos', () => {
    const sw = read('sw.js');
    for (const f of MODULES) {
      expect(sw.includes("'./" + f + "'"), 'sw.js nao precacheia ' + f).toBe(true);
    }
  });
});
