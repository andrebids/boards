# Plano: grupos de utilizadores (User Groups)

Data: 2026-09-17
Estado: proposta de implementação; funcionalidade ainda não implementada nem testada.
Repositório: `D:\Projetos\planka-personalizado` (Planka Community 1.3.3, fork personalizado)
Checklist: [user-groups-todo.md](./user-groups-todo.md)

## 1. Objetivo e âmbito

Permitir agrupar pessoas e conceder acesso a um quadro ao grupo inteiro de uma só vez, mantendo o acesso sincronizado: quem entra no grupo ganha acesso, quem sai perde-o.

Dentro do âmbito:

- Grupos globais da instância, geridos por administradores.
- Grupos de projeto, geridos pelos gestores desse projeto.
- Ligar um grupo a um quadro com um papel (`editor` / `viewer`) e a opção de comentar.
- Sincronização automática nos dois sentidos (alterações no grupo e alterações na ligação).
- Painel de administração para criar, renomear, apagar grupos e editar a composição.

Fora do âmbito desta versão (ver secção 10):

- Atribuir um grupo a um cartão como se fosse uma pessoa.
- Papéis `worker` / `guest` e visibilidade limitada (não existem na Community).
- Sincronização de grupos a partir de OIDC/SSO.

## 2. Relação com a versão Pro: confirmado e não confirmado

Verificação documental realizada em 2026-09-17, em fontes oficiais.

