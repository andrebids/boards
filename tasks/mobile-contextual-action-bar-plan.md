# Plano de implementação: barras contextuais mobile

## Objetivo

Melhorar a utilização do Planka abaixo de `768px` aproximando do polegar as ações do
contexto atualmente aberto. A barra não é uma navegação global: Chat, Cartão, Projeto e
Criar Projeto usam os controlos que já possuem e mostram no máximo o necessário para a
tarefa corrente.

## Decisões de escopo

- Não adicionar Alertas, Dashboard ou Perfil à barra.
- Não criar um registo global de contextos, provider, reducer ou nova dependência.
- Não duplicar ações: no mobile, o controlo existente muda de posição; no desktop fica
  exatamente onde está.
- Não criar uma ação global “Adicionar cartão”, porque no Kanban a lista de destino é
  necessária e já é escolhida localmente em cada lista.
- Usar `767px` como limite, igual aos componentes existentes.
- Respeitar `env(safe-area-inset-bottom)` e alvos táteis mínimos de `44x44px`.
- Não executar build. Validar pelos serviços de desenvolvimento e hot reload em
  `http://localhost:3008`.

## Contrato visual mínimo

A barra contextual tem uma linha, fundo compatível com a superfície atual, separador
superior, foco visível e espaço para a safe area. Não introduz sombras ou animações novas.
O conteúdo pode variar, mas nunca se transforma num menu “Mais”.

| Contexto | Conteúdo mobile | Reutilização |
| --- | --- | --- |
| Chat | Projeto, Nova conversa, Global; nos subpassos, Voltar e a ação do formulário | `inboxScope`, `handleScopeChange`, `handleNewConversation`, `handleConversationsBack` e os submits atuais |
| Cartão | Conteúdo, Comunicação, Ações | Navegação/scroll para as três áreas já renderizadas; nenhuma nova mutação |
| Projeto | Faixa atual de quadros, Gantt quando ativo e adicionar quadro quando permitido | O próprio `Boards`, `GanttTab` e `AddStep`; a faixa muda do topo para o fundo no mobile |
| Criar Projeto | Tipo e Criar | `SelectTypePopup` e submit atuais; o botão de fechar continua a cancelar |

## Arquitetura

O MVP aplica um contrato visual, não uma abstração React comum. As superfícies têm
estruturas, temas e posicionamento diferentes: Projeto usa uma faixa fixa; Chat e modais
usam uma zona interna sticky. Extrair um componente antes de existirem duas estruturas
realmente iguais acrescentaria variantes e z-index sem reduzir código.

As barras de Chat e Cartão vivem dentro do painel/modal, por isso o overlay já impede a
interação com a barra do Projeto que ficou por baixo. Não é necessário coordenador global
de prioridade.

## Fases e tarefas

### Fase 1: Projeto como primeiro corte vertical

#### Tarefa 1: mover a faixa de quadros para a zona inferior no mobile

**Descrição:** Reposicionar a instância existente de `Boards` abaixo de `768px`. Manter
quadros, Gantt e adicionar quadro exatamente com as permissões e rotas atuais. Reservar
espaço no conteúdo para a faixa não tapar cartões nem ações.

**Critérios de aceitação:**

- Em 320-767px, a faixa fica junto ao fundo e considera a safe area.
- Os mesmos quadros, Gantt e botão de adicionar continuam disponíveis, sem cópia do DOM.
- Em 768px ou mais, posição, drag-and-drop e aparência permanecem inalterados.

**Verificação:**

