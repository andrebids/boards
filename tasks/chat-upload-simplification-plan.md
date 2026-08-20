# Plano de simplificação: envio de anexos no chat

## Objetivo

Eliminar falsos erros no envio de anexos, devolver sucesso logo após a persistência e reduzir a
coordenação entre cliente, endpoint HTTP e sockets. O resultado deve continuar a suportar ficheiros
grandes, mas um timeout ou uma resposta perdida nunca pode duplicar anexos nem marcar como falhada
uma mensagem que já foi gravada.

## Evidência que orienta o plano

- Os três anexos do incidente foram persistidos às 09:51:57, 09:52:32 e 09:53:02.
- O cliente só apresentou erro quando expirou o timeout, embora os registos já existissem.
- O endpoint continua a consultar mensagem, destinatários e contagens e a emitir vários eventos
  depois de persistir o anexo.
- A fila global do cliente deixa pedidos seguintes avançarem apenas após 30 segundos, criando o
  padrão sequencial observado.
- O `AbortError` nativo é exposto como erro técnico porque o normalizador considera o seu código
  numérico um código de aplicação.

## Decisões de arquitetura

- O contrato durável termina na persistência: depois de o anexo existir na base de dados, o endpoint
  devolve sucesso sem recalcular destinatários ou contagens de não lidos.
- Cada tentativa de upload recebe um `clientAttachmentId`. Repetir a mesma tentativa devolve o anexo
  já criado em vez de criar um duplicado.
- O evento socket de anexo transporta apenas `{ messageId, item }`; os clientes acrescentam ou
  atualizam o anexo pelo identificador, sem reconstruir toda a conversa.
- A mensagem e os anexos têm estados independentes. Uma mensagem persistida nunca volta a
  `isFailed` porque a confirmação de um anexo falhou.
- Uploads não passam pela fila global de pedidos. A ordenação necessária fica limitada à criação da
  mensagem; anexos da mesma mensagem podem ser confirmados independentemente.
- Broadcasts são atualização em tempo real, não parte da garantia de persistência. Uma falha de
  broadcast é registada, mas não altera a resposta HTTP já determinada.
- Não haverá reescrita geral do chat nem alteração dos limites de tamanho nesta iniciativa.

## Contrato alvo

### Pedido

`POST /api/chat-messages/:messageId/attachments`

Multipart com:

- `file`: ficheiro;
- `clientAttachmentId`: identificador estável gerado uma vez no cliente.

### Resposta

- Primeira criação: `201 { item, messageId }`.
- Repetição do mesmo `clientAttachmentId`: `200 { item, messageId, reused: true }`.
- A mesma tentativa nunca cria dois anexos.

### Evento socket

`chatMessageAttachmentCreate { messageId, item }`

O evento é idempotente no cliente: um anexo existente é atualizado; um novo é acrescentado.

## Dependências

```text
Idempotência no servidor
        |
        +--> Resposta imediata e evento pequeno
        |            |
        |            +--> Retry/reconciliação segura no cliente
        |                         |
Normalização HTTP ----------------+
                                  |
Fila concorrente para uploads ----+
                                  |
                         Estado e UI verdadeiros
```

## Fase 1 - tornar a persistência segura

### Tarefa 1: adicionar idempotência aos anexos

**Descrição:** Adicionar `client_attachment_id` opcional ao anexo de chat, com unicidade por mensagem,
e fazer o método de criação devolver o registo existente quando recebe novamente a mesma tentativa.

**Critérios de aceitação:**

- [ ] Duas chamadas com o mesmo `messageId` e `clientAttachmentId` produzem um único anexo.
- [ ] Tentativas diferentes continuam a permitir vários anexos dentro do limite atual.
- [ ] Anexos antigos sem `clientAttachmentId` continuam válidos.

**Verificação:**

- [ ] Testes server focados em `chat-message-attachments.test.js`.
- [ ] Teste concorrente com duas tentativas iguais.
- [ ] `git diff --check` nos ficheiros alterados.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `server/db/migrations/<timestamp>_add_chat_attachment_client_id.js`
- `server/api/models/ChatMessageAttachment.js`
- `server/api/hooks/query-methods/models/ChatMessageAttachment.js`
- `server/test/utils/chat-message-attachments.test.js`

