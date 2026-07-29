# Tornar os comentários do cartão numa conversa compacta com novidades no topo

Written against: `d327da80f8a46b5b5c1976aecffa170d2c931c33` (o worktree contém alterações não commitadas no modal, nos estilos de comentários e no chat; reconciliar o estado atual antes de editar)

## Evidence chain

- Surface: separador `Comentários` de `Communication`, consumido pelos cartões `PROJECT` e `STORY` em `client/src/components/cards/CardModal/ProjectContent.jsx` e `client/src/components/cards/CardModal/StoryContent/StoryContent.jsx`.
- Problem: na captura fornecida, cada comentário próprio repete nome, data e ações dentro de uma caixa com largura mínima elevada, fazendo a secção parecer uma pilha de cartões. O utilizador confirmou que a ordem mais recente primeiro e o compositor no topo são intencionais, para que novidades e criação fiquem imediatamente acessíveis sem scroll até ao fundo.
- Design evidence: o chat existente em `client/src/components/chat/MessageList/*` agrupa mensagens consecutivas do mesmo autor durante cinco minutos, distingue autoria pelo alinhamento, reduz o intervalo dentro do grupo e revela ações por hover/foco. `client/src/components/chat/MessageComposer/*` integra input e envio numa única composição. A ordem cronológica e o compositor no rodapé do chat não governam esta superfície.
- Runtime evidence: `Comments.jsx` já apresenta `Add → items → loader` e `Card.getCommentsModelArray()` entrega comentários do mais recente para o mais antigo. Esta ordem é o comportamento a preservar, não uma inconsistência a corrigir.
- Theme evidence: o chat tem contrato visual isolado em `client/src/components/chat/theme.scss`; o modal do cartão tem contrato próprio em `client/src/styles/glass-modal.css` através de `--card-modal-background`, `--card-modal-surface`, `--card-modal-surface-hover`, `--card-modal-border`, `--card-modal-text`, `--card-modal-muted`, `--card-modal-accent`, `--card-modal-accent-soft`, `--card-modal-danger` e `--card-modal-danger-soft`.
- Owner: `client/src/components/comments/Comments/*`.
- Scope and affected surfaces: separador de comentários em cartões de projeto e de história; utilizadores com e sem permissão de comentar; cartões ativos, arquivados e no lixo.
- Uncertainty: a captura fornecida mostra o modal claro, enquanto o worktree atual já migrou o modal e parte dos comentários para tokens escuros. A implementação deve validar o estado servido por hot reload e usar os tokens do cartão, não as cores literais da captura.

## Design decision

Adotar a gramática de conversa do chat sem transformar comentários em mensagens de chat:

- manter o compositor no topo e apresentar os comentários do mais recente para o mais antigo;
- manter o comentário mais recente imediatamente abaixo do compositor e carregar páginas antigas ao descer;
- agrupar comentários consecutivos do mesmo autor quando estiverem no mesmo dia e separados por menos de cinco minutos;
- alinhar comentários próprios à direita e comentários de outras pessoas à esquerda, com avatar e autoria apenas no primeiro item visual de cada grupo;
- tornar data e ações informação secundária, revelando editar/eliminar por hover, foco ou permanentemente em dispositivos sem hover;
- usar apenas os tokens do modal do cartão.

Preservar a semântica e o comportamento próprios de comentários: Markdown, menções, limite atual, `Ctrl/Cmd+Enter`, permissões, confirmação de eliminação, optimistic create/update/delete, ordem descendente e paginação por `beforeId`. Não acrescentar reações, anexos, respostas, recibos de leitura, indicador “a escrever”, contador de novidades, botão de salto ou qualquer API de chat.

## Reuse

- `--card-modal-*` de `client/src/styles/glass-modal.css`.
- Regra de agrupamento de cinco minutos e composição `messageRow/messageContent/bubble/groupTime` de `client/src/components/chat/MessageList/MessageList.jsx`.
- Composição de input + botão de envio e estados de foco/disabled de `client/src/components/chat/MessageComposer/*`.
- `UserAvatar`, `TimeAgo`, `Markdown`, `MentionsInput`, `Mention`, `ConfirmationStep`, `usePopupInClosableContext` e seletores/permissões já usados nos comentários.
- Exemplar: `client/src/components/chat/MessageList/*` e `client/src/components/chat/MessageComposer/*`; adaptar a anatomia, sem importar `--chat-*` nem os componentes de chat.

## Changes

