// @ts-check
/**
 * Tile Blast — meta UI (AppTimers + facade).
 * Missões → tb-missions.js · XP → tb-xp.js · Coleção → tb-collection.js · Baús → tb-chests.js.
 * Eventos → tb-events.js · Desafios → tb-challenges.js.
 * TBMetaUI.init(cfg) propaga o cfg para os módulos irmãos.
 *
 * @typedef {Record<string, any>} TBMetaUICfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  let C = null;

  /**
   * @param {TBMetaUICfg|null|undefined} cfg
   * @returns {void}
   */
  function init(cfg) {
    C = cfg || null;
    if (global.TBXp && typeof global.TBXp.init === 'function') global.TBXp.init(cfg);
    if (global.TBCollection && typeof global.TBCollection.init === 'function')
      global.TBCollection.init(cfg);
    if (global.TBChests && typeof global.TBChests.init === 'function') global.TBChests.init(cfg);
    if (global.TBMissions && typeof global.TBMissions.init === 'function')
      global.TBMissions.init(cfg);
    if (global.TBEvents && typeof global.TBEvents.init === 'function') global.TBEvents.init(cfg);
    if (global.TBChallenges && typeof global.TBChallenges.init === 'function')
      global.TBChallenges.init(cfg);
  }

  // ═══════════════════════════════════════════════════════════════
  // BACKGROUND TIMERS (pausados quando a aba fica oculta)
  // ═══════════════════════════════════════════════════════════════
  const AppTimers = (() => {
    let chestId = null,
      eventId = null,
      paused = false;
    return {
      start() {
        if (!chestId)
          chestId = setInterval(function () {
            if (typeof global._tickChestTimers === 'function') global._tickChestTimers();
          }, 1000);
        if (!eventId)
          eventId = setInterval(() => {
            if (document.getElementById('screen-map').classList.contains('active')) {
              if (typeof global.renderEventBanner === 'function') global.renderEventBanner();
              else if (global.TBEvents && typeof global.TBEvents.renderEventBanner === 'function')
                global.TBEvents.renderEventBanner();
            }
          }, 60000);
        paused = false;
      },
      pause() {
        if (chestId) {
          clearInterval(chestId);
          chestId = null;
        }
        if (eventId) {
          clearInterval(eventId);
          eventId = null;
        }
        paused = true;
      },
      resume() {
        if (!paused) return;
        this.start();
      },
      isPaused() {
        return paused;
      },
    };
  })();
  global.AppTimers = AppTimers;

  /** @type {any} */
  const api = {
    init,
    syncMissionPools: function () {
      return global._syncMissionPools && global._syncMissionPools();
    },
    updateMissionProgress: function () {
      return global.updateMissionProgress && global.updateMissionProgress.apply(null, arguments);
    },
    openMissionsModal: function () {
      return global.openMissionsModal && global.openMissionsModal.apply(null, arguments);
    },
    claimMission: function () {
      return global.claimMission && global.claimMission.apply(null, arguments);
    },
    claimWeeklyMission: function () {
      return global.claimWeeklyMission && global.claimWeeklyMission.apply(null, arguments);
    },
    addXP: function () {
      return global.addXP && global.addXP.apply(null, arguments);
    },
    renderXPBar: function () {
      return global.renderXPBar && global.renderXPBar.apply(null, arguments);
    },
    closeLevelUpCelebration: function () {
      return (
        global.closeLevelUpCelebration && global.closeLevelUpCelebration.apply(null, arguments)
      );
    },
    getActiveEvent: function () {
      return global.TBEvents && global.TBEvents.getActiveEvent();
    },
    renderEventBanner: function () {
      return global.TBEvents && global.TBEvents.renderEventBanner();
    },
    openEventModal: function () {
      return global.TBEvents && global.TBEvents.openEventModal();
    },
    registerEventDecorator: function () {
      return global.TBEvents && global.TBEvents.registerEventDecorator.apply(null, arguments);
    },
    registerBannerDecorator: function () {
      return global.TBEvents && global.TBEvents.registerBannerDecorator.apply(null, arguments);
    },
    updateChallengeProgress: function () {
      return (
        global.TBChallenges && global.TBChallenges.updateChallengeProgress.apply(null, arguments)
      );
    },
    renderChallengeNotif: function () {
      return global.TBChallenges && global.TBChallenges.renderChallengeNotif();
    },
    openChallengeModal: function () {
      return global.TBChallenges && global.TBChallenges.openChallengeModal();
    },
    syncWorldSkins: function () {
      return global.syncWorldSkins && global.syncWorldSkins.apply(null, arguments);
    },
    applyEquipped: function () {
      return global.applyEquipped && global.applyEquipped.apply(null, arguments);
    },
    unlockWorldSkin: function () {
      return global.unlockWorldSkin && global.unlockWorldSkin.apply(null, arguments);
    },
    openCollectionModal: function () {
      return global.openCollectionModal && global.openCollectionModal.apply(null, arguments);
    },
    addChest: function () {
      return global.addChest && global.addChest.apply(null, arguments);
    },
    renderChestBar: function () {
      return global.renderChestBar && global.renderChestBar.apply(null, arguments);
    },
    tickChestTimers: function () {
      return global._tickChestTimers && global._tickChestTimers.apply(null, arguments);
    },
    get XP_DEFS() {
      return global.XP_DEFS;
    },
    get CHEST_DEFS() {
      return global.CHEST_DEFS;
    },
    locChestLabel: function () {
      return global._locChestLabel && global._locChestLabel.apply(null, arguments);
    },
    locFeatName: function () {
      return global._locFeatName && global._locFeatName.apply(null, arguments);
    },
    locCollName: function () {
      return global._locCollName && global._locCollName.apply(null, arguments);
    },
  };

  /** @type {any} */
  const g = global;
  g.TBMetaUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
