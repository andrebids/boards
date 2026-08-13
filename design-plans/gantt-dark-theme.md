# Aplicar ao Gantt o tema escuro dos Boards

Written against: `a9910a518838453a82a7d7fc3aaad4798905416e` (working tree com a implementação do Gantt ainda não commitada)

## Análise do tema atual dos Boards

1. **A hierarquia visual vem de superfícies escuras, não de contornos fortes.** O canvas é o nível mais profundo; listas e controlos usam uma superfície ligeiramente mais clara; cartões e estados ativos avançam mais um nível. A separação é feita sobretudo por mudança de tom, com bordas de baixa opacidade e sombras curtas. Isto está formalizado em `client/src/styles/glass-theme.css` através de `--app-dark-canvas`, `--app-dark-surface`, `--app-dark-surface-hover` e `--app-dark-border`, e aplicado nas listas em `client/src/components/lists/List/List.module.scss` e nos cartões em `client/src/components/cards/Card/Card.module.scss`.
2. **O azul é funcional.** `--app-accent` e `--app-focus` identificam ação primária, seleção, foco e feedback de drag; o texto normal permanece em `--app-dark-text` ou `--app-dark-text-muted`. Hover e seleção não introduzem novas cores: alteram o tom da superfície ou aplicam `--app-accent-soft`. Os botões já implementam este contrato em `client/src/lib/custom-ui/components/Button/Button.module.scss`.
3. **A imagem do quadro é contexto, não o tema em si.** No Board, a fotografia pode permanecer visível entre listas porque os cartões são unidades pequenas e opacas. Uma timeline contém linhas finas, datas e barras contínuas; por isso o Gantt deve herdar a linguagem escura, mas usar um canvas opaco e estável. Não deve mostrar a imagem do Board por trás da grelha nem adicionar blur/glass à área de dados.

## Evidence chain

- Surface: Board Kanban renderizado em `/projects/:projectId/boards/:boardId` e Gantt renderizado em `/projects/:projectId/gantt`, a `1440 × 900`.
- Problem: o chrome partilhado já é escuro, mas `GanttWorkspace.module.scss` e `GanttTimelineAdapter.module.scss` introduzem de forma abrupta um workspace branco, cabeçalhos cinza-claro, bandas amarelas/azuis claras e texto escuro. O painel lateral é escuro, mas usa uma segunda paleta hardcoded. O resultado parece uma aplicação incorporada, e não outra vista do mesmo projeto.
- Design evidence: `client/src/styles/glass-theme.css` define explicitamente a escala escura partilhada e declara que as superfícies normais devem ser escuras e opacas; `client/src/components/lists/List/List.module.scss` mostra a composição de superfície/borda; `client/src/components/cards/Card/Card.module.scss` mostra hover e elevação; `client/src/lib/custom-ui/components/Button/Button.module.scss` é o contrato de ação; `client/src/components/boards/Boards/GanttTab.module.scss` já faz o Gantt herdar corretamente o estilo dos separadores.
- Owner: `client/src/components/gantt/GanttWorkspace.module.scss`, `client/src/components/gantt/GanttTimelineAdapter.jsx`, `client/src/components/gantt/GanttTimelineAdapter.module.scss` e `client/src/components/gantt/GanttItemPanel.module.scss`.
- Scope and affected surfaces: toolbar, controlos de zoom, estados loading/error/empty, tabela e timeline SVAR, cabeçalhos temporais, barras, hover/seleção/drag, área “Por agendar” e painel de criação/edição.
- Uncertainty: a versão instalada expõe `WillowDark` e a classe `.wx-willow-dark-theme`; durante a implementação é necessário confirmar no DOM que todos os seletores SVAR usados continuam a corresponder aos elementos renderizados nos três níveis de zoom.

## Design decision

Converter todo o conteúdo pertencente ao Gantt para o mesmo sistema semântico escuro dos Boards. A integração baseia-se nos tokens globais existentes e no tema `WillowDark` do SVAR, com overrides locais apenas para traduzir as variáveis `--wx-*` para o sistema da aplicação.

O Gantt mantém a sua composição funcional atual: toolbar simples, grelha densa, tabela à esquerda, timeline à direita, barras azuis, zoom diário/semanal/mensal e área “Por agendar”. Não se adiciona uma moldura/card à volta do workspace. A continuidade com os Boards deve ser sentida pela paleta, tipografia, densidade, estados e controlos — não por copiar a imagem de fundo do quadro.

## Reuse

- Tokens de canvas, superfície, hover, borda, texto, muted, accent, accent-soft, focus, danger e disabled em `client/src/styles/glass-theme.css`.
- `Button` e as variantes `primary`, `secondary` e `danger-soft` em `client/src/lib/custom-ui/components/Button`.
- Exemplar de lista: `client/src/components/lists/List/List.module.scss`, especialmente `.outerWrapper`, `.headerName` e os estados hover.
- Exemplar de cartão: `client/src/components/cards/Card/Card.module.scss`, especialmente `.wrapper` e `.wrapper:hover`.
- Exemplar de scrollbar horizontal: `client/src/components/boards/Board/KanbanContent/KanbanContent.module.scss`.
- Exemplar de separador: `client/src/components/boards/Boards/GanttTab.module.scss`; este componente já está alinhado e não deve ser redesenhado.
- Tema de fornecedor existente: `WillowDark` de `@svar-ui/react-gantt`; não criar nem manter um fork do SVAR.