1. `client/src/components/comments/Comments/Comments.jsx`
   - Change: substituir o fragmento atual por uma composição `conversation → composer → timeline`, mantendo `Add` antes do histórico.
   - Change: consumir `commentIds` diretamente, sem `reverse()`, `column-reverse` ou qualquer transformação da ordem descendente entregue por `selectCommentIdsForCurrentCard`.
   - Change: manter loader/sentinel depois dos itens, para que `fetchCommentsInCurrentCard()` continue a buscar comentários mais antigos quando o utilizador chega ao fundo da timeline.
   - Change: passar a cada `Item` os IDs visualmente acima e abaixo, permitindo calcular `continuesAbove` e `continuesBelow` com a mesma regra de cinco minutos do chat, adaptada ao fluxo mais recente primeiro.
   - Change: iniciar a timeline naturalmente em `scrollTop = 0`; não introduzir auto-scroll, contador de novidades ou botão de salto. Comentários locais e remotos entram no topo através da ordenação existente.
   - Preserve: cálculo de `canAdd`, `useInView`, estados de fetching, optimistic IDs, Redux, API, `lastCommentId` e ordenação canónica do modelo.
   - Verify: ao abrir o cartão, compositor e comentário mais recente estão visíveis; um comentário novo passa a primeiro item; comentários antigos continuam a carregar no fundo.

2. `client/src/components/comments/Comments/Comments.module.scss`
   - Change: criar um painel contido com fundo/bordo/raio derivados de `--card-modal-background`, `--card-modal-surface` e `--card-modal-border`.
   - Change: limitar apenas a timeline a `min(500px, 50dvh)`, reutilizando a altura de referência de `ChatWindow`, com `overflow-y: auto`, scrollbar discreta e padding equivalente ao `MessageList`; o compositor permanece acima e fora da área rolável.
   - Change: separar compositor e timeline apenas com o bordo do painel, removendo margens que os fazem parecer módulos independentes; o loader de páginas antigas fica centrado no fundo.
   - Change: no breakpoint móvel já usado pelo modal (`< 768px`), reduzir padding e deixar o painel ocupar toda a largura disponível sem criar scroll horizontal.
   - Preserve: o scroll principal de `CardModalBody`, o separador `Ações` e a largura da coluna principal.
   - Verify: o topo da timeline começa no comentário mais recente e não existe duplo scroll incómodo no desktop nem bloqueio de gesto no móvel.

3. `client/src/components/comments/Comments/Item.jsx`
   - Change: aceitar `aboveId` e `belowId`, resolver os comentários adjacentes com `makeSelectCommentById()` e calcular continuidade apenas quando autor, dia e janela de cinco minutos coincidirem.
   - Change: aplicar estados de linha `own`, `continuesAbove` e `continuesBelow`; mostrar o avatar no primeiro item visual de um grupo recebido (`!continuesAbove`) e reservar o mesmo espaço nas continuações abaixo.
   - Change: mostrar `autor · tempo` uma vez no primeiro item visual de cada grupo recebido; para comentários próprios, omitir o nome e mostrar apenas o tempo.
   - Change: substituir os links de texto sempre visíveis por dois botões ghost compactos, com ícones `Pencil` e `Trash2` de `lucide-react`, mantendo labels traduzidas, disabled state e `ConfirmationPopup`.
   - Change: manter a edição inline na posição e no alinhamento do comentário original.
   - Preserve: todas as regras atuais de `canEdit`/`canDelete`, utilizador eliminado, `isPersisted`, Markdown e confirmação de eliminação.
   - Verify: cada comentário continua editável/eliminável individualmente, mesmo quando pertence a um grupo visual.

4. `client/src/components/comments/Comments/Item.module.scss`
   - Change: trocar floats e larguras calculadas por linhas flex, com conteúdo até 74% da timeline, sem `min-width: 40%`.
   - Change: usar 10 px quando o item não continua o grupo visual acima e 2 px nas continuações abaixo, seguindo o ritmo de `MessageList`.
   - Change: usar `--card-modal-surface` para recebidos e `--card-modal-accent-soft` com bordo de accent para próprios; texto, metadata, danger e focus usam exclusivamente tokens `--card-modal-*`.
   - Change: usar raio de 8 px e ajustar apenas os cantos de continuidade para formar um grupo coerente, sem sombras decorativas.
   - Change: posicionar a barra de ações junto da bolha; ocultá-la em repouso apenas quando hover existe e revelá-la em `:hover`, `:focus-within` e quando o popup está ativo. Em `(hover: none), (pointer: coarse)`, mantê-la visível.
   - Preserve: wrapping de Markdown, palavras/URLs longas, foco por teclado e `prefers-reduced-motion`.
   - Verify: mensagens curtas não parecem cartões largos e as ações não saem dos limites em nenhum alinhamento.

