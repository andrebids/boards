# Reorganizar o modal de cartão Project com uma composição inspirada na HeroUI

Written against: 60850dc30a5e67f3eab95319f79215909d3c2024

## Evidence chain

- Surface: cartão do tipo Project aberto em `CardModal`, conforme a captura fornecida, servido localmente em `http://localhost:3008`.
- Runtime path: `client/src/components/cards/CardModal/CardModal.jsx` → `client/src/components/cards/CardModal/ProjectContent.jsx` → `TaskLists`, `Communication`, `Comments` e a barra lateral de ações.
- Problem: o cabeçalho contém apenas ícone e título; membros, rótulos e data ficam num bloco separado à esquerda, enquanto a lista fica no topo da barra lateral. A leitura faz um percurso em ziguezague antes de chegar à descrição e às tarefas.
- Problem: todos os comandos da barra lateral usam a mesma caixa cinzenta, sombra e peso visual. Adicionar membro, duplicar, arquivar e eliminar parecem ter a mesma intenção e prioridade.
- Problem: o modal usa uma grelha Semantic UI fixa de 12/4 colunas, largura base de 880 px e margens internas baseadas em deslocamentos de 40 px. A densidade resultante deixa a área principal estreita e depende de margens negativas nos comentários, atividades e tarefas.
- Problem: `.wrapper` em `ProjectContent.module.scss` cria uma superfície clara dentro de um modal global `.glass` escuro. `glass-modal.css` ainda identifica modais de cartão através de `[class*="_wrapper_"]`, acoplando o resultado ao nome compilado de uma classe CSS Module.
- Problem: a lista de ações mantém `position: sticky`, mas o modal não possui uma composição explícita de header fixo + body com scroll interno. Em cartões extensos, o contexto do título e o botão de fechar afastam-se do conteúdo em edição.
- Design evidence: o MCP oficial da HeroUI v3 define `Modal.Header`, `Modal.Body`, `Modal.Footer`, scroll interno e tamanhos responsivos; a variante `cover` usa margens de 16 px em mobile e 40 px em desktop. Fonte consultada pelo MCP: `https://heroui.com/en/docs/react/components/modal`.
- Design evidence: os princípios oficiais recomendam intenção semântica para ações, composição sobre configuração e progressive disclosure. Fonte consultada pelo MCP: `https://heroui.com/en/docs/react/getting-started/design-principles`.
- Design evidence: `Card` separa `Header`, `Content` e `Footer` e usa variantes por proeminência; `Tabs` possui variante secundária com indicador sublinhado; `ProgressBar` separa output, track e fill. Fontes consultadas pelo MCP: `https://heroui.com/en/docs/react/components/card`, `https://heroui.com/en/docs/react/components/tabs` e `https://heroui.com/en/docs/react/components/progress-bar`.
- Design evidence: o tema HeroUI usa escala base de 4 px, raio base de 8 px, superfície branca, background cinzento muito claro, bordos discretos, backdrop preto a 50% e sombra própria para overlays.
- Design evidence local: `client/src/styles.module.scss` já aplica Plus Jakarta Sans globalmente e o projeto já usa raio de 8 px noutras superfícies.
- Owner: shell e tipo de cartão em `CardModal.jsx`/`CardModal.module.scss`; composição Project em `ProjectContent.jsx`/`ProjectContent.module.scss`; overrides globais do modal em `client/src/styles/glass-modal.css`; tabs em `Communication.*`; tarefas e progresso em `TaskLists/Item.module.scss` e `task-lists/TaskList/*`; comentários em `comments/Comments/*`.
- Scope and affected surfaces: apenas o modal do cartão Project no primeiro incremento. Story deve permanecer funcional e visualmente inalterado, exceto por regras partilhadas que sejam explicitamente verificadas.
- Explicit exceptions: preservar o novo `CardImageCarousel` e `hideImagesWhenNotAllVisible`, que já são alterações locais não concluídas.
- Uncertainty: o conteúdo e as permissões do cartão autenticado devem ser validados no browser durante a execução; a captura não cobre estados vazios, leitura, arquivo, lixo ou mobile.

