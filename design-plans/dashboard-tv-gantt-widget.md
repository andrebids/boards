# Plano: primeiro módulo afixável — Gantt no Dashboard TV

## Objetivo

Adicionar o **Gantt** como o primeiro widget real do dashboard TV global. No editor, um administrador adiciona o widget, escolhe o projeto e o nível de zoom. No visualizador TV, o mesmo Gantt é apresentado em modo estritamente de leitura, sem barra, seleções, formulários ou ações de escrita.

O dashboard continua a ser uma superfície independente: esta entrega não altera a rota, permissões, editor ou comportamento do Gantt normal em `/projects/:id/gantt`.

## Estado atual confirmado

- O dashboard global está em `/dashboard`; `?tv=1` usa a grelha GridStack estática e já não mostra o Header da aplicação.
- O layout atual é um protótipo guardado em `localStorage`, com widgets de exemplo. Ainda não representa uma configuração global persistida e partilhada.
- O Gantt por projeto carrega através de `ProjectGanttProvider`, que usa `GET /projects/:projectId/gantt-plan` e mantém atualização por socket.
- `GanttTimelineAdapter` já é a única fronteira com `@svar-ui/react-gantt`; deve ser reutilizado, não copiado para o dashboard.
- O endpoint Gantt já confirma acesso ao projeto no servidor. O widget só poderá pedir dados de projetos aos quais o utilizador autenticado tem acesso.

## Decisões de arquitetura

1. **Widget configurado por projeto.** Cada instância `gantt` inclui `projectId` e `zoomLevel` (`week` por omissão). O dashboard é global; não existe um projeto implícito na rota.
2. **Somente leitura.** O widget usa um modo de visualização explícito do adaptador Gantt: não abre painéis, não reage a seleção, não permite arrastar tarefas nem altera o zoom por gesto.
3. **Reutilização por composição.** Criar `DashboardGanttWidget` que monta `ProjectGanttProvider` e o adaptador existente. Não montar `GanttWorkspace`, pois esse componente contém toolbar, importação e edição.
4. **Registo de widgets como fonte de verdade.** O tipo `gantt` e a respetiva configuração entram no mesmo registo que define limites de GridStack, título, validação e renderer. Não criar exceções no `DashboardWorkspace`.
5. **Configuração global persistida antes de dados reais.** O `localStorage` não serve para um dashboard partilhado nem para guardar configuração de projeto de forma segura. O layout deve passar para uma configuração singleton no servidor antes de o widget ser considerado concluído.
6. **Permissão já decidida pelo produto.** Visualizador e editor permanecem acessíveis a administradores nesta fase. A futura lista de developers e bloqueio de edição substitui essa regra num único helper de dashboard, não no Gantt.

## Contrato de layout

```js
{
  id: 'gantt-project-alpha',
  type: 'gantt',
  x: 0,
  y: 0,
  w: 12,
  h: 7,
  config: {
    projectId: '…',
    zoomLevel: 'week'
  }
}
```

- `projectId` é obrigatório e validado no servidor.
- `zoomLevel` aceita apenas `day`, `week`, `month` ou `quarter`.
- O widget Gantt ocupa por defeito `12 × 7`, com mínimo `6 × 5` e máximo de 12 colunas. Uma altura insuficiente apresenta uma mensagem de ajuste, nunca uma timeline truncada e interativa.
- O layout não armazena itens, links, utilizadores ou HTML do Gantt — apenas a configuração permitida.

## Plano de implementação

### Tarefa 1 — Tornar o layout extensível a widgets configuráveis

**Descrição:** Evoluir o contrato e o renderer do dashboard de cartões de exemplo para um registo de widgets. Introduzir `gantt` no registo, mantendo os widgets atuais compatíveis durante a transição.

**Critérios de aceitação:**

- [ ] A normalização aceita `config` apenas para os campos permitidos de cada tipo.
- [ ] Um layout inválido (tipo, dimensão, projeto ou zoom) é rejeitado antes de renderizar.
- [ ] O renderer resolve um componente a partir de `type`, sem `if` específico do Gantt no canvas.

