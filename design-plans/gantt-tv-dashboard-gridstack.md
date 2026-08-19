# Dashboard TV do Gantt com GridStack

## Objetivo

Criar uma página de dashboard independente do Gantt, pensada para um ecrã de TV. A página usa uma grelha vazia e configurável, onde developers autorizados podem adicionar, mover e redimensionar widgets. Os widgets leem o estado existente do Gantt e dos Boards, mas não alteram o comportamento, os dados ou as permissões dessas superfícies.

## Contexto verificado

- O Gantt atual é servido em `GET /projects/:id/gantt`, com a rota cliente `Paths.GANTT`, e é renderizado por `GanttWorkspace` dentro de `ProjectGanttProvider`. O dashboard não fica aninhado nesta rota.
- `ProjectGanttProvider` já carrega o plano, itens, ligações e utilizadores, e recebe atualizações em tempo real por socket. O dashboard pode reutilizar estes dados como fonte de leitura.
- O separador do Gantt vive em `client/src/components/boards/Boards/GanttTab.jsx`. A aplicação já resolve rotas de projeto em `client/src/selectors/router.js`, `client/src/sagas/core/services/router.js` e `client/src/components/common/Static/Static.jsx`.
- O helper existente `server/api/helpers/gantt/get-project-access.js` autoriza membros do projeto e calcula edição do Gantt. Não contém o conceito de developer; este conceito tem de ser decidido e imposto no servidor antes de a rota ser exposta.
- O repositório já usa React 18 e SCSS Modules. GridStack será uma dependência localizada no módulo novo; não será introduzido no Gantt atual, Boards ou componentes base.

## Decisões de arquitetura

1. **Rota própria, não modo dentro do Gantt.** Criar `Paths.PROJECT_DASHBOARD` com `/projects/:id/dashboard`. `Paths.GANTT` mantém-se sem mudança funcional ou visual.
2. **Link próprio e condicional.** Na navegação do projeto, separado do separador Gantt, apresentar o link `Dashboard` apenas a utilizadores com a permissão do dashboard e quando este estiver ativo. O link é uma conveniência; a autorização do servidor é obrigatória e definitiva.
3. **Página isolada.** Criar `client/src/components/gantt-dashboard/`. Nenhum componente do módulo será montado em `GanttWorkspace`, `GanttTimelineAdapter` ou dentro de um Board.
4. **GridStack encapsulado.** Apenas `DashboardGrid.jsx` importa `gridstack` e o respetivo CSS. Os widgets recebem props normalizadas e não acedem diretamente à instância GridStack.
5. **Dados só de leitura.** A primeira versão usa `ProjectGanttProvider` e seletores puros para calcular métricas. Não cria, edita, move ou apaga `GanttItem`, `Task`, `Board` ou `Card`.
6. **Configuração persistida por projeto.** Um layout canónico por projeto permite que a TV mostre a mesma composição para todos. O layout contém apenas tipo do widget, identificador, posição e dimensão. Preferências locais de cada developer ficam explicitamente fora da primeira versão.
7. **Dois modos explícitos.** `/projects/:id/dashboard` é o modo de configuração; `/projects/:id/dashboard?tv=1` é o modo TV, sem ações de drag/resize, menus de edição ou navegação supérflua. Ambos exigem autorização.
8. **Sem copiar Boards.** Widgets podem agregar tarefas ou cartões no futuro, mas usam serviços/selectores de dados existentes e não reutilizam nem alteram a UI Kanban.

## Wireframe

```text
Projeto > [Dashboard]                  (link só para developers autorizados; separado de Gantt)

Modo configuração
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard TV          [Adicionar widget] [Repor layout] [Abrir TV] │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────── Progresso ────────┐ ┌──── Estado das tarefas ──────────┐ │
│ │          68 %             │ │ Por iniciar  Em curso  Em testes│ │
│ └───────────────────────────┘ └──────────────────────────────────┘ │
│ ┌──────── Próximas tarefas ───────────────────────────────────────┐ │
│ │ ...                                                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

Modo TV (`?tv=1`)
┌─────────────────────────────────────────────────────────────────────┐
│ Nome do projeto · atualizado agora                                  │
│ [os mesmos widgets, estáticos, sem controlos de edição]             │
└─────────────────────────────────────────────────────────────────────┘
```

### Barra superior partilhada

O dashboard mantém uma barra superior compacta, com 40–44 px de altura, baseada no `Header` global já usado nos Boards. Não criar um segundo menu de sessão, login ou avatar.

- **Esquerda:** botão `← Voltar aos Boards`, que navega para o último Board do projeto quando existir e, caso contrário, para a página do projeto.
- **Centro:** nome do projeto e a identificação `Dashboard`.
- **Direita:** os controlos de sessão atuais — notificações, nome do utilizador, avatar e popup de utilizador com definições/logout.
- **Modo de configuração:** apresenta a barra completa para preservar navegação e gestão de sessão.
- **Modo TV (`?tv=1`):** conserva a sessão autenticada e o botão de retorno, mas reduz a barra ao mínimo visual necessário; não mostra toolbox, resize handles ou ações de edição.

