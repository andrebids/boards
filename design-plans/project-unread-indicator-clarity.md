# Tornar o indicador de notificações do projeto claro e acionável

Written against: `7c06581d99ef232a1e07ca7adce753e0ff94f0d9`

## Evidence chain

- Surface: página inicial `/`, cartão de projeto com contador azul de notificações; navegação subsequente para `/projects/:id`, `/boards/:id` e `/cards/:id`.
- Problem: o contador apresenta apenas um número animado. Não explica que conta notificações por ler em todos os quadros do projeto, não informa como as consultar e parece indicar erradamente que o projeto ainda não foi visitado. A captura fornecida pelo utilizador comprova esta interpretação ambígua.
- Design evidence: `client/src/components/projects/ProjectCard/ProjectCard.jsx` renderiza `NotificationIndicator` sobre o cartão, mas o indicador não tem texto, tooltip nem ação própria; `client/src/components/projects/ProjectCard/NotificationIndicator.jsx` apresenta somente o número; `client/src/components/notifications/NotificationsStep/NotificationsStep.jsx` já é a lista canónica de notificações por ler.
- Runtime evidence: `client/src/selectors/projects.js` soma todas as notificações por ler dos quadros acessíveis do projeto. `client/src/sagas/core/services/router.js` marca como lidas apenas as notificações ligadas ao cartão exato aberto. Entrar no projeto ou no quadro não representa leitura de todas as notificações.
- Owner: `client/src/components/projects/ProjectCard/ProjectCard.jsx`, com a lista partilhada em `client/src/components/notifications/NotificationsStep/`.
- Scope and affected surfaces: cartões de projeto na página inicial, indicador do projeto, lista de notificações e fluxo de abertura de uma notificação.
- Uncertainty: confirmar se o produto quer manter notificações já lidas no histórico. O plano preserva o contrato atual, no qual a lista contém apenas notificações por ler.

## Design decision

Manter a semântica correta de “não lida” e deixar de tratar a simples entrada num projeto como leitura. Transformar o contador num botão independente com o significado explícito “N notificações por ler neste projeto”. Ao ativá-lo, abrir a lista canónica filtrada pelo projeto; ao selecionar uma notificação, marcá-la como lida e navegar para o cartão ou quadro correspondente.

O cartão do projeto continua a abrir o primeiro quadro. O contador deixa de parecer um estado de visita e passa a ser uma ação com destino e consequência claros. Não adicionar uma ação automática “marcar projeto como lido”, porque isso apagaria alertas cujo conteúdo o utilizador ainda não viu.

## Reuse

- `NotificationsStep` e `Item` em `client/src/components/notifications/NotificationsStep/` como composição canónica da lista e dos destinos.
- `entryActions.deleteNotification` como fluxo existente para atualizar `isRead: true`; renomear apenas se a implementação puder fazê-lo sem ampliar o contrato público, pois a ação atualmente marca como lida em vez de eliminar o registo.
- `selectNotificationsTotalByProjectId` em `client/src/selectors/projects.js` para o total apresentado.
- Relações `notification.boardId` e `Board.projectId` já usadas em `client/src/selectors/sidebarSelectors.js` para resolver o projeto de cada notificação.
- `Popup` e `usePopup`, conforme o acionador global existente em `client/src/components/common/Header/Header.jsx`.

## Changes

1. `client/src/components/projects/ProjectCard/ProjectCard.jsx` e `ProjectCard.module.scss`
   - Change: tornar `notificationsWrapper` num botão sobreposto, irmão do `Link` principal, para evitar controlos interativos aninhados.
   - Change: o botão abre `NotificationsStep` com `projectId={id}` e não navega para o primeiro quadro.
   - Change: fornecer `aria-label` e tooltip pluralizados: `1 notificação por ler neste projeto` / `{{count}} notificações por ler neste projeto`.
   - Preserve: clique no restante cartão, favoritos, imagem, título, tamanhos e estado ativo.
   - Verify: clicar no número abre a lista filtrada; clicar fora do número continua a abrir o projeto.

