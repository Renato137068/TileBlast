import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../helpers/load-module.js';

// Invariante de seguranca: o conteudo app-authored (mundos/eventos/missoes) e o
// Remote Config sao renderizados via innerHTML em varios pontos. Garantir que
// NENHUM valor string contenha HTML (< ou >) torna esses sinks seguros por
// invariante — complementa o escape aplicado a dados de usuario/cloud (ranking,
// nome do jogador). Se alguem adicionar um label com HTML, este teste falha.
const FILES = [
  'remote-config.json',
  'data/worlds.json',
  'data/events.json',
  'data/missions.json',
  'data/challenges.json',
  'data/modes.json',
];

function scanForHtml(value, path, hits) {
  if (typeof value === 'string') {
    if (/[<>]/.test(value)) hits.push(`${path} => ${JSON.stringify(value)}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scanForHtml(v, `${path}[${i}]`, hits));
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) scanForHtml(value[k], `${path}.${k}`, hits);
  }
}

describe('seguranca de conteudo: sem HTML em dados renderizados', () => {
  for (const file of FILES) {
    it(`${file}: nenhum valor string contem < ou >`, () => {
      const p = join(projectRoot, file);
      if (!existsSync(p)) return;
      const hits = [];
      scanForHtml(JSON.parse(readFileSync(p, 'utf8')), file, hits);
      expect(hits, `HTML encontrado em: ${hits.join(' | ')}`).toEqual([]);
    });
  }

  it('scanForHtml detecta HTML (sanidade do teste)', () => {
    const hits = [];
    scanForHtml({ label: '<b>x</b>', ok: 'Jardim 🌱' }, 'x', hits);
    expect(hits.length).toBe(1);
  });
});
