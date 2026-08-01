# MELHORIAS EM TODAS AS FRENTES — RODADA "MELHOR JOGO SOLO POR IA"

Ataquei o máximo possível dentro do meu alcance, priorizando a **raiz única** que TODAS as
auditorias (game design, produto, monetização) apontaram: **a falta de um meta desejável.**

## 1. META PROGRESSÃO — 🌱 Jardim de Blasty (a peça central)
Novo módulo isolado `tb-meta.js` que dá **propósito** ao jogo — resolve, de uma vez, os três
maiores gaps das auditorias:
- **Identidade/tema (game design):** você reconstrói o Jardim de Blasty, capítulo a capítulo
  (O Jardim → A Fonte → O Bosque → O Festival), 16 tarefas com cena que "floresce" (emoji/CSS).
- **Retenção (produto):** sempre há uma "próxima tarefa" para perseguir; as estrelas ganhas nas
  fases (inclusive em replays por 3★) viram um **banco gastável** — um motivo real para voltar.
- **Utilidade da moeda (monetização):** tarefas custam **estrelas**, e quem tem pressa pode
  **acelerar com moedas** (💰) — isso finalmente **dá utilidade à moeda**, o defeito nº 1 da
  auditoria de economia. Completar um capítulo concede **baú de ouro**.
- Botão 🌱 Jardim no mapa, com dica ("!") quando há tarefa pronta para construir.
- **7 testes unitários** cobrindo estrelas, construção, rush por moedas, capítulo→baú e persistência.

## 2. Acessibilidade (UX/A11y)
- **Reduzir animações**: agora o jogo **honra `prefers-reduced-motion` do sistema** (desliga
  tremor de tela e confete) e há um **toggle nas Configurações** ("🎬 Reduzir animações") com
  `aria-pressed`. Antes, o tremor ignorava a preferência do usuário — uma falha de WCAG.
- Mantidos e reforçados: modo daltônico, ARIA nos botões novos, alvos de toque adequados.

## 3. Áudio (rodada anterior, consolidado)
Motor com limiter, blast escalável, escada de combo, fanfarra por estrelas, todos os eventos
sonorizados, música com percussão e ducking. A meta ganhou som de conclusão (reuso do `unlock`).

## 4. Experiência na Play Store (ASO)
Reescrevi **título, descrição curta e longa** nos 3 idiomas (pt-BR, en-US, es-419), dentro dos
limites (título ≤30, curta ≤80). Agora refletem o conteúdo real e otimizam ASO:
- 80 fases, 6 mundos, 5 obstáculos, combos, **Jardim de Blasty**, puzzle diário, modo infinito,
  acessibilidade, offline, sem cadastro — com rodapé de palavras-chave.

### Plano de assets da loja (recomendação, precisa de arte)
- **Ícone**: legível em 48px, alto contraste, com o mascote Blasty — o maior fator de CTR.
- **Feature graphic (1024×500)**: cena do tabuleiro explodindo + logo + tagline curta.
- **Screenshots (mín. 4, retrato)**: (1) blast com combo grande + número de pontos; (2) um
  obstáculo em ação (gelo quebrando); (3) o Jardim de Blasty; (4) mapa/mundos; (5) vitória 3★.
  Cada screenshot com uma legenda-benefício curta.
- **Vídeo (opcional)**: 15–30s mostrando blast → especial → combo → board-clear.

## 5. Conteúdo (rodadas anteriores, consolidado)
80 fases (70 base + 10 lendárias), 6 mundos com layouts desenhados por padrão, 5 obstáculos,
combos-assinatura (inclui Arco-íris+Arco-íris = limpa o tabuleiro).

## Validação
- **Todos os testes passam** (unit + integração), incluindo os 7 novos da meta.
- Smoke headless do **motor real**: 15/15.
- Sintaxe do jogo compila (0 erros); arquivo íntegro; `tb-meta.js` incluído no `www/` e no
  **precache do service worker** (funciona offline); `www/` sincronizado.

## Teto honesto (o que NÃO dá para fazer só com código, aqui)
- **Arte/identidade visual produzida** e **áudio produzido** (assets) — dependem de artista/designer.
- **Tato/juice de primeira linha** — precisa de playtest visual no navegador para afinar.
- **Camada social/co-op** e **eventos ao vivo** de verdade — grandes, exigem backend/operação.
- **Balanceamento fino de economia e dificuldade** — precisa de dados de jogadores reais.

O que eu fiz move o jogo de "clone competente" para "clone com propósito, acessível e pronto de
listagem". Para virar o **melhor solo por IA de verdade**, os próximos passos decisivos são
**arte + playtest + dados** — e aí eu ajudo a conduzir, não a substituir.
