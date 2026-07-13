# Plano de integração — Chat por projeto no PLANKA

## 1. Objetivo

Adicionar ao PLANKA um sistema de comunicação em tempo real composto por:

1. Um **chat geral por projeto**, acessível a todos os membros autorizados desse projeto.
2. **Conversas privadas 1:1** entre membros do mesmo projeto.
3. **Janelas minimalistas lado a lado**, semelhantes a um dock de mensagens, sem retirar o utilizador do quadro em que está a trabalhar.
4. Contadores de mensagens não lidas, menções, presença básica e notificações integradas.

A solução recomendada é nativa, aproveitando PostgreSQL, Sails, Socket.IO, Redux ORM e Redux Saga já existentes no projeto. Zulip ou Matrix ficam reservados para uma integração futura, caso seja necessário disponibilizar o chat fora do PLANKA, usar clientes móveis independentes ou federar comunicação com outros sistemas.

## 2. Escopo funcional

### 2.1. Primeira versão — MVP

O MVP deve incluir:

- Um chat geral criado automaticamente para cada projeto quando o recurso for ativado.
- Lista de membros do projeto dentro do painel de chat.
- Conversa privada entre dois membros que partilham o mesmo projeto.
- Envio, edição e remoção lógica das próprias mensagens.
- Mensagens de texto com links e menções.
- Histórico paginado por cursor.
- Atualização em tempo real por Socket.IO.
- Indicador de mensagens não lidas por conversa e contador global.
- Marcação automática como lida quando a janela está visível e focada.
- Até três janelas abertas lado a lado no desktop.
- Minimizar, restaurar, fechar e reordenar janelas.
- Adaptação para uma única conversa em ecrãs pequenos.
- Persistência local das janelas abertas, minimizadas e da respetiva ordem.
- Configuração do projeto para ativar ou desativar o chat.

### 2.2. Segunda versão

Funcionalidades a adicionar depois de o MVP estar estabilizado:

- Respostas encadeadas a mensagens.
- Reações com emoji.
- Anexos e imagens reutilizando o sistema de ficheiros do PLANKA.
- Pesquisa de mensagens.
- Estado “a escrever”.
- Presença online mais detalhada.
- Silenciar conversa e configurar notificações.
- Fixar mensagens.
- Partilhar cartões e quadros com pré-visualização enriquecida.
- Conversas de grupo criadas manualmente dentro de um projeto.
- Chats contextuais opcionais por quadro ou cartão.

### 2.3. Fora do MVP

- Chamadas de áudio ou vídeo.
- Federação com servidores externos.
- Encriptação ponta a ponta.
- Acesso ao chat através de aplicações externas.
- Bots e assistentes de IA.

Essas necessidades justificariam avaliar Matrix, Zulip ou outro serviço dedicado numa fase posterior.

## 3. Regras de acesso

### 3.1. Definição de membro do projeto

Atualmente, o PLANKA possui gestores do projeto e membros associados aos quadros. Para o chat geral, considera-se membro do projeto a união de:

- Gestores do projeto.
- Administradores com visibilidade total sobre o projeto partilhado.
- Membros de pelo menos um quadro pertencente ao projeto.

Essa lista pode ser obtida a partir da lógica já existente em `projects/make-scoper`, evitando implementar uma segunda definição de acesso.

### 3.2. Chat geral

- Só pode ser lido por utilizadores que continuam a ser membros do projeto.
- Todos os membros podem ler e enviar mensagens por padrão.
- Um gestor pode desativar o envio para membros comuns, deixando o chat em modo de anúncios.
- A entrada ou saída de membros é calculada a partir das permissões do projeto; não deve depender apenas de registos antigos em `chat_participant`.
- Quando um membro perde acesso ao projeto, deixa imediatamente a sala Socket.IO e não pode consultar o histórico.

### 3.3. Conversas privadas

