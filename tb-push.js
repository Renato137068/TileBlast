/**
 * Tile Blast — Push Notifications via Firebase Cloud Messaging.
 * Pede permissão após o usuário completar 3 fases.
 */
(function (global) {
  'use strict';

  let C = null;
  let nativeRegistered = false;

  function getPushPlugin() {
    if (
      global.Capacitor &&
      global.Capacitor.Plugins &&
      global.Capacitor.Plugins.PushNotifications
    ) {
      return global.Capacitor.Plugins.PushNotifications;
    }
    return null;
  }

  async function registerNativePush(PushNotifications) {
    if (nativeRegistered) return true;
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return false;
    await PushNotifications.register();
    nativeRegistered = true;

    PushNotifications.addListener('registration', (token) => {
      const s = C.ld();
      s.fcmToken = token.value;
      C.sv(s);
      if (global.TBFirebase && TBFirebase.configValid()) {
        TBFirebase.boot().catch(() => {});
      }
    });

    PushNotifications.addListener('registrationError', () => {});

    PushNotifications.addListener('pushNotificationReceived', (n) => {
      if (n && n.title && C.showToast) C.showToast('🔔', n.title, n.body || '');
    });
    return true;
  }

  async function requestPermission() {
    if (!C) return;
    const s = C.ld();
    if (s.pushAsked) return;
    s.pushAsked = true;
    C.sv(s);

    if (global.TBAnalytics) global.TBAnalytics.log('push_prompt_shown', { surface: 'tb_push' });

    const PushNotifications = getPushPlugin();
    if (PushNotifications) {
      try {
        const ok = await registerNativePush(PushNotifications);
        if (ok && global.TBAnalytics) global.TBAnalytics.log('push_granted', { surface: 'native' });
      } catch (e) {
        /* ignore */
      }
      return;
    }

    if ('Notification' in global) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        if (global.TBAnalytics) global.TBAnalytics.log('push_granted', { surface: 'web' });
        if (global.TBRoadmap && TBRoadmap.scheduleLocalReminders) {
          TBRoadmap.scheduleLocalReminders();
        }
      }
    }
  }

  function maybeAskPermission(levelsCompleted) {
    if ((levelsCompleted || 0) >= 3) requestPermission();
  }

  global.TBPush = {
    init(cfg) {
      C = cfg;
    },
    maybeAskPermission,
    requestPermission,
  };
})(typeof window !== 'undefined' ? window : globalThis);
