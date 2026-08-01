import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from './load-module.js';

export function loadContentDataFromDisk() {
  const dataDir = join(projectRoot, 'data');
  const worlds = JSON.parse(readFileSync(join(dataDir, 'worlds.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(dataDir, 'levels', 'manifest.json'), 'utf8'));
  const levelPacks = manifest.packs.map((p) =>
    JSON.parse(readFileSync(join(dataDir, 'levels', p.file), 'utf8'))
  );
  const events = JSON.parse(readFileSync(join(dataDir, 'events.json'), 'utf8'));
  const modes = JSON.parse(readFileSync(join(dataDir, 'modes.json'), 'utf8'));
  const challenges = JSON.parse(readFileSync(join(dataDir, 'challenges.json'), 'utf8'));
  const missions = JSON.parse(readFileSync(join(dataDir, 'missions.json'), 'utf8'));
  const adminSchema = JSON.parse(readFileSync(join(dataDir, 'admin-schema.json'), 'utf8'));
  return { worlds, manifest, levelPacks, events, modes, challenges, missions, adminSchema };
}
