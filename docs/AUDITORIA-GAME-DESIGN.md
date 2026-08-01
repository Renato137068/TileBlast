# AUDITORIA DE PRODUTO E GAME DESIGN — TILE BLAST
### Perspectiva: Game Director Sênior (padrão Dream Games / Peak / King)
### Escopo: apenas Produto e Game Design (sem código, arquitetura, monetização ou UI)

---

## RESUMO EXECUTIVO (leia isto primeiro)

Tile Blast é um **clone funcional do núcleo do Toy Blast** (tocar em grupos de 2+ blocos da mesma cor), envolvido por uma camada de meta-progressão surpreendentemente completa (mundos, estrelas, XP, passe, cofrinho, skins, puzzle diário, modo infinito, ranking semanal, missões, ~55 conquistas).

O problema é brutal e estrutural: **o jogo que está por baixo de toda essa casca é raso.** Depois de examinar as 60 fases, encontrei o defeito que sozinho impede o lançamento comercial:

> **As 60 fases usam o MESMO tabuleiro (8×8 aleatório, 6 cores). A única coisa que muda entre a fase 1 e a fase 60 é o número de movimentos e o número-alvo. Não existe UM ÚNICO obstáculo no jogo inteiro.**

Confirmei isto no design (não no código de programação): a função que valida objetivos só entende dois tipos — `score` (fazer X pontos) e `color` (explodir N blocos de uma cor). Não há gelo, caixa, corrente, gelatina, item para levar ao fundo, balão, nada. Os líderes do gênero constroem 90% da diversão e da retenção exatamente sobre esses obstáculos. Tile Blast não tem nenhum.

Isso responde de forma devastadora à pergunta central da auditoria:
**"Os objetivos mudam a forma de jogar ou apenas mudam números?" → Apenas mudam números.**

**NOTA FINAL: 45/100.** Um shell polido e ambicioso em cima de um núcleo de jogo que ainda não foi projetado.

---

## O QUE O JOGO É, DE FATO (base factual da auditoria)

Para que as notas não pareçam arbitrárias, aqui está o que o jogo realmente faz:

- **Mecânica:** toque em grupos conectados de 2+ blocos da mesma cor para explodi-los (flood-fill). Tabuleiro fixo **8×8**, sempre **6 cores**.
- **Gravidade:** blocos caem na vertical e o topo é reabastecido com blocos aleatórios. **O tabuleiro nunca esvazia** — é um jogo de "collapse com refil infinito", não um puzzle de limpar o tabuleiro.
- **Pontuação:** `n × 10 × multiplicador` (mult. 1.5 com 5+ blocos, 2.0 com 8+).
- **Especiais criados no tabuleiro:** Bomba (grupo de 5+), Foguete (7+), Arco-íris (9+). Não há sistema de **combinar dois especiais** (bomba+foguete, etc.).
- **Power-ups (consumíveis):** bomba, arco-íris, +5 movimentos, embaralhar. São itens de inventário, não boosters integrados ao tabuleiro.
- **Objetivos existentes:** somente `score` e `color`. **Zero obstáculos.**
- **60 fases** (50 + 10 "lendárias"), divididas em 5 mundos temáticos (Jardim, Floresta, Montanha, Oceano, Inferno).
- **Sem layout por fase:** nenhuma fase tem tabuleiro desenhado, formato especial, redução de cores ou posicionamento de peças. Todas partem do mesmo 8×8 aleatório.
- **Estrelas:** definidas só pela % de movimentos restantes (>60% = 3★, >30% = 2★). Não dependem de pontuação.
- **Mascote:** "Blasty" — única tentativa real de identidade própria.

---

# 1. CORE GAMEPLAY — Nota: **62/100**

**"O jogador entende o jogo em menos de 30 segundos?" → SIM, claramente.**

**O que funciona:** a mecânica de tap-to-blast é comprovada, imediata e universalmente legível. O tutorial do Blasty ("toque em 2+ blocos iguais") ensina tudo em uma frase. Feedback tátil, partículas, floaters de pontos e multiplicador dão bom *game feel* momentâneo. Isso é competente.

