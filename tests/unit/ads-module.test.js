import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const TODAY = '2026-07-25';

function mountAds() {
  globalThis.TBEconomy = { AD_REWARDS: { dailyLimit: 3 } };
  globalThis.TBAnalytics = { log: vi.fn() };
  globalThis.TBRoadmap = { statBump: vi.fn() };
  mountModule('tb-ads.js');
  return globalThis.TBAds;
}

describe('tb-ads', () => {
  /** @type {any} */
  let A;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;

  beforeEach(() => {
    // Fake timers antes do mount: o sandbox captura setTimeout/setInterval
    // no momento em que o script é carregado.
    vi.useFakeTimers();
    delete globalThis.TBAds;
    delete globalThis.TBEconomy;
    delete globalThis.TBAnalytics;
    document.body.innerHTML = `
      <div id="ad-overlay">
        <div id="ad-skip-wrap"><span id="ad-timer"></span></div>
      </div>
    `;
    save = { consentAds: true, consentAnalytics: true };
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      _t: (_k, f) => f,
      _localToday: () => TODAY,
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      PlayBridge: { showRewardedAd: vi.fn(() => false) },
    };
    A = mountAds();
    A.init(cfg);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getAdState começa zerado e canWatchAd libera', () => {
    expect(A.getAdState()).toEqual({ date: TODAY, count: 0 });
    expect(A.hasNoAds()).toBe(false);
    expect(A.canWatchAd()).toBe(true);
    expect(A.getAdDailyLimit()).toBe(3);
  });

  it('recordAdWatch acumula até o limite diário', () => {
    A.recordAdWatch();
    expect(A.getAdState().count).toBe(1);
    A.recordAdWatch();
    A.recordAdWatch();
    expect(save.adsToday.count).toBe(3);
    expect(A.canWatchAd()).toBe(false);
  });

  it('estado do dia anterior é descartado', () => {
    save.adsToday = { date: '2026-07-24', count: 9 };
    expect(A.getAdState().count).toBe(0);
    expect(A.canWatchAd()).toBe(true);
  });

  it('noAds bloqueia anúncios e remoteCfg sobrescreve o limite', () => {
    save.remoteCfg = { adDailyLimit: 10 };
    expect(A.getAdDailyLimit()).toBe(10);

    save.noAds = true;
    expect(A.hasNoAds()).toBe(true);
    expect(A.canWatchAd()).toBe(false);
  });

  it('showRewardedAd avisa e cancela quando o limite foi atingido', () => {
    save.adsToday = { date: TODAY, count: 3 };
    const onReward = vi.fn();
    const onCancel = vi.fn();
    A.showRewardedAd(onReward, onCancel);

    expect(cfg.showToast).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
    expect(document.getElementById('ad-overlay').classList.contains('show')).toBe(false);
  });

  it('showRewardedAd delega ao PlayBridge quando ele assume', () => {
    cfg.PlayBridge.showRewardedAd.mockReturnValue(true);
    A.showRewardedAd(vi.fn(), vi.fn());
    expect(cfg.PlayBridge.showRewardedAd).toHaveBeenCalled();
    expect(document.getElementById('ad-overlay').classList.contains('show')).toBe(false);
  });

  it('showRewardedAdSimulated recompensa após a contagem regressiva', () => {
    const onReward = vi.fn();
    A.showRewardedAd(onReward, vi.fn());
    const overlay = document.getElementById('ad-overlay');
    expect(overlay.classList.contains('show')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');

    vi.advanceTimersByTime(1000);
    expect(document.getElementById('ad-skip-wrap').style.display).toBe('flex');
    expect(document.getElementById('ad-timer').textContent).toBe('5');

    vi.advanceTimersByTime(5000);
    expect(onReward).toHaveBeenCalled();
    expect(A.getAdState().count).toBe(1);
    expect(globalThis.TBAnalytics.log).toHaveBeenCalledWith('ad_offer', { type: 'rewarded' });
    expect(globalThis.TBAnalytics.log).toHaveBeenCalledWith('ad_reward_granted', {
      type: 'rewarded_sim',
    });
    expect(globalThis.TBRoadmap.statBump).toHaveBeenCalledWith('adsWatched');
    expect(overlay.classList.contains('show')).toBe(false);
  });

  it('sem consentimento recusa rewarded e não abre overlay', () => {
    save.consentAds = false;
    const onReward = vi.fn();
    const onCancel = vi.fn();
    A.showRewardedAd(onReward, onCancel);
    expect(cfg.showToast).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
    expect(document.getElementById('ad-overlay').classList.contains('show')).toBe(false);
    expect(cfg.PlayBridge.showRewardedAd).not.toHaveBeenCalled();
  });

  it('web sem decisão abre modal GDPR/LGPD e aceitar segue o anúncio', () => {
    delete save.consentAds;
    delete save.consentAnalytics;
    cfg.showGlobalModal = vi.fn((html) => {
      document.body.insertAdjacentHTML('beforeend', `<div id="gm">${html}</div>`);
    });
    const onReward = vi.fn();
    const onCancel = vi.fn();
    A.showRewardedAd(onReward, onCancel);
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    expect(document.getElementById('ad-overlay').classList.contains('show')).toBe(false);
    document.getElementById('tb-consent-accept').click();
    expect(save.consentAds).toBe(true);
    expect(document.getElementById('ad-overlay').classList.contains('show')).toBe(true);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancelRewardedAd fecha o overlay sem recompensa', () => {
    const onReward = vi.fn();
    const onCancel = vi.fn();
    A.showRewardedAdSimulated(onReward, onCancel);
    vi.advanceTimersByTime(1000);

    A.cancelRewardedAd();
    expect(onCancel).toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
    expect(document.getElementById('ad-overlay').classList.contains('show')).toBe(false);

    vi.advanceTimersByTime(10000);
    expect(onReward).not.toHaveBeenCalled();
  });
});
