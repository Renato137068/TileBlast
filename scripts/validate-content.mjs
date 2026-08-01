/**
 * Valida integridade e escalabilidade do catálogo de conteúdo.
 * Uso: node scripts/validate-content.mjs [--strict]
 *
 * Checa: manifest ↔ packs ↔ worlds.levelCount, ids únicos, orders,
 * objetivos, cadeia de unlock e picos de dificuldade (>45% vs média móvel).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const writeReport = process.argv.includes('--report');

function readJson(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) throw new Error(`Arquivo ausente: ${rel}`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

const OBJ_TYPES = new Set(['score', 'color', 'ice', 'crate', 'chain', 'cover', 'collect', 'token']);
const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

const worldsDoc = readJson('data/worlds.json');
const manifest = readJson('data/levels/manifest.json');
const worlds = worldsDoc.worlds || [];
const packs = [];

for (const p of manifest.packs) {
  const pack = readJson(`data/levels/${p.file}`);
  packs.push({ meta: p, pack });
}

// ── Manifest ↔ pack counts ──────────────────────────────────────────────────
let total = 0;
const seenIds = new Set();
for (const { meta, pack } of packs) {
  const n = (pack.levels || []).length;
  total += n;
  if (meta.count !== n) {
    err(`manifest ${meta.worldId}: count=${meta.count} mas pack tem ${n} fases`);
  }
  if (pack.worldId && pack.worldId !== meta.worldId) {
    err(`pack ${meta.file}: worldId=${pack.worldId} ≠ manifest ${meta.worldId}`);
  }
  const world = worlds.find((w) => w.id === meta.worldId);
  if (!world) err(`mundo ${meta.worldId} no manifest sem entrada em worlds.json`);
  else if (world.levelCount !== n) {
    err(`worlds.json ${meta.worldId}: levelCount=${world.levelCount} mas pack tem ${n}`);
  }
  if (world && !world.musicKey) warn(`world ${meta.worldId}: sem musicKey`);
  if (world && !world.cssClass) warn(`world ${meta.worldId}: sem cssClass`);

  const orders = new Set();
  for (const lv of pack.levels || []) {
    if (!lv.id) err(`fase sem id em ${meta.worldId}`);
    else if (seenIds.has(lv.id)) err(`id duplicado: ${lv.id}`);
    else seenIds.add(lv.id);
    if (lv.worldId && lv.worldId !== meta.worldId) {
      err(`${lv.id}: worldId=${lv.worldId} ≠ pack ${meta.worldId}`);
    }
    if (orders.has(lv.order)) err(`${meta.worldId}: order duplicado ${lv.order}`);
    orders.add(lv.order);
    if (!lv.moves || lv.moves < 5 || lv.moves > 60) {
      warn(`${lv.id}: moves suspeito (${lv.moves})`);
    }
    if (!Array.isArray(lv.objectives) || !lv.objectives.length) {
      err(`${lv.id}: sem objectives`);
    } else {
      for (const o of lv.objectives) {
        if (!OBJ_TYPES.has(o.type)) err(`${lv.id}: objective.type inválido "${o.type}"`);
        if (!(o.target > 0)) err(`${lv.id}: objective.target inválido`);
        if (o.type === 'color' && (o.color == null || o.color < 0)) {
          err(`${lv.id}: color objective sem color`);
        }
      }
    }
    if (!['easy', 'medium', 'hard'].includes(lv.difficulty)) {
      warn(`${lv.id}: difficulty="${lv.difficulty}"`);
    }
  }
}

// ── Unlock chain ────────────────────────────────────────────────────────────
let expectedUnlock = 0;
for (const w of worlds) {
  if (w.unlockAtLevel !== expectedUnlock) {
    warn(
      `unlock chain: ${w.id} unlockAtLevel=${w.unlockAtLevel}, esperado ${expectedUnlock} (soma anterior)`
    );
  }
  expectedUnlock += w.levelCount || 0;
}
if (expectedUnlock !== total) {
  err(`soma levelCount worlds (${expectedUnlock}) ≠ total fases (${total})`);
}

// ── Picos de dificuldade (score pts/mov) ────────────────────────────────────
const flat = [];
for (const { pack } of packs) {
  for (const lv of pack.levels || []) {
    const scoreObj = (lv.objectives || []).find((o) => o.type === 'score');
    flat.push({
      id: lv.id,
      worldId: lv.worldId || pack.worldId,
      moves: lv.moves,
      ppm: scoreObj ? scoreObj.target / lv.moves : null,
      difficulty: lv.difficulty,
    });
  }
}
const peaks = [];
for (let i = 3; i < flat.length; i++) {
  const cur = flat[i];
  if (cur.ppm == null) continue;
  const prev = flat.slice(i - 3, i).filter((x) => x.ppm != null);
  if (prev.length < 2) continue;
  const avg = prev.reduce((s, x) => s + x.ppm, 0) / prev.length;
  if (avg > 0 && cur.ppm > avg * 1.45) {
    const jump = Math.round(((cur.ppm - avg) / avg) * 100);
    peaks.push({ id: cur.id, ppm: Math.round(cur.ppm), avg: Math.round(avg), jump });
    warn(`pico dificuldade ${cur.id}: ${Math.round(cur.ppm)} pts/mov (+${jump}% vs média)`);
  }
}

// ── Distribuição hard por mundo ─────────────────────────────────────────────
const HARD_WARN = 0.65;
const LEGENDARY_HARD_TARGET = 0.6;
for (const { meta, pack } of packs) {
  const levels = pack.levels || [];
  const hard = levels.filter((l) => l.difficulty === 'hard').length;
  const ratio = hard / Math.max(1, levels.length);
  const cap = meta.worldId === 'legendary' ? LEGENDARY_HARD_TARGET : HARD_WARN;
  if (levels.length >= 10 && ratio > cap) {
    warn(
      `${meta.worldId}: ${(ratio * 100) | 0}% hard (alvo ≤${(cap * 100) | 0}%) — considere fases "respiro" medium`
    );
  }
}

const report = {
  totalLevels: total,
  worlds: worlds.length,
  packs: packs.length,
  peaks,
  errors,
  warnings,
};

console.log('=== Tile Blast — validate-content ===\n');
console.log(`Fases: ${total} · Mundos: ${worlds.length} · Packs: ${packs.length}`);
if (peaks.length) console.log(`Picos detectados: ${peaks.length}`);
if (warnings.length) {
  console.log('\nAvisos:');
  warnings.forEach((w) => console.log('  ⚠', w));
}
if (errors.length) {
  console.log('\nErros:');
  errors.forEach((e) => console.log('  ✗', e));
}

if (writeReport) {
  const out = join(root, 'data', 'content-report.json');
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nRelatório: data/content-report.json`);
}

if (errors.length || (strict && warnings.length)) {
  process.exit(1);
}
console.log('\n✓ Conteúdo OK');
