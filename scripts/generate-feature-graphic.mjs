import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const candidates = [
  path.join(root, 'play-store', 'assets', 'feature-graphic.svg'),
  path.join(root, 'play-store', 'feature-graphic.svg'),
];

const svgPath = candidates.find((p) => fs.existsSync(p));
if (!svgPath) {
  console.error('feature-graphic.svg not found in play-store/assets/ or play-store/');
  process.exit(1);
}

const outPath = path.join(root, 'play-store', 'assets', 'feature-graphic-1024x500.png');

await sharp(fs.readFileSync(svgPath)).resize(1024, 500, { fit: 'cover' }).png().toFile(outPath);

const size = fs.statSync(outPath).size;
console.log(`✓ Feature graphic gerado: ${outPath}`);
console.log(`  Dimensões: 1024×500 | Tamanho: ${(size / 1024).toFixed(1)} KB`);
