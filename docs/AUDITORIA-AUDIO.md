# AUDITORIA DE DESIGN DE ÁUDIO — TILE BLAST
### Audio Director Sênior (Royal Match / Toy Blast / Toon Blast / Candy Crush / Angry Birds)
### Escopo: exclusivamente ÁUDIO. Sem código, gráficos, UI ou monetização.

---

## BASE FACTUAL (o que o jogo realmente toca)

Auditei a implementação sonora. O achado que define tudo:

> **Não existe UM ÚNICO arquivo de áudio no projeto.** 100% do som é sintetizado ao vivo por
> osciladores (sine/square/triangle) e ruído branco. Não há samples gravados, nem instrumentos
> reais, nem voz, nem "one-shots" produzidos.

- **SFX:** bipes de 1 a 4 tons. `pop` = um seno de ~460 Hz (0,09 s). `combo` = 3 senos
  ascendentes. `win` = arpejo de 4 senos. `lose` = 3 ondas quadradas descendentes. `click` =
  seno 880 Hz. `shuffle` = estouro de ruído. `special/levelUp` = 2–4 tons.
- **Música:** procedural e **monofônica** — uma melodia (14–15 notas) + um baixo esparso por
  mundo, um oscilador, volume **0,11** (quase inaudível), em **loop curto (~5–6 s)**.
- **Háptica:** padrões de vibração (light/medium/heavy/win/lose) — decentes, é o ponto forte.
- **Buracos:** não há som dedicado para **moeda, baú, desbloqueio, estrela, quebra de gelo/caixa/
  corrente, coletável chegando ao fundo, quase-vitória, board-clear, troca de mundo, missão
  concluída**. Tudo isso reaproveita `click`/`pop`/`special` — inclusive os "momentos" mais novos.

**Resposta à pergunta central:** **o áudio hoje APENAS acompanha o gameplay — não aumenta a
diversão.** Ele informa que algo aconteceu (feedback funcional), mas não entrega a satisfação,
o "suco" e a identidade que, no gênero, fazem do áudio um multiplicador de diversão.

---

## 1. IDENTIDADE SONORA — **20/100**
O jogo **não tem personalidade sonora**. São bipes de oscilador que poderiam pertencer a
qualquer protótipo HTML5. Não há um *motif* (tema curto reconhecível), não há um som-assinatura
para o "blast", não há voz/grunhido do mascote Blasty. Os "temas por mundo" são apenas arrays de
notas diferentes no mesmo motor — variação, não identidade. **Impacto:** o jogador não associa
nenhum som à marca; fecha o jogo sem lembrar de nada que ouviu. **Correção:** criar um logo
sonoro (mnemônico de marca), um som-assinatura de blast com camadas (transiente + corpo + cauda)
e dar voz ao Blasty.

## 2. MÚSICA — **28/100**
**"Convida a continuar ou cansa rápido?" → Cansa rápido, e provavelmente é desligada.**
Qualidade: baixa (chiptune monofônico sem percussão, sem harmonia real, sem produção). Ritmo:
existe, mas sem groove (sem bateria). Repetição: **severa** — loop de ~5–6 s idêntico ao
infinito. Volume: **baixo demais (0,11)** — some sob os SFX. Duração/adequação: as intervalos são
agradáveis e há variação por mundo (mérito), mas a ausência de camadas, dinâmica e percussão faz
a trilha soar amadora e repetitiva em 2–3 minutos. Emoção transmitida: quase nula. **Correção:**
faixas produzidas (ou pelo menos multicamada com percussão e harmonia), loops mais longos com
variações A/B, e intensidade dinâmica.

## 3. EFEITOS SONOROS — **32/100**
**"Cada ação importante tem feedback satisfatório? → Não; muitas nem têm som próprio.**
- Clique: OK, funcional, mas genérico.
- Explosão de blocos: um seno curto — **sem peso, sem "crunch"**, não escala com o tamanho do
  grupo além de um leve shift de frequência.