Não é necessário criar um novo primitive ou novos tokens globais. Valores derivados localmente devem usar `color-mix()` sobre os tokens existentes e ter uma função concreta, como zebra, hover ou banda temporal alternada.

## Changes

1. `client/src/components/gantt/GanttTimelineAdapter.jsx`
   - Change: substituir `Willow` por `WillowDark`, mantendo `fonts={false}` para preservar a tipografia da aplicação. Manter `Gantt`, configuração de colunas, dimensões, escalas, drag, resize e callbacks exatamente como estão.
   - Preserve: `day/week/month`, `autoScale`, `cellHeight`, `scaleHeight`, cálculo inclusivo das datas, persistência de `expectedDurationDays`, readonly e seleção da tarefa.
   - Verify: a raiz renderizada do fornecedor usa `.wx-willow-dark-theme`; mudar zoom não volta a aplicar estilos claros nem desmonta interações.

2. `client/src/components/gantt/GanttTimelineAdapter.module.scss`
   - Change: trocar o owner `.wx-willow-theme` por `.wx-willow-dark-theme` e mapear `--wx-background`, fonte, primary, borders, holiday, selection, task fill, grid body/header e timescale para os tokens `--app-*`. Remover os hex claros e manter apenas overrides necessários sobre o tema escuro do SVAR.
   - Change: usar `--app-dark-canvas` na timeline, `--app-dark-surface` no cabeçalho/timescale, `--app-dark-border` nas divisões, `--app-dark-text` no conteúdo e `--app-dark-text-muted` nos rótulos secundários. A linha zebra deve ser uma mistura discreta entre canvas e surface; hover deve avançar para `--app-dark-surface-hover`; seleção deve usar `--app-accent-soft`.
   - Change: manter barras em `--app-accent`, texto em `--app-accent-foreground` e handles/estado selecionado ligados a `--app-focus`. A sombra da barra deve ser curta e escura, no mesmo peso dos cartões do Board, sem glow decorativo.
   - Change: substituir as bandas mensais amarelo-claro/azul-claro por duas superfícies escuras próximas: base `--app-dark-surface` e alternada derivada de `--app-accent-soft` misturado com essa superfície. Não usar `warning` para uma alternância sem significado de aviso.
   - Change: alinhar scrollbars horizontais e verticais com o padrão do Kanban: track escuro, thumb em `--app-dark-surface-hover`, hover um nível acima e borda subtil.
   - Preserve: legibilidade da grelha, alternância visual entre meses, largura da grelha, zebra, hover, seleção, barras e divisões completas entre células.
   - Verify: tabela e timeline formam uma única superfície contínua; nenhuma célula, header, holiday ou zona vazia permanece branca; barras continuam fáceis de localizar e manipular.

3. `client/src/components/gantt/GanttWorkspace.module.scss`
   - Change: usar `--app-dark-canvas` no workspace e remover todos os fundos, textos, borders e focus rings claros hardcoded. O toolbar deve ficar no mesmo plano do canvas, sem caixa exterior, gradiente ou linha à volta; uma única separação inferior de baixa opacidade é aceitável apenas se for necessária para distinguir a timeline.
   - Change: título e contagem usam `--app-dark-text`/`--app-dark-text-muted`; o ícone usa `--app-accent`; o botão “Nova tarefa” continua a ser o `Button` primário já existente.
   - Change: tratar o grupo de zoom como controlo compacto escuro: superfície `--app-dark-surface`, borda `--app-dark-border`, texto normal, hover `--app-dark-surface-hover`, disabled por opacidade/token e foco `--app-focus`. Definir `color-scheme: dark` no `select` para o menu nativo não abrir claro.
   - Change: no empty state, manter a sugestão de grelha, mas gerar linhas com `--app-dark-border` sobre o canvas escuro. Ícone/CTA usam accent e accent-soft, sem criar um painel colorido adicional.
   - Change: fazer a área “Por agendar” usar `--app-dark-surface` com uma separação superior subtil. Cada item deve seguir a composição dos cartões do Board: superfície forte partilhada, sem contorno pesado, radius de `--app-radius`, hover por mudança de superfície e focus ring `--app-focus`.
   - Preserve: alturas, distribuição flex, comportamento responsivo, labels, contagem, overflow horizontal, empty/loading/error e reduced motion.
   - Verify: toolbar, timeline e “Por agendar” leem como uma vista contínua; o conteúdo não fica embrulhado num card azul; em menos de `680px` o zoom e a área por agendar continuam utilizáveis.