**Por que não passa de 62:**
- **Profundidade quase nula.** O único eixo de decisão é "exploro o grupo grande agora ou espero ele crescer?". Não há segunda camada (combinar especiais, reagir a obstáculos, planejar limpeza de tabuleiro).
- **Refil infinito remove tensão.** Como o tabuleiro nunca esvazia e sempre há jogada (com reshuffle automático), o jogador raramente sente que "acabou o tabuleiro" — o núcleo perdoa demais.
- **Sem teto de maestria.** Um jogador experiente não tem o que otimizar além de caçar grupos grandes. Toy Blast/Royal Match têm ordem de operações, gatilhos em cadeia e combos de booster que criam maestria.

**Impacto na experiência:** diverte nos primeiros minutos, mas não gera a curva de "estou ficando bom nisso" que retém.

**Como corrigir:** introduzir (a) combinação de especiais com efeitos distintos, (b) obstáculos que exijam planejamento, (c) mecânica de limpar/coletar em vez de só pontuar.

---

# 2. GAMEPLAY LOOP — Nota: **55/100**

**"O loop incentiva 'só mais uma fase'? → Fracamente.**

**O que funciona:** o loop existe e está tecnicamente completo (mapa → fase → vitória → recompensa → próxima). Há reforços de curto prazo (moedas, XP, estrelas, baús, missões).

**Gargalos e problemas de ritmo:**
- **O gatilho "só mais uma" depende de variedade, e não há variedade.** Como a próxima fase é visivelmente o mesmo tabuleiro com outro número, o cérebro não recebe a promessa de novidade que sustenta o vício. O "só mais uma" morre por tédio, não por dificuldade.
- **Excesso de sistemas periféricos competindo com o core.** Passe, cofrinho, skins, ranking semanal, missões diárias/semanais, modo infinito, puzzle diário, conquistas — é muita casca em volta de um núcleo raso. Isso dilui o foco e mascara (não resolve) a falta de profundidade.
- **Vidas (5) como portão** interrompem o loop justamente quando ele deveria fluir — e como o core não é viciante o suficiente, o jogador que bate no portão simplesmente sai e não volta.

**Como corrigir:** encurtar o caminho entre fim-de-fase e início-da-próxima (auto-avançar com 1 toque), e — crucialmente — fazer cada fase prometer algo novo (obstáculo, layout, mecânica) para que o loop tenha combustível.

---

# 3. OBJETIVOS — Nota: **25/100** (o ponto mais crítico do jogo)

**"Os objetivos mudam a forma de jogar ou apenas mudam números? → APENAS mudam números.**

Este é o item que puxa a nota geral para baixo e o motivo de o jogo não competir. Detalhamento factual das 60 fases:

- **Tipo 1 — Score:** "faça X pontos em N movimentos." (fases de aceleração)
- **Tipo 2 — Color:** "explode N blocos da cor Y" (1 a 4 cores por fase).
- **Só isso. Em 60 fases.**

**Por que é um problema gravíssimo:**
- **Nenhum objetivo muda como você joga.** "Explodir 40 vermelhos" e "explodir 40 azuis" são a mesma ação com uma cor diferente. Não há decisão nova.
- **Ausência total de integração com obstáculos** (porque não há obstáculos). No Toy Blast, o objetivo "quebre as caixas" faz você mirar cantos, guardar especiais e mudar a rota. Aqui isso não existe.
- **Objetivos de cor em jogo com refil aleatório viram loteria.** Se a cor-alvo não cai, o jogador perde por RNG, não por decisão — frustração injusta.

**Como corrigir (prioridade máxima):** implementar uma família de objetivos baseados em obstáculos/coleta:
1. **Coletar itens que caem** (levar N frutas ao fundo).
2. **Quebrar gelo/caixas/correntes** que só cedem quando um grupo explode adjacente.
3. **Limpar cobertura** (grama/mel) do tabuleiro inteiro.
4. **Trazer peças presas** de topo a base.
Cada um desses **muda a rota de jogo** — que é o que os líderes fazem.

---

# 4. PROGRESSÃO — Nota: **48/100**

**"O jogador sente que está evoluindo? → Na superfície sim; no jogo em si, não.**

**O que funciona (superfície):** há muitos vetores de progressão numérica — mundos com temas e cores próprias, estrelas por fase, nível de XP, passe de batalha, skins do Blasty, conquistas. Visualmente o mapa avança e o jogador acumula.