## Design decision

Adotar uma composição de workspace clara e flat, inspirada na HeroUI, sem instalar HeroUI neste incremento. O modal Project terá:

1. um header estável com tipo, título e botão de fechar;
2. uma faixa de metadados que reúne criador, membros, rótulos, data, cronómetro e lista;
3. um body com scroll interno e grelha `conteúdo principal + rail de ações`;
4. ações com variantes semânticas, sem caixas elevadas repetidas;
5. secções principais alinhadas pela mesma coluna, sem margens negativas;
6. tabs secundárias sublinhadas, progresso compacto e comentários tratados como superfícies de conteúdo.

Usar a linguagem visual da HeroUI como referência, mas continuar com React 18, Semantic UI, SCSS Modules e os componentes existentes. Não adicionar `@heroui/react`, Tailwind 4 ou React 19: essa migração é independente, aumenta muito o escopo e não é necessária para corrigir o layout.

Tese espacial:

- Caminho principal: título → metadados → descrição → tarefas/anexos → comentários/atividade.
- Suporte: ações frequentes ficam no rail direito, visíveis mas menos proeminentes do que o conteúdo.
- Separação: metadados formam um único grupo; ações de adição, gestão e destruição mantêm grupos e intenções distintas.
- Ritmo: escala de 4 px, usando 4/8/12 px dentro de controlos e 16/24/32 px entre grupos.
- Densidade: compacta nos metadados e ações; mais respirada nas secções de leitura e edição.

## Reuse

- `ClosableModal`, `ClosableContext` e o comportamento atual de close/ESC em `client/src/hooks/use-closable-modal.jsx`.
- `NameField`, `UserAvatar`, `LabelChip`, `DueDateChip`, `StopwatchChip`, `CardImageCarousel`, `CustomFieldGroups`, `TaskLists`, `Attachments` e `Communication`.
- Todos os popups, handlers, seletores, permissões e actions Redux existentes em `ProjectContent.jsx`.
- `Button`, `Icon`, `Tab`, `Progress` e `Comment` de Semantic UI; a alteração é de composição e apresentação.
- Tipografia Plus Jakarta Sans já aplicada globalmente.
- Valores visuais locais inspirados nos tokens HeroUI: base 4 px, raio 8 px, overlay branco, background neutro claro, bordo discreto, accent azul e danger vermelho.
- Exemplar interno: a pilha compacta `CardMembers` planeada em `design-plans/kanban-flat-hierarchy-and-card-members.md` pode ser reutilizada no resumo de membros apenas depois de existir e se aceitar interação através do wrapper popup. Até lá, manter `UserAvatar` diretamente.

Não criar um design system paralelo. Os tokens do modal devem ser custom properties locais em `.wrapperProjectContent`/`.wrapper`, não novas variáveis globais, até existir um `DESIGN.md` e uma decisão de tema transversal.

## Changes

1. `client/src/components/cards/CardModal/CardModal.jsx`
   - Change: adicionar uma classe global estável `card-modal` ao `ClosableModal`, além das classes CSS Module existentes.
   - Change: adicionar `styles.wrapperProject` apenas quando `card.type === CardTypes.PROJECT`; manter `styles.wrapperStory` para Story.
   - Preserve: `closeIcon`, `centered={false}`, navegação entre cartões com setas, `AddAttachmentZone`, permissões e `onClose`.
   - Verify: Project e Story continuam a abrir pelo mesmo owner, mas os overrides globais deixam de depender de `[class*="_wrapper_"]`.

2. `client/src/components/cards/CardModal/CardModal.module.scss`
   - Change: manter `.wrapper` como base e criar `.wrapperProject` com largura `min(1040px, calc(100vw - 32px))`, `max-height: calc(100vh - 48px)`, margem vertical de 24 px e overflow oculto.
   - Change: em viewport inferior a 768 px, usar `width: calc(100vw - 16px)`, `max-height: calc(100vh - 16px)` e margem de 8 px.
   - Preserve: largura atual e breakpoint próprios de `.wrapperStory`; não aplicar a nova largura Project ao Story.
   - Verify: a shell Project não ultrapassa a viewport, mantém cantos visíveis e não cria scroll horizontal a 320 px.

