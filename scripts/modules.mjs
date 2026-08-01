/**
 * Manifesto canônico dos módulos JS do jogo, em ORDEM de carga.
 * Fonte única da verdade — consumido por minify-www e build-bundle
 * (antes a lista estava duplicada em vários scripts).
 *
 * Ordem = a mesma das tags <script> em tile_blast.html. Todos são
 * scripts clássicos (sem import/export), então concatenar nesta ordem
 * é semanticamente idêntico a carregá-los como tags separadas.
 */
export const MODULES = [
  'tb-config.js',
  'tb-state.js',
  'tb-economy.js',
  'tb-content.js',
  'tb-audio.js',
  'tb-analytics.js',
  'tb-ui.js',
  'tb-game-logic.js',
  'firebase-config.js',
  'tb-firebase.js',
  'tb-remote.js',
  'tb-i18n.js',
  'tb-achievements.js',
  'tb-offers.js',
  'tb-social.js',
  'tb-retention.js',
  'tb-roadmap.js',
  'tb-global.js',
  'tb-features.js',
  'tb-push.js',
  'tb-meta.js',
  'tb-juice.js',
  'tb-runtime.js',
  'tb-secure.js',
  'tb-save.js',
  'tb-shop.js',
  'tb-result.js',
  'tb-map.js',
  'tb-board.js',
  'tb-xp.js',
  'tb-collection.js',
  'tb-chests.js',
  'tb-missions.js',
  'tb-events.js',
  'tb-challenges.js',
  'tb-meta-ui.js',
  'tb-gameplay.js',
  'tb-music.js',
  'tb-ads.js',
  'tb-playbridge.js',
  'tb-dialogs.js',
  'tb-start.js',
  'tb-grid.js',
  'tb-modes.js',
  'tb-a11y.js',
  'tb-fx.js',
  'tb-input.js',
  'tb-main.js',
];

/** Módulos carregados após o boot via TBRuntime.loadDeferredModules (P4.1). */
export const DEFERRED_MODULES = ['tb-push.js'];

/** Scripts bloqueantes no HTML — MODULES menos adiados. */
export const BOOT_MODULES = MODULES.filter((m) => !DEFERRED_MODULES.includes(m));
