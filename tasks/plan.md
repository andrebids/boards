# Plano de implementação: refactor da arquitetura Gantt

## Objetivo

Organizar a funcionalidade Gantt sem alterar o comportamento visível: tornar a gravação de itens e dependências atómica, concentrar regras de domínio reutilizáveis, separar o estado sincronizado da UI e reduzir o tamanho dos componentes de edição e timeline.

## Decisões de arquitetura

- A gravação de um item de tarefa e das suas predecessoras passa a ser um único comando no servidor, transacional e com uma resposta/evento coerente.
- Controladores HTTP ficam finos; autorização e mutações de Gantt vivem em serviços/helpers de domínio.
- O cliente mantém um reducer puro para o snapshot e eventos socket; os componentes obtêm projeções através de seletores puros.
- A integração com `@svar-ui/react-gantt` fica atrás de um adaptador pequeno; mapeamento de dados, colunas e ciclo de vida são módulos independentes.
- Não será criada migração: o formato persistido e as rotas existentes permanecem compatíveis. A rota de gravação composta substitui o fluxo de dois pedidos internamente.

## Fase 1 — consistência no servidor

### Tarefa 1: extrair o contexto autorizado de Gantt

**Descrição:** Criar um helper que carregue item/plano/projeto e aplique as regras comuns de plano ativo e permissão de edição; migrar os controladores de item e dependências para ele.

**Critérios de aceitação:**

- [ ] Criar, editar, apagar e alterar dependências aplicam a mesma política de plano ativo e permissões.
- [ ] Os controladores deixam de repetir a cadeia item → plano → projeto → acesso.
- [ ] Os códigos de erro públicos atuais mantêm-se.

**Verificação:** testes unitários de autorização/contexto e `npx mocha test/utils/**/*.test.js` no diretório `server`.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `server/api/helpers/gantt/get-editable-context.js` (novo)
- `server/api/controllers/gantt-items/{create,update,delete}.js`
- `server/api/controllers/gantt-item-dependencies/update.js`

**Escopo:** médio.

### Tarefa 2: criar o comando transacional de gravação de item

**Descrição:** Mover validação de datas, pai, atribuídos e predecessoras para um serviço de escrita que execute tudo numa transação e devolva item apresentado e links atualizados.

**Critérios de aceitação:**

- [ ] Uma falha de validação das predecessoras não cria nem altera parcialmente o item.
- [ ] Criação e edição preservam a validação de versão otimista.
- [ ] Eventos socket só são emitidos após a transação concluir.

**Verificação:** testes de integração para criar/editar com predecessoras, ciclo e conflito; suite server focada.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `server/api/helpers/gantt/save-item.js` (novo)
- `server/api/controllers/gantt-items/{create,update}.js`
- `server/api/controllers/gantt-item-dependencies/update.js`
- `server/test/integration/gantt-item-save.test.js` (novo)

**Escopo:** médio.

### Checkpoint 1

- [ ] Fluxos de criar, editar, apagar e dependências foram verificados por API.
- [ ] Nenhuma escrita parcial é possível quando a validação de links falha.

## Fase 2 — estado e projeções do cliente

### Tarefa 3: introduzir reducer e ações de sincronização Gantt

**Descrição:** Substituir os múltiplos `useState` e atualizações ad hoc do provider por um reducer com ações para load, comandos locais e eventos socket.

**Critérios de aceitação:**

- [ ] O snapshot remoto e os cinco eventos socket atualizam o estado por funções puras testadas.
- [ ] Apagar itens remove links relacionados numa única ação reutilizada.
- [ ] Falhas de comandos fazem reload sem deixar estado local divergente.

**Verificação:** testes unitários do reducer e smoke test em `http://localhost:3008` via hot reload.

**Dependências:** tarefa 2.

**Ficheiros prováveis:**

- `client/src/components/gantt/ganttState.js` (novo)
- `client/src/components/gantt/GanttContext.jsx`
- `client/src/components/gantt/ganttState.test.js` (novo)

**Escopo:** médio.

### Tarefa 4: extrair seletores do domínio Gantt

