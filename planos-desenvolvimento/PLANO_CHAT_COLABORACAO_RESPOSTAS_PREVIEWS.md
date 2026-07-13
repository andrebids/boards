# Plano de implementacao: respostas, gestao de mensagens, previews e colaboracao no chat

## 1. Objetivo

Evoluir o chat por projeto com as seguintes capacidades:

- responder a uma mensagem com contexto;
- editar e remover mensagens pela interface;
- apresentar previews de anexos e links;
- mostrar quem esta a escrever;
- separar mensagens novas e permitir regressar ao fim da conversa;
- apresentar confirmacao de leitura em conversas diretas;
- guardar mensagens para consultar mais tarde;
- silenciar conversas temporariamente ou receber apenas mencoes;
- manter um rascunho independente por conversa;
- aceitar ficheiros por arrastar e largar;
- gerar um link permanente para uma mensagem;
- reencaminhar mensagens entre conversas autorizadas;
- criar conversas de grupo manuais dentro do projeto.

O plano parte da implementacao existente: conversas geral e diretas, paginacao, mencoes, anexos, reacoes, estado de leitura, presenca, retry, sockets e endpoints de edicao e remocao.

## 2. Decisoes de produto

### 2.1. Respostas

A primeira versao usa resposta contextual dentro do fluxo normal, e nao uma arvore de threads:

- cada mensagem pode referenciar uma mensagem anterior da mesma conversa;
- o compositor mostra uma faixa com autor e excerto da mensagem respondida;
- a mensagem enviada mostra um bloco compacto com esse contexto;
- clicar no bloco leva a mensagem original e aplica um realce temporario;
- se a mensagem original estiver removida, aparece apenas `Mensagem removida`;
- nao existem subcontadores, paineis laterais ou respostas aninhadas no primeiro release.

Esta opcao adapta-se melhor as janelas de chat de 320 px e nao divide a conversa em dois historicos diferentes. Threads completas podem ser adicionadas depois sem alterar o campo de referencia.

### 2.2. Edicao e remocao

- apenas o autor pode editar ou remover a sua mensagem;
- mensagens pendentes, falhadas ou ja removidas nao apresentam essas acoes;
- a edicao e feita na propria bolha, mantendo mencoes e anexos existentes;
- `Escape` cancela, `Enter` guarda e `Shift+Enter` cria uma nova linha;
- remover exige confirmacao;
- a remocao continua a ser logica e conserva o marcador existente;
- falhas revertem a alteracao otimista e apresentam uma acao de repetir.

Os endpoints `PATCH /api/chat-messages/:id` e `DELETE /api/chat-messages/:id` ja existem. Esta frente e sobretudo trabalho de interface, estado de operacao e testes.

### 2.3. Previews

O release e dividido em duas camadas:

1. Previews locais: imagem, video, PDF e ficheiro generico a partir de anexos do chat.
2. Previews de links: links internos do PLANKA primeiro; metadados de sites externos depois e sob feature flag.

Links externos nunca devem ser analisados diretamente pelo browser. O servidor valida o destino, limita o download e guarda metadados saneados. Imagens remotas nao sao carregadas diretamente no cliente, para evitar tracking e fuga do endereco IP do utilizador.

### 2.4. Rascunhos

O comportamento inicial e deliberadamente privado:

- texto e selecao de resposta ficam em memoria por conversa;
- minimizar, fechar e voltar a abrir durante a sessao conserva o rascunho;
- logout, revogacao de acesso ou recarregamento completo elimina o rascunho;
- objetos `File` nao sao persistidos fora da memoria;
- persistencia em `localStorage` ou IndexedDB so entra depois de uma definicao explicita de privacidade e retencao.

### 2.5. Reencaminhamento

- apenas mensagens que o utilizador consegue ler podem ser reencaminhadas;
- o destino tem de pertencer ao mesmo projeto e permitir escrita;
- o primeiro release copia texto, mencoes convertidas para texto visivel e anexos autorizados;
- o novo registo indica que a mensagem foi reencaminhada e conserva o autor original como metadado;
- a copia permanece se a mensagem original for removida posteriormente, tal como aconteceria com uma copia manual;
- referencias de ficheiros sao duplicadas transacionalmente e incrementam `FileReference.total`.

