# Arquitetura do chat

Este documento descreve a implementação existente. Deve ser atualizado no mesmo conjunto de alterações sempre que mudar um modelo, endpoint, evento em tempo real, regra de acesso ou fluxo principal.

## Contexto e acesso

O chat pertence sempre a um projeto. `Project.chatMode` controla quem o pode usar:

| Valor | Acesso |
|---|---|
| `disabled` | Chat desativado |
| `managers` | Apenas gestores do projeto |
| `allProjectMembers` | Gestores e utilizadores com membership num board do projeto |

O servidor volta a validar o acesso em cada operação. A visibilidade no cliente não substitui autorização no backend.

Existem três tipos estáveis de conversa:

| Tipo | Finalidade | Participação |
|---|---|---|
| `projectGroup` | Conversa geral, única por projeto | Membros elegíveis do projeto |
| `projectDirect` | Conversa entre dois utilizadores | Dois participantes explícitos |
| `projectCustomGroup` | Grupo com título e gestão de membros | Participantes explícitos; `owner` ou `member` |

Conversas diretas usam uma `directKey` ordenada para impedir duplicados. Um grupo personalizado arquivado deixa de conceder acesso.

## Visão geral

```text
Componentes React
  -> entry actions / sagas
  -> cliente HTTP ou Socket.IO
  -> controllers Sails
  -> helpers de domínio
  -> query methods / Waterline / PostgreSQL
  -> broadcasts Socket.IO
  -> reducers e modelos Redux ORM
  -> atualização das janelas de chat
```

O servidor é a fonte de verdade para mensagens, participantes, permissões e cursores de leitura. O cliente pode aplicar atualizações otimistas, mas confirma ou reverte o estado a partir da resposta do servidor.

## Backend

### Camadas

- `server/config/routes.js` declara os contratos HTTP e Socket.IO.
- `server/api/controllers/chat-*/` valida os parâmetros do pedido e traduz erros HTTP.
- `server/api/helpers/chat/` contém acesso, mensagens, leitura, apresentação e reconciliação de salas.
- `server/api/helpers/chat-*/` contém anexos, previews de links e operações especializadas.
- `server/api/hooks/query-methods/models/Chat*.js` concentra queries e transações que não devem ficar espalhadas pelos controllers.
- `server/api/models/Chat*.js` mantém os nomes e enums estáveis do domínio.

### Modelo de dados

| Tabela | Responsabilidade |
|---|---|
| `chat_conversation` | Tipo, projeto, título, autor, arquivo e data da última mensagem |
| `chat_participant` | Utilizador, cursor de leitura, mute, nível de notificação e papel no grupo |
| `chat_message` | Texto, autor, idempotência, edição, remoção, resposta e origem de reencaminhamento |
| `chat_message_attachment` | Anexo e respetiva `file_reference` |
| `chat_message_reaction` | Reação única por utilizador, mensagem e emoji |
| `chat_saved_message` | Associação privada entre utilizador e mensagem guardada |
| `chat_link_preview` | Metadados externos normalizados e cacheados por projeto |
| `chat_message_link_preview` | Ordem e associação entre mensagem e preview |

Os identificadores `BIGINT` são tratados como strings no JavaScript. Não devem ser convertidos para `Number` nem comparados numericamente no cliente.

### Invariantes importantes

- `clientMessageId` torna a criação de mensagens idempotente para a mesma conversa e utilizador.
- O cursor `lastReadMessageId` só avança através de uma atualização condicional.
- Uma mensagem removida é apresentada sem texto, anexos, reações, previews ou contexto de resposta.
- Criação e remoção de anexos atualizam `FileReference.total` de forma transacional.
- Uma resposta só pode apontar para uma mensagem da mesma conversa.
- Um reencaminhamento só pode usar uma origem acessível no mesmo projeto.
- Migrações já executadas num ambiente partilhado não são reescritas; cria-se uma migração corretiva.

## API

As rotas abaixo estão declaradas em `server/config/routes.js`. Os corpos e respostas concretos devem ser confirmados nos respetivos controllers e em `client/src/api/chat.js`.