**Por que a nota é baixa:**
- **A progressão é só cosmética/numérica; a jogabilidade nunca evolui.** Na fase 55 você joga exatamente o mesmo jogo da fase 3. Nenhuma mecânica nova é desbloqueada ao longo de 60 fases. Isso é o oposto do que define uma boa progressão em puzzle.
- **Mundos são pintura, não design.** "Jardim", "Oceano", "Inferno" mudam a cor do cabeçalho e a música, mas o tabuleiro e as regras são idênticos. Um novo mundo deveria estrear uma mecânica (regra de ouro do King/Dream).
- **Recompensa sem consequência de gameplay.** Ganhar moedas/skins não muda como você joga a próxima fase.

**Como corrigir:** amarrar cada mundo à estreia de uma mecânica (Mundo 2 = gelo; Mundo 3 = caixas; Mundo 4 = coleta; Mundo 5 = combinação de especiais). A progressão passa a ser de *habilidade*, não só de número.

---

# 5. CURVA DE DIFICULDADE — Nota: **50/100**

**"O jogador aprende naturalmente? → Aprende o básico, mas não há o que aprender depois.**

**O que funciona:** as 10 primeiras fases (Mundo Jardim) têm alvos gentis (~80–100 pts/movimento) e alternam score/cor, o que é uma introdução suave e correta. A intenção de calibração existe (há comentários de design com pts/movimento por mundo).

**Problemas:**
- **A curva é uma só alavanca: menos movimentos + número maior.** Dificuldade "real" no gênero vem de novos obstáculos, não de apertar o mesmo parafuso. Aqui a fase 47 é "a fase 5 com menos movimentos".
- **Fases de score com poucos movimentos (11–14) são picos de RNG.** Como o tabuleiro é aleatório e reabastece aleatoriamente, exigir alta pontuação por movimento em poucos turnos transforma vitória em sorte — a principal fonte de frustração injusta.
- **Nenhuma introdução de mecânica** ao longo do jogo — logo não há "momento de aprendizado" além do tutorial inicial.
- **Sem picos e vales projetados.** Bons jogos alternam fases fáceis (respiro) e difíceis (tensão). Aqui a dificuldade é monotonicamente "mais números".

**Como corrigir:** desenhar a curva em torno da introdução de mecânicas (tutorial → prática → teste), com vales de alívio após picos, e garantir solvabilidade mínima em fases de poucos movimentos.

---

# 6. BALANCEAMENTO — Nota: **52/100**

**"O jogo parece justo? → Parcialmente; há fontes reais de injustiça percebida.**

**Problemas de balanceamento:**
- **Especiais mal calibrados para o tabuleiro.** Bomba exige grupo de 5, Foguete de 7 e **Arco-íris de 9 blocos conectados**. Em um 8×8 com 6 cores, grupos de 9+ da mesma cor são raríssimos organicamente — ou seja, **o Arco-íris quase nunca é criado pelo jogador**. Um especial que raramente aparece é um especial mal desenhado.
- **Estrela ligada só à velocidade (movimentos restantes)**, não à pontuação nem à execução. Isso pune quem joga com cuidado e recompensa quem faz jogadas grandes por sorte.
- **RNG sem rede de segurança.** Refil aleatório + objetivos de cor + poucos movimentos = variância alta. Não há garantia de que a cor-alvo apareça em quantidade suficiente.
- **Vitória fácil demais no núcleo (refil infinito + reshuffle automático)** contrasta com picos de score artificiais. A sensação é "fácil e sem graça, até bater num muro de RNG".

**Como corrigir:** baixar limiar do Arco-íris ou permitir criá-lo via combinação; atrelar estrelas a pontuação/objetivos; injetar peças-alvo controladas no refil (pseudo-RNG "misericordioso" como Candy Crush faz); revisar fases de baixo movimento.

---

# 7. DIVERSÃO — Nota: **50/100**

**"Após 30 minutos, o jogador continuará jogando? → Provavelmente não.**

**O que gera satisfação (curto prazo):** o *blast* em si é gostoso — partículas, tremor de tela, floaters, som e háptica de combo entregam um "suco" imediato decente. Os primeiros 5–10 minutos funcionam.