- Abrir projeto e alternar entre dois quadros em 320px, 390px e 767px.
- Confirmar Gantt quando habilitado e ausência do botão de adicionar sem permissão.
- Confirmar que o último cartão/lista permanece alcançável acima da faixa.
- Executar lint apenas nos ficheiros alterados.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/projects/Project/Project.module.scss`
- `client/src/components/boards/Boards/Boards.module.scss`
- `client/src/components/common/Static/Static.module.scss`

**Escopo estimado:** pequeno, 2-3 ficheiros.

### Checkpoint 1

- Projeto utilizável a uma mão sem regressão no desktop.
- Nenhum popup ou modal fica atrás da faixa.
- Rever visualmente antes de aplicar o padrão às restantes superfícies.

### Fase 2: Chat e criação de projeto

#### Tarefa 2: tornar os controlos atuais do Chat numa barra contextual mobile

**Descrição:** Manter o seletor de âmbito no topo no desktop e apresentá-lo na zona
inferior do painel no mobile, com Nova conversa como ação central. Quando o utilizador
entra na lista de membros ou no formulário de grupo, a zona inferior passa a mostrar
apenas Voltar/Cancelar e a ação correspondente já existente.

**Critérios de aceitação:**

- Projeto, Nova conversa e Global reutilizam o estado e handlers atuais.
- Os subpassos não mostram ações incompatíveis com o estado aberto.
- Fechar continua no cabeçalho e Escape mantém o comportamento atual.
- A barra não cobre pesquisa, lista, formulário ou teclado virtual.

**Verificação:**

- Percorrer chat de projeto, inbox global, nova conversa e criação de grupo.
- Verificar Tab, Enter, Escape, foco visível e labels acessíveis.
- Executar os testes focados de Chat já existentes e lint dos ficheiros alterados.

**Dependências:** Checkpoint 1 apenas para validação visual do padrão.

**Ficheiros prováveis:**

- `client/src/components/chat/ChatPanel/ChatPanel.jsx`
- `client/src/components/chat/ChatPanel/ChatPanel.module.scss`
- `client/src/locales/*/chat.js`, apenas se faltar texto existente reutilizável

**Escopo estimado:** médio, 2-5 ficheiros.

#### Tarefa 3: fixar os controlos existentes de Criar Projeto no fundo do modal mobile

**Descrição:** Agrupar Tipo e Criar numa zona sticky do formulário abaixo de `768px`.
Manter o botão fechar como cancelamento e conservar o layout atual no desktop.

**Critérios de aceitação:**

- Tipo e Criar ficam alcançáveis sem duplicar botões.
- O submit, estado loading, validação do nome e atalho modificador+Enter não mudam.
- A zona não tapa Nome ou Descrição quando o teclado virtual está aberto.

**Verificação:**

- Criar um projeto válido e tentar submeter sem nome.
- Alterar o tipo, fechar sem guardar e confirmar foco/teclado em 320px e 390px.
- Executar lint focado.

**Dependências:** nenhuma técnica; pode seguir a Tarefa 2.

**Ficheiros prováveis:**

- `client/src/components/projects/AddProjectModal/AddProjectModal.jsx`
- `client/src/components/projects/AddProjectModal/AddProjectModal.module.scss`

**Escopo estimado:** pequeno, 2 ficheiros.

### Checkpoint 2

- Chat e criação funcionam com rato, toque e teclado.
- Nenhuma ação existente desapareceu no desktop.
- Safe area e teclado virtual verificados num viewport móvel real ou emulação fiel.

### Fase 3: Cartão

#### Tarefa 4: adicionar navegação interna compacta ao cartão mobile

**Descrição:** Adicionar Conteúdo, Comunicação e Ações na base do modal. Os botões apenas
levam o utilizador às áreas existentes dentro do scroll de `CardModalBody`; não duplicam
os botões da action rail nem alteram dados.

**Critérios de aceitação:**

- As três ações levam à secção correta nos cartões Project e Story.
- O foco não é perdido e o scroll fica dentro do modal, não na página por baixo.
- A barra fica sticky no modal e não cobre comentários ou a última ação.
- Desktop mantém o layout de duas colunas atual.

**Verificação:**

- Testar cartões Project e Story, editáveis e apenas de leitura.
- Navegar entre as três áreas com toque e teclado em 320px, 390px e 767px.
- Confirmar fecho do modal, edição de descrição e envio de comentário.
- Adicionar um teste pequeno para a seleção/target das três áreas se for necessário
  introduzir lógica; CSS puramente responsivo fica coberto por validação browser.

**Dependências:** Checkpoint 2 para reutilizar medidas e comportamento aprovados.

**Ficheiros prováveis:**

- `client/src/components/cards/CardModal/CardModalLayout/CardModalLayout.jsx`
- `client/src/components/cards/CardModal/CardModalLayout/CardModalLayout.module.scss`
- `client/src/components/cards/CardModal/ProjectContent.jsx`
- `client/src/components/cards/CardModal/StoryContent/StoryContent.jsx`

**Escopo estimado:** médio, 4 ficheiros.

### Checkpoint final

- Verificar 320px, 390px, 767px, 768px e 1024px em `http://localhost:3008`.
- Alvos táteis têm pelo menos 44px; ordem de foco segue a ordem visual.
- Conteúdo não fica escondido pela barra ou pela safe area.
- Sem erros novos na consola.
- Jest focado e ESLint focado passam.
- Não executar build, conforme as instruções do projeto.
- Rever o resultado com o utilizador antes de commit, merge ou deploy.

## Comandos de verificação previstos

```powershell
npm test --prefix client -- --runInBand <testes-focados>
npm exec --prefix client -- eslint <ficheiros-js-jsx-alterados>
git diff --check -- <ficheiros-alterados>
```

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Barra tapa conteúdo ou teclado virtual | Preferir `position: sticky` dentro de Chat/modais; reservar padding apenas na faixa fixa do Projeto |
| Duas barras interativas ao mesmo tempo | Montar Chat/Cartão dentro do respetivo overlay; confirmar z-index e pointer events no browser |
| Regressão de desktop | Todas as regras novas ficam dentro do breakpoint existente de 767px |
| Ações sem permissão aparecem | Reutilizar as condições e componentes atuais, sem novo cálculo de permissões |
| Cartão ganha demasiadas ações | A barra contém só três destinos internos; mutações continuam na action rail |

## Fora do MVP

- Alertas, Perfil e Dashboard na barra.
- Personalização da barra pelo utilizador.
- Gestos de swipe, animações novas ou auto-hide.
- Estado global que regista qual barra está ativa.
- Nova ação genérica de criar cartão fora da lista de destino.
- Extração de um componente partilhado antes de existir duplicação real.

