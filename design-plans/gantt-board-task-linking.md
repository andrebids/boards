# Ligar tarefas dos cartões ao Gantt do mesmo projeto

Written against: `2eb96bc154859006872eb74a8aa3ea90a1f1e165` (working tree com alterações locais no Gantt e noutras superfícies; o executor deve preservá-las)

## Evidence chain

- Surface: tarefas de checklist dentro de cartões nos Boards e `/projects/:projectId/gantt` no mesmo projeto.
- Problem: uma tarefa criada num cartão não pode hoje ser planeada no Gantt sem criar manualmente uma segunda tarefa independente. Isso duplica nome e responsável, perde a relação com o cartão e permite que as duas representações divirjam. A funcionalidade atravessa duas superfícies com linguagens próprias; usar o UI do Gantt dentro do cartão, ou o UI dos Boards dentro do workspace Gantt, faria a ação parecer deslocada do contexto onde foi iniciada.
- Design evidence: `server/api/models/Task.js` define a tarefa do Board com `name`, `isCompleted` e um `assigneeUserId`; `TaskList` liga-a ao `Card`, que por sua vez resolve Board e projeto; `server/api/models/GanttItem.js` mantém nome, responsáveis, estado, datas, duração, hierarquia e dependências próprios; `client/src/components/task-lists/TaskList/Task/Task.jsx` e `ActionsStep.jsx` são os owners da tarefa no cartão; `client/src/components/gantt/GanttWorkspace.jsx`, `GanttContext.jsx` e `GanttItemPanel.jsx` são os owners da criação, listagem, edição e tempo real do Gantt; `planos-desenvolvimento/PLANO_GANTT_POR_PROJETO_INTERATIVO.md` tornou o Gantt inicialmente independente e reservou ligações opcionais a Boards/cartões como evolução futura.
- Owner: associação e sincronização em `GanttItem`/helpers Gantt no servidor; importação em `GanttContext` e `GanttWorkspace`; ação da origem no componente `Task` do cartão.
- Scope and affected surfaces: importar uma ou várias tarefas a partir do Gantt; adicionar uma tarefa a partir do cartão; abrir a origem ou o item ligado; sincronizar nome, responsável e conclusão; agendar e gerir campos exclusivos do Gantt; tempo real, permissões, duplicados e remoção da origem.
- Uncertainty: as tarefas de checklist não têm datas no modelo atual. A data-limite disponível pertence ao cartão inteiro e não deve ser herdada silenciosamente pela tarefa. Neste plano, toda tarefa importada começa “Por agendar”; se forem adicionadas datas próprias a `Task` no futuro, a regra de importação pode passar a copiá-las depois de existir um contrato explícito para esses campos.

## Design decision

Criar uma associação opcional e única entre uma `Task` de checklist e um `GanttItem` normal do único plano Gantt do mesmo projeto. Não converter a tarefa nem criar um segundo objeto editável concorrente: a tarefa do cartão continua a ser a fonte de verdade para nome, responsável e conclusão; o item ligado é a representação de planeamento e é a fonte de verdade para tarefa geral/pai, datas, duração, dependências e cor.

Regras de propriedade dos campos:

| Informação | Fonte de verdade | Comportamento no item ligado |
| --- | --- | --- |
| Nome | `Task.name` | Copiado na associação, atualizado em tempo real e apresentado como só de leitura no painel Gantt. |
| Responsável | `Task.assigneeUserId` | Zero ou um responsável; sincronizado para os assignees do Gantt e só de leitura no painel Gantt. |
| Conclusão | `Task.isCompleted` | Apresentada no Gantt como “Concluída” ou “Por iniciar”; altera-se no cartão, sem gravar uma tradução no campo textual `status`. |
| Datas | `GanttItem.startDate/endDate` | A tarefa entra sem datas e em “Por agendar”; o utilizador agenda-a no Gantt. Não usar `Card.dueDate`. |
| Duração | `GanttItem.expectedDurationDays` | Começa em um dia e continua editável no Gantt. |
| Hierarquia, dependências e cor | `GanttItem` | Continuam editáveis apenas no Gantt. |

A relação é idempotente: a mesma tarefa só pode estar uma vez no Gantt. Apagar/remover o item do Gantt não altera a tarefa do cartão. Apagar a tarefa de origem, a lista de tarefas ou o cartão não deve apagar planeamento já feito; deve desligar a relação e conservar o `GanttItem` como tarefa autónoma com o último nome, responsáveis e datas guardados. Desativar e reativar o Gantt preserva a relação.

