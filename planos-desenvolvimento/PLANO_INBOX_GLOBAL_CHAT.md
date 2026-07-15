# Plano de implementação: Inbox global do chat com launcher único

> Estado: MVP implementado em 15 de julho de 2026. A fase complementar de badges por projeto e os alertas externos permanecem planeados para uma entrega posterior.

## 1. Objetivo

Permitir que um utilizador acompanhe todas as conversas não lidas dos projetos a que tem acesso sem ter de abrir cada projeto individualmente.

A solução deve:

- manter uma única bolha de chat, sempre na posição atual no canto inferior direito;
- apresentar um contador global de conversas não lidas;
- abrir uma Inbox global na página inicial;
- continuar a privilegiar as conversas do projeto quando o utilizador está dentro de um projeto;
- permitir alternar entre o contexto local e `Todas as mensagens` sem criar outro launcher;
- abrir o projeto e a conversa corretos a partir de uma entrada global;
- reutilizar leitura, preferências, janelas, deep links, componentes visuais e eventos socket existentes;
- evitar misturar mensagens de chat com o sino de notificações de tarefas e cartões.

## 2. Decisões de produto

### 2.1. Um único ponto de entrada

Existirá apenas um `ChatLauncher`:

- conserva a posição atual, fixa no canto inferior direito;
- aparece na página inicial e dentro dos projetos quando o utilizador tem acesso a pelo menos um chat;
- não é adicionada uma segunda bolha ao cabeçalho;
- não é reutilizado o sino de notificações como entrada do chat.

O launcher atual já está montado globalmente por `Fixed.jsx`. A limitação atual resulta de `ChatContext` definir `isEnabled` exclusivamente a partir do projeto ativo.

### 2.2. Comportamento por contexto

#### Na página inicial

Ao clicar na bolha:

- abre diretamente a Inbox global;
- o filtro inicial é `Não lidas` quando existem conversas por ler;
- se não existirem mensagens não lidas, abre `Todas` com as conversas recentes;
- cada linha identifica claramente o projeto a que pertence.

#### Dentro de um projeto

Ao clicar na mesma bolha:

- abre inicialmente a lista de conversas do projeto atual;
- o cabeçalho do painel apresenta a ação `Todas as mensagens` e o contador global;
- ao selecionar essa ação, o conteúdo do mesmo painel muda para a Inbox global;
- a Inbox global apresenta uma ação `Voltar a <nome do projeto>` enquanto houver um projeto ativo.

O painel muda de âmbito, mas a bolha, a animação de abrir/fechar e a posição permanecem as mesmas.

### 2.3. Significado dos contadores

Para evitar números excessivos e tornar o estado compreensível:

- o badge da bolha representa o número de **conversas** com pelo menos uma mensagem não lida;
- o badge de cada linha representa o número de **mensagens** não lidas nessa conversa;
- o limite visual continua em `99+`, sem alterar o valor real usado no texto acessível;
- mensagens do próprio utilizador não contam;
- mensagens removidas não contam;
- silenciar uma conversa impede alertas, mas não altera o respetivo estado de leitura.

Exemplo:

```text
Bolha: 4

Mensagens — 4 conversas não lidas

Carlos
AI Project · 12 novas
“Já terminei a primeira versão…”

Geral
Retouche Retail Mag · 2 novas
“Podem confirmar este ponto?”
```

### 2.4. Ordenação e filtros

A Inbox global usa uma lista cronológica, em vez de grupos de projeto fechados:

1. conversas com atividade mais recente primeiro;
2. o nome do projeto aparece como metadado em cada linha;
3. filtros previstos: `Não lidas`, `Menções` e `Todas`;
4. pesquisa por nome de projeto, conversa ou participante;
5. um filtro opcional de projeto pode ser acrescentado sem alterar a estrutura da lista.

O filtro `Menções` pode entrar numa segunda entrega. Não deve bloquear o MVP da agregação global.

### 2.5. Leitura

- abrir a Inbox global não marca conversas como lidas;
- clicar numa entrada navega para o projeto e abre a conversa;
- a conversa só é marcada como lida quando a janela está visível e o browser tem foco, preservando a regra atual;
- cada linha pode oferecer `Marcar como lida` sem abrir a conversa;
- `Marcar todas como lidas` exige uma ação explícita do utilizador;
- não será implementado `Marcar como não lida` no MVP, porque o cursor atual é monotónico e não deve recuar.

