# Plano de implementação: notificações Web Push do chat Boards

## Objetivo

Depois de o utilizador autorizar explicitamente o respetivo dispositivo, entregar avisos nativos de novas mensagens do chat no Windows e macOS, incluindo quando não existe uma janela ou aba Boards aberta. Um clique ou a ação **Responder** abre a conversa e deixa o cursor pronto no compositor.

## Decisão principal

Usar uma única arquitetura de entrega, em vez de manter um aviso `Notification()` para a página aberta e outro para o browser fechado:

```text
Mensagem elegível
  -> servidor enfileira Web Push por subscrição do destinatário
  -> service worker recebe o push
  -> Boards focado? preview normal do chat, sem banner do sistema
  -> Boards sem foco ou fechado? showNotification()
  -> clique/Responder -> abre a conversa e foca o compositor
```

- O cliente regista um service worker e subscreve o dispositivo apenas após o clique em **Ativar notificações do chat neste dispositivo**.
- O servidor usa o pacote [`web-push`](https://www.npmjs.com/package/web-push) para VAPID, encriptação e envio. É adequado ao servidor CommonJS atual; não acrescentar um wrapper React.
- O service worker usa `ServiceWorkerRegistration.showNotification()`, tanto para uma janela em segundo plano como para o browser fechado. Evita-se assim lógica duplicada e permite ações persistentes quando o browser as suporta.
- Cada subscrição pertence a um utilizador e dispositivo. Desativar nas definições do utilizador remove a subscrição remota e impede novos avisos nesse browser.
- O servidor continua a ser a autoridade: `silenciar`, `apenas menções`, `sem notificações` e exclusão do remetente são aplicados antes de criar qualquer Push.
- `tag: boards-chat:<conversationId>` agrega mensagens da mesma conversa. O aviso contém apenas remetente, conversa e uma pré-visualização curta, nunca anexos, URLs ou tokens.
- O botão **Responder** é progressivo: aparece apenas onde as ações persistentes forem suportadas. Em todos os browsers, clicar no banner tem o mesmo efeito. Não haverá caixa de texto dentro do aviso, pois não é portátil em Web Notifications.

## Layout do banner

O sistema operativo decide posição e tipografia. O conteúdo enviado pelo Boards é:

```text
[ícone Boards]  Boards
João Silva em Geral
Podemos validar a lista antes da reunião?
```

Uma mensagem só com anexo usa “Enviou um ficheiro”. O utilizador pode desligar este canal em **Definições de utilizador → Notificações**, independentemente da permissão que o browser mantém para a origem.

## Tarefa 1 — Persistir subscrições Web Push por utilizador/dispositivo

**Descrição:** Criar migração, modelo e endpoints autenticados para criar/remover a subscrição devolvida por `PushManager.subscribe()`. Guardar endpoint, chaves, utilizador, datas e identificador de dispositivo; nunca expor esses campos a outro utilizador.

**Critérios de aceitação:**

- [ ] Só o utilizador autenticado cria/remove as próprias subscrições.
- [ ] Repetir a ativação atualiza a subscrição em vez de duplicar o dispositivo.
- [ ] Endpoint e chaves não entram nos logs nem em respostas públicas.

**Verificação:** testes de autorização, upsert e remoção.

**Ficheiros prováveis:** migração e modelo em `server/`, controladores/rotas de subscrição e testes de integração.

**Âmbito estimado:** médio, 5 ficheiros.

## Tarefa 2 — Consentimento e controlo explícito em Definições de utilizador

**Descrição:** Em `UserSettingsModal/NotificationsPane`, acrescentar a secção compacta “Notificações do chat neste dispositivo”. O botão chama, diretamente no clique, a permissão do browser, o registo do worker e a subscrição; depois mostra “Ativas neste dispositivo” com **Desativar**. Estados bloqueado e não suportado são textuais e acessíveis.

**Critérios de aceitação:**

- [ ] Nenhum prompt aparece sem gesto do utilizador.
- [ ] Desativar remove a subscrição remota e sobrevive a refresh/logout/login naquele browser.
- [ ] O controlo usa elementos nativos, texto acessível e foco visível.
- [ ] `en-US`, `es-ES`, `fr-FR` e `pt-PT` têm as traduções.

**Verificação:** testes unitários da máquina de estados; tabulação; hot reload em `http://localhost:3008`.

**Ficheiros prováveis:** `NotificationsPane`, utilitário de push, traduções e testes focados.

**Dependências:** Tarefa 1.

## Tarefa 3 — Service worker, banner e resposta focada

**Descrição:** Registar um worker mínimo sem precache/offline. No evento `push`, verificar se existe uma janela Boards focada; se existir, não mostrar banner. Caso contrário, chamar `showNotification()` com `tag`, dados mínimos e a ação progressiva **Responder**. Em `notificationclick`, focar/abrir a rota autenticada da conversa; um parâmetro transitório `reply=1` pede ao `ChatContext` para abrir a conversa e ao `MessageComposer` para receber foco.

**Critérios de aceitação:**

- [ ] Boards focado não recebe banner duplicado; o preview atual continua disponível.
- [ ] Boards sem foco ou fechado recebe um único banner agregado por conversa.
- [ ] Clique e **Responder**, quando apresentado, abrem a conversa correta com o compositor focado.
- [ ] Se a sessão expirou, a rota vai para login e só recupera a conversa após autenticação/autorização.

**Verificação:** testes do worker com clients focados/não focados; testes do resolvedor de deep link e foco do compositor; validação manual em Edge/Chrome Windows e Safari/Chrome macOS.

**Ficheiros prováveis:** worker novo em `client/public/`, registo/utilitário de Push, `ChatContext`, `ChatWindow`, `MessageComposer` e testes.

**Dependências:** Tarefa 2.

## Tarefa 4 — Enviar Push do evento já autorizado

**Descrição:** Depois de `create-message` aplicar as preferências de `ChatParticipant`, enfileirar o envio para as subscrições desse destinatário. O processo usa `web-push`, não bloqueia a criação da mensagem e remove subscrições inválidas perante `404` ou `410`.

**Critérios de aceitação:**

- [ ] Nunca há Push para o remetente, conversa silenciada ou menção não elegível.
- [ ] Uma falha do fornecedor Push não falha nem atrasa o envio da mensagem de chat.
- [ ] Subscrições expiradas são removidas; outras falhas ficam observáveis sem incluir payload, endpoint ou chaves.

**Verificação:** testes do helper com todos os filtros, `404`, `410` e erro transitório; canário com uma conta de teste.

**Ficheiros prováveis:** helper/fila de Web Push, `create-message.js`, configuração VAPID e testes de servidor.

**Dependências:** Tarefas 1 e 3.

## Checkpoint — entrega real Windows/macOS

- [ ] Windows: Edge ou Chrome, browser fechado, click e resposta no compositor.
- [ ] macOS: Safari 16/macOS 13+ e Chrome, browser fechado, click; a ação **Responder** é validada apenas onde for visível.
- [ ] Desativar em Definições de utilizador deixa de entregar Push imediatamente.
- [ ] Não executar build local; usar hot reload e testes focados.

## Fora do âmbito

- Caixa de texto/respondendo diretamente dentro do aviso.
- PWA offline, iOS/Android, som próprio e badges do sistema.
- Expor conteúdo completo de mensagens ou anexos no ecrã bloqueado.

## Riscos e mitigação

| Risco                                            | Mitigação                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Aviso duplicado entre socket e Push              | O socket mantém só o preview visual; o worker decide o banner conforme uma janela Boards focada. |
| Ação Responder ausente em Safari/alguns browsers | Clique principal faz sempre o mesmo; a ação é melhoria progressiva.                              |
| Subscrição expirada                              | Remover em `404`/`410` e mostrar estado desativado no próximo carregamento.                      |
| Dados privados no ecrã bloqueado                 | Pré-visualização curta; sem anexos, URLs, tokens ou payload completo.                            |

## Referências técnicas

- [MDN — persistent notifications e service workers](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [MDN — ações de notificações](https://developer.mozilla.org/en-US/docs/Web/API/Notification/actions)
- [Apple — Web Push em Safari macOS](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
