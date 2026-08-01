import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mountModule, projectRoot } from '../helpers/load-module.js';

describe('anti-cheat: save adulterado nao contamina a nuvem', () => {
  beforeEach(() => {
    mountModule('tb-firebase.js');
    delete globalThis.__saveTampered;
  });
  afterEach(() => {
    delete globalThis.__saveTampered;
  });

  it('pushSave e bloqueado quando o save esta adulterado', async () => {
    globalThis.__saveTampered = true;
    const r = await TBFirebase.pushSave('{"coins":999999}', 'Cheater');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('tampered');
  });

  it('submitScore e submitEventScore retornam false quando adulterado', async () => {
    globalThis.__saveTampered = true;
    expect(await TBFirebase.submitScore('daily', 999999, 'x')).toBe(false);
    expect(await TBFirebase.submitEventScore('event_x_1', 999999, 'x')).toBe(false);
  });

  it('cliente de ranking usa Callable (fase 4) e Rules negam write', () => {
    const fb = readFileSync(join(projectRoot, 'tb-firebase.js'), 'utf8');
    expect(fb).toContain("callFunction('submitScore'");
    expect(fb).toContain("callFunction('submitEventScore'");
    expect(fb).toContain("callFunction('createChallenge'");
    expect(fb).toContain("callFunction('deleteSocialData'");
    expect(fb).not.toMatch(/lbCollection\(mode\)\.doc\(uid\)/);
    const rules = readFileSync(join(projectRoot, 'firestore.rules'), 'utf8');
    expect(rules).toMatch(/leaderboards\/\{boardId\}\/scores/);
    expect(rules).toMatch(/challenges\/\{challengeId\}/);
    expect(rules).toMatch(/allow create, update, delete: if false/);
  });

  it('sem adulteracao, o guard nao bloqueia (cai no fallback offline)', async () => {
    // Sem FIREBASE_CONFIG valido, boot() falha => reason offline (nao "tampered").
    const r = await TBFirebase.pushSave('{"coins":10}', 'Player');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('offline');
  });
});

describe('regressao XSS: nomes de ranking sao escapados', () => {
  const read = (f) => readFileSync(join(projectRoot, f), 'utf8');

  it('tb-global.js escapa nomes de jogadores nas linhas de ranking', () => {
    const src = read('tb-global.js');
    expect(src).toContain('esc(g.name)');
    expect(src).toContain('esc(e.name)');
    expect(src).not.toMatch(/lb-name">\$\{g\.name\}/);
    expect(src).not.toMatch(/lb-name">\$\{e\.name\}/);
  });

  it('tb-features.js escapa nomes no ranking semanal', () => {
    const src = read('tb-features.js');
    expect(src).toContain('esc(e.name)');
    expect(src).not.toMatch(/lb-name">\$\{e\.name\}/);
  });
});
