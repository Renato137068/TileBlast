# MELHORIAS — RODADA 2 (pós 2ª auditoria)

Implementadas as melhorias de alto impacto que são realmente codificáveis e verificáveis.
As demais (arte/identidade, volume de 300+ fases à mão, social/co-op) são fronteira
humana/asset e ficam fora do que dá para entregar bem sem iteração visual e artistas.

## O que entrou (validado no motor real, headless)

**A — Layouts DESENHADOS de obstáculos (fim da colocação 100% aleatória)** — o item #1 da 2ª
auditoria. Cada obstáculo agora forma uma **assinatura visual/estratégica**:
- Gelo → **faixa** horizontal (frozen band).
- Caixas → **muro na base** do tabuleiro.
- Coleta → **espalhada no topo** (exige abrir rota de descida).
- Cobertura → **lago contíguo** (blob), não pontos soltos.
Suporte a `lv.pattern` por fase para variar. Isso troca "tabuleiro aleatório com obstáculos
aleatórios" por fases com intenção legível.

**B — Board-clear espetacular na vitória (#6/#13)** — ao vencer, os especiais restantes
**detonam em cascata** com tremor forte, confete, bônus de pontos e burst "COMBO". A vitória
deixa de ser "ok" e vira um momento; o bônus ainda conta para as estrelas por mérito.

**C — Quase-vitória → revanche (#10/#18)** — na derrota, o jogo mede a proximidade dos
objetivos; se você estava a ≥80%, mostra "Faltou pouco!" com o Blasty pensativo e um convite
à revanche, em vez do "Game Over" seco. Reduz o abandono após derrota.

**D — Anti-azar / solvabilidade (#17)** — o tabuleiro inicial passa a **garantir presença
mínima das cores-alvo**, evitando fases perdidas por sorteio ruim (some com o mercy-RNG do refil).

## Validação
- Sintaxe do script completo do jogo: **compila 0 erros** (186 KB inline).
- Smoke test headless do **motor real**: **8/8 PASS** — gelo em faixa (1 linha), caixas na base
  (avgY=7), coleta no topo (avgY=0), cobertura 12/12 contígua, cor-alvo garantida (16),
  board-clear detona todos os especiais sem erro.
- Vitest (unit + integração): verde.
- `www/` ressincronizado.

## Nota de processo (importante)
Durante esta rodada a ferramenta de edição truncou o `tile_blast.html` **duas vezes** no bloco
final (BOOT), sempre num caractere multibyte. Detectei por validação de sintaxe e **restaurei a
cauda a partir de `www/index.html`** (código de boot não modificado). O arquivo está íntegro
(fecha com `</script></body></html>`, blocos de init presentes uma única vez).

## Onde o jogo está e o que falta para o "top independente"
Estas melhorias elevam **craft e emoção pontual**, mas as alavancas decisivas continuam sendo:
níveis feitos à mão em **volume** (centenas), **tato/juice** de primeira linha (ajuste visual
que exige playtest em navegador), **identidade/arte/tema** e **camada social**. Sem playtest
visual e assets, essas quatro não avançam de verdade — e são o que separa um bom blast de um
dos melhores da Play Store.
