import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(join(root, 'tile_blast.html'), 'utf8');

describe('P1.2 home density — markup', () => {
  it('primários Play / Diário / Evento ficam em .map-primary dentro de .map-bottom', () => {
    const bottom = html.match(/<div class="map-bottom">([\s\S]*?)<div id="screen-game"/);
    expect(bottom).toBeTruthy();
    const block = bottom[1];
    expect(block).toMatch(/class="map-primary"/);
    expect(block).toMatch(/id="map-play-btn"/);
    expect(block).toMatch(/id="map-daily-puzzle-btn"/);
    expect(block).toMatch(/id="event-banner"[^>]*class="[^"]*map-primary-cta/);
    // Evento não permanece no topo (map-stats)
    const top = html.match(/<div class="map-top">([\s\S]*?)<div id="map-scroll"/);
    expect(top).toBeTruthy();
    expect(top[1]).not.toMatch(/id="event-banner"/);
  });

  it('loja/skins/perfil/jardim/missões ficam no hub secundário #map-more-panel', () => {
    const more = html.match(
      /id="map-more-panel"[\s\S]*?<\/div>\s*<button id="map-settings-toggle"/
    );
    expect(more).toBeTruthy();
    const block = more[0];
    for (const id of [
      'map-missions-btn',
      'map-shop-btn',
      'map-coll-btn',
      'map-profile-btn',
      'map-garden-btn',
      'map-challenge-btn',
      'map-time-btn',
      'map-modes-btn',
    ]) {
      expect(block).toContain(`id="${id}"`);
    }
    expect(html).toMatch(/id="map-more-toggle"/);
    expect(html).toMatch(/id="map-more-notif"/);
  });

  it('badges de notificação preservados', () => {
    for (const id of [
      'shop-notif',
      'missions-notif',
      'map-garden-hint',
      'daily-notif',
      'challenge-notif',
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
