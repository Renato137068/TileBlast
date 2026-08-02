const CACHE = 'tileblast-v149';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './mascot.svg',
  './mascot-happy.svg',
  './mascot-excited.svg',
  './mascot-sad.svg',
  './mascot-think.svg',
  './icon-192.png',
  './icon-512.png',
  './privacy.html',
  './css/variables.css',
  './css/base.css',
  './css/map.css',
  './css/hud.css',
  './css/board.css',
  './css/dialogs.css',
  './css/mascot.css',
  './css/shop.css',
  './css/features.css',
  './css/effects.css',
  './css/responsive.css',
  './css/meta-garden.css',
  './css/content.css',
  './css/a11y.css',
  './tb-config.js',
  './tb-state.js',
  './tb-economy.js',
  './tb-content.js',
  './tb-audio.js',
  './tb-analytics.js',
  './tb-ui.js',
  './tb-game-logic.js',
  './tb-i18n.js',
  './tb-achievements.js',
  './tb-offers.js',
  './tb-social.js',
  './tb-retention.js',
  './tb-roadmap.js',
  './tb-global.js',
  './tb-features.js',
  './tb-firebase.js',
  './tb-remote.js',
  './tb-push.js',
  './tb-meta.js',
  './tb-juice.js',
  './tb-runtime.js',
  './tb-secure.js',
  './tb-save.js',
  './tb-shop.js',
  './tb-result.js',
  './tb-map.js',
  './tb-board.js',
  './tb-xp.js',
  './tb-collection.js',
  './tb-chests.js',
  './tb-missions.js',
  './tb-events.js',
  './tb-challenges.js',
  './tb-meta-ui.js',
  './tb-gameplay.js',
  './tb-music.js',
  './tb-ads.js',
  './tb-playbridge.js',
  './tb-dialogs.js',
  './tb-start.js',
  './tb-grid.js',
  './tb-modes.js',
  './tb-a11y.js',
  './tb-fx.js',
  './tb-input.js',
  './tb-main.js',
  './app.bundle.js',
  './firebase-config.js',
  './remote-config.json',
  './data/worlds.json',
  './data/events.json',
  './data/modes.json',
  './data/challenges.json',
  './data/missions.json',
  './data/admin-schema.json',
  './data/levels/manifest.json',
  './data/levels/garden.json',
  './data/levels/forest.json',
  './data/levels/mountain.json',
  './data/levels/ocean.json',
  './data/levels/inferno.json',
  './data/levels/crystal.json',
  './data/levels/legendary.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll(ASSETS).catch(() => Promise.all(ASSETS.map((u) => c.add(u).catch(() => {}))))
      )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
      return cached || fetched;
    })
  );
});
