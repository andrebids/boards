# Integrar confirmações críticas com uma linguagem AlertDialog inspirada no HeroUI

Written against: `ed81688869769aeb796c9d35e792033001edaf80`

## Evidence chain

- Surface: confirmações críticas do cliente React, começando pela importação de PowerPoint e pela eliminação de uma etiqueta padrão.
- Problem: a aplicação mistura `window.confirm()`, `Modal` Semantic UI sem anatomia comum e `ConfirmationStep` dentro de popups ancorados. A decisão crítica não tem uma apresentação nem um comportamento de dismiss uniforme.
- Design evidence: [HeroUI AlertDialog](https://heroui.com/en/docs/react/components/alert-dialog) separa backdrop, contentor, diálogo, ícone de estado, título, corpo e rodapé de ações. Os seus estados `warning` e `danger` usam um ícone em superfície suave, e confirmações críticas exigem ação explícita por defeito.
- Design evidence local: `client/src/styles/glass-modal.css` já define superfícies glass para `Modal`; `client/src/styles/glass-theme.css` já possui `--app-danger`, `--app-danger-soft`, `--app-warning` e as superfícies escuras; `client/src/lib/custom-ui` já exporta `Button`, `CloseButton` e `Popup`.
- Runtime owners: `PresentationImportConfirmModal.jsx` e `DefaultLabelItem.jsx` já controlam um `Modal`; `ConfirmationStep.jsx` atende 19 usos em popups/steps; existem cinco confirmações nativas no chat e Gantt.
- Compatibility: não instalar `@heroui/react`. A referência visual atual do HeroUI v3 assenta em React 19 e Tailwind CSS 4; este cliente usa React 18, Semantic UI e SCSS Modules. A integração deve adaptar a anatomia e acessibilidade à stack existente.
- Uncertainty: `ConfirmationStep` é renderizado dentro de um popup ancorado. Um `Modal` portalizado dentro desse fluxo só pode substituir o popup após validar stacking, focus return e o comportamento de `onBack`.

## Design decision

Criar um primitive local `AlertDialog`, inspirado na anatomia HeroUI e composto sobre o `Modal` Semantic UI existente. Ele será reservado a decisões que bloqueiam ou tornam irreversível uma ação: apagar, arquivar, sair e substituir conteúdo.

Não o usar para falhas de carregamento, validação de campos, avisos persistentes ou toasts. Esses casos pertencem ao futuro primitive de feedback/alerta e continuam fora deste plano.

### Contrato visual

| Parte | Decisão |
| --- | --- |
| Backdrop | scrim escuro; blur apenas onde o modal glass já é aplicado; movimento removido em `prefers-reduced-motion` |
| Placement | centro em desktop; no mobile, posicionamento baixo, com largura `calc(100vw - 32px)` e margem segura |
| Diálogo | superfície escura/glass existente, bordo discreto, raio 16 px e largura confortável para uma decisão curta |
| Cabeçalho | ícone opcional de 40 px numa superfície suave + título legível; botão fechar só quando o diálogo for dismissable |
| Semântica | `default`, `accent`, `success`, `warning`, `danger`; apagar/arquivar usam `danger`, substituições e perda de alterações usam `warning` |
| Corpo | uma consequência concreta e, quando aplicável, o nome do objeto ou input “escreva para confirmar” |
| Rodapé | cancelar primeiro com `secondary`; ação de confirmação à direita com `primary` ou `danger`; nunca mais de uma ação forte |
| Dismiss | `danger` e `warning` críticos bloqueiam clique fora e Escape; o utilizador escolhe Cancelar ou Confirmar |
| Acessibilidade | `role="alertdialog"`, label/description ligados, foco inicial no botão Cancelar ou no input de confirmação, foco devolvido ao trigger após fechar |

## Reuse

- Tokens de `client/src/styles/glass-theme.css` e a superfície de `client/src/styles/glass-modal.css`.
- `Button` e `CloseButton` de `client/src/lib/custom-ui`, incluindo estados de pending, focus e reduced motion já consolidados.
- `Modal` de `semantic-ui-react` como adaptador transitório de overlay, scroll lock e portal.
- `PresentationImportConfirmModal.jsx` e o modal em `DefaultLabelItem.jsx` como pilotos controlados.
- O texto, `typeValue`, `typeContent`, handlers e traduções já passados para `ConfirmationStep`.

É necessário um novo primitive porque `ConfirmationStep` só governa conteúdo de popup e os modais controlados atuais não partilham nem estrutura, nem tons, nem regras de dismiss.

## Changes

1. Criar o primitive `AlertDialog`.
   - Paths: `client/src/lib/custom-ui/components/AlertDialog/AlertDialog.jsx`, `AlertDialog.module.scss`, `index.js` e `client/src/lib/custom-ui/index.js`.
   - Change: expor uma API controlada com `open`, `tone`, `title`, `description`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `isPending`, `isDismissable`, `typeValue` e `typeContent`.
   - Change: compor `Modal` com as zonas Header, Body e Footer; aplicar `role="alertdialog"` e ids estáveis para título/descrição.
   - Preserve: o stack de modais, os botões e as traduções existentes; não introduzir HeroUI, Tailwind ou React Aria.
   - Verify: os cinco tons, as ações longas, o pending, Cancelar, Escape/clique fora quando permitido e teclado funcionam em 320 px, 768 px e desktop.

2. Aplicar o piloto aos dois modais já controlados.
   - Paths: `client/src/components/presentation/PresentationImportConfirmModal.jsx` e `client/src/components/common/AdministrationModal/DefaultLabelsPane/DefaultLabelItem.jsx`.
   - Change: Presentation Import passa a `tone="warning"`, explica a substituição e mantém Cancelar/Importar explícitos. Eliminar etiqueta passa a `tone="danger"`, conserva a copy de impacto e usa a ação danger.
   - Preserve: ficheiro pendente, nenhum POST ao cancelar, estado de criação, handlers de delete e permissões.
   - Verify: os dois fluxos apresentam a mesma anatomia, mas continuam corretos para a respetiva intenção.

3. Validar a migração de `ConfirmationStep` sem alterar todos os consumidores de uma vez.
   - Paths: `client/src/components/common/ConfirmationStep/ConfirmationStep.jsx`, `ConfirmationStep.module.scss` e uma superfície piloto que o usa, recomendada: `client/src/components/attachments/Attachments/EditStep.jsx`.
   - Change: testar se o step consegue abrir `AlertDialog` mantendo o popup de origem estável, com Cancelar a restaurar o step anterior por `onBack` e a confirmação a preservar `onConfirm`.
   - Preserve: `typeValue`, seleção do input, navegação de volta e foco do popup de edição.
   - Verify: abrir “Eliminar anexo” não cria dois backdrops, não fecha o popup antes da decisão e devolve o foco ao controlo que iniciou a ação.
   - Stop condition: se o portal do `Modal` não puder coexistir com o popup sem falhas de stacking/foco, não forçar este caminho. Criar em alternativa `useConfirmationDialogInClosableContext`, migrando os call sites para um diálogo controlado separado.

4. Migrar todas as confirmações baseadas em `ConfirmationStep` por famílias.
   - Paths: chamadas atuais em attachments, cards, task lists, boards, listas, labels, membros, custom fields, project managers e administração de utilizadores.
   - Change: cada confirmação recebe `danger` para apagar/arquivar/desativar/remover e `primary` ou `warning` para ativar, atribuir owner ou decisões reversíveis. O input “escreva para confirmar” permanece apenas nas destrutivas de alto impacto.
   - Preserve: cada action, `onBack`, copy localizada, type-to-confirm e a sequência de popups já existente.
   - Verify: a migração herda o primitive e não deixa layouts locais de confirmação nem botões verdes para ações destrutivas.

5. Substituir as confirmações nativas restantes por diálogos controlados.
   - Paths: `client/src/components/chat/MessageList/MessageList.jsx`, `client/src/components/gantt/GanttItemPanel.jsx`, `client/src/components/chat/ConversationActions/ConversationActions.jsx`, `leave-group.js` e `client/src/components/chat/ChatContext/ChatContext.jsx`.
   - Change: guardar em estado local a ação pendente e só despachar/remover/repetir transição depois de `onConfirm`.
   - Preserve: nenhuma ação ocorre ao cancelar; delete de mensagem/tarefa, saída de grupo e proteção de mensagens pendentes mantêm os seus handlers e regras atuais.
   - Verify: para `history.block`, Cancelar mantém a navegação bloqueada e Confirmar chama `unblock()` antes de `transition.retry()` exatamente uma vez.

6. Consolidar e proteger o contrato.
   - Paths: primitive novo, SCSS global relevante e testes focados próximos dos consumidores migrados.
   - Change: retirar apenas os estilos locais obsoletos dos modais convertidos; não alterar `Message`, `Toaster`, `WebPushPrompt` ou estados de erro inline nesta entrega.
   - Change: adicionar testes de render/integração onde já existe infraestrutura para assegurar o mapa de tom, as regras de dismiss e os callbacks; manter a validação visual manual nos serviços de desenvolvimento, sem build.
   - Verify: `rg` não encontra `window.confirm` nos cinco fluxos migrados e não existe um segundo componente de confirmação controlada fora de `lib/custom-ui`.

## Migration order

1. Primitive + estilos + export.
2. Pilotos Presentation Import e Default Label.
3. Prova de compatibilidade `ConfirmationStep`/popup com o anexo.
4. Migração das famílias de `ConfirmationStep`.
5. Conversão dos cinco `window.confirm` e validação do bloqueio de navegação.
6. Limpeza limitada e revisão visual.

## Scope

- Inherit: todas as confirmações críticas migradas ganham a anatomia, os tons e as regras de dismiss do primitive.
- Verify: z-index do `HotToaster` e os modais glass existentes, porque o projeto já tem camadas de popup/modal personalizadas.
- Exclude: toasts, `Message` Semantic UI, erros inline, banners de conexão, empty states e warnings de consola. Estes precisam de um plano próprio de `Alert`/feedback, não de `AlertDialog`.

## Validation

- Product: cancelar não tem side effects; confirmar executa uma vez; pending bloqueia repetição; o input de confirmação continua obrigatório quando configurado.
- Interface: observar cada piloto em desktop e mobile, com título/copy longos, tom danger/warning/primary, foco inicial, Tab/Shift+Tab, Escape, clique fora e `prefers-reduced-motion`.
- System: confirmar que `AlertDialog` é o único owner de layout/tom/dismiss para as confirmações migradas e que continua a usar `Button`/tokens existentes.
- Repository: `npm test --prefix client -- --runInBand <ficheiros-focados>` e `git diff --check` devem passar. Não executar build local; validar por hot reload em `http://localhost:3008`.

## Stop conditions

- Parar a migração em massa se o piloto dentro de `ConfirmationStep` não preservar foco, popup de origem ou stacking.
- Parar se um fluxo de navegação bloqueada não puder manter a transição pendente com segurança; manter temporariamente o confirm nativo desse fluxo e resolver o controller antes de o trocar.
- Não instalar HeroUI, Tailwind, React Aria ou outra biblioteca de diálogo sem uma autorização explícita para alterar a stack.

## Design documentation

Depois da aprovação e validação, registar que `AlertDialog` cobre exclusivamente confirmações críticas e que feedback não bloqueante pertence a um primitive separado de Alert/Toast.
