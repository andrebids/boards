# Plano de implementação: notificações essenciais por utilizador

## 1. Objetivo

Permitir que cada utilizador reduza o volume de notificações pessoais sem perder eventos que exigem a sua atenção direta.

O utilizador poderá escolher entre:

- **Todas as notificações**: mantém o comportamento atual para cartões e boards subscritos;
- **Apenas essenciais**: recebe somente notificações em que foi diretamente envolvido.

Esta entrega também cria a notificação atualmente em falta quando outro utilizador adiciona alguém a um novo board.

## 2. Decisões de produto

### 2.1. Níveis disponíveis

Guardar uma preferência `notificationLevel` no utilizador com dois valores:

| Valor | Texto na interface | Comportamento |
|---|---|---|
| `all` | Todas as notificações | Mantém todos os eventos pessoais atualmente gerados |
| `essential` | Apenas essenciais | Suprime eventos de acompanhamento e mantém apenas ações dirigidas ao utilizador |

Não incluir um nível `none` nesta fase. A aplicação deve continuar a avisar o utilizador quando o seu acesso ou participação muda.

### 2.2. Classificação inicial de notificações essenciais

São essenciais:

| Tipo | Motivo |
|---|---|
| `addMemberToBoard` | O utilizador ganhou acesso a um novo board |
| `addMemberToCard` | O utilizador foi associado diretamente a um cartão |
| `removeMemberFromCard` | O utilizador deixou de estar associado diretamente a um cartão |
| `mentionInComment` | Outro utilizador pediu explicitamente a sua atenção |

São notificações normais, visíveis apenas no nível `all`:

- criação e movimento de cartões;
- comentários sem menção;
- criação, alteração, conclusão e remoção de tarefas;
- criação e remoção de listas de tarefas;
- adição e remoção de etiquetas;
- alterações de data de entrega;
- restantes eventos recebidos por subscrição de cartão ou board.

Regra para tipos futuros: um novo tipo entra como normal por omissão e só passa a essencial quando for adicionado explicitamente à lista de essenciais. Isto evita que uma atualização volte a criar ruído para quem escolheu `essential`.

### 2.3. Compatibilidade

- O valor inicial e o valor por omissão será `all`, portanto nenhum utilizador perde notificações ao aplicar a migração.
- Alterar para `essential` afeta apenas notificações futuras. As notificações não lidas existentes não são apagadas.
- As subscrições atuais de cartões e boards não são removidas. Se o utilizador voltar a `all`, começa novamente a receber os eventos futuros dessas subscrições.
- A preferência aplica-se à notificação pessoal completa: inbox interno, badge, WebSocket e, quando o tipo já tem um formatter para esse canal, entregas pessoais por SMTP/Apprise.
- Serviços configurados ao nível do board continuam inalterados, porque não pertencem a um utilizador individual.
- As preferências de notificações do chat continuam separadas e por conversa.

## 3. Estado atual verificado

Verificação realizada em 31 de julho de 2026.

### 3.1. Backend

- `server/api/models/Notification.js:13` declara 16 tipos de notificação, todos associados a cartões. Não existe `addMemberToBoard`.
- `server/api/models/Action.js:38` classifica 15 atividades de cartão como notificáveis internamente e `server/api/models/Action.js:65` identifica apenas associação/remoção de membros de cartões como eventos pessoais.
- `server/api/helpers/actions/create-one.js:576` cria notificações pessoais ou para subscritores de cartões/boards.
- `server/api/helpers/comments/create-one.js:79` une menções, subscritores do cartão e subscritores do board antes de criar notificações.
- `server/api/helpers/notifications/create-one.js:439` centraliza persistência, WebSocket, webhooks e entregas externas, mas assume sempre a existência de cartão, lista e ação/comentário.
- `server/api/helpers/board-memberships/create-one.js:44` cria e publica a adesão ao board, mas não cria qualquer notificação.
- `server/api/models/User.js:75` só expõe como preferências pessoais as subscrições automáticas, o destaque de cartões e opções de apresentação. Não existe um nível global de notificações.
- `server/api/controllers/users/update.js:56` já permite ao utilizador alterar as suas preferências pessoais pelo endpoint existente `PATCH /users/:id`.
- `server/api/hooks/query-methods/models/Notification.js:7` limita a 100 as notificações não lidas por utilizador.