**Por que despenca aos 30 minutos:**
- **Repetição terminal.** Como o tabuleiro é sempre idêntico e nunca há surpresa mecânica, a novidade se esgota rápido.
- **Emoção plana.** Não há momentos de "UAU" projetados: nenhuma reação em cadeia dramática garantida, nenhum boss com comportamento, nenhuma explosão de tela combinada.
- **Sensação de derrota frustrante (RNG), sensação de vitória morna (repetitiva).** As duas pontas emocionais estão fracas.

**Como corrigir:** criar momentos de espetáculo (combos de especiais que limpam meia tela), variedade a cada fase, e uma sensação de vitória escalonada.

---

# 8. ORIGINALIDADE — Nota: **20/100**

**"Se removermos o nome, alguém diferenciaria de Toy Blast? → Não. E ainda seria uma versão empobrecida dele.**

- **Mecânica central é idêntica** à do Toy Blast (tap-to-blast de grupos). Isso por si só não é problema (é um gênero), mas Tile Blast **não adiciona nada** por cima.
- **Tema genérico e sem narrativa.** Jardim → Floresta → Montanha → Oceano → Inferno é o clichê de progressão de bioma, sem história, sem personagem com objetivo, sem gancho emocional. Royal Match tem o Rei e a restauração do castelo; Toy Blast tem os personagens e o mundo de brinquedos.
- **Único ativo de identidade:** o mascote Blasty. É um começo, mas está subaproveitado (aparece em telas, não no gameplay).
- **Ironia crítica:** o jogo copia o núcleo do Toy Blast mas **deixa de fora justamente o que dá identidade e profundidade ao Toy Blast** (obstáculos, personagens, layouts). Copiou a casca e esqueceu o miolo.

**Como corrigir:** definir um gancho temático com propósito (o que o jogador está construindo/salvando?), integrar o Blasty ao gameplay e criar ao menos UMA mecânica-assinatura própria.

---

# 9. COMPARAÇÃO COM TOY BLAST — Nota relativa: **35/100**

| Dimensão | Toy Blast | Tile Blast | Veredito |
|---|---|---|---|
| Gameplay base | Tap-blast + obstáculos + combos | Tap-blast puro | Subconjunto empobrecido |
| Variedade de objetivos | Dezenas (caixas, balões, vidro…) | 2 (score, cor) | Muito inferior |
| Layouts de fase | Desenhados à mão, milhares | Nenhum (8×8 aleatório) | Ausente |
| Retenção | Altíssima (obstáculos + narrativa) | Baixa (repetição) | Muito inferior |
| Game feel | Rico, combos em cadeia | Decente, mas simples | Inferior |
| Identidade | Personagens, mundo próprio | Mascote subutilizado | Muito inferior |
| Progressão | Mecânicas novas constantes | Só números | Muito inferior |

**Conclusão:** Tile Blast é hoje "Toy Blast sem os obstáculos, sem os layouts e sem a narrativa" — ou seja, exatamente as três coisas que fazem o Toy Blast funcionar.

---

# 10. COMPARAÇÃO COM ROYAL MATCH — Nota relativa: **28/100**

| Dimensão | Royal Match | Tile Blast | Veredito |
|---|---|---|---|
| Ritmo | Rápido, sem fricção, auto-fluxo | Interrompido por vidas e telas | Inferior |
| Polimento | Referência do mercado | Casca competente, core cru | Muito inferior |
| Progressão | Restaurar áreas + mecânicas novas | Só números/cosméticos | Muito inferior |
| Variedade | Enorme (obstáculos, eventos ao vivo) | Mínima | Muito inferior |
| Recompensa | Combos de booster espetaculares | Especiais isolados, sem combo | Inferior |
| Dificuldade | Curva desenhada, testada | Uma alavanca (movimentos) | Muito inferior |
| Sensação de vitória | Escalonada e narrativa | Morna e repetitiva | Inferior |

**Conclusão:** Royal Match está a várias gerações de design à frente. O gap não é de acabamento — é de **conteúdo e sistemas de gameplay**. Nenhum polimento tampa a ausência de obstáculos, combos de booster e progressão de mecânicas.

---

# ANÁLISE CRÍTICA (respostas obrigatórias)

**• O que faria um jogador desistir nas primeiras 10 fases?**
Provavelmente nada — o Mundo Jardim é fácil e o blast é gostoso. O perigo real vem **entre as fases 12 e 25**, quando o jogador percebe que "é sempre a mesma coisa" e algumas fases de poucos movimentos punem por RNG. A desistência é por **tédio + frustração injusta**, não por dificuldade legítima.

