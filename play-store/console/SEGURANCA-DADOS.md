# Formulário "Segurança dos dados" (Play Console)

Preencha em **Política do app > Segurança dos dados**. Respostas sugeridas para Tile Blast:

## Coleta de dados

| Pergunta | Resposta |
|----------|----------|
| O app coleta ou compartilha dados? | **Sim** (anúncios AdMob; opcional Firebase) |
| Dados criptografados em trânsito? | **Sim** (HTTPS) |
| Usuário pode pedir exclusão? | **Sim** (e-mail de contato / exportar save local) |

## Tipos de dados (via AdMob / Firebase opcional)

Marque conforme AdMob declarar na [documentação](https://support.google.com/admob/answer/11402075):

- **Identificadores do dispositivo** — coletados por parceiros de anúncios
- **Dados de diagnóstico / uso** — Analytics se Firebase ativo
- **Outros dados de desempenho do app** — crash/analytics opcional

## Dados NÃO coletados pelo desenvolvedor diretamente

- Nome, e-mail, localização precisa (a menos que você adicione login)
- Progresso do jogo: **armazenado localmente** no dispositivo
- Nome no ranking: **opcional**, digitado pelo usuário, salvo localmente / Firebase se ativado

## Finalidade

- Publicidade
- Analytics (se Firebase configurado)
- Funcionalidade do app (compras Play Billing)

## Política de privacidade

URL obrigatória — veja `play-store/console/POLITICA-PRIVACIDADE.md`
