import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createFeaturesConfig, createMockConfig } from '../helpers/mock-config.js';
import { mountModule, mountRoadmap, projectRoot } from '../helpers/load-module.js';

function bootFeatures() {
  createMinimalDom();
  document.body.innerHTML += `
    <button id="map-colorblind-toggle" aria-pressed="false"></button>
    <button id="map-reducemotion-toggle" aria-pressed="false"></button>
  `;
  mountRoadmap();
  mountModule('tb-features.js');
  const cfg = createMockConfig();
  TBRoadmap.init(cfg);
  TBFeatures.init(createFeaturesConfig(cfg));
  return cfg;
}

describe('a11y toggles (P4.2)', () => {
  beforeEach(() => {
    delete globalThis.TBFeatures;
    delete globalThis.TBRoadmap;
  });

  it('toggleColorBlind aplica colorblind-mode e aria-pressed', () => {
    const cfg = bootFeatures();
    expect(document.documentElement.classList.contains('colorblind-mode')).toBe(false);
    TBFeatures.toggleColorBlind();
    expect(cfg.ld().colorBlind).toBe(true);
    expect(document.documentElement.classList.contains('colorblind-mode')).toBe(true);
    expect(document.getElementById('map-colorblind-toggle').getAttribute('aria-pressed')).toBe(
      'true'
    );
    TBFeatures.toggleColorBlind();
    expect(cfg.ld().colorBlind).toBe(false);
    expect(document.documentElement.classList.contains('colorblind-mode')).toBe(false);
  });

  it('css a11y define reduce-motion e colorblind-mode', () => {
    const css = readFileSync(join(projectRoot, 'css/a11y.css'), 'utf8');
    expect(css).toContain('html.reduce-motion');
    expect(css).toContain('html.colorblind-mode');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-contrast');
  });
});