**• O que faria um jogador continuar jogando?**
O *game feel* imediato do blast, a camada de recompensas de curto prazo (moedas, missões, baús, XP) e o ranking/puzzle diário para os competitivos. São muletas de retenção; sustentam dias, não semanas.

**• Em quais momentos o jogo fica repetitivo?**
A partir da ~fase 10–15, e de forma terminal por volta dos 30 minutos de sessão. A repetição é estrutural: mesmo tabuleiro, mesmas regras, objetivos que só trocam número/cor.

**• O que falta para o efeito "só mais uma fase"?**
**Promessa de novidade a cada fase.** Hoje a próxima fase não promete nada novo. Faltam: obstáculos que estreiam, layouts variados, mecânicas por mundo, momentos de espetáculo e uma meta narrativa ("só mais uma para desbloquear X").

**• Quais mecânicas parecem superficiais?**
Os "mundos" (só cor/música); os objetivos de cor (loteria disfarçada de meta); o Arco-íris (limiar 9 quase inatingível); as estrelas (só velocidade).

**• Quais mecânicas poderiam ser removidas sem fazer falta?**
O problema não é excesso de meta, é ausência de core — então nenhuma da casca precisa sair agora. Mas se o objetivo é focar recursos, **ranking semanal e modo infinito** poderiam ser adiados sem impacto na diversão central. O esforço deve migrar da casca para o núcleo.

**• Quais mecânicas deveriam ser aprofundadas?**
Especiais → **sistema de combinação** (maior ganho de diversão por esforço); Objetivos → **família de obstáculos**; Blasty → **integração ao gameplay**; Mundos → **estreia de mecânica**.

---

# PRIORIZAÇÃO — OS 20 PROBLEMAS MAIS IMPORTANTES

Prioridade = (Impacto alto + Dificuldade baixa) primeiro. Escala 1–10.

| # | Problema | Impacto | Dificuldade | Prioridade |
|---|---|:---:|:---:|:---:|
| 1 | Nenhum obstáculo no jogo (só score/cor) | 10 | 8 | **CRÍTICA** |
| 2 | 60 fases usam o mesmo tabuleiro aleatório (zero layout) | 10 | 7 | **CRÍTICA** |
| 3 | Objetivos só mudam números, não a forma de jogar | 10 | 7 | **CRÍTICA** |
| 4 | Nenhuma mecânica nova é desbloqueada em 60 fases | 9 | 6 | **CRÍTICA** |
| 5 | Sem combinação de especiais (bomba+foguete etc.) | 9 | 5 | **ALTA** |
| 6 | Repetição terminal aos ~30 min | 9 | 7 | **ALTA** |
| 7 | Objetivos de cor viram RNG (cor pode não cair) | 8 | 4 | **ALTA** |
| 8 | Arco-íris exige grupo de 9 (quase inatingível) | 7 | 2 | **ALTA** |
| 9 | Fases de score com poucos movimentos = loteria | 8 | 4 | **ALTA** |
| 10 | Ausência de momentos de "UAU"/espetáculo | 8 | 5 | **ALTA** |
| 11 | Estrelas ligadas só à velocidade, não a mérito | 6 | 3 | **MÉDIA** |
| 12 | Mundos são só cosméticos (não estreiam mecânica) | 8 | 6 | **ALTA** |
| 13 | Sem narrativa/gancho temático (meta emocional) | 7 | 6 | **MÉDIA** |
| 14 | Mascote Blasty fora do gameplay (identidade fraca) | 6 | 5 | **MÉDIA** |
| 15 | Curva de dificuldade de alavanca única (movimentos) | 8 | 6 | **ALTA** |
| 16 | Refil infinito remove tensão do tabuleiro | 7 | 7 | **MÉDIA** |
| 17 | Vidas cortam o loop antes de ele viciar | 6 | 3 | **MÉDIA** |
| 18 | Sem picos/vales de dificuldade projetados | 6 | 5 | **MÉDIA** |
| 19 | Excesso de casca de meta mascara core raso | 5 | 4 | **MÉDIA** |
| 20 | Sensações de vitória/derrota planas | 7 | 5 | **ALTA** |

---

