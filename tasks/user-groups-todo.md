# Grupos de utilizadores — tarefas de implementação

Estado: planeado; nenhuma tarefa implementada.
Plano e decisões: [user-groups-plan.md](./user-groups-plan.md)

## Tarefa 0 — Observar a UI da Pro na demo

**Estado: bloqueada em 2026-09-17.** A demo corre Pro v2.5.0, a versão certa, mas a conta publicada `engineer1@demo.com` é membro simples, sem administração nem gestão de projeto. Nenhum ecrã de grupos é alcançável. Ver a secção 9.1 do plano para o que foi observado e para a via de desbloqueio.

**Descrição:** percorrer a demo e registar disposição, textos e fluxos dos ecrãs de grupos, antes de escrever componentes.

**Aceitação:**
- [x] Versão da instância confirmada: Pro v2.5.0.
- [x] Changelog integral da 2.5.0 lido e citado no plano.
- [x] Popup de membros do quadro documentado, incluindo o controlo de agrupamento por organização e localização, que **não** são os User Groups.
- [x] Registado o que não foi possível observar e porquê.
- [ ] Capturas de cada estado: lista vazia, lista com grupos, criar, renomear, editar composição, ligar a quadro, escolher papel, remover. **Requer conta de administrador.**
- [ ] Decisões de interação: o que acontece a um membro direto quando o grupo é removido; existe confirmação ao apagar um grupo com quadros ligados; o papel escolhe-se antes ou depois de selecionar o grupo. **Requer conta de administrador.**

**Verificação:** notas no plano; nenhuma alteração de código.

**Desbloqueio:** pedir um ensaio da Pro com conta de administrador pelo Customer Center. Não é bloqueante para as Tarefas 1 a 8, que são de servidor e de estado; é bloqueante apenas para o acabamento visual das Tarefas 9 e 10.

**Dependências:** nenhuma. **Escopo:** pequeno.
**Ficheiros prováveis:** notas em `tasks/`.

## Tarefa 1 — Esquema de base de dados

**Descrição:** criar `user_group`, `user_group_membership` e `board_user_group`, e acrescentar `is_direct` e `granted_by_group_ids` a `board_membership`.

**Aceitação:**
- [ ] Índices conforme a secção 3 do plano, incluindo o índice parcial de unicidade para grupos globais.
- [ ] Linhas existentes de `board_membership` ficam com `is_direct = true` e `granted_by_group_ids = '[]'` sem passo de backfill.
- [ ] `down` remove as três tabelas e as duas colunas.

**Verificação:** migrar e reverter numa base local; confirmar que os quadros existentes continuam a funcionar sem alterações de código.

**Dependências:** nenhuma. **Escopo:** pequeno.
**Ficheiros prováveis:** nova migração em `server/db/migrations/`, `server/api/models/BoardMembership.js`.

## Tarefa 2 — Modelos e query methods

**Descrição:** três modelos Sails novos e os respetivos ficheiros de query methods.

**Aceitação:**
- [ ] `UserGroup`, `UserGroupMembership`, `BoardUserGroup` seguem as convenções de `BoardMembership.js`, incluindo `columnName` e `tableName`.
- [ ] `BoardUserGroup` reutiliza `BoardMembership.Roles` em vez de duplicar a enumeração.
- [ ] Query methods carregados pelo hook sem registo manual.

**Verificação:** arranque do servidor sem avisos do hook `query-methods`; leitura e escrita pela consola.

**Dependências:** 1. **Escopo:** pequeno.
**Ficheiros prováveis:** `server/api/models/`, `server/api/hooks/query-methods/models/`.

## Tarefa 3 — Reconciliador de adesões

**Descrição:** implementar `reconcileBoardMembership`, o único ponto que escreve `board_membership` por causa de grupos.

**Aceitação:**
- [ ] Regra de precedência: direto vence grupo; entre grupos, `editor` vence `viewer`; `canComment` verdadeiro se alguma fonte o permitir.
- [ ] Sem fontes, a linha é apagada pela via existente, com broadcast e webhook.
- [ ] Criação e atualização passam por `boardMemberships.createOne` / `updateOne`, preservando notificações e `autoAddBoardMembersToCards`.
- [ ] Idempotente: correr duas vezes seguidas não produz eventos nem alterações.

**Verificação:** `user-group-reconcile.test.js` cobrindo direto+grupo, dois grupos com papéis diferentes, e remoção de um grupo quando outro ainda concede acesso.

**Dependências:** 2. **Escopo:** médio.
**Ficheiros prováveis:** `server/api/helpers/user-groups/reconcile-board-membership.js`, `server/test/utils/user-group-reconcile.test.js`.

## Checkpoint A — Nenhuma adesão órfã

Antes de expor qualquer API: confirmar com testes que cada linha da tabela 4.1 do plano deixa `board_membership` consistente. É o bug que a Pro corrigiu na 2.5.0 e o principal risco desta funcionalidade.

## Tarefa 4 — API de grupos

**Descrição:** controllers, helpers e rotas para criar, editar, apagar grupos e gerir a composição.

**Aceitação:**
- [ ] Grupos globais só por administrador; grupos de projeto só pelo gestor desse projeto.
- [ ] Adicionar e remover membros dispara a reconciliação em todos os quadros ligados.
- [ ] Apagar um grupo remove as ligações e reconcilia antes de apagar.
- [ ] Nome duplicado no mesmo âmbito devolve conflito, não erro 500.

**Verificação:** `user-group-permissions.test.js`; pedidos diretos à API com utilizadores de cada papel, não apenas verificação pela UI.

**Dependências:** 3. **Escopo:** médio.
**Ficheiros prováveis:** `server/api/controllers/user-groups/`, `server/api/helpers/user-groups/`, `server/config/routes.js`.