2. `client/src/components/notifications/NotificationsStep/NotificationsStep.jsx` e `Item.jsx`
   - Change: aceitar `projectId` opcional. Quando presente, mostrar apenas notificações cujo `projectId` direto ou `board.projectId` corresponda ao projeto.
   - Change: usar o título `Notificações por ler neste projeto`; manter `Notificações` no acionador global sem filtro.
   - Change: quando a lista filtrada estiver vazia, mostrar `Não há notificações por ler neste projeto.`
   - Change: ao ativar o destino de um item, despachar primeiro a ação que define `isRead: true`, fechar o popup e navegar para o cartão ou quadro. O botão do caixote deixa de ser a única forma explícita de limpar o indicador; substituir o seu nome acessível por `Marcar como lida` e usar um ícone semanticamente compatível, sem sugerir eliminação.
   - Preserve: conteúdo, avatar, data, destinos existentes e ação global `Dispensar todas`.
   - Verify: o item desaparece da lista, o contador do projeto decrementa imediatamente e a navegação chega ao destino correto.

3. `client/src/selectors/notifications.js`, `client/src/locales/pt-PT/core.js` e restantes locales suportados
   - Change: criar um seletor de notificações por projeto que reutilize as relações existentes de projeto/quadro e devolva apenas `isRead: false`.
   - Change: adicionar mensagens completas e pluralizáveis para o label, título e estado vazio; não concatenar número e fragmentos.
   - Preserve: `selectNotificationIdsForCurrentUser` como fonte da lista global.
   - Verify: notificações de outro projeto não aparecem no popup filtrado e nomes longos/localizações expandidas não ocultam a ação.

4. Testes de regressão junto dos owners (`ProjectCard.test.jsx`, `NotificationsStep.test.jsx` ou convenção equivalente já adotada no cliente)
   - Change: testar a separação entre clique no cartão e clique no contador.
   - Change: testar singular, plural, filtro por projeto, notificação de quadro sem `cardId`, marcação como lida e atualização do contador.
   - Change: testar que abrir apenas o projeto não marca notificações como lidas.
   - Preserve: biblioteca e helpers de teste existentes no cliente.
   - Verify: todos os casos passam com o mesmo store Redux/ORM usado pela aplicação.

## Scope

- Inherit: todos os cartões `ProjectCard` que apresentem `notificationsTotal`.
- Verify: projeto com uma e várias notificações, notificação ligada a cartão, notificação ligada apenas ao quadro, projeto sem quadros e viewport móvel.
- Exclude: preferências de entrega, emails, webhooks, chat, criação de novos tipos de notificação e histórico de notificações lidas.

## Validation

- Product: na página inicial, uma pessoa entende sem contexto que o “1” significa uma notificação por ler, consegue abri-la diretamente e vê o contador desaparecer após consultar o item.
- Interface: validar estados 0, 1, 2 e 99+, nomes longos, tooltip, foco por teclado, `Escape`, clique fora, viewport móvel e zoom a 200%.
- System: confirmar que o popup filtrado reutiliza `NotificationsStep`, que o header mantém a lista global e que não foi criada uma segunda implementação de item de notificação.
- Repository: executar os testes focados dos componentes e seletores adicionados → singular/plural, filtro, leitura e navegação passam.
- Repository: executar ESLint apenas nos ficheiros alterados → sem erros.
- Runtime: validar através do hot reload em `http://localhost:3008`; não executar build local.

## Stop conditions

- Stop if `Popup` não suportar um acionador por cartão sem criar uma instância global por item; nesse caso, elevar um único owner do popup para a grelha de projetos e passar apenas o `projectId` selecionado.
- Stop if marcar uma notificação como lida antes da navegação puder perder a ação quando a API falha; manter atualização otimista com rollback ou concluir a leitura após confirmação do servidor.
- Stop if notificações de projeto sem `boardId` não tiverem uma relação resolvível; definir primeiro o contrato de associação no modelo/API.

## Design documentation

- After acceptance and validation: registar na documentação funcional de notificações que o contador representa itens por ler, que entrar num projeto não equivale a lê-los e que selecionar uma notificação é a ação canónica de leitura.
