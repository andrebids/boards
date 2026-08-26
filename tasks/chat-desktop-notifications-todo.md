# Chat — Web Push (Windows/macOS)

## Fase 1 — Configuração

- [x] Tarefa 1 — Fixar `web-push@3.6.7` e configurar feature flag/VAPID.

## Fase 2 — Subscrição segura

- [x] Tarefa 2 — Persistir e autorizar subscrições sem identificador de dispositivo paralelo.
- [x] Tarefa 3 — Adicionar consentimento, reconciliação, desativação e limpeza no logout.
- [ ] Checkpoint A — Validar manualmente ativação, refresh, bloqueio, logout e troca de conta com VAPID ativo.

## Fase 3 — Aviso e resposta

- [x] Tarefa 4 — Criar worker mínimo que mostra sempre cada Push recebido.
- [x] Tarefa 5 — Preservar o deep link após login/OIDC e focar o compositor.

## Fase 4 — Entrega

- [x] Tarefa 6 — Criar outbox e aplicar preferências/acesso antes do envio.
- [x] Tarefa 7 — Construir o payload com o tradutor Sails (`webPush:*` nos catálogos), enviar com TTL/retries/limpeza e tratar mensagens só com anexos.
- [ ] Checkpoint B — Validar entrega real em Windows/macOS e canário de produção.

## Regra de validação

- [x] Durante desenvolvimento, usar hot reload e testes focados; não executar build local.
- [ ] No release, verificar o worker no artefacto e o header `Cache-Control: no-cache`.
