import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('tb-push', () => {
  /** @type {any} */
  let P;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;
  /** @type {any} */
  let notif;
  /** @type {any} */
  let roadmap;
  /** @type {any} */
  let fb;
  /** @type {Record<string, Function>} */
  let listeners;
  /** @type {any} */
  let plugin;

  function mountPush() {
    // `Notification`, `TBRoadmap` e `TBFirebase` são identificadores livres no
    // módulo: precisam existir no sandbox do vm além de globalThis.
    mountModule('tb-push.js', { Notification: notif, TBRoadmap: roadmap, TBFirebase: fb });
    P = globalThis.TBPush;
    P.init(cfg);
    return P;
  }

  beforeEach(() => {
    delete globalThis.TBPush;
    delete globalThis.Capacitor;
    save = {};
    cfg = {
      ld: () => save,
      sv: vi.fn((s) => {
        save = s;
      }),
      showToast: vi.fn(),
    };
    notif = {
      permission: 'default',
      requestPermission: vi.fn(async () => {
        notif.permission = 'granted';
        return 'granted';
      }),
    };
    roadmap = { scheduleLocalReminders: vi.fn() };
    fb = { configValid: vi.fn(() => false), boot: vi.fn(async () => true) };
    listeners = {};
    plugin = {
      requestPermissions: vi.fn(async () => ({ receive: 'granted' })),
      register: vi.fn(async () => {}),
      addListener: vi.fn((ev, cb) => {
        listeners[ev] = cb;
      }),
    };
    globalThis.Notification = notif;
    globalThis.TBRoadmap = roadmap;
    globalThis.TBFirebase = fb;
  });

  it('maybeAskPermission só pergunta a partir de 3 fases', async () => {
    mountPush();
    P.maybeAskPermission(2);
    await flush();
    expect(save.pushAsked).toBeUndefined();
    expect(notif.requestPermission).not.toHaveBeenCalled();

    P.maybeAskPermission(3);
    expect(save.pushAsked).toBe(true);
    await flush();
    expect(notif.requestPermission).toHaveBeenCalled();
  });

  it('permissão concedida agenda lembretes locais', async () => {
    mountPush();
    await P.requestPermission();
    expect(notif.permission).toBe('granted');
    expect(roadmap.scheduleLocalReminders).toHaveBeenCalled();
  });

  it('não pergunta duas vezes', async () => {
    mountPush();
    await P.requestPermission();
    await P.requestPermission();
    expect(notif.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('usa o plugin nativo do Capacitor quando presente', async () => {
    globalThis.Capacitor = { Plugins: { PushNotifications: plugin } };
    mountPush();
    await P.requestPermission();

    expect(plugin.requestPermissions).toHaveBeenCalled();
    expect(plugin.register).toHaveBeenCalled();
    expect(notif.requestPermission).not.toHaveBeenCalled();

    listeners.registration({ value: 'tok-123' });
    expect(save.fcmToken).toBe('tok-123');
  });

  it('não registra push nativo se a permissão for negada', async () => {
    plugin.requestPermissions.mockResolvedValue({ receive: 'denied' });
    globalThis.Capacitor = { Plugins: { PushNotifications: plugin } };
    mountPush();
    await P.requestPermission();

    expect(plugin.register).not.toHaveBeenCalled();
    expect(save.pushAsked).toBe(true);
  });

  it('notificação recebida vira toast', async () => {
    globalThis.Capacitor = { Plugins: { PushNotifications: plugin } };
    mountPush();
    await P.requestPermission();

    listeners.pushNotificationReceived({ title: 'Volte!', body: 'Vidas cheias' });
    expect(cfg.showToast).toHaveBeenCalledWith('🔔', 'Volte!', 'Vidas cheias');
  });
});