## 3. Modelo de dados e migracoes

Nao alterar as migracoes `20260713000000` a `20260713000003`, porque podem ja ter sido aplicadas. Criar migracoes corretivas e pequenas, uma por frente.

### 3.1. Migracao 04: respostas e origem de reencaminhamento

Ficheiro sugerido:

`server/db/migrations/20260713000004_add_chat_message_reply_and_forward.js`

Adicionar a `chat_message`:

```text
reply_to_message_id        BIGINT NULL REFERENCES chat_message(id) ON DELETE SET NULL
forwarded_from_message_id  BIGINT NULL REFERENCES chat_message(id) ON DELETE SET NULL
forwarded_from_user_id     BIGINT NULL REFERENCES user_account(id) ON DELETE SET NULL
```

Indices:

```text
(reply_to_message_id)
(forwarded_from_message_id)
```

Regras aplicadas no helper de criacao:

- `reply_to_message_id` tem de pertencer a mesma conversa;
- a mensagem de origem do reencaminhamento tem de pertencer ao mesmo projeto;
- uma mensagem local ou ainda nao persistida nao pode ser usada como origem;
- a resposta nao pode apontar para si propria.

### 3.2. Migracao 05: preferencias de notificacao

Ficheiro sugerido:

`server/db/migrations/20260713000005_add_chat_notification_preferences.js`

Adicionar a `chat_participant`:

```text
notification_level  TEXT NOT NULL DEFAULT 'all'
muted_until         TIMESTAMPTZ NULL
```

Constraint:

```text
notification_level IN ('all', 'mentions', 'none')
```

Compatibilidade:

- `is_muted = true` migra para `notification_level = 'none'`;
- `is_muted = false` migra para `notification_level = 'all'`;
- manter `is_muted` durante um ciclo de release, mas deixar de o usar como fonte de verdade;
- remover a coluna antiga apenas numa migracao futura, depois de todos os clientes terem sido atualizados.

### 3.3. Migracao 06: mensagens guardadas

Ficheiro sugerido:

`server/db/migrations/20260713000006_add_chat_saved_message.js`

Nova tabela:

```text
chat_saved_message
  id          BIGINT PRIMARY KEY
  user_id     BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE
  message_id  BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE
  created_at  TIMESTAMPTZ NOT NULL
```

Indices e constraints:

```text
UNIQUE (user_id, message_id)
INDEX (user_id, created_at DESC)
INDEX (message_id)
```

### 3.4. Migracao 07: previews de links externos

Ficheiro sugerido:

`server/db/migrations/20260713000007_add_chat_link_preview.js`

Nova tabela de cache:

```text
chat_link_preview
  id              BIGINT PRIMARY KEY
  project_id      BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE
  normalized_url  TEXT NOT NULL
  url             TEXT NOT NULL
  hostname        TEXT NOT NULL
  title           TEXT NULL
  description     TEXT NULL
  site_name       TEXT NULL
  status          TEXT NOT NULL
  fetched_at      TIMESTAMPTZ NULL
  expires_at      TIMESTAMPTZ NULL
  failure_reason  TEXT NULL
  created_at      TIMESTAMPTZ NOT NULL
  updated_at      TIMESTAMPTZ NULL
```

Tabela de associacao:

```text
chat_message_link_preview
  id               BIGINT PRIMARY KEY
  message_id       BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE
  link_preview_id  BIGINT NOT NULL REFERENCES chat_link_preview(id) ON DELETE CASCADE
  position         INTEGER NOT NULL
  created_at       TIMESTAMPTZ NOT NULL
```

Constraints:

```text
UNIQUE (project_id, normalized_url)
UNIQUE (message_id, link_preview_id)
INDEX (project_id, expires_at)
INDEX (message_id, position)
```

Estados permitidos: `pending`, `ready`, `failed` e `blocked`.