Se no futuro for necessário `Marcar como não lida`, deve ser criado um estado separado de lembrete ou triagem, em vez de alterar `lastReadMessageId` para trás.

### 2.6. Notificações

A Inbox é a fonte de verdade para mensagens pendentes. Outros canais servem apenas de alerta:

- o sino atual continua reservado a tarefas, cartões, comentários e restantes eventos de trabalho;
- alertas visuais ou do browser respeitam `notificationLevel` e `mutedUntil`;
- conversa direta e menção podem gerar alertas em tempo real;
- alertas do browser só devem ser apresentados quando a aplicação não está visível ou não tem foco;
- email, se for adicionado, deve preferir um resumo diferido e ser cancelado quando a mensagem já tiver sido lida.

Notificações externas ficam fora do MVP da Inbox global.

## 3. Diagnóstico do estado atual

### 3.1. Infraestrutura reutilizável

O chat já possui:

- `ChatLauncher` com badge, animação e acessibilidade;
- `ChatPanel`, `ConversationList`, `ConversationRow` e `ChatAvatar`;
- `ChatDock` e `ChatWindow` para janelas abertas;
- `ChatContext` com persistência por utilizador e projeto;
- `ChatConversation.unreadCount` no Redux ORM;
- `chat_participant.last_read_message_id` e `last_read_at`;
- endpoint `POST /api/chat-conversations/:id/read`;
- eventos `chatConversationUpdate` e `chatConversationRead` dirigidos a `@user:<id>`;
- preferências `all`, `mentions` e `none`, além de `mutedUntil`;
- deep links `?chatConversation=<id>&chatMessage=<id>`;
- proteção contra respostas de leitura desatualizadas;
- reconciliação de acessos e eventos de revogação.

### 3.2. Limitações que impedem a Inbox global

1. `selectChatUnreadTotal` soma apenas conversas do `projectId` presente na rota.
2. `ChatProvider` carrega conversas apenas para o projeto atual.
3. Na página inicial, `isCurrentUserChatMemberForCurrentProject` é falso e o launcher desaparece.
4. `GET /api/projects/:projectId/chat-conversations` exige um projeto específico.
5. `handleChatConversationUpdate` ignora o evento quando a conversa ainda não existe no Redux ORM.
6. Carregar todas as conversas completas de todos os projetos aumentaria o volume de participantes, utilizadores e estado desnecessariamente.
7. O contador atual do launcher representa mensagens do projeto ativo, não conversas globais.

Conclusão: os componentes visuais e os contratos de leitura podem ser reutilizados, mas é necessária uma camada global de resumo independente do estado completo do projeto ativo.

## 4. Arquitetura proposta

```text
GET /api/chat-inbox
        |
        v
resumos globais autorizados
        |
        v
Redux chat.inboxItemsByConversationId
        |
        +--> badge global do ChatLauncher
        +--> Inbox global
        +--> contadores por projeto

Eventos @user:<id>
        |
        +--> atualizam o resumo global
        +--> atualizam ChatConversation se a conversa local estiver carregada
```

O histórico completo, participantes completos, mensagens, rascunhos e janelas continuam a ser carregados apenas quando o respetivo projeto ou conversa é aberto.

### 4.1. Estado global leve

Adicionar ao reducer de chat, sem duplicar mensagens completas:

```js
inboxItemsByConversationId: {},
isInboxFetching: false,
hasFetchedInbox: false,
inboxError: null,
inboxScope: 'global',
```

Cada item contém apenas o necessário para a lista e a navegação. Não deve ser inserido parcialmente em `ChatConversation`, porque isso pode sobrescrever dados mais completos de uma conversa já carregada.

Seletores previstos:

- `selectChatInboxItems`;
- `selectChatInboxUnreadItems`;
- `selectChatInboxUnreadConversationTotal`;
- `selectChatInboxUnreadMessageTotal`;
- `selectChatInboxUnreadTotalsByProjectId`;
- `selectChatInboxMentionItems`;
- `selectIsChatAvailableForCurrentUser`.

