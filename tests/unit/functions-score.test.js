import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const logic = require('../../functions/score-logic.js');
const { runSubmitScore, runSubmitEventScore } = require('../../functions/submit-score.js');

describe('functions/score-logic', () => {
  it('boardIdForMode alinha com o esquema legado', () => {
    const day = Math.floor(Date.UTC(2026, 6, 25) / 86400000);
    const now = day * 86400000 + 3600000;
    expect(logic.boardIdForMode('infinite', now)).toBe('infinite_all');
    expect(logic.boardIdForMode('daily', now)).toBe('daily_' + day);
  });

  it('sanitizePlayerName corta e remove tags', () => {
    expect(logic.sanitizePlayerName('  Ab<cd>  ')).toBe('Abcd');
    expect(logic.sanitizePlayerName('x'.repeat(40)).length).toBe(16);
    expect(logic.sanitizePlayerName('')).toBe('Jogador');
  });

  it('sanitizePlayerName bloqueia nomes moderados', () => {
    expect(logic.sanitizePlayerName('AdminBoss')).toBe('Jogador');
    expect(logic.sanitizePlayerName('fuckyou')).toBe('Jogador');
  });

  it('evaluateScoreRateLimit limita spam', () => {
    const now = 1000;
    let meta = { windowStart: now, count: logic.SCORE_RATE_LIMIT.max };
    const blocked = logic.evaluateScoreRateLimit(meta, now + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe('resource-exhausted');
    const reset = logic.evaluateScoreRateLimit(meta, now + logic.SCORE_RATE_LIMIT.windowMs + 1);
    expect(reset.ok).toBe(true);
    expect(reset.next.count).toBe(1);
  });

  it('validateSubmitScoreArgs rejeita mode/score ruins', () => {
    expect(logic.validateSubmitScoreArgs({ mode: 'hack', score: 10 }).ok).toBe(false);
    expect(logic.validateSubmitScoreArgs({ mode: 'daily', score: 0 }).ok).toBe(false);
    expect(logic.validateSubmitScoreArgs({ mode: 'daily', score: 9999999 }).ok).toBe(false);
    const ok = logic.validateSubmitScoreArgs({ mode: 'daily', score: 1200, name: 'Renato' });
    expect(ok.ok).toBe(true);
    expect(ok.score).toBe(1200);
    expect(ok.name).toBe('Renato');
    expect(ok.boardId).toMatch(/^daily_/);
  });

  it('validateSubmitEventScoreArgs exige board id seguro', () => {
    expect(logic.validateSubmitEventScoreArgs({ eventLeaderboardId: '../x', score: 1 }).ok).toBe(
      false
    );
    expect(
      logic.validateSubmitEventScoreArgs({ eventLeaderboardId: 'event_summer_1', score: 500 }).ok
    ).toBe(true);
  });

  it('evaluateScoreWrite só sobe best score', () => {
    expect(logic.evaluateScoreWrite(100, 50)).toEqual({
      write: false,
      score: 100,
      improved: false,
    });
    expect(logic.evaluateScoreWrite(100, 100)).toEqual({
      write: false,
      score: 100,
      improved: false,
    });
    expect(logic.evaluateScoreWrite(100, 150)).toEqual({ write: true, score: 150, improved: true });
  });
});

describe('functions/submit-score — db mock', () => {
  function mockDb(prevScore, rateMeta) {
    const set = vi.fn(async () => {});
    const scoreDoc = {
      get: vi.fn(async () => ({
        exists: prevScore != null,
        data: () => (prevScore != null ? { score: prevScore } : {}),
      })),
      set,
      delete: vi.fn(async () => {}),
    };
    const rateDoc = {
      get: vi.fn(async () => ({
        exists: !!rateMeta,
        data: () => rateMeta || {},
      })),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    };
    return {
      db: {
        collection(name) {
          if (name === 'users') {
            return {
              doc: () => ({
                collection: () => ({
                  doc: () => rateDoc,
                }),
              }),
            };
          }
          return {
            doc: () => ({
              collection: () => ({
                doc: () => scoreDoc,
              }),
            }),
          };
        },
      },
      set,
      rateDoc,
      FieldValue: { serverTimestamp: () => 'TS' },
    };
  }

  it('runSubmitScore grava quando melhora', async () => {
    const { db, set, FieldValue } = mockDb(10);
    const r = await runSubmitScore({
      uid: 'u1',
      data: { mode: 'infinite', score: 99, name: 'A' },
      db,
      FieldValue,
      makeError: (c, m) => Object.assign(new Error(m), { code: c }),
    });
    expect(r.written).toBe(true);
    expect(r.score).toBe(99);
    expect(set).toHaveBeenCalled();
  });

  it('runSubmitScore não grava se score menor/igual', async () => {
    const { db, set, FieldValue } = mockDb(500);
    const r = await runSubmitScore({
      uid: 'u1',
      data: { mode: 'daily', score: 100, name: 'A' },
      db,
      FieldValue,
      makeError: (c, m) => Object.assign(new Error(m), { code: c }),
    });
    expect(r.written).toBe(false);
    expect(r.score).toBe(500);
    expect(set).not.toHaveBeenCalled();
  });

  it('runSubmitScore respeita rate limit', async () => {
    const now = 1_700_000_000_000;
    const { db, FieldValue } = mockDb(null, {
      windowStart: now,
      count: logic.SCORE_RATE_LIMIT.max,
    });
    await expect(
      runSubmitScore({
        uid: 'u1',
        data: { mode: 'daily', score: 10, name: 'A' },
        db,
        FieldValue,
        nowMs: now + 1000,
        makeError: (c, m) => Object.assign(new Error(m), { code: c }),
      })
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('runSubmitEventScore rejeita board inválido', async () => {
    const { db, FieldValue } = mockDb(null);
    await expect(
      runSubmitEventScore({
        uid: 'u1',
        data: { eventLeaderboardId: 'bad id!', score: 10 },
        db,
        FieldValue,
        makeError: (c, m) => Object.assign(new Error(m), { code: c }),
      })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
