import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function makeCfg(overrides = {}) {
  return {
    _t: (_k, f) => f,
    showGlobalModal: vi.fn(),
    ...overrides,
  };
}

function mountEvents() {
  mountModule('tb-config.js');
  mountModule('tb-game-logic.js');
  mountModule('tb-runtime.js');
  mountModule('tb-events.js');
  return globalThis.TBEvents;
}

describe('tb-events', () => {
  /** @type {any} */
  let EV;

  beforeEach(() => {
    delete globalThis.TBEvents;
    delete globalThis.getActiveEvent;
    delete globalThis.renderEventBanner;
    delete globalThis.openEventModal;
    delete globalThis.registerEventDecorator;
    delete globalThis.registerBannerDecorator;
    createMinimalDom();
    EV = mountEvents();
  });

  it('getActiveEvent devolve um evento da rotação', () => {
    EV.init(makeCfg());
    const ev = EV.getActiveEvent();
    expect(ev).toBeTruthy();
    expect(ev.id).toBeTruthy();
    expect(ev.icon).toBeTruthy();
    expect(typeof ev.coinMult).toBe('number');
  });

  it('renderEventBanner preenche #event-banner', () => {
    EV.init(makeCfg());
    EV.renderEventBanner();
    const el = document.getElementById('event-banner');
    expect(el.querySelector('.ev-name')).toBeTruthy();
    expect(el.querySelector('.ev-icon')).toBeTruthy();
    expect(el.querySelector('.ev-time')).toBeTruthy();
    expect(el.getAttribute('aria-label')).toContain('Evento ativo');
  });

  it('openEventModal chama showGlobalModal', () => {
    const cfg = makeCfg();
    EV.init(cfg);
    EV.openEventModal();
    expect(cfg.showGlobalModal).toHaveBeenCalled();
    expect(cfg.showGlobalModal.mock.calls[0][0]).toContain('Eventos em Rotação');
  });
});
