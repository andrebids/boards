# Chat Web Push - preparação de produção

Este documento prepara o rollout em `boards.dsproject.pt`. Não contém chaves VAPID nem substitui o procedimento de deploy do servidor.

## Antes do deploy

- [ ] Confirmar que `BASE_URL=https://boards.dsproject.pt` e que todo o acesso público é HTTPS.
- [ ] Guardar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` no sistema de secrets do host. Todas as instâncias devem usar o mesmo par de chaves.
- [ ] Usar um `VAPID_SUBJECT` real, `mailto:` ou HTTPS. Não usar `https://localhost`.
- [ ] Não gerar chaves no arranque e não as rodar num deploy normal. A rotação invalida as subscrições existentes.
- [ ] Fazer backup da base de dados antes de aplicar as migrações.
- [ ] Confirmar egress HTTPS para os fornecedores Push, incluindo `*.push.apple.com` quando exista firewall de saída.

Variáveis necessárias:

```dotenv
WEB_PUSH_ENABLED=false
VAPID_PUBLIC_KEY=<secret-publico-estavel>
VAPID_PRIVATE_KEY=<secret-privado-estavel>
VAPID_SUBJECT=mailto:<contacto-operacional>
```

O primeiro deploy deve manter `WEB_PUSH_ENABLED=false`. A flag é lida no arranque, por isso qualquer alteração exige reiniciar a aplicação.

## Ordem do rollout

1. Construir e publicar a imagem com a funcionalidade desligada.
2. Iniciar a aplicação. O `db:init` existente executa `knex migrate.latest()` antes do servidor e cria `web_push_subscription` e `web_push_notification`.
3. Confirmar que a aplicação e o chat continuam saudáveis com a flag desligada.
4. Confirmar no artefacto que `/app/public/boards-push-sw.js` existe.
5. Instalar as chaves VAPID de produção, definir `WEB_PUSH_ENABLED=true` e reiniciar a aplicação.
6. Ativar manualmente as notificações numa conta de teste. Não existe pedido nativo automático no login.
7. Validar envio, clique principal, ação **Responder**, logout e remoção da subscrição.
8. Manter o rollout opt-in até concluir o canário. Sem convite inicial, os restantes utilizadores não serão solicitados automaticamente.

## Verificação HTTP

```sh
curl -fsS https://boards.dsproject.pt/api/config
curl -fsSI https://boards.dsproject.pt/boards-push-sw.js
```

Critérios:

- `/api/config` apresenta `webPush.enabled=true` e apenas a chave pública.
- O worker responde `200`, com `Content-Type: application/javascript` e `Cache-Control` contendo `no-cache` ou `no-store`.
- A resposta e os logs nunca apresentam a chave privada, endpoint Push, `p256dh`, `auth` ou conteúdo da mensagem.

## Canário obrigatório

- [ ] Windows: Chrome e Edge com Boards focado, separador em segundo plano e janela fechada.
- [ ] macOS: Safari 16+ e Chrome com Boards focado e janela fechada.
- [ ] O aviso dentro do Boards mostra remetente, conversa/projeto, pré-visualização e **Responder**.
- [ ] O aviso do sistema aparece quando o Boards não está visível. O desenho externo é controlado pelo Windows/macOS.
- [ ] Registar se o browser apresenta também o aviso do sistema com o Boards visível. O worker mantém cada Push visível para não arriscar a revogação da subscrição no Safari.
- [ ] **Responder** abre a conversa e foca o compositor; sem sessão, o destino é retomado depois do login.
- [ ] Desativar nas Definições e fazer logout impedem novas entregas nesse browser.
- [ ] `404/410` remove a subscrição inválida; `429/5xx` aplica retry limitado.
- [ ] Os logs mostram `[WEB_PUSH_NOTIFICATION][SENT]` sem dados secretos.

## Observabilidade inicial

Durante o canário, acompanhar as linhas `[WEB_PUSH_NOTIFICATION]` por estado: `SENT`, `PARTIAL`, `RETRY` e `FAILED`. Alertar para crescimento contínuo da outbox, falhas `WEB_PUSH_CONFIG`, taxa elevada de `410` ou retries que atinjam o limite.

## Rollback

1. Definir `WEB_PUSH_ENABLED=false` e reiniciar todas as instâncias.
2. Não apagar as tabelas nem rodar as chaves VAPID.
3. Manter as migrações aplicadas; são aditivas e a aplicação ignora a outbox enquanto a flag está desligada.
4. Se o problema for apenas visual no cliente, reverter o artefacto do cliente mantendo o servidor e as chaves estáveis.