**Descrição:** Criar seletores para índices, hierarquia, datas agregadas dos resumos, tarefas calendarizadas/não calendarizadas e links visíveis.

**Critérios de aceitação:**

- [ ] `GanttWorkspace` já não contém transformação de domínio de itens/links.
- [ ] A agregação usa um índice de filhos e não pesquisa a coleção repetidamente.
- [ ] Casos sem datas e resumos sem filhos calendarizados mantêm o comportamento atual.

**Verificação:** testes unitários dos seletores e smoke test de hierarquia existente.

**Dependências:** tarefa 3.

**Ficheiros prováveis:**

- `client/src/components/gantt/ganttSelectors.js` (novo)
- `client/src/components/gantt/ganttSelectors.test.js` (novo)
- `client/src/components/gantt/GanttWorkspace.jsx`

**Escopo:** pequeno-médio.

### Checkpoint 2

- [ ] O Gantt atualiza corretamente com dois utilizadores/duas sessões.
- [ ] Abrir um item pelo parâmetro `?item=` e apagar uma tarefa continuam corretos.

## Fase 3 — decomposição dos componentes

### Tarefa 5: separar a lógica e secções do formulário de item

**Descrição:** Extrair o estado, normalização e validação do formulário para `useGanttItemForm`, e separar campos de calendário, dependências e atribuídos em componentes focados.

**Critérios de aceitação:**

- [ ] O painel mantém as regras especiais de itens ligados a tarefas do quadro.
- [ ] Cálculo de duração/dias úteis é testado fora do markup.
- [ ] `GanttItemPanel.jsx` fica apenas como composição do formulário e ações do modal.

**Verificação:** testes do hook, testes existentes de datas e validação manual de criar/editar/remover.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `client/src/components/gantt/useGanttItemForm.js` (novo)
- `client/src/components/gantt/Gantt{Schedule,Dependencies,Assignees}Fields.jsx` (novos)
- `client/src/components/gantt/GanttItemPanel.jsx`

**Escopo:** médio.

### Tarefa 6: reduzir o adaptador da biblioteca de timeline

**Descrição:** Extrair mapeamento de item/link para SVAR, definição das colunas e gestão de eventos/marcador temporal do adaptador.

**Critérios de aceitação:**

- [ ] A conversão inclusiva da data final continua centralizada e coberta por teste.
- [ ] Zoom, seleção, arrasto e marcador “hoje” mantêm o comportamento atual.
- [ ] O adaptador passa apenas dados/configuração e callbacks à biblioteca.

**Verificação:** testes dos mapeadores e smoke test da timeline com os quatro níveis de zoom.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `client/src/components/gantt/ganttTimelineMapper.js` (novo)
- `client/src/components/gantt/ganttTimelineColumns.jsx` (novo)
- `client/src/components/gantt/useSvarGanttEvents.js` (novo)
- `client/src/components/gantt/GanttTimelineAdapter.jsx`

**Escopo:** médio.

### Checkpoint final

- [ ] Suites focadas cliente e servidor passam.
- [ ] Testes de UI Gantt relevantes passam no ambiente com hot reload; não executar build salvo pedido explícito.
- [ ] Revisão de regressões: permissões, conflito de versão, itens ligados, dependências cíclicas, sumários e tarefas sem datas.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Alterar contrato de sockets durante o refactor | Alto | Preservar nomes/payloads inicialmente e testar o reducer com cada evento. |
| Transação sem suporte uniforme do ORM | Alto | Usar o padrão `sails.getDatastore().transaction` já usado nas dependências. |
| Divergência temporária entre o novo comando e clientes antigos | Médio | Manter rotas existentes como adaptadores até todo o cliente consumir o comando composto. |
| Mudanças visuais involuntárias ao dividir componentes | Médio | Validar com smoke tests e browser no ambiente de desenvolvimento. |

## Questão para decisão antes da Tarefa 2

Manter as duas rotas atuais e fazê-las delegar no serviço, ou expor uma rota composta nova para o cliente? Recomendo a rota composta nova e manter as atuais como compatibilidade transitória.
