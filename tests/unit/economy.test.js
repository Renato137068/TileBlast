import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

describe('TBEconomy', () => {
  it('expõe tabelas de economia rebalanceadas', () => {
    createMinimalDom();
    mountModule('tb-config.js');
    mountModule('tb-economy.js');
    expect(TBEconomy.COINS_STAR).toEqual([0, 20, 35, 55]);
    expect(TBEconomy.SHOP_COIN_PRICES.life).toBe(70);
    expect(TBEconomy.AD_REWARDS.coins).toBe(60);
    expect(TBEconomy.LOSS_CONTINUE.coinCost).toBe(90);
    expect(TBEconomy.IAP_META.starter.coins).toBe(650);
    expect(TBEconomy.IAP_META.welcome).toBeDefined();
    expect(TBEconomy.IAP_META.weekly_pack).toBeDefined();
    expect(TBEconomy.IAP_META.return_pack).toBeDefined();
  });

  it('getGlobalCoinMult aplica evento, remote e bônus de fim de semana', () => {
    createMinimalDom();
    mountModule('tb-economy.js');
    const rc = { coinMult: 2 };
    const eventMult = 1.5;
    const wk = TBEconomy.LIVEOPS_CALENDAR.weekendMultiplier;
    const isWeekend = wk.days.indexOf(new Date().getDay()) >= 0;
    const expected = eventMult * rc.coinMult * (isWeekend ? wk.coinMult : 1);
    expect(TBEconomy.getGlobalCoinMult(eventMult, rc)).toBe(expected);
    expect(wk.coinMult).toBe(1.25);
  });

  it('getDailyShopDeal rotaciona por dia', () => {
    createMinimalDom();
    mountModule('tb-economy.js');
    const d1 = TBEconomy.getDailyShopDeal();
    expect(d1).toHaveProperty('cost');
    expect(d1).toHaveProperty('grant');
  });

  it('getVisibleIAPOffers oculta starter já comprado', () => {
    createMinimalDom();
    mountModule('tb-economy.js');
    const all = TBEconomy.getVisibleIAPOffers({ boughtStarter: true }, {});
    expect(all.find((o) => o.id === 'starter')).toBeUndefined();
    expect(all.find((o) => o.id === 'coins500')).toBeDefined();
  });

  it('ADMIN_SCHEMA documenta métricas LiveOps', () => {
    createMinimalDom();
    mountModule('tb-economy.js');
    expect(TBEconomy.ADMIN_SCHEMA.metrics).toContain('ARPDAU');
    expect(TBEconomy.ADMIN_SCHEMA.metrics).toContain('D7');
  });
});
