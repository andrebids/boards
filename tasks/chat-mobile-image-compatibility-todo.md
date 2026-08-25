# Checklist: imagens do chat em telemóvel

## Fase 1 — Observabilidade

- [ ] Aceitar `image-preview-failed` no diagnóstico do chat.
- [ ] Incluir apenas `userId`, `messageId`, `attachmentId`, variante e erro normalizado.
- [ ] Tornar o contexto visível no formato atual dos logs.
- [ ] Deduplicar eventos por anexo/tentativa.
- [ ] Adicionar testes do controlador e do cliente.

## Checkpoint 1

- [ ] Falha simulada gera exatamente um evento correlacionável.
- [ ] Logs não contêm tokens, texto, filename ou URL.
- [ ] Testes focados passam.

## Fase 2 — Reconciliação móvel

- [ ] Recarregar a conversa no regresso real ao primeiro plano.
- [ ] Tratar `pageshow` persistido do Safari.
- [ ] Usar `{ replace: true }` para atualizar anexos de mensagens existentes.
- [ ] Evitar pedidos concorrentes/repetidos.
- [ ] Preservar mensagens pendentes e posição útil de leitura.

## Checkpoint 2

- [ ] Suspender e retomar atualiza as imagens sem re-login.
- [ ] A sala Socket.IO volta a ficar subscrita.
- [ ] Não há regressão no horizonte de leitura atualmente em desenvolvimento.

## Fase 3 — Recuperação visual

- [ ] Mostrar estado de imagem indisponível em vez de bloco vazio.
- [ ] Adicionar ação acessível `Tentar novamente`.
- [ ] Recuperar anexos individualmente, sem ciclo automático.
- [ ] Validar galeria com uma e duas imagens em largura móvel.

## Checkpoint 3

- [ ] Testes e lint focados passam.
- [ ] Fluxo completo funciona por hot reload em `http://localhost:3008`.
- [ ] Safari/iPhone real passa o cenário segundo plano → primeiro plano.

## Produção

- [ ] Rever alterações sem incluir trabalho não relacionado do worktree.
- [ ] Obter aprovação explícita para deploy.
- [ ] Publicar via Ansible-Controller WSL.
- [ ] Executar canário de envio/receção de duas imagens.
- [ ] Rever novos diagnósticos sem dados sensíveis.
- [ ] Decidir URLs assinados apenas se houver evidência de `401` móvel recorrente.

