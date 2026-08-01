import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, mountRoadmap } from '../helpers/load-module.js';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createMockConfig } from '../helpers/mock-config.js';

function extractI18n() {
  const src = readFileSync(join(projectRoot, 'tb-i18n.js'), 'utf8');
  const start = src.indexOf('const I18N = {');
  let i = src.indexOf('{', start);
  let d = 0;
  let end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') {
      d--;
      if (d === 0) {
        end = i;
        break;
      }
    }
  }
  // Mesmo padrão de i18n.test.js — objeto literal sem funções.
  return new Function('return (' + src.slice(src.indexOf('{', start), end + 1) + ')')();
}

describe('i18n overflow / plurals (P4.2)', () => {
  it('nenhuma string de catálogo estoura 140 chars (risco de overflow em pills)', () => {
    const I18N = extractI18n();
    const long = [];
    for (const lang of ['pt', 'en', 'es']) {
      for (const [k, v] of Object.entries(I18N[lang] || {})) {
        if (typeof v === 'string' && v.length > 140) long.push(`${lang}.${k}=${v.length}`);
      }
    }
    expect(long, 'strings >140 chars: ' + long.join(', ')).toEqual([]);
  });

  it('a11y_group com {n} substitui em pt/en/es', () => {
    createMinimalDom();
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    for (const lang of ['pt', 'en', 'es']) {
      TBRoadmap.setLanguage(lang);
      const tpl = TBRoadmap.t('a11y_group');
      expect(tpl).toContain('{n}');
      expect(tpl.replace('{n}', '3')).toMatch(/3/);
    }
  });
});