**Escopo:** médio.

### Tarefa 2: responder imediatamente após persistir

**Descrição:** Reduzir o controlador de upload ao fluxo receber -> validar -> processar -> persistir ->
responder. Remover do caminho crítico as consultas de última mensagem, destinatários e não lidos. Emitir
um único evento pequeno de anexo e capturar separadamente qualquer falha de broadcast.

**Critérios de aceitação:**

- [ ] A resposta não depende de `getConversationRecipientUserIds` nem de
  `getUnreadCountsForUsers`.
- [ ] Acrescentar um anexo não altera a contagem de mensagens não lidas.
- [ ] Uma falha simulada no broadcast não transforma uma persistência bem-sucedida em erro HTTP.

**Verificação:**

- [ ] Teste do controlador confirma que a resposta é definida antes dos efeitos não duráveis.
- [ ] Teste do payload `chatMessageAttachmentCreate`.
- [ ] Testes server focados do chat e anexos.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `server/api/controllers/chat-message-attachments/create.js`
- `server/api/helpers/chat-message-attachments/publish-created.js` (novo, se necessário)
- `server/test/utils/chat-message-attachments.test.js`

**Escopo:** médio.

### Checkpoint 1: servidor

- [ ] Persistência idempotente verificada com chamadas repetidas e concorrentes.
- [ ] O endpoint já não executa consultas de inbox/não lidos depois da persistência.
- [ ] Uma falha pós-persistência não altera o resultado devolvido ao cliente.

## Fase 2 - tornar o cliente verdadeiro e recuperável

### Tarefa 3: normalizar corretamente aborts e timeouts HTTP

**Descrição:** Tratar `AbortError` antes da verificação genérica de `error.code`, produzir um erro de
aplicação estável (`E_HTTP_TIMEOUT`) e impedir a apresentação de mensagens internas do browser.

**Critérios de aceitação:**

- [ ] Um `DOMException` com nome `AbortError` resulta em `E_HTTP_TIMEOUT`.
- [ ] Erros HTTP estruturados do servidor mantêm código e status.
- [ ] A UI nunca mostra `signal is aborted without reason`.

**Verificação:**

- [ ] Novo teste unitário focado de `client/src/api/http.js`.
- [ ] Testes de chat que cobrem a cópia de timeout.

**Dependências:** nenhuma; pode ser implementada em paralelo com as tarefas 1 e 2 depois de o contrato
estar fechado.

**Ficheiros prováveis:**

- `client/src/api/http.js`
- `client/src/api/http.test.js` (novo)
- `client/src/locales/pt-PT/chat.js`
- `client/src/locales/en-US/chat.js`

**Escopo:** pequeno.

### Tarefa 4: enviar anexos fora da fila global

**Descrição:** Criar uma variante concorrente do helper autenticado e usá-la exclusivamente para
uploads de anexos. Manter a fila atual nas restantes operações até existir evidência para a remover.

**Critérios de aceitação:**

- [ ] Três anexos podem iniciar sem esperas artificiais de 30 segundos.
- [ ] Todos os pedidos continuam a receber o token de acesso atual.
- [ ] A criação da mensagem continua a terminar antes de começar o upload dos seus anexos.

**Verificação:**

- [ ] Teste do helper confirma concorrência e injeção de autorização.
- [ ] Teste da saga confirma que o upload não chama a variante serializada.

**Dependências:** contrato da tarefa 1 definido.

**Ficheiros prováveis:**

- `client/src/sagas/core/request.js`
- `client/src/sagas/core/request.test.js` (novo)
- `client/src/sagas/core/services/chat.js`
- `client/src/sagas/core/services/chat.test.js`

**Escopo:** médio.

### Tarefa 5: separar sucesso da mensagem e estado dos anexos

**Descrição:** Manter a mensagem como enviada assim que a criação via socket for confirmada. Guardar
estado por anexo (`uploading`, `confirmed`, `unknown`, `failed`) e renderizar retry apenas para o anexo,
nunca para a mensagem inteira.

**Critérios de aceitação:**

