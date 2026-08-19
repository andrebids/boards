# Timeline simples no Gantt, com controlos inspirados em HeroUI

## Objetivo

Adicionar, imediatamente após o grupo atual de zoom (`−`, `Dia`/`Semana`/`Mês`/`Trimestre`, `+`), um botão que alterna entre o Gantt completo e uma **Timeline simples**. Esta segunda leitura reduz a densidade da grelha do fornecedor e privilegia datas, duração, estado e título de cada tarefa numa faixa cronológica clara e apelativa.

O utilizador mantém o Gantt completo para planear, redimensionar e gerir dependências. A Timeline simples é uma leitura rápida do plano: abre no mesmo contexto, usa os mesmos dados em tempo real e continua a abrir o painel de detalhe da tarefa ao selecionar uma faixa.

## Contexto verificado

- O Gantt vive em `client/src/components/gantt/GanttWorkspace.jsx`; já conserva localmente `zoomLevel` e expõe os quatro níveis `day/week/month/quarter`.
- A toolbar tem um stepper de zoom coeso, composto por `-`, `Dropdown` e `+`. O novo trigger é um controlo de modo adjacente, **logo após esse stepper**, sem deslocar as ações `Nova tarefa` e `Importar`.
- `selectTimelineData()` já normaliza as tarefas agendadas e calcula as datas agregadas dos itens de resumo. A vista nova pode reutilizá-lo, sem endpoint, migração, Redux ou escrita no servidor.
- O `GanttTimelineAdapter` é o owner da interação pesada SVAR (drag, resize, links e zoom por `Ctrl` + wheel). A Timeline simples não deve tentar reproduzir essas interações.
- Os botões e tokens locais já seguem o plano `design-plans/heroui-button-system.md`: `Button` de `client/src/lib/custom-ui`, `--app-*`, raio pill, focus ring, estados disabled e `prefers-reduced-motion`. HeroUI é referência visual; não será instalada (o cliente continua em React 18, Semantic UI React e SCSS Modules).
- As duas imagens de referência foram indicadas pelo utilizador, mas não ficaram acessíveis no ambiente. A aprovação visual com a imagem branca é, portanto, uma condição explícita antes de fechar o trabalho.

## Intenção de UX e direção visual

**Pessoa e tarefa.** Um gestor abre o Gantt para perceber rapidamente o que está em curso, o que começa a seguir e onde existem intervalos — sem ter de interpretar primeiro uma tabela técnica.

**Foco.** A escala temporal e as barras são o foco; informação secundária aparece como metadados curtos, não como seis colunas persistentes.

**Assinatura.** Cada tarefa é uma faixa temporal arredondada, com título e estado ancorados à duração real; o cabeçalho tem uma régua temporal leve e um marcador “Hoje” fino. O efeito deve parecer um plano de trabalho legível, e não outra tabela disfarçada.

**Composição HeroUI.** Canvas escuro já existente, superfícies em degraus subtis, bordos pouco contrastados, controlos pill compactos, azul apenas para seleção/foco e microinteração curta. A referência branca informa proporção, espaçamento, raios e hierarquia tipográfica; **não** informa a paleta. A Timeline não receberá gradientes decorativos, glass/blur, sombras pesadas, nem uma nova paleta.

### Wireframe de comportamento

```text
[ − ] [ Semana ▾ ] [ + ] │ [ ⟷ Timeline simples ]
             stepper de zoom │  botão secundário; ativo quando a timeline simples está visível

Gantt completo (padrão)             Timeline simples
┌────────────┬──────────────┐       ┌──────────────────────────────────────┐
│ tabela     │ SVAR grid    │       │ Ago 2026       Set 2026              │
│ + barras + │ + links      │   →   │     │ Hoje                              │
│ drag/resize│              │       │  Pesquisa   ███████                  │
└────────────┴──────────────┘       │  Design          █████               │
                                    │  Lançamento              ████        │
                                    └──────────────────────────────────────┘
```

