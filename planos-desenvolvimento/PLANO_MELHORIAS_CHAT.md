# Plano de melhorias do chat por projeto

## 1. Objetivo

Tornar o chat seguro, consistente sob concorrência, recuperável perante falhas de rede e adequado a projetos com muitas conversas e membros. O lançamento em produção fica condicionado à conclusão das fases 1 a 3 e à passagem da matriz de testes da fase 6.

## 2. Princípios de implementação

- O servidor é a fonte de verdade para mensagens, permissões e estado de leitura.
- Todas as escritas repetíveis devem ser idempotentes.
- Alterações relacionadas com ficheiros e respetivas referências devem ser transacionais.
- A autorização deve ser revalidada em todos os endpoints e subscrições Socket.IO.
- O cliente deve recuperar de timeout, reconexão e revogação de acesso sem necessitar de recarregar a página.
- Queries e broadcasts devem crescer de forma próxima de constante por conversa/mensagem, evitando um pedido por destinatário.
- Migrações já aplicadas em ambientes partilhados nunca devem ser reescritas; nesses casos usa-se uma migração corretiva.

## 3. Prioridades

| Prioridade | Significado | Regra de lançamento |
|---|---|---|
| P0 | Risco de perda ou exposição de dados | Bloqueia qualquer lançamento |
| P1 | Inconsistência funcional, concorrência ou recuperação | Bloqueia lançamento geral |
| P2 | Escalabilidade, UX e manutenção | Deve ser resolvido antes de expansão |
| P3 | Evolução funcional | Pode entrar após estabilização |

## 4. Fase 1 — Integridade e segurança de anexos

### 4.1. Ciclo de vida de `FileReference` — P0

- Criar query methods próprios para `ChatMessageAttachment`.
- Na criação, inserir o anexo e incrementar `FileReference.total` na mesma transação.
- Se a persistência falhar depois de mover o ficheiro, remover a referência e o diretório físico.
- Na remoção definitiva, decrementar a referência e remover o ficheiro quando deixar de ter consumidores.
- Garantir que cascatas de projeto/conversa não deixam ficheiros físicos órfãos; se a cascata não permitir hooks seguros, executar limpeza explícita antes da eliminação ou através de job/outbox idempotente.

### 4.2. Política de mensagens removidas — P0

- Impedir download de anexos associados a mensagens com `deletedAt`.
- Definir se a remoção lógica conserva apenas metadados ou também o ficheiro.
- Não devolver texto, reações nem anexos de mensagens removidas.

### 4.3. Limites de upload — P0

- Introduzir tamanho máximo configurável por ficheiro.
- Limitar anexos por mensagem e rejeitar uploads multipart inesperadamente múltiplos.
- Validar MIME/extensão e impedir processamento pesado sem limites.
- Preparar quota por utilizador/projeto e métricas de armazenamento.

### Critérios de aceitação

- Uma referência válida nunca permanece com `total = 0`.
- Uma falha entre upload e criação não deixa ficheiro nem linha órfã.
- O URL conhecido de um anexo removido devolve `404`.
- Uploads acima do limite são rejeitados sem crescimento permanente do storage.

## 5. Fase 2 — Consistência, idempotência e concorrência

### 5.1. Criação idempotente de mensagens — P1

- O cliente gera `clientMessageId` estável por tentativa lógica.
- Guardar o identificador na mensagem e criar uma constraint única adequada.
- Se o mesmo pedido for repetido após timeout, devolver a mensagem já criada.
- Manter compatibilidade temporária com clientes sem o novo campo.

### 5.2. Estado de leitura atómico — P1

- Substituir read/compare/update por `UPDATE` condicional.
- O cursor só pode avançar, nunca regredir.
- Validar que o `messageId` pertence à conversa.
- Sincronizar todas as sessões do utilizador após sucesso.

### 5.3. Edição, remoção e reações — P1

