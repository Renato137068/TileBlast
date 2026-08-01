const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

fs.mkdirSync(www, { recursive: true });

const copies = [
  ['tile_blast.html', 'index.html'],
  ['tb-config.js', 'tb-config.js'],
  ['tb-state.js', 'tb-state.js'],
  ['tb-economy.js', 'tb-economy.js'],
  ['tb-content.js', 'tb-content.js'],
  ['tb-audio.js', 'tb-audio.js'],
  ['tb-analytics.js', 'tb-analytics.js'],
  ['tb-ui.js', 'tb-ui.js'],
  ['tb-game-logic.js', 'tb-game-logic.js'],
  ['tb-i18n.js', 'tb-i18n.js'],
  ['tb-achievements.js', 'tb-achievements.js'],
  ['tb-offers.js', 'tb-offers.js'],
  ['tb-social.js', 'tb-social.js'],
  ['tb-retention.js', 'tb-retention.js'],
  ['tb-roadmap.js', 'tb-roadmap.js'],
  ['tb-firebase.js', 'tb-firebase.js'],
  ['firebase-config.js', 'firebase-config.js'],
  ['tb-remote.js', 'tb-remote.js'],
  ['tb-global.js', 'tb-global.js'],
  ['tb-features.js', 'tb-features.js'],
  ['tb-push.js', 'tb-push.js'],
  ['tb-meta.js', 'tb-meta.js'],
  ['tb-juice.js', 'tb-juice.js'],
  ['tb-runtime.js', 'tb-runtime.js'],
  ['tb-secure.js', 'tb-secure.js'],
  ['tb-save.js', 'tb-save.js'],
  ['tb-shop.js', 'tb-shop.js'],
  ['tb-result.js', 'tb-result.js'],
  ['tb-map.js', 'tb-map.js'],
  ['tb-board.js', 'tb-board.js'],
  ['tb-xp.js', 'tb-xp.js'],
  ['tb-collection.js', 'tb-collection.js'],
  ['tb-chests.js', 'tb-chests.js'],
  ['tb-missions.js', 'tb-missions.js'],
  ['tb-events.js', 'tb-events.js'],
  ['tb-challenges.js', 'tb-challenges.js'],
  ['tb-meta-ui.js', 'tb-meta-ui.js'],
  ['tb-gameplay.js', 'tb-gameplay.js'],
  ['tb-music.js', 'tb-music.js'],
  ['tb-ads.js', 'tb-ads.js'],
  ['tb-playbridge.js', 'tb-playbridge.js'],
  ['tb-dialogs.js', 'tb-dialogs.js'],
  ['tb-start.js', 'tb-start.js'],
  ['tb-grid.js', 'tb-grid.js'],
  ['tb-modes.js', 'tb-modes.js'],
  ['tb-a11y.js', 'tb-a11y.js'],
  ['tb-fx.js', 'tb-fx.js'],
  ['tb-input.js', 'tb-input.js'],
  ['tb-main.js', 'tb-main.js'],
  ['remote-config.json', 'remote-config.json'],
  ['icon.svg', 'icon.svg'],
  ['mascot.svg', 'mascot.svg'],
  ['manifest.json', 'manifest.json'],
  ['icon-192.png', 'icon-192.png'],
  ['icon-512.png', 'icon-512.png'],
  ['privacy.html', 'privacy.html'],
];

for (const [src, dest] of copies) {
  const from = path.join(root, src);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, path.join(www, dest));
}

// Copia os módulos CSS (css/*.css) para www/css/
const cssSrcDir = path.join(root, 'css');
if (fs.existsSync(cssSrcDir)) {
  const cssDestDir = path.join(www, 'css');
  fs.mkdirSync(cssDestDir, { recursive: true });
  for (const f of fs.readdirSync(cssSrcDir)) {
    if (f.endsWith('.css')) fs.copyFileSync(path.join(cssSrcDir, f), path.join(cssDestDir, f));
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

const dataSrcDir = path.join(root, 'data');
if (fs.existsSync(dataSrcDir)) {
  copyDirRecursive(dataSrcDir, path.join(www, 'data'));
}

// manifest + sw ficam em www/
const manifestPath = path.join(www, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.start_url = './index.html';
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const htmlSrc = fs.readFileSync(path.join(root, 'tile_blast.html'), 'utf8');
const verMatch = fs
  .readFileSync(path.join(root, 'tb-main.js'), 'utf8')
  .match(/APP_VERSION\s*=\s*'([^']+)'/);
const appVer = verMatch ? verMatch[1] : 'dev';
const swTemplate = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const cacheKey = `tileblast-v${appVer.replace(/\./g, '')}`;
fs.writeFileSync(path.join(www, 'sw.js'), swTemplate.replace('__CACHE_VERSION__', cacheKey));

console.log(`www/ synced from tile_blast.html (SW cache: ${cacheKey})`);
