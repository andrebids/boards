# Plano de implementação — Gantt opcional por projeto, interativo e com zoom temporal

**Data da análise:** 13/08/2026  
**Estado:** Proposta técnica e especificação UI/UX  
**Âmbito:** Módulo Gantt ativado apenas nos projetos selecionados, sem dependência de cartões ou quadros

## 1. Resumo executivo

O Gantt deve ser uma funcionalidade opcional de cada projeto Planka. Nem todos os projetos terão
Gantt: o gestor ativa a funcionalidade nas definições do projeto e só então aparece a entrada
“Gantt” na navegação desse projeto.

Cada Gantt terá as suas próprias linhas e manterá os campos do ficheiro de referência:

- Pessoa
- Tarefa
- Projeto
- Início
- Fim
- Estado
- Duração esperada

Nesta primeira versão:

- `Pessoa` é selecionada entre os membros do projeto onde o Gantt foi aberto;
- `Projeto` continua a ser um valor textual da linha, útil como área, subprojeto ou categoria;
- `Estado` é um valor próprio do Gantt;
- as tarefas Gantt não são cartões e não dependem de quadros ou listas.

A recomendação é **não construir o motor temporal de raiz**. Deve ser usada uma biblioteca open
source para renderização da timeline, drag, resize, escalas e virtualização, mantendo no projeto:

- o modelo de dados;
- as APIs e permissões;
- as regras de duração;
- a gestão de estado e atualizações em tempo real;
- os filtros, toolbar e formulários;
- a adaptação visual ao Planka;
- um adaptador que impeça dependência direta da aplicação em relação à biblioteca.

### Decisão recomendada

Usar **SVAR React Gantt Community**, atualmente MIT, através do pacote
`@svar-ui/react-gantt`, fixado inicialmente na versão validada pelo protótipo. O componente suporta
React 18+, drag e resize de tarefas, colunas personalizadas, escalas configuráveis, zoom e
virtualização.

Se o protótipo revelar limitações incontornáveis na edição ou personalização visual, a alternativa
é integrar **Frappe Gantt** com uma grelha própria. Construir toda a timeline de raiz é o último
recurso.

---

## 2. Objetivos funcionais

### 2.1 Ativação opcional por projeto

Cada projeto pode ter zero ou um plano Gantt ativo.

- O Gantt é ativado nas definições do projeto por um gestor ou administrador.
- Ativar cria o `GanttPlan` associado ao projeto.
- Desativar apenas oculta o Gantt e mantém os dados para reativação posterior.
- Eliminar definitivamente o plano é uma ação separada, com confirmação explícita.
- A rota é `/projects/:id/gantt`.
- A navegação só mostra “Gantt” quando o plano está ativo.

O Gantt usa as permissões e membros do projeto, mas mantém tarefas próprias.

### 2.2 Campos por tarefa

| Campo | Tipo | Obrigatório | Comportamento |
| --- | --- | --- | --- |
| Pessoa | Membro(s) do projeto | Não | Seleção de uma ou mais pessoas com acesso ao projeto |
| Tarefa | Texto | Sim | Título principal da linha |
| Projeto | Texto | Não | Categoria textual; não está ligada a `Project` |
| Início | Data | Não | Início planeado da barra |
| Fim | Data | Não | Fim planeado da barra |
| Estado | Texto | Não | Valor textual com cor e autocomplete |
| Duração esperada | Dias | Sim | Número inteiro de dias, mínimo 1 |
| Cor | Cor | Não | Cor explícita; se vazia, deriva do estado ou da pessoa |
| Posição | Número | Sim | Ordem manual da linha |

`Projeto` e `Estado` aceitam texto novo e sugerem valores já existentes no Gantt. `Pessoa` não é
texto livre: apresenta a união dos gestores do projeto, membros dos quadros do projeto e
utilizadores com visibilidade total do projeto. Esta lista deve ser calculada pela lógica de
`projects.makeScoper`, sem depender do modo configurado para o chat.

### 2.3 Tarefas ainda não agendadas

Uma tarefa pode ter título e duração esperada sem ter início ou fim. Estas tarefas aparecem numa
secção “Por agendar”, fora da timeline.

Ao arrastar uma tarefa “Por agendar” para a timeline:

1. o ponto onde foi largada define o início;
2. o fim é calculado usando a duração esperada;
3. a tarefa passa a aparecer na timeline.

---

## 3. Regra da duração esperada

É essencial definir uma única regra para impedir inconsistências entre início, fim e duração.

### 3.1 Fonte de verdade

O backend guarda:

- `startDate`;
- `endDate`;
- `expectedDurationDays`.

Qualquer alteração deve manter os três valores consistentes.

### 3.2 Regras de cálculo

- Alterar **Início** mantém a duração e recalcula o fim.
- Alterar **Duração esperada** mantém o início e recalcula o fim.
- Alterar **Fim** mantém o início e recalcula a duração.
- Arrastar a barra completa altera início e fim, preservando a duração.
- Redimensionar o lado esquerdo altera o início e recalcula a duração.
- Redimensionar o lado direito altera o fim e recalcula a duração.
- Uma operação que produza duração igual ou inferior a zero é rejeitada.
- Se API receber os três valores e forem inconsistentes, responde com `422 Unprocessable Entity`.