### 3.2. Base de dados

- `server/db/migrations/20250228000022_version_2.js:575` criou a tabela `notification`.
- `notification.board_id` e `notification.card_id` são obrigatórios.
- Uma notificação de adesão a board não pode ser representada corretamente sem tornar `card_id` opcional para esse tipo.
- A tabela `user_account` não tem uma coluna para o nível de notificações.

### 3.3. Cliente

- `client/src/components/users/UserSettingsModal/NotificationsPane.jsx:16` mostra apenas serviços externos de notificação.
- `client/src/components/users/UserSettingsModal/PreferencesPane.jsx:16` contém opções de subscrição, mas não filtra tipos de notificação.
- `client/src/constants/Enums.js:125` expõe apenas quatro tipos específicos ao componente de notificações.
- `client/src/components/notifications/NotificationsStep/Item.jsx:37` procura sempre um cartão e todos os links atuais apontam para `/cards/:id`.
- `client/src/models/Notification.js:29` já aceita relações Redux ORM para board e cartão; a relação de cartão pode permanecer vazia desde que a renderização trate o novo tipo.
- `client/src/sagas/core/services/notifications.js:31` só marca automaticamente como lida uma notificação cujo cartão está aberto. Uma notificação de board sem `cardId` permanecerá no inbox, que é o comportamento pretendido.

## 4. Arquitetura proposta

```text
Evento candidato
  |
  +-- ação/comentário em cartão
  |     |
  |     +-- resolve destinatários pelas subscrições/menções atuais
  |
  +-- criação de BoardMembership
        |
        +-- destinatário é o novo membro
              |
              v
     política de preferência do utilizador
       all       -> permite qualquer tipo conhecido
       essential -> permite apenas ESSENTIAL_TYPES
              |
              v
     cria Notification uma única vez
              |
       +------+---------+-----------+
       |                |           |
     inbox/badge     WebSocket   SMTP/Apprise pessoal
```

A decisão deve ser aplicada no servidor antes de persistir a notificação. Filtrar apenas no cliente deixaria registos invisíveis, badges inconsistentes e emails que o utilizador tentou desligar.

## 5. Modelo de dados e migração

Criar uma migração posterior a `20260729000001_add_video_processing_jobs.js`, por exemplo:

`server/db/migrations/20260731000000_add_user_notification_level_and_board_notifications.js`

### 5.1. `user_account.notification_level`

Adicionar:

```sql
notification_level TEXT NOT NULL DEFAULT 'all'
```

Adicionar uma restrição:

```sql
CHECK (notification_level IN ('all', 'essential'))
```

Não é necessário executar `UPDATE`, porque o `DEFAULT 'all'` e o `NOT NULL` preservam o comportamento dos registos existentes.

### 5.2. `notification.card_id`

Remover o `NOT NULL` de `card_id` e adicionar uma restrição de escopo:

```sql
CHECK (
  (type = 'addMemberToBoard' AND card_id IS NULL)
  OR
  (type <> 'addMemberToBoard' AND card_id IS NOT NULL)
)
```

Consequências:

- apenas `addMemberToBoard` pode existir sem cartão;
- todas as notificações de cartão mantêm a garantia atual;
- `board_id` continua obrigatório;
- não é necessária uma nova tabela nem um novo índice.

### 5.3. Rollback da migração

O `down` deve:

1. remover a restrição de escopo;
2. apagar apenas notificações com `type = 'addMemberToBoard'`;
3. voltar a aplicar `NOT NULL` a `card_id`;
4. remover a restrição e a coluna `user_account.notification_level`.

O rollback perde apenas notificações do novo tipo; não altera memberships nem notificações de cartões.

## 6. Alterações no backend

### Fase 1: constantes e preferência do utilizador

Ficheiros:

- `server/api/models/User.js`
- `server/api/controllers/users/update.js`
- `server/api/models/Notification.js`

Alterações:

1. Adicionar a `User`:

   ```js
   const NotificationLevels = {
     ALL: 'all',
     ESSENTIAL: 'essential',
   };
   ```