- Só podem ser iniciadas entre dois membros que partilham o mesmo projeto.
- A conversa pertence ao projeto para manter o contexto e as regras de acesso.
- O par de utilizadores só pode ter uma conversa privada por projeto.
- Gestores e administradores não têm acesso automático ao conteúdo de conversas privadas.
- Se um dos participantes deixar o projeto, a conversa fica bloqueada e deixa de estar acessível por esse participante.
- As mensagens permanecem na base de dados para consistência e auditoria, sujeitas à política de retenção definida pela organização.

### 3.4. Atenção a projetos com quadros restritos

O chat geral torna visível a lista agregada de membros do projeto. Num projeto em que membros de quadros diferentes não devam conhecer-se, o chat geral deve permanecer desativado ou funcionar apenas para gestores.

Por isso, a configuração do projeto deverá oferecer três modos:

- `disabled`: chat indisponível.
- `managers`: apenas gestores e administradores autorizados.
- `all_project_members`: todos os membros agregados do projeto.

O modo inicial recomendado é `disabled` para projetos existentes e `all_project_members` apenas depois de um gestor confirmar a ativação.

## 4. Experiência e interface

### 4.1. Ponto de entrada

- Adicionar um ícone de conversa no lado direito do header, antes das notificações.
- O ícone apresenta o total de conversas com mensagens não lidas.
- Ao clicar, abre-se um popover com:
  - Chat geral do projeto atual.
  - Conversas recentes.
  - Lista pesquisável de membros do projeto.
  - Estado online básico, quando disponível.

### 4.2. Dock de conversas

As janelas ficam fixas no canto inferior direito e crescem da direita para a esquerda.

Dimensões sugeridas:

- Largura: `320px`.
- Altura aberta: `440px`.
- Altura minimizada: `44px`.
- Espaço entre janelas: `8px`.
- Margem ao viewport: `16px`.

Comportamento responsivo:

| Largura disponível | Comportamento |
|---|---|
| Acima de 1440px | Até 3 janelas abertas |
| 1024px–1439px | Até 2 janelas abertas |
| 768px–1023px | 1 janela aberta e restantes no menu de excesso |
| Abaixo de 768px | Painel único em largura total |

Quando o limite é atingido, as restantes conversas ficam num botão `+N`, sem serem encerradas.

### 4.3. Estrutura de cada janela

Cabeçalho:

- Avatar ou ícone do projeto.
- Nome da pessoa ou “Geral — Nome do projeto”.
- Estado online opcional.
- Ações de minimizar e fechar.

Corpo:

- Mensagens agrupadas por autor e proximidade temporal.
- Separadores de data.
- Marcador “Novas mensagens”.
- Carregamento de mensagens antigas ao chegar ao topo.
- Estados de carregamento, vazio, erro e conversa bloqueada.

Compositor:

- Campo de texto com crescimento automático.
- `Enter` envia e `Shift+Enter` cria nova linha.
- Menções no chat geral.
- Botão de envio acessível por teclado.
- Indicador de falha e opção de repetir o envio.

### 4.4. Persistência visual

No MVP, guardar em `localStorage`, por utilizador:

- IDs das conversas abertas.
- Ordem das janelas.
- Estado minimizado.

Não guardar rascunhos com informação sensível no `localStorage`. Caso rascunhos sejam necessários, devem ser adicionados posteriormente com uma decisão explícita de privacidade.

## 5. Modelo de dados

### 5.1. Alteração no projeto

Adicionar à tabela `project`:

```text
chat_mode: disabled | managers | all_project_members
```

### 5.2. Tabela `chat_conversation`

```text
id                  BIGINT PRIMARY KEY
project_id          BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE
type                TEXT NOT NULL CHECK (project_group, project_direct)
created_by_user_id  BIGINT REFERENCES user_account(id) ON DELETE SET NULL
last_message_at     TIMESTAMPTZ
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ
```

Regras:

- Um único `project_group` por projeto.
- Conversas diretas devem ter exatamente dois participantes.
- `last_message_at` permite ordenar conversas sem consultar toda a tabela de mensagens.

### 5.3. Tabela `chat_participant`

