# Plano de melhoria: imagens do chat em telemóvel

## Objetivo

Garantir que anexos de imagem persistidos voltam a aparecer quando um telemóvel retoma o chat após suspensão da página, oferecer uma recuperação visível quando a imagem não carrega e deixar evidência suficiente para distinguir falha de autenticação, proxy e renderização.

## Evidência atual

- As imagens da Catarina ficaram persistidas, com originais e thumbnails válidas.
- A sessão da Julie usa Safari num iPhone.
- As conversas abertas já são recarregadas quando o Socket.IO confirma uma reconexão.
- O iOS pode retomar uma página congelada sem produzir um evento de reconexão; nesse caso, a conversa não é reconciliada.
- O logger de produção conserva a mensagem, mas descarta os objetos de contexto passados ao Winston. Por isso, os eventos atuais não permitem correlacionar utilizador, mensagem, anexo e motivo.

## Decisões

- Usar `GET /api/chat-conversations/:id/messages` como fonte autoritativa e recarregar a janela recente com `replace: true` ao regressar do segundo plano. Isto também volta a subscrever a sala Socket.IO.
- Preservar mensagens locais pendentes/falhadas; o reducer atual já não as remove durante uma substituição.
- Reutilizar o endpoint de diagnóstico e as traduções `chat.previewUnavailable` e `chat.retry`.
- Registar apenas identificadores técnicos e motivos normalizados. Nunca registar tokens, conteúdo das mensagens, nomes de ficheiros ou URLs assinados.
- Não alterar fusos horários, formatos PNG, autenticação ou armazenamento.
- Não implementar URLs assinados nesta primeira fase. Só avançar se a nova evidência confirmar rejeições de autenticação em pedidos de imagem.

## Fase 1: Tornar a falha observável

### Tarefa 1 — Diagnóstico seguro de carregamento de imagens

**Descrição:** Estender o diagnóstico existente com o evento `image-preview-failed`, incluindo `messageId`, `attachmentId`, variante e estado de conectividade. Serializar o contexto seguro dentro da própria mensagem para que apareça nos logs atuais.

**Critérios de aceitação:**

- Uma imagem falhada gera no máximo um diagnóstico por anexo até existir uma nova tentativa.
- O log permite correlacionar utilizador, mensagem, anexo e variante.
- O log não contém token, texto da mensagem, nome do ficheiro nem URL.

**Verificação:**

- `cd server && npx mocha test/lifecycle.test.js test/utils/chat-diagnostics.test.js`
- Teste focado no cliente para deduplicação e conteúdo do diagnóstico.
- Confirmar localmente que uma URL de thumbnail inválida produz um único evento.

**Dependências:** Nenhuma.

**Ficheiros prováveis:**

- `server/api/controllers/chat-diagnostics/create.js`
- `server/test/utils/chat-diagnostics.test.js`
- `client/src/sagas/core/services/chat.js`
- `client/src/components/chat/MessageList/MessageList.jsx`

**Âmbito estimado:** Médio, 4 ficheiros; pode exigir uma ação/watch mínima se o componente não puder reutilizar o fluxo atual.

## Fase 2: Recuperação automática no iPhone

### Tarefa 2 — Reconciliar a conversa ao regressar ao primeiro plano

**Descrição:** Detetar `visibilitychange` de oculto para visível e `pageshow` persistido. Recarregar uma vez a janela recente da conversa com `{ replace: true }`, sem esperar que o Socket.IO declare reconexão.

**Critérios de aceitação:**

- Uma conversa aberta no iPhone é reconciliada ao voltar do segundo plano.
- Anexos acrescentados a uma mensagem já carregada aparecem após a reconciliação.
- Mensagens locais pendentes/falhadas e a posição útil de leitura não são perdidas.
- Eventos de foco repetidos não criam pedidos concorrentes ou um ciclo de recargas.

**Verificação:**

- Teste focado para uma única recarga por transição para primeiro plano.
- `cd client && npm test -- --runInBand src/sagas/core/services/chat.test.js`
- Validação por hot reload em `http://localhost:3008`; não executar build.

**Dependências:** Tarefa 1, para observar qualquer falha residual.

**Ficheiros prováveis:**

- `client/src/components/chat/ChatWindow/ChatWindow.jsx`
- `client/src/sagas/core/services/chat.js`
- `client/src/sagas/core/services/chat.test.js`

