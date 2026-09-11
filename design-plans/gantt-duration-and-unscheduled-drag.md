# Gantt: duração ligada às datas e arrasto de tarefas por agendar

Data: 2026-09-11.
Estado: implementado e validado localmente em 2026-09-11.

Atualização: a correção pedida pelo utilizador na tarefa “Corrigir contagem de fins de semana” substitui a convenção inicial por dias úteis (segunda a sexta), semana = 5 dias. A migração necessária é tratada nessa tarefa; este fluxo reutiliza a regra corrigida.

## Objetivo

Usar a duração introduzida tanto para agendar pelo painel como para arrastar uma tarefa de “Unscheduled” para uma data no Gantt. Os dois caminhos devem produzir exatamente o mesmo intervalo.

## Evidência na análise inicial (antes da implementação)

- `GanttItemPanel.jsx` separa estimativa e datas em modos exclusivos. Trocar de modo limpa as datas; definir o primeiro início repõe a duração em 1. O painel apresenta dias úteis apesar de guardar intervalos em dias corridos.
- `server/utils/gantt-dates.js`, através de `normalizeItemDates`, já calcula o fim com início e duração. A base de dados exige datas ambas presentes ou ambas ausentes e duração igual ao intervalo inclusivo em dias corridos.
- `GanttWorkspace.jsx` mostra a duração em Unscheduled, mas os itens apenas abrem o editor. O handler atual de alterações da timeline rejeita itens sem início.
- A timeline só é montada quando existem itens agendados; falta um destino para arrastar a primeira tarefa.
- `GanttContext.updateItem` já grava pela API, atualiza o estado com a resposta e recarrega os dados em caso de erro. O fluxo existente inclui sincronização por socket e controlo de versão.
- `GanttTimelineAdapter.jsx` usa SVAR 2.7.1. Já integra o arrasto interno e bloqueia alterações de barras derivadas e mudança de hierarquia. A documentação de `drag-task` descreve movimento de tarefas existentes, não comprova um destino de arrasto externo pronto a usar: https://docs.svar.dev/react/gantt/api/actions/drag-task/.

## 1. Um único bloco de planeamento

Substituir os separadores por duração sempre visível, seguida de início e fim opcionais. Reutilizar os campos, componentes e estilo atuais.

| Ação | Comportamento |
| --- | --- |
| Introduzir só duração | Guardar sem datas; continuar em Unscheduled |
| Escolher início | Calcular fim = adicionar duração − 1 dias úteis ao início |
| Alterar início | Manter duração e deslocar o fim |
| Alterar duração com início definido | Recalcular o fim |
| Alterar fim válido | Recalcular duração = contar dias úteis entre início e fim, inclusivamente |
| Remover agendamento ou limpar início | Limpar ambas as datas e preservar duração |
| Limpar apenas fim | Permitir edição temporária, mas exigir fim válido antes de guardar |

- Duração inteira, mínima de 1 dia. Datas com fim anterior ao início mostram erro e não são guardadas.
- Usar dias úteis em painel, barra, tooltip e arrasto; identificar essa convenção no bloco. Uma semana corresponde a 5 dias úteis.
- Se mantivermos o seletor de semanas, a conversão visual nunca arredonda ou modifica silenciosamente a duração guardada: intervalos que não sejam múltiplos de 5 voltam à apresentação em dias. A unidade é apresentação; a duração canónica continua em dias.
- Texto sem datas: “Define o início ou arrasta a tarefa para o Gantt para a agendar.”
- A ação “Remover agendamento” só surge quando há datas. No painel, as alterações persistem ao guardar, como atualmente.
- Itens com datas derivadas dos filhos mantêm a apresentação explicativa e não passam a aceitar duração/datas próprias por este fluxo.

## 2. Arrastar de Unscheduled para a timeline

1. Os itens elegíveis mostram indicação de arrasto quando o utilizador pode editar e o modo de edição está ativo. Clicar continua a abrir o painel, também acessível por teclado e em ecrãs táteis.
2. Ao arrastar sobre a área das datas, mostrar uma prévia do intervalo e as datas exatas. A posição horizontal determina o dia de início; a largura usa a duração guardada.
3. A conversão da posição para data respeita o scroll horizontal e o zoom atual, incluindo meses de comprimentos diferentes. Ajustar ao dia, mesmo nos zooms semana/mês/trimestre.
4. Largar numa área válida grava automaticamente o agendamento do item existente, usando a duração e a versão atuais. A posição vertical não altera pai, ordem ou responsáveis; a tarefa aparece na sua posição hierárquica normal.
5. Mostrar estado de gravação e impedir submissões duplicadas. Retirar de Unscheduled após confirmação do estado persistido; se necessário, expandir os antepassados para tornar a tarefa visível.
6. Escape, largar fora da timeline ou largar na tabela/cabeçalho cancela sem escrita. Limpar sempre a prévia no fim do gesto.
7. Em falha ou conflito de versão, usar o recarregamento existente e apresentar erro. Não deixar uma barra de prévia a representar uma gravação falhada; respeitar eventual agendamento concorrente recebido do servidor.

Exemplo de aceitação: tarefa com duração 3, largada em 14/09/2026 → início 14/09, fim 16/09. O painel deve produzir o mesmo resultado.

## 3. Permitir o primeiro agendamento por arrasto

