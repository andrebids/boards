# Remover o histórico de uma conversa do chat

Written against: `6a1b447ef950aa8b44ab7c962f5f7dfbce162f4b` (o worktree contém alterações não commitadas no chat; reconciliar antes de editar)

## Estado da implementação — 2026-08-28

Implementado no worktree local, sem build e sem deploy:

- migração `history_cleared_through_message_id` em `chat_participant`;
- endpoint `DELETE /api/chat-conversations/:id/history`;
- filtragem da fronteira nas mensagens, deep links, contagens de não lidas, lista do projeto e inbox global;
- sincronização entre sessões com `chatConversationHistoryClear`;
- ação no menu `...` das linhas e novo menu `...` entre notificações e fechar na janela aberta;
- confirmação destrutiva com loading, erro e texto explícito de que a remoção é apenas local;
- preservação de mensagens otimistas pendentes ou falhadas;
- reaparecimento quando chega uma mensagem com ID posterior à fronteira.

Os testes focados e lint estão registados na validação final da implementação. A migração continua por aplicar até o ambiente de desenvolvimento/produção executar o fluxo normal de migrações.

## Objetivo

Permitir que um utilizador remova da sua conta o histórico anterior de uma conversa, sem apagar mensagens ou anexos dos restantes participantes.

A experiência segue a separação usada pelo Microsoft Teams:

- remover o histórico afeta apenas o utilizador que executa a ação;
- apagar uma mensagem enviada continua a ser uma operação individual;
- sair de um grupo continua a alterar a participação e não é substituído por remover o histórico;
- uma purga global ou administrativa fica fora deste fluxo.

Referências:

- [Hide a chat, remove chat history or leave a chat thread in Microsoft Teams](https://support.microsoft.com/en-US/teams/chat/hide-a-chat-remove-chat-history-or-leave-a-chat-thread-in-microsoft-teams)
- [Manage messaging policies in Teams](https://learn.microsoft.com/en-us/microsoftteams/messaging-policies-in-teams)

## Leitura de design

Extensão discreta de uma interface de chat existente para utilizadores internos, com hierarquia inspirada no Teams e adaptada aos tokens atuais do Planka.

- `DESIGN_VARIANCE: 2`: preservar a composição atual.
- `MOTION_INTENSITY: 2`: apenas feedback e abertura de menus já existentes.
- `VISUAL_DENSITY: 7`: manter a densidade compacta da janela de 360 x 500 px.
- Sistema visual: componentes, Lucide e tokens existentes do chat. Não instalar Fluent UI nem outra dependência.

## Evidência atual

- `chat_conversation` é partilhada e identifica o projeto, tipo, título e última atividade.
- `chat_participant` já contém estado privado por utilizador: leitura, mute, nível de notificação e papel no grupo.
- `chat_message.deleted_at` suporta remoção de mensagens individuais, não da conversa completa.
- A lista de projeto já apresenta um botão `...` por conversa através de `ConversationActions`.
- A janela aberta já apresenta gestão do grupo, preferências de notificação e fechar no cabeçalho.
- O inbox global tem uma linha mais densa e uma ação rápida de marcar como lida. Não tem menu contextual.
- O servidor já usa IDs monotónicos de mensagem para cursores de leitura. A mesma propriedade deve definir a fronteira do histórico removido.

## Decisão de produto

### Nome da ação

Usar **Remover histórico**.

Não usar **Apagar conversa**, porque sugere que as mensagens serão eliminadas para todos. Não usar apenas **Ocultar**, porque o histórico anterior também deixa de estar acessível para aquele utilizador.

### Resultado por tipo de conversa

| Tipo | Depois de remover | Quando volta a aparecer |
| --- | --- | --- |
| Geral do projeto | A entrada fixa `Geral` permanece, mas abre sem mensagens anteriores | As novas mensagens aparecem normalmente |
| Direta | Sai das listas e da pesquisa | Quando um participante envia nova mensagem ou o utilizador inicia novamente a conversa |
| Grupo personalizado | Sai das listas e da pesquisa, mas o utilizador continua membro | Quando chega nova mensagem ou a conversa é aberta novamente |

Para sair de um grupo e perder a capacidade de enviar mensagens, o utilizador continua a usar **Sair do grupo**.

### Limite funcional

Remover histórico não é eliminação de dados, RGPD ou compliance. As mensagens e os anexos permanecem armazenados porque continuam acessíveis aos restantes participantes.

Uma futura eliminação global deve ser um fluxo administrativo independente, com permissões, auditoria, retenção e limpeza de ficheiros.

## Plano de layout

### Superfície 1: lista de conversas do projeto

Usar o trigger `...` que já aparece no canto direito de `ConversationRow` por hover, foco ou touch. Não acrescentar um segundo botão à linha.

```text
Conversas

Fixada
┌────────────────────────────────────┐
│ [avatar] Geral                 10:24 │
│          Ana: Atualização       [...] │  <- trigger existente
└────────────────────────────────────┘
```

Menu direto ou Geral:

```text
┌───────────────────────┐
│ Notificações           │
│ [sino] Todas          │
│ [@] Apenas menções  │
│ [relógio] 1 hora      │
│ [relógio] Até amanhã  │
│ [sino off] Silenciar  │
├───────────────────────┤
│ [lixo] Remover        │  <- novo
│        histórico       │
└───────────────────────┘
```

Menu de grupo personalizado:

```text
┌───────────────────────┐
│ Notificações           │
│ ...                   │
├───────────────────────┤
│ [pessoas] Gerir grupo │  <- owner
│ [lixo] Remover        │  <- novo
│        histórico       │
│ [sair] Sair do grupo  │  <- existente
└───────────────────────┘
```

Regras visuais:

- manter `min-width: 230px`, padding, raio, sombra e tokens atuais;
- colocar um divisor antes das ações de conversa;
- usar `Trash2` da dependência Lucide já instalada;
- usar `--chat-danger` apenas no texto e ícone da ação;
- no hover e foco, reutilizar o fundo danger translúcido da ação **Sair do grupo**;
- não mostrar um ícone de lixo permanente na linha;
- manter a ação acessível em touch através do comportamento existente de `ConversationActions`.

### Superfície 2: cabeçalho da conversa aberta

Adicionar um trigger `...` entre o botão de notificações e o botão de fechar.

```text
┌────────────────────────────────────┐
│ [<-] [avatar] Catarina            │
│              Disponível [sino][...][x] │
└────────────────────────────────────┘
                                     ^ novo
```

Num grupo personalizado, o botão de gestão continua antes do sino:

```text
[gestão do grupo] [notificações] [...] [fechar]
```

Menu:

```text
┌───────────────────────┐
│ [lixo] Remover        │
│        histórico       │
└───────────────────────┘
```

Regras visuais:

- botão de 34 x 34 px, igual aos controlos do cabeçalho;
- `MoreHorizontal`, 17 px, `strokeWidth={2}`;
- menu com 230 px, alinhado ao lado direito do trigger e limitado ao viewport;
- não colocar a ação dentro do menu do sino, porque não é uma preferência de notificação;
- truncar o título normalmente quando os quatro controlos de grupo ocuparem largura;
- fechar os menus de notificação e grupo ao abrir este menu;
- fechar este menu ao abrir notificações ou gestão do grupo.

### Superfície 3: inbox global

Não acrescentar a ação diretamente a `GlobalInboxRow` no MVP.

Motivos:

- a linha já combina hora, badge de não lidas e ação rápida de marcar como lida;
- um segundo controlo flutuante aumenta colisão e densidade em touch;
- abrir a conversa dá acesso imediato ao novo menu `...` no cabeçalho;
- evita criar uma segunda implementação do menu apenas para o inbox global.

Adicionar um menu direto ao inbox global apenas se testes reais mostrarem que abrir primeiro a conversa é um obstáculo frequente.

### Diálogo de confirmação

Reutilizar `AlertDialog`, com tom `danger`. Não criar um modal novo.

```text
┌────────────────────────────────────┐
│ Remover histórico?                 │
│                                    │
│ As mensagens anteriores deixarão  │
│ de aparecer apenas para si. Os      │
│ outros participantes continuam a    │
│ vê-las. Novas mensagens voltarão a │
│ mostrar esta conversa.              │
│                                    │
│                 [Cancelar] [Remover]│
└────────────────────────────────────┘
```

Texto proposto:

- Título: `Remover histórico?`
- Descrição: `As mensagens anteriores deixarão de aparecer apenas para si. Os outros participantes continuam a vê-las. Novas mensagens voltarão a mostrar esta conversa.`
- Ação secundária: `Cancelar`
- Ação principal: `Remover`
- Estado pendente: `A remover...`
- Erro: `Não foi possível remover o histórico. Tente novamente.`

O foco inicial deve permanecer na opção segura definida por `AlertDialog`. `Escape` cancela e devolve o foco ao trigger que abriu o diálogo.

### Estado depois do sucesso

Conversa direta ou grupo personalizado:

```text
1. Fechar diálogo.
2. Fechar a janela aberta em todos os dispositivos do utilizador.
3. Remover a conversa das listas e pesquisa.
4. Remover do Redux as mensagens anteriores daquela conversa.
5. Não mostrar toast de sucesso. O desaparecimento da conversa é o feedback.
```

Conversa Geral:

```text
1. Fechar diálogo.
2. Manter a janela aberta.
3. Mostrar o estado vazio normal da conversa.
4. Manter a entrada Geral na secção Fixada.
5. Não mostrar toast de sucesso.
```

Se o pedido falhar, conservar a conversa e as mensagens, manter o diálogo aberto e apresentar o erro. Não aplicar remoção otimista a uma ação destrutiva.

## Modelo de dados

Adicionar a `chat_participant`:

```text
history_cleared_through_message_id bigint null
```

Nome no modelo:

```text
historyClearedThroughMessageId
```

O campo guarda a última mensagem que pertence ao histórico removido. Uma mensagem só fica visível para o participante quando:

```text
message.id > COALESCE(participant.history_cleared_through_message_id, 0)
```

Não usar apenas uma data. IDs evitam empates de timestamp e seguem a mesma ordenação exata já usada pelos cursores de leitura.

Não reutilizar `ChatConversation.archivedAt`, porque esse estado é partilhado e esconderia a conversa para todos.

## Contrato do servidor

### Endpoint

```http
DELETE /api/chat-conversations/:id/history
```

Sem body. O servidor determina a fronteira atual e nunca aceita do cliente um ID arbitrário.

Resposta:

```json
{
  "item": {
    "conversationId": "123",
    "historyClearedThroughMessageId": "456"
  }
}
```

### Autorização

- exigir utilizador autenticado e acesso atual à conversa;
- garantir `ChatParticipant` para a conversa Geral quando ainda não existir;
- não permitir que um utilizador altere a fronteira de outro participante;
- devolver `404` quando a conversa não existe ou não está acessível, seguindo o contrato atual do chat.

### Operação

1. Obter a última mensagem persistida da conversa.
2. Atualizar `historyClearedThroughMessageId` apenas para o participante atual.
3. Avançar `lastReadMessageId` até pelo menos a mesma fronteira.
4. Atualizar `lastReadAt`.
5. Remover alertas locais cobertos pela nova fronteira.
6. Emitir `chatConversationHistoryClear` apenas para `@user:<userId>`.
7. Não emitir delete/update da conversa para os outros participantes.

Se a conversa ainda não tiver mensagens, a operação é idempotente e devolve sucesso sem alterar o acesso.

### Concorrência

A fronteira é a última mensagem confirmada quando o servidor processa o pedido. Uma mensagem persistida depois dessa leitura fica acima da fronteira, permanece visível e pode fazer a conversa reaparecer.

Mensagens locais ainda pendentes não entram na fronteira. Se forem confirmadas depois, contam como novas e fazem a conversa reaparecer. O cliente não deve perder nem cancelar silenciosamente mensagens pendentes.

## Regras de leitura

### Histórico e paginação

- `GET /chat-conversations/:id/messages` devolve apenas IDs acima da fronteira do participante.
- `beforeId` nunca atravessa a fronteira.
- `afterId` usa a maior fronteira entre o pedido e o participante.
- `aroundId` devolve `404` quando a mensagem âncora pertence ao histórico removido.
- respostas e encaminhamentos não podem reintroduzir o corpo de uma mensagem anterior à fronteira.

### Listas

- conversa direta ou grupo com `lastMessage.id <= historyClearedThroughMessageId`: omitir da lista do projeto e inbox global;
- conversa Geral na mesma situação: manter na lista do projeto com `lastMessage: null`, mas omitir do inbox global;
- quando `lastMessage.id` ultrapassa a fronteira: apresentar a conversa com apenas a nova atividade;
- pesquisa nunca usa texto de uma mensagem anterior à fronteira.

### Não lidas

Calcular não lidas a partir de:

```sql
GREATEST(
  COALESCE(last_read_message_id, 0),
  COALESCE(history_cleared_through_message_id, 0)
)
```

Depois de remover o histórico, a contagem é zero. Mensagens posteriores voltam a incrementar normalmente.

### Anexos e ligações antigas

- a lista e deep links não revelam mensagens anteriores;
- anexos permanecem armazenados e disponíveis aos restantes participantes;
- o MVP não promete revogar URLs de ficheiros que o utilizador já tenha guardado fora do chat;
- uma eventual revogação forte de anexos exige um contrato de autorização separado.

## Sincronização do cliente

Adicionar os contratos usuais do chat:

- API `removeChatConversationHistory(id)`;
- entry action e action de sucesso/falha;
- saga de serviço;
- handler Socket.IO `chatConversationHistoryClear`;
- reducer que remove mensagens anteriores e atualiza inbox/conversa;
- fecho da janela para direta/grupo e preservação da janela Geral.

O evento deve ser privado ao utilizador para que web, PWA e outras sessões apliquem o mesmo resultado.

Não guardar esta preferência em `localStorage`. Isso falharia entre dispositivos e não impediria a API de devolver o histórico.

## Fases de implementação

### Persistir e aplicar a fronteira no servidor

**Alterações**

- migration para `history_cleared_through_message_id`;
- atributo em `ChatParticipant`;
- query method para atualizar a fronteira sem recuar o cursor de leitura;
- rota e controller;
- filtros centrais de mensagens, inbox, lista do projeto, pesquisa, deep links e não lidas;
- evento privado por utilizador.

**Critérios de aceitação**

- o participante atual deixa de receber mensagens anteriores em qualquer rota;
- os outros participantes mantêm acesso integral;
- mensagens novas ficam visíveis;
- chamadas repetidas são idempotentes;
- a fronteira nunca diminui.

### Sincronizar Redux e tempo real

**Alterações**

- API, actions, entry actions, sagas e socket handlers;
- limpar entidades e alertas cobertos pela fronteira apenas depois do sucesso;
- atualizar todas as janelas e inboxes do utilizador;
- preservar mensagens locais pendentes posteriores à fronteira.

**Critérios de aceitação**

- duas sessões do mesmo utilizador convergem sem refresh;
- nenhum outro participante recebe um evento de eliminação;
- erro do servidor conserva o estado local;
- nova mensagem faz a conversa reaparecer sem duplicados.

### Inserir a ação no layout

**Alterações**

- adicionar item ao menu existente de `ConversationActions`;
- adicionar trigger `...` e menu no cabeçalho de `ChatWindow`;
- reutilizar `AlertDialog` e os tokens atuais;
- adicionar traduções em todos os locales de chat existentes, com fallback apenas enquanto a tradução não estiver disponível durante desenvolvimento.

**Critérios de aceitação**

- a ação está acessível pela lista do projeto e pela conversa aberta;
- não aparece como botão de lixo permanente;
- não fica escondida dentro das preferências de notificação;
- funciona com rato, touch e teclado;
- diálogo explica explicitamente que os outros participantes conservam o histórico.

### Documentar e validar

**Alterações**

- atualizar `docs/chat/ARCHITECTURE.md` com o novo cursor privado;
- registar em `docs/chat/DECISIONS.md` que remoção de histórico é por participante;
- atualizar `docs/chat/CHANGELOG.md` depois da implementação aceite.

**Critérios de aceitação**

- documentação e comportamento usam a mesma terminologia;
- nenhuma parte afirma que os dados foram apagados para todos;
- os limites de anexos e compliance ficam explícitos.

## Ficheiros prováveis

### Servidor

- `server/db/migrations/<timestamp>_add_chat_participant_history_boundary.js`
- `server/api/models/ChatParticipant.js`
- `server/api/hooks/query-methods/models/ChatParticipant.js`
- `server/api/hooks/query-methods/models/ChatMessage.js`
- `server/api/controllers/chat-conversations/clear-history.js`
- `server/api/controllers/chat-messages/index.js`
- `server/api/controllers/chat-conversations/index.js`
- `server/api/helpers/chat/get-inbox.js`
- `server/api/helpers/chat/get-unread-counts.js`
- `server/api/helpers/chat/get-unread-details.js`
- `server/config/routes.js`
- testes focados em `server/test/utils/chat*.test.js`

### Cliente

- `client/src/api/chat.js`
- `client/src/actions/chat.js`
- `client/src/entry-actions/chat.js`
- `client/src/sagas/core/services/chat.js`
- reducers e selectors de chat afetados pela remoção privada;
- `client/src/components/chat/ConversationActions/ConversationActions.jsx`
- `client/src/components/chat/ConversationActions/ConversationActions.module.scss`
- `client/src/components/chat/ChatWindow/ChatWindow.jsx`
- `client/src/components/chat/ChatWindow/ChatWindow.module.scss`
- `client/src/locales/*/chat.js`
- testes focados junto dos componentes, sagas e reducers alterados.

Os nomes exatos de reducers e handlers devem ser confirmados pelo fluxo atual antes da edição. Não criar uma nova store ou contexto.

## Matriz de testes

| Cenário | Resultado esperado |
| --- | --- |
| Utilizador A remove conversa direta | A deixa de ver o histórico; B continua a vê-lo |
| B envia nova mensagem | A volta a ver a conversa apenas a partir da nova mensagem |
| A pesquisa texto antigo | Nenhum resultado da conversa removida |
| A abre deep link antigo | `404` ou estado indisponível, sem revelar conteúdo |
| A remove Geral | Geral permanece fixada e vazia no projeto |
| A remove grupo personalizado | Continua membro; grupo reaparece com nova mensagem |
| A escolhe Sair do grupo | Participação é removida pelo fluxo existente |
| A remove em duas sessões | Ambas convergem através do evento privado |
| Pedido falha | Conversa e mensagens permanecem visíveis |
| Existe mensagem local pendente | Não é perdida; ao confirmar pode fazer a conversa reaparecer |
| Operação repetida | Sem erro e sem recuo da fronteira |
| Conversa sem mensagens | Sucesso idempotente |

## Validação

### Servidor

- testes focados de controller, query methods, inbox, paginação, unread e autorização;
- teste negativo de acesso de outro utilizador;
- teste de concorrência com nova mensagem acima da fronteira;
- confirmar que mensagens e anexos não são apagados fisicamente.

### Cliente

- testes focados de API, saga, reducer e evento Socket.IO;
- teste do diálogo em sucesso, loading e erro;
- Tab, Enter, Escape, retorno de foco e click outside;
- hover e touch no menu da linha;
- conversa Geral, direta e grupo personalizado;
- mensagem pendente e conversa bloqueada.

### Layout por hot reload

Validar em `http://localhost:3008`, sem executar build:

- janela 360 x 500 px;
- viewport 320 px;
- viewport 768 px;
- desktop 1024 e 1440 px com várias janelas abertas;
- título longo de conversa e grupo;
- menu junto ao topo, fundo e extremos laterais do viewport;
- light/dark conforme os temas já suportados;
- `prefers-reduced-motion`;
- touch sem hover.

### Comandos focados

Definir os testes exatos depois de localizar os suites afetados. Seguir os contratos do projeto:

```powershell
Set-Location client
npm test -- --runInBand <testes-focados>
npx eslint <ficheiros-jsx-alterados>
```

```powershell
Set-Location server
npx mocha <testes-focados>
npx eslint <ficheiros-js-alterados>
```

Executar `git diff --check` no final. Não executar build para esta alteração local.

## Fora do âmbito

- apagar a conversa para todos;
- administração de retenção ou eDiscovery;
- eliminar ficheiros do armazenamento;
- desfazer a remoção e recuperar o histórico;
- adicionar simultaneamente uma funcionalidade separada de Ocultar;
- colocar a ação diretamente no inbox global;
- alterar o layout das mensagens ou do compositor;
- instalar Fluent UI ou outra biblioteca;
- deploy ou migração em produção.

## Stop conditions

- parar se alguma rota continuar a devolver mensagens anteriores à fronteira;
- parar se a limpeza local remover mensagens pendentes não confirmadas;
- parar se o evento for transmitido aos restantes participantes;
- parar se Geral desaparecer completamente da secção Fixada;
- parar se remover o histórico alterar a participação no grupo;
- parar se o menu novo colidir com fechar, notificações ou gestão do grupo em 360 px;
- parar se a confirmação não deixar claro que a ação afeta apenas o utilizador atual;
- parar se a implementação exigir apagar `chat_conversation`, `chat_message` ou anexos.

## Definição de concluído

- a ação existe nos dois pontos aprovados do layout;
- a fronteira é persistida por participante e aplicada em todas as leituras;
- os restantes participantes conservam mensagens e anexos;
- novas mensagens fazem a conversa reaparecer corretamente;
- Geral permanece fixada e vazia depois da remoção;
- todos os dispositivos do utilizador convergem;
- estados de loading, erro, teclado, touch e foco estão validados;
- testes focados, lint e `git diff --check` passam;
- validação visual autenticada foi realizada por hot reload nos tamanhos definidos;
- documentação de arquitetura e decisões foi atualizada.
