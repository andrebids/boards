# Plano de implementação: notificações Web Push do chat Boards

## Objetivo

Depois de o utilizador autorizar explicitamente o browser, entregar avisos nativos de novas mensagens do chat no Windows e macOS quando Boards está aberto, em segundo plano ou sem nenhuma janela aberta. Um clique no aviso ou a ação progressiva **Responder** abre a conversa e deixa o compositor focado.

No macOS, Safari 16/macOS 13+ suporta entrega mesmo sem o Safari estar em execução. Em Chrome e Edge desktop, o compromisso é entregar sem uma página Boards aberta enquanto o browser ou o respetivo processo em segundo plano estiver disponível; um `Quit/Exit` completo do browser não é uma garantia da Web Push.

## Decisões fechadas

### Uma única entrega Web Push visível

```text
Mensagem elegível
  -> transação cria um registo na outbox
  -> worker do servidor revalida acesso e preferências
  -> web-push envia para cada subscrição ativa do destinatário
  -> service worker recebe e mostra sempre showNotification()
  -> clique/Responder abre a conversa
  -> se necessário, login preserva o destino e retoma a conversa
```

- Não usar `new Notification()` nem um pacote React.
- Todo o evento `push` recebido produz imediatamente um aviso visível. Não o suprimir no service worker quando Boards está focado: Safari não permite push invisível e Edge pode criar um aviso genérico quando o worker não apresenta o seu.
- O aviso da aba/favicon e o preview visual já existentes continuam disponíveis. Na primeira versão aceita-se que o banner do sistema também apareça com Boards focado; evitar isso exigiria presença por dispositivo no servidor e fica fora do âmbito.
- O worker é dedicado a Push e não implementa precache, offline ou PWA adicional.
- `tag: boards-chat:<conversationId>` substitui o aviso anterior da mesma conversa. `renotify: true` é progressivo: onde for suportado, uma nova mensagem volta a alertar sem acumular vários banners.
- O botão **Responder** é progressivo. Clicar no corpo do aviso tem sempre o mesmo destino. Não existe resposta escrita dentro do banner.

### Pacote do servidor

- Instalar e fixar exatamente `web-push@3.6.7`, sem `^` e sem instalar diretamente do GitHub.
- A versão npm 3.6.7 é a versão publicada e CommonJS, compatível com o servidor Node 18+ atual.
- O repositório `master` tem manutenção recente e está a migrar para ESM apesar de ainda declarar a versão 3.6.7. Uma futura atualização do pacote deve ser deliberada e validar `require()` versus `import`; não assumir que o código recente do `master` já está no npm.
- `web-push` trata VAPID, encriptação e protocolo. Não adicionar OneSignal, Pushwoosh ou outro fornecedor enquanto não houver uma necessidade operacional concreta.

### Contrato de uso documentado da v3.6.7