O `Header` é reutilizado por composição/variante de rota. Não alterar o Header dos Boards para resolver necessidades específicas do dashboard; qualquer estilo adicional fica no módulo `project-dashboard` e só é aplicado na rota do dashboard.

## Contrato de acesso

O produto precisa de definir quem é um **developer**. Não usar `canEdit` do Gantt como substituto: essa permissão inclui gestores de projeto e tem outro significado.

**Decisão:** introduzir uma configuração explícita por projeto, com uma lista de utilizadores developers do dashboard. A configuração começa desativada; um gestor do projeto pode ativá-la/desativá-la e gerir a lista. Esta escolha evita dar acesso global a todos os administradores e evita confundir o papel operacional de gestor com o acesso ao ecrã TV.

O helper servidor devolve, no mínimo:

```js
{
  canViewDashboard: Boolean,
  canManageDashboard: Boolean,
}
```

- `canViewDashboard` protege o carregamento da página e dos dados, e é `false` se o dashboard estiver desativado.
- `canManageDashboard` protege alterações ao layout.
- Na primeira entrega, ambos são `true` apenas para developers autorizados. Se for necessário abrir a TV a utilizadores sem edição, a regra pode divergir numa fase posterior sem alterar a estrutura.
- Uma chamada sem autorização responde `403`; o cliente encaminha para o projeto com uma mensagem de acesso negado. Nunca devolver o layout ou métricas antes desta validação.

## Modelo e API

Criar uma entidade dedicada, por exemplo `GanttDashboard`, associada unicamente a `projectId` e com um único registo por projeto:

```js
{
  projectId: '…',
  layout: [
    { id: 'progress', type: 'gantt-progress', x: 0, y: 0, w: 4, h: 3 },
    { id: 'status', type: 'gantt-status', x: 4, y: 0, w: 8, h: 3 },
  ],
  version: 1,
}
```

- O servidor valida `type`, unicidade de `id`, limites de grelha (12 colunas) e dimensões mínimas/máximas por tipo. Não aceitar conteúdo HTML, URLs arbitrários ou definições de widget enviadas pelo cliente.
- `GET /projects/:projectId/dashboard`: devolve o layout autorizado e os dados mínimos necessários para os widgets iniciais.
- `PATCH /api/projects/:projectId/dashboard`: persiste layout após `dragstop`, `resizestop`, adicionar/remover/repor; requer `canManageDashboard` e controlo de `version` para evitar sobrescrever a configuração de outro developer.
- O cliente pode continuar a usar atualizações socket já existentes para valores de Gantt. Uma atualização de layout é emitida num canal próprio para manter todos os editores sincronizados.

## Widgets iniciais

| Widget | Dados | Dimensão sugerida | Interação TV |
| --- | --- | --- | --- |
| Progresso do plano | itens Gantt por estado | 4 × 3 | só leitura |
| Estado das tarefas | contagem por estado Gantt | 8 × 3 | só leitura |
| Próximas tarefas | itens agendados ordenados por início | 6 × 5 | só leitura |
| Atenção necessária | atrasadas, não agendadas e dependências bloqueadas quando existirem dados | 6 × 5 | só leitura |
| Timeline compacta | itens Gantt agendados | 12 × 6 | só leitura |

Cada widget declara o seu `minW`, `minH`, `maxW` e `maxH`. A biblioteca não conhece regras de negócio; a grelha recebe essas restrições por widget.

## Plano de implementação

### Fase 1 — Contrato e rota protegida

#### Tarefa 1: Definir e expor a permissão de dashboard

**Descrição:** Criar a fonte de verdade de developers por projeto, a ativação independente do dashboard e um helper de acesso separado do Gantt atual.

**Critérios de aceitação:**

- [ ] Um developer autorizado recebe `canViewDashboard` e `canManageDashboard`.
- [ ] Um membro normal, gestor sem a permissão e utilizador externo não recebem acesso.
- [ ] Nenhuma regra de `get-project-access.js` ou da edição Gantt é alterada.

**Verificação:** testes de integração do helper e dos controladores com os quatro perfis de acesso.

**Ficheiros prováveis:** modelo/migração de acesso a developers, `server/api/helpers/gantt-dashboard/get-project-access.js`, testes de servidor.

#### Tarefa 2: Criar leitura/escrita segura do layout

**Descrição:** Adicionar a entidade, endpoints e validação de um layout por projeto, sem widgets no cliente ainda.

**Critérios de aceitação:**

- [ ] Um projeto autorizado recebe o layout padrão quando ainda não existir configuração.
- [ ] Apenas developers podem persistir um layout válido.
- [ ] Payload inválido, dimensões fora dos limites e versão desatualizada são rejeitados de forma previsível.

**Verificação:** testes de integração aos endpoints; confirmar `403`, `422` e conflito de versão.

**Dependência:** Tarefa 1.

### Checkpoint — Fundação

- [ ] A rota de API está protegida no servidor.
- [ ] O Gantt atual e os Boards mantêm os testes focados sem alterações.

