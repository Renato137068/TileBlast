/**
 * Análise estática de curva de dificuldade por mundo.
 * Uso: node scripts/analyze-balance.mjs [--write]
 * Emite data/balance-curves.json (fonte para regressão P2.2).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const levelsDir = join(root, 'data', 'levels');
const write = process.argv.includes('--write');

const HARD_CAP = 0.65;
const LEGENDARY_TARGET = 0.6;

function scorePpm(lv) {
  const scoreObj = (lv.objectives || []).find((o) => o.type === 'score');
  if (!scoreObj || !lv.moves) return null;
  return scoreObj.target / lv.moves;
}

function analyzePack(pack) {
  const levels = pack.levels || [];
  const counts = { easy: 0, medium: 0, hard: 0 };
  const curve = [];
  const peaks = [];
  const trail = [];

  levels.forEach((lv, i) => {
    const d = lv.difficulty || 'medium';
    counts[d] = (counts[d] || 0) + 1;
    curve.push(d[0].toUpperCase());
    const ppm = scorePpm(lv);
    if (ppm != null) {
      const avg =
        trail.length >= 3 ? trail.slice(-3).reduce((a, b) => a + b, 0) / 3 : trail[0] || ppm;
      if (trail.length >= 3 && ppm > avg * 1.45) {
        peaks.push({
          id: lv.id,
          order: lv.order || i + 1,
          ppm: Math.round(ppm),
          avg: Math.round(avg),
          jump: Math.round(((ppm - avg) / avg) * 100),
        });
      }
      trail.push(ppm);
    }
  });

  const hardRatio = counts.hard / Math.max(1, levels.length);
  const breathGaps = [];
  for (let i = 1; i < curve.length - 1; i++) {
    if (curve[i] === 'H' && curve[i - 1] === 'H' && curve[i + 1] === 'H') {
      breathGaps.push({ after: levels[i].id, note: '3 hard seguidos — falta respiro' });
    }
  }

  return {
    worldId: pack.worldId,
    count: levels.length,
    counts,
    hardPct: Math.round(hardRatio * 1000) / 10,
    hardOk: hardRatio <= HARD_CAP,
    curve: curve.join(''),
    peaks,
    breathGaps,
    levels: levels.map((lv) => ({
      id: lv.id,
      order: lv.order,
      name: lv.name,
      difficulty: lv.difficulty,
      moves: lv.moves,
      ppm: scorePpm(lv) != null ? Math.round(scorePpm(lv)) : null,
      objectives: (lv.objectives || []).map((o) => o.type),
    })),
  };
}

const files = readdirSync(levelsDir).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
const worlds = [];
for (const f of files) {
  const pack = JSON.parse(readFileSync(join(levelsDir, f), 'utf8'));
  if (!pack.worldId || !pack.levels) continue;
  worlds.push(analyzePack(pack));
}

worlds.sort((a, b) => a.worldId.localeCompare(b.worldId));

const legendary = worlds.find((w) => w.worldId === 'legendary');
const report = {
  generatedAt: new Date().toISOString(),
  hardCap: HARD_CAP,
  legendaryHardTarget: LEGENDARY_TARGET,
  worlds,
  alerts: worlds
    .filter((w) => !w.hardOk)
    .map((w) => `${w.worldId}: ${w.hardPct}% hard (cap ${(HARD_CAP * 100) | 0}%)`),
  legendary: legendary
    ? {
        hardPct: legendary.hardPct,
        curve: legendary.curve,
        ok: legendary.hardPct / 100 <= LEGENDARY_TARGET,
        peaks: legendary.peaks,
      }
    : null,
  justification: {
    legendary_breath:
      'P2.2: demover picos hard→medium e +moves em score-rush para hard%≤60 e curva com respiro.',
  },
};

console.log('=== Tile Blast — analyze-balance ===\n');
for (const w of worlds) {
  const flag = w.hardOk ? '✓' : '⚠';
  console.log(
    `${flag} ${w.worldId.padEnd(12)} ${String(w.count).padStart(2)} lv · hard ${String(w.hardPct).padStart(4)}% · ${w.curve}`
  );
  if (w.peaks.length) {
    w.peaks.forEach((p) => console.log(`    pico ${p.id}: ${p.ppm} ppm (+${p.jump}%)`));
  }
}
if (report.alerts.length) {
  console.log('\nAlertas hard%:');
  report.alerts.forEach((a) => console.log('  ⚠', a));
}
if (legendary) {
  console.log(
    `\nLegendary: ${legendary.hardPct}% hard · target ≤${(LEGENDARY_TARGET * 100) | 0}% · ${report.legendary.ok ? 'OK' : 'AJUSTAR'}`
  );
}

if (write) {
  const out = join(root, 'data', 'balance-curves.json');
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nEscrito: data/balance-curves.json`);
}

if (report.alerts.length || (report.legendary && !report.legendary.ok)) {
  process.exitCode = write ? 0 : 1;
}
