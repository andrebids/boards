# Estilos de grelha na página de entrada

Written against: `4b493a5916648dacd0e5ced6ad1cbb5aa3eced48`

## Evidence chain

- Surface: página de entrada `/`, lista de projetos do utilizador autenticado.
- Problem: a página apresenta todos os projetos com o mesmo peso visual — cartões de `150px` de altura fixa, num número de colunas que só depende do breakpoint. Nada distingue um projeto favorito de um secundário, e o resultado é uma parede uniforme sem pontos de entrada para a leitura.
- Design evidence: `client/src/components/common/Home/Projects.module.scss` fixa `.card { height: 150px }`; `client/src/components/projects/ProjectCard/ProjectCard.jsx` suporta `size="large"` mas a página nunca o usa.
- External evidence: o PLANKA Pro (`pro.demo.planka.cloud`) resolve isto com três estilos de grelha — Regular, Square e Gallery — aplicados **por cima** do agrupamento, não em vez dele. Medido na folha de estilos pública `assets/index-HY0PSWZE.css`: o módulo da grelha contém `_column_`, `_squareGrid_`, `_galleryGrid_` **e** `_title_`/`_titleIcon_` do cabeçalho de grupo, lado a lado. Confirma que o estilo e o agrupamento são dois eixos independentes.
- Runtime evidence: `client/src/sagas/core/services/projects.js` já persiste `projectsOrder` em `user.defaultProjectsOrder` — o mesmo caminho serve para uma segunda preferência.
- Owner: `client/src/components/common/Home/`, com o seletor em `client/src/components/common/HomeActions/RightSide/`.
- Scope and affected surfaces: página de entrada, barra de ações, preferências do utilizador no cliente e no servidor, esquema da base de dados.
- Uncertainty: a regra que o Pro usa para escolher a forma de cada tile não é derivável. Filtrar a pesquisa desloca os índices e quase todos os projetos mantêm a forma, mas um mudou de `1x1` para `2x1` — há uma sequência fixa com um passo de empacotamento. O código é fechado. Este plano aproxima o resultado com uma regra determinística própria.

## Design decision

Separar **estilo de grelha** de **agrupamento**, como no Pro. O agrupamento continua em `HomeViews` e responde ao grupo de botões existente. O estilo passa a ser uma segunda preferência, `projectsGridStyle`, com três valores, e qualquer combinação dos dois eixos é válida.

O estilo vive dentro de `Projects.jsx`, que é o componente que já desenha o cabeçalho do grupo. Assim a grelha em galeria aparece por baixo de "My Own" e "Team" na vista agrupada, e sozinha na vista plana, sem código condicional espalhado.

Não se acrescenta uma vista nova. Uma tentativa anterior modelou o mosaico como um terceiro `HomeView`; foi revertida, porque nessa forma o mosaico nunca poderia coexistir com o agrupamento.

`regular` é o valor por omissão. Quem não mexer em nada continua a ver a página exatamente como hoje.

## Reuse

- `ProjectCard`, com uma terceira variante de tamanho. Nenhuma alteração ao comportamento das variantes existentes.
- `selectors.selectFilteredProjectIdsForCurrentUser` e `selectFilteredProjctIdsByGroupForCurrentUser` — pesquisa, ordenação e projetos ocultos funcionam sem código novo.
- O caminho completo de `projectsOrder` como molde para `projectsGridStyle`: ação, entry-action, redutor, seletor, saga, watcher, campo pessoal no servidor.
- `SelectOrderStep` e `SelectOrderStep.module.scss` como molde e folha de estilos do popup de seleção.
- `PlusIcon` e `entryActions.openAddProjectModal` para o botão de criar projeto.

## Changes

1. `client/src/constants/Enums.js` e `server/api/models/User.js`
   - Change: `ProjectsGridStyles = { REGULAR, SQUARE, GALLERY }` nos dois lados.

2. `server/db/migrations/20260917010000_add_user_projects_grid_style.js`
   - Change: coluna `default_projects_grid_style` em `user_account`, `notNullable`, a omitir para `'regular'`.

3. `server/api/models/User.js` e `server/api/controllers/users/update.js`
   - Change: atributo `defaultProjectsGridStyle` com `isIn`, entrada em `PERSONAL_FIELD_NAMES` e no corpo aceite pelo `update`.
   - Rationale: sem o valor no servidor o `PATCH` falha em silêncio — `updateProjectsGridStyle` engole o erro — e a escolha perder-se-ia no reload.

