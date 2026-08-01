import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';
import { loadContentDataFromDisk } from '../helpers/content-fixture.js';

function bootContent(remote) {
  createMinimalDom();
  mountModule('tb-content.js');
  TBContent.loadFromData(loadContentDataFromDisk());
  if (remote) TBContent.applyRemoteOverrides(remote);
  return TBContent;
}

describe('P2.1 live ops calendar', () => {
  const ANCHOR = 1704067200000; // 2024-01-01 UTC
  const WEEK = 604800000;

  it('calendário tem 8 semanas com daily/weekly/social/return', () => {
    const data = loadContentDataFromDisk();
    expect(data.events.calendar.weeks).toHaveLength(8);
    data.events.calendar.weeks.forEach((w) => {
      expect(w.rotationId).toBeTruthy();
      expect(w.weeklyEventId).toBeTruthy();
      expect(w.challengeId).toBeTruthy();
      expect(w.socialLevel).toBeGreaterThan(0);
      expect(w.returnReward.coins).toBeGreaterThan(0);
    });
  });

  it('slot e desafio diário seguem a semana do calendário', () => {
    const C = bootContent({ liveOpsEnabled: true, liveOpsCalendarEnabled: true });
    const t = ANCHOR + 2 * WEEK + 3 * 86400000;
    const slot = C.getLiveOpsSlot(t);
    expect(slot.enabled).toBe(true);
    expect(slot.weekIndex).toBe(2);
    expect(slot.rotationId).toBe('score');
    expect(slot.challengeId).toBe('ss1');
    const ch = C.getDailyChallengeForDay(Math.floor(t / 86400000));
    expect(ch.id).toBe('ss1');
    expect(C.getActiveRotationEvent(t).id).toBe('score');
    expect(C.getActiveWeeklyEvent(t).id).toBe('score_surge');
    expect(C.getSocialChallengeTarget(t).level).toBe(8);
  });

  it('remote flags desligam calendário e caem no fallback de rotação', () => {
    const C = bootContent({ liveOpsCalendarEnabled: false });
    const t = ANCHOR + WEEK;
    expect(C.getLiveOpsSlot(t).enabled).toBe(false);
    const rot = C.getActiveRotationEvent(t);
    expect(rot.id).toBeTruthy();
    expect(rot.calendar).toBeFalsy();
  });

  it('return reward não duplica na mesma semana', () => {
    const C = bootContent();
    const t = ANCHOR + 5 * WEEK + 1000;
    const save = {};
    const a = C.claimReturnReward(save, t);
    const b = C.claimReturnReward(save, t);
    expect(a.ok).toBe(true);
    expect(a.reward.coins).toBe(130);
    expect(b.ok).toBe(false);
    expect(b.reason).toBe('already_claimed');
  });

  it('simulação de 14 dias: semanas abrem/fecham sem duplicar return', () => {
    const C = bootContent();
    const t0 = ANCHOR + 10 * WEEK;
    const sim = C.simulateLiveOpsDays(t0, 14, { claimReturn: true, save: {} });
    expect(sim.days).toHaveLength(14);

    // Troca de semana entre dia 0 e dia 7
    expect(sim.days[0].weekIndex).not.toBe(sim.days[7].weekIndex);
    expect(sim.days[0].rotationId).toBeTruthy();
    expect(sim.days[0].weeklyEventId).toBeTruthy();
    expect(sim.days[0].challengeId).toBeTruthy();

    const returnsOk = sim.days.filter((d) => d.returnClaim && d.returnClaim.ok);
    // No máx. 1 claim por semana → ≤2 em 14 dias cobrindo 2–3 semanas
    expect(returnsOk.length).toBeGreaterThanOrEqual(1);
    expect(returnsOk.length).toBeLessThanOrEqual(3);

    // Mesmo weekKey não paga duas vezes
    const keys = returnsOk.map((d) => d.returnClaim.weekKey);
    expect(new Set(keys).size).toBe(keys.length);

    // Offline sem remote continua determinístico
    const again = C.simulateLiveOpsDays(t0, 14, { claimReturn: false });
    expect(again.days.map((d) => d.weekIndex)).toEqual(sim.days.map((d) => d.weekIndex));
    expect(again.days.map((d) => d.challengeId)).toEqual(sim.days.map((d) => d.challengeId));
  });

  it('disabledCalendarWeeks pula a semana e permanece estável', () => {
    const C = bootContent({ disabledCalendarWeeks: [0] });
    const t = ANCHOR + 1000; // cairia em w0
    const slot = C.getLiveOpsSlot(t);
    expect(slot.weekIndex).not.toBe(0);
    expect(slot.rotationId).toBeTruthy();
  });
});
