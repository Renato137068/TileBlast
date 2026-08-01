import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

/** cfg que o tb-main injeta no TBPlayBridge.init(). */
function makeCfg() {
  return {
    IAP_META: { starter: { label: 'Pacote Iniciante' }, coins1: { label: 'Moedas' } },
    applied: [],
    toasts: [],
    _t: (_k, f) => f,
    applyIapPurchase(id, token) {
      this.applied.push({ id, token });
    },
    showToast(icon, title, sub) {
      this.toasts.push({ icon, title, sub });
    },
    refreshShopUI: vi.fn(),
    updateMapMeta: vi.fn(),
    checkAchievements: vi.fn(),
  };
}

describe('tb-playbridge', () => {
  /** @type {any} */
  let cfg;
  /** @type {any} */
  let queueIapConfirm;

  beforeEach(() => {
    delete globalThis.TBPlayBridge;
    delete globalThis.AndroidBridge;
    delete globalThis.TBFirebase;
    globalThis._playAdPending = null;
    globalThis._nativeAdTimer = null;
    queueIapConfirm = vi.fn();
    globalThis.TBFirebase = { queueIapConfirm };
    mountModule('tb-playbridge.js');
    cfg = makeCfg();
    globalThis.TBPlayBridge.init(cfg);
  });

  describe('detecção de capacidades', () => {
    it('sem AndroidBridge não há billing nem ads nativos', () => {
      const pb = globalThis.PlayBridge;
      expect(pb.hasBilling()).toBe(false);
      expect(pb.hasNativeAds()).toBe(false);
      expect(pb.purchase('starter')).toBe(false);
      expect(pb.restore()).toBe(false);
    });

    it('com AndroidBridge delega compra e restore ao nativo', () => {
      const purchaseItem = vi.fn();
      const restorePurchases = vi.fn();
      globalThis.AndroidBridge = { purchaseItem, restorePurchases };
      const pb = globalThis.PlayBridge;
      expect(pb.hasBilling()).toBe(true);
      expect(pb.purchase('starter')).toBe(true);
      expect(purchaseItem).toHaveBeenCalledWith('starter');
      expect(pb.restore()).toBe(true);
      expect(restorePurchases).toHaveBeenCalled();
    });

    it('purchaseSubscription cai no fluxo inapp quando o nativo não suporta assinatura', () => {
      const purchaseItem = vi.fn();
      globalThis.AndroidBridge = { purchaseItem };
      expect(globalThis.PlayBridge.purchaseSubscription('no_ads_monthly')).toBe(true);
      expect(purchaseItem).toHaveBeenCalledWith('no_ads_monthly');
    });
  });

  describe('compra concluída', () => {
    it('repassa o purchaseToken para o grant local e para a validação server-side', () => {
      globalThis.onTileBlastPurchaseSuccess('starter', 'tok-abc');
      expect(cfg.applied).toEqual([{ id: 'starter', token: 'tok-abc' }]);
      expect(queueIapConfirm).toHaveBeenCalledWith('starter', 'tok-abc');
      expect(cfg.refreshShopUI).toHaveBeenCalled();
      expect(cfg.toasts.length).toBe(1);
    });

    it('sem token o grant é local e nada é enviado ao servidor', () => {
      globalThis.onTileBlastPurchaseSuccess('starter');
      expect(cfg.applied[0].token).toBeUndefined();
      expect(queueIapConfirm).not.toHaveBeenCalled();
    });

    it('falha do TBFirebase não derruba o fluxo de compra', () => {
      globalThis.TBFirebase = {
        queueIapConfirm: () => {
          throw new Error('offline');
        },
      };
      expect(() => globalThis.onTileBlastPurchaseSuccess('starter', 'tok-x')).not.toThrow();
      expect(cfg.applied.length).toBe(1);
    });

    it('erro de compra vira toast sem aplicar nada', () => {
      globalThis.onTileBlastPurchaseError('cancelled');
      expect(cfg.applied.length).toBe(0);
      expect(cfg.toasts.length).toBe(1);
      expect(cfg.toasts[0].title).toMatch(/cancelada|cancelled/i);
    });

    it('compra pendente não aplica grant', () => {
      globalThis.onTileBlastPurchasePending('starter');
      expect(cfg.applied.length).toBe(0);
      expect(cfg.toasts[0].title).toMatch(/pendente|pending/i);
    });

    it('onTileBlastProductDetails cacheia preços da Play', () => {
      globalThis.onTileBlastProductDetails(
        JSON.stringify([
          {
            id: 'starter',
            title: 'Starter',
            formattedPrice: 'R$ 3,49',
            priceCurrencyCode: 'BRL',
            priceAmountMicros: 3490000,
          },
        ])
      );
      expect(globalThis.PlayBridge.getStorePrice('starter')).toBe('R$ 3,49');
      expect(globalThis.PlayBridge.getStoreProduct('starter').priceCurrencyCode).toBe('BRL');
      expect(cfg.refreshShopUI).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('aceita o formato legado (array de ids)', () => {
      globalThis.onTileBlastRestore(JSON.stringify(['starter']));
      expect(cfg.applied).toEqual([{ id: 'starter', token: undefined }]);
      expect(queueIapConfirm).not.toHaveBeenCalled();
    });

    it('aceita {id, token} e envia cada token para validação', () => {
      globalThis.onTileBlastRestore(
        JSON.stringify([
          { id: 'starter', token: 'tok-1' },
          { id: 'noads', token: 'tok-2' },
        ])
      );
      expect(cfg.applied).toEqual([
        { id: 'starter', token: 'tok-1' },
        { id: 'noads', token: 'tok-2' },
      ]);
      expect(queueIapConfirm).toHaveBeenCalledTimes(2);
      expect(queueIapConfirm).toHaveBeenCalledWith('noads', 'tok-2');
    });

    it('ignora ids desconhecidos e payload inválido', () => {
      globalThis.onTileBlastRestore(JSON.stringify(['produto_fantasma']));
      globalThis.onTileBlastRestore('[]');
      globalThis.onTileBlastRestore('{nao é json');
      expect(cfg.applied.length).toBe(0);
      expect(cfg.toasts.length).toBe(0);
    });
  });

  describe('rewarded ads', () => {
    it('callback de recompensa dispara onReward uma única vez', () => {
      globalThis.AndroidBridge = { showRewardedAd: vi.fn() };
      const onReward = vi.fn();
      const onCancel = vi.fn();
      expect(globalThis.PlayBridge.showRewardedAd(onReward, onCancel)).toBe(true);
      globalThis.onTileBlastAdRewarded();
      globalThis.onTileBlastAdRewarded();
      expect(onReward).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('dismiss sem recompensa chama onCancel', () => {
      globalThis.AndroidBridge = { showRewardedAd: vi.fn() };
      const onCancel = vi.fn();
      globalThis.PlayBridge.showRewardedAd(vi.fn(), onCancel);
      globalThis.onTileBlastAdDismissed();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('falha de carregamento cai no ad simulado', () => {
      globalThis.AndroidBridge = { showRewardedAd: vi.fn() };
      const simulated = vi.fn();
      globalThis.showRewardedAdSimulated = simulated;
      const onReward = vi.fn();
      globalThis.PlayBridge.showRewardedAd(onReward, vi.fn());
      globalThis.onTileBlastAdFailed();
      expect(simulated).toHaveBeenCalledTimes(1);
      delete globalThis.showRewardedAdSimulated;
    });
  });

  describe('interstitial', () => {
    it('não exibe quando o jogador tem no-ads', () => {
      globalThis.hasNoAds = () => true;
      const done = vi.fn();
      expect(globalThis.PlayBridge.showInterstitial(done)).toBe(false);
      expect(done).toHaveBeenCalled();
      delete globalThis.hasNoAds;
    });

    it('dismiss do interstitial resolve o callback uma vez', () => {
      globalThis.hasNoAds = () => false;
      globalThis.AndroidBridge = { showInterstitialAd: vi.fn() };
      const done = vi.fn();
      expect(globalThis.PlayBridge.showInterstitial(done)).toBe(true);
      globalThis.onTileBlastInterstitialDismissed();
      globalThis.onTileBlastInterstitialDismissed();
      expect(done).toHaveBeenCalledTimes(1);
      delete globalThis.hasNoAds;
    });
  });
});
