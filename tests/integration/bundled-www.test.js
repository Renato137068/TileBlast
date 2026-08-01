import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES } from '../../scripts/modules.mjs';
import { bundleIndexHtml } from '../../scripts/bundle-www.mjs';
import { projectRoot } from '../helpers/load-module.js';

describe('build de producao: index com bundle unico', () => {
  it('bundleIndexHtml troca as tags de modulo por 1 app.bundle.js', () => {
    const html = readFileSync(join(projectRoot, 'www', 'index.html'), 'utf8');
    const out = bundleIndexHtml(html, MODULES);
    // nenhuma tag de modulo individual sobra
    for (const m of MODULES) {
      expect(out.includes('<script src="' + m + '"></script>'), 'sobrou ' + m).toBe(false);
    }
    // exatamente uma tag do bundle
    const count = out.split('<script src="app.bundle.js"></script>').length - 1;
    expect(count).toBe(1);
  });

  it('preserva o resto do HTML (tamanho proximo, so os scripts mudam)', () => {
    const html = readFileSync(join(projectRoot, 'www', 'index.html'), 'utf8');
    const out = bundleIndexHtml(html, MODULES);
    // removeu ~17 linhas de tag, entao encolhe um pouco, mas nao colapsa
    expect(out.length).toBeGreaterThan(html.length * 0.9);
    expect(out.includes('</body>')).toBe(true);
    expect(out.includes('id="screen-map"')).toBe(true);
  });
});
