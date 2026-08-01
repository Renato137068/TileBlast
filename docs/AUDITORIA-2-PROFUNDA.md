# SEGUNDA AUDITORIA — PROFUNDA E CRÍTICA — TILE BLAST
### Lead Game Director (Royal Match / Toy Blast / Toon Blast / Candy Crush)
### Avaliando o jogo NO ESTADO ATUAL (já com as 10 melhorias implementadas)

---

## NOTA DE ABERTURA — CONTESTANDO A PRIMEIRA AUDITORIA

A primeira auditoria fez o diagnóstico certo (ausência de obstáculos, objetivos que só mudavam
números) mas cometeu dois erros de julgamento que preciso corrigir de saída:

1. **Superestimou o efeito das correções.** A projeção de "~75 depois das melhorias" confunde
   *ter o sistema* com *ter a experiência*. Adicionar gelo, caixa, coleta e cobertura resolve o
   buraco estrutural — mas obstáculos **colocados aleatoriamente por contagem** não são fases
   desenhadas. Trocar "60 tabuleiros iguais" por "60 tabuleiros aleatórios com obstáculos
   aleatórios" é um salto real, porém menor do que a nota sugeria. Os melhores do gênero vivem
   de **níveis feitos à mão**, um a um, testados. Isso o jogo ainda não tem.

2. **Tratou 'diversão' como soma de features.** Diversão em Tile Blast não vem da lista de
   mecânicas — vem do *tato* (o "candy juice"), da leitura instantânea, do espetáculo, da
   identidade. Nada disso é medido por um checklist de obstáculos.

Portanto, **reduzo várias notas** em relação à projeção otimista e explico cada corte abaixo.
Onde a 1ª auditoria subestimou um problema (personalidade, juice, conteúdo), eu agravo.

**Resposta curta à pergunta central:** *o potencial existe, mas está latente.* A fundação
mecânica ficou competitiva; o jogo **hoje** ainda NÃO se tornaria um dos melhores Tile Blast
independentes da Play Store. O que separa os melhores — volume de conteúdo desenhado, tato,
identidade e emoção — continua ausente. Potencial real; realização, não.

---

## 1. CORE GAMEPLAY — **60/100** (a 1ª auditoria projetaria mais; eu seguro aqui)

Existe algo divertido? Sim, e é honesto: estalar grupos grandes dá um retorno imediato bom, e
os especiais em cadeia (bomba→5×5, foguete→cruz) agora criam limpezas satisfatórias. Isso é real.