O servidor, e não o cliente, valida que todas as tarefas pertencem ao mesmo projeto do plano. Importar exige o contrato atual de edição do Gantt (`access.canEdit` e plano ativo); não deve depender de o utilizador ser editor do Board, porque a importação não modifica a tarefa de origem. Alterar nome, responsável ou conclusão continua sujeito às permissões normais do Board através da superfície do cartão.

A capacidade partilha dados, API e estado, mas não partilha apresentação entre superfícies:

- dentro do Gantt, importar é uma ferramenta do Gantt e usa a toolbar, painel lateral, superfícies escuras, densidade, controlos e feedback já governados por `GanttWorkspace`/`GanttItemPanel`;
- dentro do cartão, adicionar ou abrir é uma ação da tarefa do Board e usa o `Popup`, `Menu.Item`, botões, estados e toast já governados por `Task`/`ActionsStep`;
- nenhum componente visual, stylesheet ou chrome do Gantt é montado dentro do cartão, e nenhum popup/lista visual dos Boards é montado dentro do workspace Gantt. A passagem de uma linguagem para a outra só acontece quando a navegação muda efetivamente de superfície.

## Reuse

- `ProjectGanttProvider` e `useGantt` em `client/src/components/gantt/GanttContext.jsx` para expor itens ligados, importação e atualização em tempo real às duas superfícies.
- Toolbar, empty state e área “Por agendar” em `client/src/components/gantt/GanttWorkspace.jsx`; tarefas importadas sem datas devem entrar no owner já existente, não numa segunda inbox.
- Estrutura de `GanttItemPanel`, toolbar de `GanttWorkspace`, `WillowDark`, `RichSelect`, `Button` e tokens/classes locais do Gantt para o importador apresentado dentro do Gantt; não usar o chrome dos modais dos Boards nesta superfície.
- `Task`, `ActionsStep`, `Popup`, `Menu.Item` e toast em `client/src/components/task-lists/TaskList/Task/` para “Adicionar ao Gantt”/“Abrir no Gantt”; não montar painel, select ou estilos do Gantt dentro do cartão.
- `GanttItemPanel` para mostrar origem, abrir o cartão e editar apenas os campos que pertencem ao planeamento.
- `tasks.getPathToProjectById`, `gantt.getProjectAccess`, query methods de `Board`, `Card`, `TaskList` e `Task`, e `gantt.presentItem` como base da validação e apresentação no servidor.
- Eventos `ganttItemCreate`, `ganttItemUpdate` e `ganttItemDelete` e a sala `ganttPlan:<id>`; não criar um segundo canal de sincronização.
- Exemplar: a criação normal em `server/api/controllers/gantt-items/create.js` para datas, posição, validação de membros e payload apresentado.

O seletor de origem é específico do Gantt porque representa a hierarquia Board → cartão → lista de tarefas → tarefa e permite seleção múltipla. Não generalizar prematuramente um primitive global nem partilhar esse componente visual com os Boards. Apenas os métodos headless de consulta/importação e os identificadores ligados pertencem ao contexto comum.

## Changes

1. `server/db/migrations/<timestamp>_link_board_tasks_to_gantt_items.js`
   - Change: adicionar `source_task_id` nullable a `gantt_item`, com foreign key para `task.id`, `ON DELETE SET NULL`, índice de procura e constraint única. A constraint garante no datastore que uma tarefa não cria dois itens, inclusive em importações concorrentes.
   - Change: não preencher relações retroativamente por semelhança de nomes; itens Gantt existentes permanecem autónomos.
   - Preserve: constraints atuais de tipo, pai, datas e duração.
   - Verify: `up` aceita itens existentes, impede duas relações para a mesma `Task` e mantém o item quando a `Task` é apagada; `down` remove apenas a nova relação.

2. `server/api/models/GanttItem.js` e `server/api/hooks/query-methods/models/GanttItem.js`
   - Change: declarar `sourceTaskId` como associação nullable e adicionar queries por um ou vários IDs de origem, necessárias para idempotência, sincronização e detach em lote.
   - Change: manter `task` como snapshot obrigatório do nome. Esse snapshot permite que o item sobreviva à remoção da origem sem perder identidade.
   - Preserve: `itemType`; apenas itens `task`, nunca `summary`, podem receber `sourceTaskId`.
   - Verify: queries devolvem uma relação no máximo e não misturam planos.

