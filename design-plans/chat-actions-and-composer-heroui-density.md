# Simplificar ações e integrar o compositor do chat

Written against: `d327da80f8a46b5b5c1976aecffa170d2c931c33` (o worktree contém alterações não commitadas nos componentes do chat; reconciliar antes de editar)

## Evidence chain

- Surface: ações por mensagem e compositor no fundo de `ChatWindow`.
- Problem: a barra de hover tem sete controlos e 196 px de largura, excedendo largamente mensagens curtas de 52–85 px; no painel de 360 px, o textarea observado ocupa apenas cerca de 218 px porque ferramentas e envio vivem como colunas externas.
- Design evidence: [HeroUI Pro Chat Message Actions](https://heroui.pro/docs/react/components/chat-message-actions) usa ações inline de 32 px e recomenda a variante minimal quando só uma ou duas ações são essenciais. [HeroUI Pro Chat Conversation](https://heroui.pro/docs/react/components/chat-conversation) integra viewport, salto para o fim e prompt numa superfície coerente.
- Local design evidence: o chat já contém `LazyEmojiPicker`, menu `Mais`, `react-dropzone`, `MentionsInput`, previews pendentes, reply bar e botão de envio; o problema é de composição, não de falta de primitives.
- Owner: `client/src/components/chat/MessageList/*` e `client/src/components/chat/MessageComposer/*`.
- Scope and affected surfaces: rato, teclado e toque; mensagens próprias/recebidas; envio de texto, menções, emoji, anexos, respostas e drag-and-drop.
- Uncertainty: none.

## Design decision

Reduzir a ação imediata de cada mensagem a três decisões — `Reagir`, `Responder` e `Mais` — e concentrar as restantes operações no menu existente. Reestruturar o compositor como uma única superfície: conteúdo editável com largura total e uma toolbar inferior interna com anexos/emoji à esquerda e envio à direita.

Os emojis rápidos deixam de ocupar botões permanentes; continuam disponíveis no picker. Não remover editar, apagar, copiar link ou encaminhar.

## Reuse

- `LazyEmojiPicker`, `reactionControl`, `messageActions`, `actionsMenu`, `handleMessageAction` e `CloseButton`.
- `MentionsInput`, `Mention`, `FilePicker`, `react-dropzone`, `replyBar`, `files`, `attachmentError`, `tools` e `sendButton`.
- `--chat-default`, `--chat-border`, `--chat-muted`, `--chat-accent`, `--chat-focus-ring`, `--chat-radius-control`, `--chat-motion-fast` e `--chat-ease`.
- Exemplar: ações ghost de 32 px e composer integrado das referências HeroUI; adaptar ao painel compacto sem instalar HeroUI.

## Changes

1. `client/src/components/chat/MessageList/MessageList.jsx`
   - Change: remover os quatro botões de emoji rápido do nível principal da barra.
   - Change: manter exatamente três triggers imediatos: picker de reação, responder e menu `Mais`.
   - Change: manter no menu `Mais` editar, copiar link, encaminhar e apagar; remover a duplicação de `Responder` dentro do menu quando o trigger primário estiver disponível.
   - Change: em pointer coarse/touch, disponibilizar os mesmos três triggers através de um controlo visível/focável, sem depender de hover ou long press.
   - Preserve: picker completo, estado de menu aberto, click outside, resize/scroll close, permissões por autoria, confirmação de remoção, forwarding e foco por teclado.
   - Verify: todas as operações atuais continuam acessíveis com rato, Tab/Enter/Escape e toque.

2. `client/src/components/chat/MessageList/MessageList.module.scss`
   - Change: reduzir a barra para três botões ghost de 32×32 px, alinhada ao lado lógico do conteúdo; própria à direita e recebida à esquerda.
   - Change: usar fundo/contorno apenas quando a barra estiver aberta ou focada; no repouso, manter baixa proeminência e não competir com o texto.
   - Change: definir estados explícitos para hover-capable, `:focus-within` e `(hover: none), (pointer: coarse)`; não deixar o parent invisível quando os botões internos estão ativos.
   - Preserve: z-index suficiente para menus, focus ring, reduced motion e posicionamento seguro dentro dos 360 px.
   - Verify: a barra não ultrapassa mensagens curtas nem sai da janela nos extremos esquerdo/direito.

3. `client/src/components/chat/MessageComposer/MessageComposer.jsx`
   - Change: introduzir uma composição `composerSurface` com o `MentionsInput` em largura total e uma `composerToolbar` abaixo.
   - Change: mover `tools` para o lado esquerdo da toolbar e o botão de envio para o lado direito; manter menus de anexos/emoji ancorados acima.
   - Change: colocar ficheiros pendentes dentro da superfície, antes do input; manter `replyBar` imediatamente acima e `attachmentError` visível antes da superfície.
   - Change: manter o envio por Enter, nova linha por Shift+Enter, paste de imagens, drag-and-drop, typing, drafts por conversa e disabled state.
   - Preserve: toda a lógica de `send`, validação de ficheiros, menções, remoção de anexos, cancelamento de resposta e limpeza após envio.
   - Verify: o textarea usa a largura disponível e cresce verticalmente sem deslocar ferramentas para fora do painel.

4. `client/src/components/chat/MessageComposer/MessageComposer.module.scss`
   - Change: estilizar `composerSurface` com `--chat-background`, bordo `--chat-border`, raio `--chat-radius-panel` e focus ring no conjunto.
   - Change: remover o bordo próprio de `inputShell`; o textarea permanece transparente e ocupa 100% da superfície.
   - Change: criar toolbar interna com altura compacta, separação visual mínima e botão de envio circular/compacto à direita.
   - Change: manter chips de ficheiros, reply bar, erros e drop overlay dentro da hierarquia correta.
   - Preserve: menus acima do compositor, estados hover/active/disabled, contraste, reduced motion e viewport móvel.
   - Verify: não há layout shift ao abrir reply bar, adicionar vários anexos, abrir emoji picker ou o teclado virtual.

## Scope

- Inherit: todas as `ChatWindow` e todos os tipos de conversa.
- Verify: mensagem própria/recebida curta e longa, menu de reação, menu `Mais`, edição, forwarding, resposta, múltiplos anexos, erro de ficheiro, menções e conversa bloqueada.
- Exclude: novos comandos, gravação de voz, GIFs, Markdown, alteração da política de anexos, alterações ao backend, largura da janela ou instalação de HeroUI.

## Validation

- Product: reagir, responder, editar, copiar link, encaminhar e apagar continuam alcançáveis; enviar texto/anexo/resposta mantém o payload atual.
- Interface: validar 360×500, múltiplas janelas em 1024/1440 px, mobile abaixo de 768 px, teclado virtual, touch, teclado físico e conteúdo máximo.
- Interface: verificar toolbar com texto vazio/preenchido, disabled, pending attachments, reply bar, attachment error e menus abertos junto às extremidades do viewport.
- System: confirmar que `LazyEmojiPicker`, `MentionsInput`, `FilePicker` e tokens atuais foram reutilizados e não existe uma segunda implementação de menu/composer.
- Repository: `npm test -- --runInBand src/components/chat/attachmentPolicy.test.js src/components/chat/MessageList/scroll.test.js` em `client/` → testes existentes passam.
- Repository: `npx eslint src/components/chat/MessageList/MessageList.jsx src/components/chat/MessageComposer/MessageComposer.jsx` em `client/` → sem erros.
- Runtime: validar por hot reload em `http://localhost:3008`; não executar build.

## Stop conditions

- Stop if remover ações rápidas tornar alguma operação inacessível por toque ou teclado; corrigir primeiro a estratégia de trigger acessível.
- Stop if o portal de menções ou os pickers deixarem de calcular posição corretamente após a nova estrutura; resolver a ancoragem sem mover menus para dentro de contentores com clipping.
- Stop if a toolbar interna alterar o payload, drafts, typing ou idempotência de envio; esta entrega é exclusivamente de composição e apresentação.

## Design documentation

- After acceptance and validation: registar no comentário de contrato de `client/src/components/chat/theme.scss` que mensagens usam ações primárias mínimas e que o compositor é uma superfície única com toolbar interna.
