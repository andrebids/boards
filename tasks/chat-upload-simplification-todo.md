# Chat - checklist de simplificação dos uploads

## Fase 1 - servidor

- [x] Tarefa 1 - Adicionar `clientAttachmentId` e idempotência por mensagem.
- [x] Tarefa 2 - Responder após persistir e reduzir o evento socket a `{ messageId, item }`.
- [x] Checkpoint 1 - Verificar chamadas repetidas/concorrentes e falha pós-persistência.

## Fase 2 - cliente

- [x] Tarefa 3 - Normalizar `AbortError` como `E_HTTP_TIMEOUT`.
- [x] Tarefa 4 - Retirar uploads da fila global de 30 segundos.
- [x] Tarefa 5 - Separar estado da mensagem e estado dos anexos.
- [x] Checkpoint 2 - Verificar resposta/socket fora de ordem e ausência de duplicados.

## Fase 3 - conclusão

- [x] Tarefa 6 - QA automatizado com falha de publicação controlada e smoke test do chat.
- [x] Checkpoint final - Testes focados, `git diff --check` e smoke test por hot reload.
- [x] Confirmar que nenhum build foi executado.

## Resultado da validação

- 26 testes focados do cliente passaram.
- 7 testes focados do servidor passaram.
- Lint focado e `git diff --check` passaram.
- O chat carregou em `http://localhost:3008` por hot reload, sem erros de runtime.
- A suite completa do cliente teve 53 suites verdes e uma suite antiga bloqueada por configuração
  Babel sem suporte JSX (`BoardActivitiesPanel.test.js`).
- A suite completa do servidor ficou bloqueada no lifecycle ao carregar `config/custom.js`, antes de
  executar os testes.
- Não foi enviado conteúdo real no chat durante o smoke test; o cenário de duas sessões está coberto
  pelos testes do evento idempotente, mas continua recomendado como QA manual antes do deploy.