```text
id                    BIGINT PRIMARY KEY
conversation_id       BIGINT NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE
user_id               BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE
last_read_message_id  BIGINT NULL
last_read_at           TIMESTAMPTZ
is_muted               BOOLEAN NOT NULL DEFAULT FALSE
created_at             TIMESTAMPTZ NOT NULL
updated_at             TIMESTAMPTZ
```

Índice único em `(conversation_id, user_id)`.

No chat geral, `chat_participant` serve principalmente para estado de leitura e preferências. A autorização real continua a ser validada pelas permissões atuais do projeto.

### 5.4. Tabela `chat_message`

```text
id                BIGINT PRIMARY KEY
conversation_id   BIGINT NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE
user_id           BIGINT REFERENCES user_account(id) ON DELETE SET NULL
text              TEXT NOT NULL
edited_at          TIMESTAMPTZ
deleted_at         TIMESTAMPTZ
created_at         TIMESTAMPTZ NOT NULL
updated_at         TIMESTAMPTZ
```

Índices:

- `(conversation_id, id DESC)` para paginação.
- `(conversation_id, created_at DESC)` para consultas temporais.
- `(user_id)` para operações de auditoria ou eliminação de conta.

As mensagens removidas devem manter o registo, mas devolver apenas o marcador “Mensagem removida”.

### 5.5. Unicidade das conversas privadas

Para garantir uma conversa por par e por projeto, existem duas alternativas:

1. Guardar `direct_key` em `chat_conversation`, construído com os dois IDs ordenados: `menorId:maiorId`.
2. Criar uma tabela adicional de pares e validar em transação.

Recomenda-se `direct_key`, com índice único parcial em `(project_id, direct_key)` quando `type = 'project_direct'`.

## 6. Backend Sails

### 6.1. Novos modelos

Criar:

- `server/api/models/ChatConversation.js`
- `server/api/models/ChatParticipant.js`
- `server/api/models/ChatMessage.js`

Atualizar `Project.js` e `User.js` apenas com as associações necessárias, evitando carregar conversas automaticamente em respostas gerais.

### 6.2. Helpers centrais

Criar helpers para concentrar regras de segurança:

- `chat/get-project-member-user-ids`
- `chat/is-project-member`
- `chat/get-conversation-access`
- `chat/get-or-create-project-conversation`
- `chat/get-or-create-direct-conversation`
- `chat/create-message`
- `chat/update-message`
- `chat/delete-message`
- `chat/mark-as-read`
- `chat/get-unread-counts`

`get-conversation-access` deve ser chamado em todos os endpoints de leitura e escrita. Não é suficiente esconder a conversa no frontend.

### 6.3. Endpoints

```text
GET    /api/projects/:projectId/chat-members
GET    /api/projects/:projectId/chat-conversations
POST   /api/projects/:projectId/chat-conversations/general
POST   /api/projects/:projectId/chat-conversations/direct

GET    /api/chat-conversations/:id/messages?beforeId=&limit=
POST   /api/chat-conversations/:id/messages
PATCH  /api/chat-messages/:id
DELETE /api/chat-messages/:id
POST   /api/chat-conversations/:id/read
```

O endpoint de mensagens deve devolver também os utilizadores necessários para apresentar avatares e nomes, seguindo o padrão `item`/`included` já usado no PLANKA.

### 6.4. Validação

- Texto obrigatório depois de `trim`.
- Limite inicial de 10 000 caracteres por mensagem.
- Sanitização na apresentação de Markdown/HTML.
- Apenas o autor pode editar ou remover a própria mensagem.
- Não permitir editar uma mensagem removida.
- Validar que os dois participantes ainda pertencem ao projeto antes de enviar uma mensagem privada.
- Todas as operações de criação de conversa e participantes devem ocorrer em transação.

## 7. Tempo real com Socket.IO

### 7.1. Salas

Usar salas específicas:

```text
chatConversation:<conversationId>
```

Fluxo de subscrição:

1. O cliente pede acesso à conversa através de um endpoint autenticado.
2. O servidor valida projeto, modo do chat e participação.
3. Apenas depois da validação, o socket entra na sala da conversa.
4. Ao fechar a conversa, perder acesso ao projeto ou terminar sessão, o socket sai da sala.

### 7.2. Eventos

```text
chatMessageCreate
chatMessageUpdate
chatMessageDelete
chatConversationUpdate
chatConversationRead
chatParticipantPresenceUpdate   # opcional no MVP
chatTypingUpdate                # fase 2
```

Além da sala da conversa, enviar atualização de contador para a sala privada já existente do utilizador, para que o badge mude mesmo quando a conversa está fechada.

### 7.3. Reconexão

Ao reconectar:

- Revalidar conversas abertas.
- Voltar a subscrever apenas conversas ainda autorizadas.
- Pedir mensagens posteriores ao último ID conhecido.
- Recalcular contadores de não lidas no servidor.

## 8. Estado e integração no frontend

### 8.1. Redux ORM

Adicionar modelos:

- `ChatConversation`
- `ChatParticipant`
- `ChatMessage`

As mensagens devem ser carregadas apenas quando a respetiva conversa estiver aberta. Não incluir todo o histórico na carga inicial da aplicação.

### 8.2. Actions, Sagas e API

Adicionar módulos equivalentes aos padrões atuais:

```text
client/src/api/chat.js
client/src/actions/chat.js
client/src/entry-actions/chat.js
client/src/sagas/core/services/chat.js
client/src/sagas/core/watchers/chat.js
client/src/selectors/chat.js
```

Atualizar o watcher central de Socket.IO para consumir os novos eventos.

### 8.3. Componentes

Estrutura sugerida:

```text
client/src/components/chat/
  ChatLauncher/
  ChatPopover/
  ChatDock/
  ChatWindow/
  ChatHeader/
  MessageList/
  MessageItem/
  MessageComposer/
  MemberList/
  UnreadBadge/
```

O `ChatDock` deve ser montado em `client/src/components/common/Fixed/Fixed.jsx`, pois precisa permanecer disponível durante a navegação entre quadros e cartões.

O `ChatLauncher` deve ser integrado em `client/src/components/common/Header/Header.jsx`.

### 8.4. Otimismo e falhas

- Criar mensagem local com `localId` antes da resposta do servidor.
- Mostrar estado “a enviar”.
- Substituir a mensagem local pela mensagem persistida ao receber sucesso.
- Em caso de erro, manter a mensagem com opção “Tentar novamente”.
- Deduplicar mensagens recebidas simultaneamente pela resposta HTTP e pelo socket.

## 9. Notificações e mensagens não lidas

### 9.1. Regras

- Não incrementar não lidas para o autor da mensagem.
- Não incrementar se a conversa estiver aberta, visível e com a janela focada.
- Incrementar se estiver minimizada, fechada ou se o separador estiver em segundo plano.
- Menções no chat geral podem gerar uma notificação normal do PLANKA.
- Mensagens privadas devem aparecer no badge de chat; notificações por email ficam fora do MVP.

### 9.2. Fonte de verdade

O servidor é a fonte de verdade para `last_read_message_id` e contadores. O frontend pode atualizar o contador de forma otimista, mas deve sincronizá-lo após reconexão.

## 10. Migração e compatibilidade

Criar uma migração Knex posterior às migrações atuais, por exemplo:

```text
server/db/migrations/20260713000000_add_project_chat.js
```

A migração deve:

1. Adicionar `chat_mode` ao projeto com valor padrão `disabled`.
2. Criar as três tabelas de chat.
3. Criar constraints, chaves estrangeiras e índices.
4. Possuir um `down` completo e seguro.

Não migrar os comentários existentes dos cartões para o chat. Comentário e conversa em tempo real continuam a ser conceitos diferentes.

## 11. Testes

### 11.1. Backend