5. `client/src/components/comments/Comments/Add.jsx`
   - Change: compor o `MentionsInput` e um botão nativo de envio com ícone `Send` na mesma linha, seguindo o compositor do chat.
   - Change: manter uma linha em repouso e três linhas com foco; manter sugestões acima do cursor, menções, click-away, Escape e submissão por `Ctrl/Cmd+Enter`.
   - Change: manter o botão de envio sempre presente e desativado quando `data.text.trim()` estiver vazio.
   - Preserve: payload `{ text }`, limite `1048576`, limpeza/refocus após envio e lista de membros do quadro.
   - Verify: clique e `Ctrl/Cmd+Enter` criam exatamente um comentário; Enter simples continua disponível para texto multilinha.

6. `client/src/components/comments/Comments/Add.module.scss`
   - Change: substituir o botão positivo separado por uma superfície de compositor com input flexível e botão de 38×38 px, reutilizando dimensões e estados do `MessageComposer`.
   - Change: usar `--card-modal-surface`, `--card-modal-border`, `--card-modal-text`, `--card-modal-muted`, `--card-modal-accent` e `--card-modal-accent-soft`; manter sugestões e menções coerentes com o tema atual.
   - Preserve: crescimento do textarea, ausência de resize manual e ring de foco.
   - Verify: o compositor cabe na coluna principal e no viewport móvel sem comprimir o textarea.

7. `client/src/components/comments/Comments/Edit.module.scss`
   - Change: alinhar o editor inline com a mesma superfície, raio, tipografia e focus ring do novo compositor; tornar Guardar/Cancelar compactos sem alterar `Edit.jsx`.
   - Preserve: submissão por `Ctrl/Cmd+Enter`, Escape, click-away, menções e foco no fim do texto.
   - Verify: abrir/cancelar/guardar não altera largura, alinhamento ou posição de scroll do grupo.

## Scope

- Inherit: cartões `PROJECT` e `STORY`, porque ambos consomem o mesmo `Communication → Comments`.
- Verify: comentários próprios e recebidos, alternância de autores, grupos dentro/fora de cinco minutos, mudança de dia, Markdown longo, menções, utilizador eliminado, optimistic state, 50+ comentários, edição, eliminação e receção por socket.
- Verify: utilizador editor, membro apenas com `canComment`, membro sem permissão, gestor a eliminar comentário de outra pessoa, cartão ativo, arquivo e lixo.
- Exclude: `CardActivities`, chat global, backend, esquema `Comment`, notificações, respostas, reações, anexos, unread state e alterações ao contador de comentários no cartão.

## Validation

- Product: abrir um cartão com vários autores e confirmar que o compositor e a novidade mais recente estão no topo; criar um comentário e confirmar que surge imediatamente como primeiro item.
- Interface: validar desktop no modal de 1040 px, breakpoint abaixo de 768 px e largura abaixo de 480 px; incluir texto de uma linha, várias linhas, URL longa, menção e comentários consecutivos dos dois lados.
- Interface: validar hover, Tab/Enter/Escape, touch/coarse pointer, popup de eliminação, editor aberto, `prefers-reduced-motion` e contraste no tema atual do modal.
- Pagination: com mais de 50 comentários, descer ao fundo, carregar a página anterior e confirmar que os comentários antigos são acrescentados abaixo sem alterar o topo recente.
- System: confirmar que nenhum `--chat-*` é consumido pelos comentários e que nenhuma segunda regra de permissões ou paginação foi criada.
- Repository: `npx eslint src/components/comments/Comments/Comments.jsx src/components/comments/Comments/Item.jsx src/components/comments/Comments/Add.jsx src/components/comments/Comments/Edit.jsx` em `client/` → sem erros.
- Runtime: validar exclusivamente por hot reload em `http://localhost:3008`; não executar build.

## Stop conditions

- Stop if o estado atual de `MessageList` mudar a regra de agrupamento antes da implementação; reconciliar primeiro o exemplar local.
- Stop if a implementação inverter `commentIds`, usar `column-reverse` ou mover o compositor para o fundo; essas alterações contradizem a decisão de produto confirmada.
- Stop if a timeline rolável impedir o scroll do modal ou prender gestos no móvel; nesse caso, manter ordem descendente, agrupamento e compositor no topo, mas deixar `CardModalBody` ser o único dono do scroll.
- Stop if ações ocultas deixarem de ser alcançáveis por teclado ou touch; manter os botões visíveis até existir um trigger acessível equivalente.

## Design documentation

- After acceptance and validation: none; não existe `DESIGN.md` governando esta superfície e a decisão fica localizada no owner `Comments`.