2. Adicionar `notificationLevel` aos atributos de `User`, com `defaultsTo: 'all'` e `columnName: 'notification_level'`.
3. Adicionar `notificationLevel` a `User.PERSONAL_FIELD_NAMES`.
4. Aceitar o campo no controller `users/update`, validando-o contra `Object.values(User.NotificationLevels)`.
5. Incluir o campo no `_.pick()` do update.
6. Adicionar `Notification.Types.ADD_MEMBER_TO_BOARD = 'addMemberToBoard'`.
7. Declarar uma lista única `Notification.ESSENTIAL_TYPES` com os quatro tipos da secção 2.2.
8. Remover `required: true` apenas de `Notification.cardId`; `boardId` permanece obrigatório.

Contrato HTTP reutilizado:

```http
PATCH /users/:currentUserId
Content-Type: application/json

{
  "notificationLevel": "essential"
}
```

Resposta:

```json
{
  "item": {
    "id": "123",
    "notificationLevel": "essential"
  }
}
```

Não criar um endpoint específico. O fluxo genérico de atualização do utilizador já tem autorização, atualização otimista e sincronização por socket.

### Fase 2: política central de criação

Ficheiros:

- `server/api/helpers/notifications/create-one.js`
- novo teste unitário da política em `server/test/utils/notification-preferences.test.js`

Alterações:

1. Resolver o utilizador destinatário no início do helper, reutilizando esse registo mais tarde para idioma e email.
2. Antes de `Notification.qm.createOne`, aplicar:

   ```js
   const shouldCreate =
     notifiableUser.notificationLevel !== User.NotificationLevels.ESSENTIAL ||
     Notification.ESSENTIAL_TYPES.includes(values.type);
   ```

3. Tratar valor ausente ou nulo como `all` para compatibilidade com seeds, mocks e dados anteriores à migração.
4. Se a política suprimir o evento, devolver `null` sem:

   - criar linha em `notification`;
   - publicar `notificationCreate`;
   - enviar webhook de notificação;
   - enviar SMTP, notificação global ou serviço pessoal Apprise.

5. Não alterar a escolha de destinatários nos helpers de ações e comentários. A política central decide depois se cada candidato recebe a notificação.
6. Manter serviços externos configurados no próprio board fora desta política.

### Fase 3: generalizar a criação para notificações de board

Ficheiros:

- `server/api/helpers/notifications/create-one.js`
- `server/api/helpers/board-memberships/create-one.js`
- `server/api/helpers/utils/compile-email-template.js`
- `server/views/email-templates/master.hbs`
- `server/views/email-templates/partials/notification_title.hbs`
- `server/views/email-templates/partials/notification_summary.hbs`
- `server/views/email-templates/partials/cta_button.hbs`
- novo `server/views/email-templates/types/add-member-to-board.hbs`

Alterações no helper central:

1. Tornar `list` opcional e aceitar notificações com `board` mas sem `card`.
2. Só preencher `commentId`, `actionId` e `cardId` quando os respetivos registos existirem.
3. Construir os dados conforme o escopo:

   ```json
   {
     "board": {
       "id": "board-id",
       "name": "Planeamento"
     },
     "project": {
       "id": "project-id",
       "name": "Projeto A"
     },
     "role": "editor"
   }
   ```

4. Preservar exatamente o contrato e os dados atuais para notificações de cartões.
5. Adicionar título, corpo em texto/Markdown/HTML e CTA para `addMemberToBoard`.
6. Usar `/boards/:id` como destino; nunca gerar `/cards/null`.
7. Tornar os partials de email neutros ao recurso ou adicionar um ramo explícito de board. O email deve mostrar projeto, board, papel atribuído e um botão “Abrir board”.
8. Registar `addMemberToBoard` no mapa `NOTIFICATION_TYPE_TO_PARTIAL`.

Alterações no helper de membership:

1. Depois de a membership ser criada com sucesso, criar uma notificação quando `actorUser.id !== values.user.id`.
2. Enviar ao helper:

   ```js
   {
     type: Notification.Types.ADD_MEMBER_TO_BOARD,
     user: values.user,
     creatorUser: inputs.actorUser,
     board: values.board,
     data: {
       board: _.pick(values.board, ['id', 'name']),
       project: _.pick(inputs.project, ['id', 'name']),
       role: boardMembership.role,
     },
   }
   ```

