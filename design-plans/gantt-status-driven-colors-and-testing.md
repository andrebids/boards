# Relacionar a cor das tarefas Gantt com o estado e adicionar “Em testes”

Written against: `69b054bf76e6914e70fb08a19bd9f0047bc758e8`

## Evidence chain

- Surface: `/projects/:projectId/gantt`, incluindo barras da timeline, coluna Estado, área “Por agendar” e painel `GanttItemPanel` nos modos de criação e edição.
- Problem: `client/src/components/gantt/GanttItemPanel.jsx` permite escolher `status` e `color` de forma independente e envia ambos no payload; `client/src/constants/GanttColors.js` aplica a barra a partir de `item.color`. Isto permite combinações sem significado, como uma tarefa concluída azul ou uma tarefa por iniciar verde. Além disso, `client/src/constants/GanttStatuses.js` e `server/api/models/GanttItem.js` só reconhecem `notStarted`, `inProgress` e `completed`, pelo que a fase de testes não pode ser escolhida nem persistida.
- Design evidence: `client/src/constants/GanttColors.js` já contém azul, laranja e verde adequados a três fases, mas o cinzento atual `#697386` tem apenas 3.03:1 contra `--app-dark-surface-hover`, ficando demasiado próximo do fundo cinzento quando a linha está em hover/selecionada; `client/src/components/gantt/GanttTimelineAdapter.jsx` já mantém o texto traduzido do estado numa coluna separada; `client/src/styles/glass-theme.css` fornece o canvas `oklch(0.177 0.013 264.15)`, a superfície hover `oklch(0.282 0.029 256.846)` e foregrounds partilhados; `client/src/constants/GanttStatuses.js` já centraliza valores canónicos, aliases e chaves de tradução.
- Owner: estado canónico em `server/api/models/GanttItem.js` e `client/src/constants/GanttStatuses.js`; relação estado/cor em `client/src/constants/GanttColors.js`; apresentação em `GanttItemPanel.jsx`, `GanttTimelineAdapter.jsx` e `GanttWorkspace.jsx`.
- Scope and affected surfaces: tarefas autónomas e projetos-resumo, agendados ou por agendar; criação, edição, reload, sockets e tarefas ligadas aos Boards.
- Uncertainty: tarefas ligadas a uma `Task` de Board só expõem `Task.isCompleted`. Sem aumentar o modelo dos Boards, estas tarefas continuam deliberadamente limitadas a `notStarted` e `completed`; `testing` aplica-se a itens Gantt autónomos e projetos-resumo.

Este plano substitui apenas as decisões antigas que mantinham cor livre/editável ou barras sempre azuis em `design-plans/gantt-dark-theme.md`, `design-plans/gantt-board-task-linking.md` e `design-plans/gantt-item-panel-vertical-compaction.md`. As restantes decisões desses planos permanecem válidas.

## Design decision

Tornar o estado a única fonte de verdade da cor apresentada. O cliente deixa de pedir e enviar uma cor, resolve um estado efetivo único e usa-o na timeline, no seletor e nas tarefas por agendar. Não sincronizar nem duplicar a cor no servidor: o campo legado `gantt_item.color` e a aceitação API permanecem temporariamente para compatibilidade, mas deixam de influenciar a interface atual.

A sequência de trabalho passa a ser `notStarted` → `inProgress` → `testing` → `completed`, apresentada como “Por iniciar” → “Em curso” → “Em testes” → “Concluído”. A relação visual é fixa:

| Fase | Before | After |
| --- | --- | --- |
| Por iniciar | Qualquer cor guardada; cinzento possível `#697386` quase fundido com hover cinzento | Cinzento-azulado claro `oklch(0.72 0.025 260)` (`#9ca5b5` aproximado); foreground `--app-dark-canvas` |
| Em curso | Qualquer uma das sete cores guardadas | Azul existente expresso como `oklch(0.617 0.173 257.6)` (`#3983eb`); foreground `--app-dark-canvas` |
| Em testes | Estado indisponível | Laranja existente expresso como `oklch(0.686 0.144 60.43)` (`#d9822b`); foreground `--app-dark-canvas` |
| Concluído | Qualquer uma das sete cores guardadas | Verde existente expresso como `oklch(0.638 0.133 157.6)` (`#2fa36b`); foreground `--app-dark-canvas` |

