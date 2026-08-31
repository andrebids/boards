# Plano de implementação: rotação Gantt / Decors list no Dashboard TV

## Objetivo

Fazer o painel Gantt existente no Dashboard TV alternar automaticamente entre a timeline e a task list **Decors list** do cartão `1848563196261042005`. Cada vista permanece visível durante o mesmo número configurável de segundos. A lista deve adaptar-se ao tamanho real do widget e refletir, sem refresh manual, criações, edições, conclusões, reordenações, movimentos e eliminações feitas no Planka.

Referência de produção: `https://boards.dsproject.pt/cards/1848563196261042005`.

## Decisões de arquitetura

- Manter um único widget `gantt` e a mesma geometria GridStack. A rotação acontece dentro do conteúdo do widget, evitando um segundo widget, alterações periódicas ao layout ou persistência do estado visual corrente.
- Estender a configuração opcional do Gantt com `cardId`, `taskListId` e `rotationSeconds`. Widgets Gantt antigos, sem estes campos, continuam a mostrar apenas a timeline.
- Guardar o ID estável da task list, não o nome `Decors list`, para que uma renomeação não quebre a ligação. O nome apresentado vem sempre dos dados atuais do Planka.
- Reutilizar `GET /api/cards/:id` para obter a lista e tarefas iniciais. Quando o pedido for socket, o endpoint passa a associar a ligação à sala `board:<boardId>`, após a autorização existente, para receber os eventos já emitidos pelo Planka.
- Manter os dados deste painel localmente no componente. Não injetar o cartão inteiro no Redux global do dashboard; reconciliar apenas `taskListUpdate`, `taskListDelete`, `taskCreate`, `taskUpdate` e `taskDelete` relativos à lista configurada.
- Após uma reconexão socket, voltar a pedir o cartão uma vez para recuperar eventos que possam ter ocorrido durante a interrupção. Não adicionar polling.
- Reutilizar `buildTaskRows` para preservar ordem e hierarquia. A lista é apenas de leitura no Dashboard TV; a edição continua a ser feita no Planka.
- Usar CSS flexível e container queries do próprio widget para tipografia, espaçamento, indentação, ellipsis e scroll interno. Não usar breakpoints baseados na largura da janela.
- Usar um temporizador local simples que alterna a vista a cada `rotationSeconds`; alterar a configuração reinicia o ciclo no Gantt. O intervalo será validado e limitado, por exemplo, entre 5 e 300 segundos.
- Não são necessárias migrações, tabelas, dependências novas ou uma API de task lists exclusiva do dashboard.

## Fluxo de dados

```text
configuração persistida do widget
  (projectId, zoomLevel, cardId, taskListId, rotationSeconds)
                         |
                         v
                GET /api/cards/:id
             + entrada na sala do board
                         |
                         v
          snapshot de Decors list e tarefas
                         |
            +------------+-------------+
            |                          |
            v                          v
   painel responsivo            eventos socket Planka
                                reconciliam a lista

Gantt <--- rotationSeconds ---> Decors list
```

## Fase 1 — Contrato persistido e subscrição em tempo real

### Tarefa 1: Estender a configuração opcional do widget Gantt

**Descrição:** Aceitar e normalizar no cliente e servidor os três campos de rotação. A configuração só ativa a rotação quando os campos estiverem completos e válidos; o contrato atual de `projectId` e `zoomLevel` permanece compatível.

**Critérios de aceitação:**

- [ ] Um Gantt antigo sem rotação continua válido e inalterado.
- [ ] `cardId` e `taskListId` são IDs não vazios, e `rotationSeconds` é um inteiro dentro do limite definido.
- [ ] Configurações incompletas ou inseguras são rejeitadas igualmente no cliente e servidor.

**Verificação:**

- [ ] Ampliar `dashboardLayout.test.js` para cobrir compatibilidade, round-trip e valores inválidos.
- [ ] Ampliar o teste focado de `server/utils/dashboard-layout.js` com o mesmo contrato.