- [ ] Um timeout de anexo não altera uma mensagem persistida para `isFailed`.
- [ ] O evento socket ou a resposta HTTP confirma o anexo pelo `clientAttachmentId` sem o duplicar.
- [ ] O utilizador vê “A confirmar anexo” num resultado incerto e “Tentar novamente” apenas quando a
  repetição é idempotente.

**Verificação:**

- [ ] Testes do modelo/reducer para resposta, evento fora de ordem e evento duplicado.
- [ ] Teste da lista de mensagens para os quatro estados do anexo.
- [ ] Smoke test no ambiente local servido em `http://localhost:3008` por hot reload.

**Dependências:** tarefas 1, 2, 3 e 4.

**Ficheiros prováveis:**

- `client/src/models/ChatMessage.js`
- `client/src/sagas/core/services/chat.js`
- `client/src/components/chat/MessageList/MessageList.jsx`
- `client/src/reducers/chat.test.js`
- `client/src/sagas/core/services/chat.test.js`

**Escopo:** médio.

### Checkpoint 2: cliente

- [ ] Três imagens coladas rapidamente não são espaçadas por 30 segundos.
- [ ] Uma resposta perdida não marca a mensagem como falhada.
- [ ] Resposta e socket em qualquer ordem produzem exatamente um anexo.

## Fase 3 - verificação e limpeza

### Tarefa 6: validar falhas reais e remover instrumentação obsoleta

**Descrição:** Validar o fluxo com duas sessões e falhas controladas, conservar apenas logs técnicos
úteis e remover diagnósticos que existiam apenas para compensar o fluxo anterior.

**Critérios de aceitação:**

- [ ] Uma segunda sessão recebe o anexo sem reload.
- [ ] Simular perda da resposta depois da persistência permite retry sem duplicação.
- [ ] Os logs distinguem `receive`, `process`, `persist` e `publish`, sem conteúdo ou dados pessoais.

**Verificação:**

- [ ] Suites focadas cliente e servidor passam.
- [ ] `git diff --check` passa.
- [ ] Validação no browser local através de hot reload; não executar build.

**Dependências:** tarefas 1 a 5.

**Ficheiros prováveis:**

- `server/api/controllers/chat-message-attachments/create.js`
- `server/api/controllers/chat-diagnostics/create.js`
- `client/src/sagas/core/services/chat.js`
- testes focados existentes

**Escopo:** pequeno-médio.

### Checkpoint final

- [ ] Mensagem e anexo refletem o estado persistido real.
- [ ] Repetições são idempotentes e não criam duplicados.
- [ ] O caminho crítico termina na persistência.
- [ ] Não existem esperas artificiais de 30 segundos entre uploads.
- [ ] Nenhum build foi executado; a validação local foi feita por hot reload e testes focados.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Cliente e servidor com contratos diferentes durante deploy | Alto | Entregar migração e servidor compatível antes de ativar o novo cliente. |
| Retry criar duplicados | Alto | Índice único e teste concorrente no servidor. |
| Outro cliente não atualizar em tempo real | Médio | Evento dedicado pequeno e teste com duas sessões. |
| Remover contagens alterar o inbox | Médio | Confirmar que anexar não cria mensagem nem aumenta unread; inbox recarrega extras persistidos. |
| Paralelizar uploads saturar servidor | Médio | Respeitar o limite de anexos por mensagem e limitar concorrência no cliente a 3. |
| Ficheiros grandes excederem o timeout | Médio | Timeout continua configurável; estado incerto e retry idempotente evitam falso erro e duplicação. |

## Fora de escopo

- Reescrever todo o transporte socket do chat.
- Remover imediatamente a fila global de todas as áreas da aplicação.
- Alterar limites de PSD, vídeo ou outros anexos.
- Executar build de produção para validar alterações locais.

## Ordem recomendada de entrega

1. Tarefa 1 - idempotência.
2. Tarefa 2 - resposta imediata.
3. Tarefa 3 - normalização do timeout.
4. Tarefa 4 - uploads fora da fila global.
5. Tarefa 5 - estado verdadeiro na UI.
6. Tarefa 6 - QA, logs e limpeza.

Cada tarefa deve ser entregue e verificada isoladamente; não agrupar tudo num único commit.
