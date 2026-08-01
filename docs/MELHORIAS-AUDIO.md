# MELHORIAS DE ÁUDIO — IMPLEMENTADAS

Ataquei os problemas da auditoria de áudio que são codificáveis dentro da abordagem sintetizada
(Web Audio), e corrigi um bug latente. O que NÃO dá para fazer aqui: substituir por assets
produzidos por sound designer (a recomendação nº 1) — isso exige gravação/produção e ouvido humano.

## O que entrou
- **Motor de síntese com barramento master + limiter** (compressor) — acaba com o risco de
  saturação em combos e dá corpo. Envelopes melhores e **variação de pitch por disparo** (anti-fadiga).
- **Blast que escala com o tamanho do grupo** — grupos maiores soam mais graves, densos e com mais
  "crunch" de ruído (antes: um bipe fixo).
- **Escada de combo** — quanto maior a cadeia, mais camadas e um clímax no topo.
- **Fanfarra de vitória escalonada por estrelas** (1★/2★/3★, com stinger e brilho no 3★).
- **Eventos antes MUDOS agora têm som próprio:** moeda, baú, estrela (uma por uma), desbloqueio de
  mundo, quebra de **gelo/caixa/corrente** (texturas distintas), coletável no fundo, **board‑clear
  grandioso**, e **quase‑vitória** ("faltou pouco") distinta da derrota comum.
- **Tensão nos últimos 3 movimentos** (nota de suspense que sobe).
- **Música mais audível** (volume 0,11 → 0,2), com **percussão** (hi‑hat + kick) e **ducking**
  (a trilha abaixa sob os SFX importantes) — melhora mixagem e groove.

## Bug corrigido (importante)
As chamadas que eu havia adicionado com o guard `if(window.Sound)` **nunca disparavam** — `Sound`
é um `const` de escopo, não uma propriedade de `window`. Ou seja, até o som do board‑clear da
rodada anterior estava **silencioso no navegador**. Troquei por chamada direta a `Sound`; agora toca.

## Validação (motor real, headless)
- Smoke de áudio com `AudioContext` mockado: **8/8 PASS** — os 19 SFX existem e cada um **gera áudio
  sem erro**; `Music.duck` existe; blast e fanfarra escalam (fanfarra 3★ mais rica que 1★, 27 vs 16
  nós); e o **wiring** dispara som em `removeGroup` (blast), quebra de gelo e board‑clear.
- Sintaxe do jogo compila (0 erros); vitest verde; arquivo íntegro; `www/` sincronizado.

## Teto honesto
Isto eleva a nota de áudio de forma real (mixagem, completude de eventos, escala e ducking), mas
**continua sendo áudio sintetizado por osciladores**, não produzido. Sair de ~33 para a faixa de
Toy Blast/Royal Match exige **biblioteca de sons produzidos, música gravada multicamada e voz do
mascote** — trabalho de sound designer com assets, que este ambiente não permite criar nem, o mais
importante, **ouvir e ajustar**. O próximo passo de verdade é um playtest com áudio ligado no
navegador (e, idealmente, um pacote de assets).
