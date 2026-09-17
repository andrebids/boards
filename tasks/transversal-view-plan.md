# Plano: visão transversal por etapa no Planka

Data: 2026-09-17  
Estado: implementada localmente; validação detalhada em `transversal-view-todo.md`. Sem publicação em produção.  
Repositório: `D:\Projetos\planka-personalizado`  
Checklist: [transversal-view-todo.md](./transversal-view-todo.md)

## 1. Objetivo e âmbito

Permitir que o cliente abra a aba “Todos os quadros” e consulte os cartões dos vários quadros de um projeto em colunas Kanban agrupadas automaticamente pelo nome das listas. Pode filtrar uma etapa, como LOGISTIQUE ou PRODUCTION, ou consultar todas. Os cartões continuam no quadro e na lista originais; a nova vista não cria cópias.

Revisão aprovada pelo utilizador antes da implementação: substituir a tabela e seleção inicial obrigatória de etapa por colunas Kanban automáticas. Criam-se listas apenas nos quadros originais, pelo fluxo habitual. Não existe um novo processo de criação de colunas nem criação simultânea de listas em todos os quadros.

A imagem fornecida apresenta separadores de quadros que o cliente chama projetos. Esta versão agrega quadros pertencentes ao mesmo projeto do Planka. Agregação entre projetos diferentes fica fora desta versão.

Trata-se de uma vista de consulta, não de um template. Templates de quadros e vistas guardadas com nomes são funcionalidades distintas e não são necessários para satisfazer o pedido inicial.

## 2. Relação com a versão Pro: confirmado e não confirmado

Verificação documental realizada em 2026-09-17, em fontes oficiais:

| Evidência | O que permite afirmar |
| --- | --- |
| [Changelog Pro 2.5.0, publicado em 2026-09-06](https://planka.app/changelog) | Existem vistas de calendário, mapa, timeline e media que abrangem todos os quadros de um projeto e respeitam a visibilidade de cada quadro. |
| [Funcionalidades Pro](https://planka.app/pro) | O produto anuncia pesquisa global em projetos, quadros e cartões. |
| [Community or Pro](https://docs.planka.cloud/docs/community-or-pro/) | A oferta Pro inclui um dashboard que abrange projetos. |

O changelog identifica o home/dashboard como Alpha. Os filtros guardados aí descritos são pessoais e por quadro. A referência a juntar listas vizinhas com o mesmo nome e tipo não comprova agregação de listas entre quadros.

**Não está confirmado na documentação consultada:** uma vista exatamente igual à proposta, que agrupe listas equivalentes pelo nome entre quadros e permita ativação por projeto para utilizadores selecionados.

**Não foi efetuado teste funcional numa instância Pro.** A existência das funcionalidades oficiais não valida a nossa implementação personalizada. A formulação correta para o cliente é: a Pro já oferece vistas transversais; a solução específica aqui proposta é desenvolvimento próprio e terá validação própria. Para afirmar equivalência com a Pro, seria necessário reproduzir o cenário numa demo ou obter confirmação do fabricante.

Este plano não inclui instalar ou migrar para a Pro, nem reutilizar código Pro.

## 3. Experiência prevista

Nova aba “Todos os quadros” junto dos quadros, visível apenas quando o utilizador puder usar a funcionalidade.

```text
Manchester | Barcarès | Todos os quadros

Quadro: [Todos v]    Etapa: [Todas v]    [Atualizar]

PRODUCTION               LOGISTIQUE              INSTALLATION
Cartão A                 Preparar transporte     Cartão E
Manchester               Manchester              Barcarès

Cartão B                 Confirmar entrega
Barcarès                 Barcarès
```

- Mostrar todas as etapas automaticamente; filtros opcionais por um quadro ou uma etapa. O filtro por responsável fica fora desta versão simplificada.
- Mostrar título do cartão, quadro de origem, membros atribuídos ao cartão e prazo. O cabeçalho da coluna identifica a etapa/lista agregada.
- Abrir o cartão pela rota existente `/cards/:id`, com os controlos de edição habituais e respetivas permissões.
- Preservar os filtros na URL para voltar à vista. Partilhar o endereço nunca concede acesso.
- Reutilizar componentes, tokens, botões e estilos existentes. Usar colunas Kanban com scroll horizontal e cartões legíveis em ecrãs pequenos.
- Prever carregamento, lista vazia, erro recuperável, etapa que deixou de existir e acesso indisponível; navegação por teclado e textos traduzidos.
- Primeira entrada: apresentar as colunas existentes. Carregar cartões apenas quando uma coluna entra na área visível, até 50 por página e com botão “Carregar mais”.

## 4. Ativação e permissões

Adicionar uma secção nas definições gerais do projeto, configurável pelos gestores do projeto, em coerência com a autorização atual das definições gerais. Não alargar permissões globais de administradores ou membros como efeito secundário.

| Modo | Resultado |
| --- | --- |
| Desativada | Não aparece a aba; a API recusa consultas. É o valor inicial de todos os projetos. |
| Todos os membros | Utilizadores com acesso atual ao projeto podem consultar a vista. |
| Utilizadores selecionados | Apenas os selecionados, desde que ainda tenham acesso ao projeto. Lista vazia não autoriza ninguém. |

Regras obrigatórias:

1. O servidor verifica autenticação, acesso ao projeto, modo de ativação e acesso a cada quadro antes de consultar cartões.
2. Aplicar a política atual de leitura de quadros, incluindo gestores e exceções existentes para administradores/projetos privados; não copiar apenas a autorização de projeto usada pelo Gantt.
3. A mesma restrição vale para nomes de etapas, opções de quadros, cartões e metadados.
4. IDs recebidos nos filtros são validados no âmbito do projeto e dos quadros autorizados. IDs inválidos ou proibidos nunca devem transformar um filtro restrito numa consulta sem filtro.
5. Guardar a configuração exige permissão de gestão. Seleções de utilizadores têm de pertencer ao projeto e estar ativas.
6. Poder configurar não implica contornar a seleção de utilizadores para consultar. Um gestor pode incluir-se explicitamente quando necessário.
7. A API revalida as permissões em cada pedido. Quando a UI recebe revogação ou resposta de acesso recusado, limpa os resultados e bloqueia novas consultas.

Uma página já apresentada não pode apagar dados que o utilizador viu antes da revogação. Sem notificações de revogação em tempo real, a limpeza ocorre na próxima revalidação; não prometer revogação visual instantânea.

## 5. Etapas e dados apresentados

- Derivar as etapas dos nomes das listas dos quadros autorizados.
- Usar uma normalização determinística: aparar espaços nas extremidades, reduzir espaços consecutivos e ignorar maiúsculas/minúsculas. Garantir o mesmo critério nas opções e na consulta.
- Não traduzir, remover acentos ou aproximar nomes: LOGISTIQUE e LOGISTIC continuam etapas distintas.
- Incluir listas normais e fechadas; excluir arquivo e lixo nesta versão.
- Se houver várias listas equivalentes no mesmo quadro, incluir os cartões de todas, sem duplicar cada cartão.
- Listas renomeadas ou eliminadas refletem-se na próxima atualização. Uma etapa inexistente gera um estado vazio compreensível, não uma consulta a todos os cartões.
- Novos quadros/listas autorizados com a mesma etapa entram na agregação após atualização.

Se o cliente usar nomes diferentes para a mesma etapa, começar por confirmar a convenção com ele. Um mapa explícito de equivalências pode ser uma evolução posterior; não alterar automaticamente nomes ou dados existentes.

## 6. Arquitetura e isolamento

### Configuração persistida

Proposta mínima: adicionar ao projeto um modo `disabled | all | selected` e uma lista de IDs de utilizadores selecionados, com valores iniciais `disabled` e `[]`. Usar tipos de coluna e convenções compatíveis com as migrações existentes, validados no servidor. Não gravar cartões, resultados ou etapas derivadas nesta configuração.

Integrar os campos no modelo, validação e fluxo atual de atualização do projeto. Validar também o que é serializado e enviado por eventos: a lista de destinatários não deve expor perfis de utilizadores; a UI de consulta precisa apenas da capacidade efetiva de acesso.

### API

Rotas propostas:

- `GET /api/projects/:projectId/transversal/options`: etapas e opções dos filtros, limitadas ao acesso atual.
- `GET /api/projects/:projectId/transversal/cards`: etapa obrigatória por pedido de coluna, quadro opcional e paginação.
- Configuração através do fluxo existente de atualização do projeto, com validação dos novos campos.

A consulta de cartões aplica filtros e limite no servidor, antes de carregar relações. Cada coluna usa páginas de 50 resultados, ordenação estável por ID e cursor por ID; não se calcula um total global nem se oferecem ordenações adicionais nesta versão. Devolver só os dados necessários à vista, sem anexos, comentários, descrições completas ou todas as tarefas dos quadros.

Centralizar o contexto autorizado para que as duas rotas usem a mesma política. Consultas em lote e parametrizadas; nenhum pedido completo a cada quadro nem carregamento de todos os cartões para filtrar no navegador. Validar índices e plano da consulta no ambiente local representativo; acrescentar índices apenas se necessário.

### Frontend

- Rota proposta: `/projects/:id/transversal`.
- Módulo próprio em `client/src/components/transversal/`, carregado com `React.lazy`, `Suspense` e tratamento local de erros.
- API cliente própria e resultados guardados no estado local da vista. Evitar inserir resumos incompletos no estado global dos cartões.
- Ao abrir um cartão, aproveitar o carregamento pela rota existente, incluindo cartões de quadros ainda não carregados.
- Filtros na URL; mudanças de filtro reiniciam a paginação. Cancelar ou ignorar respostas antigas para não misturar projetos, filtros ou permissões.
- Atualizar ao entrar, regressar à janela/separador e carregar em “Atualizar”. Não adicionar polling ou novas subscrições globais de cartões nesta versão.

### Integrações já identificadas no código

| Área | Ficheiros/pontos de referência |
| --- | --- |
| Configuração | `server/api/models/Project.js`, `server/api/controllers/projects/update.js`, `server/api/helpers/projects/update-one.js`, `client/src/models/Project.js` |
| Seletor de membros | `server/api/controllers/projects/card-member-options.js` e `CardMembersSection.jsx` como padrões de referência |
| Permissões de leitura | `server/api/controllers/boards/show.js`, `server/api/controllers/cards/index.js`, `server/api/helpers/projects/make-scoper.js` |
| Consulta agregada existente | `server/api/controllers/gantt-plans/source-tasks.js`; apenas referência de relações, não copiar a autorização nem o carregamento integral |
| Aba | `client/src/components/boards/Boards/Boards.jsx` |
| Rotas e autenticação | `Paths.js`, `Root.jsx`, `selectors/router.js`, sagas de router em `core` e `login` |
| Conteúdo e redirecionamento | `Static.jsx`, `projects/Project/Project.jsx`; impedir redirecionamento da nova rota para o primeiro quadro |
| Estilo de isolamento | Implementação atual do Dashboard com carregamento diferido e limite de erros local |

Isolamento é modular e funcional, não uma aplicação separada: continua a partilhar autenticação, base de dados e navegação. Não prometer impacto zero. Testar as integrações com quadros, Gantt e Dashboard.

## 7. Ordem de execução

As tarefas detalhadas e verificações estão em [transversal-view-todo.md](./transversal-view-todo.md).

1. Migração e persistência desativada por defeito.
2. Política de acesso e validação da configuração.
3. Controlos nas definições e propagação da configuração.
4. Consulta de etapas e opções autorizadas.
5. Consulta paginada de cartões.
6. Rota e aba isoladas, incluindo autenticação e redirecionamentos.
7. Interface de consulta e navegação para o cartão original.
8. Validação integrada de permissões, comportamento e regressões.

Executar testes focados em cada etapa. Uma falha de isolamento de dados impede avançar para disponibilização ao cliente.

## 8. Critérios de aceitação finais

- [x] Projetos existentes começam desativados e mantêm o comportamento atual.
- [x] Um gestor ativa a vista apenas para o cliente escolhido e a configuração persiste após recarregar.
- [x] Utilizador não selecionado não vê a aba e não consegue consultar diretamente a API.
- [x] Dois utilizadores com quadros diferentes veem apenas as etapas, cartões e opções que lhes pertencem por permissão.
- [x] Agrupamento por nome funciona com diferenças de caixa/espaços, sem fundir nomes distintos.
- [x] Paginação e filtros não geram duplicados em dados estáveis nem expõem cartões não autorizados.
- [x] Abrir um cartão ainda não carregado funciona; regressar no navegador restaura os filtros.
- [x] Mover cartões, renomear ou eliminar listas originais reflete-se no próximo pedido.
- [x] Desativar ou revogar acesso bloqueia pedidos posteriores; a UI limpa dados quando revalida.
- [ ] Desktop e mobile apresentam conteúdo legível; filtros e ações funcionam por teclado.
- [ ] Navegação direta, login, recarregamento e regresso aos quadros/Gantt/Dashboard não apresentam regressões.
- [x] Evidência distingue testes unitários, testes de API e navegação autenticada, com limitações registadas no checklist.

Os dois critérios ainda abertos correspondem a validação completa de teclado e regressão alargada/login. A inspeção desktop/mobile e o recarregamento autenticado passaram; os restantes cenários não foram verificados integralmente.

## 9. Validação e publicação

Usar Jest no cliente e Mocha no servidor, apenas nos testes relevantes. Para testes de integração, aproveitar o lifecycle e a base de testes existentes; não apontar fixtures destrutivas à base de desenvolvimento do cliente ou à produção.

Validar a interface através dos serviços de desenvolvimento em `http://localhost:3008`, por hot reload. Não executar build para testar alterações locais. A migração deve ser validada no ambiente local/de testes durante a implementação, incluindo defaults e reversão, antes de qualquer publicação.

O utilizador autorizou a implementação local depois de aprovar a apresentação Kanban. Foi aplicada apenas a nova migração no servidor de desenvolvimento. Não foram executados build, commit, push ou operações em produção. Uma futura publicação exige autorização própria e identificação do impacto da migração e de eventuais reinícios. O desligar da funcionalidade é o primeiro mecanismo de reversão funcional; não apaga cartões nem exige remover colunas.

## 10. Fora do âmbito inicial

- Vista global entre projetos diferentes.
- Templates de quadros ou cartões.
- Vistas nomeadas guardadas no servidor.
- Sinónimos/tradução automática de etapas.
- Filtro por responsável e seleção simultânea de vários quadros.
- Criação de listas comuns numa só ação em todos os quadros.
- Arrastar, criar ou editar cartões diretamente na vista.
- Duplicação, cartões espelhados e novos motores de sincronização em tempo real.
- Refactor de Gantt, Dashboard ou permissões gerais.

## 11. Preservação de trabalho existente

Os ficheiros `tasks/plan.md` e `tasks/todo.md` contêm um plano Gantt pendente e permaneceram intactos. Este plano usa nomes separados conforme o pedido do utilizador. As alterações locais de outras tarefas, incluindo Dashboard, bridge Claude, página inicial e filtros guardados, foram preservadas. Não foi feito staging.
