# Gantt: grupo → tarefa → subtarefa

Estado: implementado e validado localmente em 2026-09-11.
Data: 2026-09-11.

## Resultado pretendido

Permitir a hierarquia confirmada pelo utilizador, com três níveis visuais:

```text
3D Program                         [nível 1: grupo]
└─ Prism: finish and test…          [nível 2: tarefa]
   ├─ Preparar os testes           [nível 3: subtarefa]
   └─ Corrigir os resultados       [nível 3: subtarefa]
```

Os grupos e tarefas com filhos têm uma seta para expandir/recolher. Cada subtarefa tem nome, responsáveis, estado e planeamento próprios. O terceiro nível não permite adicionar outro nível.

## O que existe hoje

- `GanttItem.parentId` e a chave estrangeira `parent_id` já representam a relação entre itens. A migração existente permite tarefas como filhas de tarefas; não se prevê uma migração nova.
- Os controladores `gantt-items/create.js` e `update.js` só aceitam pais do tipo `summary`.
- `GanttItemPanel.jsx` só oferece grupos como pais e só mostra “Adicionar subtarefa” nos grupos.
- `ganttTimelineMapper.js` já transmite `parent` à biblioteca SVAR, mas só inicializa os grupos como abertos.
- `selectTimelineData` calcula os grupos através dos filhos diretos e exclui tarefas sem datas. É partilhado com o Dashboard TV.
- A base de dados elimina descendentes em cascata, mas `gantt-items/delete.js` só comunica os IDs do item e dos filhos diretos. O reducer já sabe remover todos os IDs recebidos e as respetivas dependências.
- O helper das tarefas dos cartões usa `parentTaskId` e é específico dessa estrutura. Não alterar essa API para acomodar o Gantt.

## Comportamento proposto

1. **Hierarquia:** grupos continuam na raiz; tarefas podem pertencer a grupos; subtarefas podem pertencer a essas tarefas. Preservar tarefas independentes já existentes. Uma tarefa independente também pode receber subtarefas, mas não uma cadeia adicional de tarefas: no máximo duas gerações de tarefas, com grupo opcional acima.
2. **Edição:** reutilizar o botão “Adicionar subtarefa” no painel da tarefa, preenchendo o pai automaticamente. No seletor “Pertence a”, mostrar os pais elegíveis com o caminho do grupo para distinguir nomes repetidos. Permitir reorganizar itens existentes entre pais válidos.
3. **Datas:** preservar as datas, o estado e os responsáveis próprios das tarefas existentes. Adicionar uma subtarefa não deve substituir esses valores nem movimentar automaticamente outras barras. O grupo passa a abranger as datas de todos os descendentes agendados.
4. **Pai sem datas:** quando uma tarefa sem datas tiver filhos agendados, mantê-la visível como agrupador com intervalo derivado dos filhos, sem gravar datas artificiais. A edição continua a mostrar que o seu planeamento próprio está por definir. Sem planeamento próprio nem descendentes agendados, continua disponível na área de itens por agendar.
5. **Duração:** manter a convenção atual de duração dos grupos e evitar somar novamente subtarefas já representadas pela tarefa-pai. Para um pai sem datas próprias, usar o intervalo derivado apenas na apresentação. Fixar estes exemplos nos testes antes de alterar o seletor.
6. **Interação:** expandir/recolher preserva a relação entre linhas e barras. Arrastar uma tarefa com datas próprias altera apenas essa tarefa; agrupadores com datas derivadas não são arrastáveis. Verificar o comportamento efetivo da versão SVAR instalada antes de ligar estes eventos.
7. **Eliminação:** confirmar o número total de descendentes a eliminar, tanto para grupos como para tarefas. Enviar todos os IDs eliminados aos clientes, incluindo as subtarefas do terceiro nível.

## Ordem de implementação

### 1. Validar a árvore no servidor

- Criar uma pequena utilidade específica do Gantt para percorrer `parentId`, obter descendentes e validar um pai, reutilizada por criação, atualização e eliminação.
- Rejeitar pais inexistentes ou de outro plano, autorreferência, ciclos, tipos incompatíveis e profundidade acima do limite.
- Numa mudança de pai, validar a profundidade da subárvore inteira: mover uma tarefa com filhos não pode empurrá-los para o quarto nível.
- Manter permissões e controlo de versão existentes. Garantir que validação e escrita não permitem ciclos através de alterações concorrentes; usar a transação e serialização por plano se necessário.
- Devolver um erro de hierarquia reconhecível pelo editor.

### 2. Adaptar o editor existente

- Em `GanttWorkspace.jsx` e `GanttItemPanel.jsx`, fornecer pais elegíveis, possibilidade de adicionar filhos e contagem total de descendentes.
- Mostrar “Adicionar subtarefa” nos grupos e tarefas elegíveis; ocultá-lo no último nível.
- Excluir o próprio item, os seus descendentes e pais que ultrapassem o limite do seletor.
- Reutilizar o formulário, os botões e as traduções existentes; acrescentar apenas os textos necessários para o novo seletor, erro e confirmação.

