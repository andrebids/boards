# Plano de correção e refactor do chat

## Objetivo

Corrigir os dois erros confirmados pela segunda investigação e reduzir a complexidade dos pontos de
chat que já dificultam manutenção, sem reescrever o módulo, alterar contratos públicos, adicionar
dependências ou misturar refactor com mudança funcional.

Este documento começou como plano e inclui agora o estado da implementação. O worktree já continha
alterações de chat não commitadas, que foram preservadas durante a execução.

## Estado da implementação — 2026-08-28

- [x] Navegação global centralizada em `activateGlobalTarget`; pessoas do projeto atual abrem ou
      iniciam imediatamente a conversa direta, enquanto alvos de outro projeto apenas navegam.
- [x] `server/config/custom.js` deixou de consultar `sails.config` durante o carregamento. A raiz de
      uploads usa `path.resolve(__dirname, '..')` e o redirect OIDC usa `NODE_ENV`.
- [x] Cálculos puros do `MessageList` foram extraídos para `message-view.js`, com testes para
      agrupamento, mudança de dia, emojis compostos, anexos e lookup de membros.
- [x] Preview e renderização de anexos confirmados/pendentes foram extraídos para componentes folha;
      scroll, menus, edição, reações e forwarding permanecem no pai.
- [x] Sagas da Inbox foram extraídas para `chat-inbox.js`; o agregador mantém os mesmos nomes usados
      pelos watchers e `chat.js` conserva reexports nomeados para compatibilidade.
- [x] O gate de performance foi respeitado: os testes unitários disponíveis não medem queries nem
      latência com uma base de dados real, portanto `server/api/helpers/chat/get-inbox.js` não foi
      reescrito sem evidência.

### Evidência de validação

- Cliente: 14 suites focadas de chat, 111 testes passados; lint focado passou.
- Servidor: teste de config e suite unitária da Inbox, 6 testes passados; lint focado passou.
- Suite server completa: ultrapassou o erro original de `custom.js`, mas parou no hook `helpers`
  porque o binário nativo `bcrypt_lib.node` não existe na instalação local de `node_modules`.
- Hot reload: a página e os nove módulos frontend alterados responderam HTTP 200 após transformação
  pelo Vite.
- Não foi executado build, de acordo com as instruções do projeto.
- Validação autenticada no browser continua necessária para os fluxos interativos e anexos; Chrome
  DevTools MCP não estava disponível nesta sessão.

## Resultado da revalidação

### Erro confirmado 1 — pessoa do projeto atual não abre a conversa

`ChatContext.openGlobalPerson` faz `history.push(target.path)`, mas, ao contrário de
`openGlobalConversation`, não executa a abertura imediata quando o alvo pertence ao projeto atual.
O efeito que consome `chatDirectUser` depende de `hasFetchedConversations`,
`openDirectConversation` e `projectId`; uma alteração apenas na query string não garante nova
execução do efeito.

Consequência esperada: procurar uma pessoa na Inbox global e escolhê-la enquanto o utilizador já está
no mesmo projeto altera a URL, mas pode não abrir nem criar a conversa direta.

### Erro confirmado 2 — bootstrap da suite server

`server/config/custom.js` lê `sails.config.appPath` enquanto a configuração do Sails ainda está a ser
carregada. Nesse momento, `require('sails').config` é `undefined`, pelo que a suite que inclui
`test/lifecycle.test.js` falha no hook `userconfig` antes de executar testes.

O teste unitário isolado da Inbox não está avariado:

- `npx mocha test/utils/chat-inbox.test.js`: 5 testes passaram;
- a falha ocorre no lift da aplicação, antes da suite completa;
- `server/config/routes.js` usa `sails.config.appPath` dentro do handler HTTP, depois do lift, e não
  pertence a esta causa.

### Dívida estrutural confirmada

- `MessageList.jsx` tem 1188 linhas e mistura scroll, paginação, read horizon, menus, edição,
  forwarding, reações, anexos, previews e renderização de cada mensagem.
- `client/src/sagas/core/services/chat.js` tem 986 linhas e concentra inbox, conversas, mensagens,
  anexos, preferências, realtime e subscrições.
- `GlobalInbox.jsx` repete uma normalização de pesquisa já disponível no próprio ficheiro. É uma
  limpeza pequena, não uma iniciativa autónoma.

### Ponto ainda não confirmado

