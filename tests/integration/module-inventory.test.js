import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MODULES } from '../../scripts/modules.mjs';
import { projectRoot } from '../helpers/load-module.js';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

/** Testes que só listam o manifesto não contam como vínculo comportamental. */
const WEAK = new Set([
  'tests/integration/architecture.test.js',
  'tests/integration/bundle.test.js',
  'tests/integration/bundled-www.test.js',
]);

describe('inventário módulo ↔ teste', () => {
  const testsDir = join(projectRoot, 'tests');
  const bodies = walk(testsDir).map((p) => ({
    path: relative(projectRoot, p).replace(/\\/g, '/'),
    text: readFileSync(p, 'utf8'),
  }));

  it('todo módulo MODULES tem pelo menos um teste comportamental', () => {
    const missing = [];
    for (const m of MODULES) {
      const base = m.replace(/\.js$/, '');
      const hits = bodies.filter((b) => {
        if (WEAK.has(b.path)) return false;
        return (
          b.text.includes(`'${m}'`) ||
          b.text.includes(`"${m}"`) ||
          b.text.includes(m) ||
          b.text.includes(base)
        );
      });
      if (!hits.length) missing.push(m);
    }
    expect(missing, `sem teste comportamental: ${missing.join(', ')}`).toEqual([]);
  });

  it('há suíte dedicada *-module.test.js ou *.{test} para os módulos de jogo', () => {
    const names = bodies.map((b) => b.path);
    const requiredHints = [
      'gameplay-module',
      'board-module',
      'input-module',
      'global-module',
      'achievements-module',
      'social-module',
      'offers-module',
      'events-module',
      'challenges-module',
      'main-module',
    ];
    for (const h of requiredHints) {
      expect(
        names.some((n) => n.includes(h)),
        `faltando suite ${h}`
      ).toBe(true);
    }
  });
});