### Fase 2 — Página e GridStack isolados

#### Tarefa 3: Adicionar rota, link e estado de acesso no cliente

**Descrição:** Declarar `Paths.PROJECT_DASHBOARD`, integrá-la nos seletores/router/Static e criar o link `Dashboard` condicionado pela permissão recebida.

**Critérios de aceitação:**

- [ ] O link aponta para `/projects/:id/dashboard`, não aparece a não developers e é separado do link Gantt.
- [ ] A rota direta de um não autorizado não mostra conteúdo do dashboard.
- [ ] Abrir Gantt e Boards conserva a apresentação atual.

**Verificação:** teste de rota e smoke manual por hot reload em `http://localhost:3008`; não executar build.

**Dependência:** Tarefas 1–2.

#### Tarefa 4: Encapsular GridStack e persistir a geometria

**Descrição:** Instalar GridStack, criar `gantt-dashboard/DashboardGrid.jsx` e montar o canvas com o layout devolvido pelo servidor.

**Critérios de aceitação:**

- [ ] Só `DashboardGrid.jsx` importa GridStack e o CSS do fornecedor.
- [ ] Em configuração, widgets podem mover e redimensionar dentro de 12 colunas.
- [ ] Ao terminar um movimento/redimensionamento, o layout é validado e gravado; ao recarregar é restaurado.
- [ ] Em `?tv=1`, drag, resize e controlos de configuração estão desativados.

**Verificação:** teste de componente do normalizador de layout e smoke no browser, incluindo reload e 1440 × 900.

**Dependência:** Tarefa 3.

### Fase 3 — Widgets úteis e modo TV

#### Tarefa 5: Implementar os widgets iniciais de leitura

**Descrição:** Construir progresso, estados, próximas tarefas e atenção necessária a partir de seletores puros que recebem os dados já carregados do Gantt.

**Critérios de aceitação:**

- [ ] Widgets apresentam estado vazio, carregamento e erro de forma útil.
- [ ] Alterações Gantt em tempo real atualizam métricas sem reload completo.
- [ ] Nenhum widget faz mutações de Gantt, Board, Card ou Task.

**Verificação:** testes unitários dos seletores e smoke com criação/alteração de item Gantt através da UI existente.

**Dependência:** Tarefa 4.

#### Tarefa 6: Completar experiência TV e acessibilidade

**Descrição:** Remover chrome dispensável em `?tv=1`, adicionar atualização temporal discreta, tratamento de ecrã inteiro e interações acessíveis no modo de configuração.

**Critérios de aceitação:**

- [ ] A TV continua legível a 1920 × 1080 e a 1366 × 768, sem necessidade de scroll horizontal.
- [ ] O modo de configuração é utilizável por teclado e anuncia ações de adicionar/remover widget.
- [ ] `prefers-reduced-motion` evita animações de rearranjo não essenciais.

**Verificação:** QA manual por hot reload, Tab keyboard pass e inspeção de consola sem erros.

**Dependência:** Tarefa 5.

### Checkpoint — Entrega

- [ ] Autorização confirmada no servidor e cliente.
- [ ] Layout persiste e sincroniza sem afetar Gantt/Boards.
- [ ] Todos os widgets iniciais são somente leitura.
- [ ] Testes focados e lint dos ficheiros alterados passam; não executar build salvo pedido explícito.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| “Developer” não existe como papel atual | Alto | Decidir fonte de verdade antes da Tarefa 1; não inferir a partir de `canEdit`. |
| Layout inválido ou manipulado no browser | Alto | Validar e normalizar no servidor, com allowlist de widgets e limites por tipo. |
| Widget pesado degrada a TV | Médio | Seletores memoizados, dados agregados no servidor quando necessário e limite inicial de widgets. |
| Atualizações concorrentes de dois editores | Médio | Campo `version`, resposta de conflito e evento socket de layout atualizado. |
| CSS do GridStack afeta o Planka | Médio | Importação limitada a `DashboardGrid.jsx`, wrapper com namespace próprio e verificação visual das rotas Gantt/Board. |
| Grelha pouco útil em ecrã pequeno | Baixo | Dashboard TV é otimizado primeiro para desktop/TV; no cliente estreito, usar uma coluna ou indicar que é uma superfície de visualização. |

## Fora de âmbito da primeira versão

- Alterar a estrutura, permissões ou UI dos Boards.
- Alterar o editor, timeline, modelo ou APIs atuais do Gantt.
- Widgets que editam tarefas diretamente.
- Layouts diferentes por utilizador, múltiplos dashboards por projeto, ligação a dados externos, playlists de TV ou autenticação pública por URL.
- Expor a página sem autenticação. Mesmo uma TV deve abrir com uma sessão autorizada até ser desenhado um modelo explícito de acesso público/restrito.

## Decisão pendente antes da implementação

Confirmar onde se gere a lista de developers por projeto: numa lista específica nas definições do projeto (recomendado), numa permissão já existente que o produto considere equivalente, ou apenas administradores globais.
