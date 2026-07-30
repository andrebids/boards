# Criar um sistema transversal de botões inspirado na HeroUI

Written against: 8e941757bc929ff9a151577069a0e13399696ac5

## Evidence chain

- Surface: cliente web React, começando pelo popup `Editar Anexo` mostrado na captura fornecida e alargando depois às ações de formulário, confirmações, toolbars e botões icon-only.
- Runtime path do piloto: `client/src/components/attachments/Attachments/ItemContent.jsx` abre o popup → `client/src/components/attachments/Attachments/EditStep.jsx` renderiza `Popup.Header`, `Popup.Content`, `Form` e dois `Button` de `semantic-ui-react`.
- Problem: o botão `Guardar` recebe `positive`, portanto herda verde, sombra e altura mínima de 32 px do bloco global em `client/src/lib/custom-ui/styles.css`; `Eliminar` recebe uma classe local absolutamente posicionada e outra sombra. O resultado observado não tem uma anatomia, estados ou hierarquia semântica comum.
- Problem: a mesma fonte global define `.ui.button`, `.ui.positive.button` e `.ui.negative.button` com cores e sombras legadas, mas vários módulos substituem partes desse contrato. No commit auditado existem 94 ficheiros JSX em `client/src/components` com `<Button>`, 43 com `<button>` nativo e pelo menos 9 definições locais de `.deleteButton`.
- Problem: `client/src/lib/custom-ui/index.js` já centraliza `Input`, `Popup`, `FilePicker`, `Masonry` e `CloseButton`, mas não possui um owner equivalente para botões. Os consumidores importam `Button` diretamente de `semantic-ui-react`, por isso não existe uma API única que imponha variante, tamanho e estados.
- Design evidence local: `client/src/styles/glass-theme.css` é carregado por `client/src/index.js` e já define tokens transversais `--app-accent`, `--app-danger`, superfícies, bordo e texto em OKLCH. Esta é a camada atual capaz de fornecer semântica light/dark sem duplicar cores por módulo.
- Design evidence local: `client/src/lib/custom-ui/components/CloseButton/CloseButton.module.scss`, `client/src/components/chat/theme.scss` e os tokens `--card-modal-*` já usam press feedback, focus ring, reduced motion e cores semânticas. O sistema de botões deve convergir estes padrões, não criar uma quarta linguagem.
- Design evidence HeroUI: a documentação oficial de `Button` define variantes `primary`, `secondary`, `tertiary`, `outline`, `ghost`, `danger` e `danger-soft`; tamanhos `sm`, `md`, `lg`; modificadores `isIconOnly` e `fullWidth`; estados hovered, pressed, focus-visible, disabled e pending. Fonte: [HeroUI Button](https://heroui.com/en/docs/react/components/button).
- Design evidence HeroUI: a implementação oficial usa 14 px/500, gap de 8 px, padding horizontal de 16 px, raio de 24 px, altura adaptativa de 40 px em viewport pequena e 36 px a partir de `md`, press `scale(0.97)`, transições separadas para transform/background/shadow e focus ring sem substituir hover/pressed. Fonte: [HeroUI button.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css).
- Design evidence HeroUI: o tema separa fundos e foregrounds (`--accent`/`--accent-foreground`, `--danger`/`--danger-foreground`), deriva hover com `color-mix()`, usa `--disabled-opacity: 0.5`, raio base de 8 px e tokens próprios de focus e motion. Fonte: [HeroUI Theming](https://heroui.com/en/docs/react/getting-started/theming).
- Design evidence HeroUI: `ButtonGroup` partilha variante/tamanho/disabled com os filhos, remove gaps e press-scale, arredonda apenas as extremidades e usa separadores explícitos. Fonte: [HeroUI ButtonGroup](https://heroui.com/en/docs/react/components/button-group).
- Compatibility evidence: HeroUI v3 exige React 19+ e Tailwind CSS 4; o cliente atual usa React 18.2, Vite, Semantic UI React e SCSS Modules, sem Tailwind. Instalar `@heroui/react` para esta alteração obrigaria uma migração de stack sem relação com o objetivo visual. Fonte: [HeroUI Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start).
- Owner atual: tokens globais em `client/src/styles/glass-theme.css`; bundle/overrides legados do Semantic UI em `client/src/lib/custom-ui/styles.css`; exports partilhados em `client/src/lib/custom-ui/index.js`; variantes locais nos `*.module.scss`.
- Scope and affected surfaces: botões visuais do cliente web. O primeiro incremento cobre `Editar Anexo` e `ConfirmationStep`; os restantes consumidores são migrados por famílias, sem alterar comportamento de produto.
- Explicit exceptions: `CloseButton`, cards clicáveis, linhas selecionáveis, tabs, menu items, drag handles e triggers que visualmente não são botões mantêm os seus owners; devem consumir tokens partilhados quando aplicável, mas não recebem automaticamente a anatomia pill.
- Uncertainty: a captura cobre apenas dark mode, mouse e labels curtas. O executor deve validar light/dark, teclado, touch, loading, disabled, icon-only, traduções extensas e grupos antes de remover os estilos legados.

## Design decision

Copiar a arquitetura visual da HeroUI, não a dependência:

1. os valores de marca e de estado pertencem ao tema;
2. `Button` e `ButtonGroup` pertencem a `client/src/lib/custom-ui`;
3. cada consumidor escolhe uma variante pela intenção da ação;
4. módulos de produto controlam apenas layout e exceções comprovadas;
5. o Semantic UI permanece como base transitória de DOM/comportamento até a migração estar completa.

### Contrato visual a adotar

| Propriedade | Contrato |
| --- | --- |
| Tipografia | 14 px, peso 500, `white-space: nowrap`; `lg` usa 16 px |
| Espaçamento | gap interno 8 px; padding horizontal `sm=12`, `md=16`, `lg=16` |
| Altura | mobile/coarse target: `sm=36`, `md=40`, `lg=44`; desktop: `sm=32`, `md=36`, `lg=40` |
| Forma | pill de 24 px por defeito; icon-only é quadrado com a mesma dimensão da altura |
| Primary | `accent` + `accent-foreground`; reservado à ação principal da composição |
| Secondary | superfície neutral preenchida + foreground normal |
| Tertiary | superfície neutral discreta; para ações de suporte em rails/toolbars |
| Outline | transparente + bordo do tema |
| Ghost | transparente em repouso, superfície neutral no hover/pressed |
| Danger | `danger` + `danger-foreground`; confirmação destrutiva |
| Danger soft | `danger-soft` + `danger`; trigger destrutivo antes da confirmação |
| Hover | fundo derivado pelo tema; não alterar geometria |
| Pressed | fundo de pressed + `scale(0.97)`; `sm` pode usar `0.98`, `lg` `0.96` |
| Focus visible | ring de 2 px com offset de 2 px usando `--app-focus`; não mostrar ring permanente no clique por mouse |
| Disabled | opacidade 0.5, cursor `not-allowed`, sem pointer events |
| Pending | conteúdo estável, spinner com `currentColor`, `aria-busy=true`, sem pointer events |
| Motion | transform 250 ms `ease`, background/shadow 100 ms `ease-out`; desativar em `prefers-reduced-motion` |

Regras de intenção:

- Guardar, criar, adicionar e confirmar uma operação normal usam `primary`, não “success” verde.
- Eliminar no ecrã de edição usa `danger-soft`; a confirmação final usa `danger`.
- Cancelar/fechar por texto usa `ghost` ou `secondary`, conforme a superfície.
- Ações auxiliares usam `secondary`, `tertiary` ou `ghost`; nunca competem com a ação principal.
- Uma composição tem no máximo uma ação `primary` visível por grupo.
- `iconOnly` exige accessible name já fornecido por `aria-label`, `title` ou conteúdo equivalente.
- Botões que representam uma superfície inteira, uma linha, uma tab ou um card não são migrados automaticamente para esta anatomia.

## Reuse

- Tokens atuais `--app-dark-*`, `--app-accent`, `--app-accent-soft`, `--app-danger`, `--app-danger-soft`, `--text-primary` e `--text-secondary` em `client/src/styles/glass-theme.css`.
- `Button` de `semantic-ui-react` como implementação transitória dentro do novo wrapper, preservando `type`, `onClick`, `disabled`, `loading`, `icon`, `content`, `fluid`, ref e submissão de forms.
- Padrão de componente e export usado por `client/src/lib/custom-ui/components/CloseButton/*` e `client/src/lib/custom-ui/index.js`.
- `classnames`, já instalado, para compor variantes sem strings manuais.
- `Spinner`/loading que o Semantic UI já fornece durante a fase de adapter; o spinner deve herdar a cor da variante.
- `ConfirmationStep` como owner partilhado de confirmações destrutivas.
- Exemplar de focus/pressed/reduced-motion em `client/src/lib/custom-ui/components/CloseButton/CloseButton.module.scss`.
- Exemplar do piloto em `client/src/components/attachments/Attachments/EditStep.jsx`.

É necessário introduzir um primitive porque o projeto não tem um owner partilhado para a API visual de botões, os imports diretos expõem props de intenção diferentes (`positive`, `negative`, `primary`, `basic`) e os módulos locais não conseguem impor estados consistentes aos outros consumidores.

## Changes

1. `client/src/styles/glass-theme.css`
   - Change: completar os tokens semânticos transversais com `--app-accent-foreground`, `--app-accent-hover`, `--app-default`, `--app-default-hover`, `--app-default-foreground`, `--app-danger-foreground`, `--app-danger-hover`, `--app-danger-soft-hover`, `--app-focus`, `--app-disabled-opacity`, `--app-radius`, `--app-ease-smooth` e `--app-ease-out`.
   - Change: derivar hover/soft com `color-mix(in oklab, ...)`, seguindo a relação HeroUI, mas usando os valores de marca já existentes. Não copiar uma paleta azul/vermelha paralela.
   - Change: expor aliases `--button-*` apenas quando forem específicos do component; cores gerais continuam em `--app-*`.
   - Preserve: tokens `--chat-*`, `--card-modal-*`, `--project-settings-*` e os valores atuais das superfícies até cada owner aderir explicitamente.
   - Verify: alterar `--app-accent` num único local atualiza primary, focus e soft states sem editar módulos de produto.

2. `client/src/lib/custom-ui/components/Button/Button.jsx`, `Button.module.scss` e `index.js`
   - Change: criar `Button` com `React.forwardRef` por cima de `SemanticUIButton`.
   - Change: suportar `variant="primary|secondary|tertiary|outline|ghost|danger|danger-soft"`, `size="sm|md|lg"`, `isIconOnly`, `fullWidth`, `isPending` e `isDisabled`; defaults `variant="primary"` e `size="md"`.
   - Change: mapear `fullWidth → fluid`, `isPending → loading + aria-busy`, `isDisabled → disabled`; encaminhar os restantes props de DOM/Semantic necessários durante a migração.
   - Change: não aceitar `positive`, `negative`, `primary`, `secondary` ou `basic` como API nova. Se compatibilidade temporária for indispensável, normalizar estes props dentro do adapter, emitir uma única variante determinística e remover a compatibilidade no fim da migração.
   - Change: aplicar o contrato da tabela com selectors suficientemente específicos para vencer `custom-ui/styles.css`, sem aumentar specificity nos consumidores.
   - Change: icons inline herdam `currentColor`, usam 16 px no desktop e 20 px no target mobile, não capturam pointer events e não alteram a altura da linha.
   - Change: usar `:hover`, `:active`, `:focus-visible`, `:disabled`, `[aria-disabled]` e `[aria-busy]`; não depender de data attributes da HeroUI, porque não existe React Aria neste stack.
   - Change: preservar largura do conteúdo durante pending para o botão não saltar.
   - Preserve: submit implícito, `onClick`, refs, labels traduzidas e integração com forms Semantic UI.
   - Verify: todas as variantes/tamanhos mantêm a mesma baseline, ring não é cortado e nenhum estado recupera a sombra cinzenta legada.

3. `client/src/lib/custom-ui/components/ButtonGroup/ButtonGroup.jsx`, `ButtonGroup.module.scss`, `Separator.jsx`, `index.js` e `client/src/lib/custom-ui/index.js`
   - Change: criar `ButtonGroup` e `ButtonGroup.Separator`; usar Context apenas para passar `variant`, `size` e `isDisabled` a filhos `Button` diretos.
   - Change: suportar orientação horizontal/vertical e `fullWidth`; remover gap e press-scale dentro do grupo; arredondar só a primeira e última extremidade.
   - Change: o separator é decorativo, com 1 px, 15% de `currentColor` e pointer-events none.
   - Change: exportar `Button` e `ButtonGroup` pelo barrel partilhado.
   - Preserve: os dois grupos atuais (`ProjectSettingsModal/BackgroundPane/BackgroundPane.jsx` e `FilePreviewModal/ImagePreview.jsx`) até a migração da respetiva família.
   - Verify: focus ring usa inset dentro do grupo e borders outline adjacentes não duplicam 2 px.

4. `client/src/components/attachments/Attachments/EditStep.jsx` e `EditStep.module.scss`
   - Change: substituir o import Semantic por `Button` de `../../../lib/custom-ui`.
   - Change: `Guardar` usa `variant="primary"` e `size="md"`; `Eliminar` usa `variant="danger-soft"` e `size="md"`.
   - Change: envolver ambos numa `.actions` flex, com gap de 8 px e `justify-content: space-between`; remover `position:absolute`, offsets e `box-shadow` de `.deleteButton`.
   - Change: manter `Eliminar` fora do form ou declarar explicitamente `type="button"` para nunca submeter a edição.
   - Preserve: focus inicial no título, trim/validação, update condicional, abertura da confirmação e close após guardar.
   - Verify: o popup da captura mostra uma ação primary accent e uma danger-soft, com a mesma altura/raio e sem sombras legadas; labels longas não colidem nem saem do popup.

5. `client/src/components/common/ConfirmationStep/ConfirmationStep.jsx` e `ConfirmationStep.module.scss`
   - Change: substituir `ButtonTypes.POSITIVE/NEGATIVE` por `variant`, default `danger`; migrar todos os call sites para intenção explícita.
   - Change: a confirmação destrutiva usa `danger` e `fullWidth`; confirmações não destrutivas usam `primary`.
   - Change: manter espaço de 8 px entre input opcional e botão e garantir focus-visible dentro do popup.
   - Preserve: texto de confirmação, type-to-confirm, back navigation, handlers e traduções.
   - Verify: apagar anexo percorre `danger-soft trigger → danger confirmation`; voltar restaura o ecrã de edição sem mudar dados.

6. Form actions em `client/src/components/attachments`, `base-custom-field-groups`, `board-memberships`, `boards/Boards/AddStep`, `cards/Edit*`, `cards/MoveCardStep`, `cards/SelectCardTypeStep`, `custom-field-groups`, `labels/LabelsStep`, `lists/SelectListTypeStep`, `task-lists`, `users/EditUser*` e `common/AdministrationModal`
   - Change: migrar por diretório, nunca por replace global. Em cada form, identificar a ação principal, suporte/cancelamento e destruição antes de escolher a variante.
   - Change: mapear `positive` usado em guardar/criar/adicionar para `primary`; mapear `negative` de confirmação para `danger`; eliminar sombras, cores, alturas e raios locais que duplicam o primitive.
   - Change: manter em cada module apenas composição (`display`, `gap`, `margin`, alinhamento, largura). Cor, tipografia, altura, raio, hover, pressed, focus, disabled e pending pertencem ao primitive.
   - Preserve: handlers, ordem de tab, validação, loading, disabled, permissões e labels.
   - Verify: cada grupo tem uma única ação primary e nenhuma ação destrutiva usa verde, branco neutro ou a prop `positive`.

7. Ações auxiliares e icon-only em `client/src/components/activities/FilePreviewModal`, `boards`, `cards/CardModal`, `custom-fields`, `labels`, `notifications`, `project-managers`, `projects` e `users/UserSettingsModal`
   - Change: classificar cada `<Button>` como action button, icon-only, button group ou structural trigger.
   - Change: migrar action/icon-only para o primitive com `secondary`, `tertiary`, `ghost`, `outline` ou `isIconOnly`.
   - Change: preservar wrappers especializados já existentes, incluindo `CardModalActionButton`, quando estes representam um contrato de superfície; atualizar internamente os seus tokens/estados em vez de criar outro wrapper.
   - Change: ações icon-only mantêm `aria-label` traduzido e target correspondente ao size; não usar apenas `title`.
   - Preserve: card navigation, menus, popups, tooltips, DnD, upload, gallery e keyboard shortcuts.
   - Verify: uma ação auxiliar nunca ganha o peso de primary apenas por ser o primeiro botão do DOM.

8. Botões nativos em `client/src/components/chat`, `comments`, `cards/CardModal`, `task-lists` e restantes resultados de `rg -l --glob '*.jsx' '<button' client/src/components`
   - Change: auditar os 43 ficheiros, mas migrar apenas controlos que visualmente correspondem ao contrato Button.
   - Change: manter row buttons, card buttons, tabs, message bubbles, close controls e outras superfícies compostas nos respetivos owners; substituir valores hardcoded de focus, disabled e motion pelos tokens globais quando a semântica for igual.
   - Change: não transformar automaticamente todos os elementos nativos em `<Button>`; a homogeneidade vem da intenção e dos tokens, não de uma única silhueta para todos os elementos clicáveis.
   - Preserve: semântica HTML, hit areas específicas, drag/click boundaries e responsive behavior.
   - Verify: nenhuma superfície inteira se torna uma pill e nenhum controlo perde accessible name ou foco visível.

9. `client/src/lib/custom-ui/styles.css`, modules migrados e `client/package.json`
   - Change: só depois de todos os consumidores visuais terem owner, remover do bloco final de `custom-ui/styles.css` as decisões de apresentação de `.ui.button`, `.ui.positive.button` e `.ui.negative.button` que já forem cobertas pelo primitive. Manter apenas o mínimo estrutural necessário ao Semantic UI.
   - Change: remover classes locais obsoletas, começando pelas `.deleteButton` que contêm apenas cor/sombra/altura/raio/hover.
   - Change: adicionar a `no-restricted-imports` do ESLint uma restrição a `Button` importado de `semantic-ui-react`, com mensagem para usar `lib/custom-ui`; outros componentes Semantic UI continuam permitidos.
   - Change: registar num comentário junto à restrição que wrappers especializados devem compor ou consumir o contrato partilhado, não reabrir imports diretos.
   - Preserve: imports de `Form`, `Modal`, `Input`, `Icon`, `Popup` e outros componentes Semantic UI fora deste plano.
   - Verify: `rg -n "Button.*from 'semantic-ui-react'|Button.*from \"semantic-ui-react\"" client/src` não encontra imports diretos de `Button`, salvo uma única importação dentro do novo adapter.

10. Catálogo de validação em `client/src/lib/custom-ui/components/Button/Button.stories.jsx` somente se o projeto já possuir um owner de stories durante a execução; caso contrário, criar uma rota/página de desenvolvimento não é autorizado por este plano
   - Change: sem Storybook atual, validar através de superfícies reais e manter uma matriz manual no PR/issue: variantes × tamanhos × estados × light/dark.
   - Change: não adicionar Storybook, Tailwind ou uma nova dependência de screenshots para documentar o primitive.
   - Preserve: stack e scripts atuais.
   - Verify: o sistema pode ser validado no servidor existente sem build.

## Migration order

1. Tokens + `Button` + `ButtonGroup`, sem alterar consumidores.
2. Piloto `Editar Anexo` + `ConfirmationStep`.
3. Forms simples de popup/modal.
4. Actions e icon-only.
5. Wrappers especializados e botões nativos elegíveis.
6. Remoção de overrides legados + lint gate.

Cada etapa deve ser um incremento funcional e visualmente verificável. Não remover o fallback global antes de a última família ter migrado.

## Scope

- Inherit: todos os consumidores que importarem o novo `Button`/`ButtonGroup`.
- Verify: 94 ficheiros atuais com `<Button>`, 43 com `<button>` e qualquer consumer novo encontrado pelo comando de inventário.
- Verify: dark theme global, áreas claras de administração/project settings, popups, modais, card modal, kanban, chat e file preview.
- Exclude: instalação de HeroUI, React 19, Tailwind CSS 4, React Aria, rebranding da paleta, alterações ao backend/Redux, mudança de texto, permissões ou fluxo de confirmação.
- Exclude: forçar a anatomia pill em cards, rows, tabs, links, menu items, drag handles ou close buttons.
- Exclude: redesign simultâneo de inputs, selects, modais e outros componentes; apenas os tokens partilhados necessários ao botão entram neste plano.
- Reconcile: `design-plans/card-modal-heroui-layout.md` mantém tokens locais e variantes próprias para o rail do modal. Quando este sistema existir, o executor desse plano deve reutilizar `Button`/tokens globais e manter localmente apenas composição e a variante de contexto comprovada.

## Validation

- Product: editar o nome de um anexo, guardar sem alterações, guardar com alterações, abrir eliminar, voltar e confirmar eliminar.
- Product: percorrer exemplos de criar, guardar, cancelar, apagar, upload/download, loading, disabled, button group, icon-only e full-width sem mudar o resultado funcional.
- Interface: validar no hot reload em `http://localhost:3008`; não executar build.
- Interface: testar 320×568, 390×844, 768×1024, 1024×768 e 1440×900, mouse, teclado e touch/coarse pointer.
- Interface: testar dark surfaces e superfícies claras; primary/secondary/tertiary/outline/ghost/danger/danger-soft; `sm/md/lg`; texto, ícone+texto e icon-only.
- Interface: testar labels pt-PT e en-US, label curta e label longa, zoom 200%, pending sem layout shift, disabled e focus-visible.
- Interface: confirmar press-scale apenas em botões isolados, nunca num grupo; confirmar `prefers-reduced-motion: reduce`.
- System: confirmar que cores e estados vêm de `glass-theme.css`, anatomia vem do primitive e módulos de produto controlam apenas layout/exceções.
- System: executar `rg -l --glob '*.jsx' '<Button' client/src/components | Measure-Object` e manter o inventário da migração; executar `rg -n --glob '*.module.scss' '\.(deleteButton|submitButton|saveButton|actionButton)' client/src/components` e justificar as classes remanescentes.
- Repository: `npm run client:lint` → termina sem erros novos.
- Repository: testes focados existentes das superfícies alteradas → terminam sem regressões; não executar a suite/build de produção sem pedido explícito.

## Stop conditions

- Stop if o adapter não conseguir preservar submit, loading, disabled, ref ou icon rendering do Semantic UI; corrigir primeiro a API do primitive, sem criar exceções por consumidor.
- Stop if specificity obrigar `!important` em cada módulo; a regra deve ser resolvida uma vez no owner `Button.module.scss`.
- Stop if uma ação não tiver intenção inequívoca entre primary, suporte e destruição; confirmar a hierarquia da composição antes de escolher uma variante.
- Stop if um button nativo representar uma superfície/row/card; manter o owner especializado e apenas partilhar tokens aplicáveis.
- Stop if light surfaces tiverem contraste insuficiente com os tokens dark atuais; completar os tokens por theme/scope antes de migrar a superfície, sem hardcode local.
- Stop if a migração exigir HeroUI, Tailwind ou React 19; esse trabalho pertence a uma migração de stack separada.
- Stop if alterações locais não relacionadas nos mesmos ficheiros colidirem com a migração; preservar o worktree do utilizador e dividir o incremento.

## Design documentation

- After acceptance and validation: criar `DESIGN.md` apenas quando o sistema estiver aplicado às famílias principais. Documentar a tabela de variantes, regra de uma primary por grupo, tamanhos, estados, tokens owners, exceções estruturais e a proibição de imports diretos de `Button` do Semantic UI.