3. `client/src/components/cards/CardModal/ProjectContent.jsx`
   - Change: remover apenas os wrappers estruturais `Grid`, `Grid.Row` e `Grid.Column`, substituindo-os por owners semânticos locais: `header`, `metadataBar`, `bodyGrid`, `mainContent` e `actionRail`. Remover `Grid` do import, preservando `Button` e `Icon`.
   - Change: manter o título editável e o ícone de tipo no `header`, reservando espaço à direita para o close icon do modal.
   - Change: mover o seletor de lista da barra lateral para `metadataBar`, depois de data/cronómetro, usando exatamente o `ListsPopup`, `listButton`, nome e permissões existentes.
   - Change: manter criador, membros, rótulos, data e cronómetro na mesma faixa de metadados, em itens auto-contidos que podem quebrar linha. Não ocultar labels textuais nem converter valores em icon-only.
   - Change: manter `CardImageCarousel` como primeiro elemento de `mainContent` e preservar as alterações locais `hideImagesWhenNotAllVisible`.
   - Change: dividir o rail em `Adicionar ao cartão` e `Ações`; marcar apenas o botão de eliminar com `styles.actionButtonDanger`.
   - Change: manter o DOM do conteúdo principal antes do rail. Em mobile, o rail surge depois do conteúdo, evitando divergência entre ordem visual, teclado e leitores de ecrã.
   - Preserve: todos os handlers, popups, confirmações, Redux actions, permissões, estados de arquivo/lixo, drag-and-drop, edição de descrição, relógio e subscrição.
   - Verify: abrir cada popup a partir da nova posição devolve os mesmos dados, âncoras e resultados; lista, data e cronómetro continuam editáveis conforme permissões.

4. `client/src/components/cards/CardModal/ProjectContent.module.scss`
   - Change: definir na raiz local os tokens `--card-modal-background`, `--card-modal-surface`, `--card-modal-surface-secondary`, `--card-modal-border`, `--card-modal-text`, `--card-modal-muted`, `--card-modal-accent`, `--card-modal-danger` e `--card-modal-radius`.
   - Change: usar background neutro claro no body, superfície branca no header e rail, bordo `1px` discreto e raio de 8 px. Evitar gradientes, blur interno e sombras em secções aninhadas.
   - Change: compor `header` com padding `20px 24px 12px`, título de 20 px/700/28 px e ícone de 20 px; nomes longos quebram linha sem entrar na área de fechar.
   - Change: compor `metadataBar` como `display:flex`, `flex-wrap:wrap`, `gap:12px 16px`, padding `0 24px 20px` e background da superfície. Cada item usa label de 11 px/600, texto muted e valor com altura mínima de 32 px.
   - Change: representar membros numa pilha compacta com avatares de 28 px e sobreposição máxima de 6 px somente se isso não reduzir os alvos dos wrappers popup; o botão `+` mantém alvo mínimo de 32×32 px.
   - Change: compor `bodyGrid` como `grid-template-columns: minmax(0, 1fr) 240px`, gap de 24 px, padding de 24 px, `min-height:0` e `overflow-y:auto`.
   - Change: dar a `mainContent` largura mínima zero e ritmo vertical de 24/32 px. Alinhar ícones, títulos, descrição, custom fields, task lists, anexos e comunicação à mesma origem; eliminar a dependência visual de `margin-left:40px`.
   - Change: manter secções comuns transparentes por defeito. Usar superfície branca apenas para campos editáveis, empty states, composer e conteúdo que precise de delimitação; não envolver cada secção num card.
   - Change: tornar `actionRail` sticky no desktop, com `top:0`, superfície branca, bordo, raio de 8 px e padding de 12 px.
   - Change: estilizar `.actionButton` com altura mínima de 36 px, background transparente, `box-shadow:none`, raio de 8 px, padding horizontal de 10 px e texto de 13 px/600. Hover usa `--card-modal-surface-secondary`; focus-visible usa ring azul.
   - Change: `.actionButtonDanger` usa texto/ícone danger e hover danger-soft; arquivar permanece ação normal, não destrutiva.
   - Change: títulos dos grupos usam 11 px/600 e muted; separar grupos por 16 px, sem aumentar a proeminência dos botões.
   - Change: abaixo de 768 px, `bodyGrid` passa a uma coluna, o rail deixa de ser sticky e os seus botões usam uma grelha de duas colunas; abaixo de 480 px passam a uma coluna.
   - Preserve: Plus Jakarta Sans herdada e cores funcionais próprias de labels, due date e stopwatch.
   - Verify: squint test identifica primeiro título, depois metadados, conteúdo e por fim ações; não existem três superfícies de igual contraste competindo entre si.

