# AUDITORIA DE ECONOMIA & MONETIZAÇÃO — TILE BLAST
### Lead Economy & Monetization Designer (Royal Match / Candy Crush / Toy/Toon Blast / Homescapes / Match Factory)
### Escopo: exclusivamente monetização e economia. Sem código, gráficos, UI, arquitetura.

---

## BASE FACTUAL (a economia como está)

**Fontes de moeda (faucets):** vitória 10/20/30 (1★/2★/3★); **missões diárias 30–120 moedas
cada, várias por dia** (blocos, cor, fases, especiais, power‑ups, combos, score, streak, puzzle);
missões semanais 150+; baús (bronze/prata/ouro); recompensa de login; passe de batalha; cofrinho.
**Sumidouros (sinks):** embaralhar 40, bomba 60, arco‑íris 80, **vida 80**, +movimentos 100,
**continuar após derrota 100**.
**Vidas:** 5 máx., regen 30 min (2h30 para encher); as 5 primeiras fases não gastam vida.
**IAP:** starter R$2,99 (500 moedas + 3 bomba + 3 arco‑íris), 500/1.500/4.000 moedas
(R$1,99/4,99/9,99), sem‑anúncios R$4,99, assinatura R$9,90/mês e R$14,99/ano, passe R$6,99.
**Ads:** recompensado (5/dia: vida/embaralhar/moedas + continuar após derrota) e interstitial.

---

## VEREDITO DE ABERTURA

**"Existe uma estratégia capaz de gerar receita recorrente sem prejudicar a experiência? → Não.**
E, ao contrário do que se poderia imaginar, o problema **não é** ser agressiva demais — é ser
**fraca demais para monetizar**. A economia **dá moeda muito mais rápido do que o jogador consegue
gastar**, sobre uma utilidade de moeda baixa, sem um **meta desejável** que crie vontade de gastar.
O resultado é o pior dos mundos para receita: **jogador acumula recursos sem propósito** e nunca
sente necessidade de pagar. Existe o *formato* de uma boa monetização (vidas, moedas, ads, passe,
cofrinho, ofertas), mas **não a tensão econômica nem o desejo** que fazem esse formato render.

---

## 1. ECONOMIA — **30/100**
**Faucets >> sinks.** Só as missões diárias entregam ~**300–600 moedas/dia**; uma vida custa 80 e
um continue 100. O jogador ganha muito mais do que gasta → **inflação e acúmulo sem propósito**.
Pior: a moeda tem **baixa utilidade** (só compra power‑ups menores, vidas e continues que, com o
anti‑azar e 80 fases não brutais, raramente são necessários). **Impacto financeiro:** se a moeda é
abundante e pouco útil, **não há como vender moeda** (colapsa o principal produto de IAP).
**Impacto na experiência:** neutro‑a‑entediante (recompensa sem escolha). **Correção:** criar
**escassez com propósito** — um sink desejável (meta que consome vidas/moedas) e reduzir os
faucets diários.

## 2. REWARDED ADS — **45/100** (área relativamente mais forte)
Onde deveriam aparecer: continuar‑após‑derrota (existe ✔), vida grátis (existe ✔), moedas (✔).
**Oportunidades perdidas:** **dobrar recompensa** de fim de fase, **booster grátis pré‑fase**,
**acelerar baú/cofrinho**, **+3 movimentos a 1 jogada de vencer**, **girar roleta diária**. As
recompensas atuais são pouco atrativas porque a moeda vale pouco (ver §1). **Vontade de assistir?**
Média — o continue é o gancho bom; o resto é fraco. **Correção:** ampliar os pontos de rewarded e
torná‑los emocionalmente relevantes (dobrar vitória, salvar derrota, booster grátis).