- Editar apenas mensagens ainda não removidas.
- Tornar remoção idempotente.
- Preservar anexos e reações na resposta de edição.
- Tornar o toggle de reação resistente a pedidos concorrentes.
- Aplicar `access.canWrite` a mensagens, anexos e reações.
- Impor limite/normalização de emojis e número máximo de reações distintas.

### 5.4. Ordenação e última mensagem — P1

- Derivar `lastMessageAt` da mensagem persistida.
- Evitar regressões causadas por commits fora de ordem.
- Atualizar previews quando anexos de uma mensagem sem texto terminam de carregar.

### Critérios de aceitação

- Repetir o mesmo envio cria exatamente uma mensagem.
- Reads concorrentes terminam sempre no maior ID.
- Duplo clique numa reação não produz erro de constraint.
- Editar uma mensagem não remove anexos ou reações da resposta seguinte.

## 6. Fase 3 — Robustez do cliente e Socket.IO

### 6.1. Estados de falha — P1

- Manter estado pendente por operação, não um booleano global.
- Limpar pendências em sucesso e falha.
- Mostrar erro acionável e permitir retry.
- Preservar texto e ficheiros no retry de mensagens.
- Reverter ou resincronizar edições e marcações de leitura otimistas que falhem.

### 6.2. Reconexão — P1

- Invalidar corretamente o estado de fetch quando o socket reconecta.
- Recarregar mensagens das janelas abertas.
- Revalidar e voltar a subscrever apenas conversas autorizadas.
- Recalcular não lidas no servidor.
- Evitar janelas vazias após a limpeza dos modelos Redux ORM.

### 6.3. Gestão de subscrições — P1

- Subscrever ao abrir/restaurar a conversa.
- Fazer unsubscribe ao fechar.
- Manter subscrição de janelas minimizadas apenas se necessário para a experiência pretendida.
- Impedir crescimento ilimitado de mensagens em memória provenientes de conversas fechadas.

### 6.4. Revogação e visibilidade — P0/P1

- Tratar `chatProjectAccessRevoke` no cliente.
- Remover conversas, mensagens, participantes e janelas do projeto revogado.
- Limpar IDs inválidos do `localStorage`.
- Marcar como lido apenas quando documento e browser têm foco e a janela está visível.
- Reavaliar leitura em eventos `visibilitychange` e `focus`.

### Critérios de aceitação

- Falhar a criação de conversa não bloqueia o painel.
- Reconectar mantém as janelas utilizáveis e contadores corretos.
- Fechar uma janela remove a subscrição correspondente.
- Revogar acesso remove imediatamente o conteúdo do estado local.

## 7. Fase 4 — Performance e escalabilidade

### 7.1. Listagem de conversas — P2

- Carregar o projeto e os membros autorizados uma única vez.
- Obter participantes de todas as conversas em batch.
- Obter últimas mensagens com consulta set-based (`DISTINCT ON`, `LATERAL` ou janela SQL).
- Calcular não lidas de todas as conversas numa única consulta.
- Medir queries por listagem e estabelecer um limite independente do número de conversas.

### 7.2. Envio e contadores — P2

- Remover a consulta de não lidas por destinatário.
- Calcular contadores em batch ou publicar deltas seguros.
- Agrupar broadcasts quando a infraestrutura permitir.

### 7.3. Extras de mensagens — P2

- Indexar anexos e reações em `Map` por `messageId`.
- Evitar `filter` e spreads repetidos por mensagem.
- Limitar payloads e número de reações.

### 7.4. Bundle e memória do cliente — P2

- Carregar o chat com divisão de código.
- Carregar o emoji picker apenas quando aberto.
- Remover componentes, endpoints e estado não utilizados.
- Definir retenção máxima de páginas de mensagens por conversa.

### Critérios de aceitação

- A listagem não apresenta crescimento N+1.
- Uma mensagem de grupo não executa uma query por membro.
- O emoji picker não faz parte do caminho inicial quando o chat não é aberto.

