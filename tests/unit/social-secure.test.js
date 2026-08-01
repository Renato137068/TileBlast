import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../helpers/load-module.js';

const require = createRequire(import.meta.url);
const chLogic = require('../../functions/challenge-logic.js');
const { runCreateChallenge, runClaimChallenge } = require('../../functions/challenge.js');
const { runDeleteSocialData } = require('../../functions/delete-social.js');
const scoreLogic = require('../../functions/score-logic.js');

describe('P3.2 challenge logic', () => {
  it('buildChallenge cria id/nonce e evaluate rejeita replay/expirado/nonce ruim', () => {
    const built = chLogic.buildChallenge({
      levelIdx: 3,
      seed: 'master',
      creatorUid: 'u1',
      nowMs: 1000,
      ttlMs: 5000,
      randomId: () => 'cid1',
      randomNonce: () => 'nonce1',
    });
    expect(built.ok).toBe(true);
    expect(built.challenge.id).toBe('cid1');
    expect(built.challenge.seed).toBe('master');

    const ok = chLogic.evaluateChallengeClaim(built.challenge, 'nonce1', 2000, 'u2');
    expect(ok.ok).toBe(true);
    expect(ok.levelIdx).toBe(3);

    expect(chLogic.evaluateChallengeClaim(built.challenge, 'wrong', 2000).ok).toBe(false);
    expect(
      chLogic.evaluateChallengeClaim({ ...built.challenge, used: true }, 'nonce1', 2000).code
    ).toBe('already-exists');
    expect(chLogic.evaluateChallengeClaim(built.challenge, 'nonce1', 1000 + 6000).code).toBe(
      'deadline-exceeded'
    );
  });

  it('buildShareSafeText não inclui PII', () => {
    const text = chLogic.buildShareSafeText({ level: 5, score: 1200 });
    expect(text).toMatch(/Tile Blast/);
    expect(text).not.toMatch(/uid|email|token/i);
  });
});

describe('P3.2 challenge + deleteSocial callables (mock db)', () => {
  it('create + claim marca used (anti-replay)', async () => {
    const store = {};
    const FieldValue = { serverTimestamp: () => 'TS' };
    const db = {
      collection() {
        return {
          doc(id) {
            return {
              async set(data, opts) {
                store[id] = opts && opts.merge ? Object.assign({}, store[id] || {}, data) : data;
              },
              async get() {
                return {
                  exists: !!store[id],
                  data: () => store[id],
                };
              },
            };
          },
        };
      },
      async runTransaction(fn) {
        const tx = {
          get: async (ref) => ref.get(),
          set: async (ref, data, opts) => ref.set(data, opts),
        };
        return fn(tx);
      },
    };

    const created = await runCreateChallenge({
      uid: 'creator',
      data: { levelIdx: 2, seed: 'normal' },
      db,
      FieldValue,
      nowMs: 10_000,
      randomId: () => 'abc',
      randomNonce: () => 'xyz',
      makeError: (c, m) => Object.assign(new Error(m), { code: c }),
    });
    expect(created.id).toBe('abc');

    const claimed = await runClaimChallenge({
      uid: 'claimer',
      data: { id: 'abc', nonce: 'xyz' },
      db,
      FieldValue,
      nowMs: 11_000,
      makeError: (c, m) => Object.assign(new Error(m), { code: c }),
    });
    expect(claimed.ok).toBe(true);
    expect(claimed.levelIdx).toBe(2);

    await expect(
      runClaimChallenge({
        uid: 'claimer2',
        data: { id: 'abc', nonce: 'xyz' },
        db,
        FieldValue,
        nowMs: 12_000,
        makeError: (c, m) => Object.assign(new Error(m), { code: c }),
      })
    ).rejects.toMatchObject({ code: 'already-exists' });
  });

  it('deleteSocialData limpa saves.playerName e scores conhecidos', async () => {
    const deleted = [];
    const saveSets = [];
    const FieldValue = {
      serverTimestamp: () => 'TS',
      delete: () => 'DELETE_FIELD',
    };
    const db = {
      collection(name) {
        return {
          doc(id) {
            if (name === 'saves') {
              return {
                set: async (data) => {
                  saveSets.push(data);
                },
              };
            }
            if (name === 'users') {
              return {
                collection: () => ({
                  doc: () => ({
                    delete: async () => {
                      deleted.push('rate');
                    },
                  }),
                }),
              };
            }
            // leaderboards
            return {
              collection: () => ({
                doc: (uid) => ({
                  delete: async () => {
                    deleted.push(name + '/' + id + '/' + uid);
                  },
                }),
              }),
            };
          },
        };
      },
    };

    const r = await runDeleteSocialData({
      uid: 'u1',
      db,
      FieldValue,
      nowMs: Date.UTC(2026, 6, 26),
      makeError: (c, m) => Object.assign(new Error(m), { code: c }),
    });
    expect(r.ok).toBe(true);
    expect(saveSets[0].playerName).toBe('DELETE_FIELD');
    expect(deleted.length).toBeGreaterThan(1);
    expect(scoreLogic.knownLeaderboardIds(Date.UTC(2026, 6, 26)).includes('infinite_all')).toBe(
      true
    );
  });
});

describe('P3.2 Firestore rules (contrato)', () => {
  it('nega write em leaderboards e challenges; exige auth p/ read', () => {
    const rules = readFileSync(join(projectRoot, 'firestore.rules'), 'utf8');
    expect(rules).toMatch(/match \/leaderboards\/\{boardId\}\/scores\/\{scoreUid\}/);
    expect(rules).toMatch(/match \/challenges\/\{challengeId\}/);
    expect(rules).toMatch(/allow create, update, delete: if false/);
    expect(rules).toMatch(/allow read: if isSignedIn\(\)/);
    // Documenta matriz de teste (sem emulator): cliente não escreve scores/desafios.
    const matrix = [
      { path: 'leaderboards/*/scores/*', clientWrite: false },
      { path: 'challenges/*', clientWrite: false },
      { path: 'saves/{uid}', ownerWrite: true },
    ];
    expect(matrix.every((r) => r.clientWrite === false || r.ownerWrite === true)).toBe(true);
  });
});