## 3. INTERSTITIAL ADS — **35/100**
Frequência com cap (a cada ~5 fases). Momento: entre fases (aceitável). **Risco:** num jogo de
**retenção fraca**, interstitial é **acelerador de churn** — cada interrupção num jogador pouco
fidelizado empurra para o abandono. **Interrompem ou complementam? Interrompem.** O ROI de
interstitial só é positivo quando a retenção segura o usuário; aqui, o custo em churn provavelmente
supera o ganho. **Correção:** interstitial mais espaçado no início do funil (dias 1–3), nunca após
derrota, e só endurecer a frequência quando/ se D7 subir.

## 4. LOJA — **35/100**
Organização razoável (assinatura em destaque, pacotes de moeda, sem‑anúncios, passe). Mas o **valor
percebido é baixo** porque **moeda é abundante e pouco útil** — ninguém compra 4.000 moedas
(R$9,99) já tendo milhares sem no que gastar. Clareza ok; variedade fraca (só moeda/no‑ads/passe).
**Vontade de comprar? Baixa.** O item mais vendável seria **sem‑anúncios** (se os ads incomodarem)
— um paradoxo: a loja depende de o jogo ser chato de ver ads. **Correção:** vender **utilidade**
(bundles temáticos, boosters fortes, desbloqueios de meta), não moeda solta.

## 5. COMPRAS IN‑APP — **35/100**
Catálogo cobre o básico (moedas em tiers, starter, no‑ads, assinatura, passe). **Valor percebido:**
fraco — falta um **bundle de alto valor** (mega‑pacote de whale), **ofertas duras rotativas**, e —
crucial — **algo desejável para comprar**. O starter pack (R$2,99) é a peça mais sensata. **Catálogo
suficiente? Não** para sustentar LTV; faltam SKUs de conversão (starter bem cronometrado, oferta de
socorro real, passe com valor claro). **Correção:** reancorar o catálogo em torno de um meta que dê
utilidade à moeda.