### 3.3 Unidade, inclusividade e calendário

A duração esperada é persistida como número inteiro de dias em `expectedDurationDays`. Início e fim
são datas sem componente horária, usando colunas PostgreSQL `date`; isto reduz erros de timezone e
mudança de hora.

O fim é inclusivo, seguindo o comportamento visual do ficheiro de referência:

- início 10 de agosto + duração 1 dia = fim 10 de agosto;
- início 10 de agosto + duração 5 dias = fim 14 de agosto;
- fórmula: `endDate = startDate + expectedDurationDays - 1`.

No MVP, a duração conta dias de calendário. A exclusão automática de fins de semana e feriados fica
fora da primeira entrega. O plano guarda `calendarMode = calendar` para permitir acrescentar dias
úteis no futuro sem alterar o significado dos dados existentes.

---

## 4. Timeline, escalas e zoom

O utilizador não deve trocar apenas uma etiqueta “Dia/Semana/Mês”. O zoom deve alterar de forma
coerente a largura das células, cabeçalhos, snap de drag e quantidade de informação visível.

### 4.1 Níveis de zoom

| Nível | Cabeçalho superior | Cabeçalho inferior | Snap de drag/resize |
| --- | --- | --- | --- |
| Dia | Mês e ano | Dia da semana + dia | 1 dia |
| Semana | Mês e ano | Semana ISO | 1 dia |
| Mês | Ano | Mês | 1 semana |
| Trimestre | Ano | Trimestre | 1 semana |
| Ano | Ano | Trimestre ou mês | 1 mês |

O MVP deve entregar Dia, Semana e Mês. Trimestre e Ano podem entrar na mesma arquitetura, mesmo que
sejam ativados numa fase posterior.

### 4.2 Comportamento do zoom

- Botões `−` e `+`.
- Seletor explícito Dia/Semana/Mês.
- `Ctrl/Cmd + roda do rato` para zoom progressivo.
- Zoom centrado na data sob o cursor; se não houver cursor, na data central da viewport.
- Manter a posição temporal ao trocar de escala.
- Botão “Hoje”.
- Botão “Ajustar tudo” para enquadrar todas as tarefas agendadas.
- Scroll horizontal e pan da timeline.
- Autoscroll quando uma barra é arrastada junto às margens.
- Fins de semana visualmente diferenciados nas escalas Dia e Semana.

O nível escolhido deve ser persistido por utilizador em `localStorage`. O plano pode guardar um
`defaultZoomLevel` usado na primeira abertura.

---

## 5. Interações com as barras

### 5.1 Drag horizontal

Arrastar o corpo da barra move a tarefa no tempo, mantendo a duração. Durante a interação, a UI
mostra uma tooltip com início, fim e duração esperada resultantes.

Ao largar:

1. aplica-se o snap correspondente ao zoom;
2. o estado local é atualizado de forma otimista;
3. é enviado `PATCH /api/gantt-items/:id`;
4. em erro, a barra volta à posição anterior e é apresentada uma mensagem.

### 5.2 Resize

Cada extremidade da barra tem uma área de resize suficientemente grande para rato e toque.

- Resize esquerdo: altera início.
- Resize direito: altera fim.
- Duração mínima: um passo de snap.
- A tooltip apresenta a duração em tempo real.

### 5.3 Reordenação vertical

As linhas podem ser reordenadas verticalmente. A ordem é persistida através de uma posição
fracionária, seguindo o padrão já utilizado pelo Planka para elementos ordenáveis.

### 5.4 Alternativa por teclado

Para acessibilidade, cada barra deve permitir:

- setas para deslocar segundo o snap atual;
- `Shift + seta` para aumentar ou reduzir duração;
- `Enter` para abrir o formulário da tarefa;
- `Escape` para cancelar uma manipulação.

---

## 6. Estrutura visual

### 6.1 Painel esquerdo

Colunas configuráveis e redimensionáveis:

1. Pessoa
2. Tarefa
3. Projeto
4. Início
5. Fim
6. Duração esperada
7. Estado

O painel esquerdo e a timeline devem partilhar a mesma virtualização e altura de linha para nunca
perderem sincronização vertical.

### 6.2 Toolbar

- título e menu do plano;
- criar tarefa;
- pesquisa;
- filtros por pessoa, projeto e estado;
- esconder/mostrar tarefas por agendar;
- Hoje;
- Ajustar tudo;
- controlos de zoom;
- modo só de leitura quando o utilizador não pode editar.

### 6.3 Estados visuais

- loading inicial com skeleton;
- plano vazio com CTA para criar a primeira tarefa;
- grupo “Por agendar” quando faltam datas;
- erro de carregamento com retry;
- indicador de gravação durante operações otimistas;
- conflito de edição com opção de recarregar os dados do servidor.

### 6.4 Princípios de experiência

- O Gantt deve parecer uma vista nativa do projeto, não uma aplicação externa embebida.
- A grelha e a timeline formam uma única superfície: selecionar ou passar sobre uma linha realça a
  mesma tarefa nos dois lados.
- A informação essencial deve ser legível sem abrir a tarefa; o formulário serve para edição
  completa, não para descobrir o conteúdo.
- Ações frequentes ficam visíveis. Configuração, desativação e eliminação ficam nas definições do
  projeto.
