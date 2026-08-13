import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('TBAnalytics schema + funil', () => {
  beforeEach(() => {
    delete globalThis.TBAnalytics;
    delete globalThis.AndroidBridge;
    delete globalThis.PlayBridge;
    localStorage.clear();
    globalThis.APP_VERSION = '1.4.8';
    mountModule('tb-analytics.js');
  });

  it('log envelopa schema, ts, v, locale, platform e session_id', () => {
    TBAnalytics.markOpen();
    TBAnalytics.log('level_start', { level: 1 });
    const ev = TBAnalytics.exportEvents().at(-1);
    expect(ev.schema).toBe(1);
    expect(ev.name).toBe('level_start');
    expect(ev.level).toBe(1);
    expect(typeof ev.ts).toBe('number');
    expect(ev.v).toBe('1.4.8');
    expect(ev.locale).toBeTruthy();
    expect(ev.platform).toBe('web');
    expect(ev.session_id).toMatch(/^s_/);
  });

  it('aliases remapeiam eventos legados para o funil canônico', () => {
    TBAnalytics.markOpen();
    TBAnalytics.log('ad_watched', { type: 'rewarded' });
    TBAnalytics.log('iap_purchase', { item: 'starter' });
    TBAnalytics.log('daily_puzzle_start', { seed: 1 });
    const names = TBAnalytics.exportEvents().map((e) => e.name);
    expect(names).toEqual(['ad_reward_granted', 'iap_success', 'daily_open']);
    expect(TBAnalytics.exportEvents()[0].legacy).toBe('ad_watched');
  });

  it('first_move só dispara uma vez e inclui ttfm_ms', () => {
    TBAnalytics.markOpen();
    TBAnalytics.logFirstMove({ level: 1 });
    TBAnalytics.logFirstMove({ level: 1 });
    const moves = TBAnalytics.exportEvents().filter((e) => e.name === 'first_move');
    expect(moves).toHaveLength(1);
    expect(moves[0].ttfm_ms).toBeGreaterThanOrEqual(0);
  });

  it('funnelReport calcula conversão e retenção D1/D7/D30', () => {
    const dayMs = 86400000;
    const first = Date.now() - 10 * dayMs;
    localStorage.setItem(
      'tb_analytics_meta',
      JSON.stringify({
        firstOpenAt: first,
        openDays: [
          Math.floor(first / dayMs),
          Math.floor(first / dayMs) + 1,
          Math.floor(first / dayMs) + 7,
        ],
        lastOpenAt: Date.now(),
      })
    );

    TBAnalytics.markOpen();
    TBAnalytics.log('app_open', {});
    TBAnalytics.log('onboarding_start', {});
    TBAnalytics.log('onboarding_complete', {});
    TBAnalytics.log('first_move', { ttfm_ms: 12000 });
    TBAnalytics.log('level_start', { level: 1 });
    TBAnalytics.log('level_win', { level: 1, first_win: true });
    TBAnalytics.log('level_start', { level: 2 });
    TBAnalytics.log('level_loss', { level: 2 });

    const report = TBAnalytics.funnelReport();
    expect(report.schema).toBe(1);
    expect(report.retention.d1.eligible).toBe(true);
    expect(report.retention.d1.retained).toBe(true);
    expect(report.retention.d7.eligible).toBe(true);
    expect(report.retention.d7.retained).toBe(true);
    expect(report.retention.d30.eligible).toBe(false);
    expect(report.conversion.onboarding).toBe(1);
    expect(report.conversion.level_win).toBe(0.5);
    expect(report.counts.level_loss).toBe(1);
    expect(report.events_buffered).toBeGreaterThan(0);
  });

  it('exportEvents / clearBuffer persistem no localStorage', () => {
    TBAnalytics.markOpen();
    TBAnalytics.log('app_open', {});
    expect(TBAnalytics.exportEvents().length).toBe(1);
    expect(localStorage.getItem('tb_analytics_buf')).toBeTruthy();
    TBAnalytics.clearBuffer();
    expect(TBAnalytics.exportEvents()).toEqual([]);
  });

  it('AndroidBridge não recebe evento sem consentimento UMP/GDPR', () => {
    const logEvent = vi.fn();
    globalThis.AndroidBridge = { logEvent };
    TBAnalytics.markOpen();
    TBAnalytics.log('ad_watched', { type: 'x' });
    expect(TBAnalytics.exportEvents().some((e) => e.name === 'ad_reward_granted')).toBe(true);
    expect(logEvent).not.toHaveBeenCalled();
    expect(TBAnalytics.canSendRemote()).toBe(false);
    delete globalThis.AndroidBridge;
  });

  it('AndroidBridge recebe envelope JSON do evento canônico com consentimento', () => {
    const logEvent = vi.fn();
    globalThis.AndroidBridge = { logEvent, canShowAdsBridge: () => true };
    TBAnalytics.markOpen();
    TBAnalytics.log('ad_watched', { type: 'x' });
    expect(logEvent).toHaveBeenCalled();
    expect(logEvent.mock.calls[0][0]).toBe('ad_reward_granted');
    const payload = JSON.parse(logEvent.mock.calls[0][1]);
    expect(payload.schema).toBe(1);
    expect(payload.name).toBe('ad_reward_granted');
    delete globalThis.AndroidBridge;
  });

  it('markBootReady registra boot_ready com startup_ms', () => {
    TBAnalytics.markOpen();
    TBAnalytics.markBootReady({ deferred: ['tb-push.js'] });
    const ev = TBAnalytics.exportEvents().find((e) => e.name === 'boot_ready');
    expect(ev).toBeTruthy();
    expect(typeof ev.startup_ms).toBe('number');
    expect(ev.deferred).toEqual(['tb-push.js']);
    expect(TBAnalytics.bootReadyMs()).toBeGreaterThanOrEqual(0);
  });
});