Usar como referência de implementação o [README da tag publicada v3.6.7](https://github.com/web-push-libs/web-push/blob/v3.6.7/README.md), não o README do `master`:

| Necessidade | API/documentação do pacote | Decisão Boards |
| --- | --- | --- |
| Gerar chaves | [`generateVAPIDKeys()`/CLI](https://github.com/web-push-libs/web-push/blob/v3.6.7/README.md#generatevapidkeys) | Gerar uma vez fora do arranque da aplicação e guardar como secrets |
| Configurar VAPID | [`setVapidDetails()`](https://github.com/web-push-libs/web-push/blob/v3.6.7/README.md#setvapiddetailssubject-publickey-privatekey) | Chamar uma vez no arranque quando `WEB_PUSH_ENABLED=true` |
| Enviar | [`sendNotification()`](https://github.com/web-push-libs/web-push/blob/v3.6.7/README.md#sendnotificationpushsubscription-payload-options) | Enviar JSON mínimo e encriptado a partir do worker da outbox |
| Controlar entrega | Opções `TTL`, `urgency` e `timeout` de `sendNotification()` | `TTL: 600`, `urgency: 'high'`, `timeout: 10000` |
| Tratar falhas | Promise rejeitada com `statusCode`, `headers` e `body` | Decidir retry por `statusCode`; nunca registar `body` nem o endpoint da subscrição |

Uso esperado no servidor:

```js
const webpush = require('web-push');

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

await webpush.sendNotification(subscription, JSON.stringify(payload), {
  TTL: 600,
  urgency: 'high',
  timeout: 10000,
});
```

A documentação define um TTL default de quatro semanas, inadequado para mensagens de chat potencialmente já lidas. Por isso, `TTL: 600` é obrigatório e deve ter teste. A geração de chaves nunca acontece automaticamente no arranque, para não invalidar subscrições após restart/deploy. `VAPID_SUBJECT` deve ser um contacto `mailto:` ou URL HTTPS real; a própria documentação alerta que um subject `https://localhost` é rejeitado pelo endpoint Safari.

### Preferências efetivas

Um Push só é criado quando todas as condições abaixo permitem:

1. O dispositivo está subscrito.
2. O destinatário está ativo e não é o remetente.
3. O utilizador permite o tipo de aviso na preferência pessoal.
4. A preferência da conversa permite a mensagem e a conversa não está silenciada.
5. O utilizador continua com acesso à conversa no momento do envio/retry.

| Preferência pessoal | Elegibilidade do chat |
| --- | --- |
| Todas | Todas as mensagens permitidas pela conversa |
| Apenas essenciais | Mensagens diretas e menções |
| Nenhuma | Nenhum Push |

| Preferência da conversa | Elegibilidade adicional |
| --- | --- |
| Todas | Permite a mensagem |
| Apenas menções | Permite apenas se o utilizador foi mencionado |
| Nenhuma/silenciada | Não permite |

Mensagens diretas contam como essenciais. O toggle **Notificações do chat neste dispositivo** controla apenas o canal deste browser e não ignora as preferências acima.

### Conteúdo e privacidade

O sistema operativo controla posição, tipografia, som, duração, botões e apresentação do nome da origem. O layout é apenas conceptual:

```text
[ícone Boards]  Boards
João Silva em Geral
Podemos validar a lista antes da reunião?
[Responder, quando suportado]
```

- Pré-visualização de texto normalizada e limitada a 160 caracteres.
- Mensagem só com anexos usa “Enviou um ficheiro” apenas depois de o primeiro anexo ter sido persistido.
- O payload encriptado contém apenas versão, título/corpo localizados pelo tradutor Sails do servidor, `projectId`, `conversationId`, `messageId` e label da ação. A `tag` é derivada localmente pelo service worker; o idioma não é enviado no payload.
- Nunca incluir token, endpoint Push, chaves, anexo, URL externa ou conteúdo completo da mensagem.
- O texto de ativação avisa que a pré-visualização pode aparecer no ecrã bloqueado. Uma preferência adicional para ocultar previews fica fora da primeira versão.

## Fase 1 — Configuração VAPID e pacote

### Tarefa 1 — Configurar Web Push no servidor

**Descrição:** Adicionar `web-push@3.6.7` ao servidor e configurar a funcionalidade através de `WEB_PUSH_ENABLED`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`. A chave pública e o estado da funcionalidade são apresentados em `/api/config`; a chave privada nunca sai do servidor.

**Critérios de aceitação:**

- [ ] O servidor usa a versão npm fixada `3.6.7` através de CommonJS.
- [ ] Em produção, configuração incompleta com a feature ativa falha cedo com mensagem sem segredos.
- [ ] Com a feature desativada, cliente e worker não subscrevem nem enviam Push.

**Verificação:** teste focado do parser/configuração; confirmar que respostas e logs nunca contêm a chave privada.

**Ficheiros prováveis:** `server/package.json`, lockfile, `server/config/custom.js`, `server/env.sample`, apresentação de config e teste.

**Dependências:** nenhuma.

## Fase 2 — Subscrição segura do browser

### Tarefa 2 — Persistir e autorizar subscrições

**Descrição:** Criar `web_push_subscription` com `user_id`, endpoint, `p256dh`, `auth`, `expiration_time` e datas. O endpoint é a identidade do browser; não criar um identificador de dispositivo paralelo. Criar endpoints autenticados para upsert e remoção da subscrição atual.

**Critérios de aceitação:**

- [ ] `endpoint` é globalmente único e a remoção só é permitida ao respetivo utilizador.
- [ ] Um endpoint já pertencente a outra conta nunca é reatribuído silenciosamente.
- [ ] A eliminação/desativação do utilizador remove as subscrições relacionadas.
- [ ] Existe um limite de 10 subscrições ativas por utilizador, removendo primeiro as expiradas/mais antigas.

**Segurança:** validar tamanhos e Base64URL das chaves; aceitar apenas endpoint HTTPS sem credenciais; rejeitar localhost, IPs privadas/reservadas e redirects; não registar endpoint, chaves ou corpo dos pedidos.

**Verificação:** testes de upsert idempotente, isolamento entre contas, limite, validação SSRF e cascade de utilizador.

**Ficheiros prováveis:** migração, modelo/query methods, rotas/controladores, helper de validação e testes de servidor.

**Dependências:** Tarefa 1.

### Tarefa 3 — Consentimento, reconciliação e logout

**Descrição:** Em `UserSettingsModal/NotificationsPane`, adicionar **Notificações do chat neste dispositivo**. Só um clique explícito pede permissão, regista o worker e chama `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`. O estado deriva de suporte, `Notification.permission`, `getSubscription()` e resultado da sincronização com o servidor.

**Critérios de aceitação:**

- [ ] Nenhum prompt aparece sem gesto do utilizador.
- [ ] Estados inativo, a ativar, ativo, bloqueado, não suportado e erro são acessíveis e traduzidos pelo i18next nas línguas suportadas pelo cliente.
- [ ] Um refresh reconcilia uma subscrição local previamente autorizada sem criar duplicados.
- [ ] Desativar remove o registo remoto e executa `PushSubscription.unsubscribe()`.
- [ ] Logout tenta remover remotamente e executa sempre `unsubscribe()` local, mesmo perante falha de rede; outra conta começa inativa.

**Verificação:** testes da máquina de estados e lifecycle; tabulação e hot reload em `http://localhost:3008`.

**Ficheiros prováveis:** `NotificationsPane`, utilitário/API client de Push, logout saga, traduções e testes focados.

**Dependências:** Tarefa 2.

## Checkpoint A — subscrição

- [ ] Ativar, refrescar, desativar e voltar a ativar não duplica subscrições.
- [ ] Logout e troca de conta não deixam a conta anterior a receber avisos.
- [ ] Permissão bloqueada no browser apresenta instrução, sem repetir o prompt.

### Tarefa 3A — Convite inicial após o deploy

**Descrição:** Depois de um utilizador autenticado entrar no Boards, mostrar uma única vez um convite interno para ativar notificações do chat neste dispositivo, apenas quando Web Push for suportado, a feature estiver ativa e a permissão ainda estiver em `default`.

**Fluxo:** o convite explica o benefício e apresenta **Ativar notificações** e **Agora não**. Só o clique em **Ativar notificações** chama `Notification.requestPermission()` e cria a subscrição; nunca pedir a permissão nativa automaticamente no carregamento da página.

**Persistência:** guardar por utilizador a data de dispensa/aceitação para não repetir o convite em cada login. Uma dispensa permite voltar a apresentar o convite após um intervalo definido; uma recusa do browser não volta a abrir o pedido nativo e remete para Definições.

**Critérios de aceitação:**

- [ ] O convite aparece no máximo uma vez por utilizador/dispositivo até ser dispensado ou aceite.
- [ ] O botão reutiliza o mesmo fluxo de ativação das Definições.
- [ ] A opção mantém-se sempre disponível em Definições para ativar ou desligar.
- [ ] Estados de bloqueio mostram instruções sem novos prompts automáticos.

## Fase 3 — Worker e navegação

### Tarefa 4 — Mostrar o aviso persistente

**Descrição:** Criar um service worker mínimo em `client/public/`. No evento `push`, validar a versão e os campos do payload e chamar sempre `registration.showNotification()`. No `notificationclick`, fechar o aviso, focar/navegar uma janela Boards existente ou abrir uma nova rota relativa à mesma origem.

**Critérios de aceitação:**

- [ ] Cada Push válido recebido tenta mostrar um aviso visível, com fallback genérico para payload inválido.
- [ ] A `tag` substitui avisos da mesma conversa sem misturar conversas.
- [ ] A ação **Responder** só é enviada quando existem ações disponíveis; o clique principal funciona sempre.
- [ ] URLs do payload nunca são aceites; a rota é construída localmente a partir dos IDs validados.

**Cache/deployment:** servir o script do worker com `Cache-Control: no-cache` e registar com `updateViaCache: 'none'`, porque os restantes assets de produção têm cache longo.

**Verificação:** testes focados dos eventos `push` e `notificationclick`, payload inválido, `tag`, cliente existente e `clients.openWindow()`.

**Ficheiros prováveis:** worker, utilitário de registo, rota/header estático e testes.

**Dependências:** Tarefa 3.

### Tarefa 5 — Preservar deep link, login e foco de resposta

**Descrição:** Usar `/projects/:projectId?chatConversation=:conversationId&chatMessage=:messageId&reply=1`. Se não houver sessão, guardar um `returnTo` relativo e permitido antes de ir para `/login`; após login normal ou OIDC, retomar o destino e limpar o valor. `ChatContext` abre a conversa/mensagem, remove o parâmetro transitório e `MessageComposer` recebe foco uma única vez.

**Critérios de aceitação:**

- [ ] Login normal e OIDC preservam o destino original do aviso.
- [ ] Só são aceites rotas relativas Boards conhecidas; não existe open redirect.
- [ ] Sem autorização à conversa, não há fuga de dados e o utilizador regressa a uma rota segura.
- [ ] Clique e **Responder** abrem a conversa correta e focam o compositor.

**Verificação:** testes do `returnTo`, autenticação, acesso negado, consumo de `reply=1` e foco do compositor.

**Ficheiros prováveis:** sagas de router/login, `ChatContext`, `ChatWindow`/`MessageComposer` e testes.

**Dependências:** Tarefa 4.

## Fase 4 — Outbox e entrega

### Tarefa 6 — Agendar Push com as preferências corretas

**Descrição:** Criar uma outbox própria para Web Push, reutilizando o padrão já existente de `chat_email_notification`: insert na mesma transação da mensagem, `FOR UPDATE SKIP LOCKED`, recuperação de jobs interrompidos e revalidação antes de enviar. Uma linha por mensagem/destinatário; as subscrições são carregadas em lote no processamento.

**Critérios de aceitação:**

- [ ] A matriz de preferência pessoal + conversa + mute + menção é aplicada sem duplicar regras divergentes.
- [ ] Remetente, utilizador desativado, sem acesso, mensagem apagada ou já lida são ignorados.
- [ ] A criação da mensagem não espera por nenhum fornecedor Push.
- [ ] Várias instâncias do servidor não processam o mesmo job em simultâneo.

**Verificação:** testes da matriz de elegibilidade, transação/idempotência, revogação de acesso, mensagem lida/apagada e concorrência da outbox.

**Ficheiros prováveis:** migração da outbox, helper de elegibilidade/agendamento, hook/processador e testes.

**Dependências:** Tarefas 2 e 4.

### Tarefa 7 — Enviar, repetir e limpar

**Descrição:** Construir no servidor o payload localizado para o idioma do destinatário através de `sails.helpers.utils.makeTranslator` e das chaves `webPush:*` em `server/config/locales`. Isto é necessário quando o browser está fechado; o cliente continua a usar i18next para a UI. Enviar para todas as subscrições com concorrência limitada. Usar `TTL: 600`, `urgency: 'high'` e `timeout: 10000`, conforme o contrato documentado acima.

**Critérios de aceitação:**

- [ ] `404/410` elimina a subscrição inválida.
- [ ] `429/5xx` repete com backoff limitado enquanto o job tiver menos de 10 minutos e menos de 3 tentativas.
- [ ] `400/403` ou erro VAPID/configuração falha o job e gera observabilidade sem eliminar indiscriminadamente subscrições.
- [ ] Logs contêm apenas IDs internos, fornecedor/hostname agregado, status, tentativa e duração; nunca endpoint, chaves ou payload.

**Anexos:** mensagem com texto é agendada na criação. Mensagem vazia com anexos só é agendada quando o primeiro anexo é persistido; a constraint única da outbox evita duplicados nos anexos seguintes.

**Verificação:** testes de payload/localização, concorrência limitada, timeout, TTL, retries, códigos HTTP e fluxo de anexo único/múltiplo/falhado.

**Ficheiros prováveis:** sender `web-push`, processador/outbox, criação de mensagem/anexo, copy localizada e testes.

**Dependências:** Tarefa 6.

## Checkpoint B — entrega real

### Windows

- [ ] Edge e Chrome: Boards focado, aba em segundo plano, todas as janelas fechadas e browser com processo disponível.
- [ ] Registar separadamente o resultado após `Quit/Exit`; não o usar como garantia de aceitação.
- [ ] Clique principal e **Responder** retomam a conversa, incluindo após login.

### macOS

- [ ] Safari 16/macOS 13+: Boards focado, janela fechada e Safari sem estar em execução.
- [ ] Chrome: aba/janela fechada e processo disponível; `Quit` completo é best-effort.
- [ ] A ação **Responder** é validada apenas onde o sistema a apresentar.

### Estados e operação

- [ ] Permissão negada, notificações desligadas no SO, Focus/Não incomodar e browser não suportado têm comportamento compreensível.
- [ ] Duas abas não criam duplicados; dois dispositivos recebem os respetivos avisos.
- [ ] Desativar ou fazer logout deixa de entregar imediatamente nesse browser.
- [ ] O servidor consegue contactar os fornecedores Push; se existir egress restrito, permitir também `https://*.push.apple.com`.
- [ ] Canary com conta de teste confirma envio, clique, limpeza `410`, métricas de sucesso/falha e ausência de segredos nos logs.

## Verificação de release

- Durante desenvolvimento, não executar build local: usar hot reload e testes focados, conforme as regras do projeto.
- No pipeline/imagem de release, verificar que o worker está presente na raiz do `dist`/`public`, tem `Cache-Control: no-cache` e que manifest/ícones Boards são servidos.
- A feature flag permite deploy com o código inativo; ativar primeiro para conta de canário e só depois globalmente.

## Fora do âmbito

- Caixa de texto ou resposta direta dentro do aviso.
- Supressão do banner quando Boards está focado através de presença por dispositivo.
- PWA offline, iOS/Android, som próprio, badges do sistema e gestão remota de todos os dispositivos.
- Preferência adicional para esconder a pré-visualização no ecrã bloqueado.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Safari revoga push invisível | Todo o push recebido chama imediatamente `showNotification()` |
| Chrome/Edge totalmente terminados | Critério limita-se a processo disponível; `Quit/Exit` é best-effort |
| Troca de conta no mesmo browser | Logout remove no servidor e faz `unsubscribe()` local |
| Endpoint malicioso/SSRF | HTTPS, validação de host/IP/tamanho e sem redirects |
| Push antigo depois de a mensagem ser lida | Revalidação antes do envio/retry e TTL de 10 minutos |
| Worker fica preso em cache | Rota `no-cache` e `updateViaCache: 'none'` |
| Conteúdo privado no ecrã bloqueado | Preview curto e aviso explícito durante a ativação |
| Mudança futura de CommonJS para ESM | Fixar npm 3.6.7 e rever conscientemente qualquer upgrade |

## Referências técnicas

- [Apple — Web Push em Safari](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [Microsoft Edge — Web Push](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/push)
- [Google — Push notifications FAQ](https://web.dev/articles/push-notifications-faq)
- [MDN — Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [MDN — ações de notificações](https://developer.mozilla.org/en-US/docs/Web/API/Notification/actions)
- [`web-push` — pacote npm 3.6.7](https://www.npmjs.com/package/web-push/v/3.6.7)
- [`web-push` — documentação fixada na tag v3.6.7](https://github.com/web-push-libs/web-push/blob/v3.6.7/README.md)
- [`web-push` — repositório/master para acompanhar manutenção futura](https://github.com/web-push-libs/web-push)
