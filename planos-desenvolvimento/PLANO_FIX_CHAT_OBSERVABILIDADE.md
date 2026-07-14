# Plano de correção do chat e observabilidade

## Objetivo

Corrigir falhas de fluxo identificadas no chat, completar o contrato de eventos em tempo real e tornar falhas relevantes observáveis no Sentry sem enviar conteúdo privado de conversas, anexos ou URLs.

## Escopo e prioridades

| Prioridade | Entrega | Resultado esperado |
| --- | --- | --- |
| P0 | Conversas diretas e alertas | Escolher um membro abre apenas a conversa direta; alertas de chat são consumidos pelo cliente. |
| P0 | Robustez de previews | Uma falha de preview nunca impede a entrega, o broadcast ou o retry de uma mensagem. |
| P1 | Sentry cliente e servidor | Erros inesperados do chat são agrupáveis, rastreáveis e não expõem conteúdo privado. |
| P1 | Falhas operacionais na UI | Operações falhadas deixam feedback recuperável e telemetria útil. |
| P2 | Concorrência e manutenção | Criação de grupos é correlacionada pela resposta; estado de typing não cresce indefinidamente. |
| P2 | Cobertura e documentação | Fluxos críticos têm testes e a arquitetura descreve o comportamento final. |

Fora de escopo: notificações persistentes, email, push externo, alteração do modelo `Notification` e reescrita de migrações já aplicadas.

## Fase 0 — Preparação

1. Criar uma branch dedicada e confirmar os ficheiros já modificados no worktree antes de editar áreas sobrepostas.
2. Confirmar os ambientes onde o chat e `CHAT_EXTERNAL_LINK_PREVIEWS_ENABLED=true` estão ativos.
3. Definir responsável, DSNs por ambiente e retenção de eventos no Sentry antes de enviar telemetria nova.
4. Manter previews externos desligados até à conclusão da Fase 2.

## Fase 1 — Corrigir os fluxos P0 do cliente

### 1.1 Conversa direta

Problema: `openDirectConversation` trata qualquer conversa não geral que contenha o membro como conversa direta; um grupo personalizado pode ser aberto por engano.

Alterações:

- Criar ou reutilizar um predicado explícito para `projectDirect`.
- Usá-lo na procura de conversa existente e na resolução de `pendingConversation`.
- Rever o popover de conversas recentes para não apresentar grupos com avatar de uma conversa direta.

Critérios de aceitação:

- Com um grupo que contém A e B, escolher B abre/cria a conversa direta A–B, nunca o grupo.
- Uma conversa direta já existente é reutilizada.
- Grupos continuam a poder ser abertos pela lista de conversas.

### 1.2 Consumir `chatMessageAlert`

Problema: o servidor emite o evento, mas o cliente não o subscreve, contrariando o contrato documentado.

Alterações:

- Adicionar handler e ciclo completo `on`/`off` no watcher de socket.
- Criar uma ação de domínio mínima para o alerta, sem texto da mensagem.
- Aplicar aviso visual acessível no launcher e, apenas se aprovado pelo produto, som opcional respeitando preferências do browser.
- Não mostrar alerta quando a conversa está aberta, visível e focada; nesses casos a leitura normal já resolve o estado.

Critérios de aceitação:

- O destinatário de uma mensagem com nível `all` recebe o aviso; com `mentions`, recebe-o apenas quando mencionado; com `none` ou mute temporário não recebe.
- O payload tratado não inclui texto, URL, nome de ficheiro ou token.

## Fase 2 — Tornar previews externos tolerantes a falhas

Problema: a mensagem é persistida antes de `syncMessageLinks`; um erro nessa etapa interrompe o request antes do broadcast. O trabalho em `setImmediate` também deixa operações de base de dados sem tratamento de erros.

Alterações:

1. Separar a criação da mensagem e o broadcast do processamento de previews.
2. Tornar a associação e resolução de previews uma operação *best effort*: falhas registam contexto seguro, mas não alteram o sucesso da criação da mensagem.
3. Envolver todo o trabalho assíncrono do preview num `try/catch`, incluindo atualização do cache, leitura da mensagem, construção de extras e broadcast.
4. Garantir que, quando o preview fica pronto, o `chatMessageUpdate` contém o estado canónico; quando falha, guardar apenas o estado `failed`/`blocked` e nunca a causa interna detalhada para o cliente.
5. Preservar os controlos atuais de SSRF, timeout, limite de bytes e redirects; testar DNS/redirects para endereços privados.

Critérios de aceitação:

- Indisponibilidade da tabela/cache de previews ou erro de fetch não impede a resposta `201` nem o `chatMessageCreate`.
- Um retry idempotente não produz mensagens duplicadas e uma mensagem criada mantém-se visível para todos os participantes.
- Nenhuma rejeição não tratada é produzida pelo callback assíncrono.

## Fase 3 — Sentry e política de dados

### 3.1 Cliente