3. Criar exatamente uma notificação por membership bem-sucedida.
4. Não criar notificação se o utilizador se adicionar a si próprio.
5. Uma tentativa duplicada que devolva `userAlreadyBoardMember` não pode criar outra notificação.
6. Uma falha de entrega externa não pode desfazer nem bloquear a membership. Deve ser registada, mantendo o acesso ao board como operação principal.

### Fase 4: apresentação e autorização

Ficheiros:

- `server/api/helpers/users/present-one.js`
- testes de integração de utilizadores

O helper atual já devolve todos os campos pessoais ao próprio utilizador e os omite para terceiros. Ao adicionar `notificationLevel` a `PERSONAL_FIELD_NAMES`, validar por teste que:

- o próprio utilizador recebe o valor;
- um administrador que consulta outro utilizador não recebe a preferência pessoal;
- um utilizador comum nunca consegue alterar a preferência de outra pessoa.

## 7. Alterações no cliente

### Fase 5: modelo e controlos de preferência

Ficheiros:

- `client/src/constants/Enums.js`
- `client/src/models/User.js`
- `client/src/components/users/UserSettingsModal/NotificationsPane.jsx`
- `client/src/components/users/UserSettingsModal/NotificationsPane.module.scss`

Alterações:

1. Adicionar:

   ```js
   export const UserNotificationLevels = {
     ALL: 'all',
     ESSENTIAL: 'essential',
   };
   ```

2. Adicionar `notificationLevel: attr()` ao modelo Redux ORM `User`.
3. No topo do separador “Notificações”, mostrar uma secção “Notificações pessoais”.
4. Apresentar duas opções mutuamente exclusivas:

   - “Todas as notificações”;
   - “Apenas essenciais”.

5. Explicar sob a segunda opção: “Inclui menções e quando é adicionado a um board ou cartão.”
6. Ao alterar, despachar:

   ```js
   entryActions.updateCurrentUser({
     notificationLevel: value,
   });
   ```

7. Manter a configuração de serviços externos abaixo, separada por título/divisor.
8. Manter a atualização otimista, mas corrigir a ausência atual de rollback para este campo:

   - adicionar ao modelo cliente um estado efémero `notificationLevelUpdateForm` com `isSubmitting`, `previousValue` e `error`;
   - ao receber `USER_UPDATE` com `notificationLevel`, o reducer guarda o valor anterior antes da atualização otimista;
   - o reducer trata o `USER_UPDATE__FAILURE` já existente, repõe `previousValue` e guarda o erro;
   - os radios ficam desativados enquanto o pedido está em curso, impedindo respostas concorrentes fora de ordem;
   - uma mensagem de erro informa que a alteração não foi guardada.

9. Limpar o estado de submissão/erro quando `USER_UPDATE__SUCCESS` devolver o utilizador canónico.
10. Garantir navegação por teclado, associação entre label e radio e foco visível.

### Fase 6: item “adicionado a board”

Ficheiros:

- `client/src/constants/Enums.js`
- `client/src/components/notifications/NotificationsStep/Item.jsx`

Alterações:

1. Adicionar `ADD_MEMBER_TO_BOARD` a `NotificationTypes`.
2. Tratar esse tipo antes de qualquer ramo que assuma a existência de cartão.
3. Obter o nome por `notification.data.board.name`, com fallback traduzido “Board”.
4. Renderizar:

   ```text
   <ator> adicionou-o ao board <nome do board>
   ```

5. Ligar o nome a `Paths.BOARDS.replace(':id', notification.boardId)`.
6. Manter avatar do ator, data e ação de dispensar.
7. Se o board tiver sido removido ou o utilizador já não tiver acesso, o texto estático continua legível; a navegação segue o tratamento normal de board não encontrado/sem acesso.

### Fase 7: traduções

Ficheiros:

- `client/src/locales/en-US/core.js`
- `client/src/locales/pt-PT/core.js`
- `client/src/locales/fr-FR/core.js`
- restantes locales que já definem `userAddedYouToCard`

Adicionar chaves para:

- título “Notificações pessoais”;
- “Todas as notificações”;
- “Apenas essenciais”;
- descrição das notificações essenciais;
- “Serviços de notificação”;
- mensagem “{{user}} adicionou-o ao board {{board}}”;
- fallback do nome “Board”.