| Evidência | O que permite afirmar |
| --- | --- |
| [Funcionalidades Pro](https://planka.app/pro) | O produto anuncia: "Bundle people into groups and grant a whole group board access at once." |
| [Comparação de funcionalidades](https://planka.app/features) | *User Groups* está marcado como indisponível na Community e disponível em Pro e Enterprise. |
| [Notas de versão Pro 2.5.0, 2026-09-06](https://planka.app/blog/planka-pro-v2-5-0) | "give a whole team access to a board at once, kept in sync; project managers can maintain a project's own teams"; "a team is managed by whoever owns it — instance-wide teams by admins, a project's teams by its managers"; "Leaving a group takes its board access with it — removal used to leave the granted board memberships behind"; "a team can be assigned to a card like a person"; "Group rosters stay with the people who administer them". |
| [Discussão #583](https://github.com/plankanban/planka/discussions/583) | A funcionalidade foi pedida na Community em 2023 e o mantenedor respondeu favoravelmente; acabou por sair apenas na Pro. |
| Changelog dentro da aplicação, lido em `https://pro.demo.planka.cloud` a correr **Pro v2.5.0**, em 2026-09-17 | Texto integral da entrada 2.5.0, mais detalhado que o blogue. Ver 2.1. |

### 2.1 Leitura do changelog da aplicação

A demo pública corre exatamente a versão que introduziu os Teams. O texto da entrada 2.5.0, por secção:

**Adicionado:** "Teams: give a whole team access to a board at once, kept in sync; project managers can maintain a project's own teams; a team can be assigned to a card like a person."

**Alterado:** "A team is managed by whoever owns it — instance-wide teams by admins, a project's teams by its managers; no one is offered another project's teams any more."

**Segurança:** "Leaving a group takes its board access with it — removal used to leave the granted board memberships behind." e "Group rosters stay with the people who administer them: a guest no longer receives every bound team's members and their profiles."

Três leituras úteis para este plano:

1. A frase sobre propriedade aparece em *Alterado*, não em *Adicionado*. Os grupos **já existiam numa versão anterior da Pro**; a 2.5.0 acrescentou o escopo por projeto e arrumou quem gere o quê. O produto levou mais do que uma versão a acertar nisto.
2. Os dois problemas corrigidos estão classificados como **Segurança**, não como defeitos banais: adesões que sobrevivem à saída do grupo, e composição de grupos entregue a quem não a devia ver. São precisamente as secções 4.1 e 6 deste plano, e justificam o Checkpoint A da checklist.
3. A terminologia é inconsistente na própria Pro: *Teams* nas funcionalidades, *group* nas correções de segurança. É a mesma entidade. Aqui fixa-se **grupo** em toda a UI e `userGroup` em todo o código.

**O código da Pro é fechado e não está neste repositório.** Uma pesquisa por `userGroup|user_group|UserGroup` na árvore de trabalho devolve zero ocorrências e `server/api/models/` não contém qualquer modelo de grupo. Este plano é desenvolvimento próprio; não reutiliza código Pro.

**Inferência de desenho, não facto documentado:** a frase "removal used to leave the granted board memberships behind" indica que a Pro materializa linhas reais de `board_membership` a partir da ligação ao grupo, em vez de as calcular em tempo de leitura. O plano segue a mesma abordagem, pelas razões da secção 4, mas a estrutura interna da Pro não foi observada.

**Não foi efetuado teste funcional numa instância Pro** à data de escrita. A validação da UI está prevista na secção 9.

## 3. Modelo de dados

Três tabelas novas e duas colunas novas em `board_membership`.

### 3.1 `user_group`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | bigint PK | `next_id()`, como as restantes tabelas |
| `project_id` | bigint nullable | `NULL` = grupo global da instância; preenchido = grupo do projeto |
| `name` | text not null | |
| `description` | text nullable | |
| `created_at` / `updated_at` | timestamp | |

Índices: `index(project_id)`, `unique(project_id, name)`. Nota: em PostgreSQL um índice único trata `NULL` como distinto, pelo que a unicidade dos grupos globais precisa de um índice parcial adicional `unique(name) where project_id is null`.

### 3.2 `user_group_membership`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | bigint PK | |
| `user_group_id` | bigint not null | |
| `user_id` | bigint not null | |
| `created_at` / `updated_at` | timestamp | |

Índices: `unique(user_group_id, user_id)`, `index(user_id)`.

### 3.3 `board_user_group` (a ligação grupo → quadro)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | bigint PK | |
| `project_id` | bigint not null | denormalizado, como em `board_membership` |
| `board_id` | bigint not null | |
| `user_group_id` | bigint not null | |
| `role` | text not null | `editor` / `viewer`, reutiliza `BoardMembership.Roles` |
| `can_comment` | boolean nullable | mesma semântica de `board_membership` |
| `created_at` / `updated_at` | timestamp | |

Índices: `unique(board_id, user_group_id)`, `index(project_id)`, `index(user_group_id)`.

### 3.4 Alterações a `board_membership`

`board_membership` tem `unique(['board_id', 'user_id'])` (ver `server/db/migrations/20250228000022_version_2.js:274`). Por isso **não é possível** ter uma linha direta e uma linha derivada de grupo para o mesmo par. A linha passa a ser a permissão *efetiva* e ganha a sua proveniência:

| Coluna nova | Tipo | Notas |
| --- | --- | --- |
| `is_direct` | boolean not null default `true` | a pessoa foi adicionada individualmente |
| `granted_by_group_ids` | jsonb not null default `'[]'` | ids dos grupos que também concedem este acesso |

O `default true` garante que todas as linhas existentes continuam a ser adesões diretas após a migração, sem passo de backfill.

## 4. Motor de sincronização

Uma única função reconcilia o estado efetivo. Toda a lógica de sincronização passa por ela; nada mais escreve `board_membership` por causa de grupos.

`sails.helpers.userGroups.reconcileBoardMembership({ boardId, userId, actorUser, request })`:

1. Ler a linha atual de `board_membership` para o par, se existir.
2. Calcular as fontes:
   - direta, se `is_direct` for verdadeiro na linha existente;
   - de grupo, para cada `board_user_group` desse quadro cujo grupo contenha o utilizador.
3. Se não houver nenhuma fonte, apagar a linha, pela via existente `sails.helpers.boardMemberships.deleteOne`, para manter os broadcasts de socket e os webhooks.
4. Se houver fontes, calcular:
   - `role` = o mais forte entre as fontes (`editor` > `viewer`); uma adesão direta define o seu próprio papel e ganha sempre ao papel do grupo;
   - `canComment` = verdadeiro se alguma fonte o permitir;
   - `granted_by_group_ids` = lista dos grupos que contribuíram.
5. Criar ou atualizar pela via existente (`boardMemberships.createOne` / `updateOne`), para reaproveitar broadcasts, webhooks, notificações e `autoAddBoardMembersToCards`.

**Regra de precedência, decidida aqui:** a adesão direta prevalece sobre a do grupo. Adicionar uma pessoa individualmente como `editor` num quadro onde o grupo lhe dá `viewer` mantém-na `editor`; retirar o grupo não lhe retira o acesso. É a regra que evita o efeito surpresa de um grupo despromover alguém.

### 4.1 Pontos de chamada

A reconciliação corre para cada par (quadro, utilizador) afetado por:

| Evento | Pares a reconciliar |
| --- | --- |
| Grupo ligado a um quadro | todos os membros do grupo, nesse quadro |
| Ligação removida ou papel alterado | todos os membros do grupo, nesse quadro |
| Utilizador adicionado a um grupo | esse utilizador, em todos os quadros ligados ao grupo |
| Utilizador removido de um grupo | idem |
| Grupo apagado | todos os membros, em todos os quadros ligados |
| Quadro apagado | remoção em cascata de `board_user_group` (sem reconciliação: as adesões já desaparecem) |
| Projeto apagado | cascata dos grupos do projeto e das ligações |
| Utilizador desativado ou apagado | remover de `user_group_membership` nos fluxos existentes de `users/delete` e de desativação |

Cada um destes pontos é um sítio onde o bug corrigido no Pro 2.5.0 ("removal used to leave the granted board memberships behind") se pode repetir. A secção 8 cobre-os com testes.

## 5. Servidor: ficheiros a criar

O molde é `organization-default-labels`, a funcionalidade global mais recente deste fork; segue-se a mesma estrutura em todas as camadas.

**Modelos** — `server/api/models/`: `UserGroup.js`, `UserGroupMembership.js`, `BoardUserGroup.js`.

**Query methods** — `server/api/hooks/query-methods/models/`: um ficheiro por modelo, exportando `createOne`, `getByIds`, `getByProjectId`, `getByUserId`, `getByBoardId`, `getOneById`, `updateOne`, `deleteOne`, no mesmo estilo de `BoardMembership.js`. O hook carrega-os por nome de ficheiro; não é preciso registá-los.

**Helpers** — `server/api/helpers/user-groups/`: `create-one.js`, `update-one.js`, `delete-one.js`, `add-member.js`, `remove-member.js`, `bind-to-board.js`, `unbind-from-board.js`, `reconcile-board-membership.js`, `get-path-to-project-by-id.js`.

**Controllers** — `server/api/controllers/user-groups/`: `list.js`, `create.js`, `update.js`, `delete.js`, `add-member.js`, `remove-member.js`; e `server/api/controllers/board-user-groups/`: `create.js`, `update.js`, `delete.js`.

**Migração** — `server/db/migrations/2026MMDD000000_add_user_groups.js`, com `up` e `down` completos, incluindo a remoção das duas colunas de `board_membership` no `down`.

**Rotas** — `server/config/routes.js`, junto às linhas 198-200 e 278-283:

```
'GET    /api/user-groups'                              : 'user-groups/list',
'POST   /api/user-groups'                              : 'user-groups/create',
'PATCH  /api/user-groups/:id'                          : 'user-groups/update',
'DELETE /api/user-groups/:id'                          : 'user-groups/delete',
'POST   /api/user-groups/:userGroupId/members'         : 'user-groups/add-member',
'DELETE /api/user-groups/:userGroupId/members/:userId' : 'user-groups/remove-member',
'POST   /api/boards/:boardId/user-groups'              : 'board-user-groups/create',
'PATCH  /api/board-user-groups/:id'                    : 'board-user-groups/update',
'DELETE /api/board-user-groups/:id'                    : 'board-user-groups/delete',
```

## 6. Permissões e visibilidade

| Ação | Quem pode |
| --- | --- |
| Criar/editar/apagar grupo global | administrador (política `is-admin`) |
| Criar/editar/apagar grupo de projeto | gestor desse projeto (`sails.helpers.users.isProjectManager`) |
| Editar composição de um grupo | quem gere esse grupo, pela regra acima |
| Ligar/desligar grupo a um quadro | gestor do projeto do quadro, como em `board-memberships/create.js:76` |

Regras de leitura, que reproduzem o comportamento descrito na Pro 2.5.0:

- `user_group` e `board_user_group` de um quadro são visíveis a quem é membro do quadro: é preciso ver que o acesso vem de um grupo.
- **A composição (`user_group_membership`) só vai para quem gere o grupo.** Um membro normal do quadro recebe o nome do grupo e a contagem, não a lista de pessoas nem os perfis. É o equivalente a "Group rosters stay with the people who administer them".
- Um projeto nunca vê os grupos de outro projeto; a listagem filtra por `project_id` mais os globais.

O payload inicial em `server/api/controllers/projects/index.js:93` (`included`) passa a incluir `userGroups` e `boardUserGroups`, e `userGroupMemberships` apenas dos grupos que o utilizador gere.

## 7. Cliente: ficheiros a criar

**Estado** — `client/src/models/UserGroup.js`, `UserGroupMembership.js`, `BoardUserGroup.js` (redux-orm, registados em `models/index.js`); `client/src/api/user-groups.js` e `board-user-groups.js`; `client/src/actions/user-groups.js`; `client/src/entry-actions/user-groups.js`; `client/src/sagas/user-groups.js` mais o reencaminhamento em `client/src/sagas/core/watchers/user-groups.js`, exatamente como `organization-default-labels`.

**Administração** — novo painel `client/src/components/common/AdministrationModal/UserGroupsPane/`, acrescentado ao array `panes` em `AdministrationModal.jsx:38`, visível conforme as regras da secção 6. Conteúdo: lista de grupos à esquerda, composição do grupo selecionado à direita, com pesquisa de utilizadores.

**Quadro** — o popup existente `client/src/components/board-memberships/BoardMemberships/AddStep/` ganha dois separadores, *Pessoas* e *Grupos*, reutilizando o mesmo campo de pesquisa e o mesmo `SelectPermissionsStep` já usado em `AddStep.jsx:63`. A lista de membros do quadro (`BoardMemberships.jsx`) mostra os grupos ligados antes dos membros individuais, e um membro cujo acesso venha de um grupo mostra essa origem e não oferece a ação de remover diretamente.

**Traduções** — `client/src/locales/` para as línguas já mantidas no fork.

## 8. Testes

Seguindo o que já existe em `server/test/utils/`:

- `user-group-reconcile.test.js`: precedência de papéis; dois grupos com papéis diferentes; direto mais grupo; remoção de um grupo quando outro ainda concede acesso.
- `user-group-cascade.test.js`: cada linha da tabela em 4.1, com especial atenção a apagar o grupo, apagar o quadro e desativar o utilizador — nenhuma adesão órfã pode ficar.
- `user-group-permissions.test.js`: gestor de projeto não mexe em grupos globais; projeto não vê grupos de outro projeto; a composição não é enviada a membros que não gerem o grupo.

## 9. Replicar a UI da Pro

A Pro corre o mesmo cliente: React com Semantic UI React e módulos SCSS. Os componentes de que precisamos — `Modal`, `Tab`, `Popup`, `Input`, `UserAvatar` — já estão neste repositório. Replicar a UI é, na prática, usar os componentes existentes com a disposição e os textos observados na demo, não reimplementar um sistema de design alheio.

Método, por ordem:

1. Abrir a demo pública em `https://pro.demo.planka.cloud` (as credenciais de demonstração estão publicadas em planka.app; a sessão é iniciada pelo utilizador, não pelo agente).
2. Percorrer os ecrãs de grupos e capturar cada estado: lista vazia, lista com grupos, criar, renomear, editar composição, ligar a um quadro, escolher papel, remover.
3. Ler a árvore de acessibilidade de cada ecrã, além da captura: dá os textos exatos, a ordem dos campos e os papéis ARIA, que a imagem sozinha não dá.
4. Registar as decisões de interação que não se veem numa captura: o que acontece a um membro direto quando o grupo é removido, se há confirmação ao apagar um grupo com quadros ligados, se o papel se escolhe antes ou depois de selecionar o grupo.
5. Construir com os componentes locais e comparar lado a lado.

Nota sobre o que copiar: a disposição, o fluxo e a terminologia são observáveis e replicáveis. O código da Pro não está disponível e não deve ser procurado por outras vias, incluindo a leitura do bundle servido pela demo.

### 9.1 Resultado do reconhecimento à demo, 2026-09-17

**A UI de grupos não é observável com a conta de demonstração publicada.** A conta `engineer1@demo.com` é membro simples: o menu de utilizador não tem entrada de administração, a página inicial não oferece criar projeto, e o menu do quadro só dá Subscribe, Custom Fields, Card Templates, Export e Actions, sem edição de membros. Sem direitos de administrador nem de gestor de projeto, nenhum dos ecrãs de grupos é alcançável.

Observado no popup de membros do quadro, que é o componente que vamos alterar:

- Cabeçalho com o papel do quadro como título, aqui "Editors".
- Campo "Search members..." com ícone de lupa.
- Dois modos de apresentação, grelha de avatares e lista, comutados por dois ícones à esquerda.
- Um controlo de agrupamento à direita que cicla entre **Ungrouped → Organization → Location**, agrupando por atributos do perfil do utilizador, com cabeçalhos em maiúsculas e uma secção "UNSPECIFIED" no fim.
- Sem agrupamento, a lista divide-se em **ONLINE** e **OFFLINE**.
- Cada linha mostra avatar, nome e organização.

Atenção: este agrupamento por organização e localização **não são os User Groups**. É uma vista sobre campos do perfil. Não confundir as duas coisas ao desenhar o separador *Grupos*.

**Para desbloquear:** pedir à PLANKA um ensaio da Pro com conta de administrador, pelo Customer Center ligado no diálogo "About". Enquanto isso não acontecer, o painel de administração desenha-se por analogia com o `UsersPane` deste fork, que partilha o mesmo vocabulário visual, e a Tarefa 0 da checklist fica em aberto.

## 10. Faseamento

**Fase 1 — núcleo.** Secções 3, 4, 5, 6 e 8, mais o painel de administração e o separador *Grupos* no popup do quadro. É o que satisfaz a frase "bundle people into groups and grant a whole group board access at once".

**Fase 2 — grupos em cartões.** Atribuir um grupo a um cartão exige `card_membership` com `user_group_id` e revisão dos fluxos de notificação e de `autoAddBoardMembersToCards`. Decidir depois da fase 1 estar em produção.

**Fase 3 — sincronização com OIDC.** Mapear claims de grupo do fornecedor de identidade para `user_group`. Depende de haver um fornecedor configurado.

## 11. Riscos

- **Adesões órfãs.** O bug que a Pro corrigiu na 2.5.0. Mitigado por todas as escritas passarem pelo reconciliador e pelos testes de 4.1.
- **Blast radius da alteração a `board_membership`.** As duas colunas novas têm valores por omissão que preservam o comportamento atual; nenhum leitor existente precisa de mudar.
- **Despromoção inesperada.** Resolvida pela regra de precedência da secção 4, que deve ser visível na UI ("acesso direto" vs "via grupo").
- **Fuga da composição dos grupos.** Regra explícita na secção 6, com teste dedicado na secção 8.