4. `client/src/components/gantt/GanttItemPanel.module.scss`
   - Change: substituir `#171a20`, `#20242c`, os azuis locais e os vários `rgba(255,255,255,...)` semânticos pelos tokens globais. Usar superfície escura opaca no painel, surface-hover nos inputs, border partilhada nas divisões, text/muted nos labels e `--app-focus` nos estados de foco.
   - Change: usar `--app-accent-soft` para chips e para o aviso “por agendar”; usar `--app-danger`/`--app-danger-soft` para erro e eliminar. Manter a sombra lateral apenas como indicação de sobreposição, com peso semelhante ao sistema existente.
   - Change: não introduzir blur, transparência sobre a timeline ou novos estilos de botão. Se o botão eliminar precisar de maior semântica, trocar a composição para a variante partilhada `danger-soft` em `GanttItemPanel.jsx` em vez de a colorir com uma classe local.
   - Preserve: largura de `440px`, estrutura e ordem do formulário, foco inicial, Escape, restauro de foco, validação, duas colunas no desktop e uma coluna em mobile.
   - Verify: painel e campos parecem pertencer ao mesmo sistema do Board, mas continuam claramente elevados sobre a timeline; dropdown aberto, chips, disabled, erro, submit e delete têm estados coerentes.

5. `client/tests/gantt-ui-smoke.cjs`
   - Change: acrescentar uma verificação pequena do contrato visual estrutural: presença de `.wx-willow-dark-theme` e ausência da antiga `.wx-willow-theme` dentro do wrapper do Gantt. Se for estável no browser de teste, validar também que o background computado do workspace não é branco.
   - Preserve: criação e limpeza do projeto temporário, drag, resize, persistência, zoom, abertura/fecho do painel e foco.
   - Verify: o teste falha se uma atualização futura do SVAR ou uma regressão voltar ao tema claro, sem fixar snapshots frágeis de cada pixel.

## Scope

- Inherit: todos os Gantts por projeto, incluindo utilizadores em edit mode e readonly, os três zooms, tarefas agendadas e não agendadas, estados vazios/loading/error e o painel de tarefa.
- Verify: chrome global, separador Gantt, Boards Kanban, modal de definições do projeto, sidebar expandida e barra do chat; partilham tokens ou layout mas não devem sofrer alteração visual involuntária.
- Exclude: imagem/fundo configurado em cada Board, cores personalizadas das listas, backend, modelos e migrations, contratos API, regras de datas, permissões, criação/ativação do Gantt, dependências, nova preferência de tema e redesign funcional da timeline.

## Validation

- Product: abrir um projeto com Gantt ativo, criar uma tarefa agendada e outra sem data, editar duração/datas/pessoas/estado, fazer drag e resize da barra, alternar dia/semana/mês, abrir o item “Por agendar” e confirmar a persistência após reload.
- Interface: verificar `/projects/:projectId/gantt` em `1440 × 900`, `1024 × 768` e largura inferior a `680px`; cobrir empty, loading, error, scheduled, unscheduled, readonly, dropdown aberto, focus, hover, selected, drag e resize. Comparar no mesmo projeto com um Board aberto para confirmar continuidade de canvas/surface/text/accent, sem exigir a mesma imagem de fundo.
- System: confirmar que não foram criadas cores globais paralelas, que os overrides `--wx-*` derivam dos tokens `--app-*`, que `Button` continua a ser a única boundary para botões de ação e que o tema claro SVAR já não é importado/renderizado pelo adapter.
- Repository: `git diff --check` → sem erros de whitespace.
- Repository: `cd client && npx eslint src/components/gantt/GanttWorkspace.jsx src/components/gantt/GanttTimelineAdapter.jsx src/components/gantt/GanttItemPanel.jsx tests/gantt-ui-smoke.cjs` → sem novos erros.
- Repository: com os serviços de desenvolvimento já ativos, `cd client && GANTT_TEST_USER="$GANTT_TEST_USER" GANTT_TEST_PASSWORD="$GANTT_TEST_PASSWORD" node tests/gantt-ui-smoke.cjs` → smoke test concluído, projeto temporário removido e zero erros de browser. Não executar build; validar por hot reload conforme `AGENTS.md`.

## Stop conditions

- Stop if `WillowDark` não renderizar `.wx-willow-dark-theme` ou deixar partes essenciais do Gantt sem variáveis configuráveis; inspecionar primeiro o DOM/CSS real antes de alargar overrides.
- Stop if a alteração exigir mudar tokens globais usados pelos Boards; o plano autoriza consumir o contrato atual, não redesenhá-lo.
- Stop if algum seletor local tiver de depender de hashes/classes internas geradas pelo SVAR; preferir variáveis públicas ou um wrapper estável e reavaliar a estratégia.
- Stop if a mudança visual afetar comportamento de datas, drag/resize, readonly, API ou permissões; separar essa regressão do trabalho de tema.

## Design documentation

- After acceptance and validation: none. `client/src/styles/glass-theme.css` já é o contrato canónico; manter nesse ficheiro apenas tokens transversais e deixar o mapeamento específico do SVAR documentado junto a `GanttTimelineAdapter.module.scss`.
