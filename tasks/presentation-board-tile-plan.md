# Plano de implementação: cartão de apresentação no quadro

## Objetivo

Dar visibilidade imediata à apresentação associada a cada quadro, sem a transformar numa lista Kanban nem remover a rota **Apresentações**. No modo Kanban, o quadro passa a ter um cartão não-arrastável na mesma faixa horizontal das listas. O cartão mostra uma capa, o título e abre diretamente `/presentation?board=<boardId>`.

## Decisões confirmadas

- O produto já tem uma apresentação por quadro (`ProjectPresentation.boardId` é único); não haverá uma segunda coleção nem alteração de modelo/rotas para a primeira entrega.
- O cartão não participa no `Droppable` nem no ordenamento de listas. É uma peça de navegação, não uma lista vazia.
- A rota Apresentações mantém-se como espaço de edição e alternativa de navegação. O novo cartão reduz passos para abrir a apresentação no contexto do quadro.
- A primeira implementação não carrega o iframe/OnlyOffice para produzir a imagem. Isto impediria que uma miniatura tornasse o quadro lento.
- A apresentação está hoje guardada como PPTX e não tem miniatura persistida. Uma capa que corresponda ao slide atual exige um pipeline explícito de conversão/armazenamento; não será inferida a partir do iframe de outro origin.

## Escopo da primeira entrega

- Só a vista Kanban recebe o cartão. Grid e lista ficam inalterados.
- O cartão aparece quando existe uma apresentação ativada para o quadro atual.
- Sem miniatura real, usa uma capa de produto estável (ícone de apresentação, título e tratamento visual), sem fingir que é um slide.
- Clique/teclado abre a rota de apresentação já filtrada para o quadro. Não há edição, criação nem desativação dentro do cartão.

## Trabalho posterior, deliberadamente separado

Uma miniatura do primeiro slide pode ser adicionada depois, mas será uma segunda entrega: converter o PPTX depois de um autosave, guardar a imagem no diretório já isolado da apresentação, expor uma URL autorizada e invalidá-la quando uma nova versão for gravada. Só avançar depois de confirmar onde a conversão corre (servidor ou serviço OnlyOffice), os limites de tempo e o comportamento quando a conversão falha.

## Dependências observadas

```text
ProjectPresentationProvider (carrega as apresentações do projeto)
        |
        +-- PresentationContext (estado por boardId)
        |       |
        |       +-- novo PresentationBoardTile (metadados e navegação)
        |
        +-- KanbanContent (faixa horizontal)
                |
                +-- Droppable de listas existente, sem alteração do contrato DnD
```

## Fase 1 — confirmar o encaixe e extrair a projeção mínima

### Tarefa 1: selecionar a apresentação do quadro atual

**Descrição:** Criar uma pequena projeção cliente que recebe o `boardId` atual e devolve apenas a apresentação ativada correspondente. Reutilizar `usePresentation`, carregado uma vez pelo provider do projeto; não criar pedido HTTP adicional nem estado Redux paralelo.

**Critérios de aceitação:**

- [ ] Um quadro com apresentação ativada devolve o respetivo registo.
- [ ] Um quadro sem apresentação, ou com apresentação desativada, não cria cartão.
- [ ] Uma atualização socket já tratada pelo `PresentationContext` atual reflete-se no cartão sem recarregar o quadro.

**Verificação:** teste unitário puro da projeção/estado e inspeção no hot reload.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/presentation/presentationBoardTileState.js` (novo, apenas se a projeção não couber claramente no componente)
- `client/src/components/presentation/presentationBoardTileState.test.js` (novo, se o módulo for extraído)
- `client/src/components/presentation/PresentationContext.jsx` (apenas se for necessário expor uma função já derivável)

**Escopo:** pequeno.

### Tarefa 2: introduzir o cartão fora do contexto de drag-and-drop

**Descrição:** Criar `PresentationBoardTile` e encaixá-lo na faixa visual de `KanbanContent`, antes das listas. Separar o contentor visual do elemento `Droppable`, para que o tile não altere índices, placeholders ou movimento de listas da `@hello-pangea/dnd`.

**Critérios de aceitação:**

- [ ] O cartão é apresentado antes da primeira lista apenas em Kanban e apenas quando há apresentação ativada.
- [ ] Arrastar/reordenar listas continua a usar os mesmos índices e o botão “Adicionar outra lista” mantém-se no fim.
- [ ] O cartão não pode receber cards nem ser arrastado como lista.

**Verificação:** teste manual: criar/mover uma lista, mover um card, abrir/fechar o cartão e confirmar que o placeholder DnD permanece correto.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationBoardTile.jsx` (novo)
- `client/src/components/presentation/PresentationBoardTile.module.scss` (novo)
- `client/src/components/boards/Board/KanbanContent/KanbanContent.jsx`
- `client/src/components/boards/Board/KanbanContent/KanbanContent.module.scss`