- Drag e resize são atalhos visuais; todas as alterações têm uma alternativa por formulário e
  teclado.
- A UI não deve mostrar controlos de Gantt em projetos onde a funcionalidade não está ativa.

### 6.5 Ativação e criação do Gantt

Adicionar um separador **Gantt** ao `ProjectSettingsModal`, visível apenas para gestores do projeto e
administradores. O Gantt não é criado automaticamente com o projeto.

#### Estado inativo

O separador apresenta:

- título “Planeamento Gantt”;
- uma explicação curta: “Planeie tarefas deste projeto numa linha temporal. As tarefas do Gantt são
  independentes dos cartões.”;
- indicação de que as pessoas serão obtidas dos membros atuais do projeto;
- botão primário **Ativar Gantt**.

Ao clicar em **Ativar Gantt**:

1. o botão entra em loading e fica temporariamente indisponível;
2. é enviado `POST /api/projects/:projectId/gantt-plan`;
3. em sucesso, a entrada **Gantt** surge imediatamente na navegação do projeto;
4. o painel muda para o estado ativo e apresenta **Abrir Gantt**;
5. a UI mostra feedback discreto “Gantt ativado”.

Não fechar automaticamente as definições: o utilizador deve perceber que a ativação foi concluída e
decidir quando abrir o plano.

#### Estado ativo

Mostrar:

- estado “Ativo”;
- número de tarefas, se já existirem;
- botão primário **Abrir Gantt**;
- controlo da escala inicial: Dia, Semana ou Mês;
- ação secundária **Desativar Gantt**.

Desativar abre uma confirmação com a mensagem: “O Gantt deixa de aparecer neste projeto, mas as
tarefas e configurações serão preservadas.” A confirmação chama-se **Desativar**, nunca
“Eliminar”.

A eliminação definitiva fica numa zona de perigo separada. Exige escrever o nome do projeto e
explica que as tarefas Gantt serão removidas. Não deve fazer parte do fluxo normal do MVP se não
existir uma necessidade operacional clara.

```text
┌─ Definições do projeto ───────────────────────────────┐
│ Geral  Gestores  Fundo  Campos base  Gantt              │
├──────────────────────────────────────────────────────┤
│ Planeamento Gantt                                      │
│ Planeie tarefas numa linha temporal independente       │
│ dos cartões.                                            │
│                                                         │
│ Pessoas: membros atuais deste projeto                   │
│                                      [ Ativar Gantt ]   │
└──────────────────────────────────────────────────────┘
```

### 6.6 Entrada na navegação do projeto

A entrada **Gantt** aparece na barra horizontal onde estão os quadros, depois do último quadro.

- Tem ícone de calendário/timeline e texto “Gantt”.
- É fixa e não pode ser reordenada como se fosse um quadro.
- Fica visualmente ativa na rota `/projects/:id/gantt`.
- Não apresenta menu de edição próprio; a configuração permanece nas definições do projeto.
- Quando o Gantt é desativado enquanto está aberto, o utilizador regressa ao primeiro quadro ou à
  página do projeto com a mensagem “O Gantt foi desativado”.
- Acesso direto à rota inativa redireciona para o projeto. Acesso sem permissão devolve o mesmo
  comportamento seguro usado pelo restante projeto, sem revelar dados do plano.

### 6.7 Composição do workspace

O Gantt ocupa a altura disponível abaixo do cabeçalho e da navegação do projeto. A superfície é
dividida entre grelha e timeline, com toolbar comum e scroll vertical sincronizado.

```text
┌─ Projeto / navegação ─────────────────────────────────────────────────────────────┐
│ Quadro A   Quadro B   [ Gantt ]                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ Gantt  [Nova tarefa]  Pesquisa  Filtros       Hoje  Ajustar  −  Semana  + │
├─────────────────────────────────┬─────────────────────────────────────────┤
│ Pessoa | Tarefa | Projeto | ... │ Ago 2026       Set 2026                  │
│ Ana    | Preparar campanha       │     ███████                          │
│ Rui    | Produção                │              ██████                 │
│ —      | Aprovação               │                    ████             │
├─────────────────────────────────┴─────────────────────────────────────────┤
│ Por agendar (3)   Briefing · 2 dias   Orçamento · 1 dia                   │
└──────────────────────────────────────────────────────────────────────────┘
```

O divisor vertical é redimensionável. A largura inicial da grelha deve permitir ler Pessoa, Tarefa
e Estado; a preferência de largura é guardada por utilizador. A grelha tem um mínimo funcional e não
pode ocultar completamente a timeline.

### 6.8 Toolbar e hierarquia de ações

Da esquerda para a direita:

1. título “Gantt” e, opcionalmente, contagem de tarefas visíveis;
2. botão primário **Nova tarefa**;
3. pesquisa por tarefa, projeto textual, estado ou pessoa;
4. filtros por Pessoa, Projeto e Estado;
5. ação **Limpar filtros**, apenas quando existem filtros ativos;
6. separador flexível;
7. **Hoje** e **Ajustar tudo**;
8. controlos `−`, seletor Dia/Semana/Mês e `+`.

Em larguras menores, pesquisa e filtros recolhem para um botão **Filtrar** com badge da quantidade de
filtros ativos. Os controlos temporais permanecem acessíveis e nunca entram no menu de configuração.