- Substituir DSN, ambiente e release fixos por variáveis Vite documentadas (`VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE`).
- Inicializar apenas se existir DSN; usar sampling configurável por ambiente e desativar PII por omissão.
- Adicionar Error Boundary no topo da aplicação, com fallback que permita recarregar sem perder diagnóstico.
- Configurar `beforeSend`/`beforeBreadcrumb` para remover corpo de pedidos, texto de mensagens, nomes de anexos, URLs com query string, cabeçalhos de autenticação e dados de formulário.
- Integrar upload de source maps apenas no pipeline de release, com token fora do bundle e sem o executar no desenvolvimento.

### 3.2 Servidor

- Adicionar SDK Node e inicialização antes do bootstrap Sails, ativada apenas por `SENTRY_DSN`.
- Capturar exceções inesperadas e erros de tarefas em segundo plano; não reportar erros de validação/autorização previstos (4xx).
- Criar uma função comum de reporte do chat com tags limitadas: `area=chat`, operação, tipo de conversa, código HTTP/classe de erro e ambiente.
- Nunca enviar texto, menções, URLs, anexos, email, token, IP ou dados do request; IDs só se a política de privacidade os aprovar, de preferência normalizados/hashes.
- Associar utilizador somente com identificador pseudonimizado e apenas após aprovação de privacidade.

Critérios de aceitação:

- Um erro inesperado de criação, anexo, socket ou preview é pesquisável por operação e release no Sentry.
- Erros 4xx normais não criam ruído.
- Testes de sanitização provam que um texto enviado no chat e uma URL com token não surgem no evento.

## Fase 4 — Feedback, correlação e housekeeping

### 4.1 Falhas silenciosas

- Inventariar os `catch` vazios das sagas do chat.
- Para operações iniciadas pelo utilizador (reação, reencaminhamento, edição de grupo, participantes, preferências e saída), mostrar feedback localizado e manter/reverter o estado de forma consistente.
- Para operações efémeras (typing e unsubscribe), não criar toast, mas reportar apenas erros inesperados com rate limit.

### 4.2 Criação de grupos

- Transportar uma chave de correlação/request ID desde a ação de criação até à resposta de sucesso.
- Fazer o painel abrir o `conversation.id` devolvido, em vez de procurar pelo título.
- Impedir submissões repetidas enquanto a criação está pendente e apresentar erro recuperável se falhar.

### 4.3 Estado de typing

- Substituir o `Map` global por um armazenamento com TTL/limpeza periódica, ou limpar por disconnect quando a infraestrutura de sockets o permitir.
- Manter o rate limit por utilizador/conversa e validar que a limpeza não remove um evento de escrita ainda válido.

## Fase 5 — Testes e validação

Adicionar testes direcionados para:

- resolução de conversa direta na presença de grupos personalizados;
- subscrição, remoção e aplicação de `chatMessageAlert`;
- preferências `all`, `mentions`, `none` e mute temporário;
- falha de associação/fetch/update de preview sem perda do broadcast;
- retry idempotente após falha de preview;
- sanitização de eventos Sentry cliente e servidor;
- correlação da criação de grupos com títulos iguais;
- expiração/limpeza do rate-limit de typing;
- mensagens, anexos e sockets com duas sessões reais, incluindo reconexão e revogação de acesso.

Validar sem build de produção: usar o ambiente de desenvolvimento com hot reload e os testes direcionados. Executar build apenas mediante pedido explícito ou para validar uma release.

## Rollout e monitorização

1. Entregar primeiro Fases 1 e 2 com previews externos ainda desligados.
2. Ativar Sentry em desenvolvimento/staging com sampling reduzido e verificar sanitização de eventos.
3. Ativar previews em staging, criar mensagens com URLs válidas, bloqueadas, lentas e indisponíveis.
4. Publicar progressivamente em produção; acompanhar falhas por operação, taxa de `chatMessageAlert` recebido e erros de preview.
5. Definir alerta para aumento de erros de criação/anexos e para rejeições não tratadas do worker de preview.

## Documentação a atualizar no mesmo conjunto de alterações

- `docs/chat/ARCHITECTURE.md`: contrato efetivo de alertas, isolamento de previews e comportamento de erro.
- `docs/chat/CHANGELOG.md`: correções entregues e impacto operacional.
- `server/env.sample`: variáveis Sentry do servidor e as variáveis de build do cliente, com notas de privacidade.
- Este plano: marcar fases concluídas e registar desvios ou decisões de produto.

## Definição de concluído

- Todos os critérios P0 e P1 passam em testes automatizados e duas sessões reais.
- Não existem `catch` silenciosos para ações explícitas do utilizador sem uma decisão documentada.
- Sentry recebe erros inesperados do cliente e servidor com contexto seguro e source maps na release.
- Não há texto de chat, URLs privadas, nomes de anexos, tokens ou PII não aprovada nos eventos.
- Documentação e changelog refletem o comportamento entregue.