Existem 32 diretórios de locale e apenas 9 já contêm a mensagem equivalente de associação a cartão. Atualizar esses 9 para manter a cobertura atual das mensagens do inbox e garantir que `en-US` continua a ser o fallback para os restantes. As strings personalizadas da área de definições devem existir, no mínimo, em `en-US`, `pt-PT` e `fr-FR`, seguindo a prática atual do projeto.

## 8. Ficheiros previstos

| Ficheiro | Alteração |
|---|---|
| `server/db/migrations/20260731000000_add_user_notification_level_and_board_notifications.js` | Nova coluna, restrições e `card_id` opcional apenas para o novo tipo |
| `server/api/models/User.js` | Enum, atributo e campo pessoal |
| `server/api/controllers/users/update.js` | Aceitar e validar `notificationLevel` |
| `server/api/models/Notification.js` | Novo tipo, lista essencial e `cardId` opcional |
| `server/api/helpers/notifications/create-one.js` | Política central e suporte a escopo de board |
| `server/api/helpers/board-memberships/create-one.js` | Criar notificação após nova membership |
| `server/api/helpers/utils/compile-email-template.js` | Mapear o template do novo tipo |
| `server/views/email-templates/...` | Conteúdo e CTA de board sem pressupor cartão |
| `client/src/constants/Enums.js` | Nível do utilizador e novo tipo de notificação |
| `client/src/models/User.js` | Persistir `notificationLevel` no Redux ORM |
| `client/src/components/users/UserSettingsModal/NotificationsPane.jsx` | Controlo por utilizador |
| `client/src/components/users/UserSettingsModal/NotificationsPane.module.scss` | Hierarquia visual e estados de foco |
| `client/src/components/notifications/NotificationsStep/Item.jsx` | Renderização e link do novo tipo |
| `client/src/locales/*/core.js` | Labels e mensagem do inbox |
| `server/test/utils/notification-preferences.test.js` | Matriz da política |
| `server/test/utils/board-membership-notification.test.js` | Criação do novo evento |
| `server/test/utils/card-notification-coverage.test.js` | Regressão dos tipos de cartão |
| testes do cliente junto aos componentes/modelos | Preferência, renderização e atualização otimista |

## 9. Plano de testes

| Camada | Cobertura mínima |
|---|---|
| Migração | `all` por omissão; valores inválidos rejeitados; apenas `addMemberToBoard` aceita `card_id = NULL`; `down` volta a `NOT NULL` |
| Unidade backend | matriz `all`/`essential`; tipo futuro não essencial; valor ausente tratado como `all` |
| Unidade backend | membership cria uma notificação; self-add e duplicado criam zero |
| Unidade backend | eventos suprimidos não persistem nem enviam socket/email/webhook |
| Integração API | utilizador altera o próprio nível; outro utilizador recebe 403/404 conforme o contrato atual; valor inválido recebe 400 |
| Integração backend | adicionar utilizador a board cria linha com `boardId`, `cardId = null`, ator e dados estáticos |
| Cliente | radio reflete o valor atual, despacha `updateCurrentUser`, bloqueia duplo envio e faz rollback em falha |
| Cliente | item de board mostra ator/nome e aponta para `/boards/:id` sem tentar resolver cartão |
| E2E/manual | duas sessões validam criação em tempo real e filtragem após mudança de nível |

### 9.1. Matriz obrigatória da política

| Evento | `all` | `essential` |
|---|---:|---:|
| Adicionado a board | recebe | recebe |
| Adicionado a cartão | recebe | recebe |
| Removido de cartão | recebe | recebe |
| Mencionado em comentário | recebe | recebe |
| Comentário sem menção num cartão subscrito | recebe | não recebe |
| Cartão movido num board subscrito | recebe | não recebe |
| Tarefa criada/alterada/concluída | recebe | não recebe |
| Etiqueta ou data de entrega alterada | recebe | não recebe |

### 9.2. Validação manual com hot reload

Usar os serviços de desenvolvimento existentes em `http://localhost:3008`; não executar build.