### 6.9 Grelha de tarefas

- Cabeçalho sticky durante o scroll vertical.
- Colunas redimensionáveis; Pessoa e Tarefa ficam congeladas durante scroll horizontal da grelha.
- A coluna Tarefa recebe mais largura e é a última a desaparecer num layout compacto.
- Pessoa mostra até três avatares; atribuições adicionais aparecem como `+N`.
- Duração é apresentada como `1 dia` ou `5 dias`, nunca como minutos.
- Estado usa ponto ou etiqueta colorida, sempre acompanhado por texto.
- Datas seguem a localização do utilizador, por exemplo `13/08/2026` em PT-PT.
- Valores vazios usam `—`, exceto Tarefa e Duração, que são obrigatórios.
- Hover realça a linha e a barra correspondente; seleção mantém esse realce até clicar fora ou
  selecionar outra tarefa.
- Duplo clique, `Enter` ou a ação de contexto abre o editor da tarefa.

A coluna textual **Projeto** deve ter ajuda contextual “Campo livre dentro deste Gantt”, evitando que
seja confundida com o projeto Planka atual. Placeholder recomendado: “Ex.: Campanha Natal”.

### 6.10 Criação e edição de tarefas

O botão **Nova tarefa** abre um painel lateral próprio à direita no desktop. Em tablet estreito ou
telemóvel, o painel ocupa o ecrã completo. Não usar o editor visual nativo do SVAR como formulário
principal.

Ordem dos campos:

1. **Tarefa** — autofocus, texto obrigatório;
2. **Pessoa** — seletor múltiplo de membros do projeto;
3. **Projeto** — texto livre com sugestões existentes;
4. **Estado** — combobox com valores existentes e possibilidade de criar novo;
5. **Duração esperada** — inteiro com sufixo “dias”, mínimo 1;
6. **Início** e **Fim** — date pickers lado a lado;
7. **Cor** — opção avançada, recolhida por defeito.

O formulário começa com duração de 1 dia e sem datas. Assim, uma tarefa pode ser criada diretamente
em **Por agendar**. Se o utilizador preencher Início, o Fim é calculado; se preencher ou alterar Fim,
a duração é recalculada e a mudança é explicada junto ao campo.

O rodapé do painel contém **Cancelar** e **Criar tarefa**. Na edição, usa **Guardar alterações**. O
botão principal fica indisponível enquanto existirem erros e apresenta loading durante a gravação.
Fechar com alterações por guardar pede confirmação.

Atalhos adicionais, sem substituir o botão principal:

- duplo clique numa zona vazia da timeline abre o painel com a data clicada como Início e duração de
  1 dia;
- ação **Duplicar** cria uma cópia por agendar;
- `Delete` só elimina quando a linha está selecionada e após confirmação; nunca durante drag.

### 6.11 Seletor de pessoas

O seletor pesquisa exclusivamente membros elegíveis do projeto atual.

- Cada opção mostra avatar, nome e email quando necessário para distinguir homónimos.
- Gestores podem receber uma indicação discreta “Gestor”, sem serem separados numa fonte de dados
  diferente.
- Seleções são mostradas como avatares/chips removíveis.
- A mesma pessoa não pode ser adicionada duas vezes.
- Se não houver resultados, mostrar “Nenhum membro deste projeto corresponde à pesquisa”.
- Uma pessoa anteriormente atribuída mas já sem acesso continua visível na tarefa com estado
  “Sem acesso”; não pode ser escolhida novamente depois de removida.
- O seletor nunca permite criar pessoas nem introduzir nomes livres.

### 6.12 Tarefas por agendar

**Por agendar** é uma faixa recolhível ligada ao fundo da grelha/timeline e mostra a contagem.

- Cada item apresenta Tarefa, Pessoa e Duração.
- O utilizador pode arrastar o item para uma data da timeline; durante o arrasto aparece uma barra
  fantasma com a duração correta.
- A ação **Agendar** abre o date picker para quem não usa drag.
- Depois de largar, o item sai da faixa e entra na linha correspondente sem salto de scroll.
- Quando não existem tarefas por agendar, a faixa fica recolhida e não ocupa altura permanente.

### 6.13 Feedback de drag, resize e gravação

Durante drag ou resize:

- a barra manipulada ganha realce e as restantes perdem ligeiramente ênfase;
- uma tooltip acompanha a operação com Início, Fim e Duração;
- a célula de destino e o snap atual ficam visíveis;
- o cursor distingue mover de redimensionar;
- `Escape` cancela e repõe os valores anteriores.

Depois de largar, a barra assume imediatamente a nova posição e mostra um indicador discreto de
gravação na linha. Não mostrar toast em cada sucesso. Em erro, fazer rollback, focar novamente a
tarefa e mostrar uma mensagem acionável: “Não foi possível guardar a alteração. A tarefa voltou às
datas anteriores.”

Se existir conflito de versão, não escolher silenciosamente um dos valores. Abrir um aviso com as
opções **Ver versão atual** e **Manter a minha alteração**, sendo a segunda uma nova gravação
explícita.

### 6.14 Estados de página

#### Primeiro acesso e plano vazio

Manter a grelha e a escala temporal visíveis para ensinar a estrutura. No centro, mostrar:

- “Este Gantt ainda não tem tarefas”;
- “Crie uma tarefa com datas ou deixe-a por agendar.”;
- botão **Criar primeira tarefa**.

#### Loading

Mostrar skeleton da toolbar, cabeçalhos e várias linhas. Não apresentar uma timeline vazia que possa
ser confundida com dados carregados.

#### Erro inicial

Mostrar “Não foi possível carregar o Gantt”, uma explicação curta e **Tentar novamente**. A navegação
do projeto continua utilizável.

#### Sem resultados

Quando filtros ou pesquisa escondem tudo, mostrar “Nenhuma tarefa corresponde aos filtros” com
**Limpar filtros**. Não usar o estado de plano vazio.

#### Tempo real

Alterações remotas surgem sem toast repetitivo. Se alterarem a tarefa atualmente aberta, o painel
informa “Esta tarefa foi atualizada por outra pessoa” e permite recarregar os valores.

### 6.15 Permissões e modo de edição

O comportamento deve respeitar o cadeado/modo de edição já existente no cabeçalho do projeto.

- Membro com acesso de leitura: vê a timeline, usa zoom, pesquisa, filtros e abre detalhes; não vê
  ações de criação, drag, resize ou eliminação.
- Gestor com modo de edição bloqueado: tem a mesma superfície de leitura e recebe a indicação
  “Ative o modo de edição para alterar o Gantt” junto ao cadeado, sem banner persistente a ocupar
  espaço.
- Gestor com modo de edição ativo: vê todas as ações permitidas.
- A UI nunca depende apenas de esconder botões; a API valida todas as permissões.

### 6.16 Comportamento responsivo

#### Desktop

- Experiência completa com grelha e timeline lado a lado.
- Divisor redimensionável e todas as colunas disponíveis.
- Painel de edição lateral sem retirar totalmente o contexto temporal.

#### Tablet

- Grelha começa apenas com Pessoa, Tarefa e Estado; restantes colunas ficam acessíveis por scroll ou
  configuração.
- Toolbar recolhe pesquisa e filtros.
- Drag e resize usam alvos táteis maiores e autoscroll controlado.
- Painel de edição ocupa a maior parte ou a totalidade da largura.

#### Telemóvel

No MVP, oferecer uma lista simplificada com Pessoa, Tarefa, datas, duração e Estado. Zoom e consulta
continuam disponíveis, mas drag/resize da timeline ficam desativados; as datas são alteradas pelo
formulário. Isto evita uma interação temporal imprecisa sem impedir consulta ou correções urgentes.

### 6.17 Acessibilidade

- Todos os controlos têm nome acessível e foco visível.
- Navegação da grelha segue um padrão previsível por linha e coluna.
- A barra selecionada expõe Tarefa, Início, Fim, Duração e Estado a tecnologia assistiva.
- Drag tem alternativa por teclado e formulário.
- Cor nunca é o único indicador de pessoa ou estado.
- Áreas de resize cumprem um alvo mínimo confortável sem alterar visualmente a espessura da barra.
- Tooltips informativas também aparecem por foco, não apenas por hover.
- Respeitar `prefers-reduced-motion`; transições não são necessárias para compreender alterações.
- Textos, plurais e datas usam i18n em PT-PT e EN.

### 6.18 Microcopy principal

| Contexto | Texto recomendado |
| --- | --- |
| Ativar funcionalidade | Ativar Gantt |
| Abrir plano | Abrir Gantt |
| Criar tarefa | Nova tarefa |
| Tarefa sem datas | Por agendar |
| Duração | Duração esperada |
| Ajuda da duração | Número de dias de calendário, incluindo início e fim |
| Desativar | Desativar Gantt |
| Confirmação de desativação | As tarefas serão preservadas e poderá reativar o Gantt mais tarde. |
| Erro de gravação | Não foi possível guardar a alteração. A tarefa voltou aos valores anteriores. |
| Modo de leitura | Ative o modo de edição para alterar o Gantt. |

---

## 7. Modelo de dados por projeto

### 7.1 `GanttPlan`

Tabela sugerida: `gantt_plan`

| Campo | Tipo |
| --- | --- |
| id | bigint |
| project_id | bigint, único |
| name | text |
| description | text nullable |
| is_enabled | boolean, default `true` |
| edit_mode | text, default `managers` |
| default_zoom_level | text, default `week` |
| calendar_mode | text, default `calendar` |
| created_by_user_id | bigint |
| created_at / updated_at | timestamp |

Existe no máximo um `GanttPlan` por projeto. `is_enabled = false` oculta o Gantt sem apagar tarefas.
`edit_mode` começa com `managers`; pode futuramente aceitar `allProjectMembers`.

### 7.2 `GanttItem`

Tabela sugerida: `gantt_item`

| Campo | Tipo |
| --- | --- |
| id | bigint |
| gantt_plan_id | bigint |
| task | text |
| project | text nullable |
| status | text nullable |
| start_date | date nullable |
| end_date | date nullable |
| expected_duration_days | integer |
| color | text nullable |
| position | double precision |
| version | integer, default 1 |
| created_at / updated_at | timestamp |

Constraints:

- `expected_duration_days >= 1`;
- início e fim são ambos nulos ou ambos preenchidos;
- quando preenchidos, `start_date <= end_date`;
- quando preenchidos, `end_date - start_date + 1 = expected_duration_days`;
- índice por `gantt_plan_id, position`;
- índice por `gantt_plan_id, start_date, end_date`.