5. `client/src/styles/glass-modal.css`
   - Change: substituir os seletores de cartão baseados em `[class*="_wrapper_"]` por `.ui.modal.glass.card-modal`.
   - Change: para `card-modal`, aplicar ao content a superfície branca, texto escuro, raio de 8 px, bordo discreto e sombra de overlay; desativar os pseudo-elementos `::before`/`::after`, blur e distorção apenas neste modal.
   - Change: posicionar o close icon a 16 px do topo/direita, com alvo de 32×32 px, fundo neutro transparente em repouso, hover secundário, texto escuro e sem sombra persistente.
   - Change: manter os restantes modais `.glass` inalterados.
   - Preserve: dimmer, stacking de popups e exceções de `project-settings` e `label-form-modal`.
   - Verify: nenhuma alteração visual aparece em Administration, User Settings, Project Settings ou formulários de labels.

6. `client/src/components/cards/CardModal/Communication.jsx` e `Communication.module.scss`
   - Change: adicionar classes locais à raiz do `Tab` e ao menu para controlar a composição sem depender apenas de overrides globais.
   - Change: manter o comportamento `secondary + pointing`, mas apresentá-lo como tabs secundárias HeroUI: fundo transparente, texto muted, ativo escuro, indicador azul de 2 px, sem caixas, bordos laterais ou sombra.
   - Change: usar altura de 36 px, gap de 4 px e painel com padding superior de 16 px.
   - Preserve: labels traduzidas, seleção inicial, montagem de `Comments` e `CardActivities`.
   - Verify: Comentários e Ações continuam navegáveis por teclado e o estado ativo não depende apenas da cor de fundo.

7. `client/src/components/cards/CardModal/TaskLists/Item.module.scss`, `client/src/components/task-lists/TaskList/TaskList.module.scss` e `client/src/components/task-lists/TaskList/Task/Task.module.scss`
   - Change: alinhar título, progresso, contador, tarefas e “Adicionar outra tarefa” à mesma coluna do conteúdo, removendo offsets negativos que só compensavam o ícone a `left:-40px`.
   - Change: manter o ícone como elemento de header, agora em fluxo flex com 20×20 px; preservar o drag handle e o botão de editar.
   - Change: estilizar o progress track com 6 px, raio completo, background secundário e fill accent; manter o output `concluídas/total` à direita.
   - Change: usar linhas de tarefa com altura mínima de 36 px, raio de 8 px e hover secundário; checkbox, assignee e ações mantêm os handlers atuais.
   - Change: reduzir o empty/add state de 54 px para alvo mínimo de 40 px, sem caixa em repouso.
   - Preserve: DnD de listas e tarefas, portal durante drag, edição, conclusão, assignee e criação.
   - Verify: 0, 1 e muitas tarefas, nomes longos, tarefa concluída e drag não alteram largura nem criam scroll horizontal.