4. Cliente, caminho da preferência
   - Change: `PROJECTS_GRID_STYLE_UPDATE` em `ActionTypes` e `EntryActionTypes`; `updateProjectsGridStyle` em `actions/projects.js` e `entry-actions/projects.js`; campo no estado inicial, no `CORE_INITIALIZE` e no `switch` de `reducers/core.js`; `selectProjectsGridStyle` em `selectors/core.js`; serviço e watcher em `sagas/core/`.

5. `client/src/components/common/Home/Projects.jsx`
   - Change: lê `selectProjectsGridStyle` e delega o corpo a `RegularGrid`, `SquareGrid` ou `GalleryGrid`.
   - Preserve: cabeçalho, ícone do grupo, `withTypeIndicator` e a verificação `canAdd`.

6. `RegularGrid.jsx`, `SquareGrid.jsx`, `GalleryGrid.jsx`, `GalleryTile.jsx`, `AddTile.jsx`
   - Change: `RegularGrid` recebe o `Grid`/`Grid.Column` que estava em `Projects.jsx`, sem alterações de medidas.
   - Change: `GalleryTile` escolhe a forma — primeiro projeto e favoritos a `large`, depois `index % 7` distribui `wide` e `tall`, restantes `small`.
   - Change: `AddTile` é o botão de criar projeto dos estilos quadrado e galeria, separado do `addButton` do estilo regular.

7. `client/src/components/common/Home/Projects.module.scss`
   - Change: estilos dos três modos no mesmo módulo, como no Pro, com os valores medidos na folha deles — galeria `minmax(158px, 1fr)` / `116px` / `gap 14px` / `row dense`, quadrado `minmax(180px, 1fr)` / `aspect-ratio: 1` / `gap 16px`, células com raio 14px e 12px, sombras em duas camadas e elevação no hover.
   - Change: acima de 1600px e de 2000px a galeria e o quadrado aumentam o tile em vez de multiplicar colunas. Não é do Pro; responde a listas curtas em ecrãs largos, onde 12 colunas deixavam metade do ecrã vazio.
   - Change: abaixo de 560px e de 360px, os mesmos recuos que o Pro faz.
   - Change: `prefers-reduced-motion` desliga a animação de entrada e as elevações.

8. `client/src/components/projects/ProjectCard/ProjectCard.jsx` e `ProjectCard.module.scss`
   - Change: variante `fluid`, com `container-type: inline-size` e tipografia em `clamp()` com unidades `cqi` — título `clamp(12px, 10cqi, 22px)`, descrição `clamp(10px, 5.5cqi, 13px)`, iguais ao `wrapperFluid` do Pro.
   - Change: na variante, véu do cover a `0.3` e `text-shadow: 0 1px 2px rgba(0,0,0,.45)` no título, como no cartão deles.
   - Rationale: a galeria tem tiles de quatro larguras. Com variantes discretas o título salta entre dois tamanhos; com container queries acompanha a largura real da célula.
   - Preserve: `small` e `large` intactos — grelha regular e sidebar não mudam.

9. `client/src/components/common/HomeActions/RightSide/SelectGridStyleStep.jsx` e `RightSide.jsx`
   - Change: popup de seleção do estilo, entre a ordenação e o grupo de vistas.
   - Rationale: popup e não um segundo grupo de botões, porque a barra já rola na horizontal em ecrãs estreitos e mais três botões agravavam isso.

10. `client/src/components/common/Home/Home.jsx`
   - Change: o `switch` passa a ter `default` em vez de um caso vazio.
   - Rationale: um valor de vista gravado que o build já não reconheça deixava `View` a `undefined` e deitava a página abaixo com um ecrã de erro. Passa a recuar para a vista agrupada.

11. `client/src/locales/{en-US,en-GB,pt-PT}/core.js`
   - Change: `regularGrid`, `squareGrid`, `galleryGrid` e `selectGridStyle_title`.

## Verify

- O popup mostra os três estilos e marca o ativo.
- Cada estilo funciona nas duas vistas: agrupada com cabeçalhos por cima da grelha, plana sem cabeçalhos.
- Escolher um estilo, recarregar, e mantém-se — confirma que o `PATCH` passou a validação e que a coluna existe.
- Marcar um favorito na galeria promove-o a `2x2` sem recarregar.
- Acima de 1600px e de 2000px o tile cresce e o número de colunas não dispara.
- A 380px nenhum tile transborda e a página não ganha scroll horizontal.
- Com `regular`, a página fica idêntica à anterior a esta alteração.