1. Abrir duas sessões, uma como gestor e outra como utilizador alvo.
2. No utilizador alvo, selecionar “Apenas essenciais”.
3. Subscrever um board/cartão e provocar movimento, comentário sem menção, tarefa e etiqueta: não aparece notificação pessoal.
4. Mencionar o utilizador: aparece uma notificação no inbox e nos canais pessoais configurados.
5. Adicionar o utilizador a um novo board: aparece exatamente uma notificação com link funcional para o board.
6. Remover e voltar a adicionar o utilizador: cada nova membership bem-sucedida cria uma nova notificação.
7. Tentar adicionar novamente sem remover: a API devolve conflito e não cria notificação duplicada.
8. Trocar para “Todas as notificações”: novos eventos dos recursos subscritos voltam a aparecer.
9. Recarregar e reconectar o socket: a preferência e as notificações não lidas permanecem corretas.

## 10. Critérios de aceitação

1. Cada utilizador consegue escolher `all` ou `essential` nas suas próprias definições.
2. A escolha é persistida na base de dados e sobrevive a refresh, logout e reconexão.
3. Utilizadores existentes continuam em `all` após a migração.
4. Em `essential`, nenhum evento fora de `Notification.ESSENTIAL_TYPES` cria notificação pessoal, socket, badge ou entrega externa pessoal.
5. Em `essential`, menções e alterações diretas de associação a cartões continuam a chegar.
6. Adicionar outra pessoa a um board cria exatamente uma notificação `addMemberToBoard`.
7. A notificação de board tem `boardId`, `cardId = null`, ator, nome do board, projeto e papel atribuído.
8. O item do inbox nunca mostra “Card”, `undefined` ou um link `/cards/null` para o novo tipo.
9. O link da nova notificação abre `/boards/:id`.
10. Adicionar-se a si próprio ou repetir uma membership existente não cria notificação.
11. Mudar para `essential` não apaga notificações existentes nem remove subscrições.
12. Serviços externos do board e preferências por conversa do chat mantêm o comportamento atual.
13. Uma falha de email/Apprise não impede a criação da membership.
14. Os testes novos e os testes de cobertura de notificações de cartão passam.
15. A validação local é feita por hot reload em `http://localhost:3008`, sem build.

## 11. Sequência de implementação

```text
1. Migração e constantes
          |
          v
2. Política central de filtragem
          |
          +--------------------+
          |                    |
          v                    v
3. Evento de board       4. Preferência no cliente
          |                    |
          +----------+---------+
                     v
             5. Renderização/email
                     |
                     v
                6. Testes E2E
```

Razão da ordem:

- a migração e as constantes definem o contrato;
- a política central deve existir antes da interface, para a opção não ser apenas visual;
- o novo evento de board depende de notificações sem cartão;
- cliente e backend podem ser ligados depois de o contrato estar estável;
- a validação E2E deve confirmar o fluxo completo com dois utilizadores.

## 12. Estimativa

| Componente | Esforço estimado |
|---|---:|
| Migração e modelos | 2–3 h |
| Política central e regressão dos tipos existentes | 3–4 h |
| Notificação de adesão a board e entregas externas | 4–6 h |
| Interface, Redux ORM e traduções | 3–4 h |
| Testes automáticos | 4–6 h |
| Validação manual com duas sessões | 1–2 h |
| **Total** | **17–25 h** |

O maior risco está na generalização do helper e dos templates, porque o fluxo atual pressupõe sempre um cartão.

## 13. Observabilidade e falhas

- Registar ao nível `debug` a supressão com `userId`, `type` e `notificationLevel`, sem conteúdo de comentários.
- Registar erro de criação/envio da notificação de board sem incluir dados sensíveis.
- Não transformar falha de email/Apprise em falha da criação de membership.
- Não criar métricas de produto nesta fase. Se for necessário medir redução de ruído, adicionar contadores agregados de “candidatas” e “suprimidas” numa entrega separada.

## 14. Fora de âmbito

- Preferências por tipo com uma checkbox para cada um dos 17 tipos;
- nível “nenhuma notificação”;
- horários de silêncio, resumos diários ou semanais;
- alterações às preferências por conversa do chat;
- alterações a serviços externos configurados ao nível do board;
- apagar ou reclassificar notificações antigas;
- notificação de remoção de um board;
- histórico completo para além do limite atual de 100 não lidas;
- notificações push nativas do browser ou aplicações móveis.

Uma futura terceira opção `custom` pode reutilizar a política central desta entrega sem alterar o contrato de criação das notificações.
