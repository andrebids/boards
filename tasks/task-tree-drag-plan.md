# Plano de implementação: árvore de tasks com `dnd-kit-sortable-tree`

## Objetivo

Substituir apenas a camada visual e de interação do drag-and-drop de listas, tasks e subtasks por uma árvore ordenável baseada em `dnd-kit-sortable-tree`, mantendo o domínio já existente do Planka: `taskListId`, `parentTaskId`, `position`, Redux, API, transação no servidor, sockets, permissões, conclusão de pais e integração Gantt.

O resultado deve tornar inequívoco quando uma task será colocada antes/depois de outra, quando passará a subtask e qual será a sua posição final, sem transformar o cartão num explorador de ficheiros nem importar o visual genérico do exemplo da biblioteca.

## Estado de partida confirmado

- O cliente usa React 18.2 e `@hello-pangea/dnd@18.0.1`.
- `TaskLists.jsx` usa um único `DragDropContext` para ordenar listas e mover tasks.
- `task-tree.js` já resolve a projeção plana, ciclos, descendentes e índices entre irmãos.
- `moveTask()` já faz atualização otimista da raiz e dos descendentes e rollback em erro.
- `PATCH /tasks/:id` já aceita `taskListId`, `parentTaskId` e `position`.
- `server/api/helpers/tasks/move-tree.js` já move a subárvore numa transação, valida o pai, reposiciona irmãos e publica sockets depois do commit.
- Existem alterações locais não relacionadas/iterativas na árvore e no dashboard; a implementação deve preservá-las e trabalhar com diffs por ficheiro.

## Decisão de arquitetura

### Uma única árvore composta por cartão

`dnd-kit-sortable-tree` cria internamente o seu próprio `DndContext`. Instanciar uma árvore por lista impediria movimentos entre listas. Por isso, o cartão será representado por uma única árvore:

```text
task-list:lista-a                 tipo: taskList
├─ task:tarefa-1                 tipo: task
│  ├─ task:subtarefa-1           tipo: task
│  └─ task:subtarefa-2           tipo: task
├─ task:tarefa-2                 tipo: task
└─ task-list-footer:lista-a      tipo: footer

task-list:lista-b                 tipo: taskList
├─ task:tarefa-3                 tipo: task
└─ task-list-footer:lista-b      tipo: footer
```

Regras de estrutura:

- A raiz aceita apenas nós `taskList`.
- Um nó `taskList` aceita apenas `task` e mantém todos os seus filhos na mesma lista.
- Um nó `task` aceita apenas outros nós `task`.
- Um nó `footer` não pode ser arrastado nem receber filhos; serve para manter “Adicionar task” no fim visual da lista.
- Listas podem ser reordenadas apenas no nível raiz.
- Tasks não podem ficar na raiz fora de uma lista.
- A biblioteca controla apenas a projeção visual; a verdade persistida continua no Redux/API.

### Contrato do drop

No `onItemsChanged(items, reason)`:

- Se `reason.type` for `collapsed` ou `expanded`, atualizar apenas o estado local de colapso.
- Se o nó movido for `taskList`, obter o novo índice entre nós `taskList` e chamar o `moveTaskList` existente.
- Se o nó movido for `task`, localizar o ancestral `taskList`, o pai `task` direto e o índice entre irmãos; chamar `moveTask(id, taskListId, parentTaskId, index)` existente.
- Ignorar callbacks de remoção da biblioteca; apagar continua pelo diálogo/ação Planka.
- Normalizar sempre o `footer` como último filho da lista antes de derivar índices.
- Não criar um segundo estado persistente da árvore. Pode existir uma projeção local curta durante o drop apenas para impedir snap-back até o update otimista do Redux chegar; ela deve ser descartada assim que a projeção Redux coincidir ou o pedido falhar.

## Direção visual Planka

O pacote será usado como motor, não como tema. Não importar diretamente o aspeto de explorador de ficheiros de `FolderTreeItemWrapper.css` ou `SimpleTreeItemWrapper.css`.

