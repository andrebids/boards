# Plano de melhoria: ciclo de vida dos grupos de chat

Data: 2026-09-21. Estado: planeado; implementação não iniciada.
Checklist: [chat-group-lifecycle-todo.md](./chat-group-lifecycle-todo.md).

## Objetivo

Separar claramente sair, remover um participante, remover o próprio histórico e eliminar dados. A saída de uma pessoa não deve retirar o acesso às restantes. Aproximar a experiência ao Teams de trabalho/escola, mantendo explícitas as regras próprias do Boards.

Este plano usa ficheiros específicos do chat para preservar `tasks/plan.md` e `tasks/todo.md`, que contêm trabalho de Gantt por concluir. As melhorias recentes de criação/edição de nomes são pré-existentes e devem ser preservadas.

## 1. Evidência e referências

Comportamento confirmado no código atual e em quatro execuções isoladas dos controladores:

- `server/api/controllers/chat-conversations/leave.js`: elimina a participação; arquiva o grupo quando restam menos de duas pessoas e revoga o acesso de quem ficou. Transfere a propriedade apenas quando restam pelo menos duas.
- `server/api/controllers/chat-conversation-participants/delete.js`: elimina a participação do alvo; não arquiva se o proprietário ficar sozinho.
- `server/api/controllers/chat-conversations/index.js` e `server/api/helpers/chat/get-inbox.js`: excluem grupos com menos de duas pessoas autorizadas. Portanto, o grupo de uma pessoa pode desaparecer depois de recarregar mesmo sem estar arquivado.
- `server/api/helpers/chat/get-conversation-access.js`: exige participação e ausência de arquivo; permite escrever apenas com duas ou mais pessoas autorizadas.
- `server/api/controllers/chat-conversations/clear-history.js`: usa o limite privado `historyClearedThroughMessageId`; não elimina mensagens.
- A saída/remoção não elimina a conversa, mensagens ou anexos. Não existe uma ação de UI para eliminar definitivamente um grupo.

Referências oficiais consultadas em 2026-09-21:

1. [Sair ou remover alguém de um grupo no Teams](https://support.microsoft.com/en-us/teams/chat/leave-or-remove-someone-from-a-group-chat-in-microsoft-teams): a remoção preserva o histórico anterior para a pessoa removida, mas bloqueia conteúdo novo, envio e reações; as mensagens do participante permanecem no grupo. Mensagens editadas deixam de estar visíveis aos ex-participantes.
2. [Ocultar, remover histórico ou sair no Teams](https://support.microsoft.com/en-us/teams/chat/hide-a-chat-remove-chat-history-or-leave-a-chat-thread-in-microsoft-teams): sair de um grupo e limpar a própria lista não elimina a conversa dos restantes.
3. [Retenção de mensagens no Teams](https://learn.microsoft.com/microsoftteams/retention-policies): desaparecimento da interface e eliminação dos dados são operações distintas.

Estas fontes não especificam o esquema interno do Teams nem a regra de arquivo ao sair o último membro. O arquivo com zero participantes é uma proposta para o Boards, não um facto atribuído ao Teams.

## 2. Contrato de comportamento proposto

| Situação | Comportamento no Boards após a melhoria |
| --- | --- |
| Membro sai; ficam duas ou mais pessoas | Sai apenas esse membro; os restantes continuam normalmente. |
| Membro sai; fica uma pessoa | Grupo permanece visível para essa pessoa, com histórico e gestão de membros; envio desativado até haver outra pessoa. |
| Proprietário sai; fica alguém | Propriedade passa, na mesma transação, para o membro ativo mais antigo, com desempate por ID. |
| Proprietário remove alguém | A pessoa removida deixa de receber conteúdo novo; na fase B conserva apenas leitura do histórico anterior. |
| Último membro ativo sai | Arquivo automático; preservação de conversa, mensagens e anexos. |
| Utilizador sai voluntariamente | O grupo sai da sua lista corrente. Na fase B, opção explícita para conservar ou remover a sua vista do histórico. |
| Utilizador remove o próprio histórico | Só afeta a sua vista; não remove membros nem dados partilhados. |
| Utilizador perde acesso ao projeto | Perde também o acesso ao histórico, mesmo que antes fosse participante. |
| Eliminar definitivamente | Fora deste incremento; não existe um botão com este significado. |

Regras próprias assumidas neste plano: gestão de participantes pelo proprietário; grupo com uma pessoa em modo de leitura; arquivo com zero membros ativos. Não replicar as políticas administrativas ou todas as funcionalidades do Teams.

## 3. Entrega A: corrigir saída e grupo com uma pessoa

Primeira entrega independente, sem migração e sem introduzir acesso de ex-membros:

1. Arquivar apenas quando o número de participantes ativos chega a zero.
2. Transferir a propriedade também quando sobra uma única pessoa.
3. Manter grupos de uma pessoa na lista do projeto, inbox, pesquisa e após reconexão.
4. Expor capacidade de escrita no payload; mostrar o histórico e a gestão de membros, mas desativar mensagens, uploads e reações quando não houver outro participante ativo.
5. Mostrar: “És o único membro deste grupo. Adiciona alguém para continuar a conversa.”
6. Reutilizar `AlertDialog` para confirmar a saída, explicando o efeito sobre o próprio acesso e, no caso do proprietário, a transferência de gestão.

Não basta substituir `< 2` por `=== 0`: corrigir os filtros das listas e a atualização do estado de escrita nos clientes já abertos.

Concorrência: calcular participantes e autorizações dentro da transação, sob bloqueio por conversa. Aplicar a mesma disciplina a sair, remover e adicionar. Duas saídas simultâneas não podem deixar um grupo vazio ativo, escolher um proprietário já removido ou revogar acesso à pessoa errada. Emitir eventos apenas depois do commit.

Nesta entrega, a perda de histórico de quem sai/é removido continua a ser a limitação atual, explicitamente pendente da entrega B.

## 4. Entrega B: histórico de ex-membros com limites no servidor

### 4.1 Estado persistente

Reutilizar `chat_participant`, preservando a unicidade conversa/utilizador. Proposta de campos adicionais:

| Campo | Uso |
| --- | --- |
| `left_at` nullable | Fim da participação ativa; `NULL` significa ativo. |
| `left_reason` nullable | `left` ou `removed`, para o aviso correto na interface. |
| `history_visible_through_message_id` nullable | Última mensagem visível ao terminar a participação. |
| `history_hidden_at` nullable | Ocultar a conversa histórica da lista/pesquisa dessa pessoa, inclusive quando não existem mensagens. |

`historyClearedThroughMessageId` continua a ser o limite inferior privado. Um ex-membro lê apenas mensagens com ID acima desse limite e até ao limite superior capturado à saída. Se saiu antes de existir qualquer mensagem, o histórico permitido é vazio: `NULL` no limite superior de um ex-membro nunca pode significar acesso ilimitado.

Migração aditiva: participações existentes continuam ativas. As participações já eliminadas pelo código antigo não podem ser reconstruídas com segurança. Não inferir antigos participantes a partir dos autores das mensagens. Grupos já arquivados não serão reativados automaticamente.

O rollback de dados de saída não é trivial: retirar as colunas enquanto se conservam as linhas encerradas poderia reativar ex-membros. O plano da migração deve preservar esses estados ou recusar esse downgrade com diagnóstico claro; nunca fazer uma reversão que alargue acessos silenciosamente.

### 4.2 Autorização e consistência

- Separar pertença ativa, leitura histórica, escrita e gestão; não confundir “pode ler” com “pode subscrever a sala”.
- Centralizar a regra de visibilidade de mensagens e reutilizá-la nos acessos individuais e nas listagens.
- Capturar o limite de saída na mesma transação que encerra a participação. Escrita de mensagens e alterações de membros devem partilhar a ordenação por conversa e voltar a validar autorização dentro do bloqueio.
- Antigos membros nunca contam para propriedade, número de participantes ativos, destinatários ou condição de arquivo.
- Um grupo arquivado pode permitir leitura histórica autorizada, mas não escrita nem gestão.
- Não reativar uma participação encerrada por abrir mensagens, marcar como lidas ou chamar `ensureParticipant`.

### 4.3 Superfícies que devem aplicar o mesmo limite

1. Mensagens paginadas, carregamento em torno de um ID, deep links e origem de encaminhamentos.
2. Última mensagem, pré-visualização, pesquisa, datas de atividade e não lidas da lista e da inbox.
3. Download, streaming, thumbnails e metadados de anexos; incluir a situação de um anexo novo acrescentado a uma mensagem antiga.
4. Edição, remoção, reações e pré-visualizações de links. Uma mensagem editada depois da saída deixa de ser devolvida ao ex-membro; não criar um sistema de versões só para reconstruir o texto antigo. Não devolver novas reações ou metadados introduzidos depois da saída.
5. Subscrições socket, reconexão, eventos dirigidos ao utilizador, presença/digitação, notificações, push e email já em fila. Revalidar a participação antes de enviar uma notificação pendente.

Remover todas as sessões do ex-membro da sala ativa. A leitura do histórico não volta a inscrevê-lo. Limpar dos clientes dados que possam ter chegado numa corrida com a saída; não prometer apagar cópias que o utilizador já descarregou.

Não ativar a conservação de participações encerradas nem disponibilizar histórico de ex-membros até todos estes caminhos terem proteção. Durante o desenvolvimento, separar trabalho por commits; publicar a entrega B como uma unidade coerente.

### 4.4 Reentrada e limites do primeiro incremento

Proposta simples para reentrada explícita: o proprietário volta a adicionar a pessoa como membro, nunca restaurando automaticamente o papel de proprietário. A pessoa recupera acesso ao histórico corrente do grupo, incluindo o período de ausência, mas mantém o limite de histórico que já removeu para si. O convite deve explicar que concede esse acesso.

Esta é uma decisão própria a confirmar na revisão do plano; não é apresentada como paridade exata com o Teams. Se o requisito for esconder períodos de ausência após reentrada, será necessário guardar intervalos de participação e filtrar múltiplos intervalos. Não implementar apenas um limite superior fingindo cobrir esse cenário.

Um grupo com zero membros ativos não tem ninguém autorizado a convidar: permanece arquivado. Recuperação administrativa ou reabertura ficam fora deste incremento.

## 5. Interface

Preservar o aspeto e os componentes atuais do chat, com textos em PT, EN, FR e ES.

- **Sair do grupo:** confirmação com efeito sobre a própria lista; mencionar transferência de propriedade quando aplicável. Na entrega B, opção “Remover também o histórico da minha lista e pesquisa”.
- **Remover membro:** confirmação com o nome da pessoa e explicação de que o histórico anterior permanece visível na entrega B.
- **Grupo com uma pessoa:** histórico e botão de gestão disponíveis, compositor desativado com o motivo.
- **Ex-membro:** aviso “Saíste deste grupo” ou “Foste removido deste grupo”; histórico limitado, sem compositor, reações, gestão ou notificações novas.
- **Remover histórico:** deixar claro “apenas para ti”; não usar “Eliminar grupo” para esta ação.
- **Última saída:** informar que o grupo ficará arquivado e que os dados não serão eliminados definitivamente.

Botões com estado pendente e erros; conservar a janela quando o pedido falhar. Foco, Escape, Enter e confirmação devem seguir os padrões existentes.

## 6. Ordem de implementação e testes

A checklist separa as tarefas por fluxo e indica ficheiros prováveis. Ordem:

`A1 -> A2 -> A3 -> checkpoint A -> B1 -> B2/B3/B4/B5 -> B6 -> B7 -> checkpoint B`.

A entrega A é utilizável sozinha. A entrega B só fica utilizável quando o conjunto de permissões, leituras e eventos estiver completo. Testes e traduções podem avançar em paralelo após estabilizar os contratos; esquema, transações e autorização exigem coordenação.

Matriz mínima de aceitação:

| Caso | Resultado exigido |
| --- | --- |
| Saída 3 -> 2, 2 -> 1, 1 -> 0 | Continuidade, continuidade em leitura, arquivo, respetivamente. |
| Saída do proprietário | Transferência determinística se ficar um participante ativo. |
| Remover último outro membro | Proprietário mantém histórico e gestão, incluindo após reload. |
| Saídas/remoções concorrentes | Sem grupo vazio ativo, proprietário ausente ou eventos incoerentes. |
| Mensagem concorrente com saída | Ordem consistente; sem mensagem posterior ao limite exposta. |
| Ex-membro com URL/ID conhecido | API impede conteúdo posterior, não apenas a interface. |
| Anexo ou edição posterior de mensagem antiga | Conteúdo novo não acessível ao ex-membro. |
| Duas sessões e reconexão | Saída aplicada em ambas; sem reentrada automática na sala. |
| Push/email pendente | Nenhuma notificação enviada após a revogação da participação. |
| Histórico removido antes da saída | Limite privado preservado e combinado com o limite de saída. |
| Grupo sem mensagens | Não reaparece por falta de limite de mensagem; histórico vazio. |
| Reentrada e nova saída | Regra de histórico explícita; novo limite calculado corretamente. |
| Acesso ao projeto revogado | Nenhum histórico ou anexo disponível. |
| Geral e conversa direta | Sem regressões de autorização, histórico ou notificações. |

Executar testes focados de servidor com Mocha e de cliente com Jest; incluir testes de integração com duas sessões e pedidos diretos à API para os limites de acesso. Validar visualmente em `http://localhost:3008` por hot reload, com grupos locais próprios para QA. Não usar grupos reais para ensaiar remoções.

Exemplos de comandos existentes:

```powershell
# Em server/; adicionar os testes específicos criados para este plano.
npx mocha test/utils/chat.test.js test/utils/chat-participant.test.js test/utils/chat-inbox.test.js
# Em client/.
npx jest --runInBand src/reducers/chat.test.js src/sagas/core/services/chat.test.js src/selectors/chat.test.js
```

Não executar build para validação local. Não executar migrações, reinícios ou outras alterações de produção como parte do planeamento. Release e migração de produção terão validação e autorização próprias.

## 7. Fora do âmbito

- Eliminação definitiva, limpeza automática de ficheiros e política de retenção configurável.
- Recuperação automática de grupos arquivados ou de participações antigas apagadas.
- Reproduzir todas as políticas de gestão de grupos do Teams.
- Alterar o sistema de grupos de utilizadores/permissões dos quadros.
- Registo visual de todas as entradas/saídas como mensagens de sistema; pode ser uma melhoria posterior.

## 8. Decisões para revisão

Recomendação: executar primeiro a entrega A. Confirmar antes de implementar a entrega B a regra proposta de histórico na reentrada e a opção de conservação/remoção do histórico ao sair. A ausência de eliminação definitiva é deliberada: “Sair” não deve apagar dados partilhados.