O campo `version` permite optimistic locking e evita que dois utilizadores sobreponham alterações
silenciosamente.

### 7.3 `GanttItemAssignee`

Tabela sugerida: `gantt_item_assignee`

- `gantt_item_id`;
- `user_id`;

Só podem ser associados utilizadores que pertencem ao projeto no momento da alteração. Se uma
pessoa perder acesso ao projeto, deve deixar de aparecer como opção; a remoção automática das
atribuições existentes deve ser uma decisão explícita para não apagar histórico silenciosamente.

### 7.4 Membros e permissões

Não é criada uma membership própria do Gantt. O acesso reutiliza o projeto:

- gestores do projeto e administradores podem ativar, desativar e configurar o Gantt;
- qualquer utilizador com acesso ao projeto pode visualizar o Gantt;
- no MVP, apenas gestores do projeto e administradores editam tarefas;
- a lista de pessoas selecionáveis é calculada com `projects.makeScoper`, unindo gestores,
  membros dos quadros e utilizadores com visibilidade total;
- não reutilizar diretamente `chat.getProjectMemberUserIds`, porque esse helper altera o resultado
  conforme `chatMode` e o Gantt não deve depender da configuração do chat.

---

## 8. API proposta

### Ativação e plano

- `GET /api/projects/:projectId/gantt-plan`
- `POST /api/projects/:projectId/gantt-plan`
- `PATCH /api/gantt-plans/:id`
- `POST /api/gantt-plans/:id/disable`
- `DELETE /api/gantt-plans/:id`

### Tarefas

- `GET /api/gantt-plans/:id/items`
- `POST /api/gantt-plans/:id/items`
- `PATCH /api/gantt-items/:id`
- `DELETE /api/gantt-items/:id`
- `POST /api/gantt-plans/:id/items/reorder`

### Opções de autocomplete

- `GET /api/gantt-plans/:id/suggestions`

A resposta agrega valores distintos para `project` e `status`. As pessoas são devolvidas como
`included.users` no carregamento do plano e são sempre derivadas dos membros atuais do projeto.

### Atualizações em tempo real

Cada plano usa uma sala Socket.IO `ganttPlan:<id>` e eventos próprios:

- `ganttItemCreate`;
- `ganttItemUpdate`;
- `ganttItemDelete`;
- `ganttPlanUpdate`.

O payload de update inclui `version` para deteção de conflitos.

---

## 9. Frontend proposto

### Rotas

- `/projects/:id/gantt`

A rota e a entrada de navegação só ficam disponíveis quando existe um `GanttPlan` ativo para o
projeto.

### Componentes

```text
client/src/components/projects/ProjectSettingsModal/GanttPane/
client/src/components/boards/Boards/GanttTab/
client/src/components/gantt/
├── GanttWorkspace/
├── GanttToolbar/
├── GanttGrid/
├── GanttTimelineAdapter/
├── GanttUnscheduledList/
├── GanttItemPanel/
├── GanttProjectMemberPicker/
├── GanttFilters/
├── GanttZoomControls/
├── GanttEmptyState/
└── GanttConflictNotice/
```

`GanttTimelineAdapter` é a única camada autorizada a importar a biblioteca Gantt. O resto da
aplicação trabalha com o formato interno `GanttItem`. Assim é possível substituir a biblioteca sem
reescrever API, reducers, formulários e regras de negócio.

### Estado

Criar um estado dedicado ao Gantt, sem inserir tarefas Gantt nos modelos Redux-ORM de cartões.

O estado deve separar:

- dados persistidos;
- filtros e pesquisa;
- viewport e zoom;
- tarefa selecionada e estado do painel de edição;
- operação de drag/resize em curso;
- alterações otimistas pendentes;
- conflitos de versão;
- permissões efetivas e modo de edição atual.

---

## 10. Avaliação de bibliotecas open source

Avaliação feita em 13/08/2026 a partir dos repositórios, documentação oficial e pacotes publicados.

