const MAP_IDS = [
  'screen-map',
  'screen-game',
  'screen-complete',
  'screen-shop',
  'splash',
  'map-play-btn',
  'map-colorblind-toggle',
  'map-weekly-rank-btn',
  'map-notify-btn',
  'map-ach-btn',
  'map-lb-btn',
  'map-bp-btn',
  'map-restore-btn',
  'map-privacy-btn',
  'map-lang-btn',
  'map-export-btn',
  'map-import-btn',
  'map-cloud-backup',
  'map-player-btn',
  'map-whatsnew-btn',
  'event-banner',
  'bp-banner',
  'piggy-banner',
  'flash-banner',
  'win-streak-badge',
  'global-modal',
  'vol-music',
  'vol-sfx',
  'res-next',
  'res-retry',
  'board-tutorial-ring',
  'lb-global-list',
];

export function createMinimalDom() {
  document.body.innerHTML = `
    <div id="splash"></div>
    <div id="screen-map" class="screen active"></div>
    <div id="screen-game" class="screen"></div>
    <div id="global-modal"></div>
    <div id="event-banner"><span class="ev-name"></span></div>
    <div id="bp-banner"></div>
    <div id="piggy-banner"></div>
    <div id="flash-banner"></div>
    <div id="win-streak-badge"></div>
    <div id="board-tutorial-ring"></div>
    <div id="lb-global-list"></div>
    <input id="vol-music" type="range" value="100" />
    <input id="vol-sfx" type="range" value="100" />
    <button id="map-colorblind-toggle"></button>
    <button id="map-weekly-rank-btn"></button>
    <button id="map-notify-btn"></button>
    <button id="map-ach-btn"></button>
    <button id="map-lb-btn"></button>
    <button id="map-bp-btn"></button>
    <button id="map-restore-btn"></button>
    <button id="map-privacy-btn"></button>
    <button id="map-lang-btn"></button>
    <button id="map-export-btn"></button>
    <button id="map-import-btn"></button>
    <button id="map-cloud-backup"></button>
    <button id="map-player-btn"></button>
    <button id="map-whatsnew-btn"></button>
    <button id="res-next"></button>
    <button id="res-retry"></button>
    <div class="vol-row"><span></span></div>
    <div class="vol-row"><span></span></div>
  `;
  MAP_IDS.forEach((id) => {
    if (!document.getElementById(id)) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  });
}