3. `server/api/controllers/gantt-plans/source-tasks.js`, `server/config/routes.js` e query methods relacionados
   - Change: adicionar `GET /api/gantt-plans/:id/source-tasks`, protegido por acesso ao projeto, que devolve as tarefas de checklist do mesmo projeto com o contexto mínimo `{task, taskList, card, list, board}` e `ganttItemId` quando já ligadas.
   - Change: construir o resultado em queries por lote (Boards do projeto → Lists/Cards → TaskLists → Tasks → relações Gantt), sem resolver um caminho completo por tarefa.
   - Change: excluir cartões em listas Archive/Trash da seleção de novas tarefas, mas devolver relações existentes quando necessário para “Abrir no Gantt”. Permitir pesquisa por nome de tarefa e cartão e filtro por Board; mostrar tarefas concluídas apenas quando a UI pedir `includeCompleted=true`.
   - Preserve: utilizadores sem acesso ao projeto recebem not found; membros sem edição Gantt podem consultar apenas a metadata necessária para mostrar uma relação já existente, mas a resposta deve indicar `meta.canImport=false`.
   - Verify: a resposta nunca inclui tarefas de outro projeto, Boards inacessíveis ou dados completos do cartão desnecessários.

4. `server/api/controllers/gantt-plans/import-source-tasks.js`, `server/config/routes.js` e `client/src/api/gantt.js`
   - Change: adicionar `POST /api/gantt-plans/:id/import-source-tasks` com `{ taskIds: [] }`; aceitar um ou vários IDs, remover repetidos, validar plano ativo, `access.canEdit`, tipo normal, origem no mesmo projeto e responsável ainda membro do projeto.
   - Change: criar numa transação um `GanttItem` por origem ainda não ligada, sempre com `startDate/endDate=null`, `expectedDurationDays=1`, nome da `Task`, o responsável atual quando existir, estado textual nulo e posição no fim da coleção. Tarefas já ligadas devem ser devolvidas como `alreadyLinked`, tornando double-click e as duas entradas idempotentes.
   - Change: proteger a corrida com a constraint única; em conflito, reler a relação e devolvê-la como já existente em vez de criar um duplicado.
   - Change: devolver os itens apresentados e metadata `{createdTaskIds, alreadyLinkedTaskIds}` e emitir um `ganttItemCreate` por item realmente criado.
   - Preserve: a tarefa do Board não é alterada e nenhuma data do cartão é copiada.
   - Verify: pedido misto com IDs inválidos ou de outro projeto falha sem criação parcial; pedido repetido devolve o mesmo item.

5. `server/api/helpers/gantt/present-item.js`, novo helper `server/api/helpers/gantt/sync-linked-item-from-task.js` e loaders do Gantt
   - Change: apresentar nos itens ligados `sourceTask` com apenas `id`, `name`, `isCompleted`, `assigneeUserId`, `taskListId`, `cardId`, `boardId` e nomes de contexto necessários para “Board / cartão / lista”. Resolver estas relações em lote no `gantt-plans/show`, sem N+1.
   - Change: centralizar a sincronização source → Gantt num helper que atualiza o snapshot `task`, sincroniza os assignees para zero/um, incrementa `version` e emite `ganttItemUpdate` com a metadata de origem atual.
   - Change: invocar o helper a partir de `server/api/helpers/tasks/update-one.js` quando mudam `name`, `assigneeUserId` ou `isCompleted`. Uma mudança de conclusão deve emitir update mesmo sem escrever texto localizado em `GanttItem.status`.
   - Preserve: datas, duração, pai, dependências, cor e restantes campos Gantt nunca são substituídos por uma atualização da origem.
   - Verify: clientes no Board e no Gantt observam a alteração sem reload e o versionamento otimista continua a detetar edições concorrentes.

6. `server/api/controllers/gantt-items/update.js` e `server/api/controllers/gantt-items/delete.js`
   - Change: para itens ligados, rejeitar no servidor alterações diretas de `task`, `status` e `assigneeUserIds`; a UI desativa esses campos, mas a API continua a garantir a propriedade dos dados. Datas, duração, pai, posição e cor mantêm-se editáveis.
   - Change: ao eliminar um item ligado, usar copy específica “Remover esta tarefa do Gantt? A tarefa no cartão não será eliminada.” e apagar apenas o `GanttItem`/relação.
   - Preserve: comportamento atual para itens Gantt autónomos e summaries.
   - Verify: um pedido manual não consegue fazer o nome/responsável/conclusão divergir da origem.