`server/api/helpers/chat/get-inbox.js` pode escalar mal porque resolve membros por projeto e, durante
uma pesquisa, hidrata todos os membros acessíveis. Não existe ainda medição de queries, latência ou
volume que justifique uma reescrita. A otimização fica atrás de um checkpoint de medição.

## Decisões

- Corrigir comportamento antes de refactorar.
- Criar um teste de regressão no limite mais pequeno que consiga observar a orquestração da
  navegação.
- Corrigir o bootstrap server sem depender de estado global do Sails durante o carregamento da
  configuração.
- Refactorar `MessageList` por componentes independentes, evitando um `MessageRow` com dezenas de
  props que apenas deslocaria a complexidade.
- Separar primeiro apenas as sagas da Inbox, que são a fronteira atualmente em mudança; outras
  divisões exigem necessidade concreta.
- Não executar build para validação local. Usar testes focados, lint e hot reload em
  `http://localhost:3008`.

## Ordem e dependências

```text
Correção da navegação ──────┐
                            ├── Checkpoint de comportamento
Correção do bootstrap ──────┘
                                      │
                                      ├── Refactor seguro do MessageList
                                      └── Extração das sagas da Inbox
                                                     │
                                                     └── Medição opcional do get-inbox
```

## Fase 1 — corrigir os erros

### Tarefa 1: tornar a navegação global testável e abrir a conversa atual

**Descrição:** Centralizar a aplicação de um alvo global numa função pura pequena, reutilizada por
`openGlobalConversation` e `openGlobalPerson`. A função deve navegar sempre e executar o callback de
abertura apenas quando `target.isCurrentProject` for verdadeiro. Para pessoas, o callback chama
`openDirectConversation(person.userId)`; para conversas, chama `openConversation`.

**Critérios de aceitação:**

- [ ] Uma pessoa do projeto atual abre uma conversa existente ou inicia a criação da conversa direta.
- [ ] Uma pessoa de outro projeto apenas navega; o parâmetro `chatDirectUser` é consumido depois de o
      projeto e as conversas alvo carregarem.
- [ ] Um alvo inválido não navega nem abre conversa.
- [ ] A URL temporária não provoca uma segunda abertura após ser consumida.

**Verificação:**

