# Tornar o kanban mais flat, informativo e consistente

Written against: 60850dc30a5e67f3eab95319f79215909d3c2024

## Evidence chain

- Surface: `client/src/components/boards/Board/Board.jsx` → `KanbanContent/KanbanContent.jsx` → `lists/List/List.jsx` → `cards/DraggableCard/DraggableCard.jsx` → `cards/Card/Card.jsx`.
- Problem: a cor configurável da lista é aplicada à coluna e ao botão de adicionar cartão inteiros; o cabeçalho mostra o nome, mas não comunica a cor como estado discreto nem o número de cartões visíveis.
- Problem: na captura fornecida, “Adicionar cartão” apresenta fundo, bordo completo, raio e contraste equivalentes aos de uma superfície independente; o ícone de 20 px com traço forçado a 3 px e o texto em peso 600 reforçam a leitura de um segundo cartão em vez de uma ação de footer.
- Problem: `ProjectContent` e `StoryContent` apresentam títulos, capas, metadados e membros com hierarquias diferentes; os membros podem aparecer em posições diferentes e usam avatares de 28 px sem limite visual.
- Problem: cartões e capas usam sombras, aumento de brilho, escala e, no cartão Story, rotação no hover, contrariando a direção flat aprovada.
- Design evidence: o padrão HeroUI fornecido pelo utilizador organiza o cabeçalho como indicador + título + contador + ações, mantém colunas e cartões em superfícies neutras e apresenta membros numa pilha compacta no rodapé.
- Design evidence: `client/src/styles/glass-theme.css` já define `--glass-bg-rgb`, `--glass-bg-strong-rgb`, `--glass-border`, `--text-primary`, `--text-secondary` e `--accent`, e documenta superfícies escuras e opacas.
- Design evidence: todas as 45 entradas de `client/src/constants/ListColors.js` têm uma classe `background<Cor>` correspondente em `client/src/styles.module.scss`.
- Owner: estrutura e cor das colunas em `client/src/components/lists/List/List.jsx` e `List.module.scss`; superfície base em `client/src/components/cards/Card/Card.module.scss`; conteúdo em `ProjectContent.*` e `StoryContent.*`; avatar em `client/src/components/users/UserAvatar`.
- Scope and affected surfaces: Kanban como superfície principal; GridView herda a apresentação não-inline de `Card` e deve ser ajustada e verificada; ListView usa `isInline` e não deve receber a nova composição de rodapé.
- Uncertainty: a revisão visual do quadro local autenticado terá de ser feita durante a implementação através do ambiente de desenvolvimento e hot reload.

## Design decision

Adotar uma hierarquia flat e neutra para o quadro: a cor da lista deixa de preencher a coluna e passa a ser um indicador compacto no cabeçalho; o cabeçalho passa a mostrar a quantidade de cartões atualmente visíveis; “Adicionar cartão” passa a ser uma ação ghost integrada no footer, sem caixa visível em repouso; Project e Story passam a partilhar uma composição de membros no rodapé; sombras persistentes e transformações decorativas das capas são removidas.

Preservar o dark theme, a largura atual de 272 px, o raio de 8 px, os dados, seletores, permissões e comportamentos do PLANKA. Não instalar nem introduzir componentes HeroUI.

## Reuse

- Tokens globais: `--glass-bg-rgb`, `--glass-bg-strong-rgb`, `--glass-border`, `--text-primary`, `--text-secondary` e `--accent` de `client/src/styles/glass-theme.css`.
- Cores: `globalStyles[\`background${upperFirst(camelCase(list.color))}\`]` de `client/src/styles.module.scss`, seguindo o exemplar `client/src/components/lists/List/EditColorStep.jsx`.
- Dados: `cardIds.length` já produzido pelo seletor `makeSelectFilteredCardIdsByListId`; o contador deve representar os cartões visíveis após os filtros atuais.
- Avatar: `client/src/components/users/UserAvatar/UserAvatar.jsx`, usando a variante existente `size="tiny"` de 24 px e `withCreatorIndicator`.
- Metadados: `DueDateChip`, `StopwatchChip`, `LabelChip`, `CustomFieldValueChip` e os ícones já usados nos dois tipos de cartão.
- Progressive disclosure: manter os padrões de hover existentes de `.headerButton` e `.actionsButton`.
- Espaçamento: reutilizar o gutter horizontal de 8 px de `.cardsOuterWrapper` para alinhar a ação “Adicionar cartão” com os cartões.
- Exemplar: cabeçalho indicador + título + contador + ações e pilha de avatares do HeroUI Kanban fornecido pelo utilizador.

É necessário um novo componente de composição local, `CardMembers`, porque Project e Story precisam de exatamente a mesma ordenação, limite, sobreposição e overflow, e não existe atualmente um owner partilhado para essa apresentação. O componente deve apenas compor `UserAvatar`; não deve duplicar a obtenção de utilizadores nem criar um novo avatar base.

## Changes

