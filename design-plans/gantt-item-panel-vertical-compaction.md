# Compactar verticalmente o painel de tarefa do Gantt

Written against: `2eb96bc154859006872eb74a8aa3ea90a1f1e165` (working tree com alterações locais no próprio painel)

## Evidence chain

- Surface: `/projects/:projectId/gantt`, painel lateral `GanttItemPanel` nos estados “Nova tarefa” e “Editar tarefa”, com foco no estado inicial de criação de uma tarefa normal.
- Problem: o painel de `440px` usa `22px` de padding no cabeçalho e formulário, `18px` de gap uniforme entre todos os campos, um textarea de descrição com `78px` mínimos e um dropdown de pessoas que reserva a altura de um campo mesmo quando a informação selecionada cabe em avatares. A descrição não é necessária neste fluxo e, juntamente com o ritmo uniforme e o seletor alto, empurra datas, aviso e ações para baixo e força scroll vertical em viewports mais baixos.
- Design evidence: `client/src/components/gantt/GanttItemPanel.jsx` mostra que criação e edição partilham a mesma composição; `client/src/components/gantt/GanttItemPanel.module.scss` define o ritmo atual; a captura local do painel confirma que descrição, intervalos e controlos têm peso vertical semelhante apesar de prioridades diferentes; `client/src/components/cards/CardModal/ProjectContent.jsx` e `client/src/components/cards/CardModal/StoryContent/StoryContent.jsx` estabelecem o padrão de membros com avatares circulares e acionador `+`; `client/src/components/board-memberships/PureBoardMembershipsStep` é o popup pesquisável e multi-select já usado por esse padrão; `client/src/styles/glass-theme.css` e o `Button size="sm"` já usado no footer fornecem a linguagem visual a preservar.
- Owner: `client/src/components/gantt/GanttItemPanel.jsx` e `client/src/components/gantt/GanttItemPanel.module.scss`.
- Scope and affected surfaces: criação de tarefa, criação de tarefa geral, criação de subtarefa e edição de ambas as tipologias, em desktop e mobile.
- Uncertainty: descrições existentes podem continuar armazenadas e apresentadas noutros consumidores do Gantt. O painel deve deixar de as editar sem limpar dados históricos; qualquer decisão de remover a coluna, API ou apresentação na timeline fica fora deste trabalho.

## Design decision

Transformar o painel num formulário operacional compacto: retirar o campo de descrição, substituir o dropdown de pessoas pela composição de avatares dos Boards e reduzir o espaçamento repetido e a altura visual do chrome, mas manter a ordem atual, os agrupamentos funcionais, a largura de `440px`, os controlos de toque e todas as ramificações de tarefa normal/tarefa geral.

A descrição deixa de pertencer ao payload do painel. Em criação, a API continuará a aplicar `null` por omissão; em edição, omitir a propriedade preserva qualquer descrição histórica em vez de a apagar acidentalmente.

O caminho primário continua a ser: nome e tipo → hierarquia e pessoa → estado/cor/progresso → duração e datas → ações. A compactação deve vir da remoção de conteúdo e de uma cadência mais curta, não de colocar campos semanticamente diferentes lado a lado ou de reduzir alvos interativos abaixo do padrão já usado.

O campo Pessoa passa a mostrar até cinco avatares circulares sobrepostos, `+N` quando existirem mais selecionados e um botão circular de adicionar membro. O acionador abre a lista pesquisável usada nos Boards, com seleção múltipla, indicadores ativos e opção de limpar; clicar num avatar selecionado abre o mesmo popup. No estado vazio permanece apenas o botão de adicionar. `+N` indica overflow e abre a escolha completa; o `+` isolado continua a significar adicionar/alterar pessoas.

## Reuse

