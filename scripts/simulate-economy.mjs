/**
 * Simulação soft-economy 30/90 dias (P3.1).
 * Uso: node scripts/simulate-economy.mjs [30|90]
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const days = Math.max(1, parseInt(process.argv[2] || '30', 10) || 30);

// Carrega TBEconomy num sandbox (IIFE de browser).
const code = readFileSync(join(root, 'tb-economy.js'), 'utf8');
const sandbox = { window: {}, console };
vm.runInNewContext(code, sandbox);
const Eco = sandbox.window.TBEconomy;

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const r30 = Eco.simulateEconomyDays(30, { rng: seededRng(42) });
const r90 = Eco.simulateEconomyDays(90, { rng: seededRng(42) });
const focus = days >= 90 ? r90 : r30;

console.log('=== Tile Blast — simulate-economy ===\n');
console.log(`Ad daily limit: ${Eco.AD_REWARDS.dailyLimit} · reward ${Eco.AD_REWARDS.coins}🪙`);
console.log(
  `Continue cost: ${Eco.LOSS_CONTINUE.coinCost} · stars earn: ${Eco.COINS_STAR.join('/')}`
);
console.log('\n30d:', summarize(r30));
console.log('90d:', summarize(r90));
console.log(`\nFoco ${focus.days}d → healthy=${focus.healthy} final=${focus.finalCoins}`);

if (!r30.healthy || !r90.healthy) {
  console.error('\n⚠ Economia fora da faixa saudável (insolvência alta ou coins≤0).');
  process.exitCode = 1;
}

function summarize(r) {
  return `net ${r.net} · final ${r.finalCoins} · ads ${r.adsGranted}/${r.adsGranted + r.adsBlocked} · blocked ${r.adsBlocked} · continues ${r.continues} · insolvencyDays ${r.insolvencyDays}`;
}
