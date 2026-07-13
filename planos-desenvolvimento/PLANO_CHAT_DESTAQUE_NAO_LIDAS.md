# Plano de implementação: destaque apenas para conversas não lidas

## 1. Objetivo

Fazer com que o fundo persistente de uma linha na lista de conversas indique exclusivamente a existência de mensagens não lidas.

Comportamento final:

- conversa lida: fundo transparente;
- conversa não lida: fundo azul discreto e contador visível;
- `hover`: realce temporário, independentemente do estado de leitura;
- conversa aberta, minimizada ou guardada no dock: sem fundo especial se não tiver mensagens não lidas;
- ao abrir e visualizar uma conversa com o browser focado, o estado passa para lido e o fundo desaparece;
- mensagens enviadas pelo próprio utilizador não criam estado não lido.

## 2. Diagnóstico do estado atual

### 2.1. Causa das várias cores de fundo

O fundo azul atual não representa mensagens não lidas. Representa conversas presentes em `windows`, incluindo janelas abertas ou minimizadas:

1. `ChatPanel.jsx` transforma `windows` em `openWindowIds`.
2. `ConversationList.jsx` verifica se cada ID pertence a `openWindowIds` e envia `isSelected`.
3. `ConversationRow.jsx` aplica `styles.selected`.
4. `ConversationRow.module.scss` pinta `.selected` com `rgba(90,126,189,.16)`.

Isto explica a imagem analisada: “Geral”, “Leandro” e “Carlos” têm fundo porque as respetivas janelas estão guardadas como abertas, não porque existam mensagens por ler.

### 2.2. Infraestrutura de não lidas já disponível

A feature de leitura já existe quase por completo:

- a tabela `chat_participant` guarda `last_read_message_id` e `last_read_at`;
- o servidor calcula `unreadCount` ignorando mensagens do próprio utilizador e mensagens removidas;
- a listagem inicial inclui `unreadCount` por conversa;
- `chatConversationUpdate` atualiza o contador em tempo real por utilizador;
- `POST /chat-conversations/:id/read` avança o cursor de leitura;
- `chatConversationRead` sincroniza outras sessões do mesmo utilizador;
- Redux ORM guarda `ChatConversation.unreadCount`;
- o launcher e cada linha já apresentam um badge numérico;
- `ChatWindow.jsx` só marca como lida se a janela estiver renderizada, o documento estiver visível e o browser tiver foco;
- janelas minimizadas e janelas escondidas pelo limite do dock não são renderizadas, por isso não são marcadas como lidas indevidamente.

Conclusão: não é necessária uma nova migração nem um novo modelo. A alteração principal é ligar o fundo ao estado existente de leitura e deixar de o ligar ao estado do dock.

## 3. Plano de implementação

### Fase 1: separar estado de leitura do estado da janela

Ficheiros:

- `client/src/components/chat/ChatPanel/ChatPanel.jsx`
- `client/src/components/chat/ConversationList/ConversationList.jsx`
- `client/src/components/chat/ConversationRow/ConversationRow.jsx`

Alterações:

1. Remover `openWindowIds={windows.map(...)}` de `ChatPanel`.
2. Deixar de obter `windows` no `useChat()` de `ChatPanel` quando já não for necessário noutro ponto do componente.
3. Remover `openWindowIds` das props e dos `PropTypes` de `ConversationList`.
4. Remover `isSelected` das props, dos `PropTypes` e dos valores por omissão de `ConversationRow`.
5. Calcular na própria linha uma condição semântica explícita:

   ```js
   const hasUnread = (conversation?.unreadCount || 0) > 0;
   ```

6. Aplicar a classe persistente apenas quando `hasUnread` for verdadeiro.

Esta fase elimina a dependência visual de `windows`, mas preserva totalmente o comportamento de abrir, minimizar, restaurar e fechar conversas.

### Fase 2: ajustar o estado visual

Ficheiro:

- `client/src/components/chat/ConversationRow/ConversationRow.module.scss`

Alterações:

1. Substituir `.selected` por um nome semântico, por exemplo `.hasUnread`.
2. Manter o fundo de `.row` transparente por omissão.
3. Aplicar em `.hasUnread` o atual fundo azul discreto, evitando introduzir uma nova cor no sistema.
4. Garantir que o `hover` continua percetível em linhas lidas e não lidas.
5. Manter o `focus-visible` independente da cor de não lida, para navegação por teclado.
6. Manter o badge existente como segundo indicador, para o estado não depender apenas da cor.

Regra visual recomendada:

```scss
.row { background: transparent; }
.row:hover { background: rgba(255, 255, 255, .055); }
.hasUnread { background: rgba(90, 126, 189, .16); }
.hasUnread:hover { background: rgba(90, 126, 189, .22); }
```

Os valores finais devem ser validados no tema atual, sem alterar a paleta global do chat.

### Fase 3: reforçar semântica e acessibilidade

Ficheiros:

- `client/src/components/chat/ConversationRow/ConversationRow.jsx`
- `client/src/locales/en-US/chat.js`
- `client/src/locales/pt-PT/chat.js`
- `client/src/locales/fr-FR/chat.js`

Alterações:

1. Dar ao badge um texto acessível com quantidade e pluralização, em vez de expor apenas um número isolado ao leitor de ecrã.
2. Manter o número visual limitado a `99`, mas permitir que o nome acessível descreva corretamente a quantidade real ou use “99+”.
3. Não usar `aria-selected`, porque a linha não pertence a um widget de seleção e várias conversas podem estar abertas ao mesmo tempo.
4. Opcionalmente manter a informação “conversa aberta” apenas para tecnologias assistivas se houver uma necessidade de produto confirmada. Essa informação não deve controlar o fundo.

### Fase 4: uniformizar o contrato de marcação como lida

Ficheiros:

- `server/api/helpers/chat/mark-as-read.js`
- `server/api/controllers/chat-conversations/read.js`
- testes do helper/controller de chat

Situação atual:

- o helper constrói um objeto `item` com `conversationId`, `userId`, cursores e `unreadCount`;
- os sockets recebem esse `item` completo;
- o helper devolve apenas `participant`, pelo que a resposta HTTP não tem exatamente o mesmo contrato do evento socket;
- no cliente, a ausência de `unreadCount` acaba convertida em zero, mas o contrato fica implícito e mais frágil a concorrência.

Alteração recomendada:

1. Fazer o helper devolver o mesmo `item` que publica nos sockets.
2. Fazer o controller devolver esse estado de leitura canónico.
3. Manter o avanço monotónico de `lastReadMessageId` já implementado.
4. Confirmar que uma mensagem recebida durante o pedido não fica apagada por uma resposta desatualizada.

Esta fase não é necessária para mudar a cor, mas deve entrar na mesma entrega para tornar o estado de leitura previsível em várias sessões e perante concorrência.

## 4. Testes

### 4.1. Testes unitários do cliente

Cobrir pelo menos:

- `unreadCount = 0` não aplica a classe de fundo persistente;
- `unreadCount > 0` aplica a classe e mostra o badge;
- abrir uma conversa lida não altera a sua aparência na lista;
- a ação otimista de leitura coloca o contador a zero;
- uma falha de leitura repõe o contador anterior;
- um evento `chatConversationRead` atualiza apenas a conversa indicada;
- uma atualização socket com nova mensagem volta a aplicar o estado não lido.

Se não for adicionada uma biblioteca de testes de componentes nesta tarefa, extrair `hasUnread` para uma função simples testável ou cobrir a renderização através do teste de aceitação. Não adicionar uma dependência apenas para testar uma classe CSS.

### 4.2. Testes do servidor

Cobrir:

- mensagens de outro utilizador incrementam `unreadCount`;
- mensagens próprias não incrementam o contador;
- mensagens removidas não contam;
- marcar como lida devolve `unreadCount: 0` quando não chegou outra mensagem;
- o cursor nunca recua com pedidos concorrentes;
- uma nova mensagem posterior ao cursor continua não lida;
- duas sessões do mesmo utilizador recebem o mesmo estado por socket.

### 4.3. Cenários manuais ou E2E com duas sessões

1. Utilizador A abre a lista sem janelas guardadas: todas as linhas lidas têm fundo transparente.
2. A abre várias conversas e volta à lista: nenhuma ganha fundo apenas por estar aberta.
3. Utilizador B envia uma mensagem para A numa conversa fechada: a linha ganha fundo e badge em tempo real.
4. A abre essa conversa com a aba focada: contador e fundo desaparecem.
5. A minimiza a conversa e B envia outra mensagem: o fundo reaparece na lista.
6. A mantém a página em segundo plano e B envia uma mensagem: permanece não lida até A voltar e visualizar a janela.
7. A tem mais janelas abertas do que o limite do dock: uma janela escondida não é marcada como lida.
8. A envia uma mensagem: a sua própria conversa não ganha fundo de não lida.
9. Recarregar a página e reconectar o socket preserva os contadores calculados pelo servidor.

## 5. Critérios de aceitação

- Nenhuma conversa recebe fundo persistente apenas por estar aberta, minimizada ou guardada no `localStorage`.
- Apenas conversas com `unreadCount > 0` recebem fundo persistente.
- O badge e o fundo aparecem e desaparecem juntos a partir da mesma fonte de verdade.
- Abrir a lista não marca mensagens como lidas.
- Abrir uma conversa só a marca como lida quando a janela está visível e o browser tem foco.
- Mensagens do próprio utilizador nunca são contadas como não lidas.
- O contador do launcher corresponde à soma dos contadores das conversas do projeto atual.
- Leitura e novas mensagens sincronizam em tempo real e sobrevivem a refresh/reconexão.
- Navegação por teclado e `focus-visible` continuam funcionais.
- Não há migração de base de dados nesta entrega.

## 6. Ordem de entrega recomendada

1. Alterar `ConversationRow` para derivar o fundo de `unreadCount`.
2. Remover a cadeia `windows -> openWindowIds -> isSelected`.
3. Ajustar SCSS e acessibilidade do badge.
4. Uniformizar a resposta HTTP e socket de `mark-as-read`.
5. Adicionar testes unitários de estado e backend.
6. Validar os cenários E2E com duas sessões, foco, minimização e reconexão.

## 7. Impacto estimado

- Backend: alteração pequena de contrato, sem migração.
- Frontend: alteração pequena em três componentes e um módulo SCSS.
- Risco principal: corrida entre “marcar como lida” e a chegada de uma nova mensagem.
- Risco visual: baixo, porque reutiliza a cor já existente e mantém o badge.
- Compatibilidade: as janelas persistidas em `localStorage` continuam intactas; apenas deixam de controlar a cor da lista.