1. `client/src/components/lists/List/List.jsx`
   - Change: importar `globalStyles` e reconstruir o conteúdo não editável do cabeçalho como uma linha com indicador, nome e contador.
   - Change: renderizar um indicador circular de 8 px; quando `list.color` existir, aplicar a classe global `background<Cor>`, e quando não existir usar a variante neutra local.
   - Change: renderizar `cardIds.length` como texto secundário junto ao nome. O valor deve continuar a reagir aos filtros, criações, movimentos e arquivos sem estado adicional.
   - Change: substituir o ícone de lápis que abre `ActionsPopup` por `ellipsis horizontal`, mantendo o ícone de arquivo no ramo `canArchiveCards`.
   - Change: remover as classes derivadas de `list.color` de `outerWrapper` e `addCardButton`; a cor permanece configurável e visível no novo indicador.
   - Preserve: edição do nome ao clicar no cabeçalho, drag handle da lista, tipos de lista, permissões, popups, upload por drop, processamento de ficheiros e criação de cartões.
   - Verify: listas sem cor usam indicador neutro; todas as cores sólidas, gradientes e padrão de riscas permanecem reconhecíveis dentro do indicador; nomes longos não colidem com contador, tipo ou ações.

2. `client/src/components/lists/List/List.module.scss`
   - Change: tornar `.outerWrapper` uma superfície neutra com `rgb(var(--glass-bg-rgb))`, `1px solid var(--glass-border)` e sem sombra persistente.
   - Change: converter `.header` numa linha flexível alinhada ao centro e criar owners locais para indicador, conteúdo do título e contador.
   - Change: definir o nome com 14 px, peso 600, line-height 20 px, `var(--text-primary)` e sem `text-shadow`; definir o contador com 12 px e `var(--text-secondary)`.
   - Change: manter o espaço reservado para `.headerButton`, o seu reveal no hover e um hover flat sem sombra.
   - Change: tornar `.addCardButton` uma ação ghost integrada no footer: `background: transparent`, `border: 0` e `box-shadow: none` em repouso, hover e active.
   - Change: alinhar o botão ao gutter dos cartões com margem horizontal de 8 px e largura descontada em 16 px, preservando a altura atual de 36 px.
   - Change: usar `var(--text-secondary)` e peso 500 em repouso; no hover, mudar para `var(--text-primary)` sobre `rgba(255, 255, 255, 0.06)`, sem criar bordo ou elevação.
   - Change: reduzir `.addCardButtonIcon` para 16×16 px, remover o `stroke-width: 3px`, o stroke branco forçado e padding ótico, deixando o ícone herdar a cor do botão.
   - Change: depois de confirmar que nenhum consumidor permanece, remover as variantes locais `outerWrapper<Cor>` e `addCardButton<Cor>`; as classes globais passam a ser a única representação das cores.
   - Preserve: largura de 272 px, gap horizontal de 8 px, altura máxima, estados de favoritos, file-drag, processamento, scroll e overlays.
   - Verify: nenhuma lista volta a receber fundo sólido, gradiente ou padrão; a cor só aparece no indicador e no seletor de cor.
   - Verify: “Adicionar cartão” não apresenta caixa, bordo, brilho ou sombra em repouso e continua claramente acionável pelo ícone, texto e estado de hover.

3. `client/src/components/cards/Card/Card.module.scss`
   - Change: alinhar `.wrapper` com a superfície flat existente: `rgb(var(--glass-bg-strong-rgb))`, `1px solid var(--glass-border)`, raio de 8 px e `box-shadow: none`.
   - Change: no hover, alterar apenas background e border-color; não criar elevação persistente.
   - Change: manter `wrapperRecent` como um accent inset à esquerda, removendo apenas a sombra exterior.
   - Preserve: botão de ações no hover, estado fechado/desativado, upload por drop e os respetivos overlays.
   - Verify: cartões normais, recentes, fechados e em file-drag continuam distinguíveis sem depender de sombra.

4. `client/src/components/cards/Card/CardMembers.jsx`
   - Change: criar uma composição puramente visual com props `userIds`, `creatorUserId` e `withCreator`.
   - Change: manter a ordem atual: criador primeiro quando `withCreator` estiver ativo, seguido de `userIds`; não deduplicar nem alterar os dados recebidos.
   - Change: mostrar no máximo três entradas com `UserAvatar size="tiny"`; quando existirem mais, renderizar um badge circular `+N` com as mesmas dimensões.
   - Change: aplicar `withCreatorIndicator` apenas à entrada do criador.
   - Preserve: tooltip de nome fornecida por `UserAvatar` e ausência de ações de clique nos avatares do cartão.
   - Verify: estados com 0, 1, 3, 4 ou mais entradas mantêm largura previsível e não tapam metadados.

5. `client/src/components/cards/Card/CardMembers.module.scss` e `client/src/components/cards/Card/index.js`
   - Change: definir uma pilha horizontal de avatares de 24 px com sobreposição de 6 px, outline de 2 px na cor da superfície do cartão e ordem visual estável.
   - Change: estilizar o badge `+N` com superfície neutra, texto secundário, tipografia de 11 px/600 e as mesmas dimensões dos avatares.
   - Change: exportar a composição apenas se o padrão de exports da pasta o exigir; caso contrário mantê-la privada ao owner `Card`.
   - Preserve: `UserAvatar.module.scss` e os tamanhos globais do avatar, evitando impactos no resto da aplicação.
   - Verify: fotografia, iniciais e indicador de criador continuam legíveis sobre qualquer cor de avatar.