| Biblioteca | Licença | Pontos fortes | Limitações para este caso | Decisão |
| --- | --- | --- | --- | --- |
| [SVAR React Gantt](https://github.com/svar-widgets/react-gantt) | MIT | React 18+, drag/resize, zoom, escalas, colunas React, virtualização, eventos interceptáveis | Tarefas não agendadas, marcadores, calendários laborais, undo e export avançado estão na versão PRO | **Selecionada, sujeita ao protótipo de integração** |
| [DHTMLX Gantt Community v10](https://docs.dhtmlx.com/gantt/guides/installation/) | MIT apenas em v10+ | Muito maduro, drag/resize, zoom, inline editing, smart rendering e acessibilidade | Wrapper React oficial é comercial; Community exige integração imperativa; várias funções avançadas são PRO | Boa alternativa técnica, integração mais pesada |
| [Frappe Gantt](https://github.com/frappe/gantt) | MIT | Maduro, leve, drag/resize, snap e vistas Dia/Semana/Mês/Ano | Não oferece a grelha completa dos sete campos; integração React e virtualização teriam de ser construídas | Melhor fallback leve |
| [gantt-task-react](https://github.com/MaTeMaTuK/gantt-task-react) | MIT | React, simples, drag e várias vistas | Evolução e releases lentos, muitos pontos de extensão teriam de ser mantidos localmente | Não recomendado para novo módulo |
| [GSTC](https://github.com/neuronetio/gantt-schedule-timeline-calendar) | Licença própria/trial | Timeline muito flexível, zoom granular, elevada performance | Não é uma opção open source MIT para produção | Excluída |

### Porque usar SVAR

- É um componente React real, não apenas uma API DOM imperativa.
- O pacote publicado declara compatibilidade com React e React DOM 18 ou superior.
- Já fornece virtualização, evitando renderizar milhares de células manualmente.
- Permite colunas personalizadas para os campos pedidos.
- Expõe ações `drag-task`, `update-task` e `zoom-scale` que podem ser ligadas à API do projeto.
- O núcleo open source cobre drag, resize e zoom — os requisitos mais caros de construir de raiz.

### Limitações a contornar no MVP

- Tarefas sem datas ficam no componente próprio `GanttUnscheduledList`, não dentro da timeline.
- A linha “Hoje” pode ser desenhada por uma camada CSS/overlay do adaptador, se a edição Community
  usada não a disponibilizar.
- Calendário laboral, baselines, dependências automáticas e undo ficam fora do MVP.
- Deve ser fixada uma versão exata no `package-lock.json`, evitando atualizações automáticas do
  motor Gantt.

---

## 11. Protótipo técnico obrigatório

Antes da implementação definitiva, criar uma branch experimental e validar:

1. React 18 + Vite do projeto.
2. Sete colunas personalizadas.
3. 1.000 tarefas sem perda visível de fluidez.
4. Drag completo preservando duração.
5. Resize de ambas as extremidades.
6. Zoom Dia, Semana e Mês mantendo a data central.
7. Snap configurável por escala.
8. Integração com formulário próprio, sem depender do editor visual da biblioteca.
9. Cancelamento e rollback após erro simulado da API.
10. Estilos claros/escuros e compatibilidade com o tema existente.
11. Tradução PT-PT.
12. Operação por teclado e comportamento em ecrã pequeno.

### Critério de decisão do protótipo

Prosseguir com SVAR se os requisitos 1 a 9 forem cumpridos sem fork da biblioteca.

Se for necessário alterar o código interno do pacote para drag, resize, zoom ou sincronização da
grelha, rejeitar a integração e testar Frappe Gantt com grelha própria. Não iniciar imediatamente um
motor temporal de raiz.

---

## 12. Fases de implementação

### Fase 0 — Protótipo da biblioteca: 1 a 2 dias

- instalar a biblioteca apenas na branch experimental;
- criar dados simulados;
- validar drag, resize, zoom, performance e theming;
- registar limitações e decisão final.

### Fase 1 — Base de dados e backend: 3 a 4 dias

- migrations das três tabelas;
- modelos e query methods;
- validação de datas e duração;
- CRUD de planos e tarefas;
- associação ao projeto, assignees e permissões;
- optimistic locking;
- testes de API.

### Fase 2 — Navegação e estado: 2 a 3 dias

- separador Gantt nas definições do projeto, com estados inativo e ativo;
- rota `/projects/:id/gantt` e navegação condicional no projeto;
- API client, actions, sagas, reducer e selectors;
- ativação, desativação e carregamento do plano do projeto;
- loading, plano vazio, erro inicial e ausência de resultados.

### Fase 3 — Grelha, timeline e zoom: 3 a 5 dias

- adaptador da biblioteca;
- sete colunas;
- grelha e timeline com seleção, hover e scroll sincronizados;
- escalas Dia/Semana/Mês;
- zoom centrado e ajuste automático;
- tarefas por agendar;
- filtros e pesquisa;
- composição responsiva de desktop e tablet.

### Fase 4 — Edição e tempo real: 3 a 4 dias

- painel de criação e edição de tarefa;
- seletor de membros do projeto;
- drag, resize e reordenação;
- atualizações otimistas e rollback;
- Socket.IO por plano;
- conflitos de versão.

### Fase 5 — Qualidade: 2 a 3 dias

- testes unitários do cálculo temporal;
- testes de integração;
- testes de timezone e mudança de hora;
- acessibilidade e teclado;
- traduções PT-PT e EN;
- validação em desktop, tablet e lista móvel simplificada.

### Estimativa

- **Abordagem híbrida com biblioteca:** 14 a 21 dias úteis.
- **Timeline construída totalmente de raiz:** 30 a 45 dias úteis, com risco superior de bugs de
  scroll, zoom, DST, virtualização, drag e sincronização entre grelha e timeline.

---

## 13. Testes obrigatórios

### Regras de duração

- início + duração calcula o fim correto;
- editar fim recalcula duração;
- mover barra preserva duração;
- resize recalcula duração;
- duração zero ou negativa é rejeitada;
- payload inconsistente devolve 422;
- datas em mudança de hora não deslocam a tarefa inesperadamente.

### Zoom

- alternância Dia/Semana/Mês mantém a data central;
- drag respeita o snap da escala;
- Ajustar tudo inclui todas as tarefas agendadas;
- tarefas por agendar não expandem a escala;
- zoom não altera datas nem duração persistida.

### Concorrência

- updates por Socket.IO não interrompem um drag local;
- versão desatualizada gera conflito e não substitui dados silenciosamente;
- rollback repõe exatamente as datas anteriores.

### Permissões

- membro do projeto consegue consultar o Gantt ativo;
- no MVP, apenas gestor do projeto ou administrador consegue ativar, editar, arrastar e
  redimensionar tarefas;
- utilizador sem acesso ao projeto não consegue abrir o plano nem subscrever a sala Socket.IO;
- uma pessoa removida do projeto deixa de estar disponível para novas atribuições, sem apagar o
  histórico das tarefas existentes.

### Fluxos UI/UX

- ativar o Gantt atualiza o separador de definições e a navegação sem recarregar a página;
- desativar preserva tarefas e redireciona com feedback quando o Gantt está aberto;
- fechar o painel com alterações por guardar pede confirmação;
- plano vazio, sem resultados e erro inicial apresentam mensagens e ações diferentes;
- membro em leitura e gestor com modo de edição bloqueado não recebem controlos mutáveis;
- drag, resize, seleção de linha e painel de edição mantêm foco e tarefa coerentes;
- seletor de pessoas só apresenta membros elegíveis do projeto e identifica membros sem acesso;
- tablet mantém alvos táteis utilizáveis e telemóvel permite editar datas pelo formulário;
- navegação integral por teclado não exige drag.

---

## 14. Critérios de aceitação do MVP

- Um gestor consegue ativar e desativar o Gantt nas definições do projeto.
- Cada projeto pode ter zero ou um Gantt e os projetos sem Gantt ativo não mostram a entrada de
  navegação nem expõem conteúdo Gantt pela rota direta.
- Ativar o Gantt não fecha automaticamente as definições e apresenta uma ação clara para o abrir.
- Desativar o Gantt preserva tarefas e configurações para futura reativação.
- Existem os campos Pessoa, Tarefa, Projeto, Início, Fim, Duração esperada e Estado.
- Pessoa permite escolher membros atuais do projeto onde o Gantt foi aberto.
- Projeto e Estado são campos próprios da tarefa Gantt e não dependem de quadros ou cartões.
- A duração esperada é guardada como um número inteiro de dias em `expectedDurationDays`.
- Com início a 10 de agosto e duração de 5 dias, o fim inclusivo é 14 de agosto.
- Uma tarefa pode existir apenas com título e duração na área “Por agendar”.
- O painel de tarefa permite criar e editar sem depender do editor visual da biblioteca.
- É possível arrastar uma tarefa para outra data mantendo a duração.
- É possível redimensionar a barra e atualizar a duração esperada.
- Existem escalas Dia, Semana e Mês.
- O zoom mantém a região temporal em análise.
- Alterações são guardadas de forma otimista e revertidas em erro.
- Dois utilizadores recebem atualizações em tempo real.
- Um membro do projeto sem permissão de gestão tem modo apenas de leitura.
- A grelha e a timeline mantêm seleção, hover e scroll vertical sincronizados.
- Existem estados distintos para primeiro acesso, loading, erro e filtros sem resultados.
- A versão móvel permite consulta e alteração por formulário, sem exigir drag ou resize.
- O Gantt mantém fluidez com pelo menos 1.000 tarefas no cenário de teste.
- A aplicação não depende diretamente da API da biblioteca fora de `GanttTimelineAdapter`.

---

## 15. Evoluções futuras

- ligações opcionais de tarefas de checklist dos cartões ao Gantt — implementado; a tarefa do
  cartão governa nome, responsável e conclusão, enquanto o Gantt governa datas, duração,
  hierarquia e dependências;
- dependências entre tarefas;
- marcos;
- calendário laboral e feriados;
- duração planeada versus duração real;
- baseline e comparação de versões;
- caminho crítico;
- undo/redo;
- exportação PDF, PNG e Excel;
- modelos reutilizáveis de planos Gantt;
- histórico detalhado de cada reagendamento.

Estas evoluções não devem alterar os campos próprios das tarefas Gantt. A associação do plano ao
projeto e a seleção de pessoas a partir dos seus membros mantêm-se. A ligação implementada às
tarefas de checklist é opcional, preserva os itens Gantt autónomos e usa o UI próprio da superfície
onde a ação começa: Gantt dentro do Gantt e ações nativas do Board dentro do cartão.

---

## 16. Referências técnicas

- [SVAR React Gantt — repositório e licença MIT](https://github.com/svar-widgets/react-gantt)
- [SVAR React Gantt — visão geral de funcionalidades](https://docs.svar.dev/react/gantt/overview/)
- [SVAR React Gantt — API e eventos](https://docs.svar.dev/react/gantt/api/overview/)
- [SVAR React Gantt — evento de drag](https://docs.svar.dev/react/gantt/api/actions/drag-task/)
- [DHTMLX Gantt Community — instalação e licença](https://docs.dhtmlx.com/gantt/guides/installation/)
- [DHTMLX Gantt — comparação Community/PRO](https://docs.dhtmlx.com/gantt/guides/editions-comparison/)
- [Frappe Gantt — repositório e documentação](https://github.com/frappe/gantt)
- [Ficheiro Gantt de referência](https://docs.google.com/spreadsheets/d/1vGNdySvqZny3nwAAVjhGuWaHNdnzc5vgZn5L46NPpss/edit?gid=784990759#gid=784990759)