As barras são opacas e recebem sempre um contorno de `1px` mais claro que o próprio fill; não usar alpha no fundo semântico, porque isso faria especialmente o cinzento voltar a misturar-se com o canvas. O contorno normal tem de ser aplicado por `--wx-gantt-task-border`/`--wx-gantt-summary-border`, pois o SVAR só consulta `*-border-color` no estado selecionado.

Contraste mínimo verificado para os fundos propostos:

| Fase | Contra `--app-dark-canvas` | Contra `--app-dark-surface-hover` | Texto `--app-dark-canvas` sobre a barra |
| --- | ---: | ---: | ---: |
| Por iniciar | 7.63:1 | 5.84:1 | 7.63:1 |
| Em curso | 5.06:1 | 3.88:1 | 5.06:1 |
| Em testes | 6.46:1 | 4.95:1 | 6.46:1 |
| Concluído | 5.92:1 | 4.54:1 | 5.92:1 |

Assim, todas as barras excedem 3:1 contra o fundo cinzento mais exigente e todo o texto excede 4.5:1. Vermelho fica reservado a erro/perigo; roxo e turquesa deixam de ter significado no Gantt. O texto traduzido do estado permanece visível na grelha, no seletor e junto das tarefas por agendar, para que a fase não seja comunicada apenas por cor.

## Reuse

- `GANTT_STATUSES`, `normalizeGanttStatus` e `getGanttStatusTranslationKey` em `client/src/constants/GanttStatuses.js`.
- Paleta existente em `client/src/constants/GanttColors.js`, ajustando apenas o cinzento de “Por iniciar” para obter margem clara contra o fundo; não criar uma segunda paleta nem novos tokens globais.
- `--app-dark-canvas` em `client/src/styles/glass-theme.css` para o foreground das barras e `--app-dark-text` apenas para clarear o respetivo contorno por `color-mix()`.
- `buildGanttTaskColorStyles` e o wrapper estável `[data-gantt-color-scope]` para aplicar variáveis `--wx-gantt-*` por ID, sem depender de hashes internos do SVAR.
- Exemplar: opções de dropdown com dot e texto já usadas pelo seletor de cor atual em `GanttItemPanel.jsx`; mover esta composição para as opções de Estado.

Não é necessário criar um primitive, uma migration ou uma nova dependência.

## Changes

1. `server/api/models/GanttItem.js`
   - Change: adicionar `TESTING: 'testing'` a `GanttItem.Statuses`, fazendo os validadores já existentes em `gantt-items/create.js` e `gantt-items/update.js` aceitarem o novo valor através de `Object.values(GanttItem.Statuses)`.
   - Preserve: `status` nullable, versionamento otimista, permissões, validação de itens ligados e restantes atributos.
   - Verify: create/update aceitam `testing`; valores fora dos quatro estados continuam rejeitados.

2. `client/src/constants/GanttStatuses.js` e `client/src/constants/GanttStatuses.test.js`
   - Change: inserir `testing` entre `inProgress` e `completed`; normalizar pelo menos `testing`, `in testing`, `em teste` e `em testes` para o valor canónico.
   - Change: expor um resolver único `getEffectiveGanttStatus(item, fallback = 'notStarted')`: itens autónomos usam o estado normalizado/fallback; itens ligados usam `sourceTask.isCompleted ? 'completed' : 'notStarted'`.
   - Preserve: aliases legados e geração de chaves `common.ganttStatus_*`.
   - Verify: testes cobrem a ordem dos quatro estados, aliases portugueses/ingleses, fallback, item autónomo e item ligado incompleto/concluído.