## 8. Fase 5 — Funcionalidade e experiência

- Adicionar ações de editar e remover à interface.
- Renderizar links de forma segura.
- Mostrar progresso e retry individual de anexos.
- Mostrar estados de erro de histórico e conversa.
- Implementar notificações de menção ou retirar temporariamente essa promessa da UI.
- Decidir se `isMuted` e endpoints manuais de subscribe permanecem no produto.
- Corrigir navegação por teclado, associação de labels, foco do painel e anúncios acessíveis.
- Validar comportamento responsivo com uma conversa abaixo de 768 px.

## 9. Fase 6 — Testes e observabilidade

### 9.1. Backend

- Permissões para todos os `chatMode`.
- Utilizador externo e revogação durante socket aberto.
- Conversa direta com participante removido.
- Paginação sem duplicados ou lacunas.
- Idempotência após timeout.
- Reads e reações concorrentes.
- Upload interrompido, excessivo e parcialmente persistido.
- Download após remoção.
- Rollback de todas as migrações de chat.

### 9.2. Frontend/E2E

- Duas sessões trocando mensagens em tempo real.
- Reconexão com janelas abertas e minimizadas.
- Falha e retry de mensagem com anexos.
- Fechar/restaurar e menu de excesso.
- Revogação de acesso sem refresh.
- Foco, visibilidade e contadores de não lidas.
- Edição, remoção, links e menções.

### 9.3. Operação

- Métricas de volume, latência, queries, sockets e uploads.
- Alertas para constraints, falhas de upload e crescimento de storage.
- Logs sem conteúdo privado das mensagens.
- Feature flag e ativação progressiva por projeto.

## 10. Sequência de entrega

1. Corrigir lint e migrações.
2. Concluir integridade e segurança de anexos.
3. Implementar idempotência e atomicidade.
4. Corrigir reconexão, retries, revogação e subscrições.
5. Adicionar testes de integração para os fluxos críticos.
6. Eliminar N+1 e reduzir bundle/memória.
7. Completar UX e acessibilidade.
8. Ativar gradualmente com monitorização.

## 11. Registo de execução

| Frente | Estado inicial | Responsável nesta execução |
|---|---|---|
| Plano e integração | Concluído | Agente principal |
| Anexos e migrações | P0/P1 concluído | Subagente `chat_attachments` |
| Concorrência e backend | P1 e otimizações críticas concluídos | Subagente `chat_backend` |
| Frontend e sockets | P1 concluído | Subagente `chat_frontend` |
| Testes finais | Unitários, lint, build e migrações concluídos; E2E pendente | Agente principal |

## 12. Resultado desta execução

Concluído nesta iteração:

- ciclo transacional das referências de anexos, limites de upload e limpeza explícita na remoção de mensagens e projetos;
- bloqueio de downloads removidos e limpeza após falhas de processamento/persistência;
- criação idempotente por `clientMessageId`, cursor de leitura monotónico e reações serializadas;
- respostas de edição completas, remoção idempotente e contadores de não lidas em batch;
- eliminação do N+1 principal na listagem de conversas e na distribuição de contadores;
- retry de mensagens e anexos, rollback de operações otimistas, reconexão, subscrições e revogação de acesso no cliente;
- carregamento lazy do seletor de emojis e correções de acessibilidade/lint no chat;
- testes unitários dirigidos e validação `up/down` de todas as migrações numa base PostgreSQL descartável.

Mantém-se planeado antes de uma ativação geral:

- testes E2E com duas sessões reais, falhas de rede e revogação durante uma ligação ativa;
- quotas de armazenamento por projeto/utilizador, validação de conteúdo mais profunda e eventual antivírus;
- métricas, alertas, feature flag e rollout progressivo;
- retenção máxima de mensagens no cliente e redução estrutural do bundle principal;
- completar ações de edição/remoção na interface, links, menções e revisão responsiva descritas na fase 5.