Quando houver tarefas por agendar e nenhuma agendada, montar uma timeline vazia com um intervalo inicial em torno de hoje. Confirmar o suporte da versão instalada e definir limites explícitos se a escala automática não funcionar sem tarefas. Não criar tarefas fictícias.

Manter a mensagem de criação inicial quando não existir nenhuma tarefa. O Dashboard continua apenas como visualização, sem destino de arrasto externo.

## 4. Implementação mínima, por ordem

1. **Datas e painel:** reutilizar `addGanttBusinessDays` e `countGanttBusinessDays` em `client/src/utils/gantt-dates.js`, centralizando apenas as transições partilhadas necessárias. Remover `timeMode` e ligar os três campos em `GanttItemPanel.jsx`; ajustar estilos e traduções PT/EN.
2. **Persistência comum:** adaptar o fluxo de `GanttWorkspace.jsx` para aceitar o primeiro agendamento de um item elegível, mantendo permissões, versão e proteção de datas derivadas. Usar `updateItem` existente e a normalização do servidor; não criar endpoint novo.
3. **Destino de arrasto:** confirmar primeiro os tipos/código da versão SVAR instalada para converter coordenadas em datas e reutilizar as suas escalas. Se não houver entrada nativa para arrasto externo, usar o arrasto HTML do browser no workspace e um adaptador pequeno no `GanttTimelineAdapter`, sem uma nova biblioteca. Isolar qualquer acesso interno da SVAR nesse adaptador e cobri-lo com verificação no browser.
4. **Prévia e estado vazio:** implementar uma única conversão de coordenadas e cálculo de intervalo, usada pela prévia e pela gravação. Acrescentar os estados de cancelamento, gravação, erro e timeline sem tarefas agendadas.
5. **Verificação:** executar testes focados e validar o fluxo completo no serviço local por hot reload.

## 5. Validação e critérios de conclusão

- Testes de datas: duração 1/3/7, mudança de início, fim manual, remoção de datas, troca de unidade, fim de mês/ano e mudança de hora sem deslocar o dia.
- Testes da posição de drop: quatro zooms, scroll horizontal, meses com tamanhos diferentes e rejeição fora da área válida; prévia e resultado persistido iguais.
- Browser em `http://localhost:3008`: estimar → guardar → reabrir → definir início; arrastar uma tarefa estimada; agendar a primeira tarefa numa timeline vazia; reagendar pelo painel; cancelar e testar erro/conflito.
- Confirmar que a tarefa desaparece de Unscheduled e fica visível na hierarquia; recarregar e verificar num segundo cliente por socket.
- Confirmar que os pais derivados continuam protegidos, as subtarefas mantêm o pai, o clique não abre o painel após um arrasto e o modo de leitura não permite agendar.
- Verificar a alternativa pelo painel com teclado e num ecrã estreito, e a ausência de regressão no Dashboard que partilha o adaptador.
- Executar lint dos ficheiros alterados, testes existentes relevantes e `git diff --check`. Sem build para validação local.

## Limites

Esta entrega usa duração em dias úteis e não guarda uma estimativa original separada do período agendado. Não inclui calendários de feriados, distribuição automática pelos responsáveis, reagendamento de dependências ou arrasto de ramos inteiros. Sem dependências novas. Requer a migração de dias úteis já implementada pela tarefa coordenada. Preservar as alterações locais existentes na hierarquia e no painel. Nenhuma alteração de produção faz parte deste plano.


## Validação realizada

- 34 testes em 7 suites do cliente passaram: datas, coordenadas da timeline, hierarquia, seletor, mapper, estado e configuração do painel.
- ESLint passou nos componentes e helpers alterados nesta entrega. `git diff --check` sem erros de whitespace.
- Verificação adicional com `getDiffer` real da SVAR instalada: 1 460 combinações (365 dias de 2026 × quatro zooms), comparando o intervalo de drop com o helper do painel; todas passaram.
- Chrome autenticado em localhost: criar estimativa 3 sem datas; grelha vazia visível; arrastar a primeira tarefa; remover datas mantendo 3; editar duração/início/fim; converter 5 dias úteis em 1 semana sem alterar o valor guardado.
- Drops nos zooms diário e mensal: 14/09/2026–16/09/2026 para duração 3. Drop de duração 5 em 15/10 resultou em 21/10, atravessando o fim de semana. O zoom semanal também aceitou agendamento; o trimestral foi coberto pela verificação das escalas reais.
- Drop após scroll horizontal real de 164 px: coluna 15/10 → início 15/10 e fim 21/10. Largar no cabeçalho ou na tabela manteve o item por agendar.
- Persistência confirmada por reload. Um segundo cliente recebeu a criação e o agendamento por socket sem reload.
- Projeto local de evidência: `Gantt scheduling QA 11-09`, id `1861651271988020446`, com tarefas QA dedicadas. A tarefa de reordenação trabalhou entretanto em projeto separado; as respetivas alterações de código foram preservadas.
- A verificação visual foi feita na viewport real de 1920 px. A ferramenta de override não alterou a viewport para 320 px; não se afirma validação móvel. A alternativa pelo painel continua disponível. Falha de rede/conflito no gesto não foi simulada no browser; o fluxo reutiliza a recuperação existente de `updateItem`.
- Sem build, push ou deploy nesta tarefa. A migração e a prova da API de dias úteis foram realizadas na tarefa coordenada “Corrigir contagem de fins de semana”.