- Power-ups/combos: 3 tons — informam, não empolgam.
- Vitória/derrota: existem (ver §5/§6).
- **Moeda, baú, desbloqueio, estrela, quebra de obstáculo, coleta, progressão: SEM SOM DEDICADO.**
  Isso é grave — são exatamente os momentos de recompensa que o gênero sonoriza com carinho.
**Impacto:** o loop de recompensa perde metade do seu "dopamine hit" por falta de áudio.
**Correção:** biblioteca de one-shots produzidos, um por ação, com variação para evitar fadiga.

## 4. FEEDBACK AUDITIVO — **50/100** (o ponto relativamente menos ruim)
De olhos fechados dá para distinguir pop, combo, vitória e derrota — **clareza e sincronização
estão razoáveis** (os tons disparam junto com a ação). O que falta é **intensidade e impacto**:
os sons são finos e de baixa energia, então o feedback é legível mas não *sentido*. **Correção:**
transientes fortes, camadas graves e uma leve compressão para dar corpo.

## 5. SENSAÇÃO DE VITÓRIA — **38/100**
**Informa que venceu; não faz sentir "consegui!".** Um arpejo de 4 senos + háptica é o mínimo.
Não há fanfarra, não há camadas (metais/coro/percussão), não escala com 1★/2★/3★, e o board-clear
que adicionei toca o mesmo `special()` fininho — **o clímax visual é sonoramente mudo**.
**Correção:** fanfarra produzida escalonada por estrelas, "risers" antes do resultado e um stinger
de marca no 3★.