- [ ] Testes unitários cobrem alvo inválido, projeto atual e outro projeto.
- [ ] `npm test --prefix client -- --runInBand src/components/chat/navigation.test.js`
- [ ] Lint focado nos ficheiros alterados.
- [ ] Browser por hot reload: pesquisar e abrir a mesma pessoa no projeto atual e a partir de outro
      projeto.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/chat/navigation.js`
- `client/src/components/chat/navigation.test.js`
- `client/src/components/chat/ChatContext/ChatContext.jsx`

**Escopo:** pequeno, 3 ficheiros.

### Tarefa 2: remover a dependência prematura de `sails.config` em `custom.js`

**Descrição:** Resolver o diretório base da aplicação a partir de `__dirname` com `path.resolve`,
remover o `require('sails')` de `server/config/custom.js` e conservar o mesmo valor absoluto usado em
desenvolvimento e nas imagens Docker (`/app`). Não alterar `routes.js`, cujo acesso acontece em
runtime depois do lift.

**Critérios de aceitação:**

- [ ] `custom.js` pode ser carregado antes de `sails.lift` sem `TypeError`.
- [ ] `uploadsBasePath` continua a apontar para a raiz da aplicação server.
- [ ] O teste isolado da Inbox continua a passar.
- [ ] A suite completa deixa de falhar no hook `userconfig`; qualquer falha posterior deve ser
      diagnosticada separadamente.

**Verificação:**

- [ ] Teste pequeno de configuração confirma um caminho absoluto e independente de `sails.config`.
- [ ] `npx mocha test/utils/chat-inbox.test.js` no diretório `server`.
- [ ] `npm test --prefix server` quando a base de dados de teste estiver disponível.
- [ ] Lint focado em `server/config/custom.js` e no teste novo.

**Dependências:** nenhuma; pode ser executada em paralelo com a tarefa 1.

**Ficheiros prováveis:**

- `server/config/custom.js`
- `server/test/utils/custom-config.test.js` (novo, se o teste de configuração não couber num teste
  existente)

**Escopo:** pequeno, 1–2 ficheiros.

### Checkpoint 1 — comportamento e harness

- [ ] O fluxo de pessoa direta funciona no projeto atual e entre projetos.
- [ ] A query temporária é removida após consumo.
- [ ] Os testes cliente de chat continuam verdes.
- [ ] A suite server já ultrapassa o carregamento de `custom.js`.
- [ ] Nenhum build foi executado.

## Fase 2 — reduzir complexidade sem mudar comportamento

### Tarefa 3: extrair cálculos puros de apresentação de mensagens

**Descrição:** Mover para um módulo testável apenas os cálculos puros hoje executados dentro do map de
mensagens: agrupamento temporal, mensagem apenas com emojis, classificação de anexos e lookup de
autores. Criar mapas/formatters uma vez por render ou módulo em vez de repetir pesquisa e construção
por mensagem.

**Critérios de aceitação:**

- [ ] Agrupamento, divisores de dia, bolhas de emoji, reply author e classificação de anexos mantêm o
      resultado atual.
- [ ] O map principal deixa de fazer `members.find` para cada mensagem.
- [ ] `Intl.DateTimeFormat` não é reinstanciado por cada hora ou data renderizada.
- [ ] Não são alteradas classes CSS nem estrutura visual nesta tarefa.

**Verificação:**

- [ ] Testes unitários cobrem limites de cinco minutos, mudança de dia, emojis compostos e anexos
      mistos.
- [ ] `npm test --prefix client -- --runInBand src/components/chat/MessageList`
- [ ] Lint focado e `git diff --check`.

**Dependências:** checkpoint 1.

**Ficheiros prováveis:**

- `client/src/components/chat/MessageList/message-view.js` (novo)
- `client/src/components/chat/MessageList/message-view.test.js` (novo)
- `client/src/components/chat/MessageList/MessageList.jsx`

**Escopo:** médio, 3 ficheiros.

### Tarefa 4: extrair apenas os componentes folha de anexos

**Descrição:** Retirar `AttachmentPreview` e a renderização de anexos confirmados/pendentes para
componentes focados. Manter scroll, menus globais, forwarding e estado transversal em `MessageList`.
Não criar já um `MessageRow` genérico se isso exigir uma lista extensa de props ou duplicar estado.

**Critérios de aceitação:**

- [ ] Preview de imagem, vídeo e PDF mantém abertura, download e fecho por Escape/backdrop.
- [ ] Anexos confirmados e pendentes preservam fallback de URL, thumbnail, estado e retry individual.
- [ ] Mensagens, read horizon, reações, edição e forwarding não mudam de comportamento.
- [ ] `MessageList.jsx` fica menor por remoção de responsabilidades independentes, não por deslocação
      de estado acoplado.

**Verificação:**

- [ ] Testes existentes de `attachment-state` continuam verdes.
- [ ] Teste focado dos novos componentes quando possível com a stack já instalada; não adicionar uma
      dependência apenas para este refactor.
- [ ] Browser por hot reload com imagem, vídeo, PDF, ficheiro genérico e retry de anexo.
- [ ] Lint focado e `git diff --check`.

**Dependências:** tarefa 3.

**Ficheiros prováveis:**

- `client/src/components/chat/MessageList/AttachmentPreview.jsx` (novo)
- `client/src/components/chat/MessageList/MessageAttachments.jsx` (novo)
- `client/src/components/chat/MessageList/MessageList.jsx`

**Escopo:** médio, 3 ficheiros.

### Tarefa 5: extrair somente as sagas da Inbox

**Descrição:** Mover fetch, leitura em lote, leitura individual e tratamento de read state para um
módulo `chat-inbox.js`. Preservar os nomes exportados no agregador de services para que o watcher e os
entry actions não mudem. Não introduzir uma framework genérica de sagas.

**Critérios de aceitação:**

- [ ] `fetchChatInbox`, `markAllChatInboxAsRead`, `markChatConversationAsRead` e o handler de leitura
      mantêm actions, payloads e rollback atuais.
- [ ] O watcher continua a usar os mesmos nomes públicos.
- [ ] Reconexão restaura o último pedido ativo da Inbox.
- [ ] `chat.js` deixa de conter a fronteira completa da Inbox sem mover mensagens ou uploads nesta
      tarefa.

**Verificação:**

- [ ] Testes de services da Inbox passam antes e depois da extração.
- [ ] `npm test --prefix client -- --runInBand src/sagas/core/services/chat.test.js src/reducers/chat.test.js src/selectors/chat.test.js`
- [ ] Lint focado e `git diff --check`.

**Dependências:** checkpoint 1; pode decorrer em paralelo com as tarefas 3 e 4 se não houver edição
concorrente em `chat.js`.

**Ficheiros prováveis:**

- `client/src/sagas/core/services/chat-inbox.js` (novo)
- `client/src/sagas/core/services/chat.js`
- `client/src/sagas/core/services/index.js`
- testes de services do chat

**Escopo:** médio, 3–4 ficheiros.

### Checkpoint 2 — refactor seguro

- [ ] As 14 suites focadas de chat do cliente continuam verdes.
- [ ] O fluxo real de enviar, receber, editar, reagir, encaminhar, fazer scroll e abrir anexos mantém o
      comportamento.
- [ ] Não foram criadas abstrações genéricas sem segundo consumidor real.
- [ ] Não houve alterações visuais deliberadas.

## Fase 3 — performance condicionada por evidência

### Tarefa 6: medir a Inbox server antes de a reestruturar

**Descrição:** Medir número de queries, utilizadores hidratados e latência para um utilizador com
vários projetos/conversas, com e sem pesquisa. Só implementar batch adicional se o custo crescer com
o número de projetos ou exceder um limite acordado.

**Critérios para avançar com otimização:**

- [ ] A medição mostra chamadas de acesso proporcionais ao número de projetos; ou
- [ ] uma pesquisa hidrata um volume de utilizadores desproporcional aos 20 resultados devolvidos; ou
- [ ] a latência medida ultrapassa o orçamento definido para a Inbox.

**Solução caso o gate falhe:** criar uma resolução batch de membros por `projectIds`, construir mapas
e sets uma vez e manter exatamente as regras atuais de `chatMode`, gestão, visibilidade total e
membership de boards. Paginação, autorização e payload público permanecem iguais.

**Verificação:**

- [ ] Teste server compara vários projetos sem aceitar N+1 silencioso.
- [ ] `npx mocha test/utils/chat-inbox.test.js`
- [ ] Comparação antes/depois com o mesmo dataset.

**Dependências:** checkpoint 2 e ambiente capaz de medir queries reais.

**Escopo:** condicional; não iniciar sem evidência.

## Limpezas não autónomas

- Reutilizar `normalizeSearchText` dentro de `GlobalInbox.jsx` apenas quando o ficheiro voltar a ser
  tocado por uma tarefa funcional.
- Não dividir `ChatPanel.jsx` apenas por ter 622 linhas; primeiro identificar uma fronteira com estado
  e callbacks próprios.
- Não dividir o restante `services/chat.js` até uma nova alteração exigir tocar noutra fronteira.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Perder ou duplicar a abertura ao consumir `chatDirectUser` | Alto | Helper de orquestração com três casos e smoke test dentro/fora do projeto. |
| Misturar alterações existentes do worktree com o refactor | Alto | Rever `git diff` por ficheiro antes de editar e usar commits seletivos. |
| Quebrar uploads/read horizon ao reduzir `MessageList` | Alto | Extrair primeiro lógica pura e componentes folha; manter estado transversal no pai. |
| Mudar exports e watchers ao separar sagas | Médio | Preservar o agregador e os nomes públicos; testes antes/depois. |
| Otimizar a Inbox com regras de acesso incompletas | Alto | Medir primeiro e reutilizar todas as regras atuais num helper batch testado. |
| Validar apenas por testes unitários | Médio | Hot reload e browser nos fluxos interativos; declarar qualquer ausência de E2E autenticado. |

## Fora de escopo

- Reescrever o transporte Socket.IO ou o estado Redux ORM do chat.
- Alterar API, base de dados, migrações ou payloads públicos da Inbox.
- Adicionar bibliotecas de testes ou componentes apenas para facilitar o refactor.
- Otimizar `get-inbox.js` sem medição.
- Build de produção, commit, push, merge ou deploy.

## Definição de concluído

- [ ] Os dois erros confirmados têm causa corrigida e verificação reproduzível.
- [ ] Cada tarefa foi implementada e validada isoladamente.
- [ ] Testes focados, lint e `git diff --check` passam.
- [ ] O browser valida os fluxos interativos através do hot reload.
- [ ] Alterações preexistentes do worktree permanecem intactas.
- [ ] Qualquer limite de verificação, especialmente E2E autenticado ou base de dados de teste, é
      registado no handoff.