**Dependências:** Nenhuma.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/dashboardLayout.js`
- `client/src/components/project-dashboard/dashboardLayout.test.js`
- `server/utils/dashboard-layout.js`
- teste focado existente ou novo em `server/test/utils/`

**Dimensão estimada:** Média (3–4 ficheiros).

### Tarefa 2: Garantir snapshot autorizado e eventos do quadro

**Descrição:** Fazer `GET /api/cards/:id`, quando chamado por socket e depois da autorização atual, associar a ligação à sala do quadro do cartão. Assim, o dashboard reutiliza o payload existente e passa a receber os eventos de task lists e tarefas já produzidos pelo Planka.

**Critérios de aceitação:**

- [ ] Um pedido autorizado por socket recebe o snapshot atual e entra em `board:<boardId>`.
- [ ] Um pedido HTTP normal mantém o comportamento atual e não tenta entrar numa sala socket.
- [ ] As regras atuais de acesso ao cartão não são relaxadas.

**Verificação:**

- [ ] Teste de integração confirma entrada na sala apenas depois de uma leitura autorizada.
- [ ] Teste existente de acesso negado continua a devolver o mesmo resultado.

**Dependências:** Nenhuma.

**Ficheiros prováveis:**

- `server/api/controllers/cards/show.js`
- teste focado em `server/test/integration/`

**Dimensão estimada:** Pequena (2 ficheiros).

### Checkpoint 1: contrato e canal de atualização

- [ ] Testes focados do layout cliente/servidor passam.
- [ ] O cartão `1848563196261042005` pode ser carregado por uma sessão autorizada.
- [ ] A task list selecionada é identificada pelo ID correspondente a `Decors list`.
- [ ] Nenhuma migração ou dependência nova foi introduzida.

## Fase 2 — Lista viva e rotação

### Tarefa 3: Criar o modelo local da Decors list

**Descrição:** Criar um hook/helper pequeno que carrega o cartão, seleciona `taskListId`, ordena as tarefas com `buildTaskRows` e reconcilia eventos socket. Em `reconnect`, recarrega o snapshot para eliminar qualquer divergência.

**Critérios de aceitação:**

- [ ] O snapshot inicial apresenta nome, progresso e tarefas na ordem/hierarquia do Planka.
- [ ] Criar, editar, concluir, reordenar, mover para dentro/fora e apagar uma tarefa atualiza o painel sem refresh.
- [ ] Renomear ou apagar a task list atualiza o título ou apresenta um estado indisponível; uma reconexão recupera o estado atual.

**Verificação:**

- [ ] Teste unitário do reconciliador cobre os cinco tipos de eventos relevantes e tarefas movidas entre listas.
- [ ] Teste com socket simulado confirma uma única recarga por reconexão e remoção dos listeners no unmount.

**Dependências:** Tarefas 1 e 2.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/widgets/useDashboardTaskList.js` (novo)
- `client/src/components/project-dashboard/widgets/useDashboardTaskList.test.js` (novo)
- `client/src/components/task-lists/TaskList/task-tree.js` (reutilizado, sem alteração prevista)

**Dimensão estimada:** Pequena (2 ficheiros alterados/novos).

### Tarefa 4: Alternar o Gantt e a lista no mesmo painel

**Descrição:** Integrar a vista de task list no `DashboardGanttWidget`. Quando existir configuração de rotação válida, mostrar primeiro o Gantt e alternar as duas vistas a cada duração configurada. Estados de loading/erro da lista não interrompem o Gantt nem o temporizador.

**Critérios de aceitação:**

- [ ] Gantt e Decors list ficam visíveis exatamente durante a mesma duração configurada.
- [ ] Só uma vista está exposta visualmente e à árvore de acessibilidade de cada vez.
- [ ] Alterar a duração ou a lista reinicia o ciclo no Gantt; desmontar o widget limpa o temporizador.

**Verificação:**

- [ ] Teste com fake timers confirma a sequência Gantt → lista → Gantt e a limpeza do timer.
- [ ] O teste confirma que um Gantt sem configuração continua permanente.

