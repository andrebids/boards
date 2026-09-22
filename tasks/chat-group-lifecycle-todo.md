# Grupos de chat — checklist de implementação

Plano e regras: [chat-group-lifecycle-plan.md](./chat-group-lifecycle-plan.md).
Estado inicial: todas as tarefas pendentes. Este documento não autoriza execução em produção.

## A1 — Saída e transferência de propriedade

**Descrição:** corrigir as transições de participantes, com contagem e autorização transacionais.

- [ ] Arquivar só com zero participantes ativos; transferir propriedade também no caso 2 -> 1.
- [ ] Sair, remover e adicionar usam a mesma ordenação por conversa; eventos só após commit.
- [ ] Testes cobrem 3 -> 2, 2 -> 1, 1 -> 0, remoção do último outro membro e concorrência.

**Verificação:** testes focados dos controladores e integração concorrente local.
**Dependências:** nenhuma. **Dimensão:** média.
**Ficheiros prováveis:** `chat-conversations/leave.js`, `chat-conversation-participants/{create,delete}.js`, helper transacional reutilizável e teste específico em `server/test/utils/`.

## A2 — Grupo de uma pessoa nas listas

- [ ] Lista do projeto e inbox conservam o grupo de uma pessoa depois de reload e reconexão.
- [ ] Payload distingue leitura e escrita; contagens de membros são consistentes.
- [ ] Pesquisa e histórico privado continuam corretos.

**Verificação:** testes de `chat-conversations/index`, `chat-inbox` e `get-conversation-access`.
**Dependências:** A1. **Dimensão:** média.
**Ficheiros prováveis:** `server/api/controllers/chat-conversations/index.js`, `server/api/helpers/chat/{get-inbox,get-conversation-access}.js` e testes correspondentes.

## A3 — Avisos e confirmação na interface

- [ ] Único membro consegue ler e gerir o grupo; o compositor explica porque está desativado.
- [ ] Confirmações de saída e remoção descrevem o efeito real; pedidos falhados mantêm a UI utilizável.
- [ ] Textos traduzidos, teclado e foco validados no layout existente.

**Verificação:** duas sessões locais, saída e reload, mais inspeção visual desktop/mobile por hot reload.
**Dependências:** A2. **Dimensão:** média para componentes; traduções num passo mecânico separado.
**Ficheiros prováveis:** `ChatWindow`, `ConversationActions`, modelos/seletores de chat se necessário e os quatro `locales/*/chat.js`.

## Checkpoint A — Correção pequena pronta

- [ ] O utilizador que permanece nunca perde o grupo por outra pessoa sair.
- [ ] Todos os casos da entrega A passam sem migração e sem build local.
- [ ] Limitação remanescente de histórico de ex-membros registada; não declarar paridade completa com Teams.

## B1 — Estado de saída persistente

- [ ] Migração aditiva e modelo incluem os campos descritos no plano; dados existentes mantêm o comportamento atual.
- [ ] `NULL` no limite superior de um ex-membro significa histórico vazio.
- [ ] Estratégia de rollback não reativa ex-membros nem apaga histórico silenciosamente.

**Verificação:** migração numa base local de teste, constraints e testes de modelo.
**Dependências:** checkpoint A. **Dimensão:** média.
**Ficheiros prováveis:** nova migração, `ChatParticipant.js`, query methods de participantes e testes.

## B2 — Contrato de autorização e encerramento

- [ ] Separar leitura histórica, escrita, gestão e participação ativa; não reativar pelo `ensureParticipant`.
- [ ] Saída captura limite de mensagens e estado dentro da mesma transação; escritas concorrentes seguem a mesma ordem.
- [ ] Perda de acesso ao projeto continua a negar qualquer acesso, incluindo histórico.

**Verificação:** testes de autorização e corridas mensagem/saída; novos estados ainda não expostos a utilizadores.
**Dependências:** B1. **Dimensão:** dividir em helper de autorização e integração das transições, cada um médio.
**Ficheiros prováveis:** `get-conversation-access`, `ensure-participant`, helper de transição de A1, `create-message` e testes.