**Escopo:** médio.

### Checkpoint 1

- [ ] Um quadro sem apresentação permanece visual e funcionalmente igual.
- [ ] Listas e cartões são reordenáveis como antes.
- [ ] O cartão não provoca carregamento do iframe de apresentação.

## Fase 2 — navegação, capa de fallback e acessibilidade

### Tarefa 3: ligar à apresentação do quadro e definir os estados visuais

**Descrição:** Usar o helper existente `makePathWithPresentationBoard` para gerar o link. O cartão terá uma capa 16:9 de fallback, título, sinalização “Apresentação” e estados hover/focus/teclado; será um link semântico, não um `div` clicável.

**Critérios de aceitação:**

- [ ] Clique, Enter e controlo de teclado abrem `Paths.PRESENTATION` com o `board` correto.
- [ ] O foco é visível e a capa decorativa não acrescenta ruído ao leitor de ecrã.
- [ ] A largura aproxima-se da lista existente, sem cortar título nem criar scroll vertical inesperado em desktop ou mobile.

**Verificação:** hot reload em `http://localhost:3008`, navegação para dois quadros distintos e inspeção de foco por teclado.

**Dependências:** tarefa 2.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationBoardTile.jsx`
- `client/src/components/presentation/PresentationBoardTile.module.scss`
- `client/src/components/presentation/presentationNavigation.js` (reutilização; só alterar se faltar um helper)
- ficheiros de tradução `client/src/locales/*/common.js` (apenas para texto novo)

**Escopo:** pequeno-médio.

### Tarefa 4: validação focada de regressões

**Descrição:** Cobrir a lógica nova com testes pequenos e validar visualmente o fluxo real com dados de quadro: sem apresentação, com apresentação ativada, permissão de visualização e manipulação normal das listas.

**Critérios de aceitação:**

- [ ] Testes novos passam e os testes de estado/navegação de apresentações continuam a passar.
- [ ] Não existem erros de DnD ao alterar a ordem das listas.
- [ ] Não há build local: o projeto usa hot reload, conforme `AGENTS.md`.

**Verificação:** suites cliente focadas e smoke test manual no ambiente de desenvolvimento.

**Dependências:** tarefa 3.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationBoardTile.test.jsx` (novo, se a configuração JSX atual o suportar)
- `client/src/components/presentation/presentationBoardTileState.test.js`

**Escopo:** pequeno.

### Checkpoint final

- [ ] Um utilizador identifica a apresentação sem sair do quadro.
- [ ] Abrir o cartão preserva o quadro correto através de `?board=`.
- [ ] O comportamento, permissões e performance das listas existentes não regressaram.
- [ ] Revisão humana da cobertura de fallback antes de planear miniaturas de slide reais.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| O tile ser tratado como filho DnD | Alto | Mantê-lo fora do elemento `Droppable`; só as listas e placeholder são filhos desse contexto. |
| Miniatura real iniciar vários editores | Alto | Não usar iframe como fonte da capa; adiar conversão para uma entrega com infraestrutura validada. |
| Consumir demasiado espaço no Kanban | Médio | Mesma largura aproximada de uma lista, apenas um tile por quadro, comportamento horizontal existente. |
| Usuário sem direito de edição | Baixo | O cartão apenas navega; a rota existente mantém as suas regras de acesso/modo view. |
| Cobertura automática JSX bloqueada pela configuração atual | Médio | Testar o módulo puro e reportar a limitação; validar o fluxo real via hot reload. |

## Decisão necessária antes de implementar

Recomendação: avançar primeiro com a capa de fallback descrita acima e validar se a descoberta no quadro resolve a necessidade. Se a imagem tiver obrigatoriamente de ser o slide atual desde o primeiro lançamento, é necessário aprovar a entrega adicional de conversão e armazenamento de miniaturas antes de começar, porque ela altera servidor, volume de anexos e ciclo de autosave.