**Verificação:** testes unitários em `dashboardLayout.test.js`; abrir `/dashboard` com os widgets de exemplo por hot reload.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/dashboardLayout.js`
- `client/src/components/project-dashboard/dashboardLayout.test.js`
- `client/src/components/project-dashboard/DashboardWorkspace.jsx`
- `client/src/components/project-dashboard/widgets/*` (novo)

**Escopo:** médio.

### Tarefa 2 — Persistir a configuração global e controlar uma edição de cada vez

**Descrição:** Substituir o layout local por uma configuração singleton de dashboard, validada no servidor. Acrescentar uma lease de edição com expiração/heartbeat, para que um administrador configure enquanto os restantes veem quem está a editar e ficam em leitura.

**Critérios de aceitação:**

- [ ] Dois administradores recebem o mesmo layout depois de recarregar.
- [ ] Apenas o titular da lease pode gravar; a lease expira se deixar de enviar heartbeat.
- [ ] O servidor valida tipo, grelha e `config` antes de persistir e devolve conflito de versão sem perder alterações.

**Verificação:** testes focados do helper/controlador; duas sessões autenticadas em `/dashboard`; não executar build local.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `server/db/migrations/*dashboard*.js`
- `server/api/models/*Dashboard*.js`
- `server/api/helpers/dashboard/*` (novo)
- `server/api/controllers/dashboard/*` (novo)
- `client/src/api/dashboard.js` (novo)
- `client/src/components/project-dashboard/DashboardWorkspace.jsx`

**Escopo:** médio, dividido em migration/helper e cliente se necessário.

### Checkpoint — Configuração partilhada

- [ ] O dashboard não depende de `localStorage`.
- [ ] Um segundo administrador não consegue sobrescrever silenciosamente o primeiro.
- [ ] O Gantt normal continua inalterado.

### Tarefa 3 — Adicionar o configurador do widget Gantt

**Descrição:** Disponibilizar “Gantt” na biblioteca GridStack e abrir uma configuração curta ao adicionar ou editar o widget: projeto e zoom inicial. A lista contém apenas projetos a que o utilizador atual tem acesso.

**Critérios de aceitação:**

- [ ] Não é possível guardar um Gantt sem projeto.
- [ ] A configuração pode ser reaberta e alterada no editor sem mover o widget.
- [ ] O modo TV não mostra biblioteca, botões, formulário nem alças de resize.

**Verificação:** adicionar, configurar, redimensionar, recarregar e abrir `?tv=1` por hot reload.

**Dependências:** tarefas 1 e 2.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/WidgetLibrary.jsx` (novo ou extraído)
- `client/src/components/project-dashboard/GanttWidgetSettings.jsx` (novo)
- `client/src/components/project-dashboard/DashboardWorkspace.jsx`
- `client/src/selectors/users.js`

**Escopo:** médio.

### Tarefa 4 — Criar a variante TV do adaptador Gantt

**Descrição:** Adicionar uma variante declarativa e read-only ao `GanttTimelineAdapter`, adequada a cartões do dashboard. Mantém mapeadores, cores, marcador de hoje e sockets do provider, mas remove a tabela lateral não essencial quando o espaço é reduzido e bloqueia todos os callbacks de mutação.

**Critérios de aceitação:**

- [ ] O widget atualiza quando um item Gantt é alterado noutro utilizador.
- [ ] Cliques, arrastos e teclas no widget não abrem edição nem enviam pedidos de escrita.
- [ ] Falta de plano, plano desativado, acesso recusado e lista vazia apresentam estados compactos e legíveis.

**Verificação:** teste unitário das props/modo do adaptador; smoke test com Gantt ativo, vazio e desativado em `/dashboard?tv=1`.

**Dependências:** tarefa 3.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/widgets/DashboardGanttWidget.jsx` (novo)
- `client/src/components/project-dashboard/widgets/DashboardGanttWidget.module.scss` (novo)
- `client/src/components/gantt/GanttTimelineAdapter.jsx`
- `client/src/components/gantt/GanttTimelineAdapter.module.scss`

**Escopo:** médio.

### Tarefa 5 — Integrar, testar responsividade e polir a TV

**Descrição:** Ligar o renderer Gantt ao GridStack persistido, validar dimensões mínimas e adaptar a densidade visual ao tamanho do widget e à resolução de TV.

**Critérios de aceitação:**

- [ ] Um widget Gantt de largura total é legível a 1920×1080 e 1366×768, sem scroll horizontal da página.
- [ ] Em tamanhos pequenos, o widget mostra um estado “aumentar widget” em vez de conteúdo sobreposto.
- [ ] Remover o widget no editor remove também a configuração do layout; não toca no plano Gantt do projeto.

**Verificação:** QA manual em editor e TV, console sem erros e testes focados dos ficheiros alterados.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `client/src/components/project-dashboard/DashboardWorkspace.jsx`
- `client/src/components/project-dashboard/DashboardWorkspace.module.scss`
- `client/src/components/project-dashboard/widgets/*`

**Escopo:** pequeno-médio.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| O Gantt em vários widgets cria vários pedidos/socket listeners | Médio | Limitar inicialmente a uma instância Gantt por projeto e desmontar o provider ao remover o widget. |
| O Gantt normal sofre regressão por partilhar o adaptador | Alto | Introduzir uma prop de variante com valores explícitos, cobrir os mapeadores existentes e validar `/projects/:id/gantt`. |
| Um admin configura projeto sem acesso Gantt futuro | Alto | O servidor valida `projectId` a cada leitura; o widget mostra acesso indisponível sem revelar dados. |
| Um widget fica pequeno demais para a biblioteca SVAR | Médio | Restrições `minW/minH`, `ResizeObserver` e estado compacto antes de montar a timeline. |
| Layout global atual foi iniciado como estrutura por projeto | Alto | Corrigir a migração/modelo para singleton global de forma aditiva antes de aplicar em ambiente partilhado. |

## Fora de âmbito desta entrega

- Editar tarefas Gantt a partir da TV ou do dashboard.
- Mostrar vários projetos dentro da mesma timeline.
- Dar acesso público ao link TV.
- Adicionar outros módulos reais (Boards, métricas, notificações) antes de validar este primeiro widget.

## Decisão a confirmar antes de implementar

O widget deve ter **uma timeline por projeto** (recomendado para a primeira versão) ou deve poder agregar vários projetos? A primeira opção preserva as permissões e a semântica já existentes do Gantt.
