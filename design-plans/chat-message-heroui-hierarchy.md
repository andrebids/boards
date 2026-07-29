# Aproximar a hierarquia das mensagens ao Chat Message da HeroUI

Written against: `d327da80f8a46b5b5c1976aecffa170d2c931c33` (o worktree contém alterações não commitadas nos componentes do chat; reconciliar antes de editar)

## Evidence chain

- Surface: janela flutuante de conversa em `http://localhost:3008`, conversa geral, direta ou grupo.
- Problem: mensagens próprias e recebidas dependem de bolhas visualmente equivalentes; o azul sólido domina a conversa, o texto usa 13 px/18.5 px e mensagens recebidas de grupo não apresentam o autor no primeiro turno.
- Rendered evidence: numa janela de 360 px, as mensagens próprias observadas tinham conteúdo de 52 px e 85 px, mas mantinham a mesma superfície azul de alto contraste.
- Design evidence: [HeroUI Pro Chat Message](https://heroui.pro/docs/react/components/chat-message) separa mensagem do utilizador em bolha neutra e mensagem recebida numa coluna aberta com avatar, conteúdo e ações. A referência dark observada usa texto de 14 px, avatar de 32 px, gap de 12 px e raio de 16 px na bolha.
- Local design evidence: `client/src/components/chat/theme.scss` define três superfícies, um accent e os raios `--chat-radius-control`/`--chat-radius-panel`; estes tokens conseguem expressar a nova composição sem instalar HeroUI.
- Owner: `client/src/components/chat/MessageList/MessageList.jsx`, `MessageList.module.scss` e `theme.scss`.
- Scope and affected surfaces: mensagens próprias/recebidas, grupos temporais, mensagens só com emoji, respostas, anexos, previews, reações e metadados.
- Uncertainty: o painel é mais compacto do que a demo HeroUI; preservar avatar `tiny` e validar 360 px antes de considerar aumentar o tamanho.

## Design decision

Adotar uma anatomia assimétrica adaptada a chat humano:

- mensagens próprias continuam alinhadas à direita, numa bolha neutra com raio de painel;
- mensagens recebidas usam conteúdo aberto, avatar e uma linha `autor · hora` apenas no início do grupo;
- o azul deixa de preencher mensagens normais e fica reservado para envio, foco, menções, reações selecionadas e estados ativos;
- o corpo do chat passa a 14 px, mantendo metadados compactos.

Não copiar a semântica “user/assistant” nem instalar `@heroui-pro/react`. A autoria, recibos de leitura e colaboração multiutilizador continuam a pertencer ao produto atual.

## Reuse

- `--chat-surface-secondary`, `--chat-border`, `--chat-muted`, `--chat-accent`, `--chat-radius-panel` e `--chat-font-body` de `client/src/components/chat/theme.scss`.
- `UserAvatar`, `members`, `continuesPrevious`, `continuesNext`, `formatTime` e `isEmojiOnlyMessage` já usados por `MessageList`.
- `messageContent`, `bubble`, `groupTime`, `avatarSpacer`, `meta`, `reactions`, `replyPreview` e estilos de anexos existentes.
- Exemplar: composição `ChatMessage.User`, `ChatMessage.Assistant`, `ChatMessage.Avatar` e `ChatMessage.Body` da referência HeroUI.

## Changes

1. `client/src/components/chat/theme.scss`
   - Change: atualizar `--chat-font-body` de `13px` para `14px`.
   - Change: redefinir `--chat-bubble-sent` como alias de `--chat-surface-secondary`; manter `--chat-accent` inalterado para ações e estados.
   - Preserve: dark theme, três superfícies, contraste atual, tokens de success/warning/danger, motion e focus ring.
   - Verify: todos os consumidores do token continuam legíveis no painel de 360 px e na Inbox de 380 px.

2. `client/src/components/chat/MessageList/MessageList.jsx`
   - Change: derivar o autor da mensagem a partir de `members` e renderizar uma linha de autoria no início de cada grupo recebido (`!continuesPrevious`), com nome e hora.
   - Change: para mensagens próprias, manter apenas a hora alinhada à direita no início do grupo; não repetir o nome do utilizador atual.
   - Change: renderizar o avatar na primeira mensagem recebida do grupo e usar `avatarSpacer` nas continuações, alinhando avatar, autoria e corpo como uma única coluna.
   - Preserve: cálculo de dias e grupos de cinco minutos, fronteira de não lidas, mensagem eliminada, edição inline, respostas, encaminhamento, anexos, link previews, reações, estados pending/failed/seen, deep links e scroll.
   - Verify: grupos recebidos identificam inequivocamente o autor sem repetir nome/hora em todas as mensagens.

3. `client/src/components/chat/MessageList/MessageList.module.scss`
   - Change: usar `--chat-radius-panel` nas bolhas de texto próprias e recebidas.
   - Change: apresentar a mensagem recebida normal sem fundo e sem bordo; manter delimitação própria para respostas, ficheiros, imagens, previews e estados que precisam de superfície.
   - Change: manter a mensagem própria em `--chat-bubble-sent` neutro, com bordo `--chat-border`; não usar accent como preenchimento.
   - Change: criar a linha de autoria com nome em foreground semibold e hora em `--chat-muted-subtle`; alinhar com o corpo da mensagem.
   - Change: ajustar `messageRow`, `messageContent`, agrupamento e espaçamento para que o primeiro turno tenha respiração e as continuações mantenham 2–4 px de ritmo.
   - Change: preservar a escala ampliada de `emojiOnlyBubble`, mas sem restaurar o fundo azul.
   - Preserve: largura máxima de 74%, foco de permalink, estados de hover/focus, wrapping, direção automática, reduced motion e estilos responsivos.
   - Verify: mensagens curtas, longas, só emoji e com anexos mantêm alinhamento estável e não colidem com ações ou metadados.

## Scope

- Inherit: conversa geral, direta e grupos personalizados, incluindo múltiplas janelas do `ChatDock`.
- Verify: mensagens próprias/recebidas consecutivas, mudança de autor, mudança de dia, resposta, mensagem eliminada, estado pending/failed/seen, imagem com legenda, ficheiro, link preview e reação.
- Exclude: largura/altura de `ChatWindow`, dados, API, Markdown, novos tipos de mensagem, alteração de recibos de leitura ou instalação de HeroUI.

## Validation

- Product: numa conversa de grupo com pelo menos dois autores, identificar rapidamente quem escreveu cada turno; mensagens próprias continuam distinguíveis pelo alinhamento.
- Interface: validar 360×500, desktop com duas e três janelas permitidas pelo `ChatDock`, viewport móvel abaixo de 768 px, texto de 1 linha, texto longo e palavras/URLs sem espaços.
- Interface: verificar contraste no dark theme, foco por teclado, `prefers-reduced-motion`, emoji-only, anexos, respostas e menus abertos.
- System: confirmar que os tokens existentes expressam toda a decisão e que não foi criado um segundo sistema de cores/raios.
- Repository: `npm test -- --runInBand src/components/chat/MessageList/scroll.test.js src/components/chat/utils.test.js` em `client/` → testes existentes passam.
- Repository: `npx eslint src/components/chat/MessageList/MessageList.jsx` em `client/` → sem erros.
- Runtime: validar por hot reload em `http://localhost:3008`; não executar build.

## Stop conditions

- Stop if aumentar `--chat-font-body` para 14 px causar truncamento em vários consumidores fora da janela de conversa; nesse caso, criar um token específico de conteúdo apenas depois de inventariar todos os consumidores.
- Stop if os dados carregados não permitirem resolver o autor de uma mensagem recebida; o contrato de dados deve ser corrigido antes de inventar fallback visual.
- Stop if a mensagem recebida transparente deixar respostas, anexos ou previews sem delimitação; esses tipos devem conservar as superfícies existentes.

## Design documentation

- After acceptance and validation: atualizar o comentário de contrato em `client/src/components/chat/theme.scss` para registar a anatomia assimétrica e que o accent é reservado a ações/estados, não a mensagens normais.