7. `server/api/helpers/tasks/delete-one.js`, `server/api/helpers/task-lists/delete-related.js` e caminhos de remoção de cartões/Boards
   - Change: antes da remoção direta ou em lote, obter os itens ligados e conservar os seus snapshots; deixar a foreign key fazer `SET NULL` dentro da mesma transação e emitir `ganttItemUpdate` após a alteração para que clientes Gantt retirem a indicação de origem.
   - Change: encapsular a recolha/detach num helper Gantt partilhado para cobrir tarefa individual, lista de tarefas, cartão, lista e Board sem duplicar regras.
   - Preserve: a cascata atual de remoção de conteúdo do Board e o planeamento/datas do Gantt.
   - Verify: apagar qualquer nível acima da Task não apaga o item Gantt, não deixa FK inválida e não exige reload para o Gantt refletir que o item passou a autónomo.

8. `client/src/components/gantt/GanttContext.jsx`
   - Change: indexar itens ligados por `sourceTask.id`, expor `getSourceTasks(filters)`, `importSourceTasks(taskIds)` e `getLinkedItemForTask(taskId)`; fundir respostas e eventos sem duplicar itens.
   - Change: manter source metadata em updates por socket e remover a associação local quando o servidor envia um item desligado.
   - Preserve: ativação/desativação, criação manual, links, reload e estado atual do plano.
   - Verify: tanto o Gantt como um cartão aberto recebem a mesma relação imediatamente após importação.

9. Novo `client/src/components/gantt/GanttSourceTaskImportPanel/` e `client/src/components/gantt/GanttWorkspace.jsx`
   - Change: acrescentar na toolbar “Importar dos boards” ao lado de “Nova tarefa” e repetir a ação no empty state. Mostrar apenas com plano ativo e `canMutate`.
   - Change: abrir dentro do workspace um painel lateral irmão de `GanttItemPanel`, com o mesmo backdrop/comportamento de fecho, largura, superfície escura, header, scroll interno e footer. O importador pertence visualmente ao Gantt e não deve usar `ClosableModal`, estilos de CardModal, popup de Task ou outra composição visual dos Boards.
   - Change: compor pesquisa, filtro de Board, toggle “Incluir concluídas” e lista hierárquica compacta Board → cartão → lista → tarefas com os controlos e tokens do Gantt (`Button`, inputs locais e `WillowDark`/`RichSelect` onde se aplicar). Cada tarefa tem checkbox, responsável, estado de conclusão e indicador “Já no Gantt”; relações existentes não podem ser selecionadas e oferecem “Abrir”. Os nomes de Board/cartão/lista são conteúdo contextual, não uma importação do UI visual dos Boards.
   - Change: permitir seleção múltipla, contador no footer e ação “Adicionar ao Gantt”. Preservar seleção enquanto pesquisa/filtro mudam; desativar submit vazio; mostrar loading, zero resultados, erro/retry e erro de importação sem perder a seleção.
   - Change: em sucesso, fechar o painel, mostrar toast com a contagem e deixar os novos itens na área “Por agendar”. Se apenas um item for criado, permitir abri-lo diretamente no `GanttItemPanel` para agendar, mantendo toda a sequência dentro da linguagem Gantt.
   - Change: suportar `/projects/:id/gantt?item=:ganttItemId`; ao chegar por essa URL, focar/abrir o item quando existe e limpar/ignorar o parâmetro se estiver inválido.
   - Preserve: criação manual de tarefas e summaries, zoom, timeline, área “Por agendar”, tema Willow Dark, densidade e alterações locais ainda não commitadas no Gantt.
   - Verify: seleção com tarefas homónimas continua inequívoca pelo contexto Board/cartão/lista; nenhum item é duplicado visualmente após os sockets de criação; o importador parece uma ferramenta nativa do Gantt e não um CardModal sobreposto.