## Tarefa 5 — API de ligação a quadros

**Descrição:** ligar, alterar o papel e desligar um grupo de um quadro.

**Aceitação:**
- [ ] Autorização igual à de `board-memberships/create.js`: gestor do projeto do quadro.
- [ ] Ligar um grupo já ligado devolve conflito.
- [ ] Alterar o papel da ligação reconcilia todos os membros.
- [ ] Um projeto não consegue ligar um grupo de outro projeto.

**Verificação:** testes de API por papel; verificar que os sockets entregam `boardMembershipCreate` / `Delete` aos utilizadores afetados.

**Dependências:** 3, 4. **Escopo:** médio.
**Ficheiros prováveis:** `server/api/controllers/board-user-groups/`, `server/api/helpers/user-groups/bind-to-board.js` e `unbind-from-board.js`.

## Tarefa 6 — Cascatas e ciclo de vida

**Descrição:** ligar a reconciliação aos fluxos existentes de apagar quadro, apagar projeto, apagar utilizador e desativar utilizador.

**Aceitação:**
- [ ] Apagar um quadro remove as suas ligações de grupo.
- [ ] Apagar um projeto remove os grupos desse projeto e as respetivas ligações; grupos globais ficam intactos.
- [ ] Apagar ou desativar um utilizador remove-o de todos os grupos e reconcilia.
- [ ] Nenhuma linha órfã em `user_group_membership` ou `board_user_group` após qualquer um destes fluxos.

**Verificação:** `user-group-cascade.test.js`, uma asserção por linha da tabela 4.1.

**Dependências:** 5. **Escopo:** médio.
**Ficheiros prováveis:** helpers de `boards`, `projects` e `users` existentes.

## Tarefa 7 — Payload inicial e visibilidade

**Descrição:** entregar grupos e ligações ao cliente, com a composição restrita a quem gere o grupo.

**Aceitação:**
- [ ] `projects/index.js` inclui `userGroups` e `boardUserGroups`.
- [ ] `userGroupMemberships` só é enviado dos grupos que o utilizador gere.
- [ ] Um membro normal de um quadro recebe nome e contagem do grupo, nunca a lista de pessoas nem os perfis.

**Verificação:** teste que inspeciona o payload de um membro normal e de um gestor, comparando as chaves presentes.

**Dependências:** 4, 5. **Escopo:** pequeno.
**Ficheiros prováveis:** `server/api/controllers/projects/index.js`, helpers de apresentação.

## Checkpoint B — Servidor completo

API, cascatas e visibilidade fechados e testados antes de começar o cliente. A partir daqui a UI é trabalho de apresentação sobre um contrato estável.

## Tarefa 8 — Camada de estado no cliente

**Descrição:** modelos redux-orm, api, actions, entry-actions e saga, seguindo `organization-default-labels`.

**Aceitação:**
- [ ] Modelos registados em `models/index.js`; saga reencaminhada em `sagas/core/watchers/`.
- [ ] Eventos de socket de grupos e de ligações atualizam o estado sem recarregar a página.
- [ ] Recarregar o quadro repõe o mesmo estado que os eventos incrementais produziram.

**Verificação:** hot reload em `http://localhost:3008`, com duas sessões abertas para observar a propagação.

**Dependências:** 7. **Escopo:** médio.
**Ficheiros prováveis:** `client/src/models/`, `client/src/api/`, `client/src/actions/`, `client/src/entry-actions/`, `client/src/sagas/`.

## Tarefa 9 — Painel de administração

**Descrição:** novo separador de grupos no `AdministrationModal`, com lista de grupos e edição da composição.

**Aceitação:**
- [ ] Separador visível apenas a quem pode gerir pelo menos um grupo.
- [ ] Criar, renomear, apagar e editar composição, com pesquisa de utilizadores.
- [ ] Apagar um grupo com quadros ligados pede confirmação e indica quantos quadros perdem o acesso.
- [ ] Estados de vazio, carregamento e erro tratados; textos traduzidos.

**Verificação:** comparação lado a lado com as capturas da Tarefa 0, se existirem. Enquanto a Tarefa 0 estiver bloqueada, desenhar por analogia com o `UsersPane` deste fork e rever depois.

**Dependências:** 8; 0 é desejável, não bloqueante. **Escopo:** grande.
**Ficheiros prováveis:** `client/src/components/common/AdministrationModal/UserGroupsPane/`, `AdministrationModal.jsx`.

## Tarefa 10 — Grupos no quadro

**Descrição:** separadores *Pessoas* e *Grupos* no popup de adicionar membro, e origem do acesso na lista de membros.

**Aceitação:**
- [ ] O separador *Grupos* reutiliza o campo de pesquisa e o `SelectPermissionsStep` existentes.
- [ ] Os grupos ligados aparecem antes dos membros individuais.
- [ ] Um membro cujo acesso venha só de um grupo mostra essa origem e não oferece remoção direta.
- [ ] Um membro com acesso direto e de grupo mostra as duas origens.

**Verificação:** hot reload; cenário manual com um utilizador em dois grupos e com adesão direta.

**Dependências:** 9. **Escopo:** grande.
**Ficheiros prováveis:** `client/src/components/board-memberships/`.

## Tarefa 11 — Traduções e revisão final

**Descrição:** cobrir as línguas mantidas no fork e rever o conjunto.

**Aceitação:**
- [ ] Nenhuma chave em falta nas línguas mantidas.
- [ ] `npm run lint` limpo no cliente e no servidor.
- [ ] Testes do servidor a passar.

**Verificação:** `npm run lint` e `npm run server:test`. Nenhuma migração em produção sem autorização explícita.

**Dependências:** 10. **Escopo:** pequeno.
**Ficheiros prováveis:** `client/src/locales/`.
