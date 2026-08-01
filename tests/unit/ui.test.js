import { describe, expect, it, beforeEach } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function buildUiDom() {
  document.body.innerHTML = `
    <div id="app"></div>
    <div id="ach-toast"><span id="ach-icon"></span><span id="ach-title"></span><span id="ach-sub"></span></div>
    <div id="global-modal"><div id="gm-box"></div></div>
  `;
}

describe('TBUI', () => {
  beforeEach(() => {
    createMinimalDom();
    mountModule('tb-ui.js');
    buildUiDom();
  });

  it('expõe toast/showModal/closeModal e delegação data-action', () => {
    expect(typeof TBUI.toast).toBe('function');
    expect(typeof TBUI.showModal).toBe('function');
    expect(typeof TBUI.closeModal).toBe('function');
    expect(typeof TBUI.registerAction).toBe('function');
    expect(typeof TBUI.registerActions).toBe('function');
  });

  it('registerAction + click em data-action dispara o handler', () => {
    let hit = null;
    TBUI.registerAction('probe', (a) => {
      hit = a;
    });
    document.body.innerHTML += '<button id="p" data-action="probe" data-arg="x">go</button>';
    document.getElementById('p').click();
    expect(hit).toBe('x');
  });

  it('toast preenche conteúdo e adiciona classe show', () => {
    TBUI.toast('🏆', 'Vitória', 'Fase concluída');
    expect(document.getElementById('ach-icon').textContent).toBe('🏆');
    expect(document.getElementById('ach-title').textContent).toBe('Vitória');
    expect(document.getElementById('ach-sub').textContent).toBe('Fase concluída');
    expect(document.getElementById('ach-toast').classList.contains('show')).toBe(true);
    expect(document.getElementById('ach-toast').getAttribute('aria-label')).toBe(
      'Vitória. Fase concluída'
    );
  });

  it('showModal injeta HTML + título e marca aria; closeModal reverte', () => {
    TBUI.showModal('<button id="ok">OK</button>', 'Confirmar');
    const modal = document.getElementById('global-modal');
    expect(modal.classList.contains('show')).toBe(true);
    expect(modal.getAttribute('aria-hidden')).toBe('false');
    expect(document.getElementById('app').getAttribute('aria-hidden')).toBe('true');
    expect(document.getElementById('gm-box').innerHTML).toContain('Confirmar');
    expect(document.getElementById('gm-box').innerHTML).toContain('id="ok"');
    TBUI.closeModal();
    expect(modal.classList.contains('show')).toBe(false);
    expect(modal.getAttribute('aria-hidden')).toBe('true');
    expect(document.getElementById('app').getAttribute('aria-hidden')).toBe('false');
  });

  it('toast não lança se elementos ausentes', () => {
    document.body.innerHTML = '';
    expect(() => TBUI.toast('x', 'y', 'z')).not.toThrow();
  });
});