### Estrutura preservada

- Cabeçalho de lista com o ícone, nome e ação de editar atuais.
- Barra de progresso e contagem atuais.
- Linha de task compacta com altura mínima de 34 px.
- Checkbox, conteúdo Markdown, progresso de filhos, avatar e ações existentes.
- Botão “Adicionar task” no fim de cada lista.
- Separação atual de 28 px entre listas.
- Indentação de 24 px por nível, com apresentação visual limitada a 120 px para árvores profundas.

### Alterações visuais mínimas

- Adicionar um handle discreto de seis pontos, visível em hover/focus, para o drag não competir com checkbox, texto, avatars e botões.
- Usar `manualDrag` e aplicar `handleProps` apenas nesse handle.
- Manter rows transparentes em repouso; hover/focus usa os tokens atuais do modal.
- Desenhar conectores de 1 px com `--card-modal-muted`, alinhados ao centro do checkbox.
- Mostrar chevron apenas quando existem filhos; preservar o estado colapsado local.
- O overlay conserva largura, tema, checkbox, texto e avatars, com sombra curta e sem escala/bounce decorativo.

### Feedback enquanto arrasta

- Movimento horizontal altera o nível em passos de 24 px.
- O ghost permanece no local de origem com opacidade reduzida (`keepGhostInPlace`).
- Inserção antes/depois mostra uma linha de 2 px no nível final projetado.
- Quando a projeção coloca a task dentro de outra, o pai candidato recebe fundo `accent-soft` e contorno de 1 px.
- O overlay mostra um badge com o número de descendentes quando a task arrastada possui subárvore.
- Alvos inválidos não realçam e não produzem pedido HTTP.

### Estado depois do drop

- A árvore assume imediatamente a posição final; não pode piscar para a posição antiga.
- O pai de destino fica expandido para que a task movida permaneça visível.
- A task movida recebe um flash único e subtil em `accent-soft`, depois regressa ao estado normal.
- Linhas, indentação, checkbox e conteúdo devem permanecer alinhados após reload e após evento socket de outra sessão.
- Com `prefers-reduced-motion`, desativar deslocações/drop animation do pacote e manter apenas feedback de cor/contorno.

## Dependências propostas

Instalar apenas se o checkpoint de compatibilidade passar, com versões exatas no lockfile:

- `dnd-kit-sortable-tree@0.1.73`
- `@dnd-kit/core@6.3.1`
- `@dnd-kit/sortable@10.0.0`
- `@dnd-kit/utilities@3.2.2`

O pacote não publica uma versão nova desde julho de 2023 e contém o `KeyboardSensor` comentado. Por isso, não será aceite sem spike e não será usado como única via acessível de movimento.

## Fase 0 — compatibilidade e decisão de avançar

### Tarefa 1: provar a árvore composta num harness local

**Descrição:** Instalar as dependências com versões fixas e criar um harness temporário, alimentado por dados estáticos, com duas listas, três níveis de tasks, footer e controlos interativos dentro da row.

**Critérios de aceitação:**

- [ ] React 18/Vite inicia por hot reload sem warnings ou conflitos de peer dependencies.
- [ ] Uma task muda de pai, volta à raiz da lista e atravessa entre duas listas dentro do mesmo `SortableTree`.
- [ ] Listas reordenam apenas no nível raiz; tasks nunca ficam fora de uma lista.
- [ ] Checkbox, botão, link/texto selecionável e popup não iniciam drag; apenas o handle inicia.
- [ ] Scroll do modal e `DragOverlay` funcionam em Chrome e num viewport estreito.