**Dependências:** Tarefa 3.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/widgets/DashboardGanttWidget.jsx`
- `client/src/components/project-dashboard/widgets/DashboardTaskListPanel.jsx` (novo)
- teste focado junto dos widgets do dashboard

**Dimensão estimada:** Média (3 ficheiros).

### Checkpoint 2: fluxo funcional

- [ ] A rotação mantém uma cadência igual por várias voltas.
- [ ] Uma alteração feita noutra sessão Planka aparece na volta atual ou seguinte sem recarregar a página.
- [ ] Uma queda e reconexão socket recupera as alterações perdidas.

## Fase 3 — Configuração e responsividade

### Tarefa 5: Configurar a origem e a duração no editor do dashboard

**Descrição:** Ampliar o configurador do Gantt para aceitar o URL/ID do cartão, carregar as task lists disponíveis, selecionar `Decors list` e definir os segundos de cada vista. Persistir os IDs e a duração através do `PATCH /api/dashboard` existente.

**Critérios de aceitação:**

- [ ] O editor aceita o URL fornecido ou apenas o ID do cartão e lista as task lists acessíveis.
- [ ] Só permite gravar depois de selecionar uma task list e uma duração válida.
- [ ] A configuração é preservada em reload e propagada aos outros dashboards pelo evento `dashboardUpdate` existente.

**Verificação:**

- [ ] Teste focado cobre extração do ID, validação da duração e payload persistido.
- [ ] Verificação manual confirma que `Decors list` fica selecionada no cartão de produção após autenticação.

**Dependências:** Tarefa 1.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/DashboardWorkspace.jsx`
- `client/src/components/project-dashboard/DashboardWorkspace.module.scss`
- teste focado existente ou novo do dashboard

**Dimensão estimada:** Média (2–3 ficheiros).

### Tarefa 6: Tornar a task list responsiva no espaço do widget

**Descrição:** Estilizar o cabeçalho, progresso e linhas da lista para o contentor do widget. Preservar hierarquia, estados concluídos, nomes longos e scroll interno, sem alterar a altura do GridStack nem provocar overflow no dashboard.

**Critérios de aceitação:**

- [ ] O conteúdo não intersecta o cabeçalho, ticker ou widgets vizinhos.
- [ ] Nomes longos, subtarefas, lista vazia e muitas tarefas continuam legíveis e navegáveis.
- [ ] A adaptação depende da largura do widget, não do viewport.

**Verificação:**

- [ ] Validar por hot reload em contentores aproximados de 320×470, 605×470 e 950×550.
- [ ] Validar a composição real em `/dashboard?tv=1` e a edição em `/dashboard`.
- [ ] Executar testes focados e `git diff --check`; não executar build local.

**Dependências:** Tarefas 4 e 5.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/widgets/DashboardTaskListPanel.module.scss` (novo)
- `client/src/components/project-dashboard/widgets/DashboardGanttWidget.module.scss`
- teste visual/estrutural focado do dashboard, se necessário

**Dimensão estimada:** Pequena–média (2–3 ficheiros).

### Checkpoint final

- [ ] Todas as tarefas e testes focados passam.
- [ ] O Gantt atual conserva zoom, centragem e atualização atuais.
- [ ] A Decors list acompanha alterações de duas sessões sem polling ou refresh manual.
- [ ] A rotação e a legibilidade foram verificadas num viewport comparável à TV real.
- [ ] A configuração local foi validada por hot reload em `http://localhost:3008`; nenhum build foi executado.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| O ID de `Decors list` ainda não é conhecido no checkout local | Médio | Resolver pelo editor através do cartão autenticado e persistir o ID; nunca depender do nome em runtime. |
| Eventos perdidos durante uma desconexão | Alto | Recarregar o snapshot uma vez no evento `reconnect`. |
| Um evento de tarefa movida deixar uma linha fantasma | Alto | O reconciliador remove tarefas existentes que passem para outro `taskListId` e adiciona as que entrem na lista. |
| Timer duplicado após HMR ou remount | Médio | Um único efeito controla e limpa o temporizador; cobrir com fake timers. |
| Lista extensa não caber durante o período visível | Médio | Scroll interno e densidade por container query; não alterar automaticamente a duração nem criar paginação antes de haver necessidade confirmada. |
| Alteração global de `cards/show` criar subscrições inesperadas | Baixo | Entrar na sala apenas em pedidos socket autorizados; este comportamento já é o contrato de `boards/show`. |
| Diferença entre desenvolvimento e dados de produção | Médio | Configurar a lista numa sessão autenticada e tratar deployment/alteração da configuração de produção como etapa separada e explicitamente autorizada. |

## Fora de âmbito

- Editar tarefas diretamente no Dashboard TV.
- Criar polling, cache de servidor ou uma nova tabela para o painel.
- Fazer build, deploy ou alterar dados/configuração de produção durante a implementação sem autorização separada.
- Rotacionar todos os widgets do dashboard; a mudança fica limitada ao widget Gantt configurado.

## Decisão assumida

Como “x segundos” não define um valor fixo, o plano torna a duração configurável no editor e propõe 30 segundos como valor inicial. O mesmo valor é usado nas duas vistas.
