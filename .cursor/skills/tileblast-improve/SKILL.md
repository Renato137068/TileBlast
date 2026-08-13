---
name: tileblast-improve
description: >-
  Implements prioritized Tile Blast improvements from an audit or roadmap
  slice with tests and sync:www. Use when fixing P0/P1 findings, continuing
  roadmap, or applying audit recommendations.
---

# Tile Blast — Improve

## Goal

Implementar **uma fatia** priorizada (preferir 1–3 itens P0/P1) com verificação. App em Play testing → estabilidade > feature nova.

## Procedure

1. Confirmar escopo (lista do audit ou roadmap). Se vago, escolher o P0 mais barato.
2. Editar **raiz** (`tb-*.js`, etc.), nunca só `www/`.
3. Testes: unit do módulo + e2e se tocar boot/mapa/jogo/loja.
4. `npm run sync:www` ao final de mudanças de assets/HTML/JS.
5. Respeitar `.cursor/rules` (Play safety): não commit/push/release sem pedido.

## Done criteria

- [ ] Mudança mínima que resolve o achado
- [ ] Teste novo ou atualizado (ou justificativa se só config/docs)
- [ ] Comandos relevantes passaram
- [ ] Roadmap/checklist atualizado se marco fechado

## Output

Resumo curto: o que mudou, como verificar, próximo item sugerido.
