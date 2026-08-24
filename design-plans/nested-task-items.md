# Itens aninhados em listas de tarefas

Written against: working tree de 2026-08-24, que já contém alterações locais não relacionadas. A execução deve preservá-las.

## Objetivo

Permitir decompor uma tarefa de uma lista do cartão em subitens, mantendo a lista rápida de ler e editar. A primeira versão terá **um nível de subitens**: uma tarefa principal pode ter subitens, mas um subitem não pode ter filhos.

Esta fronteira resolve o caso de uso imediato, protege ordenação, drag-and-drop e duplicação do cartão, e deixa aberta uma extensão futura sem prometer já uma árvore ilimitada.

## Referências de UX

| Referência                                                                                                                         | O que aproveitamos                                                                                                                               | O que não copiamos                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [Linear — Parent and sub-issues](https://linear.app/docs/parent-and-sub-issues)                                                    | Secção curta e colapsável, título de grupo com progresso e linhas de subitem densas. A hierarquia é visível sem competir com a tarefa principal. | Metadados de issue, labels e painel de atividade: não pertencem a uma checklist de cartão.    |
| [ClickUp — Work with subtasks from tasks](https://help.clickup.com/hc/en-us/articles/29665922829335-Work-with-subtasks-from-tasks) | Progresso `concluídas/total`, criação no próprio contexto do pai e acção “Add subtask” fácil de descobrir.                                       | Tabela de múltiplas colunas, prioridades e datas: acrescentariam ruído ao UI atual.           |
| [Asana — Subtasks](https://help.asana.com/s/article/subtasks)                                                                      | Subitens são tarefas reais mas encaixadas no contexto do pai; o fluxo de detalhe conserva o contexto hierárquico.                                | Transformar cada subitem num cartão/modal completo; aqui a edição permanece inline como hoje. |

### Direção escolhida

Usar o padrão **Linear para leitura** e **ClickUp para criação**:

- a tarefa principal mantém a linha, checkbox, responsável e menu atuais;
- quando tem subitens, apresenta um indicador discreto `2/3` e uma seta para expandir/recolher;
- os subitens aparecem diretamente abaixo, com indentação de 24 px e uma guia vertical subtil; conservam checkbox, edição inline, responsável e menu;
- “Adicionar subitem” fica no menu da tarefa e no fim do grupo expandido;
- o resumo na frente do cartão mantém a mesma hierarquia, mais compacto e sem ações de edição;
- não criar cards dentro de cards, tabelas, painéis laterais nem uma linguagem visual nova.

O foco é a leitura da tarefa principal; as linhas-filhas são deliberadamente mais silenciosas. Devem ser reutilizados `Button`, `Popup`, `Menu`, `Checkbox`, `Linkify`, as variáveis `--card-modal-*` e os módulos SCSS já usados em `client/src/components/task-lists/TaskList/`.

## Decisões de domínio

| Tema           | Decisão                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estrutura      | `Task.parentTaskId` nullable, apontando para outra `Task` da mesma `TaskList`. Todas as tarefas existentes ficam na raiz.                                                                                                                                                                                                             |
| Profundidade   | Máximo de um nível; o servidor rejeita pai que já seja subitem, referências a si próprio e ciclos.                                                                                                                                                                                                                                    |
| Ordenação      | `position` é interpretada apenas entre irmãos, identificados por `taskListId + parentTaskId`.                                                                                                                                                                                                                                         |
| Conclusão      | Um pai com filhos é um estado agregado e só fica concluído quando todos os seus filhos ficam concluídos. Reabrir qualquer filho reabre imediatamente o pai. O checkbox do pai é apenas um indicador enquanto existirem filhos; marcar/desmarcar pertence aos filhos. Uma tarefa sem filhos conserva exatamente o comportamento atual. |
| Eliminação     | Apagar um pai promove os seus filhos à raiz, preservando-os. A confirmação deve explicar isto. Apagar um filho apaga apenas esse filho.                                                                                                                                                                                               |
| Permissões     | As permissões atuais de editor/arquivo/lixo aplicam-se igualmente a pai e filho. A validação vive no servidor.                                                                                                                                                                                                                        |
| Gantt          | Pai e filho mantêm-se fontes independentes que podem ser importadas para o Gantt. A relação de checklist não cria nem altera uma hierarquia no Gantt.                                                                                                                                                                                 |
| Dados externos | Sockets e webhooks passam a transportar `parentTaskId`; o contrato existente continua compatível para consumidores que o ignorem.                                                                                                                                                                                                     |

## Plano de implementação

### Fase 1 — base segura no servidor

1. Criar migration `server/db/migrations/<timestamp>_add_task_parent.js`.
   - Adicionar `task.parent_task_id` nullable com FK para `task.id`, `ON DELETE SET NULL` e índice composto para `task_list_id`, `parent_task_id` e `position`.
   - Não migrar dados: todas as tarefas atuais são raízes.

2. Declarar `parentTaskId` em `server/api/models/Task.js` e criar query methods que devolvam tarefas por lista e por pai, ordenadas por posição.

3. Estender `tasks/create`, `tasks/update` e os respetivos helpers.
   - Validar que o pai existe, pertence à mesma lista e é uma raiz.
   - Centralizar reposicionamento entre irmãos; mover entre raiz e subitens é uma única atualização de `parentTaskId` e `position`.
   - Depois de criar, concluir ou reabrir um filho, recalcular e persistir o estado do pai na mesma operação; uma ação de criança gera no máximo uma atualização coerente para o pai. Promover os filhos antes de apagar o pai.

**Aceitação:** tentativas de criar ciclos, três níveis ou relações entre listas falham; mover/reordenar nunca afeta irmãos de outro pai.

### Fase 2 — integridade dos fluxos já existentes

4. Propagar `parentTaskId` em modelos Redux ORM, APIs, actions, sagas, seletores e eventos socket.

5. Adaptar duplicação de cartões em `server/api/helpers/cards/duplicate-one.js`.
   - Gerar antecipadamente IDs para as novas tarefas e reconstruir `parentTaskId` com o mapa origem → cópia.
   - Este passo é obrigatório: hoje a duplicação cria tarefas novas sem ter de preservar relações entre elas.

6. Rever remoções de lista e cartão, webhooks e integração Gantt para que filhos não fiquem órfãos no estado cliente e relações Gantt existentes continuem intactas.

**Aceitação:** duplicar um cartão preserva a árvore apenas dentro da cópia; apagar pai promove filhos; dois utilizadores veem a mesma estrutura em tempo real.

### Fase 3 — UI do modal e do cartão

7. Criar seletores de projeção: raízes ordenadas, filhos de cada pai, totais de folhas e estado derivado do pai.

8. Adaptar `TaskList.jsx` e `Task.jsx` para renderização hierárquica.
   - Expandir/recolher por pai, com estado local e acessível (`aria-expanded`, grupo nomeado e foco previsível).
   - Reutilizar o editor inline, popup de ações e atribuição existentes. O checkbox do pai com filhos apresenta o estado derivado e não é interativo; os checkboxes dos filhos mantêm o comportamento atual.
   - Adicionar “Adicionar subitem”, “Promover a tarefa principal” e “Tornar subitem de…” no `ActionsStep` existente.

9. Manter drag-and-drop apenas para reordenar irmãos na primeira versão. As ações de promover/rebaixar fazem mudanças de nível explícitas, o que evita drops ambíguos e a possibilidade de arrastar um pai para dentro do próprio descendente.

10. Adaptar a face do cartão para representar a árvore compacta e atualizar a barra de progresso para contar somente folhas.

**Aceitação:** uma lista com pais e filhos é legível em desktop e mobile; teclado, foco, checkbox e edição inline continuam funcionais; a frente do cartão não fica visualmente densa.

### Fase 4 — qualidade e validação

11. Adicionar testes focados no servidor para validação da árvore, ordenação, conclusão em cascata, promoção ao apagar e duplicação de cartões.

12. Adicionar testes cliente para seletores de árvore/progresso e testes de componente para expandir, criar, promover e concluir subitens.

13. Validar em `http://localhost:3008` pelos serviços de desenvolvimento/hot reload:

- lista nova e lista existente;
- criação, edição, conclusão e eliminação de pai/filho, incluindo conclusão automática do pai ao fechar o último filho e reabertura do pai ao reabrir um filho;
- mover e reordenar irmãos;
- cartão duplicado;
- permissões de editor, lista arquivada/lixo, duas sessões e Gantt;
- largura desktop e mobile, navegação por teclado e leitor de ecrã básico.

Não executar build local: este projeto deve ser validado pelo ambiente de desenvolvimento, salvo pedido explícito de build/release.

## Ficheiros prováveis

- `server/db/migrations/<timestamp>_add_task_parent.js`
- `server/api/models/Task.js`
- `server/api/controllers/tasks/{create,update,delete}.js`
- `server/api/helpers/tasks/{create-one,update-one,delete-one}.js`
- `server/api/hooks/query-methods/models/Task.js`
- `server/api/helpers/cards/duplicate-one.js`
- `client/src/models/Task.js`
- `client/src/selectors/{tasks,task-lists,positioning}.js`
- `client/src/sagas/core/services/tasks.js`
- `client/src/components/task-lists/TaskList/{TaskList,AddTask}.jsx`
- `client/src/components/task-lists/TaskList/Task/{Task,ActionsStep}.jsx`
- `client/src/components/cards/Card/TaskList/{TaskList,Task}.jsx`
- módulos SCSS desses componentes e traduções `en-US`, `pt-PT`, `fr-FR`.

## Fora de escopo desta versão

- profundidade ilimitada;
- drag-and-drop livre entre níveis;
- datas, prioridades ou comentários próprios em subitens;
- sincronizar a árvore de checklist com a hierarquia do Gantt;
- apagar recursivamente subitens sem confirmação;
- automatizações baseadas em pais/subitens.

## Decisão confirmada

Os filhos são as unidades de tracking. Um pai com filhos é concluído automaticamente apenas quando todos os filhos estiverem concluídos e reabre quando qualquer filho for reaberto. Não há conclusão manual do pai enquanto existirem filhos.