### Conversas e participantes

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/api/projects/:projectId/chat-members` | Listar membros elegíveis |
| `GET` | `/api/projects/:projectId/chat-conversations` | Listar conversas e estado agregado |
| `POST` | `/api/projects/:projectId/chat-conversations/general` | Obter/criar conversa geral |
| `POST` | `/api/projects/:projectId/chat-conversations/direct` | Obter/criar conversa direta |
| `POST` | `/api/projects/:projectId/chat-conversations/groups` | Criar grupo personalizado |
| `PATCH` | `/api/chat-conversations/:id` | Atualizar conversa/grupo |
| `POST` | `/api/chat-conversations/:conversationId/participants` | Adicionar participantes |
| `DELETE` | `/api/chat-conversations/:conversationId/participants/:userId` | Remover participante |
| `POST` | `/api/chat-conversations/:id/leave` | Sair de um grupo |
| `PATCH` | `/api/chat-conversations/:id/preferences` | Atualizar notificações e mute |
| `POST` | `/api/chat-conversations/:id/typing` | Publicar estado temporário de escrita |
| `POST` | `/api/chat-conversations/:id/read` | Avançar cursor de leitura |
| `POST` / `DELETE` | `/api/chat-conversations/:id/subscribe` | Subscrever ou abandonar a sala Socket.IO |

### Mensagens

| Método | Rota | Finalidade |
|---|---|---|
| `GET` / `POST` | `/api/chat-conversations/:conversationId/messages` | Obter histórico ou criar mensagem |
| `PATCH` / `DELETE` | `/api/chat-messages/:id` | Editar ou remover mensagem |
| `POST` | `/api/chat-messages/:id/forward` | Reencaminhar mensagem |
| `POST` | `/api/chat-messages/:messageId/reactions` | Alternar reação |
| `POST` | `/api/chat-messages/:messageId/attachments` | Carregar anexo |
| `GET` | `/api/chat-message-attachments/:id/download` | Descarregar anexo autorizado |
| `GET` | `/api/projects/:projectId/chat-saved-messages` | Listar mensagens guardadas |
| `POST` / `DELETE` | `/api/chat-messages/:messageId/saved` | Guardar ou deixar de guardar |

## Eventos em tempo real

O cliente deve conseguir receber e aplicar, pelo menos, estes eventos:

- `chatConversationCreate` e `chatConversationUpdate`;
- `chatMessageCreate`, `chatMessageUpdate` e `chatMessageDelete`;
- `chatConversationRead` e `chatParticipantUpdate`;
- `chatTypingUpdate` e `chatMessageAlert`;
- `chatConversationAccessRevoke` e `chatProjectAccessRevoke`.

As mensagens de uma conversa usam a sala `chatConversation:<id>`. Eventos específicos do utilizador podem ser publicados na sala `@user:<id>`. O payload canónico é preparado no servidor antes do broadcast.

## Frontend

### Estado e comunicação

- `client/src/api/chat.js` transforma datas e encapsula os pedidos.
- `client/src/entry-actions/chat.js` expõe as intenções da interface.
- `client/src/sagas/core/watchers/chat.js` e `services/chat.js` executam pedidos, retry, subscrição e reconexão.
- `client/src/models/Chat*.js` guarda conversas, mensagens e participantes em Redux ORM.
- `client/src/reducers/chat.js` guarda estado de pedidos, drafts, resposta ativa, escrita e revogações.
- `client/src/selectors/chat.js` entrega dados derivados aos componentes.

### Interface

`ChatContext` coordena as janelas do projeto, persiste a disposição em `localStorage`, abre deep links e limpa estado após revogação. `ChatDock` e `ChatPanel` apresentam o launcher e a lista; cada `ChatWindow` controla histórico, leitura e composição.

A chave persistida segue o formato:

```text
planka-chat-windows:<userId>:<projectId>
```

Parâmetros de deep link:

```text
?chatConversation=<conversationId>&chatMessage=<messageId>
```

## Configuração operacional

| Variável | Comportamento atual |
|---|---|
| `CHAT_ATTACHMENT_MAX_BYTES` | Limite por anexo; por omissão 25 MiB |
| `CHAT_ATTACHMENTS_PER_MESSAGE_LIMIT` | Máximo por mensagem; por omissão 10 |
| `CHAT_EXTERNAL_LINK_PREVIEWS_ENABLED` | Ativa previews externos apenas quando igual a `true` |

Previews externos devem continuar desativados por omissão, porque implicam pedidos de rede a URLs fornecidos por utilizadores e exigem controlos contra SSRF, limites e observabilidade.

## Testes e validação

Testes automatizados existentes:

- backend: `server/test/utils/chat.test.js` e `server/test/utils/chat-message-attachments.test.js`;
- frontend: `client/src/components/chat/utils.test.js`, `client/src/models/ChatConversation.test.js` e `client/src/reducers/chat.test.js`.

Comandos usuais:

```bash
npm test --prefix server -- --grep "Chat"
npm test --prefix client -- --runInBand --runTestsByPath \
  src/components/chat/utils.test.js \
  src/models/ChatConversation.test.js \
  src/reducers/chat.test.js
npm run lint
```

Alterações de migração também devem validar `up` e `down` numa base PostgreSQL descartável. Fluxos de sockets, reconexão e revogação requerem validação com pelo menos duas sessões reais.