6. `client/src/components/cards/Card/ProjectContent.jsx` e `ProjectContent.module.scss`
   - Change: substituir `usersNode`, `attachmentsRight` e `creatorDivider` por `CardMembers`.
   - Change: colocar metadados à esquerda e `CardMembers` à direita dentro de um footer flexível único; o footer deve existir quando houver qualquer metadado, membro ou criador a mostrar.
   - Change: preservar `board.alwaysDisplayCardCreator` através de `withCreator`.
   - Change: uniformizar o título em 14 px/600/20 px e remover escala, brilho e contraste da capa no hover.
   - Preserve: capa, etiquetas, campos personalizados, task lists, prazo, stopwatch, descrição, anexos, comentários, notificações, estado fechado e controlo do stopwatch.
   - Verify: cartões compactos e completos usam a mesma posição de membros; task lists e capas não empurram a pilha para fora do cartão.

7. `client/src/components/cards/Card/StoryContent.jsx` e `StoryContent.module.scss`
   - Change: usar `CardMembers` no mesmo footer flexível do Project, passando apenas `userIds`; não mostrar o criador porque Story não o mostra atualmente.
   - Change: manter notificações, lista e anexos à esquerda do footer.
   - Change: uniformizar o título em 14 px/600/20 px e remover escala, rotação, brilho e contraste da capa no hover.
   - Preserve: ordem da capa no Story, descrição mascarada, etiquetas, campos personalizados, estado fechado e conteúdo condicional.
   - Verify: Story sem metadados mas com membros ainda mostra o footer; Story sem membros nem metadados não cria espaço vazio.

8. `client/src/components/boards/Board/GridView.module.scss`
   - Change: remover o fundo claro e padding decorativo de `.card`, deixando o `Card` partilhado ser a superfície visual.
   - Preserve: masonry, spacing de 20 px, loading e criação de cartões.
   - Verify: GridView não apresenta um halo cinzento em redor dos cartões flat e continua legível no fundo do projeto.

## Scope

- Inherit: Kanban com cartões Project e Story; GridView herda a superfície e os conteúdos não-inline do `Card`.
- Verify: listas ativas, fechadas e não persistidas; favoritos ativos; timeline expandida; filtros; cartões recentes; capas; nomes extensos; lista sem cartões; lista com scrollbar; permissões editor e leitura.
- Exclude: ListView/`InlineContent`, CardModal, seleção de membros, modelo de dados, seletores, APIs, comportamento de drag-and-drop, acessibilidade geral, responsividade estrutural do board e novas opções de densidade.
- Exclude: instalação de HeroUI ou alteração da largura atual das colunas.

## Validation

- Product: abrir um quadro Kanban e confirmar que criar, mover, editar, arquivar e abrir cartões continua igual; adicionar e remover membros e confirmar atualização imediata da pilha.
- Interface: validar 1440×900, 1024×768 e largura móvel; testar colunas com 0 e muitos cartões, nomes curtos e longos, 0/1/3/4+ membros, cartões com e sem capa, Project e Story, lista fechada e cartão recente.
- Interface: confirmar que a ação da coluna e a ação do cartão continuam escondidas em repouso e surgem no hover; confirmar que a cor da lista fica limitada ao indicador.
- Interface: validar “Adicionar cartão” e “Adicionar outro cartão” em repouso, hover, active, disabled, file-drag e processamento; confirmar alinhamento com os cartões e ausência de bordo ou sombra nos estados normais.
- Interface: confirmar no GridView que os cartões partilhados mantêm a nova hierarquia sem wrapper claro; confirmar que ListView permanece visualmente inalterada.
- System: confirmar que `UserAvatar` continua como único avatar base e que `CardMembers` é o único owner da pilha nos cartões não-inline.
- System: confirmar que não restam referências às variantes locais `outerWrapper<Cor>` e `addCardButton<Cor>`.
- Repository: `npm run client:lint` → termina sem erros novos.
- Repository: não executar build para esta alteração; usar os serviços de desenvolvimento existentes e validar através do hot reload, conforme `AGENTS.md`.

## Stop conditions

- Stop if alguma entrada de `ListColors` deixar de ter classe global `background<Cor>` correspondente; corrigir primeiro o owner global da paleta em vez de recriar variantes locais.
- Stop if a alteração de `Card` exigir diferenças visuais incompatíveis entre Kanban e GridView; nesse caso introduzir uma variante explícita no owner `Card` antes de duplicar estilos.
- Stop if limitar a pilha a três entradas ocultar uma ação ou informação funcional que não esteja disponível no CardModal.
- Stop if a implementação exigir alteração de seletores, modelo, API ou persistência; isso está fora do plano visual aprovado.

## Design documentation

- After acceptance and validation: none; o repositório não tem atualmente um `DESIGN.md` governante para esta superfície.
