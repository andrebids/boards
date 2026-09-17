# Visão transversal — implementação e validação

Data: 2026-09-17. Estado: implementada e validada localmente por hot reload em http://localhost:3008. Sem build, commit, push ou publicação.

Plano: [transversal-view-plan.md](./transversal-view-plan.md).

## Entregue

- [x] Configuração persistida por projeto, desativada por defeito, com modos disabled, all e selected.
- [x] Gestores configuram em **Definições do projeto → Geral → Todos os quadros**; seleção reutiliza os membros elegíveis existentes.
- [x] Nova aba condicional e módulo carregado apenas ao abrir a rota /projects/:id/transversal.
- [x] Kanban com todas as etapas por defeito; listas agrupadas pelo nome, ignorando caixa e espaços repetidos. Não cria listas físicas nem templates.
- [x] Filtros opcionais por quadro/etapa na URL; origem, membros e prazo em cada cartão.
- [x] Abertura do cartão original pela rota existente; voltar no navegador preserva filtros.
- [x] Autorização no servidor em cada pedido, incluindo seleção de pessoas e política existente de leitura por quadro.
- [x] Arquivo/lixo excluídos; filtros proibidos recusados, sem alargar resultados.
- [x] Páginas de 50 por coluna, cursor por ID e hidratação de membros apenas da página; carregamento quando a coluna fica visível.
- [x] Atualização manual/ao recuperar foco, descarte de respostas de vistas desmontadas, limpeza após recusa de acesso.
- [x] Textos em português, inglês, francês e espanhol; disposição adaptada a ecrãs estreitos.

## Evidência automatizada

- **Mocha: 9 testes passaram** em server/test/utils/transversal-view.test.js: agrupamento, modos, isolamento por quadro, revogação, administrador em projeto privado, gestor fora da seleção, filtros e consulta paginada.
- **Jest: 2 testes passaram** em client/src/components/transversal/access.test.js: visibilidade por utilizador e classificação de erros de acesso.
- **API real local:** server/test/manual/transversal-view-smoke.cjs passou com utilizadores/projeto descartáveis e credenciais aleatórias apenas em memória. Exercitou autenticação, gestão exclusiva, modos, opções/cartões de quadros autorizados, arquivo, paginação 50+2 sem duplicados, membros, renomeação/remoção de listas, movimento de cartão e revogação de associação ao projeto.
- **Migração:** aplicada apenas 20260917000000_add_project_transversal_view.js no servidor local. Defaults e reversão verificados numa tabela temporária isolada.
- **Lint:** ficheiros novos de cliente/servidor verificados. O cliente tem um conflito preexistente de descoberta de plugins entre configurações pai/filha; a verificação usou a configuração existente de client/package.json explicitamente através da API ESLint.

Comandos principais (dentro dos respetivos contentores de desenvolvimento):

    ./node_modules/.bin/mocha test/utils/transversal-view.test.js
    npm test -- --runInBand --watch=false src/components/transversal/access.test.js
    TRANSVERSAL_SMOKE=local node test/manual/transversal-view-smoke.cjs

O script recusa execução sem opt-in local. --keep permite verificação no navegador; --cleanup remove só os IDs registados. As fixtures desta entrega foram removidas.

## Navegador autenticado

- [x] Aba ausente por defeito; ativação para Admin User selecionado nas definições mostra a aba.
- [x] Gravação dá feedback; configuração e filtro persistem após recarregar.
- [x] Três colunas agregam Manchester, Barcarès e Privado para o gestor autorizado de um projeto descartável.
- [x] Filtro LOGISTIQUE e “Carregar mais” apresentam a segunda página.
- [x] Filtro Barcarès apresenta apenas os três cartões desse quadro.
- [x] Cartão de quadro ainda não carregado abre com o conteúdo original; voltar recupera a vista filtrada.
- [x] Desativação remove a aba e limpa os resultados, apresentando indisponibilidade.
- [x] Inspeção visual em desktop e viewport 390×844; filtros/cartões legíveis e colunas com scroll horizontal.
- [x] Regresso à página inicial após limpeza, sem projeto temporário.

## Limites da validação

- Não foi feita uma auditoria completa de teclado/leitor de ecrã, nem teste end-to-end de novo login numa ligação direta; os controlos têm nomes acessíveis e a rota foi integrada no fluxo de login existente.
- Não foi executada a suíte completa de regressão de Gantt/Dashboard, nem teste de carga/EXPLAIN com volumes de produção. A paginação e a ordem de filtragem foram verificadas com fixtures locais.
- Não existe teste automatizado de concorrência de pedidos no componente React; a implementação ignora respostas após desmontagem e invalida dados por projeto, utilizador, configuração e quadro.
- Revogação é verificada a cada pedido; uma página já apresentada revalida ao atualizar/recuperar foco. Não há promessa de limpeza visual instantânea sem novo pedido.
- É uma implementação própria no estilo do Planka. A documentação pública da Pro não confirma este agrupamento Kanban por nome nem esta configuração por pessoas.
- Produção, commit e push não fazem parte desta entrega. As alterações locais de outras tarefas foram preservadas.