**Verificação:** harness em `http://localhost:3008`, consola limpa para o fluxo, inspeção por rato/touch emulado e teste unitário das regras `canHaveChildren`.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/package.json`
- `client/package-lock.json`
- `client/src/components/task-lists/TaskList/SortableTaskTreeSpike.jsx` (temporário)
- teste focado do spike

**Escopo:** pequeno.

### Gate de decisão

- [ ] **Avançar:** todos os critérios passam sem patch ao código interno da biblioteca.
- [ ] **Parar:** movimento entre listas, controlos interativos ou overlay exigem fork/patch significativo.

Se o gate falhar, remover o harness e dependências e reavaliar `Pragmatic drag and drop`; não acumular correções locais num pacote antigo.

## Fase 1 — adaptador de dados

### Tarefa 2: converter o domínio Planka para a árvore composta

**Descrição:** Criar funções puras que convertam `taskListIds`, `tasksByTaskListId` e ids colapsados em `TreeItems`, com ids tipados/prefixados, footer final e regras de filhos.

**Critérios de aceitação:**

- [ ] A projeção preserva ordem por `position`, qualquer profundidade e listas vazias.
- [ ] Não duplica nem perde tasks órfãs/corrompidas; aplica o fallback seguro já usado por `buildTaskRows`.
- [ ] Nós de lista, task e footer têm regras de parentagem testadas.

**Verificação:** Jest focado com duas listas, três níveis, lista vazia, task órfã, ids semelhantes e colapso.

**Dependências:** tarefa 1 aprovada.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/sortable-task-tree.js` (novo)
- `client/src/components/task-lists/TaskList/sortable-task-tree.test.js` (novo)
- `client/src/components/task-lists/TaskList/task-tree.js` (apenas reutilização/extracção necessária)

**Escopo:** médio.

### Tarefa 3: traduzir a árvore final para comandos existentes

**Descrição:** Derivar do callback da biblioteca um comando Planka mínimo, distinguindo reorder de lista, reorder entre irmãos, reparent e mudança de lista.

**Critérios de aceitação:**

- [ ] Uma task produz exatamente `{ id, taskListId, parentTaskId, index }`.
- [ ] Uma lista produz exatamente `{ id, index }`.
- [ ] Footer, raiz inválida, ciclos e callbacks sem alteração produzem `null`.
- [ ] O índice ignora nós de infraestrutura e conta apenas irmãos persistidos.

**Verificação:** Jest focado cobrindo antes/depois, tornar subtask, retirar de subtask, mover subárvore entre listas e no-op.

**Dependências:** tarefa 2.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/sortable-task-tree.js`
- `client/src/components/task-lists/TaskList/sortable-task-tree.test.js`
- `client/src/components/cards/CardModal/TaskLists/TaskLists.jsx`

**Escopo:** médio.

### Checkpoint 1

- [ ] Todas as mudanças visuais da biblioteca traduzem-se nos comandos atuais sem pedido HTTP no teste.
- [ ] O servidor, schema e contrato de sockets não precisam de alteração.

## Fase 2 — integração visual

### Tarefa 4: separar o conteúdo visual dos wrappers `Draggable`

**Descrição:** Extrair o markup visual existente de lista e task para componentes que aceitem `ref`, estado de overlay/ghost e `handleProps`, sem duplicar checkbox, popups, edição ou seleção Redux.

**Critérios de aceitação:**

- [ ] A mesma row renderiza em repouso, ghost e overlay sem wrappers DnD duplicados.
- [ ] Checkbox, conteúdo, avatars, edição, adicionar subtask e ações mantêm comportamento.
- [ ] Apenas o handle inicia drag e fica acessível por foco.

**Verificação:** testes focados de componente e inspeção do DOM para refs/handle; lint apenas dos ficheiros tocados.

**Dependências:** checkpoint 1.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/Task/Task.jsx`
- `client/src/components/task-lists/TaskList/Task/TaskRow.jsx` (novo, se a extração for necessária)
- `client/src/components/cards/CardModal/TaskLists/Item.jsx`
- `client/src/components/cards/CardModal/TaskLists/TaskListRow.jsx` (novo, se necessário)

**Escopo:** médio.

### Tarefa 5: substituir o contexto atual pela árvore composta