10. `client/src/components/task-lists/TaskList/Task/Task.jsx` e `ActionsStep.jsx`
    - Change: quando o Gantt do projeto está ativo, a tarefa está persistida e o utilizador pode editar o Gantt, incluir “Adicionar ao Gantt” como um `Menu.Item` normal no `ActionsStep`; chamar o mesmo endpoint headless de importação com um ID e usar o loading/disabled e toast já praticados pelos cartões.
    - Change: quando já existe relação, substituir por “Abrir no Gantt”, continuando como `Menu.Item` do popup do Board e navegando para a rota com `?item=`. Só depois da navegação é apresentado o painel visual do Gantt.
    - Change: a ação deve continuar disponível a um gestor com Gantt editável mesmo que editar/apagar a Task esteja limitado pelo papel no Board; separar essas permissões no popup em vez de inferir uma da outra, mas conservar o mesmo trigger e chrome visual das ações de tarefa.
    - Change: após adicionar, mostrar estado de submissão e impedir clique repetido; o resultado idempotente cobre concorrência com outro utilizador. Não abrir drawer, select, toolbar ou confirmação estilizada como Gantt dentro do cartão.
    - Preserve: checkbox de conclusão, edição de nome, responsável, drag, delete, `Popup.Header`, espaçamento e estados do menu atuais.
    - Verify: a ação não aparece com Gantt desativado, fora do modo de edição ou para quem só pode consultar o Gantt; dentro do cartão parece mais uma ação nativa dos Boards; “Abrir no Gantt” fecha naturalmente o cartão pela navegação de rota e só aí adota o UI Gantt.

11. `client/src/components/gantt/GanttItemPanel.jsx`, `GanttTimelineAdapter.jsx` e estilos locais
    - Change: identificar visualmente um item ligado com um ícone/label discreto “Do Board”; mostrar o caminho Board / cartão / lista e “Abrir cartão”.
    - Change: no painel ligado, apresentar nome, responsável e conclusão como informação de origem só de leitura com a ajuda “Edite estes dados no cartão”. Manter pai, cor, duração, datas e dependências editáveis.
    - Change: na coluna Estado, derivar “Concluída”/“Por iniciar” de `sourceTask.isCompleted`; itens autónomos continuam a usar `status`. Não persistir traduções no servidor.
    - Change: adaptar a confirmação de delete para “Remover do Gantt” sem sugerir que a Task será apagada.
    - Preserve: layout e tema atuais, incluindo alterações locais ainda não commitadas, hierarquia, drag/resize e foco/restauro de foco. Toda a indicação de origem nesta superfície usa componentes e estilos locais do Gantt; não reutilizar visualmente `Task.jsx`, CardModal ou `ActionsStep` para a representar.
    - Verify: editar datas de um item ligado não altera a Task; alterar a Task no cartão atualiza nome, pessoa e conclusão no painel/timeline sem fechar o Gantt.

12. Traduções `client/src/locales/en-US/core.js`, `fr-FR/core.js` e `pt-PT/core.js`
    - Change: adicionar chaves para importar, pesquisa/filtros, já ligado, origem, abrir cartão/Gantt, contagens, sucesso/erro, propriedade dos campos e confirmação “Remover do Gantt”.
    - Preserve: chaves de criação manual e o significado de “Por agendar”.
    - Verify: nenhuma copy diz “importar cartão”; a entidade é sempre “tarefa” e o cartão aparece apenas como contexto.

13. Testes do servidor e `client/tests/gantt-ui-smoke.cjs`
    - Change: criar testes do endpoint para permissões, plano inativo, fronteira de projeto, archive/trash, seleção múltipla, responsável, ausência de datas, concluídas, idempotência e corrida protegida pela constraint.
    - Change: testar sincronização de rename/assignee/completion, preservação de campos Gantt, rejeição de updates source-owned e detach após apagar Task, TaskList e Card.
    - Change: no smoke test, criar um cartão com duas tarefas, importar uma pelo painel nativo do Gantt e outra pelo popup nativo da tarefa no cartão, confirmar ambas em “Por agendar”, abrir a origem, atribuir datas, alterar nome/responsável/conclusão na origem e observar o Gantt em tempo real.
    - Change: afirmar a fronteira visual/estrutural sem snapshots frágeis: o importador Gantt é descendente do workspace/painel Gantt e contém o tema/owners Gantt; a ação do cartão é um `Menu.Item` dentro do `Popup` de `ActionsStep` e não monta classes, Willow ou painel Gantt.
    - Change: cobrir pesquisa sem resultados, seleção preservada, tarefa já ligada, double-click, erro/retry, utilizador read-only e confirmação de remoção que deixa a Task intacta.
    - Preserve: smoke tests atuais de drag/resize, zoom, hierarquia, painel e ativação do Gantt.
    - Verify: os testes falham se uma Task for duplicada, se dados de outro projeto aparecerem ou se uma alteração de origem apagar planeamento.

## Scope

