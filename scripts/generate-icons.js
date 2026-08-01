const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const sizes = [192, 512];

function runPowerShellIcons() {
  const ps1 = path.join(__dirname, 'generate-icons.ps1');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, {
    stdio: 'inherit',
    cwd: root,
  });
}

function copyToWww() {
  const www = path.join(root, 'www');
  if (!fs.existsSync(www)) return;
  for (const size of sizes) {
    const src = path.join(root, `icon-${size}.png`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(www, `icon-${size}.png`));
    }
  }
}

try {
  runPowerShellIcons();
} catch (err) {
  console.warn('PNG icon generation skipped:', err.message);
}

copyToWww();
