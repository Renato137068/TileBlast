# IMPLEMENTAÇÃO DAS 10 MELHORIAS — TILE BLAST

Todas as 10 melhorias priorizadas na auditoria foram implementadas no jogo real
(`tile_blast.html`, `tb-game-logic.js`) e cobertas por testes. Abaixo, o que mudou.

## O que foi feito

**#1 Motor de obstáculos + novos objetivos** — o jogo agora tem 4 obstáculos reais:
🧊 Gelo (quebra por explosão adjacente), 📦 Caixa (destrói por adjacência), 🍒 Coleta
(leve o item até o fundo do tabuleiro) e 🟩 Cobertura/lava (limpa ao explodir por cima).
Novos tipos de objetivo: `ice`, `crate`, `collect`, `cover`. `checkObjectives` agora é
genérico; o HUD e a barra de progresso renderizam cada tipo com ícone e contagem.

**#2 Layouts / setup por fase** — cada fase pode declarar `setup` (ex.: `iceHp:2`) e os
obstáculos são posicionados conforme o alvo do objetivo (`placeObstacles`). "60 tabuleiros
idênticos" viraram fases com composição própria.

**#3 Mecânica nova por mundo** — Jardim (base) → Floresta (gelo) → Montanha (caixa) →
Oceano (coleta) → Inferno (cobertura + combos). Cada mundo estreia um obstáculo, com
introdução generosa → prática → fase-teste/chefão.

**#4 Combinação de especiais** — `gatherBlast` faz reação em cadeia: um especial atingido
por outro detona junto. Em cadeia, a Bomba vira 5×5 e o Foguete vira cruz (linha+coluna).
Combos disparam "💥 COMBO ×N".

**#5 Rebalanceamento de especiais** — limiares baixados: Bomba 5→4, Foguete 7→6,
Arco-íris 9→8 (agora realmente atingível em 8×8/6 cores).

**#6 RNG misericordioso** — `mercyRefillType`: ao reabastecer o topo, com ~30% de chance
força a peça para uma cor ainda necessária, reduzindo derrotas por azar.

**#7 Curva de dificuldade redesenhada** — deixou de ser "uma alavanca" (menos movimentos +
número maior). Agora alterna picos e vales (fases de score de alívio) e progride por
mecânica. Movimentos generosos nas fases de obstáculo, tensos nas de score.

**#8 Momentos de espetáculo** — combos com shake ampliado (16), háptica, burst de tela,
bomba 5×5 e cruz de foguete criam limpezas grandes e satisfatórias.

**#9 Narrativa/Blasty no gameplay** — o mascote Blasty ensina a mecânica de cada mundo na
primeira fase dele (toast + falas por mundo), integrando o mascote à jogabilidade.

**#10 Estrelas por mérito + portão de vidas** — `calcStarsMerit` combina eficiência
(movimentos restantes) e superação da meta (score). As 5 primeiras fases não consomem vida.

## Arquivos alterados
- `tb-game-logic.js` — objetivos genéricos, `calcStarsMerit`, `adjacentObstacleCells`,
  `mercyRefillType`, `getGroup` ciente de obstáculos.
- `tile_blast.html` — motor de obstáculos, combinação de especiais, render (gelo/caixa/
  coleta/cobertura), RNG misericordioso, estrelas por mérito, vidas, 50 fases redesenhadas,
  falas do Blasty por mundo.
- `tests/unit/obstacles.test.js` (novo) + `tests/integration/levels-logic.test.js` (atualizado).

## Validação
- Testes: **toda a suíte unitária + integração passou** (lógica pura de obstáculos, combos,
  estrelas por mérito, RNG, objetivos, dados das 60 fases, boot dos módulos).
- Sintaxe: script inline do HTML e `tb-game-logic.js` compilam sem erros (esbuild/node).
- **Pendente**: playtest manual no navegador (abra `tile_blast.html`) para validar sensação
  e visual dos obstáculos — não foi possível automatizar (o Chrome não estava conectado).

## Impacto esperado na nota
As mudanças atacam diretamente os itens que travavam a nota: Objetivos (25→~70),
Progressão (48→~72), Diversão (50→~75) e Originalidade (20→~45). Estimativa de nota
geral após playtest e ajuste fino: **~75/100** (de 45).