## 6. SENSAÇÃO DE DERROTA — **40/100**
Três ondas quadradas descendentes = o clichê "fail" barato. É neutro tendendo a levemente
desagradável, e **não convida à revanche** (não há um motif caloroso de "quase lá / tente de
novo"). Com a mecânica de quase-vitória que adicionei, a derrota apertada merecia um som
específico — hoje não tem. **Correção:** derrota suave e encorajadora (não punitiva) + um som
distinto de "faltou pouco".

## 7. PROGRESSÃO SONORA — **28/100**
A música muda de tema por mundo (única progressão real). Mas **os SFX nunca evoluem**: combos não
ganham camadas ao encadear, não há novas celebrações ao avançar, não há intensificação sonora nos
mundos finais. O jogo soa igual na fase 3 e na fase 55. **Correção:** combos com escada sonora
(quanto maior a cadeia, mais rica a resposta), e celebrações novas em marcos (10/25/50 fases).

## 8. MIXAGEM — **38/100**
Desequilíbrio claro: **música 0,11 vs SFX 0,35–0,45** — a trilha desaparece. Sem barramento
master com compressão/limiter, sem *ducking* (a música não abaixa nos momentos de SFX), e em
combos grandes vários `tone()` disparam juntos podendo **saturar/clipar** ásperamente. Falta
mastering. **Correção:** bus master com limiter, ducking sidechain simples, e balancear níveis.

## 9. EMOÇÃO — **25/100**
Quais emoções desperta? Na melhor hipótese, **satisfação leve** num combo grande. Alegria,
surpresa, tensão, curiosidade e orgulho estão praticamente ausentes — o som é funcional e frio.
Não há build-up de tensão nos últimos movimentos, não há "aah" de alívio na vitória apertada, não
há surpresa sonora. **Impacto:** o áudio não participa da montanha-russa emocional; é um relógio,
não um co-autor da diversão.

## 10. COMPARAÇÃO (só áudio)
- **Royal Match:** referência absoluta — SFX produzidos e "amanteigados", trilha com camadas,
  voz do Rei, stingers de recompensa que dão vontade de jogar de novo. Tile Blast está em outra
  categoria (beeps vs produção AAA-mobile). ~15% do impacto.
- **Toy Blast / Toon Blast:** SFX carismáticos, vozes dos personagens, fanfarras memoráveis,
  trilha alegre e variada. Tile Blast não tem voz, nem fanfarra, nem carisma sonoro. ~20%.
- **Candy Crush:** o "Sweet!/Delicious!" e os sons de doce são *identidade de marca* por áudio.
  Tile Blast não tem nenhum equivalente. ~18%.
Em impacto, personalidade, diversão, qualidade e variedade, o áudio atual perde em todas as
dimensões, por larga margem.

---

## EXERCÍCIO — 30 MINUTOS OUVINDO

**Sons que começam a incomodar:** a **música em loop curto** (a mesma frase a cada ~5 s vira
tortura por volta dos 5–8 min — a maioria vai mutar); a **onda quadrada da derrota** (áspera); o
`click` repetido em navegação.
**Sons que dão prazer:** o **arpejo de combo** grande e o **levelUp** ascendente — os únicos com
um respingo de recompensa; a **háptica** de combo/vitória (o melhor do pacote).
**Sons que faltam:** moeda, baú, desbloqueio, estrela, quebra de gelo/caixa/corrente, coletável no
fundo, board-clear, fanfarra de vitória em camadas, riser de tensão, voz do mascote, logo sonoro.
**Sons repetitivos:** praticamente todos os SFX (sem variação) e a música.
**Sons que deveriam ser substituídos:** o `pop` (por um blast com peso e variação por tamanho), a
`win` (por fanfarra escalonada), a `lose` (por algo caloroso), e a música inteira (por trilha
produzida multicamada).

---

## 20 PRINCIPAIS PROBLEMAS (Diversão / Retenção / Dif. de correção, 1–10)

| # | Problema | Div. | Ret. | Dif. | Prioridade |
|---|---|:--:|:--:|:--:|:--:|
| 1 | Nenhum asset produzido — tudo são beeps de oscilador | 10 | 9 | 8 | **MÁXIMA** |
| 2 | Explosão de bloco sem peso/"crunch" nem escala real | 10 | 8 | 6 | **MÁXIMA** |
| 3 | Vitória sem fanfarra em camadas (não dá "consegui!") | 9 | 8 | 6 | **MÁXIMA** |
| 4 | Música monofônica em loop curto → cansa/é mutada | 8 | 9 | 7 | **MÁXIMA** |
| 5 | Ações de recompensa sem som (moeda/baú/estrela/desbloqueio) | 9 | 8 | 5 | **ALTA** |
| 6 | Board-clear e combos novos sem áudio próprio | 9 | 6 | 4 | **ALTA** |
| 7 | Sem identidade/logo sonoro nem motif de marca | 8 | 7 | 5 | **ALTA** |
| 8 | Sem voz/carisma do mascote Blasty | 7 | 7 | 6 | **ALTA** |
| 9 | Quebra de obstáculos sem SFX dedicado | 8 | 6 | 5 | **ALTA** |
| 10 | Combos não escalam sonoramente (sem escada) | 8 | 6 | 5 | **ALTA** |
| 11 | Mixagem desbalanceada (música 0,11 vs SFX 0,45) | 6 | 6 | 3 | **ALTA** |
| 12 | Sem limiter/ducking → risco de saturação em combos | 6 | 5 | 4 | **MÉDIA** |
| 13 | Derrota áspera e não encorajadora | 6 | 7 | 3 | **ALTA** |
| 14 | Sem build-up de tensão nos últimos movimentos | 7 | 6 | 5 | **MÉDIA** |
| 15 | Progressão sonora inexistente (soa igual do início ao fim) | 7 | 7 | 6 | **MÉDIA** |
| 16 | Zero variação por disparo → fadiga auditiva | 7 | 6 | 4 | **ALTA** |
| 17 | Sem SFX de quase-vitória (mecânica já existe, muda) | 5 | 6 | 3 | **MÉDIA** |
| 18 | Coletável chegando ao fundo sem som de recompensa | 6 | 5 | 4 | **MÉDIA** |
| 19 | Sem transições/stingers entre telas e mundos | 5 | 5 | 4 | **MÉDIA** |
| 20 | Sem "sweetener" de streak/combo-de-fases | 6 | 6 | 5 | **MÉDIA** |

---

## 20 MELHORIAS (ordenadas por prioridade)

1. Substituir todos os SFX por **one-shots produzidos** (biblioteca profissional).
2. **Blast com peso e escala** (transiente + corpo + cauda; muda com o tamanho do grupo).
3. **Fanfarra de vitória escalonada** por 1★/2★/3★, com stinger de marca no 3★.
4. **Trilha produzida multicamada** (percussão + harmonia), loops longos com variação A/B.
5. **SFX de recompensa** dedicados: moeda, baú, estrela, desbloqueio, missão.
6. **Áudio dos momentos-clímax**: board-clear e combo Arco-íris+Arco-íris com som épico próprio.
7. **Logo sonoro / motif de marca** (3–5 notas) tocado no splash e nas vitórias.
8. **Voz do Blasty** (grunhidos/frases curtas) em blast grande, vitória e derrota.
9. **SFX de quebra** de gelo (rachar), caixa (estilhaçar), corrente (romper) — táteis e distintos.
10. **Escada de combo**: cada elo da cadeia sobe camada/pitch, culminando num "clímax" sonoro.
11. **Balancear a mixagem** e criar um **bus master com limiter**.
12. **Ducking** simples (música abaixa levemente durante SFX importantes).
13. **Derrota calorosa** + som específico de **"faltou pouco"** (revanche).
14. **Build-up de tensão** nos últimos 3 movimentos (batida acelera / filtro).
15. **Progressão sonora**: novas camadas/celebrações a cada mundo e em marcos (10/25/50 fases).
16. **Variação por disparo** (round-robin/pitch aleatório) para eliminar fadiga.
17. **Coletável no fundo** com "ding" de recompensa satisfatório.
18. **Stingers de transição** entre telas e ao entrar em um novo mundo.
19. **Sweetener de streak** (vitórias em sequência) e de daily reward.
20. **Ambiências por mundo** (leves) para dar atmosfera (folhas, água, lava).

---

## NOTAS

| Área | Nota |
|---|:--:|
| Identidade Sonora | 20 |
| Música | 28 |
| Efeitos Sonoros | 32 |
| Feedback Auditivo | 50 |
| Vitória | 38 |
| Derrota | 40 |
| Progressão Sonora | 28 |
| Mixagem | 38 |
| Emoção | 25 |

### NOTA FINAL: **33/100**

**Por quê:** o áudio é **funcional** — sincroniza, é legível, e a háptica é boa — o que evita a
nota de "quebrado". Mas em tudo que faz o áudio *aumentar a diversão* (identidade, satisfação
física do blast, fanfarra, emoção, progressão, produção) ele fica muito abaixo do padrão
comercial, porque é **integralmente sintetizado por osciladores, sem um único asset produzido**,
com música monofônica repetitiva e vários momentos de recompensa **mudos**. Para um jogo que
pretende competir no gênero mais polido do mobile, 33 reflete um áudio de protótipo, não de
produto.

---

## RESULTADO FINAL

### "Se o áudio fosse removido completamente, quanta diversão se perderia?"
**Tecnicamente, muito pouco — na ordem de 5–10%.** E isso é a crítica mais dura possível: nos
líderes do gênero, remover o áudio destruiria grande parte do "juice" e da satisfação; aqui, como
o som é fino, repetitivo e a música é quase inaudível (e será mutada por muitos jogadores), o jogo
mudo perde quase nada. **Um áudio que pode ser removido sem custo é um áudio que não está fazendo
o seu trabalho.** A háptica, aliás, sozinha carrega hoje mais "impacto" do que o som.

### "O áudio atual ajuda a competir com Toy Blast e Royal Match?"
**Não — é uma desvantagem competitiva.** Nesses jogos o áudio é um **motor primário de
satisfação e identidade** (SFX amanteigados, vozes, fanfarras, trilha produzida). No Tile Blast o
áudio é **feedback mínimo** feito de bipes. A distância não é de ajuste fino; é **categórica**
(áudio produzido vs. osciladores de programador). Enquanto o jogo não trocar os beeps por uma
biblioteca produzida, sonorizar os momentos de recompensa/clímax e reforçar música e mixagem, o
áudio continuará *acompanhando* o gameplay — nunca elevando-o.

---
*Auditoria exclusivamente de design de áudio, conforme solicitado. Nenhum som foi criado ou
implementado; nenhuma biblioteca recomendada.*