- `GanttItemPanel` e as classes locais `.header`, `.form`, `.field`, `.twoColumns`, `.footer` em `client/src/components/gantt/GanttItemPanel.module.scss`.
- Tokens `--app-dark-surface`, `--app-dark-border`, `--app-dark-text`, `--app-dark-text-muted`, `--app-focus` e `--app-radius` em `client/src/styles/glass-theme.css`.
- `Button size="sm"` já aplicado às ações do footer em `client/src/components/gantt/GanttItemPanel.jsx`.
- `UserAvatar` e a composição avatar + add button em `client/src/components/cards/CardModal/ProjectContent.jsx` e `client/src/components/cards/CardModal/CardModalLayout/CardModalLayout.jsx`.
- Pesquisa, seleção múltipla, indicador ativo, empty state e limpar em `client/src/components/board-memberships/PureBoardMembershipsStep`.
- Limite e overflow `+N` em `client/src/components/board-memberships/BoardMemberships/Group.jsx`; reservar no Gantt cinco avatares visíveis antes do overflow e manter um lugar separado para adicionar.
- Exemplar de densidade no próprio Gantt: `.twoColumns` usa `12px` entre campos relacionados; este passa a ser o intervalo base do formulário.

Não criar um segundo popup de pessoas nem importar `BoardMembershipsStep`, porque esse wrapper lê memberships do Board atual e o Gantt trabalha ao nível do projeto. Tornar a implementação `PureBoardMembershipsStep` verdadeiramente independente da origem da lista e reutilizá-la com os utilizadores que `ProjectGanttProvider` já entrega ao painel. Não criar token global ou variante de densidade.

## Changes

1. `client/src/components/gantt/GanttItemPanel.jsx`
   - Change: remover `description` de `createInitialData`, retirar o bloco de label/textarea `gantt-task-description` e deixar de incluir `description` no objeto enviado por `handleSubmit`.
   - Change: manter o mesmo comportamento nos modos criar e editar; ao editar um item antigo, a ausência de `description` no update deve preservar o valor existente no servidor.
   - Change: substituir o `Dropdown` múltiplo de pessoas, `userOptions`, `renderMemberLabel` e respetivos handlers pela composição compacta: `UserAvatar` para os IDs selecionados, overflow `+N` após cinco avatares e `Button isIconOnly size="sm" variant="secondary"` com ícone `add user` como acionador permanente.
   - Change: instanciar o popup a partir de `PureBoardMembershipsStep`, entregando os `users` do projeto no formato suportado pelo componente puro, `data.assigneeUserIds` como seleção atual e callbacks locais que acrescentam sem duplicar, removem e limpam IDs. Avatar, `+N` e botão adicionar devem abrir a mesma lista completa.
   - Change: manter `aria-label`/title com o nome em cada avatar, “Adicionar membro” no `+` e contagem explícita no `+N`; o label Pessoa continua associado ao grupo, que deve ter semântica de lista de pessoas selecionadas.
   - Preserve: foco inicial no nome, Escape, restauro de foco, validação, tipo de item, tarefa geral, pessoas, estado, cor, progresso, duração, datas, dependências, delete, subtarefa e versionamento otimista.
   - Verify: criar uma tarefa envia todos os IDs selecionados e resulta em descrição nula; reabrir mostra os mesmos avatares; editar uma tarefa que já tenha descrição não envia a chave e não apaga esse valor histórico.

