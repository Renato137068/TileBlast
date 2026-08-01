/* ═══════════════════════════════════════════════════════════════════════════
   TB-UI — Componentes de interface reutilizáveis (overlays)
   ---------------------------------------------------------------------------
   Centraliza os componentes de UI mais reaproveitados do jogo:
     • toast(icon,title,sub)  — notificação efêmera (#ach-toast)
     • showModal(html,title)  — modal global acessível (#global-modal / #gm-box)
     • closeModal()           — fecha o modal e restaura foco

   O módulo é dono do seu próprio estado interno (timer do toast, foco a
   restaurar). Limpezas específicas de fluxo (ex.: timers do modal "sem vidas")
   permanecem no script principal e são acionadas pelos wrappers finos
   showGlobalModal/closeGlobalModal, preservando 100% do comportamento.

   Exposto como window.TBUI.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ── TOAST ───────────────────────────────────────────────────────────────────
  let _toastTimer = null;
  function toast(icon, title, sub) {
    const t = $('ach-toast');
    if (!t) return;
    const ic = $('ach-icon');
    if (ic) {
      ic.textContent = icon;
      ic.setAttribute('aria-hidden', 'true');
    }
    const tt = $('ach-title');
    if (tt) tt.textContent = title;
    const ts = $('ach-sub');
    if (ts) ts.textContent = sub || '';
    t.setAttribute('aria-label', [title, sub].filter(Boolean).join('. '));
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ── MODAL GLOBAL ──────────────────────────────────────────────────────────────
  let _modalReturnFocus = null;
  function _scrollModalInputIntoView(inp) {
    if (!inp || !window.visualViewport) return;
    const box = $('gm-box');
    const rect = inp.getBoundingClientRect();
    const overflow = rect.bottom - (visualViewport.height - 16);
    if (overflow > 0 && box) box.scrollTop += overflow;
  }
  function showModal(html, title = 'Diálogo') {
    _modalReturnFocus = document.activeElement;
    const box = $('gm-box');
    box.innerHTML = `<h2 id="gm-title" class="sr-only">${title}</h2>${html}`;
    const modal = $('global-modal');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    $('app').setAttribute('aria-hidden', 'true');
    $('app').inert = true;
    box.querySelectorAll('input,textarea').forEach((inp) => {
      inp.addEventListener('focus', () => setTimeout(() => _scrollModalInputIntoView(inp), 350));
    });
    const firstFocus = box.querySelector(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    if (firstFocus) firstFocus.focus();
  }
  function closeModal() {
    const modal = $('global-modal');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    $('app').setAttribute('aria-hidden', 'false');
    $('app').inert = false;
    if (_modalReturnFocus && typeof _modalReturnFocus.focus === 'function') {
      try {
        _modalReturnFocus.focus();
      } catch (e) {}
    }
    _modalReturnFocus = null;
  }

  // ── Delegação data-action (substitui onclick inline) ───────────────────────
  // Uso: data-action="shopBuyCoin" data-arg="bomb" [data-arg2="…"]
  // Handlers registrados via registerAction / registerActions (allowlist).
  const _actions = Object.create(null);
  let _delegationBound = false;

  function registerAction(name, fn) {
    if (name && typeof fn === 'function') _actions[name] = fn;
  }

  function registerActions(map) {
    if (!map) return;
    Object.keys(map).forEach(function (k) {
      registerAction(k, map[k]);
    });
  }

  function _onDelegatedClick(e) {
    const el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const name = el.getAttribute('data-action');
    const fn = name ? _actions[name] : null;
    if (!fn) return;
    const arg = el.getAttribute('data-arg');
    const arg2 = el.getAttribute('data-arg2');
    try {
      fn(arg, arg2, el, e);
    } catch (err) {
      console.warn('[TBUI] action', name, err);
    }
  }

  function bindActionDelegation(root) {
    if (_delegationBound) return;
    const r = root || document;
    r.addEventListener('click', _onDelegatedClick);
    _delegationBound = true;
  }

  // Instala cedo: cobre HTML estático e nós criados via innerHTML depois.
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        bindActionDelegation(document);
      });
    } else {
      bindActionDelegation(document);
    }
  }

  window.TBUI = {
    toast,
    showModal,
    closeModal,
    registerAction,
    registerActions,
    bindActionDelegation,
  };
})();