**Descrição:** Renderizar um único `SortableTree` em `TaskLists.jsx`, ligar o adaptador e encaminhar drops para `moveTaskList`/`moveTask`, preservando colapso, add, permissões e fecho de popups no início do drag.

**Critérios de aceitação:**

- [ ] Lista e tasks movem-se dentro do mesmo contexto sem nested `DndContext`.
- [ ] A atualização otimista existente impede snap-back e o rollback restaura a árvore em erro.
- [ ] Um utilizador sem permissão vê a mesma árvore, mas sem drag handles ativos.
- [ ] O pai de destino expande e a task movida fica visível após o drop.

**Verificação:** testes do adaptador/callback, erro simulado de API e smoke test em hot reload.

**Dependências:** tarefas 3 e 4.

**Ficheiros prováveis:**

- `client/src/components/cards/CardModal/TaskLists/TaskLists.jsx`
- `client/src/components/cards/CardModal/TaskLists/Item.jsx`
- `client/src/components/task-lists/TaskList/TaskList.jsx`
- `client/src/components/task-lists/TaskList/Task/Task.jsx`
- stylesheet da nova árvore

**Escopo:** médio.

### Checkpoint 2

- [ ] Criar, editar, concluir, atribuir, expandir, colapsar e apagar continuam corretos.
- [ ] Recarregar e uma segunda sessão mostram exatamente a mesma árvore final.
- [ ] Nenhum ficheiro do dashboard ou outra superfície de tasks foi alterado por arrasto desta migração.

## Fase 3 — acabamento Planka e acessibilidade

### Tarefa 6: aplicar o tema e os estados de colocação Planka

**Descrição:** Estilizar apenas o wrapper customizado e estados fornecidos pela biblioteca; preservar a densidade atual e implementar conectores, indicador, pai candidato, ghost, overlay e flash pós-drop.

**Critérios de aceitação:**

- [ ] Em repouso, a diferença visual para a árvore Planka atual limita-se ao handle e a pequenos alinhamentos necessários.
- [ ] Durante o drag, nível projetado, pai candidato e posição final são inequívocos.
- [ ] Overlay/ghost não mudam largura, tipografia ou tema; não há salto ao largar.
- [ ] Tema claro/escuro, 200% zoom, largura estreita e conteúdo longo continuam legíveis.

**Verificação:** browser em hot reload, screenshots antes/durante/depois e inspeção nos dois temas; não executar build.

**Dependências:** tarefa 5.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/SortableTaskTree.module.scss` (novo)
- `client/src/components/task-lists/TaskList/Task/Task.module.scss`
- `client/src/components/cards/CardModal/TaskLists/Item.module.scss`

**Escopo:** médio.

### Tarefa 7: garantir movimento acessível e reduced motion

**Descrição:** Manter uma alternativa de movimento pelo menu da task, localizar anúncios do `DndContext` e reduzir motion conforme preferência do sistema. Não depender do keyboard sensor comentado da biblioteca.

**Critérios de aceitação:**

- [ ] O menu “Mover task” permite escolher lista e pai válidos usando o mesmo `moveTask`.
- [ ] Task e descendentes não aparecem como pais possíveis.
- [ ] Anúncios de pick/move/drop são localizados em PT/EN.
- [ ] `prefers-reduced-motion` remove movimento do overlay/layout e conserva feedback de estado.

**Verificação:** percurso apenas com teclado, leitura dos anúncios num leitor de ecrã disponível e teste do media query.

**Dependências:** tarefas 3 e 5.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/Task/ActionsStep.jsx`
- `client/src/components/task-lists/TaskList/Task/MoveStep.jsx` (novo)
- `client/src/components/cards/CardModal/TaskLists/TaskLists.jsx`
- `client/src/locales/en-US/core.js`
- `client/src/locales/pt-PT/core.js`

**Escopo:** médio.

## Fase 4 — remoção do caminho antigo e regressão

### Tarefa 8: remover somente o DnD de tasks substituído