3. `client/src/constants/GanttColors.js` e `client/src/constants/GanttColors.test.js`
   - Change: adicionar um mapa semântico estado → fundo/foreground com a tabela acima e fazer `buildGanttTaskColorStyles` resolver o estado efetivo, em vez de ler `task.color`.
   - Change: para cada barra, definir `--wx-gantt-task-color`, `--wx-gantt-task-fill-color`, `--wx-gantt-task-font-color`, `--wx-gantt-task-border-color` e `--wx-gantt-task-border: 1px solid <contorno>`; para summaries, definir os equivalentes `--wx-gantt-summary-*`. O contorno deve resultar de `color-mix(in oklab, <fundo> 78%, var(--app-dark-text) 22%)`, para permanecer reconhecível sem parecer um segundo estado.
   - Change: exportar a metadata mínima necessária para dots do estado no painel e em “Por agendar”, reutilizando os mesmos fundos.
   - Preserve: escaping seguro do ID, regras por `data-task-id`, suporte à virtualização e distinção task/summary.
   - Verify: a cor resulta apenas do estado; um `item.color` legado e contraditório não altera a regra; os quatro estados e os dois tipos de barra ficam cobertos; fill, texto e contorno mantêm os rácios da matriz em repouso, hover e selected.

4. `client/src/components/gantt/GanttItemPanel.jsx` e `client/src/components/gantt/GanttItemPanel.module.scss`
   - Change: remover `COLORS`, `data.color`, o campo “Cor” e `color` do payload de create/update. O campo Estado passa a ocupar a largura disponível.
   - Change: usar `getEffectiveGanttStatus` na inicialização/reset; manter o default `notStarted`.
   - Change: apresentar nas quatro opções do Estado um dot opaco com a cor semântica, ring de `1px` derivado por `color-mix()` e o respetivo texto traduzido, reaproveitando/renomeando as classes locais hoje usadas pelas opções de cor. O dot de “Por iniciar” não pode usar o mesmo cinzento do fundo do dropdown.
   - Preserve: estado disabled e derivado nos itens ligados, ordem do formulário, foco inicial, Escape, validação, datas, pessoas, dependências, delete e submit.
   - Verify: criar/editar uma tarefa autónoma oferece “Em testes” e nunca mostra “Cor”; um item ligado continua a mostrar apenas a conclusão derivada e não permite editar o estado.

5. `client/src/components/gantt/GanttTimelineAdapter.jsx`
   - Change: usar `getEffectiveGanttStatus` tanto em `statusLabel` como no objeto enviado a `buildGanttTaskColorStyles`; deixar de copiar `item.color` para `tasks`.
   - Preserve: texto do estado na coluna, hierarquia, datas inclusivas, zoom, drag/resize, links, seleção e readonly.
   - Verify: mudar e guardar o estado recolore a barra após a resposta/sockets e continua correto depois de reload; summaries usam a mesma relação sem perder o estilo próprio do SVAR.

6. `client/src/components/gantt/GanttWorkspace.jsx` e `client/src/components/gantt/GanttWorkspace.module.scss`
   - Change: na área “Por agendar”, mostrar o mesmo dot opaco com ring e o texto traduzido do estado na metadata já existente, usando o mesmo resolver e mapa das barras.
   - Preserve: título, projeto-pai, duração, botão inteiro clicável, hover/focus e densidade atual.
   - Verify: tarefas sem datas comunicam a mesma fase por cor e texto; nomes longos não cortam o alvo nem a metadata essencial.

7. `client/src/locales/en-US/core.js`, `client/src/locales/fr-FR/core.js` e `client/src/locales/pt-PT/core.js`
   - Change: adicionar `ganttStatus_testing` como `Testing`, `En test` e `Em testes`.
   - Preserve: as restantes traduções e o fallback global `en-US` para locales sem bloco Gantt próprio.
   - Verify: coluna, dropdown e “Por agendar” usam a mesma chave sem texto hardcoded.

8. `client/tests/gantt-ui-smoke.cjs` e `client/tests/gantt-hierarchy-smoke.cjs`
   - Change: criar/atualizar dados de teste para cobrir os quatro estados e afirmar as variáveis computadas das barras por `data-task-id`, incluindo foreground e border normal/selected. Calcular no próprio teste o contraste WCAG das cores computadas: barra ≥ 3:1 contra canvas e surface-hover; texto ≥ 4.5:1 contra a barra.
   - Change: no painel, confirmar que “Em testes” existe, que `#gantt-task-color` não existe, selecionar `testing`, guardar e confirmar estado/cor após reload.
   - Change: cobrir uma tarefa por agendar com dot + label e manter o caso de item ligado derivado de `isCompleted`.
   - Preserve: drag/resize, zoom, tema escuro, hierarquia, foco, backdrop, duração em dias úteis, settings e limpeza do projeto temporário.
   - Verify: o smoke falha se cor e estado voltarem a divergir ou se `testing` for rejeitado pela API.