**Âmbito estimado:** Médio, 3 ficheiros. Integrar cuidadosamente com as alterações atuais de horizonte de leitura no `ChatWindow`.

## Checkpoint: sincronização móvel

- [ ] O servidor devolve novamente os anexos persistidos.
- [ ] A conversa volta a ficar inscrita na sala Socket.IO.
- [ ] Não existem pedidos duplicados ao alternar rapidamente entre aplicações.
- [ ] Os testes focados do cliente e servidor passam.

## Fase 3: Estado de erro utilizável

### Tarefa 3 — Mostrar falha e permitir nova tentativa

**Descrição:** Substituir a imagem vazia por um estado acessível com `chat.previewUnavailable` e `chat.retry`. Ao tocar, reconciliar a conversa e voltar a carregar a thumbnail com uma tentativa nova.

**Critérios de aceitação:**

- Uma thumbnail falhada nunca deixa um bloco vazio ou invisível.
- O utilizador consegue tentar novamente por toque e teclado.
- A tentativa não entra num ciclo automático e conserva o nome acessível da imagem.

**Verificação:**

- Teste focado dos estados carregando, falhado e recuperado.
- Verificação visual em largura de iPhone e interação por toque.
- Confirmar que duas imagens na mesma mensagem falham e recuperam independentemente.

**Dependências:** Tarefas 1 e 2.

**Ficheiros prováveis:**

- `client/src/components/chat/MessageList/MessageList.jsx`
- `client/src/components/chat/MessageList/MessageList.module.scss`
- Um teste focado junto de `MessageList`, apenas se necessário.

**Âmbito estimado:** Pequeno a médio, 2–3 ficheiros.

## Checkpoint: decisão sobre autenticação móvel

Depois de observar pelo menos uma reprodução real:

- Se o pedido chegar com `200` e houver `image-preview-failed`, corrigir renderização/cache no cliente.
- Se houver `401`, confirmar host e cookies da sessão; só então desenhar URLs assinados temporários.
- Se o pedido não chegar à aplicação e o proxy registar stream fechado, investigar transporte HTTP/2/Caddy com acesso temporário e limitado aos endpoints de anexos.

URLs assinados ficam fora do âmbito inicial porque aumentam a superfície de segurança, expiração e cache sem existir ainda prova de que sejam necessários.

## Fase 4: Validação e produção

### Tarefa 4 — Verificação real e rollout controlado

**Descrição:** Validar primeiro localmente e depois num iPhone/Safari real. Só após aprovação, publicar pelo fluxo Ansible existente e observar os novos eventos.

**Critérios de aceitação:**

- Safari no iPhone: abrir conversa, enviar duas imagens a partir de outra sessão, pôr a app em segundo plano, regressar e ver ambas.
- Repetir com a página instalada no ecrã principal, se esse for o modo usado pela Julie.
- Nenhum token ou conteúdo privado aparece nos logs.
- Produção mantém uploads, downloads, chat e notificações saudáveis.

**Verificação:**

- Hot reload local em `http://localhost:3008`.
- Testes focados e lint apenas dos ficheiros alterados.
- Inspeção remota do Safari, se disponível, para confirmar o estado HTTP das thumbnails.
- Após deploy autorizado, canário com uma conversa de teste e consulta dos logs via Ansible-Controller WSL.

**Dependências:** Tarefas 1–3 e aprovação explícita para deploy.

**Âmbito estimado:** Pequeno; validação e rollout, sem nova funcionalidade.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Recarga ao regressar altera scroll | Médio | Preservar âncora/posição e testar conversa longa |
| Pedidos repetidos ao alternar aplicações | Baixo | Detetar transição real e bloquear enquanto já existe fetch |
| Telemetria expõe dados privados | Alto | Lista fechada de campos normalizados; testes negativos para conteúdo/token |
| Estado de erro entra em ciclo | Médio | Nova tentativa apenas por ação do utilizador |
| Conflito com alterações atuais no chat | Médio | Integrar sobre o estado atual, sem substituir trabalho não relacionado |

## Fora do âmbito inicial

- URLs assinados para imagens.
- Alterações globais ao logger Winston.
- Tornar anexos públicos ou enfraquecer autenticação.
- Alterar formatos de imagem, proxy ou fuso horário sem evidência causal.

