import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createFeaturesConfig, createMockConfig } from '../helpers/mock-config.js';
import { mountModule, projectRoot, mountRoadmap } from '../helpers/load-module.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function boot() {
  createMinimalDom();
  mountRoadmap();
  mountModule('tb-features.js');
  const cfg = createMockConfig();
  TBRoadmap.init(cfg);
  TBFeatures.init(createFeaturesConfig(cfg));
  return cfg;
}

describe('i18n: deteccao de idioma', () => {
  it('mapeia navigator.language para pt/en/es', () => {
    boot();
    const d = TBRoadmap.detectLanguage;
    expect(d('pt-BR')).toBe('pt');
    expect(d('pt')).toBe('pt');
    expect(d('en-US')).toBe('en');
    expect(d('es-MX')).toBe('es');
    expect(d('fr-FR')).toBe('en'); // nao suportado -> padrao internacional
    expect(d('')).toBe('en');
    expect(d(null)).toBe('en');
  });

  it('auto-detecta idioma na primeira execucao (define save.lang)', () => {
    const cfg = boot();
    expect(['pt', 'en', 'es']).toContain(cfg.ld().lang);
  });
});

describe('i18n: troca de idioma usa os 3 catalogos', () => {
  it('t() retorna a string do idioma selecionado', () => {
    boot();
    TBRoadmap.setLanguage('pt');
    expect(TBRoadmap.t('lang_changed')).toBe('Idioma alterado');
    TBRoadmap.setLanguage('en');
    expect(TBRoadmap.t('lang_changed')).toBe('Language changed');
    TBRoadmap.setLanguage('es');
    expect(TBRoadmap.t('lang_changed')).toBe('Idioma cambiado');
  });
});

describe('i18n: applyI18n atualiza shell estático', () => {
  it('traduz elementos do HTML quando idioma muda', () => {
    createMinimalDom();
    document.body.innerHTML +=
      '<a id="skip-to-main"></a><p id="map-sub"></p><h2 id="worlds-title"></h2><p id="worlds-desc"></p>';
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    TBRoadmap.setLanguage('en');
    TBRoadmap.applyI18n();
    expect(document.getElementById('skip-to-main').textContent).toBe('Skip to main content');
    expect(document.getElementById('worlds-title').textContent).toContain('Choose a World');
    expect(document.getElementById('worlds-desc').textContent).toContain('Complete levels');
    TBRoadmap.setLanguage('pt');
    TBRoadmap.applyI18n();
    expect(document.getElementById('skip-to-main').textContent).toBe(
      'Ir para o conteúdo principal'
    );
  });
});

describe('i18n: applyDataI18n na loja', () => {
  it('traduz cards estaticos da loja', () => {
    createMinimalDom();
    document.getElementById('screen-shop').innerHTML =
      '<div class="shop-item-name" data-i18n="sh_bomb_name"></div><div data-i18n-html="shop_earn_hint"></div>';
    mountRoadmap();
    const cfg = createMockConfig();
    TBRoadmap.init(cfg);
    TBRoadmap.setLanguage('en');
    TBRoadmap.applyDataI18n(document.getElementById('screen-shop'));
    expect(document.querySelector('[data-i18n="sh_bomb_name"]').textContent).toBe('Bomb');
    expect(document.querySelector('[data-i18n-html="shop_earn_hint"]').innerHTML).toContain(
      'Earn by playing'
    );
  });
});

describe('i18n: paridade dos catalogos (sem chave sem traducao)', () => {
  it('pt, en e es tem exatamente o mesmo conjunto de chaves', () => {
    const src = readFileSync(join(projectRoot, 'tb-i18n.js'), 'utf8');
    const start = src.indexOf('const I18N = {');
    let i = src.indexOf('{', start),
      d = 0,
      end = -1;
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
    const block = src.slice(start, end + 1);
    const keysOf = (lang) => {
      const m = new RegExp('\\b' + lang + ':\\s*\\{').exec(block);
      let j = block.indexOf('{', m.index),
        dd = 0,
        e = -1;
      const braceStart = j;
      for (; j < block.length; j++) {
        if (block[j] === '{') dd++;
        else if (block[j] === '}') {
          dd--;
          if (dd === 0) {
            e = j;
            break;
          }
        }
      }
      // fatia a partir de DEPOIS do '{' para nao capturar o nome do idioma
      return new Set(
        (block.slice(braceStart + 1, e).match(/^\s*([a-z_0-9]+)\s*:/gim) || []).map((x) =>
          x.trim().replace(/:$/, '')
        )
      );
    };
    const pt = keysOf('pt'),
      en = keysOf('en'),
      es = keysOf('es');
    const diff = (a, b) => [...a].filter((k) => !b.has(k));
    expect(pt.size).toBeGreaterThan(100);
    expect(diff(pt, en), 'chaves pt ausentes em en').toEqual([]);
    expect(diff(pt, es), 'chaves pt ausentes em es').toEqual([]);
    expect(diff(en, pt), 'chaves en ausentes em pt').toEqual([]);
  });
});