## Scope

- Inherit: todos os Gantts por projeto, itens existentes, tarefas e summaries, criação/edição, timeline, “Por agendar”, readonly e atualizações em tempo real.
- Verify: itens antigos com `color` arbitrária; `status` nulo/desconhecido; tarefas ligadas incompletas/concluídas; barras em repouso, hover, selected, drag e resize sobre canvas/surface-hover; zoom day/week/month/quarter.
- Exclude: adicionar workflow de quatro fases às tarefas dos Boards; alterar `Task.isCompleted`; migrar/apagar a coluna `gantt_item.color`; transformar vermelho em estado “Bloqueado”; filtros, métricas ou automações por estado; redesenhar o tema global.

## Validation

- Product: criar quatro tarefas autónomas, uma por estado, confirmar a relação cinzento/azul/laranja/verde, mudar uma tarefa de “Em curso” para “Em testes” e depois “Concluído”, recarregar e confirmar persistência; abrir uma tarefa ligada incompleta/concluída e confirmar a derivação atual.
- Interface: validar timeline, coluna Estado, dropdown aberto/fechado e “Por agendar” em `1440×900`, `1024×768` e abaixo de `680px`; confirmar que sobretudo “Por iniciar” continua imediatamente distinguível do fundo cinzento em repouso, hover e selected, que texto/dots/contornos permanecem legíveis e que o antigo campo Cor desapareceu.
- System: confirmar que existe um único resolver do estado efetivo e um único mapa estado/cor, que nenhuma apresentação lê `item.color`, que o backend continua a aceitar clientes legados e que não foram criados tokens/dependências paralelos.
- Repository: `cd client && npm test -- --runInBand src/constants/GanttStatuses.test.js src/constants/GanttColors.test.js` → testes focados concluídos.
- Repository: `cd client && npx eslint src/constants/GanttStatuses.js src/constants/GanttStatuses.test.js src/constants/GanttColors.js src/constants/GanttColors.test.js src/components/gantt/GanttItemPanel.jsx src/components/gantt/GanttTimelineAdapter.jsx src/components/gantt/GanttWorkspace.jsx tests/gantt-ui-smoke.cjs tests/gantt-hierarchy-smoke.cjs` → sem novos erros.
- Repository: `cd server && npx eslint api/models/GanttItem.js api/controllers/gantt-items/create.js api/controllers/gantt-items/update.js` → sem novos erros.
- Repository: com os serviços de desenvolvimento existentes, `cd client && GANTT_TEST_USER="$GANTT_TEST_USER" GANTT_TEST_PASSWORD="$GANTT_TEST_PASSWORD" node tests/gantt-ui-smoke.cjs` e o smoke de hierarquia → concluídos por hot reload, projeto temporário removido e zero erros de browser. Não executar build, conforme `AGENTS.md`.
- Repository: `git diff --check` → sem erros de whitespace.

## Stop conditions

- Stop if o DOM da versão instalada do SVAR não aceitar `--wx-gantt-*-font-color` ou `--wx-gantt-*-border` por barra; confirmar primeiro os estilos computados e, se necessário, ajustar a lightness dos fundos mantendo barra ≥ 3:1 contra o cinzento e texto ≥ 4.5:1, sem depender de classes internas geradas.
- Stop if `testing` tiver de existir também nas tarefas ligadas aos Boards; isso exige uma decisão separada e uma ampliação do modelo/API/UI de `Task`, hoje booleano.
- Stop if consumidores externos dependerem de a UI atual continuar a editar `GanttItem.color`; preservar a API não autoriza manter dois valores concorrentes no cliente, portanto alinhar primeiro a estratégia de compatibilidade.
- Stop if testes provarem que summaries sem estado têm uma regra de negócio diferente de `notStarted`; definir essa regra antes de lhes atribuir outra cor.

## Design documentation

- After acceptance and validation: none. Este plano regista a nova decisão e identifica explicitamente as cláusulas antigas que substitui; não existe `DESIGN.md` canónico para atualizar.
