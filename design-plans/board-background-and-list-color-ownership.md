# Organizar fundos do board e cores das colunas sem refatoracao ampla

Written against: 6b762833898445169bcc3ac9d174247a5cb82052

## Evidence chain

- Surface: `/boards/:id`, editor de fundos do projeto e menu `Acoes da Lista > Editar Cor`
- Problem: as responsabilidades de renderizacao estao claras, mas a paleta de colunas continua acoplada por nomes dinamicos entre `ListColors.js`, `styles.module.scss`, `List.jsx` e `server/api/models/List.js`; alem disso, o servidor aceita nomes arbitrarios com dois segmentos que podem nao ter uma classe visual correspondente.
- Design evidence: `--app-board-background` define o canvas sem fundo personalizado; `ProjectBackground` resolve imagens e gradientes; `Project.module.scss` aplica o overlay; `List.module.scss` e os modulos dos cartoes governam as respetivas superficies.
- Owner: `client/src/styles/glass-theme.css`, `client/src/components/projects/ProjectBackground/`, `client/src/components/projects/Project/Project.module.scss`, `client/src/components/lists/List/` e `server/api/models/List.js`.
- Scope and affected surfaces: board Kanban, editor de fundos e seletor de cores de colunas.
- Uncertainty: nenhuma sobre o fluxo atual. A migracao da paleta para um modulo visual dedicado deve ser validada contra previews de projetos, sidebar e rotulos antes de mover classes atualmente partilhadas.

## Design decision

Manter a alteracao atual pequena e documentar os proprietarios existentes. Organizar em etapas independentes: primeiro fixar o comportamento com testes; depois fechar o contrato da paleta de colunas; por ultimo, e apenas quando houver uma alteracao funcional nessa area, retirar as classes de fundos partilhadas do modulo global para um modulo visual dedicado. Nao reorganizar `styles.module.scss` inteiro nem migrar estilos de listas e cartoes fora do seu ciclo normal de manutencao.

## Reuse

- `--app-board-background` para o fundo padrao do canvas.
- `ProjectBackground` para imagens e gradientes ativos.
- `Project.module.scss` para o overlay do conteudo/tabs.
- `List.module.scss` e modulos dos cartoes para superficies locais.
- Exemplar: `client/src/components/projects/ProjectBackground/ProjectBackground.jsx`.

## Changes

1. `client/tests/acceptance/` ou o seam de integracao de UI equivalente
   - Change: adicionar um teste reversivel que escolhe uma cor de coluna, confirma a classe/fundo, recarrega para confirmar persistencia, remove ou restaura a cor e confirma o estado inicial.
   - Preserve: selecao otimista, popup aberto apos escolher uma cor e acao existente de remocao.
   - Verify: uma cor solida e um gradiente devem passar pelo mesmo fluxo.

2. `client/src/constants/ListColors.js`, `client/src/components/lists/List/EditColorStep.jsx`, `client/src/components/lists/List/List.jsx` e `server/api/models/List.js`
   - Change: tornar a lista enumerada o contrato autoritativo das cores suportadas; remover a aceitacao generica de qualquer valor `nome-cor` no servidor, ou introduzir um contrato explicito para cores livres antes de as aceitar.
   - Preserve: os 45 valores atuais, a sua ordem, nomes persistidos e aparencia.
   - Verify: cada valor do cliente existe na whitelist do servidor e resolve uma classe visual; valores desconhecidos sao rejeitados.

3. `client/src/styles.module.scss` e um modulo dedicado de paleta, apenas numa alteracao futura que ja toque nessa area
   - Change: mover somente as classes de fundos consumidas dinamicamente por projetos e listas para um modulo dedicado, mantendo nomes e valores; atualizar os imports dos consumidores comprovados.
   - Preserve: previews de projeto, gradientes, padroes, cores das colunas e contraste de texto claro/escuro.
   - Verify: nenhum consumidor de `background${...}` fica sem classe e nenhuma regra global nao relacionada e movida.

4. `client/src/styles/glass-theme.css`, `client/src/styles.module.scss`, `client/src/components/projects/ProjectBackground/ProjectBackground.jsx` e `client/src/components/projects/Project/Project.module.scss`
   - Change: adicionar comentarios curtos de ownership junto aos quatro limites ja aceites, sem criar novos tokens ou wrappers.
   - Preserve: o fundo padrao aparece apenas quando `backgroundType` nao seleciona imagem ou gradiente; o overlay permanece local ao projeto.
   - Verify: selecionar e desselecionar imagem/gradiente revela novamente `--app-board-background`.

## Scope

- Inherit: boards Kanban e previews que importem a mesma paleta visual.
- Verify: cards de projeto, itens da sidebar e qualquer consumidor encontrado por `rg "globalStyles\\[.*background|background\\$\\{" client/src`.
- Exclude: reorganizacao geral de CSS, novos tokens de tema, alteracoes visuais de listas/cartoes, editor de upload e validacao de imagens/gradientes.

## Validation

- Product: escolher cor de coluna, recarregar, remover/restaurar; escolher gradiente e imagem de projeto, clicar novamente e confirmar o fundo padrao.
- Interface: `/boards/:id`, menu de acoes da primeira e ultima coluna, cores claras, escuras, gradientes e viewport pequeno com scroll horizontal.
- System: confirmar que o canvas, `ProjectBackground`, overlay e superficies locais continuam com um unico proprietario cada.
- Repository: `cd client && npx eslint src/components/lists/List/EditColorStep.jsx src/components/lists/List/ActionsStep.jsx src/components/lists/List/List.jsx --report-unused-disable-directives` -> zero erros.
- Repository: comparar programaticamente `ListColors.js`, `List.COLORS` e as classes `background${upperFirst(camelCase(color))}` -> mesmas 45 entradas, sem ausencias.
- Repository: nao executar build; validar pelo hot reload conforme `AGENTS.md`.

## Stop conditions

- Stop if mover uma classe de fundo exigir alterar consumidores fora de projetos, listas ou previews comprovados.
- Stop if a equipa pretender suportar cores livres (hex, rgb ou token customizado); isso exige modelo de dados, validacao, contraste e UI proprios, nao apenas relaxar a regex.
- Stop if a etapa alterar a aparencia atual; separar essa mudanca num plano visual proprio.

## Design documentation

- After acceptance and validation: registar no `DESIGN.md` futuro, se vier a existir, apenas os quatro proprietarios aceites e o contrato enumerado da paleta; nao documentar a localizacao temporaria das classes globais como decisao permanente.