## Decisões de produto

1. **Alternância, não substituição.** O botão troca a superfície visível; o Gantt completo continua a ser o modo inicial e de edição. O label do botão muda para `Gantt completo` quando a timeline simples está ativa, evitando um ícone ambíguo.
2. **Estado local nesta primeira entrega.** `viewMode: 'gantt' | 'timeline'` começa em `'gantt'`, não integra URL, preferências ou `GanttPlan`. Isto evita acrescentar persistência por uma preferência de visualização ainda não validada. Uma fase posterior poderá persistir por utilizador se houver pedido comprovado.
3. **Zoom partilhado.** A Timeline simples recebe o mesmo `zoomLevel`. Mudar Dia/Semana/Mês/Trimestre mantém o modo ativo e redesenha somente a régua e a escala, sem montar o SVAR escondido.
4. **Somente leitura estrutural.** Clique e teclado abrem o painel já existente; arrastar, resize, edição inline e conectores de dependência ficam explicitamente no Gantt completo. O aviso aparece apenas na primeira entrada por sessão, numa frase discreta junto do cabeçalho da timeline (não num modal).
5. **Sem perda de informação essencial.** Cada faixa mostra `título`, cor/estado, intervalo (em tooltip e em texto de apoio quando houver espaço) e avatares até ao limite já usado no Gantt. As tarefas sem data continuam na faixa inferior “Por agendar”, partilhada com o modo atual.
6. **Densidade orientada por fases.** Tarefas normais usam 40 px de altura visual no desktop (alvo clicável mínimo de 44 px); cada item `summary` torna-se um separador de fase de 28–32 px, sticky enquanto os seus descendentes atravessam a viewport. Assim, 30 tarefas continuam compactas e o scroll rápido conserva marcos de orientação. Em touch/coarse pointer, a área interativa sobe para 44 px sem alterar a hierarquia.

## Especificação da interface

### Trigger junto do seletor temporal

- Componente: `Button`, `size="sm"`, `variant="secondary"`; ícone Semantic `stream`/equivalente antes do texto em desktop.
- `aria-pressed` espelha o modo ativo; `aria-label` traduzido descreve a ação seguinte; tooltip mostra o mesmo texto em viewport estreito quando o label for ocultado.
- Desktop: altura igual ao select, gap de 6–8 px após o grupo de zoom, raio pill do sistema. O stepper conserva a ordem e proximidade `− → seletor → +`; o trigger de modo é separado apenas por um divisor vertical subtil ou margem de 8 px. Em repouso usa a superfície secondary; hover usa `--app-default-hover`; ativo usa `--app-accent-soft` e borda/focus `--app-focus`.
- Até 767 px, mostrar apenas o ícone preservando uma área de toque mínima de 36 px e o accessible name; não ocultar o próprio trigger. A toolbar pode partir para nova linha segundo o breakpoint existente.
- Não criar um `div` clicável, menu paralelo ou novo primitive. A semântica de botão, foco, pressed e redução de movimento vêm do `Button` partilhado.

### Corpo da Timeline simples

