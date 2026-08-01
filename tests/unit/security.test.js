import { describe, expect, it, beforeEach } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { createFeaturesConfig, createMockConfig } from '../helpers/mock-config.js';
import { mountModule, mountRoadmap } from '../helpers/load-module.js';

function boot() {
  createMinimalDom();
  mountRoadmap();
  mountModule('tb-features.js');
  const cfg = createMockConfig();
  TBRoadmap.init(cfg);
  TBFeatures.init(createFeaturesConfig(cfg));
  return cfg;
}

describe('seguranca: anti-cheat no ranking', () => {
  beforeEach(() => {
    delete globalThis.__saveTampered;
  });

  it('save adulterado NAO registra pontuacao no ranking', () => {
    const cfg = boot();
    globalThis.__saveTampered = true;
    TBRoadmap.recordLeaderboardScore('daily', 999999);
    const lb = cfg.ld().lb;
    const has = !!(lb && lb.daily && lb.daily.some((e) => e.score === 999999));
    expect(has).toBe(false);
  });

  it('save integro registra pontuacao normalmente', () => {
    const cfg = boot();
    globalThis.__saveTampered = false;
    TBRoadmap.recordLeaderboardScore('daily', 12345);
    const lb = cfg.ld().lb;
    expect(lb.daily.some((e) => e.score === 12345)).toBe(true);
  });
});

describe('seguranca: sanitizacao do nome do jogador (XSS)', () => {
  it('remove < e > do nome ao salvar', () => {
    const cfg = boot();
    document.body.innerHTML = '<input id="player-name-inp" value="">';
    document.getElementById('player-name-inp').value = '<img src=x onerror=alert(1)>';
    TBRoadmap.savePlayerName();
    const nm = cfg.ld().playerName || '';
    expect(nm.includes('<')).toBe(false);
    expect(nm.includes('>')).toBe(false);
  });
});
