// @ts-check
/**
 * Tile Blast — battle pass, piggy, flash/dynamic offers, interstitial.
 * Carregar antes de tb-roadmap.js. TBRoadmap delega a API pública.
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;

  function t(key, fallback) {
    if (global.TBI18n && global.TBI18n.t) return global.TBI18n.t(key);
    if (global.TBRoadmap && global.TBRoadmap.t) return global.TBRoadmap.t(key);
    return fallback != null ? fallback : key;
  }

  function _economy() {
    return global.TBEconomy || null;
  }

  function remoteConfig() {
    const s = C ? C.ld() : {};
    const def = {
      adDailyLimit: 5,
      interstitialEvery: 5,
      coinMult: 1,
      starterPrice: 2.99,
      adRewardCoins: 50,
    };
    return Object.assign(def, s.remoteCfg || {});
  }

  function checkExtendedAchievements(ctx) {
    if (global.TBAchievements && global.TBAchievements.checkExtendedAchievements)
      global.TBAchievements.checkExtendedAchievements(ctx);
  }

  function prepareReturnPlayerOffer() {
    if (!_economy()) return;
    const s = C.ld();
    const today = Math.floor(Date.now() / 86400000);
    const last = s.lastLoginDay || 0;
    if (last > 0 && today - last >= (_economy().IAP_META.return_pack.inactiveDays || 3)) {
      s._forceReturnOffer = true;
      C.sv(s);
    }
    if (!s.firstPlayAt) {
      s.firstPlayAt = Date.now();
      C.sv(s);
    }
  }

  const BP_TIERS = (_economy() && _economy().BATTLE_PASS.tiers) || 30;
  const BP_XP_PER_TIER = (_economy() && _economy().BATTLE_PASS.xpPerTier) || 120;

  function getBattlePass() {
    const s = C.ld();
    const season = Math.floor(Date.now() / (30 * 86400000));
    if (!s.bp || s.bp.season !== season) {
      s.bp = { season, xp: 0, tier: 0, premium: !!s.bpPremiumOwned, claimed: {} };
      C.sv(s);
    }
    if (s.bpPremiumOwned) s.bp.premium = true;
    return s.bp;
  }

  function grantBpTierRewards(tier) {
    const bp = getBattlePass();
    const cfg = (_economy() && _economy().BATTLE_PASS) || {
      freeCoinsNormal: 35,
      freeCoinsEvery5: 90,
      premium: {},
    };
    const freeCoins = tier % 5 === 0 ? cfg.freeCoinsEvery5 : cfg.freeCoinsNormal;
    C.addCoins(freeCoins);
    let bonus = `+${freeCoins} 💰`;
    if (bp.premium) {
      const p = cfg.premium;
      if (tier % 10 === 0 && p.every10) {
        C.addPU('rainbow', p.every10.rainbow || 1);
        C.addCoins(p.every10.coins || 70);
        bonus += ' · 🌈 +' + (p.every10.coins || 70) + '💰';
      } else if (tier % 5 === 0 && p.every5) {
        C.addPU('bomb', p.every5.bomb || 2);
        bonus += ' · 💣×' + (p.every5.bomb || 2);
      } else if (tier % 3 === 0 && p.every3) {
        C.addPU('shuffle', p.every3.shuffle || 1);
        bonus += ' · 🔀';
      } else {
        C.addCoins(p.defaultCoins || 40);
        bonus += ' · +' + (p.defaultCoins || 40) + '💰 ⭐';
      }
    }
    C.showToast('🎫', `${t('battlepass')} ${tier}!`, bonus);
  }

  function addBattlePassXP(amount) {
    const s = C.ld();
    const bp = getBattlePass();
    bp.xp += amount;
    while (bp.tier < BP_TIERS && bp.xp >= BP_XP_PER_TIER) {
      bp.xp -= BP_XP_PER_TIER;
      bp.tier++;
      grantBpTierRewards(bp.tier);
    }
    s.bp = bp;
    C.sv(s);
    renderBattlePassBanner();
    checkExtendedAchievements();
  }

  function renderBattlePassBanner() {
    const el = document.getElementById('bp-banner');
    if (!el) return;
    const bp = getBattlePass();
    const pct = Math.round((bp.xp / BP_XP_PER_TIER) * 100);
    const crown = bp.premium ? ' 👑' : '';
    el.innerHTML = `<span>🎫 ${t('battlepass')}${crown} ${bp.tier}/${BP_TIERS}</span><span class="bp-pct">${pct}%</span>`;
    el.style.display = 'flex';
  }

  function openBattlePassModal() {
    const bp = getBattlePass();
    const pct = Math.round((bp.xp / BP_XP_PER_TIER) * 100);
    const cfg = remoteConfig();
    const price = cfg.bppremiumPrice
      ? `R$ ${cfg.bppremiumPrice.toFixed(2).replace('.', ',')}`
      : 'R$ 6,99';
    const tiers = [3, 5, 10, 15, 20, 30];
    const rows = tiers
      .map((n) => {
        const free = n % 5 === 0 ? '80💰' : '30💰';
        const prem = n % 10 === 0 ? '🌈+60💰' : n % 5 === 0 ? '💣×2' : n % 3 === 0 ? '🔀' : '+35💰';
        const done = bp.tier >= n ? '✅' : '○';
        return `<div class="bp-tier-row"><span>${done} Nv.${n}</span><span>${free}</span><span class="${bp.premium ? '' : 'bp-locked'}">${prem}</span></div>`;
      })
      .join('');
    const premiumBtn = bp.premium
      ? `<div style="font-size:12px;color:var(--accent);font-weight:700;margin:8px 0">👑 ${t('bp_premium')} ${t('collect')}</div>`
      : `<button class="btn btn-p btn-full" style="margin:8px 0;background:linear-gradient(135deg,#f6b23e,#e89a1e)" data-action="buyBpPremium">👑 ${t('bp_unlock')} · ${price}</button>`;
    C.showGlobalModal(`
      <div style="font-size:18px;font-weight:800;">🎫 ${t('battlepass')}</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">${t('bp_premium_desc')}</div>
      <div class="dch-prog-wrap" style="margin:6px 0"><div class="dch-prog-bar" style="width:${pct}%"></div></div>
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${bp.tier} / ${BP_TIERS}</div>
      <div class="bp-track-head"><span>Nível</span><span>${t('bp_free')}</span><span>⭐</span></div>
      <div class="bp-track-list">${rows}</div>
      ${premiumBtn}
      <button class="btn btn-g btn-full" data-action="closeGlobalModal">${t('close')}</button>
    `);
  }

  function buyBpPremium() {
    C.closeGlobalModal();
    if (C.shopBuyIAP) C.shopBuyIAP('bppremium');
  }

  function activateBpPremium() {
    const s = C.ld();
    s.bpPremiumOwned = true;
    const bp = getBattlePass();
    bp.premium = true;
    s.bp = bp;
    C.sv(s);
    renderBattlePassBanner();
    C.showToast('👑', t('bp_premium'), t('collect'));
  }

  function addPiggyCoins(amount) {
    const s = C.ld();
    const cap = remoteConfig().piggyCap || 500;
    s.piggy = Math.min(cap, (s.piggy || 0) + Math.round(amount * 0.05));
    C.sv(s);
    renderPiggyBanner();
    if (s.piggy >= cap) checkExtendedAchievements();
  }

  function renderPiggyBanner() {
    const el = document.getElementById('piggy-banner');
    if (!el) return;
    const v = C.ld().piggy || 0;
    if (v < 20) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    el.innerHTML = `<span>🐷 ${t('piggy')}</span><span class="bp-pct">${v}/500 💰</span>`;
  }

  function openPiggyModal() {
    const v = C.ld().piggy || 0;
    const cost = Math.max(50, Math.round(v * 0.6));
    C.showGlobalModal(`
      <div style="font-size:40px">🐷</div>
      <div style="font-size:17px;font-weight:800;">Cofrinho</div>
      <div style="font-size:28px;font-weight:800;color:var(--accent);margin:8px 0">${v} 💰</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">5% das moedas ganhas vão para o cofrinho. Quebre por ${cost} moedas e receba tudo!</div>
      <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="breakPiggy">Quebrar (${cost} 💰)</button>
      <button class="btn btn-g btn-full" data-action="closeGlobalModal">Depois</button>
    `);
  }

  function breakPiggy() {
    const s = C.ld();
    const v = s.piggy || 0;
    if (v < 20) return;
    const cost = Math.max(50, Math.round(v * 0.6));
    if (C.getCoins() < cost) {
      C.showToast('💰', 'Moedas insuficientes', `Precisa de ${cost} moedas`);
      return;
    }
    C.addCoins(-cost);
    C.addCoins(v);
    s.piggy = 0;
    C.sv(s);
    C.closeGlobalModal();
    renderPiggyBanner();
    C.showToast('🐷', 'Cofrinho quebrado!', `+${v} moedas`);
  }

  function checkFlashOffer() {
    const s = C.ld();
    const now = Date.now();
    if (s.flashUntil && s.flashUntil > now) return;
    const coins = remoteConfig().flashCoins || 800;
    s.flashUntil = now + 3600000;
    s.flashDeal = { coins, price: 1.99, id: 'flash_coins' };
    C.sv(s);
    renderFlashBanner();
  }

  // ── Ofertas dinâmicas ─────────────────────────────────────────
  function _dynCanShow(id) {
    const s = C.ld();
    const day = _epochDay();
    s.dynShown = s.dynShown || {};
    return s.dynShown[id] !== day;
  }

  function _dynMarkShown(id) {
    const s = C.ld();
    s.dynShown = s.dynShown || {};
    s.dynShown[id] = _epochDay();
    C.sv(s);
  }

  function onLevelLoss(lvIdx) {
    const s = C.ld();
    s.failStreak = (s.failStreak || 0) + 1;
    s.levelFails = s.levelFails || {};
    const k = String(lvIdx);
    s.levelFails[k] = (s.levelFails[k] || 0) + 1;
    C.sv(s);
  }

  function onReturnToMap(reason) {
    if (!remoteConfig().dynamicOffersEnabled) return;
    setTimeout(() => evaluateDynamicOffers(reason || 'map'), 600);
  }

  function evaluateDynamicOffers(trigger) {
    if (!remoteConfig().dynamicOffersEnabled) return;
    const s = C.ld();
    const lives = C.getLives();
    const coins = C.getCoins();
    const fails = s.levelFails || {};
    const maxFail = Math.max(0, ...Object.values(fails));

    if (trigger === 'no_lives' || lives <= 0) {
      if (_dynCanShow('dyn_lives') && !s.boughtStarter) {
        showDynamicOffer({
          id: 'dyn_lives',
          icon: '❤️',
          title: t('offer_lives'),
          desc: '+2 vidas · Pacote Iniciante com desconto',
          action: () => C.shopBuyIAP && C.shopBuyIAP('starter'),
        });
        return;
      }
    }

    if ((trigger === 'loss' || trigger === 'map') && maxFail >= 3 && _dynCanShow('dyn_stuck')) {
      const stuck = (_economy() && _economy().DYNAMIC_OFFERS.stuck) || {
        coinCost: 90,
        bomb: 2,
        shuffle: 2,
      };
      showDynamicOffer({
        id: 'dyn_stuck',
        icon: '🆘',
        title: t('offer_stuck'),
        desc: `💣×${stuck.bomb} + 🔀×${stuck.shuffle} por ${stuck.coinCost} moedas`,
        action: () => {
          if (C.getCoins() < stuck.coinCost) {
            C.showToast('💰', 'Moedas insuficientes', stuck.coinCost + ' 💰');
            return;
          }
          C.addCoins(-stuck.coinCost);
          C.addPU('bomb', stuck.bomb);
          C.addPU('shuffle', stuck.shuffle);
          C.closeGlobalModal();
          C.showToast('🆘', t('offer_stuck'), 'Power-ups adicionados!');
        },
      });
      return;
    }

    if ((s.failStreak || 0) >= 2 && coins < 80 && _dynCanShow('dyn_coins')) {
      const dc = (_economy() && _economy().DYNAMIC_OFFERS.coins) || { pay: 100, receive: 220 };
      showDynamicOffer({
        id: 'dyn_coins',
        icon: '💰',
        title: t('offer_coins'),
        desc: `+${dc.receive} moedas por ${dc.pay} moedas`,
        action: () => {
          if (C.getCoins() < dc.pay) {
            C.openShop && C.openShop();
            return;
          }
          C.addCoins(-dc.pay);
          C.addCoins(dc.receive);
          s.failStreak = 0;
          C.sv(s);
          C.closeGlobalModal();
          C.showToast('💰', '+' + dc.receive + ' moedas', '');
        },
      });
      return;
    }

    if (
      trigger === 'map' &&
      (s.piggy || 0) >= (remoteConfig().piggyCap || 500) * 0.85 &&
      _dynCanShow('dyn_piggy')
    ) {
      showDynamicOffer({
        id: 'dyn_piggy',
        icon: '🐷',
        title: t('piggy'),
        desc: 'Cofrinho quase cheio — quebre agora!',
        action: () => {
          C.closeGlobalModal();
          openPiggyModal();
        },
      });
    }
  }

  function showDynamicOffer(offer) {
    _dynMarkShown(offer.id);
    C.showGlobalModal(`
      <div style="font-size:40px;line-height:1">${offer.icon}</div>
      <div style="font-size:17px;font-weight:800;margin:6px 0">${offer.title}</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:14px;line-height:1.5">${offer.desc}</div>
      <button class="btn btn-p btn-full" style="margin-bottom:8px" data-action="claimDynamicOffer">⚡ ${t('claim_offer')}</button>
      <button class="btn btn-g btn-full" data-action="closeGlobalModal">${t('later')}</button>
    `);
    global._dynOfferAction = offer.action;
  }

  function claimDynamicOffer() {
    const fn = global._dynOfferAction;
    global._dynOfferAction = null;
    if (fn) fn();
  }

  function renderFlashBanner() {
    const el = document.getElementById('flash-banner');
    if (!el) return;
    const s = C.ld();
    if (!s.flashUntil || s.flashUntil < Date.now()) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    const mins = Math.ceil((s.flashUntil - Date.now()) / 60000);
    el.innerHTML = `<span>⚡ ${t('flash_offer')}</span><span class="bp-pct">800💰 · ${mins}min</span>`;
  }

  function openFlashModal() {
    const s = C.ld();
    if (!s.flashDeal) return;
    C.showGlobalModal(`
      <div style="font-size:36px">⚡</div>
      <div style="font-size:17px;font-weight:800;">Oferta Relâmpago!</div>
      <div style="font-size:26px;font-weight:800;color:#4ecb71;margin:8px 0">+800 💰</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">Por tempo limitado — melhor custo-benefício!</div>
      <button class="btn btn-p btn-full" data-action="claimFlash">Resgatar grátis (demo)</button>
      <button class="btn btn-g btn-full" style="margin-top:8px" data-action="closeGlobalModal">Fechar</button>
    `);
  }

  function claimFlash() {
    C.addCoins(800);
    const s = C.ld();
    s.flashUntil = 0;
    C.sv(s);
    C.closeGlobalModal();
    renderFlashBanner();
    C.showToast('⚡', 'Oferta resgatada!', '+800 moedas');
  }

  function onWinStreak(won) {
    const s = C.ld();
    if (won) {
      s.winStreak = (s.winStreak || 0) + 1;
      s.failStreak = 0;
      const bonus = Math.min(50, s.winStreak * 5);
      if (bonus > 0) {
        C.addCoins(bonus);
        if (s.winStreak >= 3) {
          setTimeout(
            () => C.showToast('🔥', `${t('win_streak')} ${s.winStreak}!`, `+${bonus} 💰`),
            500
          );
        }
      }
    } else {
      s.winStreak = 0;
    }
    C.sv(s);
    renderWinStreak();
    checkExtendedAchievements();
  }

  function renderWinStreak() {
    const el = document.getElementById('win-streak-badge');
    if (!el) return;
    const n = C.ld().winStreak || 0;
    if (n < 2) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'inline-flex';
    el.textContent = `🔥 ${n}`;
    el.title = `${t('win_streak')}: ${n}`;
  }

  let interstitialWins = 0;

  function _epochDay() {
    return Math.floor(Date.now() / 86400000);
  }

  function maybeShowInterstitial(cb) {
    const cfg = remoteConfig();
    const s = C.ld();
    if (C.hasNoAds()) {
      cb && cb();
      return;
    }
    if ((s.unlocked || 0) < 3) {
      cb && cb();
      return;
    }
    const today = _epochDay();
    s.interstitialToday = s.interstitialToday || { day: today, count: 0 };
    if (s.interstitialToday.day !== today) s.interstitialToday = { day: today, count: 0 };
    const cap = cfg.interstitialDailyCap || 5;
    if (s.interstitialToday.count >= cap) {
      cb && cb();
      return;
    }
    interstitialWins++;
    if (interstitialWins % (cfg.interstitialEvery || 5) !== 0) {
      cb && cb();
      return;
    }
    s.interstitialToday.count++;
    C.sv(s);
    if (C.PlayBridge.showInterstitial(cb)) return;
    cb && cb();
  }

  function purchaseSubscription(productId) {
    if (C.Sound && C.Sound.click) C.Sound.click();
    if (
      C.PlayBridge &&
      C.PlayBridge.purchaseSubscription &&
      C.PlayBridge.purchaseSubscription(productId)
    )
      return;
    C.showToast(
      '💳',
      t('subscribe', 'Assinatura'),
      t('subscribe_android', 'Disponível no app Android com Google Play')
    );
  }

  function ready() {
    return !!(C && C.ld);
  }

  function bootBanners() {
    renderBattlePassBanner();
    renderPiggyBanner();
    renderFlashBanner();
    renderWinStreak();
    checkFlashOffer();
  }

  const api = {
    isReady: ready,
    /** @param {Record<string, any>|null|undefined} cfg */
    init(cfg) {
      C = cfg || null;
    },
    bootBanners,
    prepareReturnPlayerOffer,
    getBattlePass,
    addBattlePassXP,
    renderBattlePassBanner,
    openBattlePassModal,
    buyBpPremium,
    activateBpPremium,
    addPiggyCoins,
    renderPiggyBanner,
    openPiggyModal,
    breakPiggy,
    checkFlashOffer,
    onLevelLoss,
    onReturnToMap,
    evaluateDynamicOffers,
    claimDynamicOffer,
    renderFlashBanner,
    openFlashModal,
    claimFlash,
    onWinStreak,
    renderWinStreak,
    maybeShowInterstitial,
    purchaseSubscription,
  };

  global.TBOffers = api;
})(typeof window !== 'undefined' ? window : globalThis);