- Cabeçalho sticky com escala em dois níveis: mês/ano no nível maior e células da granularidade selecionada no menor. Dia: dia + abreviatura; Semana: `Sxx`; Mês: abreviatura; Trimestre: `T1–T4` traduzível se necessário. Deve reutilizar os formatters ISO e locale do adapter, evitando cálculos de semana divergentes.
- Conteúdo em scroll horizontal sincronizado com o cabeçalho; scroll vertical só no corpo. A largura mínima do calendário deriva de `zoomLevel`, preservando barras legíveis em cada escala.
- As linhas são estruturadas por fase: um `summary` abre um separador de 28–32 px com peso 650, ícone discreto e tonalidade derivada do respetivo estado; as respetivas tarefas surgem abaixo, ordenadas por `startDate`, em linhas compactas de 40 px com alvo clicável mínimo de 44 px. O separador fica sticky até à fase seguinte durante scroll vertical. Itens sem `parentId` aparecem numa secção “Sem fase” igualmente clara. Não criar zebra forte nem uma tabela lateral.
- A faixa usa `GANTT_STATUS_COLORS`/a função de cores existente, cantos de 8–10 px, texto contrastado e truncagem de uma linha. Quando a faixa for curta, manter só o indicador visual e expor título/datas por tooltip acessível; não comprimir texto até ficar ilegível.
- “Hoje”: linha vertical de 2 px em `--app-accent`, label compacto no topo e `pointer-events: none`. Finais de semana só têm banda subtil no nível Dia; não competir com a seleção nem com as barras.
- Seleção por clique, `Enter` ou `Space`: chama o atual `handleItemSelect`, abre `GanttItemPanel` e devolve o foco ao item de origem quando esse painel fecha. A linha de tarefa tem `button` nativo ou um único botão semanticamente correto, `aria-label` com título + intervalo + estado.
- Empty/error/loading reutilizam os owners e mensagens atuais. Se não houver tarefas agendadas, manter o empty state existente; não apresentar uma timeline vazia sem orientação.

## Alterações por etapa

### Fase 1 — Fundamentos e contrato de dados

#### Tarefa 1: Definir o modo de vista e traduções

**Ficheiros prováveis**

- `client/src/components/gantt/GanttWorkspace.jsx`
- `client/src/locales/pt-PT/core.js`
- `client/src/locales/en-US/core.js`
- `client/src/locales/fr-FR/core.js`

**Alteração**

- Criar `viewMode` local e o handler de toggle, default `'gantt'`.
- Inserir o `Button` depois do `Dropdown`, com ícone, `aria-pressed`, test id `gantt-timeline-toggle` e textos localizados para entrar/sair, hint read-only e descrições de tarefa.
- Passar `timelineItems`, `zoomLevel`, locale/dados de estado necessários e `handleItemSelect` ao novo componente; preservar o adapter apenas quando `viewMode === 'gantt'`.

**Aceitação**

- [ ] A ordem de tab segue `− → escala → + → modo de vista`, preservando o modelo mental do stepper de zoom.
- [ ] Alterar a escala não repõe o modo nem perde a tarefa selecionada.
- [ ] Nenhuma chamada API, payload socket ou estado persistido muda.

**Dependências:** nenhuma. **Escopo:** S (4 ficheiros).

#### Tarefa 2: Criar um modelo de escala partilhado e testável

**Ficheiros prováveis**

- `client/src/components/gantt/simpleTimelineScale.js`
- `client/src/components/gantt/simpleTimelineScale.test.js`
- `client/src/components/gantt/GanttTimelineAdapter.jsx` (apenas se for seguro extrair formatters comuns)

**Alteração**

- Extrair funções puras para: intervalo visível com margem antes/depois, geração de células por zoom, posição/largura inclusiva de uma tarefa, posição de Hoje, labels formatadas por locale e agrupamento estável `summary → descendentes → sem fase`.
- Manter a semântica atual: `endDate` é inclusiva; tarefas resumo usam a data agregada de `selectTimelineData`; semanas usam número ISO.

**Aceitação**

- [ ] Uma tarefa de 12 a 18 de agosto ocupa sete dias no modo Dia.
- [ ] Semana na passagem de ano devolve o número ISO correto.
- [ ] Itens fora do intervalo, datas inválidas e uma timeline de um único dia não produzem largura negativa nem `NaN`.
- [ ] Uma fase com tarefas fora de ordem de chegada é apresentada por data, e uma tarefa independente não desaparece nem fica associada à fase errada.

**Dependências:** Tarefa 1. **Escopo:** M (2–3 ficheiros).

### Checkpoint 1

- [ ] `npm run client:lint` termina sem erros novos.
- [ ] Testes unitários focados de selector/escala passam.
- [ ] No hot reload em `http://localhost:3008`, o botão aparece ao lado do seletor e mantém o Gantt atual totalmente funcional.

