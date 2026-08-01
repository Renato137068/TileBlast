import { describe, expect, it } from 'vitest';
import { projectRoot } from '../helpers/load-module.js';
import { checkWwwParity, runReleaseGate } from '../../scripts/release-gate.mjs';

describe('release-gate (P0.1)', () => {
  it('modo DEV passa com placeholders (avisos, sem blockers de AdMob)', () => {
    const r = runReleaseGate({ mode: 'dev', projectRoot });
    expect(r.mode).toBe('dev');
    expect(r.version).toBeTruthy();
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /AdMob|Firebase|IDS/i.test(w))).toBe(true);
    expect(r.checklist.find((c) => c.id === 'versions')?.ok).toBe(true);
  });

  it('modo RELEASE falha enquanto houver placeholders', () => {
    const r = runReleaseGate({ mode: 'release', projectRoot });
    expect(r.mode).toBe('release');
    expect(r.ok).toBe(false);
    expect(r.blockers.length).toBeGreaterThan(0);
    expect(r.blockers.some((b) => /AdMob|Firebase|IDS|keystore/i.test(b))).toBe(true);
  });

  it('checkWwwParity reporta estrutura esperada', () => {
    const p = checkWwwParity(projectRoot);
    expect(p.checked).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(p.mismatched)).toBe(true);
    expect(Array.isArray(p.blockers)).toBe(true);
  });

  it('relatório inclui serviços e checklist versionados', () => {
    const r = runReleaseGate({ mode: 'dev', projectRoot });
    expect(r.services).toHaveProperty('firebase');
    expect(r.services).toHaveProperty('admobProduction');
    expect(r.services).toHaveProperty('push');
    expect(r.checklist.map((c) => c.id)).toEqual(
      expect.arrayContaining(['versions', 'www_parity', 'firebase', 'admob_ids_file', 'keystore'])
    );
  });
});