### 4.2. Contrato do endpoint global

Nova rota:

```text
GET /api/chat-inbox?filter=unread|mentions|all&before=<cursor>&limit=50
```

Resposta sugerida:

```json
{
  "items": [
    {
      "conversationId": "123",
      "projectId": "45",
      "projectName": "AI Project",
      "type": "projectDirect",
      "title": "Carlos",
      "avatarUserId": "9",
      "lastMessage": {
        "id": "987",
        "userId": "9",
        "text": "Já terminei a primeira versão",
        "createdAt": "2026-07-15T10:42:00.000Z"
      },
      "firstUnreadMessageId": "980",
      "unreadCount": 8,
      "hasUnreadMention": false,
      "notificationLevel": "all",
      "mutedUntil": null,
      "isMuted": false
    }
  ],
  "meta": {
    "unreadConversationTotal": 4,
    "unreadMessageTotal": 17,
    "unreadConversationTotalsByProjectId": {
      "45": 2,
      "82": 2
    },
    "hasMore": false,
    "nextCursor": null
  }
}
```

Regras do contrato:

- os IDs permanecem strings;
- o preview usa o apresentador seguro de mensagens existente;
- mensagens removidas não expõem texto nem anexos;
- o servidor calcula o título de apresentação ou inclui os utilizadores mínimos necessários;
- o endpoint nunca devolve histórico completo;
- o cursor de paginação deve ordenar por `last_message_at DESC, id DESC`;
- `limit` tem um máximo definido no servidor;
- a resposta inclui totais globais mesmo quando a lista está paginada.

### 4.3. Autorização do endpoint

O servidor deve aplicar as mesmas regras do chat por projeto:

- excluir projetos com `chatMode = disabled`;
- incluir apenas projetos em que o utilizador é membro elegível;
- incluir a conversa geral para membros elegíveis;
- incluir conversas diretas apenas quando o utilizador é participante;
- incluir grupos personalizados apenas quando o utilizador é participante e o grupo não está arquivado;
- excluir conversas bloqueadas ou sem participantes ativos suficientes, conforme o contrato atual;
- nunca confiar nos IDs de projeto enviados pelo cliente para definir acesso.

Na conversa geral pode ainda não existir um `chat_participant` para um utilizador que nunca abriu o chat. O resumo global deve manter a semântica atual de cursor nulo e `mark-as-read` continuará a criar o participante quando necessário.

Esta entrega não altera retroativamente a decisão sobre mensagens anteriores à entrada do utilizador no projeto. Uma eventual regra de "ler apenas desde a adesão" deve ser tratada como feature separada.

### 4.4. Atualização em tempo real

Reutilizar os eventos dirigidos a `@user:<id>`:

- `chatConversationCreate` adiciona o resumo quando concede acesso;
- `chatConversationUpdate` atualiza `lastMessage`, `lastMessageAt` e `unreadCount`;
- `chatConversationRead` atualiza o cursor e o contador;
- `chatConversationAccessRevoke` remove uma conversa;
- `chatProjectAccessRevoke` remove todos os itens do projeto;
- `chatParticipantUpdate` atualiza mute e nível de notificação.

Alterações necessárias no contrato socket:

1. garantir que atualizações globais incluem sempre `conversationId` ou `id` e `projectId`;
2. incluir os campos de resumo que possam ter mudado;
3. aplicar a atualização ao `inboxItemsByConversationId`, mesmo que a conversa não exista em Redux ORM;
4. continuar a aplicar a atualização ao modelo local quando este existir;
5. refazer `GET /api/chat-inbox` após reconexão para corrigir eventos perdidos.

Se os payloads existentes se tornarem demasiado ambíguos, criar um evento canónico `chatInboxItemUpdate`. A primeira opção deve ser estender minimamente os eventos atuais, evitando duas fontes de verdade.

### 4.5. Navegação para uma conversa global

Ao clicar num item global:

1. fechar o painel;
2. conservar `conversationId` e `firstUnreadMessageId`;
3. navegar para `/projects/:projectId` com os parâmetros de deep link;
4. deixar o `ChatProvider` carregar o chat do projeto;
5. abrir a conversa quando esta estiver disponível;
6. carregar o histórico em torno de `firstUnreadMessageId`, quando fornecido;
7. marcar como lida apenas segundo as regras de visibilidade e foco atuais.