## 6. PROGRESSÃO ECONÔMICA — **30/100**
O ciclo **ganhar → gastar está quebrado**: ganha‑se muito, gasta‑se pouco, e o pouco que se gasta
raramente é necessário. Não há um **sink obrigatório e desejável** (como "gastar movimentos para
avançar a restauração"). Ritmo: generoso demais. **Ciclo saudável? Não** — é um balde furado ao
contrário (entra muito, não sai). **Correção:** amarrar progressão a um recurso que o jogador
**quer** gastar e às vezes **precisa** repor.

## 7. OFERTAS — **40/100** (scaffolding decente)
Existe a estrutura: **cofrinho (piggy)**, **oferta relâmpago (flash)**, **pacote de socorro**,
recompensa diária, **starter**, **continue por ad/moeda após derrota**. É o ponto onde o projeto
mais se aproxima do padrão do gênero. **Faltando:** **gatilhos personalizados** (oferta quando o
jogador trava N vezes na mesma fase), **starter no momento certo** (após 1ª sessão boa),
**FOMO real** (ofertas que expiram com valor claro), e **segmentação** (não‑pagante vs pagante).
**Correção:** transformar ofertas estáticas em **ofertas gatilhadas por comportamento**.

## 8. RETENÇÃO FINANCEIRA — **35/100**
Há motivos para voltar (recompensa diária, missões diárias, regen de vida), mas **nenhum FOMO
financeiro**: nada que você pagou expira, o cofrinho é passivo, não há evento pago com prazo. O
jogador não sente "preciso abrir hoje ou perco algo". **Correção:** eventos ao vivo com recompensa
por prazo, passe com progresso diário visível, e cofrinho que **enche com o jogo** (dando vontade de
"resgatar antes que estoure").

## 9. JUSTIÇA — **65/100** (a área mais alta — e aí está a ironia)
A monetização é **justa, não agressiva**. Por ser um jogo **single‑player de score/objetivo**,
comprar power‑ups **não prejudica outros jogadores** → **risco de Pay‑to‑Win é baixo**. Isso é bom
para a experiência, mas **ruim para a receita**: "justo" aqui é sinônimo de "solto demais". O jogo
**não corre risco de parecer P2W**; corre risco de **não monetizar**. Nota alta em justiça, baixa em
eficácia — o equilíbrio está pendido para o lado errado do negócio.

## 10. COMPARAÇÃO (só monetização)
- **Royal Match:** aula de economia — vidas e moedas **fortemente gatadas atrás de um meta
  desejável (restaurar o castelo)**, ofertas duras‑mas‑justas, cofrinho, baú de time, eventos ao
  vivo. Tile Blast tem a **forma** (vidas/moedas/ads/passe/cofrinho/ofertas) mas **não a tensão nem
  o meta** que fazem isso render. ~20% do resultado.
- **Toy/Toon Blast:** lives + boosters + **social/co‑op** monetizando engajamento; Tile Blast não
  tem social. ~25%.
- **Candy Crush:** mestre em **vender dificuldade** (fases duras → boosters/vidas) e ofertas
  segmentadas. Tile Blast é fácil demais e genérico nas ofertas. ~25%.
Em economia, ofertas e valor percebido, o projeto tem a estrutura certa e a **calibração errada**.

---

## SIMULAÇÃO — 3 PERFIS
**Casual (15 min/dia):** joga poucas fases, quase nunca esbarra na parede de vidas (o regen cobre a
noite), enche o bolso com recompensa diária/missões. **Momentos de monetização:** praticamente
nenhum orgânico; no máximo um continue por ad. **Sentiria necessidade de gastar? Não.** Continua
sem pagar, experiência ok mas rasa. **Valor gerado ~US$0** (fora ads eventuais).
**Frequente (1 h/dia):** pode bater na parede de vidas, mas 5 vidas + moeda abundante (vida 80) +
vida grátis por ad = **sem pressão real de gasto**. Risco de churn por interstitial. **Monetização
realista:** rewarded ads; IAP improvável (moeda inútil). **Diverte? Até o conteúdo acabar.**
**Hardcore (3 h+/dia):** bate na parede de vidas repetidamente — **aqui deveria monetizar**, mas
ele **se auto‑atende de graça** (moeda + vida por ad) e **acaba as 80 fases rápido** → churn.
**Sentiria necessidade de gastar?** Só no‑ads, se os ads o irritarem. **É o perfil que mais pagaria
e o jogo não lhe dá no que gastar.**

---

## 20 MAIORES RISCOS FINANCEIROS
1. **Inflação de moeda** (faucets >> sinks) → moeda sem valor, IAP de moeda morto.
2. **Ausência de meta desejável** → nenhum motivo emocional para gastar.
3. **Dificuldade baixa + anti‑azar** → jogador raramente perde → vidas/continues não pressionam.
4. **Conteúdo finito (80 fases)** → whales acabam o jogo antes de virarem whales.
5. **Interstitial em jogo de baixa retenção** → churn > receita.
6. **Utilidade fraca dos power‑ups** → boosters não valem compra.
7. **Loja vende moeda, não utilidade** → valor percebido baixo.
8. **Ofertas não gatilhadas por comportamento** → conversão perdida.
9. **Sem segmentação pagante/não‑pagante** → ofertas erradas para cada um.
10. **Sem FOMO financeiro** → nenhuma urgência de abrir/gastar hoje.
11. **Regen de vida generoso (30 min)** → alivia a única pressão real.
12. **Vida grátis por ad + moeda abundante** → anula a parede de vidas.
13. **Ausência de social/co‑op** → perde o motor de engajamento que Toy/Toon monetizam.
14. **Passe de batalha sem valor percebido claro** → baixa conversão do BP.
15. **Cofrinho passivo** → não cria o gatilho "resgatar antes que estoure".
16. **Starter pack sem cronometragem** → perde a melhor janela de 1ª compra.
17. **Sem bundle de alto valor (whale)** → teto de ARPPU baixo.
18. **Dependência de ARPDAU de ads** com retenção que não sustenta ARPDAU.
19. **Sem eventos ao vivo pagos com prazo** → sem picos de receita.
20. **Economia não instrumentada/testada** → impossível calibrar faucets/sinks com dados.

---

## 20 OPORTUNIDADES (ordem de prioridade de faturamento)
1. **Meta desejável que consome vidas/moedas** (restauração/coleção) — cria desejo E utilidade.
2. **Rewarded "dobrar recompensa"** ao fim da fase — alto volume, baixo atrito.
3. **Reduzir faucets diários + criar escassez** — devolve valor à moeda.
4. **Ofertas gatilhadas por comportamento** (travou 2×, perto de vencer, sem vidas).
5. **Booster grátis pré‑fase por ad** — engaja e vende boosters depois.
6. **Starter pack cronometrado** (após 1ª sessão boa) — melhor janela de 1ª compra.
7. **Bundle de alto valor (whale)** — eleva ARPPU.
8. **Eventos ao vivo pagos com prazo** (torneios/temáticos) — picos de receita + FOMO.
9. **Rewarded para salvar derrota / +movimentos** — bem posicionado.
10. **Passe com valor percebido claro e progresso diário** — assinatura recorrente.
11. **Cofrinho que “enche jogando” + resgate pago** — gatilho de compra clássico.
12. **Segmentação pagante/não‑pagante** nas ofertas.
13. **Boosters mais fortes e desejáveis** (que valham a compra).
14. **Interstitial suavizado no início do funil** (proteger D1–D3).
15. **Social/co‑op (times) monetizando engajamento** — grande, mas caro.
16. **Vidas ilimitadas por tempo (oferta)** — sink recorrente de baixo atrito.
17. **Roleta diária / recompensa escalonada por streak** — hábito.
18. **Assinatura “VIP” (no‑ads + bônus diário)** — recorrência.
19. **Ofertas de moeda com âncora de valor** (bônus %, “melhor valor”).
20. **Instrumentar e A/B testar faucets/sinks/ofertas** — calibra tudo acima.

---

## MATRIZ DE PRIORIDADE (Receita / Retenção / Experiência / Custo, 1–10)

| # | Melhoria | Rec. | Ret. | Exp. | Custo | Prioridade |
|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | Meta desejável (sink + desejo) | 10 | 9 | 8 | 7 | **MÁXIMA** |
| 2 | Rewarded "dobrar recompensa" | 8 | 6 | 8 | 3 | **MÁXIMA** |
| 3 | Reduzir faucets / criar escassez | 8 | 6 | 6 | 4 | **MÁXIMA** |
| 4 | Ofertas gatilhadas por comportamento | 8 | 6 | 7 | 5 | **ALTA** |
| 5 | Booster grátis pré‑fase por ad | 7 | 7 | 8 | 3 | **ALTA** |
| 6 | Starter pack cronometrado | 7 | 5 | 7 | 3 | **ALTA** |
| 7 | Bundle de alto valor (whale) | 8 | 3 | 6 | 3 | **ALTA** |
| 8 | Eventos ao vivo pagos com prazo | 8 | 8 | 7 | 7 | **ALTA** |
| 9 | Rewarded salvar derrota / +moves | 7 | 6 | 7 | 3 | **ALTA** |
| 10 | Passe com valor claro + progresso diário | 7 | 7 | 7 | 5 | **ALTA** |
| 11 | Cofrinho “enche jogando” + resgate pago | 6 | 6 | 7 | 4 | **ALTA** |
| 12 | Segmentação pagante/não‑pagante | 7 | 5 | 6 | 6 | **MÉDIA** |
| 13 | Boosters mais fortes/desejáveis | 6 | 6 | 6 | 5 | **MÉDIA** |
| 14 | Interstitial suavizado (D1–D3) | 5 | 7 | 8 | 3 | **ALTA** |
| 15 | Social/co‑op (times) | 8 | 9 | 8 | 9 | **MÉDIA** |
| 16 | Vidas ilimitadas por tempo (oferta) | 6 | 6 | 6 | 4 | **MÉDIA** |
| 17 | Roleta diária / streak escalonado | 5 | 7 | 7 | 4 | **MÉDIA** |
| 18 | Assinatura VIP (no‑ads + bônus) | 6 | 6 | 6 | 4 | **MÉDIA** |
| 19 | Âncoras de valor nas ofertas de moeda | 5 | 3 | 6 | 3 | **MÉDIA** |
| 20 | Instrumentar + A/B de economia | 8 | 6 | 7 | 6 | **ALTA** |

---

## FATURAMENTO (lente de monetização)
**Premissas:** receita orgânica (UA pago = ROI negativo com a retenção atual); ARPDAU de ads de
casual **~US$ 0,01–0,03**; **conversão de IAP < 0,5%** e de baixo valor (moeda vale pouco);
retenção D7 ~5–9%. Downloads orgânicos de um solo sem marca são baixos.

| Cenário | DAU médio | ARPDAU (ads+IAP) | Receita/mês (maduro) | Receita/ano |
|---|---|---|---|---|
| **Pessimista** | 20–80 | ~US$ 0,008 | US$ 5–20 | US$ 50–200 |
| **Realista** | 100–500 | ~US$ 0,012 | US$ 30–120 | US$ 300–1,5 mil |
| **Otimista** | 800–2.500 | ~US$ 0,02 | US$ 300–900 | US$ 3–10 mil |
Mesmo o otimista é **renda de hobby**. A monetização não é o gargalo isolado — ela **depende** da
retenção e do meta, que não existem. Corrigir a economia sem corrigir o meta **não** move estes
números.

---

## NOTAS

| Área | Nota |
|---|:--:|
| Economia | 30 |
| Rewarded Ads | 45 |
| Interstitial Ads | 35 |
| Loja | 35 |
| Compras In‑App | 35 |
| Progressão Econômica | 30 |
| Ofertas | 40 |
| Retenção Financeira | 35 |
| Justiça da Monetização | 65 |
| **Potencial de Receita** | **32** |

**Nota geral ≈ 35/100.**

---

## CONCLUSÃO

**• Pode ser sustentável só com anúncios?** Marginalmente, e **rewarded** é o caminho realista
(interstitial arrisca churn). Mas "sustentável" aqui significa **renda de hobby**, não operação —
porque ads dependem de DAU/retenção que o jogo não tem.

**• Vale adicionar compras internas?** O esqueleto já existe; **não vale investir em IAP antes de a
moeda ter utilidade**. IAP só converte quando há **um meta desejável** e **escassez** — primeiro se
conserta a economia/meta, depois a loja rende.

**• Modelo mais lucrativo:** **híbrido** — rewarded ads como base de volume + **um meta que dá
propósito à moeda/vidas** + **ofertas gatilhadas e passe/assinatura** para os pagantes. Nessa ordem.

**• Maior erro da estratégia atual:** **uma economia generosa demais, com moeda abundante e sem no
que gastar** — vende‑se moeda que não vale nada, num jogo sem meta que crie desejo. É "justa" ao
ponto de **não monetizar**.

**• Melhoria isolada que mais aumentaria a receita:** **adicionar um meta desejável que consome
vidas/moedas** (restauração/coleção). Ela cria, de uma só vez, **utilidade da moeda + desejo de
gasto + retenção** — o motor econômico inteiro do gênero.

**• Tem potencial de receita recorrente?** **Baixo no estado atual.** O potencial do *modelo* é
alto (o gênero prova isso), mas esta *implementação* não converte, por falta de tensão econômica,
utilidade e meta.

### CLASSIFICAÇÃO: **Monetização Fraca**
O projeto tem o **formato** de uma boa monetização e a **calibração de uma economia que não
monetiza**. Não é agressiva demais — é **frouxa demais**. Sem um meta desejável e escassez com
propósito, a loja e os IAP ficam decorativos, e a receita recorrente real tende a **renda de hobby**.

---
*Auditoria exclusivamente de economia e monetização, conforme solicitado. Sem código, SDKs, UI ou
implementação.*