**Descrição:** Depois da paridade comprovada, remover `TaskDragContext`, `task-drag-style` e resolvedores/SCSS usados exclusivamente pelo fluxo antigo. Manter `@hello-pangea/dnd` porque outras superfícies do Planka ainda o utilizam.

**Critérios de aceitação:**

- [ ] Não restam dois motores DnD ativos na árvore do cartão.
- [ ] Helpers ainda usados por dashboard, cartões ou testes não são apagados.
- [ ] `@hello-pangea/dnd` permanece no package.json enquanto houver outros consumidores.

**Verificação:** `rg` de imports/callers, Jest focado, lint dos ficheiros tocados e `git diff --check`.

**Dependências:** tarefas 6 e 7 aprovadas.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/TaskDragContext.js`
- `client/src/components/task-lists/TaskList/Task/task-drag-style.js`
- testes associados
- `client/src/components/task-lists/TaskList/task-tree.js`

**Escopo:** pequeno.

### Tarefa 9: executar a matriz final de regressão

**Descrição:** Validar o fluxo completo no ambiente de desenvolvimento existente e comparar o resultado final com os contratos do servidor já implementados.

**Critérios de aceitação:**

- [ ] Passam os testes Jest do adaptador, árvore, rows e movimento acessível.
- [ ] Passam os testes Mocha focados de `task-tree-move`, conclusão e eliminação de pais.
- [ ] Passam lint focado e `git diff --check`.
- [ ] Browser valida rato, touch emulado, teclado alternativo, duas listas, lista vazia, árvore profunda, scroll, cancelamento, erro e duas sessões.
- [ ] Não foi executado `npm run build`; validação local usa hot reload em `http://localhost:3008`.

**Dependências:** tarefas 1 a 8.

**Ficheiros prováveis:** testes focados existentes e novos; nenhum ficheiro de produção adicional.

**Escopo:** médio.

### Checkpoint final

- [ ] É evidente antes do drop se a task ficará antes, depois ou dentro de outra.
- [ ] O layout final é estável, compacto e reconhecível como Planka.
- [ ] Movimentos entre listas preservam a subárvore, persistência, rollback e sockets.
- [ ] Há alternativa completa ao drag para teclado/tecnologia assistiva.
- [ ] O pacote continua substituível através do adaptador, sem tipos/API espalhados pelo domínio.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Pacote sem publicação desde 2023 | Alto | Spike obrigatório; versões fixas; abandonar se exigir patch interno relevante. |
| `SortableTree` cria `DndContext` interno | Alto | Uma árvore composta por cartão, com listas como nós raiz. |
| Keyboard sensor está comentado no pacote | Alto | Ação “Mover task” completa e anúncios localizados; não alegar acessibilidade pelo drag. |
| Footer técnico interferir nos índices | Alto | Tipo não arrastável, normalização como último filho e índices derivados apenas de irmãos persistidos. |
| Estado da biblioteca divergir do Redux | Alto | Redux permanece fonte de verdade; projeção local apenas durante confirmação do drop e rollback explícito. |
| CSS global dos wrappers do pacote alterar o Planka | Médio | Wrapper customizado/CSS Module; não importar o tema de exemplo. |
| Migração apagar trabalho local atual | Alto | Patch por ficheiro, rever diff antes de cada etapa e preservar mudanças não relacionadas. |
| Regressão noutras utilizações de Pangea | Médio | Remover apenas imports da árvore de tasks; manter dependência e outras superfícies intactas. |

## Fora de escopo

- Alterar schema, migrações, API ou o helper transacional já funcional sem evidência de falha.
- Migrar cards, labels, custom fields ou outras superfícies para dnd-kit.
- Adicionar Motion, AutoAnimate, GSAP ou uma segunda biblioteca de animação.
- Importar o tema de explorador de ficheiros do pacote.
- Alterar automaticamente a hierarquia Gantt a partir da hierarquia de tasks.
- Build de produção, deploy ou alterações em produção.