**Mas a profundidade continua rasa por um motivo de fundo que ninguém quer admitir:** *tap-blast
tem teto de maestria mais baixo que match-3 de swap.* No Royal Match/Candy Crush você escolhe
*onde trocar* — um espaço de decisão enorme. Aqui você escolhe *qual grupo tocar* — e o grupo
ótimo quase sempre é óbvio (o maior). A camada nova de obstáculos adiciona decisão ("onde crio o
especial para quebrar aquele gelo?"), mas:

- **A colocação aleatória de obstáculos sabota a estratégia.** Numa fase desenhada à mão, o gelo
  fica onde força uma rota; aqui ele cai em células aleatórias, então às vezes já está trivialmente
  cercado, às vezes fica isolado no topo. O jogador não lê um *quebra-cabeça*; lê uma *distribuição*.
- **Depois de 50 fases, a mecânica se repete.** Como não há introdução constante de novos
  elementos (só 4 obstáculos, um por mundo, e acabam no mundo 5), o mundo 5 é o mundo 2 com mais
  números. Toy Blast introduz elementos novos por dezenas de fases.
- **Sorte ainda pesa.** O RNG misericordioso ajuda nos objetivos de cor, mas o tabuleiro inicial e
  o refil continuam aleatórios; fases de score com poucos movimentos ainda são parcialmente loteria.

Veredito: divertido nos primeiros minutos, competente no meio, e sem teto que segure um jogador
habilidoso. Decisões estratégicas existem, mas são poucas e frequentemente óbvias.

---

## 2. GAMEPLAY LOOP — **55/100**

O loop fecha e é tecnicamente completo. O problema é **emocional, não estrutural**:

- **Antecipação fraca.** Abrir a próxima fase não promete nada específico. Nos melhores, o mapa é
  uma isca ("faltam 2 fases para a área nova do castelo"). Aqui o próximo nó é só o próximo número.
- **Recompensa sem peso.** Moedas, XP, baús, estrelas — muita quantidade, pouca *significância*.
  O jogador não *deseja* nada concreto; acumula. Compare com Royal Match, onde cada estrela
  restaura uma parte visível e narrativamente sua do castelo.
- **O portão de vidas ainda corta o loop.** Suavizei as 5 primeiras fases, mas a partir daí o
  clássico "acabou vida → sai" continua, e como o núcleo não é viciante o bastante, o jogador que
  bate no portão tem pouco motivo emocional para voltar.

Onde o loop quebra: **entre "recebi recompensa" e "quero a próxima" — falta o gancho de desejo.**

---

## 3. DIVERSÃO (30 minutos) — **52/100**

Sendo o jogador, não o desenvolvedor: depois de 30 minutos eu diria **"foi legal"**, não "jogo
amanhã." Motivos concretos:

- O *tato* é fraco. O feedback é canvas + partículas + shake + emoji. Falta o "candy juice":
  peças com peso, squash-and-stretch, som em camadas, câmera que reage, cascatas que encadeiam
  com timing coreografado. Sem isso, explodir 30 blocos parece a mesma coisa que explodir 8.
- Não há um único momento memorável projetado nos primeiros 30 min. Nenhum boss com
  comportamento, nenhuma reviravolta, nenhuma recompensa que faça sorrir.
- A ausência de identidade (ver §4) faz tudo parecer "genérico competente" — o tipo de jogo que
  se joga uma vez e esquece o nome.

---

## 4. PERSONALIDADE — **25/100** (a 1ª auditoria acertou em ser dura; eu mantenho a dureza)

**Escondendo o nome, o jogador NÃO reconheceria este jogo depois de uma semana.** Este é o
veredito mais grave da auditoria e não mudou com as melhorias, porque nenhuma delas tocou em
identidade:

- **Tema:** Jardim→Floresta→Montanha→Oceano→Inferno é o clichê genérico de biomas, sem propósito.
  O jogador não está *construindo* nem *salvando* nada. Não há um "porquê".
- **Universo/atmosfera:** inexistente. Emojis de mundo (🌱🌲⛰🌊🔥) não são arte, são rótulos.
- **Mascote:** Blasty existe e agora fala a mecânica de cada mundo — melhora, mas ele não tem
  personalidade (piadas, reações, arco), não aparece *dentro* da jogada, e visualmente é um SVG.
  O Rei do Royal Match é um personagem; Blasty é um ícone.
- **Humor/estilo/voz:** ausentes. O jogo não tem tom.

Identidade é o que transforma "mais um blast" em "AQUELE blast". É o maior déficit do produto e
o mais barato de subestimar.

---

## 5. EMOÇÃO — **40/100**

O jogo faz sentir, na melhor das hipóteses, **satisfação leve** ao estalar um grupo grande e
**leve alívio** ao vencer no aperto. Não entrega surpresa (nada é imprevisível de forma
agradável), não entrega tensão real (o núcleo perdoa demais até bater num muro de RNG), não
entrega orgulho (as 3 estrelas por mérito ajudam, mas ninguém se orgulha de um número), não
entrega curiosidade (nada faz perguntar "o que vem depois?"). O jogador, na prática, **apenas
completa fases.** É a definição de um jogo funcional e emocionalmente plano.

---

## 6. SENSAÇÃO DE VITÓRIA — **45/100**

Ao terminar uma fase, o jogador sente **"Ok"**, não "Uau." Confete + estrelas animadas + baú é o
*mínimo* do gênero em 2025, não um clímax. O que falta para a vitória ser inesquecível:

- Sequência de fim coreografada: especiais restantes detonam sozinhos em cascata (o "board clear"
  do Royal Match é um espetáculo deliberado — aqui não existe).
- Escalonamento emocional: vitória apertada, vitória perfeita e vitória com combo gigante deveriam
  ter *finais visuais diferentes*. Hoje é o mesmo confete.
- Um beneficiário visível da vitória (algo que se constrói/restaura), dando significado ao esforço.
- Som de vitória com camadas e um "stinger" que dê arrepio.

---

## 7. SENSAÇÃO DE DERROTA — **45/100**

Ao perder, o jogador tende mais a **"vou fechar"** do que a "mais uma". Porque:

- A derrota costuma vir por movimentos esgotados num tabuleiro parcialmente aleatório — então
  parece **injusta**, não instrutiva. O jogador não aprende o que fazer diferente.
- Não há o gancho de quase-vitória ("faltou 1 bloco!") com foco visual no que faltou, que é o que
  faz o dedo tocar "tentar de novo" nos melhores do gênero.
- A tela de derrota não cria desejo imediato de revanche; comunica fracasso, não convite.

---

## 8. RITMO — **50/100**

No papel melhorou (vales de alívio, uma mecânica por mundo, chefes). Na prática o ritmo é
**achatado pela aleatoriedade**: como cada fase é gerada, a diferença *sentida* entre uma fase de
"prática" e uma de "teste" é menor do que os números sugerem. Além disso:

- A introdução de mecânicas termina cedo (4 obstáculos, todos vistos até o mundo 2–5). Depois
  disso, não há novidade — e novidade é o combustível do ritmo.
- Não há batidas de surpresa (eventos, fases-bônus com regra maluca, momentos roteirizados).
- Faltam "picos de espetáculo" agendados — aquele nível a cada X que existe só para o jogador se
  sentir poderoso.

---

## 9. COMPARAÇÃO (só Game Design, Diversão, Loop, Progressão, Emoção, Personalidade)

**vs Toy Blast / Toon Blast:** mesmo núcleo (tap-blast), mas eles têm **centenas a milhares de
fases desenhadas à mão**, uma escada de obstáculos que nunca para de introduzir elementos,
personagens com carisma, e — decisivo — **camada social/co-op (times)** que sozinha multiplica
retenção e emoção. Tile Blast tem 60 fases geradas, 4 obstáculos e zero social. Fica em ~35% do
que eles entregam em design.

**vs Royal Match:** a distância é de gerações. Royal Match é uma aula de *tato*, clareza,
progressão narrativa (o castelo), eventos ao vivo constantes, e a "sensação de manteiga" em cada
toque. Nenhum sistema que adicionei aproxima o jogo desse nível de acabamento e intenção. ~28%.

O ponto que a 1ª auditoria não enfatizou o suficiente: **o gap com os líderes não é de mecânica —
é de CRAFT e CONTEÚDO.** Eles ganham no que não aparece numa lista de features.

---

## 10. O QUE UM JOGADOR EXPERIENTE SENTIRIA FALTA

Volume de conteúdo (60 fases acaba em 1–2 sessões; o gênero exige centenas desenhadas). Fases
feitas à mão com "aha". Introdução contínua de novos elementos. Combinações de booster com
identidade visual própria. Um mapa que seja recompensa (área que se transforma). Personagens e
história. Camada social/co-op e competição com amigos. Eventos ao vivo. Tato/juice de primeira
linha. Um tom, uma piada, uma voz. Fases-bônus e momentos-surpresa. Um "board clear" espetacular.
Áudio em camadas. Nada disso é opcional para entrar no top independente.

---

## EXERCÍCIO — 1 HORA JOGANDO (relato cronológico, como jogador)

**0–5 min:** Instalo, abro. Blasty me diz para tocar em 2+ blocos. Entendo em segundos — bom.
Estalo grupos, vejo pontos subirem, ganho a primeira fase. *Pequena empolgação* ao ver o primeiro
foguete se formar. Sensação: "gostinho de Toy Blast."

**5–15 min:** Chego ao gelo (fase 11). *Empolgação real* — algo novo! Quebro gelo, funciona,
legal. Mas por volta da fase 8–14 percebo que o tabuleiro é sempre o mesmo quadrado genérico e que
"vencer" é sempre o mesmo confete. A novidade do gelo segura por umas 4 fases.

**15–30 min:** Caixas (mundo 3). Mais uma lufada de novidade, curta. Entre os mundos, as fases de
score com poucos movimentos me fazem perder por azar uma vez — *irritação*, não desafio. Começo a
sentir repetição. Abro o menu, vejo passe/missões/skins/ranking — muita coisa, mas nada que eu
*queira*. Continuo mais por hábito do que por vontade.

**30 min:** Coleta (Oceano). Levar cerejas ao fundo é a mecânica mais interessante até aqui —
*breve empolgação*. Mas já sei que em duas fases vai repetir. **Primeiro pensamento de fechar o
jogo** aparece aqui: "é competente, mas não me pega."

**1 hora:** Cobertura + combos no Inferno. Os combos grandes são o ponto alto — divertidos. Ainda
assim, sem identidade, sem história, sem um motivo para voltar amanhã, fecho pensando: **"foi
ok."** Não instalo um lembrete mental para voltar. Não conto para ninguém.

Empolgação: cada estreia de mecânica (curta) e combos grandes. Tédio: os intervalos genéricos
entre estreias. Vontade de fechar: ~30 min, por falta de gancho emocional.

---

## PRIORIZAÇÃO — 20 MELHORIAS (Diversão / Retenção / Dificuldade de implementação, 1–10)

| # | Melhoria | Diversão | Retenção | Dificuldade | Prioridade |
|---|---|:--:|:--:|:--:|:--:|
| 1 | Níveis feitos à mão (substituir geração aleatória) | 10 | 10 | 9 | **MÁXIMA** |
| 2 | Volume de conteúdo (300+ fases) | 8 | 10 | 9 | **MÁXIMA** |
| 3 | Identidade/tema com propósito (o que se constrói?) | 9 | 9 | 7 | **MÁXIMA** |
| 4 | "Juice"/tato de primeira linha (peso, squash, cascata) | 10 | 8 | 7 | **MÁXIMA** |
| 5 | Mapa-recompensa que se transforma (meta visível) | 8 | 10 | 7 | **ALTA** |
| 6 | Board clear espetacular no fim da fase | 9 | 6 | 4 | **ALTA** |
| 7 | Introdução contínua de novos elementos | 8 | 9 | 6 | **ALTA** |
| 8 | Camada social/co-op (times, desafiar amigos) | 7 | 10 | 8 | **ALTA** |
| 9 | Personagem/mascote com carisma e presença na jogada | 8 | 7 | 6 | **ALTA** |
| 10 | Quase-vitória com foco visual + revanche irresistível | 7 | 8 | 3 | **ALTA** |
| 11 | Áudio em camadas + stingers de vitória/combo | 8 | 6 | 5 | **ALTA** |
| 12 | Eventos ao vivo recorrentes | 7 | 9 | 7 | **ALTA** |
| 13 | Finais de vitória escalonados (apertada/perfeita/combo) | 7 | 6 | 4 | **MÉDIA** |
| 14 | Combinações de booster com efeitos-assinatura | 8 | 6 | 5 | **MÉDIA** |
| 15 | Fases-bônus / regras malucas ocasionais | 7 | 7 | 5 | **MÉDIA** |
| 16 | Narrativa leve costurando os mundos | 6 | 7 | 6 | **MÉDIA** |
| 17 | Solvabilidade garantida por fase (menos azar) | 6 | 7 | 7 | **MÉDIA** |
| 18 | Tela de derrota que convida à revanche | 6 | 7 | 3 | **MÉDIA** |
| 19 | Chefes com comportamento real (não só números) | 8 | 6 | 7 | **MÉDIA** |
| 20 | Sistema de coleção/álbum com significado | 5 | 7 | 5 | **MÉDIA** |

O padrão é claro: as prioridades máximas **não são mecânicas novas — são conteúdo, craft e
identidade.** Foi exatamente onde a rodada anterior de melhorias não chegou.

---

## RESULTADO FINAL — NOTAS (estado atual, pós-melhorias)

| Área | Nota |
|---|:--:|
| Core Gameplay | 60 |
| Gameplay Loop | 55 |
| Diversão | 52 |
| Progressão | 55 |
| Curva de Dificuldade | 52 |
| Balanceamento | 55 |
| Personalidade | 25 |
| Emoção | 40 |
| Originalidade | 25 |

**Média ponderada ≈ 55/100.** (A 1ª auditoria projetou ~75 para este ponto — eu contesto: 75 é a
nota de um jogo com níveis desenhados, tato de ponta e identidade; nada disso existe ainda. As
melhorias implementadas tiram o jogo de 45 para ~55, não para 75. Foi um salto de *fundação*, não
de *experiência*.)

### "Se lançado hoje, eu continuaria jogando depois de 7 dias?"

**Não.** Justificativa honesta, como jogador: eu jogaria talvez 2–3 sessões (o conteúdo acaba
rápido — 60 fases), gostaria dos combos, acharia "competente", e desinstalaria antes do dia 7 por
três razões que se reforçam: (a) **acabou o conteúdo**; (b) **nada me puxa de volta** — sem meta
desejável, sem social, sem eventos, sem história; (c) **não criei vínculo** — o jogo não tem cara,
nome que gruda, nem um momento que eu queira reviver. Retenção D7 de um jogo assim, na prática, é
baixa. E "um dos melhores Tile Blast independentes" é exatamente um jogo de **alta D7** — logo,
hoje, não.

### OS 10 MAIORES ERROS DE GAME DESIGN

1. Confiar em geração aleatória em vez de níveis desenhados à mão (mata o "aha" das fases).
2. Conteúdo insuficiente (60 fases) — o jogador termina antes de se viciar.
3. Ausência total de identidade/tema com propósito.
4. Tato/juice abaixo do padrão do gênero — o toque não é gostoso o bastante.
5. Progressão sem recompensa desejável (acúmulo, não desejo).
6. Nenhuma camada social/competitiva — o maior motor de retenção do gênero está fora.
7. Sensação de vitória e de derrota emocionalmente planas.
8. Introdução de mecânicas termina cedo; meio-fim do jogo sem novidade.
9. Excesso de sistemas de meta periféricos mascarando a falta de um núcleo memorável.
10. Escolha de um núcleo (tap-blast) de teto de maestria baixo, sem compensar com craft/conteúdo.

### AS 10 DECISÕES MAIS ACERTADAS

1. Ter finalmente obstáculos e objetivos que mudam a jogada (correção estrutural certa).
2. Uma mecânica-âncora por mundo (boa espinha dorsal pedagógica).
3. Combinação de especiais em cadeia (o ponto mais divertido atual).
4. Rebalancear os especiais para que apareçam de fato.
5. RNG misericordioso reduzindo derrotas por puro azar.
6. Estrelas por mérito (eficiência + superação), não só velocidade.
7. Portão de vidas suavizado no começo (menos atrito no onboarding).
8. Curva com vales de alívio (intenção correta, mesmo que diluída pelo RNG).
9. Blasty ensinando a mecânica de cada mundo (onboarding + semente de identidade).
10. Legibilidade e clareza imediatas — o jogo se aprende em segundos (não subestimar isso).

### NOTA ATUAL: **55/100**
### NOTA POTENCIAL (com as 20 melhorias, foco em conteúdo/craft/identidade): **~80/100**

Chegar a 80 — patamar de "um dos melhores Tile Blast independentes" — depende quase inteiramente
das prioridades 1 a 9 desta lista, que **não são código nem sistemas novos**: são **níveis
desenhados à mão em volume, tato de primeira linha, identidade/tema e um motivo emocional para
voltar.** A fundação mecânica já está de pé. O jogo que falta construir é o *artesanal*.

---
*Segunda auditoria — exclusivamente Produto e Game Design. Sem código, monetização, UI, performance
ou arquitetura, conforme solicitado.*