Exemplo:

```text
/projects/45?chatConversation=123&chatMessage=980
```

Na página inicial não se abre uma `ChatWindow` sem contexto de projeto. A navegação ocorre primeiro e a janela abre depois do carregamento autorizado.

### 4.6. Marcar todas como lidas

Para evitar dezenas de pedidos individuais, adicionar uma operação em lote:

```text
POST /api/chat-inbox/read
{
  "conversationIds": ["123", "456"]
}
```

Regras:

- aceitar apenas conversas a que o utilizador ainda tem acesso;
- limitar a quantidade por pedido;
- reutilizar o avanço monotónico do cursor;
- devolver os estados canónicos de leitura por conversa;
- publicar `chatConversationRead` para sincronizar outras sessões;
- uma mensagem recebida durante a operação continua não lida se for posterior ao cursor aplicado.

O endpoint individual existente continua a ser usado para `Marcar como lida` numa única linha.

## 5. Plano de implementação por fases

### Fase 1: endpoint e estado global

Backend:

- `server/config/routes.js`
- novo `server/api/controllers/chat-inbox/index.js`
- novo `server/api/helpers/chat/get-inbox.js`
- query methods dos modelos `ChatConversation`, `ChatParticipant` e `ChatMessage`, conforme necessário
- testes de controller, autorização, contadores e paginação

Frontend:

- `client/src/api/chat.js`
- `client/src/constants/ActionTypes.js`
- `client/src/actions/chat.js`
- `client/src/entry-actions/chat.js`
- `client/src/sagas/core/watchers/chat.js`
- `client/src/sagas/core/services/chat.js`
- `client/src/reducers/chat.js`
- `client/src/selectors/chat.js`

Resultado:

- o cliente obtém resumos de todos os projetos autorizados;
- o total global existe fora de qualquer projeto;
- nenhuma conversa completa é carregada desnecessariamente.

### Fase 2: launcher único e Inbox global

Reutilizar:

- `client/src/components/chat/ChatLauncher/ChatLauncher.jsx`
- `client/src/components/chat/ChatLauncher/ChatLauncher.module.scss`
- tokens de `client/src/components/chat/theme.scss`
- `ChatAvatar` e primitivas visuais das linhas atuais

Alterar:

- `ChatLauncher` passa a usar `selectChatInboxUnreadConversationTotal`;
- `ChatContext` separa disponibilidade global de disponibilidade no projeto atual;
- o launcher fica disponível na homepage quando existe pelo menos um projeto com chat acessível;
- o painel recebe um âmbito `project` ou `global`;
- dentro de projeto, o âmbito inicial continua a ser `project`;
- fora de projeto, o âmbito inicial é `global`.

Novos componentes sugeridos:

- `client/src/components/chat/GlobalInbox/GlobalInbox.jsx`
- `client/src/components/chat/GlobalInbox/GlobalInbox.module.scss`
- `client/src/components/chat/GlobalInboxRow/GlobalInboxRow.jsx`
- `client/src/components/chat/GlobalInboxRow/GlobalInboxRow.module.scss`

Não duplicar o launcher nem o painel exterior. `GlobalInbox` representa apenas o conteúdo específico do âmbito global.

### Fase 3: navegação, leitura e atualizações socket

- ligar uma linha global aos deep links existentes;
- garantir que `ChatContext` abre a conversa depois da mudança de projeto;
- atualizar o resumo global através dos eventos `@user:<id>`;
- deixar de ignorar para a Inbox atualizações de conversas ainda não carregadas localmente;
- sincronizar `chatConversationRead` entre o resumo global e o modelo local;
- implementar `Marcar como lida` por linha;
- implementar `POST /api/chat-inbox/read` e `Marcar todas como lidas`;
- refazer a Inbox após reconexão.

### Fase 4: badges por projeto

Adicionar uma indicação secundária nos projetos sem misturar semânticas:

- `client/src/components/projects/ProjectCard/ProjectCard.jsx`
- `client/src/components/common/Sidebar/ProjectItem.jsx`

Regras:

- usar os totais de conversas não lidas derivados da Inbox;
- apresentar um ícone de chat ou badge semanticamente distinto da notificação de cartões;
- não reutilizar `project.hasNotifications` para chat;
- não marcar mensagens como lidas apenas por entrar no projeto;
- garantir que notificações de cartões e mensagens podem coexistir sem sobreposição visual.

Esta fase é complementar. A Inbox global e o launcher já resolvem o problema principal.

### Fase 5: filtros, pesquisa e alertas externos

- filtro `Menções` baseado apenas em mensagens não lidas que mencionam o utilizador;
- pesquisa global por projeto, conversa e participante;
- filtro por projeto;
- notificações do browser com permissão explícita;
- eventual resumo por email apenas para mensagens que permanecem não lidas.

Esta fase não deve atrasar o MVP.

## 6. Localização e acessibilidade

Ficheiros:

- `client/src/locales/pt-PT/chat.js`
- `client/src/locales/en-US/chat.js`
- `client/src/locales/es-ES/chat.js`
- `client/src/locales/fr-FR/chat.js`

Textos previstos:

- `Todas as mensagens`;
- `Voltar a {{project}}`;
- `Não lidas`;
- `Menções`;
- `Todas`;
- `Marcar como lida`;
- `Marcar todas como lidas`;
- `{{count}} conversas não lidas`;
- `{{count}} mensagens não lidas em {{conversation}}`;
- estados de carregamento, erro e vazio.

Requisitos:

- o launcher mantém `aria-controls`, `aria-expanded` e um nome acessível global;
- o badge visual limitado a `99+` não limita o valor anunciado pelo leitor de ecrã;
- filtros usam botões ou tabs com semântica correta;
- linhas são navegáveis por teclado;
- `focus-visible` permanece distinto do estado não lido;
- o estado não lido usa badge e peso tipográfico, não apenas cor;
- o painel global tem estado de loading com skeleton, erro com retry e estado vazio;
- animações respeitam `prefers-reduced-motion`.

## 7. Desempenho e segurança

### 7.1. Desempenho

- não fazer um pedido por projeto;
- executar uma consulta agregada e paginada no servidor;
- não devolver históricos nem anexos completos;
- evitar N+1 ao resolver projetos, participantes e últimos autores;
- confirmar índices em `chat_conversation(project_id, last_message_at)`, `chat_participant(user_id, conversation_id)` e `chat_message(conversation_id, id)`;
- limitar previews e sanitizar texto antes de guardar no Redux;
- fazer debounce da pesquisa remota, caso a pesquisa deixe de ser apenas local;
- refazer a Inbox na reconexão em vez de tentar reconstruir eventos perdidos.

### 7.2. Segurança

- validar acesso no carregamento e em cada ação de leitura;
- não expor nomes, previews ou IDs de conversas sem acesso;
- remover imediatamente itens após revogação;
- usar o apresentador seguro existente para mensagens removidas e anexos;
- não enviar texto de mensagens para logs, Sentry ou analytics;
- limitar o endpoint em lote e rejeitar IDs duplicados ou inválidos;
- cruzar novamente destinatários com permissões atuais antes de broadcasts.

## 8. Migrações

O MVP não necessita de nova tabela nem migração.

São reutilizados:

- `chat_conversation.last_message_at`;
- `chat_participant.last_read_message_id`;
- `chat_participant.last_read_at`;
- `chat_participant.notification_level`;
- `chat_participant.muted_until`;
- `chat_message.user_id`, `deleted_at` e `created_at`.

Uma migração só deve ser criada se a medição real revelar falta de índices ou se uma fase futura introduzir um estado independente de triagem.

## 9. Testes

### 9.1. Backend

Cobrir:

- utilizador com acesso a vários projetos recebe as conversas autorizadas de todos eles;
- projetos com chat desativado não aparecem;
- conversa direta sem participação não aparece;
- grupo personalizado arquivado não aparece;
- conversa geral funciona mesmo sem participante criado anteriormente;
- mensagens próprias e removidas não contam;
- `unreadConversationTotal` conta conversas, não mensagens;
- totais por projeto correspondem aos itens;
- `firstUnreadMessageId` é o primeiro item posterior ao cursor;
- ordenação e paginação não duplicam nem omitem conversas;
- leitura individual atualiza a Inbox;
- leitura em lote não apaga uma mensagem recebida depois do cursor aplicado;
- revogação remove a conversa ou o projeto da Inbox;
- a resposta nunca inclui conteúdo de projetos sem acesso.