### Fase 2 — Vista cronológica simples

#### Tarefa 3: Implementar `GanttSimpleTimeline`

**Ficheiros prováveis**

- `client/src/components/gantt/GanttSimpleTimeline.jsx`
- `client/src/components/gantt/GanttSimpleTimeline.module.scss`
- `client/src/components/gantt/GanttWorkspace.jsx`

**Alteração**

- Criar o componente sem SVAR, a partir de elementos React/HTML normais e CSS Modules.
- Renderizar régua sticky, separadores de fase sticky, linhas compactas de tarefa, barras proporcionais e marcador de Hoje; manter ambos os eixos de scroll controlados e limitar repaint a propriedades compositoras quando houver animação.
- Fazer click/teclado abrir o painel existente; usar tooltip acessível apenas quando o conteúdo não couber. Não duplicar CRUD, links, drag/resize ou mapeamento de dados.

**Aceitação**

- [ ] Cada tarefa agendada aparece na posição/duração correspondente para os quatro zooms.
- [ ] Ao percorrer rapidamente 30+ tarefas, o nome da fase atual permanece visível e as tarefas independentes são identificáveis.
- [ ] Clicar numa barra abre exatamente o mesmo `GanttItemPanel` do modo completo.
- [ ] O modo completo conserva drag, resize, dependências, Ctrl+wheel e marcador de Hoje após alternar de volta.

**Dependências:** Tarefas 1–2. **Escopo:** M (3 ficheiros).

#### Tarefa 4: Aplicar a composição visual e responsiva

**Ficheiros prováveis**

- `client/src/components/gantt/GanttWorkspace.module.scss`
- `client/src/components/gantt/GanttSimpleTimeline.module.scss`

**Alteração**

- Ligar todas as superfícies, texto, bordas e focus aos tokens globais existentes. Respeitar o sistema dark do Gantt atual e a anatomia compacta HeroUI do `Button`.
- Ajustar breakpoints: 320–390 px mantém trigger ícone-only e scroll horizontal; tablet preserva cabeçalho e separador de fase sticky; desktop aproveita a largura para mostrar metadados sem criar uma tabela lateral. Aumento de target touch não deve aumentar a densidade desktop.
- Adicionar hover/selected/pressed curtos, sem deslocamento de layout; desativar transições em `prefers-reduced-motion`.

**Aceitação**

- [ ] Há hierarquia visível por superfícies, espaço e peso, não por linhas fortes.
- [ ] Focus visible é perceptível, não fica cortado e não depende de hover.
- [ ] Texto longo, cores de estado e zoom de browser 200% não sobrepõem controlos ou barras.

**Dependências:** Tarefa 3. **Escopo:** S (2 ficheiros).

### Checkpoint 2 — revisão com referência

- [ ] Capturar a timeline em 1440×900, 1024×768, 390×844 e 320×568, em Dia e Semana.
- [ ] Usar a imagem branca exclusivamente para comparar proporção, densidade, raio e hierarquia tipográfica; manter o canvas e superfícies no tema escuro atual.
- [ ] Validar tarefas resumo/fases, 30+ tarefas, tarefas sem fase ou responsáveis, intervalos muito curtos/longos, nomes longos e “Por agendar”.

### Fase 3 — Cobertura de regressão e acessibilidade

#### Tarefa 5: Estender o smoke test do Gantt

**Ficheiros prováveis**

- `client/tests/gantt-ui-smoke.cjs`

**Alteração**

- Verificar a presença e o estado `aria-pressed` de `gantt-timeline-toggle`.
- Alternar para timeline simples em Semana e Dia, confirmar que há barras, marcador de Hoje e que a seleção abre o painel correto; voltar ao Gantt e repetir a verificação já existente de zoom/drag.
- Usar selectors estáveis (`data-testid` e roles) em vez de classes de apresentação ou texto não traduzido.

**Aceitação**