# TABELA DE NOTAS

| Área | Nota |
|---|:---:|
| Core Gameplay | 62 |
| Gameplay Loop | 55 |
| Objetivos | 25 |
| Progressão | 48 |
| Curva de Dificuldade | 50 |
| Balanceamento | 52 |
| Diversão | 50 |
| Originalidade | 20 |
| Comparação com Toy Blast (relativa) | 35 |
| Comparação com Royal Match (relativa) | 28 |

---

# NOTA FINAL: **45/100**

### Por que 45 e não mais

O jogo tem um **shell de produto acima da média para um projeto indie** — a quantidade de sistemas de meta-progressão, localização (PT/EN/ES), acessibilidade e polimento de feedback é real e conta pontos. É isso que sustenta a nota em 45 e não em 25.

Mas a auditoria é sobre **diversão e game design do produto comercial**, e aí o veredito é duro: **o núcleo do jogo — as fases — não foi projetado.** É um tabuleiro de teste (8×8 aleatório) repetido 60 vezes com números diferentes. Sem obstáculos, sem layouts, sem mecânicas novas e sem combos de especiais, o jogo não tem como reter jogador nem competir com Toy Blast/Royal Match. Toda a diversão de médio/longo prazo do gênero vive exatamente nas peças que faltam aqui.

### O que impede o jogo de chegar a 90/100

Três ausências, em ordem de gravidade:
1. **Ausência de obstáculos e objetivos que mudam a jogada** (teto de diversão travado).
2. **Ausência de design de fases** (60 tabuleiros idênticos ≠ 60 fases).
3. **Ausência de progressão de mecânicas** (o jogo nunca ensina nada novo depois do minuto 1).

Enquanto essas três não forem resolvidas, nenhum ajuste de casca (mais skins, mais eventos, mais ranking) move a nota de diversão.

### AS 10 MELHORIAS QUE MAIS AUMENTARIAM A NOTA

1. **Implementar uma família de obstáculos** (gelo, caixa, corrente, cobertura, coleta que cai ao fundo) e novos tipos de objetivo atrelados a eles. *(destrava o teto de diversão)*
2. **Criar layouts de fase desenhados à mão** — formatos de tabuleiro, posicionamento de peças e obstáculos por fase. *(transforma "60 tabuleiros" em "60 fases")*
3. **Estrear uma mecânica nova por mundo** (Mundo 2 gelo, Mundo 3 caixas, Mundo 4 coleta, Mundo 5 combos). *(progressão de habilidade)*
4. **Sistema de combinação de especiais** (bomba+foguete, arco-íris+especial) com efeitos espetaculares. *(diversão e maestria)*
5. **Rebalancear especiais** — baixar limiar do Arco-íris e permitir criá-lo por combinação. *(barato e alto impacto)*
6. **RNG misericordioso** — injetar peças-alvo controladas no refil para eliminar derrotas por azar. *(justiça percebida)*
7. **Redesenhar a curva de dificuldade** com introdução→prática→teste e vales de alívio após picos. *(ritmo)*
8. **Momentos de espetáculo garantidos** (reações em cadeia, limpeza de tela em combos grandes). *(sensação de vitória)*
9. **Gancho temático/narrativa leve** com o Blasty integrado ao gameplay e a uma meta ("restaure o jardim"). *(identidade + "só mais uma")*
10. **Atrelar estrelas a mérito** (pontuação/objetivos), não só a velocidade, e suavizar o portão de vidas nas fases iniciais. *(incentivo alinhado)*

### Nota estimada após implementar as 10 melhorias: **~75/100**

Justificativa: as melhorias 1–4 sozinhas elevam Objetivos (25→70+), Progressão (48→72), Diversão (50→75) e Originalidade (20→45, se houver ao menos uma mecânica-assinatura). Isso levaria o produto de "clone raso não-lançável" para "entrada competitiva e comercialmente viável" no gênero. Chegar a 90 exigiria, além disso, **volume de conteúdo (300+ fases desenhadas), eventos ao vivo e polimento/testes de mercado** que só se conquistam com iteração pós-lançamento — por isso 75, e não 90, é a meta realista da primeira rodada.

---
*Auditoria focada exclusivamente em Produto e Game Design, conforme solicitado. Não foram avaliados código, arquitetura, monetização ou UI.*