### 3. Adaptar a apresentação da árvore

- Em `ganttSelectors.js`, calcular os intervalos necessários a partir da árvore completa e incluir os antepassados necessários para mostrar subtarefas agendadas.
- Em `ganttTimelineMapper.js` e, se necessário, `GanttTimelineAdapter.jsx`, configurar expansão e barras sem converter permanentemente tarefas em grupos.
- Preservar o estado de expansão durante atualizações locais e por socket, usando os mecanismos existentes da biblioteca.
- Validar que alterações das barras não provocam escritas implícitas sobre pais ou filhos e que não duplicam a duração contabilizada.

### 4. Completar eliminação e compatibilidade

- Corrigir `gantt-items/delete.js` para recolher todos os descendentes antes da eliminação em cascata e incluí-los na resposta e no evento.
- Reutilizar `ganttStateReducer` e `GanttContext`, que já removem listas de IDs e ligações relacionadas.
- Preservar os vínculos existentes a cartões/tarefas de origem e as regras dos campos controlados pela origem. A hierarquia pedida é a do Gantt; a importação automática das subtarefas dos cartões fica fora deste plano.
- Verificar as dependências existentes e a sua apresentação quando um ramo é recolhido. Não introduzir reagendamento automático nesta alteração.

### 5. Validar no desenvolvimento local

- Testes focados do servidor: criar e mover subtarefas; rejeitar quarto nível, ciclos, autorreferência e pais de outro plano; eliminar grupo/tarefa com todos os descendentes; manter permissões e conflitos de versão.
- Alargar os testes existentes de `ganttSelectors`, mapper e estado com árvore de três níveis, pai sem datas, datas sobrepostas, subtarefa fora do intervalo próprio do pai e limpeza de dependências.
- Adaptar o smoke test de hierarquia existente para dados de teste dedicados, sem depender dos nomes antigos `te`/`tete`.
- Validar em `http://localhost:3008` por hot reload: criar, editar, mudar de pai, expandir/recolher e eliminar; recarregar para confirmar persistência; verificar um segundo cliente ligado por socket.
- Verificar também o Dashboard TV, porque partilha o seletor e o adaptador.
- Executar lint dos ficheiros alterados e `git diff --check`. Não executar build para esta validação local.

## Critérios de conclusão

- O exemplo `3D Program → Prism → subtarefa` funciona na lista e na timeline.
- O terceiro nível tem barra e campos próprios e não aceita filhos adicionais.
- Nenhum movimento cria ciclos ou ultrapassa a profundidade permitida, incluindo chamadas diretas à API.
- Pais necessários à hierarquia permanecem visíveis mesmo quando apenas os filhos têm datas.
- As datas próprias das tarefas existentes e os vínculos à origem são preservados.
- Eliminar um ramo remove todos os seus itens e dependências dos clientes ligados, sem exigir refresh.
- O Gantt atual de dois níveis e o Dashboard TV continuam funcionais.

## Limites desta entrega

Sem dependências novas, reformulação visual, migração prevista ou alterações de produção. Implementação autorizada pelo utilizador após aprovação deste plano. Preservar as alterações locais já presentes nos ficheiros de `scripts/codex-usage-bridge`.


## Validação realizada

- 21 testes do cliente: hierarquia, seletor, mapper, estado, diálogo e isolamento do Dashboard.
- 16 testes do servidor: hierarquia, permissões/versão, datas, sincronização da origem e importação.
- `gantt-hierarchy-api.cjs`: API real local e segundo cliente Socket.IO; criação, movimentos, rejeição de quarto nível/ciclos/pai de outro plano, versão desatualizada, concorrência e eliminação de descendentes/dependências. Passou.
- Browser Chrome em localhost: criação pelo painel, terceiro nível sem botão de adicionar filhos, mudança de pai, agrupador sem datas, expansão/recolha e preservação ao mudar zoom. Arrastar a tarefa alterou apenas as suas datas; a barra com datas derivadas ficou fixa.
- Dashboard TV local existente: Gantt carregado com os 19 itens planeados, usando o seletor e o adaptador partilhados.
- O desenho das barras usa agora o intervalo real entre início/fim; a coluna de duração mantém a convenção do grupo. Evita que a soma de durações encurte ou alongue a barra face às datas apresentadas.
- Smoke script atualizado para a fixture dedicada. As interações foram executadas nesta sessão através do browser controlado; o script Playwright autónomo não foi executado.
- Lint focado e `git diff --check` passaram. No painel foi preservada a indentação JSX preexistente; a regra de formatação desse ficheiro foi excluída do lint para evitar uma reformatação integral.
- Sem build, migração ou alteração de produção.