- [ ] A troca de modo não quebra os contratos atuais de zoom por Ctrl+wheel, escala trimestral, fim de semana e persistência de drag/resize.
- [ ] O teste passa com `pt-PT` sem depender de pixels/screenshot como única asserção.

**Dependências:** Tarefas 1–4. **Escopo:** S (1 ficheiro).

#### Tarefa 6: Validar fluxo, teclado e desempenho percebido

**Ficheiros prováveis**

- Sem ficheiro obrigatório; só corrigir owners encontrados durante a validação.

**Alteração**

- Testar com mouse, teclado e touch/coarse pointer; confirmar o retorno de foco ao fechar o painel.
- Confirmar que alternar os modos não aciona escrita no servidor e que atualizar uma tarefa por socket atualiza a linha sem uma recarga de página.
- Inspecionar a cronologia com uma quantidade representativa de tarefas; se o DOM mostrar degradação, limitar a altura/virtualização só após medir, sem introduzir uma dependência por antecipação.

**Aceitação**

- [ ] `Tab`, `Enter`, `Space` e `Escape` completam o fluxo sem rato.
- [ ] Leitor de ecrã recebe nome/estado/datas úteis para trigger e cada tarefa.
- [ ] `prefers-reduced-motion` elimina animação não essencial.

**Dependências:** Tarefa 5. **Escopo:** XS–S.

## Critérios de aceitação finais

- [ ] O botão de Timeline simples está ao lado do seletor temporal e possui label, tooltip quando necessário, `aria-pressed` e estados hover/focus/disabled coerentes.
- [ ] O Gantt abre em modo completo e todos os seus comportamentos atuais ficam preservados.
- [ ] A Timeline simples reutiliza dados, permissões, traduções, painel de detalhe, cores e “Por agendar”; não acrescenta backend nem persistência.
- [ ] A timeline mostra uma leitura cronológica clara em Dia, Semana, Mês e Trimestre, incluindo Hoje e intervalos inclusivos corretos.
- [ ] Design escuro consistente com o Planka e ergonomia HeroUI, sem instalar HeroUI/Tailwind/React 19.
- [ ] Validação por hot reload em `http://localhost:3008`; não executar build local, conforme `AGENTS.md`.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Divergência de datas entre SVAR e a nova régua | Alto | Centralizar unidades, labels e cálculo inclusivo em funções puras com testes de fronteira. |
| A vista simples virar uma tabela redundante | Médio | Não mostrar colunas persistentes; limitar cada linha a título, estado, duração e faixa temporal. |
| Botão fica ambíguo em ecrã pequeno | Médio | Label dinâmico em desktop, ícone-only com tooltip e `aria-label` em mobile, `aria-pressed` em todos os tamanhos. |
| Modo alternativo desatualiza após socket | Alto | Alimentar ambos diretamente de `items`/`selectTimelineData`; não copiar dados para estado local. |
| Fases pouco visíveis em scroll longo | Médio | Separadores `summary` sticky, peso/contraste controlados e secção explícita para tarefas sem fase. |
| Muitas tarefas degradam scroll | Médio | Começar com linhas compactas de 40 px e separadores leves; medir primeiro e aplicar windowing/virtualização apenas se a quantidade real justificar, preservando foco e acessibilidade. |

## Fora de escopo nesta entrega

- Instalar HeroUI, migrar React/Semantic UI/Tailwind ou criar outro design system.
- Substituir o Gantt SVAR, reimplementar drag/resize/dependências na Timeline simples, alterar permissões ou modelo de dados.
- Persistir a preferência de vista, criar filtros/agrupamentos, mini-map, exportação, dependências visuais ou edição inline na nova vista.
- Redesign geral da toolbar, do painel de item ou da secção “Por agendar”.

## Decisão visual confirmada

A Timeline simples mantém obrigatoriamente o **tema escuro** do Planka/Gantt. A imagem branca é referência exclusiva para composição, espaçamento, raios das pílulas e hierarquia tipográfica; não autoriza uma superfície clara nesta vista.