### 3.5. Migracao 08: grupos manuais

Ficheiro sugerido:

`server/db/migrations/20260713000008_add_custom_chat_groups.js`

Alterar `chat_conversation`:

```text
title        TEXT NULL
archived_at  TIMESTAMPTZ NULL
```

Adicionar o tipo `projectCustomGroup` a constraint de `chat_conversation.type`. A constraint de `direct_key` fica:

- `projectDirect` exige `direct_key`;
- `projectGroup` e `projectCustomGroup` exigem `direct_key IS NULL`.

Alterar `chat_participant`:

```text
role  TEXT NOT NULL DEFAULT 'member'
```

Constraint:

```text
role IN ('owner', 'member')
```

Nos chats geral e direto, o campo e informativo. Nos grupos manuais controla renomear, adicionar e remover participantes.

## 4. Contratos de API

### 4.1. Mensagens

Estender a criacao:

```text
POST /api/chat-conversations/:conversationId/messages
{
  text,
  clientMessageId,
  hasAttachments,
  replyToMessageId?
}
```

O presenter devolve um resumo seguro, sem carregar recursivamente toda a mensagem:

```text
replyTo: {
  id,
  userId,
  text,
  deletedAt,
  attachmentNames
} | null
```

Adicionar:

```text
POST /api/chat-messages/:id/forward
{
  targetConversationId
}
```

O servidor cria a nova mensagem e os anexos numa transacao. O endpoint nao aceita texto ou autor de origem fornecidos pelo cliente.

### 4.2. Historico em torno de uma mensagem

Estender:

```text
GET /api/chat-conversations/:conversationId/messages
  ?aroundId=:messageId
  &beforeLimit=25
  &afterLimit=25
```

Resposta adicional:

```text
meta: {
  hasMoreBefore,
  hasMoreAfter,
  anchorMessageId
}
```

Nao misturar `aroundId` com o atual `beforeId`. Validar que a ancora pertence a conversa e que o utilizador mantem acesso.

### 4.3. Mensagens guardadas

```text
GET    /api/projects/:projectId/chat-saved-messages?beforeId=&limit=50
POST   /api/chat-messages/:messageId/saved
DELETE /api/chat-messages/:messageId/saved
```

O GET devolve mensagens apresentadas com os mesmos filtros de privacidade do historico. Uma mensagem removida deixa de aparecer porque a relacao e eliminada em cascata.

### 4.4. Preferencias

```text
PATCH /api/chat-conversations/:conversationId/preferences
{
  notificationLevel,
  mutedUntil
}
```

Regras:

- `mutedUntil` aceita `null` ou ISO 8601 no futuro;
- expiracao e avaliada pelo servidor, nao apenas pelo relogio do cliente;
- silenciar nao altera o contador de nao lidas;
- `mentions` gera alerta apenas quando o ID do participante aparece numa mencao valida;
- mensagens do proprio utilizador nunca geram alerta para ele.

### 4.5. Indicador de escrita

```text
POST /api/chat-conversations/:conversationId/typing
{
  isTyping
}
```

Este endpoint exige Socket.IO e nao escreve na base de dados. O servidor publica `chatTypingUpdate` apenas na sala da conversa, excluindo o emissor.

Protecoes:

- no maximo um evento ativo por utilizador e conversa a cada 2 segundos;
- expiracao automatica apos 5 segundos sem renovacao;
- `isTyping: false` ao enviar, fechar ou perder foco;
- nunca incluir o texto que esta a ser escrito.

### 4.6. Grupos manuais

```text
POST   /api/projects/:projectId/chat-conversations/groups
PATCH  /api/chat-conversations/:conversationId
POST   /api/chat-conversations/:conversationId/participants
DELETE /api/chat-conversations/:conversationId/participants/:userId
POST   /api/chat-conversations/:conversationId/leave
```

Regras:

- todos os participantes devem ser membros atuais do projeto;
- gestores e administradores nao recebem acesso automatico ao conteudo;
- o criador fica com `role = owner`;
- apenas owners podem renomear ou alterar participantes;
- um grupo precisa de owner e de pelo menos dois participantes para continuar ativo;
- ao sair, o owner transfere a propriedade ao participante mais antigo ou escolhe outro owner;
- remover um participante fecha imediatamente sockets, limpa estado local e revoga links permanentes para esse utilizador;
- os grupos aparecem na mesma listagem de conversas, sem criar um segundo sistema de navegacao.

## 5. Backend

### 5.1. Modelos e query methods

Alterar:

- `server/api/models/ChatMessage.js`;
- `server/api/models/ChatConversation.js`;
- `server/api/models/ChatParticipant.js`;
- query methods correspondentes em `server/api/hooks/query-methods/models/`.

Criar:

- `server/api/models/ChatSavedMessage.js`;
- `server/api/models/ChatLinkPreview.js`;
- `server/api/models/ChatMessageLinkPreview.js`;
- query methods para listagem em batch e operacoes idempotentes.

### 5.2. Helpers do chat

Alterar:

- `chat/create-message`: validar resposta, anexar origem de reencaminhamento e emitir alertas conforme preferencias;
- `chat/update-message`: recalcular URLs quando o texto muda;
- `chat/delete-message`: remover associacoes de preview e preservar respostas com marcador removido;
- `chat/get-message-extras`: carregar anexos, reacoes, respostas, estado guardado e previews em batch;
- `chat/present-message`: nunca devolver texto ou extras de mensagens removidas;
- `chat/get-conversation-access`: reconhecer `projectCustomGroup` e validar participacao explicita;
- `chat/reconcile-project-rooms`: retirar membros removidos dos grupos e respetivas salas.

Criar helpers dedicados:

- `chat/forward-message`;
- `chat/toggle-saved-message`;
- `chat/update-participant-preferences`;
- `chat/get-message-window`;
- `chat-link-previews/extract-urls`;
- `chat-link-previews/fetch-metadata`;
- `chat-link-previews/sync-message-links`;
- `chat-groups/create-one`;
- `chat-groups/update-members`;
- `chat-groups/leave`.

### 5.3. Previews de anexos

O chat atualmente devolve o registo bruto do anexo. Criar um presenter equivalente a `attachments/present-one`:

- omitir `fileReferenceId` e caminhos internos;
- devolver `data.url` autenticado;
- devolver `data.thumbnailUrls.outside360` e `outside720` quando existirem;
- manter `mimeType`, tamanho, dimensoes de imagem e duracao de video;
- criar endpoints autenticados para original e thumbnails;
- reutilizar verificacao de acesso a conversa em todas as variantes;
- responder `404` para mensagem ou anexo removido.

### 5.4. Seguranca dos previews externos

O fetch de metadados deve cumprir todos os pontos:

- aceitar apenas `http` e `https`;
- bloquear loopback, redes privadas, link-local, multicast e enderecos reservados em IPv4 e IPv6;
- resolver DNS antes do pedido e voltar a validar cada redirect;
- limitar a 3 redirects;
- timeout total de 3 segundos;
- ler no maximo 256 KB de HTML e rejeitar respostas acima do limite configurado;
- aceitar apenas HTML declarado e nunca executar JavaScript;
- limitar titulo, descricao e site name antes de guardar;
- remover tags, entidades perigosas e caracteres de controlo;
- cache positiva por 24 horas e negativa por 1 hora;
- nao seguir URLs que contenham credenciais;
- remover fragmentos da URL na normalizacao e nunca remover parametros que alterem o recurso;
- isolar o cache por projeto e nunca expor resultados de outro projeto;
- nunca escrever a URL completa em logs, porque pode conter tokens ou dados sensiveis;
- nao devolver a causa interna detalhada ao cliente;
- usar uma fila com concorrencia limitada, sem bloquear a criacao da mensagem;
- publicar `chatMessageUpdate` quando o preview ficar pronto.

Como o servidor usa Node >= 18, pode usar `fetch` e `AbortController`. Adicionar um parser HTML pequeno e mantido apenas se a extracao com utilitarios existentes nao for suficiente. A dependencia deve ser fixada no `server/package.json` e auditada antes de entrar.