- Inherit: todos os Boards ativos do projeto podem fornecer tarefas; uma Task movida entre listas de tarefas dentro do mesmo cartão mantém a relação; Gantt desativado preserva relações e itens.
- Verify: zero/uma/muitas tarefas, nomes repetidos, sem/com responsável, concluída/incompleta, origem em Board diferente dentro do projeto, item já ligado, ações concorrentes, tarefa/cartão apagado, projeto com muitas tarefas e utilizador com combinações diferentes de permissões Board/Gantt.
- Exclude: importar o cartão inteiro; transformar cartões em tarefas Gantt; usar a data-limite do cartão; adicionar datas próprias às Tasks; sincronização Gantt → Task de nome/responsável/conclusão; ligar a mais de um Gantt; importar entre projetos; criar o Gantt automaticamente; alterar as regras atuais de quem edita o Gantt; histórico detalhado da sincronização; montar UI do Gantt dentro do cartão; montar componentes visuais dos Boards dentro do workspace Gantt; criar um terceiro design híbrido para a funcionalidade.

## Validation

- Product: a partir do Gantt, pesquisar e selecionar tarefas de dois Boards e confirmar que aparecem uma vez em “Por agendar”; a partir de uma tarefa no cartão, usar “Adicionar ao Gantt” e depois “Abrir no Gantt”; agendar no Gantt; alterar nome, responsável e conclusão no cartão e observar apenas esses campos atualizados; remover do Gantt e confirmar que a Task permanece.
- Interface: validar toolbar e empty state, painel importador Gantt com loading/empty/error/success, popup de ação nativo do Board, seleção múltipla, homónimos, concluídas, indicação de origem, painel ligado/autónomo, confirmação de remoção, rota `?item=`, viewports desktop e mobile e foco por teclado.
- System: confirmar source ownership, constraint única, validação do mesmo projeto no servidor, queries em lote sem N+1, sockets sem itens repetidos, incrementos de versão e preservação de datas/duração/hierarquia/dependências em todas as sincronizações e remoções; confirmar também que apenas API/contexto são partilhados e que não há dependências visuais cruzadas entre `components/gantt` e o UI da tarefa no cartão.
- Repository: `git diff --check` → sem erros de whitespace.
- Repository: `cd server && npm test -- --grep "Gantt source task"` (ou o comando Mocha equivalente usado pelo executor) → novos contratos de API/sync/detach aprovados.
- Repository: `cd client && npx eslint src/components/gantt src/components/task-lists/TaskList/Task tests/gantt-ui-smoke.cjs` → sem novos erros.
- Repository: executar os smoke tests Gantt contra `http://localhost:3008` e os serviços de desenvolvimento já ativos → fluxo validado por hot reload e zero erros de browser. Não executar build, conforme `AGENTS.md`.

## Stop conditions

- Stop if “task do Board” afinal significar o cartão inteiro e não a tarefa de checklist dentro do cartão; isso exige outro modelo de origem e outro plano.
- Stop if o produto quiser sincronização bidirecional de nome, responsável ou conclusão. Definir primeiro conflitos, permissões e a incompatibilidade entre um responsável na Task e múltiplos responsáveis no Gantt.
- Stop if for obrigatório herdar datas do Board; `Task` não possui datas hoje. Não usar `Card.dueDate` sem uma decisão explícita sobre como uma data do cartão se aplica a várias tarefas.
- Stop if existir mais de um Gantt por projeto ou se a mesma Task tiver de aparecer várias vezes; rever a constraint única e a identidade da relação antes da migration.
- Stop if `access.canEdit` deixar de ser a autoridade de edição do Gantt; não duplicar regras de permissão no endpoint de importação.
- Stop if os caminhos de delete em transação não permitirem emitir sockets apenas depois de a alteração estar confirmada; manter a consistência do datastore primeiro e criar um mecanismo pós-commit antes de anunciar detach.
- Stop if a listagem completa das tarefas do projeto demonstrar volume excessivo no ambiente real; manter o contrato do painel e introduzir paginação/pesquisa server-side antes de carregar tudo no cliente.
- Stop if a implementação exigir importar componentes ou stylesheets visuais do Gantt para `Task`/`ActionsStep`, ou componentes visuais do CardModal/Task popup para `GanttSourceTaskImportPanel`; manter o contrato de dados comum e criar a composição local em cada owner.

## Design documentation

- After acceptance and validation: atualizar a secção “Evoluções futuras” de `planos-desenvolvimento/PLANO_GANTT_POR_PROJETO_INTERATIVO.md` para registar que a ligação opcional a tarefas de checklist foi implementada, com Task como fonte de nome/responsável/conclusão, Gantt como fonte de planeamento e apresentação governada localmente pela superfície onde a ação acontece. Não alterar essa documentação durante a execução antes de o comportamento estar validado.