### 9.2. Frontend

Cobrir:

- na homepage, a mesma bolha abre a Inbox global;
- dentro do projeto, a bolha abre primeiro o âmbito local;
- `Todas as mensagens` troca o conteúdo do mesmo painel;
- não existem duas bolhas simultâneas;
- o badge global conta conversas não lidas;
- o badge da linha conta mensagens;
- evento de uma conversa não carregada atualiza a Inbox;
- evento de uma conversa carregada atualiza Inbox e Redux ORM;
- leitura atualiza ambos sem corrida;
- reconexão refaz o resumo;
- pesquisar e alternar filtros não altera estados de leitura;
- clicar numa entrada global produz o deep link correto;
- loading, vazio, erro e retry são apresentados;
- navegação por teclado e nomes acessíveis funcionam.

### 9.3. Cenários manuais com duas sessões

1. Utilizador A permanece na homepage.
2. Utilizador B envia mensagens em dois projetos diferentes.
3. A vê uma única bolha com contador `2`.
4. A abre a bolha e encontra as duas conversas ordenadas por atividade.
5. A abre uma delas e é encaminhado para o projeto correto.
6. A conversa abre na primeira mensagem não lida e só fica lida quando visível e com foco.
7. A volta à homepage e o contador passa para `1`.
8. B envia nova mensagem na conversa já aberta enquanto a aba de A está escondida.
9. O contador volta a aumentar sem A entrar manualmente no projeto.
10. A silencia a conversa; novas mensagens continuam na Inbox, mas não geram alerta.
11. Um administrador remove o acesso de A a um dos projetos; o item desaparece em tempo real.
12. A recarrega ou reconecta e os totais permanecem corretos.

## 10. Critérios de aceitação

- Existe apenas uma bolha de chat em toda a aplicação.
- A bolha permanece na mesma posição atual no desktop e no mobile.
- Na homepage, a bolha abre a Inbox global.
- Dentro de um projeto, a bolha abre inicialmente as conversas do projeto.
- O utilizador consegue alternar para `Todas as mensagens` no mesmo painel.
- O badge da bolha corresponde ao total de conversas não lidas de todos os projetos autorizados.
- Cada linha mostra projeto, conversa, preview, hora e contador de mensagens não lidas.
- O utilizador abre qualquer conversa global sem procurar manualmente o projeto.
- Abrir a Inbox não marca mensagens como lidas.
- Leitura, novas mensagens e revogações sincronizam entre sessões em tempo real.
- O sino de notificações permanece independente do chat.
- Não são carregados históricos completos de todos os projetos.
- Não existe fuga de previews ou nomes de conversas sem autorização.
- O MVP não requer migração de base de dados.

## 11. Ordem de entrega recomendada

1. Criar o endpoint global, contrato, autorização e testes de backend.
2. Adicionar estado, actions, sagas e seletores da Inbox.
3. Alterar o badge do launcher para o total global de conversas.
4. Disponibilizar o launcher na homepage.
5. Implementar o conteúdo `GlobalInbox` no painel existente.
6. Adicionar a alternância `Projeto` / `Todas as mensagens`.
7. Ligar itens globais aos deep links e janelas locais.
8. Sincronizar eventos socket, leitura e revogações.
9. Adicionar leitura em lote.
10. Validar acessibilidade, mobile, reconexão e duas sessões reais.
11. Adicionar badges por projeto, filtros e alertas externos em entregas posteriores.

## 12. Impacto estimado

- Backend: médio, devido à consulta agregada global e à autorização transversal.
- Frontend: médio, com reutilização forte do launcher e do sistema visual atual.
- Base de dados: sem alteração prevista no MVP.
- Risco principal: inconsistência entre o resumo global e a conversa local após eventos perdidos ou concorrência de leitura.
- Mitigação principal: resposta canónica do servidor, atualizações dirigidas ao utilizador e refetch integral após reconexão.
- Risco visual: baixo, porque a bolha, a posição e os tokens existentes são preservados.