### 5.5. Alertas de chat

Nao adaptar a forca o modelo `Notification`, porque atualmente exige `boardId` e `cardId`. Criar um evento de socket separado:

```text
chatMessageAlert
{
  conversationId,
  messageId,
  projectId,
  senderUserId,
  hasMention
}
```

O evento nao precisa de incluir texto privado. O cliente decide entre badge, aviso visual e som. Email, push externo e notificacoes persistentes ficam fora desta entrega.

## 6. Frontend

### 6.1. Estado e contratos

Atualizar de forma consistente:

- `client/src/constants/ActionTypes.js`;
- `client/src/constants/EntryActionTypes.js`;
- `client/src/actions/chat.js`;
- `client/src/entry-actions/chat.js`;
- `client/src/api/chat.js`;
- `client/src/sagas/core/services/chat.js`;
- `client/src/sagas/core/watchers/chat.js`;
- `client/src/sagas/core/services/socket.js`;
- `client/src/sagas/core/watchers/socket.js`;
- `client/src/reducers/chat.js`;
- `client/src/selectors/chat.js`;
- modelos Redux ORM do chat.

Adicionar ao estado nao normalizado:

```text
draftsByConversation
replyTargetByConversation
editingMessageIdByConversation
typingUserIdsByConversation
unreadBoundaryByConversation
newMessageCountByConversation
focusedMessageIdByConversation
isPreferencesUpdatingByConversation
```

Nao colocar timers, objetos `File` ou funcoes dentro de modelos Redux ORM. Timers de escrita ficam no servico ou componente; ficheiros pendentes ficam no estado local do compositor.

### 6.2. Acoes das mensagens

Criar `MessageActions` aberto por hover, foco ou menu contextual, sem depender apenas de hover:

- Responder;
- Reagir;
- Editar, apenas para o autor;
- Remover, apenas para o autor;
- Guardar ou remover dos guardados;
- Copiar link;
- Reencaminhar.

No mobile, as mesmas acoes aparecem num bottom sheet ou popup acionado por toque prolongado e por um botao acessivel.

### 6.3. Resposta e edicao

Criar:

- `ReplyComposerBar` acima do campo;
- `ReplyPreview` dentro da bolha;
- `InlineMessageEditor` para editar texto;
- `DeleteMessageConfirmation`;
- realce `focusedMessage` com timeout e suporte a `prefers-reduced-motion`.

Ao enviar, `replyToMessageId` acompanha a mesma tentativa idempotente. O retry conserva a referencia.

### 6.4. Mensagens novas e scroll

Alterar `MessageList` para controlar quatro casos:

1. Abertura normal: ir ao fim.
2. Abertura por link: carregar em torno da ancora e centra-la.
3. Mensagem recebida quando o utilizador esta perto do fim: acompanhar automaticamente.
4. Mensagem recebida quando esta a ler acima: manter a posicao e mostrar `N novas mensagens`.

O separador `Novas mensagens` usa uma copia do `lastReadMessageId` capturada antes de marcar a conversa como lida. Nao comparar IDs com operadores numericos em JavaScript; localizar o cursor pela ordem da lista carregada.

Adicionar botoes:

- `Ir para as novas` quando existe fronteira nao lida;
- `Ir para a mais recente` quando o utilizador se afastou do fim;
- contador no botao quando chegaram mensagens durante a leitura.

### 6.5. Confirmacao de leitura

O backend ja publica `chatConversationRead` e o participante ja tem `lastReadMessageId`. Para conversas diretas:

- identificar o outro participante;
- localizar a ultima mensagem propria cujo ID esta coberto pelo cursor dele;
- mostrar `Vista` apenas nessa mensagem;
- mostrar `Enviada` enquanto ainda nao foi lida;
- nao mostrar recibos no chat geral ou em grupos;
- nao mostrar recibos se a mensagem estiver falhada ou pendente.

### 6.6. Indicador de escrita

No compositor:

- iniciar ao primeiro input nao vazio;
- renovar com throttle de 2 segundos;
- terminar ao enviar, apagar tudo, perder foco ou desmontar;
- ignorar eventos do proprio utilizador.

Na lista:

- uma pessoa: `Ana esta a escrever`;
- duas pessoas: `Ana e Rui estao a escrever`;
- tres ou mais: `3 pessoas estao a escrever`;
- remover automaticamente cada utilizador apos 5 segundos sem evento.

### 6.7. Anexos e arrastar ficheiros

Reutilizar `react-dropzone`, que ja esta instalado:

- zona ativa sobre toda a janela, mas apenas quando o payload contem ficheiros;
- overlay `Largar ficheiros para anexar`;
- nao capturar drag de texto ou elementos internos;
- aplicar limites de quantidade e tamanho no cliente para feedback rapido;
- manter o servidor como validacao definitiva;
- mostrar miniaturas antes do envio para imagens e video quando o browser conseguir gerar URL local;
- revogar URLs criados com `URL.createObjectURL` ao remover o ficheiro ou desmontar.

### 6.8. Visualizador de anexos

Extrair ou adaptar o `FilePreviewModal` existente para aceitar anexos de cartao e chat:

- imagem com zoom e download;
- video com controlos nativos e poster;
- PDF no visualizador existente;
- outros ficheiros com nome, tipo, tamanho e download;
- galeria com anterior e seguinte quando a mensagem tem varias imagens;
- fallback claro quando o preview falha;
- foco preso no modal, `Escape` para fechar e retorno do foco ao elemento de origem.

### 6.9. Links

Usar `linkify-react`, ja instalado, para renderizar URLs seguras. Nao usar `dangerouslySetInnerHTML`.

Tipos de preview:

- links para cartoes, quadros e projetos: resolver a partir do estado local ou de endpoint autenticado e mostrar preview interno;
- links para mensagens: abrir conversa e focar a mensagem;
- links externos prontos: titulo, dominio e descricao saneados;
- links pendentes ou falhados: manter apenas o link normal, sem skeleton permanente.

### 6.10. Link permanente

Formato recomendado:

```text
/projects/:projectId?chatConversation=:conversationId&chatMessage=:messageId
```

Fluxo:

1. Abrir o projeto.
2. Carregar conversas autorizadas.
3. Validar que a conversa pertence ao projeto.
4. Abrir a janela.
5. Pedir o historico com `aroundId`.
6. Centrar e realcar a mensagem.
7. Remover apenas os parametros de chat ao fechar o deep link, preservando outros parametros.

Sem acesso, mostrar `Mensagem indisponivel` sem revelar autor, texto ou existencia de conversa privada.

### 6.11. Guardados

Adicionar no `ChatPanel` um filtro ou separador `Guardadas`:

- agrupamento por conversa e data;
- excerto, autor e contexto do projeto;
- clicar abre a mensagem pelo mecanismo de link permanente;
- estado vazio com explicacao funcional;
- toggle otimista com rollback em caso de erro.

### 6.12. Preferencias e silenciar

Adicionar menu no header da janela:

- Todas as mensagens;
- Apenas mencoes;
- Silenciar 1 hora;
- Silenciar ate ao fim do dia;
- Silenciar permanentemente;
- Reativar notificacoes.

Mostrar um icone de silencio no header e na linha da conversa. O contador de nao lidas permanece visivel, mas conversas silenciadas nao produzem alerta ou som.

### 6.13. Rascunhos

Mover `text` e `replyTarget` para estado por conversa fornecido pelo `ChatContext` ou Redux:

- atualizar com debounce curto para evitar renders globais excessivos;
- limpar apenas depois de o envio ter sido aceite localmente;
- restaurar ao reabrir;
- limpar na revogacao do projeto e no logout;
- indicar rascunho na linha da conversa com `Rascunho:` sem expor o texto inteiro.

### 6.14. Reencaminhar

Criar um seletor de destino com as conversas autorizadas do projeto:

- pesquisa por nome;
- excluir destinos bloqueados;
- confirmacao quando a origem e uma conversa direta e o destino tem mais participantes;
- estado de envio e retry;
- abrir opcionalmente a conversa de destino depois do sucesso.

### 6.15. Grupos manuais

No separador de membros, adicionar `Novo grupo`:

- titulo obrigatorio entre 1 e 80 caracteres;
- selecao de pelo menos mais uma pessoa;
- pesquisa e selecao por teclado;
- resumo dos participantes antes de criar.

No header do grupo:

- avatares sobrepostos ou icone de grupo;
- titulo e numero de participantes;
- painel de membros;
- renomear, adicionar e remover para owners;
- sair do grupo para todos.

## 7. Ordem de implementacao

### Fase 1: ganhos rapidos sem migracao

- acoes de editar e remover;
- rascunho em memoria por conversa;
- arrastar e largar ficheiros;
- separador de novas mensagens e botao para regressar ao fim;
- confirmacao de leitura nas conversas diretas;
- testes de regressao do scroll e operacoes otimistas.

Complexidade relativa: media. Risco: baixo a medio.

### Fase 2: respostas e links permanentes

- migracao 04;
- resposta contextual;
- endpoint `aroundId`;
- copiar e abrir link permanente;
- foco e realce da mensagem;
- suporte da referencia no retry e nos sockets.

Complexidade relativa: media. Risco: medio.

### Fase 3: previews ricos

- presenter e URLs autenticados dos anexos;
- visualizador partilhado para imagem, video e PDF;
- links internos;
- migracao 07 e cache externo sob feature flag;
- testes SSRF e limites.

Complexidade relativa: alta. Risco: alto na parte externa.

### Fase 4: colaboracao em tempo real e preferencias

- indicador de escrita;
- migracao 05;
- endpoint de preferencias;
- evento `chatMessageAlert`;
- menu de silencio e apenas mencoes.

Complexidade relativa: media. Risco: medio.

### Fase 5: guardados e reencaminhamento

- migracao 06;
- lista de guardados;
- reencaminhamento transacional;
- copia segura de anexos e incremento de referencias.

Complexidade relativa: media a alta. Risco: medio a alto por causa dos ficheiros.

### Fase 6: grupos manuais

- migracao 08;
- endpoints e regras de ownership;
- UI de criacao e gestao de membros;
- revogacao imediata de acesso e sockets;
- adaptacao da listagem, titulos, avatares e preferencias.

Complexidade relativa: alta. Risco: alto por causa das permissoes.

## 8. Testes obrigatorios

### 8.1. Backend

- responder apenas a mensagem da mesma conversa;
- resposta a mensagem removida nao devolve texto antigo;
- edicao conserva resposta, anexos e reacoes;
- remocao e idempotente;
- `aroundId` nao permite consultar mensagens de outra conversa;
- link permanente de conversa privada devolve `404` a terceiros;
- cursor de leitura de duas sessoes continua monotono;
- typing exige socket, acesso e respeita rate limit;
- silencio expira de acordo com o servidor;
- `mentions` alerta apenas mencoes validas;
- guardar e remover dos guardados e idempotente;
- reencaminhar sem acesso a origem ou destino falha;
- reencaminhar anexos conserva contagem de `FileReference` em sucesso e rollback;
- owner de grupo nao consegue adicionar utilizador externo ao projeto;
- remover participante expulsa sockets e bloqueia historico imediatamente;
- suite SSRF cobre localhost, IPv4 privado, IPv6 local, DNS rebinding e redirects;
- todas as novas migracoes passam `up` e `down` numa base descartavel.

### 8.2. Frontend

- menu de mensagem funciona por rato, teclado e toque;
- editar cancela, guarda e reverte em falha;
- apagar exige confirmacao e apresenta erro acionavel;
- resposta e retry conservam o contexto;
- abrir permalink carrega mensagens antes e depois da ancora;
- receber mensagem enquanto se le acima nao desloca o scroll;
- o separador de novas desaparece apenas depois da leitura real;
- recibo aparece apenas na ultima mensagem propria coberta pelo cursor remoto;
- typing desaparece depois do timeout e ao desconectar;
- rascunhos nao passam entre conversas e sao limpos na revogacao;
- drop de texto nao e tratado como upload;
- URLs locais de ficheiros sao revogadas;
- modal de preview restaura o foco;
- mute e apenas mencoes atualizam com rollback;
- grupo removido desaparece sem refresh.