8. `client/src/components/comments/Comments/Comments.module.scss`, `Add.module.scss`, `Item.module.scss` e `client/src/components/activities/CardActivities/CardActivities.module.scss`
   - Change: remover `margin-left:-40px` das listas de comentários e atividades; alinhar composer, feed e eventos com o painel das tabs.
   - Change: estilizar o composer como field branco com bordo discreto, raio de 8 px, padding de 10×12 px e focus ring accent.
   - Change: manter mensagens próprias à direita e restantes à esquerda, com largura máxima de 72%, raio de 8 px, bordo discreto e sem sombra forte. Mensagem própria usa success-soft; restante usa superfície branca.
   - Change: em largura inferior a 480 px, aumentar o máximo das mensagens para 88%.
   - Preserve: avatar, autor, data, editar/eliminar, mentions, carregamento incremental e ordem cronológica.
   - Verify: comentários curtos não parecem cartões flutuantes isolados; comentários extensos continuam legíveis e não colidem com ações.

## Scope

- Inherit: cartões Project abertos pelo `CardModal`.
- Verify: o shell partilhado, close icon e overrides de tabs podem tocar Story; Story deve ser comparado antes/depois e permanecer equivalente.
- Verify: popups ancorados, dropdowns, confirmation dialogs e o carrossel dentro do novo overflow.
- Exclude: instalação de HeroUI, React 19, Tailwind 4, migração de Semantic UI, alterações de modelo/API/Redux, novos dados, alteração dos cartões no kanban e implementação de dark mode para este modal.
- Exclude: redesenho completo do modal Story; só corrigir regressões causadas pelo shell partilhado.
- Exclude: alterações às funcionalidades, permissões, textos traduzidos ou ordem funcional das ações.

## Validation

- Product: abrir um cartão Project e confirmar edição de título/descrição, membros, rótulos, lista, data, cronómetro, task lists, anexos, comentários, subscrição, tipo, duplicação, movimento, arquivo e eliminação.
- Product: confirmar close pelo X, backdrop e ESC; confirmar que setas esquerda/direita continuam a navegar entre cartões quando nenhum editor/popup está ativo.
- Interface: validar no hot reload em `http://localhost:3008` a 1440×900, 1024×768, 768×1024, 390×844 e 320×568.
- Interface: testar título curto e muito longo; sem/com muitos membros e labels; sem/com data e cronómetro; descrição vazia/extensa; 0/1/muitas task lists; 0/1/muitos anexos e comentários.
- Interface: testar editor, leitura, lista fechada, arquivo e lixo; confirmar que ações ausentes não deixam lacunas.
- Interface: validar zoom a 200%, locale pt-PT e en-US, scroll interno, rail sticky, tabs e foco visível.
- Interface: abrir cada popup perto do topo e fundo do modal e confirmar que não é cortado pelo novo overflow; confirmar que carrossel e lightbox permanecem acima do modal.
- System: confirmar que `.card-modal` é o único selector global para os overrides específicos e que não restam selectors de cartão baseados em nomes CSS Module compilados.
- System: confirmar que os componentes e handlers existentes continuam como owners; não criar cópias locais de Avatar, Chip, Progress, Tabs ou Modal.
- Repository: `npm run client:lint` → termina sem erros novos.
- Repository: não executar build; usar os serviços de desenvolvimento e hot reload conforme `AGENTS.md`.

## Stop conditions

- Stop if `Modal.Content` ou o wrapper real usado por Semantic UI não permitir header fixo + body com scroll sem cortar popups; resolver primeiro a ownership do overflow no shell, sem aplicar `overflow:visible` global.
- Stop if o novo scroll cortar o lightbox/carrossel; preservar a alteração local e ajustar o portal/stacking antes de continuar o polimento.
- Stop if mover o seletor de lista alterar a âncora ou o contexto de `ListsPopup`; manter o comportamento atual e rever apenas a composição visual.
- Stop if remover offsets de 40 px exigir alterar DnD, portal ou cálculo de largura das tarefas; separar essa correção num incremento posterior.
- Stop if uma alteração necessária afetar Story de forma material; introduzir uma variante Project explícita em vez de alargar o redesign.
- Stop if a implementação exigir instalar HeroUI ou atualizar React/Tailwind; isso pertence a uma migração separada.

## Design documentation

- After acceptance and validation: none; não existe atualmente um `DESIGN.md` governante para esta superfície. Se o padrão for depois aplicado também a Story e a outros modais, documentar então os tokens e a anatomia partilhada.