## B3 — Limites em mensagens

- [ ] Paginação, `aroundId`, deep links e origem de encaminhamento respeitam ambos os limites.
- [ ] Edições posteriores à saída não expõem texto novo; operações de escrita exigem participação ativa.
- [ ] Regra partilhada cobre mensagens individuais, não só listagens.

**Verificação:** pedidos diretos por IDs antes/depois do limite, incluindo mensagem editada e grupo vazio.
**Dependências:** B2. **Dimensão:** média por listagem/leitura individual.
**Ficheiros prováveis:** query methods de `ChatMessage`, `chat-messages/{index,forward,update,delete}.js` e testes.

## B4 — Anexos e conteúdo associado

- [ ] Download, streaming e thumbnails recusam mensagens ou anexos posteriores ao limite.
- [ ] Anexo adicionado depois da saída a uma mensagem antiga não é exposto.
- [ ] Reações e pré-visualizações não revelam conteúdo novo a ex-membros.

**Verificação:** URLs conhecidas de anexos, variantes, range requests e enriquecimento posterior de mensagem antiga.
**Dependências:** B3. **Dimensão:** média por anexos/conteúdo associado.
**Ficheiros prováveis:** `chat-message-attachments/{download,stream}.js`, `get-message-extras`, helpers de previews e testes.

## B5 — Eventos e notificações

- [ ] Ex-membro removido de todas as salas ativas; leitura histórica e reconexão não voltam a subscrever.
- [ ] Eventos dirigidos ao utilizador, digitação, push e email só alcançam membros ativos autorizados.
- [ ] Filas revalidam destinatários no envio; cliente elimina conteúdo indevido em corrida com saída.

**Verificação:** duas sessões do mesmo utilizador, terceiro participante a escrever e notificações em fila.
**Dependências:** B2; integrar antes de ativar B. **Dimensão:** dividir em sockets e notificações, cada um médio.
**Ficheiros prováveis:** `subscribe.js`, `chat-messages/index.js`, `get-conversation-recipient-user-ids`, `reconcile-project-rooms`, serviços de notificação existentes e testes.

## Checkpoint de segurança da entrega B

- [ ] Não existe leitura de conteúdo posterior por API, anexo, resumo ou socket.
- [ ] Os fluxos B1–B5 permanecem uma entrega coordenada; não publicar autorização histórica parcial.

## B6 — Histórico na lista e UI de ex-membro

- [ ] Lista/inbox usam última mensagem, datas e pesquisa dentro dos limites; ex-membros sem novas não lidas.
- [ ] Aviso de saída/remoção, histórico em leitura e opção de remover a própria vista são consistentes após reload.
- [ ] Arquivo global, ocultação individual e histórico vazio têm estados distintos.

**Verificação:** frontend, API de resumos e browser autenticado com duas identidades.
**Dependências:** B3, B4, B5. **Dimensão:** dividir em resumo do servidor e UI, cada um médio.
**Ficheiros prováveis:** `get-inbox`, `chat-conversations/index`, `clear-history`, modelos/seletores e componentes de chat, traduções.

## B7 — Reentrada e entrega integrada

- [ ] Convite explícito explica o histórico concedido e reativa como membro; preserva o limite privado.
- [ ] Sair -> reentrar -> sair produz limites corretos; abrir o histórico nunca reativa participação.
- [ ] Matriz completa do plano passa; Geral e conversas diretas mantêm o comportamento existente.

**Verificação:** integração de reentrada, regressões focadas e testes manuais de grupo local.
**Dependências:** B6 e confirmação da regra de reentrada na revisão do plano. **Dimensão:** média.
**Ficheiros prováveis:** `chat-conversation-participants/create.js`, helper de reativação, UI de convite e testes.

## Checkpoint final

- [ ] Nenhuma saída/remover histórico elimina mensagens ou anexos partilhados.
- [ ] Testes de concorrência e acesso direto passam; lint e diff focados sem erros.
- [ ] Hot reload e testes autenticados concluídos; eventuais limites de validação registados.
- [ ] Migração e rollback documentados para release separada; nenhuma alteração de produção realizada por este plano.
