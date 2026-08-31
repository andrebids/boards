# Plano de implementação: drag livre de tarefas e subtarefas

## Objetivo

Permitir arrastar qualquer tarefa ou subtarefa para outra posição, outro nível da hierarquia ou outra lista de tarefas, preservando toda a sua subárvore. O resultado deve ser previsível, persistente, sincronizado entre clientes e visualmente claro durante o drag.

## Referências de interação

- [Atlassian Pragmatic Drag and Drop — design guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines): árvores expõem três intenções — antes, depois e combinar — com linha de inserção, contorno no alvo e expansão automática de pais fechados.
- [hello-pangea/dnd — combining](https://github.com/hello-pangea/dnd/blob/main/docs/guides/combining.md): a biblioteca já instalada suporta `isCombineEnabled`; não é necessário substituir a dependência.
- [hello-pangea/dnd — limitações de listas aninhadas](https://github.com/hello-pangea/dnd): listas `Droppable` realmente aninhadas não permitem o movimento pai → filho pretendido. A implementação continuará a usar uma lista visível plana e traduzirá cada drop para relações `parentTaskId`.

## Contrato funcional

Durante o drag existem três resultados:

1. **Linha antes do alvo:** inserir antes do alvo e herdar o seu `parentTaskId`.
2. **Linha depois do alvo:** inserir depois do alvo e herdar o seu `parentTaskId`.
3. **Contorno sobre o alvo:** tornar a tarefa filha do alvo e colocá-la no fim dos filhos diretos.

Regras complementares:

- Qualquer profundidade pode ser arrastada; remove-se a restrição atual `depth > 0`.
- Ao mover uma tarefa, todos os descendentes seguem com ela e mantêm a hierarquia relativa.
- Um drop nunca pode colocar uma tarefa dentro de si própria ou de um descendente.
- Um drop no espaço vazio de outra lista cria uma tarefa de raiz no fim dessa lista.
- Ao atravessar listas, toda a subárvore recebe o novo `taskListId` numa única transação.
- O item movido fica visível após o drop; um alvo fechado expande após 500 ms de hover em modo “tornar filha”, ou imediatamente no drop.
- O clone de drag conserva as variáveis de tema do modal, incluindo cor do texto e checkbox.

## Decisões técnicas

- Manter `@hello-pangea/dnd@18.0.1` e um único `Droppable` de tarefas por lista.
- Tratar a árvore como projeção: `buildTaskRows()` continua a produzir linhas visíveis em profundidade; uma função pura converte `source`, `destination` ou `combine` em `{ taskListId, parentTaskId, siblingIndex }`.
- Excluir a subárvore arrastada antes de calcular índices e alvos. Isso evita destinos falsos criados pelos próprios descendentes.
- Calcular `position` apenas entre irmãos com o mesmo `parentTaskId`, reutilizando `selectNextTaskPosition`.
- Manter `PATCH /tasks/:id` compatível, aceitando em conjunto `taskListId`, `parentTaskId` e `position`. A resposta pode acrescentar `included.tasks` com descendentes alterados sem quebrar consumidores de `item`.
- Isolar a mutação estrutural num helper transacional próprio. Edição de nome, conteúdo, conclusão e atribuição continua no fluxo atual de `update-one`.
- Emitir sockets apenas após commit. O cliente de origem reconcilia a resposta; os restantes recebem `taskUpdate` para a raiz, descendentes cujo `taskListId` mudou e irmãos reposicionados.
- Não introduzir nova biblioteca, migração ou modelo persistente.

## Fase 1 — modelo de drop no cliente

### Tarefa 1: criar o resolvedor puro de destinos

**Descrição:** Expandir as utilidades da árvore para obter descendentes, remover a subárvore arrastada das linhas candidatas e traduzir o resultado do DnD numa intenção estrutural determinística.

**Critérios de aceitação:**

- [ ] Um `combine` válido devolve o alvo como `parentTaskId` e o índice final dos seus filhos diretos.
- [ ] Um reorder para cima insere antes do alvo; para baixo insere depois do alvo, sempre no grupo de irmãos do alvo.
- [ ] Um destino vazio devolve `parentTaskId: null` e índice `0`.
- [ ] Drops sobre a própria subárvore são rejeitados antes do pedido HTTP.
- [ ] Linhas ocultas por colapso não corrompem os índices dos irmãos.

**Verificação:** testes Jest cobrindo raiz → filho, filho → raiz, troca entre pais, árvore colapsada, lista vazia, movimento entre listas e tentativa de ciclo.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/task-tree.js`
- `client/src/components/task-lists/TaskList/task-tree.test.js`
- `client/src/components/cards/CardModal/TaskLists/TaskLists.jsx`
- `client/src/components/cards/CardModal/TaskLists/Item.jsx`
- `client/src/components/task-lists/TaskList/TaskList.jsx`

**Escopo:** médio.

### Tarefa 2: ativar drag e feedback das três intenções

**Descrição:** Permitir drag em qualquer profundidade, ativar combining nos droppables e apresentar feedback distinto para reorder e reparenting.

**Critérios de aceitação:**

- [ ] Subtarefas e tarefas com filhos iniciam drag pelo mesmo handle atual.
- [ ] A linha de inserção acompanha o nível que a tarefa terá após o drop.
- [ ] O alvo de “tornar filha” recebe contorno/realce inequívoco.
- [ ] Um pai fechado expande após 500 ms de hover de combine, sem alternâncias repetidas.
- [ ] O clone mantém texto, checkbox, indentação e largura legíveis nos temas claro e escuro.

**Verificação:** teste de componentes para os estados de drag e inspeção no browser em `http://localhost:3008` por hot reload.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/Task/Task.jsx`
- `client/src/components/task-lists/TaskList/Task/Task.module.scss`
- `client/src/components/task-lists/TaskList/TaskList.jsx`
- `client/src/components/task-lists/TaskList/TaskList.module.scss`
- `client/src/components/cards/CardModal/TaskLists/TaskLists.jsx`

**Escopo:** médio.

### Checkpoint 1

- [ ] Todas as combinações de drop produzem o comando esperado sem persistência.
- [ ] Cancelar o drag não altera a árvore nem deixa estilos/temporizadores ativos.
- [ ] Drag por rato, touch e teclado continua disponível pela biblioteca.

## Fase 2 — persistência atómica da subárvore

### Tarefa 3: implementar movimento estrutural transacional no servidor

**Descrição:** Criar um helper de movimento que valide o destino dentro do mesmo cartão, carregue a subárvore, reposicione os irmãos afetados e atualize a raiz e os descendentes numa única transação.

**Critérios de aceitação:**

- [ ] O servidor rejeita pai inexistente, pai de outra lista/cartão e qualquer ciclo, mesmo que o cliente seja contornado.
- [ ] Mover dentro da mesma lista altera apenas `parentTaskId`, `position` e reordenações necessárias.
- [ ] Mover entre listas atualiza `taskListId` da raiz e de todos os descendentes.
- [ ] Uma falha intermédia não deixa tarefas, filhos ou posições parcialmente movidos.
- [ ] A resposta mantém `item` e inclui todas as tarefas da subárvore alteradas.

**Verificação:** testes de integração para reorder, reparent, unparent, subárvore entre listas, ciclo, concorrência/rollback e permissões.

**Dependências:** contrato da tarefa 1.

**Ficheiros prováveis:**

- `server/api/controllers/tasks/update.js`
- `server/api/helpers/tasks/move-tree.js` (novo)
- `server/api/hooks/query-methods/models/Task.js`
- `server/utils/task-hierarchy.js`
- `server/test/integration/task-tree-move.test.js` (novo)

**Escopo:** médio-alto.

### Tarefa 4: reconciliar movimento otimista e falhas no cliente

**Descrição:** Alterar o serviço `moveTask` para enviar o destino completo, aplicar a mudança à raiz e aos descendentes em memória e restaurar o snapshot anterior se o pedido falhar.

**Critérios de aceitação:**

- [ ] A UI reflete imediatamente `taskListId`, `parentTaskId` e `position` da raiz.
- [ ] Descendentes atravessam para a nova lista no mesmo frame otimista.
- [ ] A resposta `included.tasks` é aplicada de forma idempotente.
- [ ] Em erro, raiz, descendentes e ordem regressam ao snapshot anterior e a mensagem de erro existente é preservada.
- [ ] O cálculo de posição usa apenas irmãos do pai de destino.

**Verificação:** testes da saga/serviço para sucesso, falha, combine e mudança de lista; lint focado do cliente.

**Dependências:** tarefas 1 e 3.

**Ficheiros prováveis:**

- `client/src/entry-actions/tasks.js`
- `client/src/sagas/core/services/tasks.js`
- `client/src/selectors/positioning.js`
- `client/src/actions/tasks.js`
- `client/src/models/Task.js`

**Escopo:** médio.

### Tarefa 5: fechar sockets, progresso e consistência derivada

**Descrição:** Publicar as alterações estruturais depois do commit e sincronizar a conclusão dos pais antigo e novo sem criar estados intermédios observáveis.

**Critérios de aceitação:**

- [ ] Uma segunda sessão recebe a mesma árvore e ordem sem reload.
- [ ] Eventos nunca anunciam uma transação que depois falha.
- [ ] Os pais de origem e destino recalculam conclusão após o movimento.
- [ ] O progresso da lista, baseado em folhas, reflete imediatamente a nova composição.
- [ ] Ligações Gantt existentes permanecem associadas às mesmas tarefas e não ganham hierarquia implícita.

**Verificação:** teste de integração dos payloads e teste utilitário de conclusão dos dois pais; smoke test com duas sessões.

**Dependências:** tarefa 3.

**Ficheiros prováveis:**

- `server/api/helpers/tasks/move-tree.js`
- `server/api/helpers/tasks/sync-parent-completion.js`
- `server/test/integration/task-tree-move.test.js`
- `server/test/utils/task-parent-completion.test.js`
- `client/src/models/Task.js`

**Escopo:** médio.

### Checkpoint 2

- [ ] Recarregar o cartão preserva exatamente hierarquia, lista e ordem.
- [ ] Duas sessões convergem após movimentos sucessivos.
- [ ] Uma falha forçada prova rollback no servidor e no estado otimista.

## Fase 3 — acesso alternativo e regressão

### Tarefa 6: disponibilizar “Mover tarefa” sem drag

**Descrição:** Adicionar à ação existente da tarefa uma opção acessível que permita escolher lista, pai e posição, consumindo o mesmo comando do drag.

**Critérios de aceitação:**

- [ ] É possível executar por teclado todos os destinos válidos do drag.
- [ ] A tarefa atual e os seus descendentes não aparecem como pais possíveis.
- [ ] O formulário anuncia erros e mantém foco coerente ao fechar.
- [ ] Não existe uma segunda implementação das regras de movimento.

**Verificação:** testes de componente e percurso manual apenas com teclado.

**Dependências:** tarefas 1 e 4.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/Task/ActionsPopup.jsx`
- `client/src/components/task-lists/TaskList/Task/MoveStep.jsx` (novo)
- `client/src/components/task-lists/TaskList/Task/MoveStep.module.scss` (novo)
- `client/src/locales/en/core.js`
- `client/src/locales/pt/core.js`

**Escopo:** médio.

### Tarefa 7: executar a matriz final de regressão

**Descrição:** Validar a funcionalidade completa no ambiente de desenvolvimento existente, sem build, incluindo árvores profundas, listas colapsadas, scroll e duas sessões.

**Critérios de aceitação:**

- [ ] Passam os testes Jest de `task-tree` e os novos testes de saga/componentes.
- [ ] Passam os testes Mocha focados de hierarquia, movimento e conclusão.
- [ ] O lint dos ficheiros tocados não apresenta erros.
- [ ] Drag funciona com árvore profunda, pai expandido/fechado, lista vazia e scroll no modal.
- [ ] Tema claro/escuro, zoom do browser e largura estreita não tornam o clone ou indicadores invisíveis.

**Verificação:** hot reload em `http://localhost:3008`; não executar `npm run build` salvo pedido explícito.

**Dependências:** tarefas 2 a 6.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/task-tree.test.js`
- `client/src/sagas/core/services/tasks.test.js` (novo ou teste equivalente existente)
- `server/test/integration/task-tree-move.test.js`
- `client/tests/acceptance/features/task-tree-drag.feature` (novo, se o harness suportar DnD)

**Escopo:** médio.

### Checkpoint final

- [ ] Todas as tarefas e subtarefas podem ser movidas para qualquer posição válida.
- [ ] Não é possível criar ciclos ou separar uma subárvore.
- [ ] Persistência, rollback e sockets foram demonstrados.
- [ ] O comportamento anterior de criar, editar, concluir, colapsar e apagar tarefas não regrediu.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Índice visual plano não coincidir com índice entre irmãos | Alto | Centralizar a tradução numa função pura e cobrir movimentos para cima/baixo e árvores colapsadas. |
| Descendentes ficarem na lista antiga | Alto | Atualizar a subárvore inteira na mesma transação e testar rollback. |
| Ciclo criado por cliente desatualizado ou pedido manual | Alto | Validar novamente no servidor dentro da operação de movimento. |
| Eventos socket observarem escrita parcial | Alto | Acumular alterações e emitir apenas depois do commit. |
| Auto-expansão disparar várias vezes | Médio | Temporizador único por alvo e operação explícita `expand`, nunca `toggle`. |
| `combine` não distinguir alvos inválidos visualmente | Médio | Rejeitar no resolvedor, não enviar pedido e aplicar estado visual desativado. |
| Mudança ampla demais no primeiro incremento | Médio | Entregar na ordem: resolvedor → feedback → transação → otimista/sockets → alternativa acessível. |

## Fora de escopo

- Migrar para Atlassian Pragmatic Drag and Drop ou outra biblioteca.
- Alterar o esquema da base de dados.
- Impor limite novo de profundidade; a hierarquia continua ilimitada, protegida contra ciclos.
- Fazer a hierarquia das tarefas alterar automaticamente a hierarquia dos itens Gantt ligados.
- Build de produção ou deploy.

