import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const curvesPath = join(root, 'data', 'balance-curves.json');
const legendaryPath = join(root, 'data', 'levels', 'legendary.json');

describe('P2.2 balance curves', () => {
  it('data/balance-curves.json documenta cada mundo e legendary ≤60% hard', () => {
    const report = JSON.parse(readFileSync(curvesPath, 'utf8'));
    expect(report.hardCap).toBe(0.65);
    expect(report.legendaryHardTarget).toBe(0.6);
    expect(report.worlds.length).toBeGreaterThanOrEqual(7);
    expect(report.alerts).toEqual([]);
    expect(report.legendary).toBeTruthy();
    expect(report.legendary.ok).toBe(true);
    expect(report.legendary.hardPct).toBeLessThanOrEqual(60);
    expect(report.justification.legendary_breath).toMatch(/P2\.2/);

    for (const w of report.worlds) {
      expect(w.hardOk).toBe(true);
      expect(w.curve).toMatch(/^[EMH]+$/);
      expect(w.count).toBeGreaterThan(0);
    }

    const legendary = report.worlds.find((w) => w.worldId === 'legendary');
    expect(legendary.curve).toBe('HMHMMMHMHH');
    expect(legendary.hardPct).toBe(50);
  });

  it('legendary.json alinha com a curva documentada (regressão de conteúdo)', () => {
    const pack = JSON.parse(readFileSync(legendaryPath, 'utf8'));
    const curve = pack.levels.map((lv) => (lv.difficulty || 'medium')[0].toUpperCase()).join('');
    const hard = pack.levels.filter((lv) => lv.difficulty === 'hard').length;
    expect(curve).toBe('HMHMMMHMHH');
    expect(hard / pack.levels.length).toBeLessThanOrEqual(0.6);

    const byId = Object.fromEntries(pack.levels.map((lv) => [lv.id, lv]));
    expect(byId['legendary-05'].difficulty).toBe('medium');
    expect(byId['legendary-05'].moves).toBeGreaterThanOrEqual(24);
    expect(byId['legendary-07'].moves).toBeGreaterThanOrEqual(18);
    expect(byId['legendary-08'].difficulty).toBe('medium');
    expect(byId['legendary-09'].moves).toBeGreaterThanOrEqual(16);
  });
});
