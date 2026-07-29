# Restaurar a Inbox global do chat sem projeto ativo

Written against: `d327da80f8a46b5b5c1976aecffa170d2c931c33` (o worktree contém alterações não commitadas nos componentes do chat; reconciliar antes de editar)

## Evidence chain

- Surface: página inicial `/`, utilizador autenticado, ação `Abrir conversas`.
- Problem: abrir o launcher na página inicial desmonta a interface com `TypeError: Cannot read properties of undefined (reading 'id')`.
- Design evidence: `planos-desenvolvimento/PLANO_INBOX_GLOBAL_CHAT.md` define que o launcher é global, abre diretamente a Inbox global na homepage e só usa o âmbito de projeto quando existe um projeto ativo.
- Runtime evidence: `client/src/components/chat/ChatPanel/ChatPanel.jsx` aceita `project` ausente através de `canUseProjectScope` e `isGlobalScope`, mas `handleGroupSubmit` lê `project.id` durante o render através da lista de dependências do `useCallback`.
- Owner: `client/src/components/chat/ChatPanel/ChatPanel.jsx`.
- Scope and affected surfaces: launcher na homepage, Inbox global e alternância entre `Projeto atual` e `Todas as mensagens` dentro de um projeto.
- Uncertainty: none.

## Design decision

Tornar o identificador de projeto explicitamente opcional dentro de `ChatPanel`. Funcionalidades exclusivas do projeto devem receber e validar `projectId`; o âmbito global deve renderizar sem executar ou preparar qualquer acesso obrigatório a um projeto.

Não esconder o launcher nem criar um painel alternativo para a homepage. A mesma composição continua a servir os dois âmbitos.

## Reuse

- `projectId = project?.id` já usado em `client/src/components/chat/ChatContext/ChatContext.jsx`.
- `canUseProjectScope` e `isGlobalScope` em `client/src/components/chat/ChatPanel/ChatPanel.jsx`.
- `GlobalInbox` como conteúdo canónico quando não existe projeto ativo.
- Exemplar de teste de componente: `client/src/components/activities/BoardActivitiesPanel/BoardActivitiesPanel.test.js`.

## Changes

1. `client/src/components/chat/ChatPanel/ChatPanel.jsx`
   - Change: derivar `const projectId = project?.id` junto dos seletores e substituir todas as leituras diretas de `project.id` por `projectId`.
   - Change: fazer `handleGroupSubmit` terminar sem efeitos quando `projectId` estiver ausente; usar `projectId` no `requestKey`, no dispatch e na lista de dependências.
   - Change: manter o formulário de grupo, pesquisa de membros, criação de conversa geral/direta e footer `Nova conversa` exclusivos de `!isGlobalScope`.
   - Preserve: um único launcher, scope switcher dentro de projetos, contadores globais, pesquisa, foco inicial, `Escape`, callbacks de abertura e animações atuais.
   - Verify: renderizar o painel sem projeto não lança exceção e apresenta apenas a Inbox global.

2. `client/src/components/chat/ChatPanel/ChatPanel.test.js`
   - Change: adicionar teste de regressão que renderiza `ChatPanel` com `selectCurrentProject` a devolver `undefined` e o contexto configurado para Inbox global.
   - Change: verificar que o título/estado global é apresentado, que os controlos exclusivos do projeto não aparecem e que não ocorre exceção durante o render.
   - Change: adicionar um segundo caso com projeto válido para provar que `Projeto atual` e a criação de grupo continuam disponíveis.
   - Preserve: mocks e configuração de teste já usados pelo projeto; não introduzir outra biblioteca de testes.
   - Verify: os dois âmbitos passam no mesmo ficheiro de teste.

## Scope

- Inherit: homepage e qualquer rota autenticada sem `selectCurrentProject`.
- Verify: projeto com chat ativo, projeto com chat desativado e mudança de rota entre homepage e projeto com o painel aberto/fechado.
- Exclude: alterações à API da Inbox, Redux, sockets, contadores, filtros globais ou criação de grupos no servidor.

## Validation

- Product: na homepage, clicar `Abrir conversas` abre `Todas as mensagens`; selecionar uma entrada continua a navegar para o projeto e a conversa corretos.
- Interface: validar homepage, projeto com chat ativo e viewport móvel; não deve aparecer scope switcher nem ação de criação de conversa na homepage.
- System: confirmar que `ChatPanel` e `ChatContext` usam a mesma semântica opcional de `projectId` e que não foi criado um segundo painel global.
- Repository: `npm test -- --runInBand src/components/chat/ChatPanel/ChatPanel.test.js` em `client/` → testes dos âmbitos global e de projeto passam.
- Repository: `npx eslint src/components/chat/ChatPanel/ChatPanel.jsx src/components/chat/ChatPanel/ChatPanel.test.js` em `client/` → sem erros.
- Runtime: usar hot reload em `http://localhost:3008`; não executar build para esta validação local.

## Stop conditions

- Stop if a Inbox global deixar de estar disponível no estado Redux sem projeto ativo; isso exige corrigir o contrato de carregamento global antes de alterar a apresentação.
- Stop if tornar `projectId` opcional exigir alterar endpoints ou autorização de criação de grupos; essa expansão não pertence a esta correção.

## Design documentation

- After acceptance and validation: atualizar o estado de `planos-desenvolvimento/PLANO_INBOX_GLOBAL_CHAT.md` para registar que `ChatPanel` suporta explicitamente render sem projeto ativo.