- Criação única do chat geral.
- Criação única da conversa por par de utilizadores.
- Tentativa de acesso por utilizador externo ao projeto.
- Projeto com chat desativado.
- Projeto restrito a gestores.
- Remoção de membro enquanto a conversa está aberta.
- Edição e remoção apenas pelo autor.
- Paginação sem duplicados ou saltos.
- Reconexão e nova subscrição Socket.IO.
- Contadores de não lidas consistentes.

### 11.2. Frontend

- Abrir chat geral pelo header.
- Abrir conversa através da lista de membros.
- Limite de janelas por largura disponível.
- Minimizar, fechar, restaurar e reordenar.
- Menu `+N` para conversas excedentes.
- Mensagem otimista, falha e repetição.
- Receção em tempo real em duas sessões.
- Navegação entre quadros sem perder as janelas.
- Layout mobile e navegação por teclado.

### 11.3. Segurança

- Testar endpoints diretamente, sem depender das verificações da interface.
- Garantir que sockets não podem entrar em salas arbitrárias.
- Garantir que a lista de membros respeita `chat_mode` e acesso ao projeto.
- Sanitizar conteúdo para impedir XSS.
- Verificar ausência de conteúdo privado nos logs de aplicação.

## 12. Fases de implementação

### Fase 0 — Confirmação do produto

- Confirmar que “elementos do projeto” significa membros do projeto.
- Aprovar os três modos de chat.
- Aprovar política para utilizadores removidos e retenção de mensagens.
- Aprovar dimensões e limite de janelas.

Resultado: regras fechadas antes de criar a base de dados.

### Fase 1 — Fundação backend

- Migração e modelos.
- Helpers de autorização.
- Endpoints de conversas e mensagens.
- Testes de acesso e paginação.

Resultado: chat funcional por API, ainda sem interface final.

### Fase 2 — Tempo real e não lidas

- Salas e eventos Socket.IO.
- Reconexão.
- Leitura e contadores.
- Integração com a sala privada do utilizador.

Resultado: duas sessões trocam mensagens e sincronizam contadores.

### Fase 3 — Interface minimalista

- Launcher e popover.
- Dock e janelas lado a lado.
- Lista de mensagens e compositor.
- Persistência visual e responsividade.
- Estados de erro e acessibilidade.

Resultado: experiência completa no desktop e mobile.

### Fase 4 — Integração, testes e lançamento

- Traduções.
- Testes automatizados e E2E.
- Revisão de segurança.
- Ativação inicialmente controlada por projeto.
- Monitorização de erros, volume de mensagens e consumo de sockets.

Resultado: recurso pronto para ativação progressiva.

### Fase 5 — Melhorias

- Reações, anexos, pesquisa, respostas e partilha de cartões.
- Avaliação de chats contextuais por quadro/cartão.
- Avaliação de ponte com Matrix ou Zulip, se surgir necessidade externa.

## 13. Critérios de aceitação do MVP

O MVP está concluído quando:

- Um gestor consegue ativar o chat num projeto.
- Todos os membros autorizados veem e usam o chat geral.
- Um membro consegue iniciar uma conversa privada com outro membro do mesmo projeto.
- Um utilizador externo não consegue descobrir nem abrir conversas do projeto.
- Mensagens aparecem em tempo real em duas sessões.
- Não lidas permanecem corretas após atualizar a página e reconectar o socket.
- Até três janelas funcionam lado a lado sem bloquear o quadro.
- O layout adapta-se a tablet e mobile.
- Edição, remoção e paginação funcionam sem duplicar mensagens.
- A suite de testes de permissões, sockets e UI passa.

## 14. Decisão arquitetural recomendada

Implementar o chat diretamente no PLANKA é a opção mais adequada para esta fase porque:

- Reutiliza autenticação e permissões existentes.
- Evita sincronizar utilizadores com um segundo sistema.
- Permite a interface exata de janelas lado a lado.
- Mantém mensagens, backups e operação no mesmo ambiente PostgreSQL/Docker.
- Reduz dependências operacionais e pontos de falha.

Matrix ou Zulip continuam opções válidas para uma futura camada externa, mas não são necessários para cumprir o requisito atual.