2. `client/src/components/gantt/GanttItemPanel.module.scss`
   - Change: estabelecer ritmo compacto usando o passo de `12px` já presente no painel: reduzir o gap principal de `.form` de `18px` para `12px`; reduzir padding vertical do cabeçalho, formulário e footer sem alterar a separação por borda nem a largura lateral do conteúdo.
   - Change: reduzir o intervalo interno label/controlo de `.field` de `7px` para um passo curto coerente, mantendo labels legíveis e alinhados; manter `42px` como altura mínima dos inputs e dropdowns para não sacrificar interação por rato ou toque.
   - Change: reduzir a presença vertical do cabeçalho através do padding e do espaço entre eyebrow e título; manter o título, eyebrow e botão fechar, e manter o botão fechar com alvo de `40px`.
   - Change: tornar o footer mais compacto verticalmente e conservar as ações `size="sm"`, a margem automática de Cancelar e a folga à direita necessária para não colidir com o launcher do chat.
   - Change: remover `.memberSelect`, `.memberLabel` e `.memberOption`; criar apenas os owners locais da fila de pessoas, sobreposição dos avatares, botão de overflow e acionador adicionar. Usar círculos de `32px` no desktop por correspondência com `Button size="sm"`, aumentar para `36px` quando o contrato responsivo partilhado do botão o fizer e manter foco visível através dos tokens existentes.
   - Change: limitar a fila a uma linha; os avatares visíveis sobrepõem-se como em `BoardMemberships/Group.module.scss`, enquanto `+N` e adicionar permanecem distinguíveis e não podem ser cortados pelo limite direito do painel.
   - Change: remover a regra específica de `textarea` se ficar sem consumidores neste módulo.
   - Preserve: superfície, cores, bordas, focus rings, radius, scrollbar, sticky-by-flex footer, layout de duas colunas e breakpoint atual abaixo de `680px`.
   - Verify: no estado inicial “Nova tarefa”, a data, o aviso “Por agendar” e o footer ficam visíveis sem scroll a `1440×900`; a `1024×768`, o painel deve minimizar scroll sem comprimir controlos ou sobrepor o chat.

3. `client/src/components/board-memberships/PureBoardMembershipsStep/Item.jsx`
   - Change: receber o objeto `user` e o estado persistido/disabled por props, em vez de voltar a resolver membership e user através de selectors Redux. Os callbacks devem continuar a emitir apenas `user.id`.
   - Preserve: menuitem checkbox, indicador de seleção, avatar, nome, username, disabled, select e deselect.
   - Verify: os consumidores dos Boards mantêm exatamente o mesmo conteúdo e comportamento; o componente deixa de exigir que cada item tenha uma membership presente no store.

4. `client/src/components/board-memberships/PureBoardMembershipsStep/PureBoardMembershipsStep.jsx`
   - Change: passar `boardMembership.user`, estado persistido e ID diretamente para `Item`; formalizar o contrato dos items como `{ id, user, isPersisted }`, sem consultar o Board atual.
   - Change: manter o nome e o wrapper `BoardMembershipsStep` existentes; apenas o componente `Pure` é reutilizável pelo Gantt. O wrapper continua responsável por obter memberships do Board.
   - Preserve: header, pesquisa, autofocus, clear search, empty state, seleção múltipla e ação limpar.
   - Verify: abrir o popup a partir de um cartão e do Gantt produz a mesma lista visual, mas com fontes de dados corretas para cada superfície.

5. `client/tests/gantt-hierarchy-smoke.cjs`
   - Change: retirar “Descrição” da lista de campos obrigatórios do diálogo e afirmar explicitamente que `#gantt-task-description` não existe.
   - Change: afirmar que o dropdown Semantic UI anterior de Pessoa não existe e que o acionador “Adicionar membro” abre o popup pesquisável com os membros do projeto.
   - Change: manter as verificações de Tipo de tarefa, Cor, Progresso e Tarefa geral, incluindo a ausência de progresso para tarefas gerais.
   - Preserve: criação do estado de teste, abertura do painel, Escape, edição e ações de tarefa geral.
   - Verify: o teste falha se a descrição regressar ou se a compactação remover um campo funcional.

6. `client/tests/gantt-ui-smoke.cjs`
   - Change: após abrir “Nova tarefa” no viewport existente de `1440×900`, verificar que o diálogo não contém o campo de descrição e que o footer está dentro da área visível do painel sem scroll no estado inicial.
   - Change: selecionar pelo menos dois membros através do popup, confirmar dois avatares no grupo Pessoa, reabrir a lista para desselecionar um e validar o payload final; cobrir o estado sem selecionados e o acionador adicionar sempre visível.
   - Change: criar dados suficientes para confirmar o limite de cinco avatares e o acionador `+N`, sem depender da ordem visual de nomes; clicar em `+N` deve reabrir a lista completa.
   - Change: acrescentar uma passagem com viewport de altura `768px` apenas para confirmar ausência de sobreposição entre os controlos finais, footer e launcher do chat; não fixar alturas pixel a pixel.
   - Preserve: foco inicial, Escape, restauro de foco, drag/resize, zoom e restantes contratos funcionais do smoke test.
   - Verify: a asserção deve comparar os limites visíveis/scrolláveis do formulário, não snapshots frágeis.

