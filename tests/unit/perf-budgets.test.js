import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES, BOOT_MODULES, DEFERRED_MODULES } from '../../scripts/modules.mjs';
import { projectRoot } from '../helpers/load-module.js';

const budgets = JSON.parse(readFileSync(join(projectRoot, 'data/perf-budgets.json'), 'utf8'));

describe('perf budgets (P4.1)', () => {
  it('BOOT + DEFERRED cobre todo o manifesto sem sobreposição', () => {
    const union = [...BOOT_MODULES, ...DEFERRED_MODULES];
    expect(new Set(union).size).toBe(MODULES.length);
    expect(union.sort().join('|')).toBe([...MODULES].sort().join('|'));
  });

  it('HTML carrega só BOOT_MODULES; adiados declarados em tb-config.js', () => {
    const html = readFileSync(join(projectRoot, 'tile_blast.html'), 'utf8');
    const scripts = [...html.matchAll(/<script src="([^"]+\.js)"/g)].map((m) => m[1]);
    expect(scripts).toEqual(BOOT_MODULES);
    const cfg = readFileSync(join(projectRoot, 'tb-config.js'), 'utf8');
    const inline = cfg.match(/__TB_DEFERRED_MODULES__\s*=\s*(\[[^\]]*\])/);
    expect(inline).toBeTruthy();
    const parsed = JSON.parse(inline[1].replace(/'/g, '"'));
    expect(parsed).toEqual(DEFERRED_MODULES);
  });

  it('budgets estáticos têm baseline e max coerentes', () => {
    const pct = budgets.regression_pct;
    for (const [key, spec] of Object.entries(budgets.static)) {
      expect(spec.baseline).toBeGreaterThan(0);
      expect(spec.max).toBeGreaterThanOrEqual(spec.baseline);
      if (key.endsWith('_bytes')) {
        expect(spec.max).toBeLessThanOrEqual(Math.ceil(spec.baseline * (1 + pct / 100)));
      }
    }
  });

  it('bundle e www_js cabem nos limites após build:bundle', () => {
    const bundlePath = join(projectRoot, 'www/app.bundle.js');
    if (!existsSync(bundlePath)) return;
    const bundleBytes = statSync(bundlePath).size;
    expect(bundleBytes).toBeLessThanOrEqual(budgets.static.bundle_js_bytes.max);
    let wwwJs = 0;
    for (const f of MODULES) wwwJs += statSync(join(projectRoot, f)).size;
    expect(wwwJs).toBeLessThanOrEqual(budgets.static.www_js_bytes.max);
  });
});