### 8.3. E2E com duas sessoes

- responder, editar e remover em tempo real;
- saltar para a mensagem original que ainda nao esta carregada;
- copiar um link numa sessao e abrir na outra;
- confirmacao de leitura e fronteira de nao lidas;
- typing e reconexao;
- silencio, expiracao e mencoes;
- reencaminhar de direto para grupo com confirmacao;
- adicionar e remover participante durante socket ativo;
- revogar acesso ao projeto durante visualizacao de preview.

## 9. Acessibilidade e comportamento responsivo

- todas as acoes de hover tambem devem estar disponiveis por foco;
- menus usam foco inicial, setas, `Escape` e retorno de foco;
- mudancas de envio, erro e novas mensagens usam uma regiao `aria-live` sem anunciar cada evento de typing;
- previews de imagem usam texto alternativo baseado no nome do ficheiro;
- videos nao iniciam automaticamente;
- realce de permalink nao depende apenas de cor;
- em ecras abaixo de 768 px, a conversa continua em painel unico e os menus usam a largura disponivel;
- nenhum botao deve ficar inacessivel quando o teclado virtual reduz o viewport;
- movimentos de scroll suave e realce respeitam `prefers-reduced-motion`.

## 10. Performance e limites

- manter a obtencao de respostas, guardados e previews em batch;
- nao executar uma query por mensagem ou participante;
- limitar a um preview externo por mensagem no primeiro release, embora todos os links continuem clicaveis;
- carregar visualizador de PDF, galeria e seletor de reencaminhamento de forma lazy;
- limitar utilizadores de typing mantidos em memoria por conversa;
- remover timers ao fechar conversa, mudar projeto ou reconectar;
- manter no maximo as paginas de historico necessarias em redor da ancora e da posicao atual;
- medir tamanho do payload de `get-message-extras` antes e depois das alteracoes.

## 11. Feature flags e rollout

Flags sugeridas:

```text
CHAT_REPLIES_ENABLED
CHAT_RICH_PREVIEWS_ENABLED
CHAT_EXTERNAL_LINK_PREVIEWS_ENABLED
CHAT_COLLABORATION_ENABLED
CHAT_CUSTOM_GROUPS_ENABLED
```

Sequencia de ativacao:

1. ambiente de desenvolvimento;
2. projeto interno com poucos membros;
3. replies, edicao e scroll para todos;
4. previews locais;
5. typing e preferencias;
6. guardados e reencaminhamento;
7. grupos manuais;
8. previews externos por ultimo.

Metricas sem conteudo privado:

- latencia e falhas por endpoint;
- numero de eventos de typing por socket;
- falhas e bloqueios do fetch de preview;
- tamanho medio dos payloads de mensagens;
- falhas de upload e rollback de referencias;
- revogacoes de acesso a grupos;
- erros de abertura por permalink;
- numero de queries na listagem e no envio.

## 12. Criterios de conclusao

A entrega fica concluida quando:

- todas as funcionalidades funcionam em conversa geral, direta e, quando aplicavel, grupo manual;
- nao existe caminho de leitura, preview, resposta ou reencaminhamento sem validacao de acesso no servidor;
- sockets refletem criacao, edicao, remocao, leitura, typing, preferencias e alteracoes de grupo sem refresh;
- scroll, rascunho e operacoes otimistas recuperam de erro e reconexao;
- uploads e reencaminhamentos nao deixam ficheiros ou referencias orfas;
- previews externos passam a suite SSRF;
- lint, testes unitarios, testes de integracao, build e migracoes `up/down` passam;
- os cenarios E2E de duas sessoes da secao 8.3 foram executados;
- o rollout pode ser interrompido por feature flag sem rollback de esquema.