## Scope

- Inherit: painel aberto pelo botão “Nova tarefa”, por seleção de item e por “Adicionar subtarefa”; tarefas normais e gerais recebem a mesma densidade base.
- Verify: desktop `1440×900`, desktop baixo `1024×768`, largura inferior a `680px`, zero/um/cinco/mais de cinco membros, popup pesquisável, mensagens de erro, tarefa sem data, tarefa geral e item existente com descrição histórica.
- Exclude: gestão de memberships do Board, adição de novos utilizadores ao projeto, largura do painel, ordem de campos, backend, migration/coluna `description`, endpoints, representação `details` na timeline, traduções ainda usadas por outros consumidores, regras de datas, dependências, permissões e redesign das ações já alteradas localmente.

## Validation

- Product: abrir “Nova tarefa”, selecionar e remover várias pessoas pelo popup, criar e reabrir o item; editar um item antigo com descrição e confirmar via resposta da API/reload que a descrição não foi limpa; criar também uma tarefa geral e uma subtarefa.
- Interface: confirmar a leitura nome/tipo → hierarquia/pessoa → planeamento → ações, a visibilidade do footer a `1440×900`, comportamento aceitável a `1024×768` e reflow para uma coluna abaixo de `680px`; cobrir zero, um, cinco e mais de cinco membros, pesquisa sem resultados, limpar seleção, erro e ausência de datas.
- System: confirmar que Gantt e Boards usam o mesmo `PureBoardMembershipsStep`, que o wrapper `BoardMembershipsStep` continua ligado apenas ao Board, que nenhum popup ou token paralelo foi criado, que controlos continuam com alvos de `32px` desktop/`36px` touch e que a API recebe updates sem a propriedade `description`.
- Repository: `git diff --check` → sem erros de whitespace.
- Repository: `cd client && npx eslint src/components/gantt/GanttItemPanel.jsx src/components/board-memberships/PureBoardMembershipsStep/PureBoardMembershipsStep.jsx src/components/board-memberships/PureBoardMembershipsStep/Item.jsx tests/gantt-ui-smoke.cjs tests/gantt-hierarchy-smoke.cjs` → sem novos erros.
- Repository: com os serviços de desenvolvimento existentes, executar os smoke tests Gantt com as variáveis de teste já configuradas → painel validado através de hot reload e zero erros de browser. Não executar build, conforme `AGENTS.md`.

## Stop conditions

- Stop if o endpoint de update serializar uma propriedade ausente como `null`; confirmar no request que `description` é realmente omitida antes de validar preservação de dados históricos.
- Stop if os utilizadores recebidos pelo `ProjectGanttProvider` não estiverem disponíveis ao `UserAvatar` através do store global; nesse caso, adaptar primeiro o avatar para receber dados apresentados, sem ligar o Gantt a memberships de um Board arbitrário.
- Stop if tornar `PureBoardMembershipsStep/Item` orientado por props alterar o comportamento dos atuais consumidores dos Boards; preservar o contrato público e separar um primitive genérico apenas se a equivalência não puder ser mantida.
- Stop if a altura mínima de `42px` impedir o footer de ficar visível a `1440×900`; ajustar primeiro padding e gaps, sem reduzir alvos interativos.
- Stop if a compactação exigir alterar o layout global, o launcher do chat ou tokens partilhados; manter a correção dentro do painel.
- Stop if algum texto `ganttDescription` estiver provado como exclusivo deste painel e a equipa quiser removê-lo das traduções; tratar essa limpeza como opcional e separada para não tocar chaves possivelmente partilhadas sem prova.

## Design documentation

- After acceptance and validation: none. A densidade é uma decisão local do painel e deve permanecer expressa junto ao componente.
