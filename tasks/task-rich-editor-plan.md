# Plano de implementação: a própria tarefa como rich text

## Objetivo

Substituir o texto simples atual da tarefa pelo mesmo conteúdo rico usado nos comentários. O conteúdo visível da tarefa suporta formatação, emojis, links, listas, imagens, colar, drag-and-drop, seletor de imagens e, numa segunda etapa, menções com notificações.

Não haverá uma área separada de “detalhes”: o rich text é a própria tarefa, tanto na criação como na visualização e edição.

## Decisão de arquitetura

O conteúdo rico deve ser canónico, mas não deve ser gravado diretamente em `task.name`. O nome é consumido por Gantt, atividades, notificações, pesquisa e atributos acessíveis que precisam de texto simples.

| Campo | Utilização | Regra |
| --- | --- | --- |
| `content` | Conteúdo Markdown visível e editável da tarefa | Até 1 MB |
| `name` | Resumo simples gerado pelo servidor | Até 1024 caracteres |

Ao guardar `content`, o servidor gera `name` de forma determinística:

- converte menções para `@nome`;
- preserva o texto alternativo das imagens;
- remove marcadores e sintaxe Markdown;
- colapsa espaços e quebras de linha;
- trunca a 1024 caracteres;
- rejeita conteúdo do qual não seja possível obter um resumo não vazio.

O uploader deve inserir o nome do ficheiro como texto alternativo, permitindo que uma tarefa composta apenas por uma imagem continue a ter um nome útil no Gantt e na acessibilidade.

## Experiência de utilização

### Visualização

- A tarefa renderiza Markdown diretamente no lugar onde hoje aparece `task.name`.
- Texto curto continua visualmente tão compacto quanto agora.
- Conteúdo extenso tem um limite inicial de altura e a ação `Mostrar mais`; não existe um painel de detalhes separado.
- Imagens aparecem dentro da própria tarefa, responsivas e com altura máxima razoável; a versão completa abre através do comportamento existente de links/anexos.
- Checkbox alinha com a primeira linha do conteúdo; ações continuam no canto superior direito.
- A indentação e a linha hierárquica das subtarefas mantêm-se.

### Criação e edição

- `Adicionar tarefa` e `Adicionar subtarefa` abrem diretamente o editor usado nos comentários.
- Clicar no conteúdo ou escolher `Editar` substitui a renderização pelo editor inline na mesma posição.
- Emojis, toolbar, Markdown/WYSIWYG, imagens e erros têm o mesmo comportamento dos comentários.
- `Enter` cria parágrafos/listas; `Ctrl/Cmd+Enter` guarda. O botão de guardar continua disponível.
- A criação múltipla através de várias linhas deixa de ser implícita, porque quebras de linha passam a fazer parte de uma tarefa rica. Se continuar necessária, deve existir uma ação separada `Adicionar várias tarefas`.
- Um upload pendente bloqueia guardar; erro de upload não fecha o editor nem perde o rascunho.

### Arrasto e interações

O conteúdo passa a ter links, imagens, seleção de texto e controlos. Por isso, toda a superfície da tarefa já não deve ser o drag handle.

- Adicionar um pequeno handle de arrasto às tarefas que podem ser reordenadas.
- Aplicar `dragHandleProps` apenas ao handle.
- Links, imagens, toolbar e seleção de texto nunca iniciam drag nem alternam conclusão.
- Subtarefas mantêm as regras atuais de reordenação enquanto essas regras não forem alteradas explicitamente.

## Editor e upload partilhados

- Reutilizar `common/MarkdownEditor`, `EmojiToolbarButton`, menções e `common/Markdown`.
- Criar um wrapper comum dependente do cartão, por exemplo `CardMarkdownEditor`, com membros, modo preferido, token, uploads e erros.
- Generalizar `comments/Comments/image-upload.js` para um helper de imagem inline comum.
- Picker, paste e drag-and-drop convergem no mesmo `fileUploadHandler`.
- Imagens são anexos do cartão com `requestId` e `skipCover: true`; o Markdown guarda URL, nunca base64.
- O wrapper controla uploads concorrentes, erro local e disponibilidade do submit.

## Ciclo de vida dos anexos

Os anexos pertencem ao cartão, tal como acontece atualmente nos comentários:

- eliminar uma tarefa não elimina automaticamente as imagens;
- cancelar depois de carregar deixa a imagem disponível em `Anexos`;
- isto evita apagar um ficheiro que possa estar referenciado noutro conteúdo;
- ao duplicar um cartão, URLs internas no Markdown devem ser remapeadas para os IDs dos anexos duplicados.

## Compatibilidade

- Registos antigos sem `content` renderizam `name` como texto simples.
- A migração preenche `content = name` para tarefas existentes sem alterar o aspeto.
- Durante uma atualização transitória, o servidor aceita clientes antigos que enviam apenas `name` quando a tarefa ainda é simples.
- Um cliente antigo não pode sobrescrever silenciosamente uma tarefa rica; o servidor deve devolver conflito se receber uma alteração apenas de `name` para uma tarefa cujo `content` já diverge do nome simples.
- Gantt, atividades, notificações e webhooks continuam a consumir `name`.
- Sockets transportam também `content`, sem criar eventos novos.

## Dependências

```text
task.content + gerador de name simples
             |
             +--> modelo, API, sockets e duplicação

editor e uploader partilhados
             |
             +--> criar/renderizar/editar a tarefa rica
                           |
                           +--> menções e notificações
```

## Fase 1 — conteúdo canónico e compatibilidade

### Tarefa 1: adicionar `content` e gerar o nome simples

**Descrição:** Adicionar o campo Markdown à tarefa e um utilitário puro que produza o resumo usado pelos consumidores antigos.

**Critérios de aceitação:**

- [ ] A migração preserva tarefas existentes preenchendo `content` com o nome atual.
- [ ] Criar/atualizar aceita até 1 MB de Markdown e gera sempre `name` no servidor.
- [ ] Imagem com texto alternativo gera resumo; conteúdo sem qualquer representação textual é rejeitado.

**Verificação:** testes do gerador com texto, listas, links, emoji, menções, imagens e payloads vazios/maliciosos; teste focado da migração e controladores.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `server/db/migrations/<timestamp>_add_task_content.js`
- `server/api/models/Task.js`
- `server/utils/task-content.js`
- `server/api/controllers/tasks/create.js`
- `server/api/controllers/tasks/update.js`

**Escopo:** médio.

### Tarefa 2: integrar o contrato nos helpers e proteger clientes antigos

**Descrição:** Fazer criação e atualização persistirem `content` e `name` atomicamente e definir o comportamento compatível para pedidos antigos.

**Critérios de aceitação:**

- [ ] `taskCreate`/`taskUpdate`, webhooks e respostas incluem os dois campos.
- [ ] Atualização antiga de uma tarefa simples funciona; tentativa de substituir conteúdo rico apenas por `name` devolve conflito.
- [ ] Alterar formatação sem mudar o resumo ainda gera `taskUpdate`, sem criar uma falsa atividade de renomeação.

**Verificação:** testes dos helpers para cliente novo/antigo, conflito e socket; confirmar que o Gantt sincroniza apenas quando o resumo muda.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `server/api/helpers/tasks/create-one.js`
- `server/api/helpers/tasks/update-one.js`
- `server/api/controllers/tasks/create.js`
- `server/api/controllers/tasks/update.js`
- `server/test/utils/task-rich-content.test.js`

**Escopo:** médio.

### Tarefa 3: preservar conteúdo ao duplicar e no cliente

**Descrição:** Propagar `content` no modelo otimista e na duplicação, remapeando URLs internas de anexos para que a cópia não dependa do cartão original.

**Critérios de aceitação:**

- [ ] Estado otimista, rollback e sockets mantêm o Markdown completo.
- [ ] Duplicar cartão copia conteúdo de tarefas e subtarefas.
- [ ] URLs internas apontam para anexos duplicados; URLs externas permanecem intactas.

**Verificação:** testes de modelo/reducer, duplicação e remapeamento de URLs.

**Dependências:** tarefas 1 e 2.

**Ficheiros prováveis:**

- `client/src/models/Task.js`
- `client/src/models/Task.test.js`
- `server/api/helpers/cards/duplicate-one.js`
- `server/utils/remap-markdown-attachment-urls.js`
- `server/test/utils/card-task-content-duplication.test.js`

**Escopo:** médio.

### Checkpoint 1

- [ ] API nova e compatibilidade antiga verificadas antes de alterar a UI.
- [ ] Gantt, atividades, conclusão automática do pai e eliminação/promoção de filhos mantêm-se.
- [ ] Migração e rollback revistos antes de aplicar fora do desenvolvimento.

## Fase 2 — editor e imagens partilhados

### Tarefa 4: extrair o editor dependente do cartão

**Descrição:** Criar um wrapper reutilizável com modo preferido, membros mencionáveis, emoji, uploads e callbacks, mantendo `MarkdownEditor` como primitivo.

**Critérios de aceitação:**

- [ ] Comentários mantêm o comportamento atual depois da extração.
- [ ] Emoji e alternância WYSIWYG/Markdown não têm implementações duplicadas.
- [ ] O wrapper expõe upload pendente e erro sem fechar o consumidor.

**Verificação:** testes das funções puras de configuração/estado, teste existente do upload dos comentários, ESLint e smoke test via hot reload.

**Dependências:** nenhuma; pode avançar em paralelo com a fase 1.

**Ficheiros prováveis:**

- `client/src/components/common/CardMarkdownEditor/CardMarkdownEditor.jsx`
- `client/src/components/common/CardMarkdownEditor/card-markdown-editor-state.js`
- `client/src/components/common/CardMarkdownEditor/card-markdown-editor-state.test.js`
- `client/src/components/common/CardMarkdownEditor/index.js`
- `client/src/components/comments/Comments/Add.jsx`

**Escopo:** médio.

### Tarefa 5: unificar e endurecer o upload inline

**Descrição:** Generalizar o helper de comentários e garantir um único fluxo para picker, paste e drag-and-drop.

**Critérios de aceitação:**

- [ ] Apenas imagens válidas entram no Markdown; erros de rede, formato e tamanho aparecem junto ao editor.
- [ ] Upload usa `requestId`, `skipCover: true` e regista o anexo no Redux.
- [ ] O nome do ficheiro é inserido como texto alternativo; HEIC/HEIF usa a normalização existente.

**Verificação:** testes de sucesso, fallback, erro, concorrência e texto alternativo; teste manual dos três métodos.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `client/src/components/common/CardMarkdownEditor/inline-image-upload.js`
- `client/src/components/common/CardMarkdownEditor/inline-image-upload.test.js`
- `client/src/components/comments/Comments/image-upload.js`
- `client/src/components/comments/Comments/image-upload.test.js`

**Escopo:** pequeno-médio.

### Checkpoint 2

- [ ] Comentários continuam a funcionar sem regressões.
- [ ] Picker, paste e drop convergem no mesmo handler.
- [ ] Nenhum base64 é persistido e o rascunho sobrevive a falha de upload.

## Fase 3 — a tarefa visível torna-se rich text

### Tarefa 6: criar tarefas diretamente com o editor rico

**Descrição:** Substituir a textarea de criação pelo editor comum e enviar `content`; o servidor devolve o `name` derivado.

**Critérios de aceitação:**

- [ ] Tarefa e subtarefa aceitam texto formatado, emoji e imagens no próprio campo.
- [ ] `Ctrl/Cmd+Enter` ou o botão guarda apenas depois dos uploads; `Enter` cria conteúdo multilinha.
- [ ] O comportamento antigo de dividir linhas em várias tarefas deixa de ocorrer no editor rico.

**Verificação:** testes das funções puras de estado/atalhos e browser via hot reload.

**Dependências:** tarefas 2, 4 e 5.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/AddTask.jsx`
- `client/src/components/task-lists/TaskList/AddTask.module.scss`
- `client/src/components/task-lists/TaskList/task-editor-state.js`
- `client/src/components/task-lists/TaskList/task-editor-state.test.js`

**Escopo:** médio.

### Tarefa 7: renderizar e editar rich text inline

**Descrição:** Trocar `Linkify(task.name)` pelo renderizador Markdown e fazer a edição substituir o conteúdo na própria linha.

**Critérios de aceitação:**

- [ ] Tarefas simples mantêm a densidade visual atual; rich text e imagens aparecem diretamente na tarefa.
- [ ] Conteúdo longo pode expandir/recolher e imagens respeitam a largura/altura disponível.
- [ ] Guardar, cancelar, erro e socket remoto mantêm conteúdo e rascunho corretos.

**Verificação:** testes das transições puras de estado e browser com texto, lista, link, emoji e imagem.

**Dependências:** tarefas 3 e 6.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/Task/Task.jsx`
- `client/src/components/task-lists/TaskList/Task/Task.module.scss`
- `client/src/components/task-lists/TaskList/Task/EditName.jsx`
- `client/src/components/task-lists/TaskList/Task/RichTaskContent.jsx`
- `client/src/components/task-lists/TaskList/Task/rich-task-state.test.js`

**Escopo:** médio.

### Tarefa 8: separar drag de conteúdo interativo

**Descrição:** Mover o drag handle para um controlo próprio e proteger links, imagens, editor, seleção e checkbox contra eventos da linha.

**Critérios de aceitação:**

- [ ] Só o handle inicia reordenação.
- [ ] É possível selecionar texto, abrir links e usar a toolbar sem arrastar a tarefa.
- [ ] Teclado, foco, aria-label e ações no hover continuam funcionais em tarefa e subtarefa.

**Verificação:** browser com rato e teclado em desktop/viewport estreito; testes puros dos guards onde aplicável.

**Dependências:** tarefa 7.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/Task/Task.jsx`
- `client/src/components/task-lists/TaskList/Task/Task.module.scss`
- `client/src/components/task-lists/TaskList/Task/task-interactions.js`
- `client/src/components/task-lists/TaskList/Task/task-interactions.test.js`

**Escopo:** pequeno-médio.

### Tarefa 9: traduções e acabamento responsivo

**Descrição:** Adicionar textos de upload/erro/expansão e garantir que toolbar, picker e conteúdo rico cabem no modal.

**Critérios de aceitação:**

- [ ] PT-PT, PT-BR, EN-US e FR-FR têm todas as chaves novas.
- [ ] Emoji picker, toolbar e imagens não saem do modal ou viewport.
- [ ] Conteúdo sanitizado não altera ações, checkbox nem hierarquia nested.

**Verificação:** teste de traduções, `git diff --check` e browser nos viewports acordados.

**Dependências:** tarefas 7 e 8.

**Ficheiros prováveis:**

- `client/src/locales/pt-PT/core.js`
- `client/src/locales/pt-BR/core.js`
- `client/src/locales/en-US/core.js`
- `client/src/locales/fr-FR/core.js`
- estilos do editor/tarefa

**Escopo:** pequeno-médio.

### Checkpoint 3 — primeira versão utilizável

- [ ] A própria tarefa e subtarefa mostram e editam rich text, emoji e imagens.
- [ ] Duas sessões confirmam atualização por socket.
- [ ] Drag, conclusão, criação nested, eliminação/promoção e Gantt não regrediram.
- [ ] Rever visual e interação com o utilizador antes de ativar menções.

## Fase 4 — menções e validação final

### Tarefa 10: adicionar menções com notificação de tarefa

**Descrição:** Ativar membros no editor apenas quando o servidor puder gerar uma notificação própria de tarefa e um deep-link seguro.

**Critérios de aceitação:**

- [ ] Apenas menções novas a membros atuais notificam; autor e duplicados são excluídos.
- [ ] Notificação e email usam o resumo simples e identificam tarefa/cartão.
- [ ] O clique abre o cartão e realça a tarefa, degradando para o cartão se ela já foi eliminada.

**Verificação:** testes de extração/permissões/deduplicação, traduções, notificação e navegação; browser em duas sessões.

**Dependências:** tarefas 7 e 9.

**Ficheiros prováveis:** dividir em incrementos de servidor e cliente, com no máximo cinco ficheiros por incremento:

- `server/api/models/Notification.js`
- `server/api/helpers/tasks/{create-one,update-one}.js`
- `server/api/helpers/notifications/create-one.js`
- `client/src/components/notifications/NotificationsStep/Item.jsx`

**Escopo:** médio, dividido em dois incrementos.

### Tarefa 11: cobrir regressões, segurança e uploads reais

**Descrição:** Consolidar a validação do fluxo completo e os caminhos de erro antes de considerar a funcionalidade pronta.

**Critérios de aceitação:**

- [ ] PNG/JPEG/GIF e HEIC real funcionam; ficheiro inválido, excesso de tamanho e falha de rede preservam o rascunho.
- [ ] Markdown perigoso é sanitizado e permissões de tarefa/anexo são verificadas no servidor.
- [ ] Dados antigos, duplicação, cliente transitório, sockets e rollback da migração estão cobertos.

**Verificação:** suites focadas cliente/servidor, ESLint, `git diff --check` e browser em `http://localhost:3008`; não executar build salvo pedido explícito.

**Dependências:** todas as tarefas anteriores.

**Ficheiros prováveis:** testes colocados junto dos módulos alterados.

**Escopo:** médio.

### Checkpoint final

- [ ] Critérios funcionais, erros, acessibilidade, segurança e permissões estão cobertos.
- [ ] Migração, backup e rollback foram revistos.
- [ ] Bloqueios preexistentes das suites completas são reportados separadamente.
- [ ] Aprovação humana antes de merge, migração externa ou deploy.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Markdown aparecer no Gantt/atividades | Alto | `content` canónico e `name` simples sempre derivado no servidor. |
| Drag competir com links/editor | Alto | Handle de drag próprio; conteúdo deixa de ser handle. |
| Submeter durante upload | Alto | Contador de uploads ativos e submit bloqueado. |
| Perder rascunho | Alto | Fechar apenas após sucesso; preservar estado em erro/click-away. |
| Imagem sem resumo acessível | Alto | Nome do ficheiro como alt; servidor rejeita resumo vazio. |
| URLs quebrarem ao duplicar cartão | Alto | Remapear IDs internos no Markdown durante duplicação. |
| Imagens órfãs ao cancelar/apagar | Médio | Mantê-las como anexos do cartão; nunca apagar implicitamente. |
| Conteúdo tornar a lista demasiado alta | Médio | Limite visual com `Mostrar mais` e imagens com altura máxima. |
| XSS/URL inseguro | Alto | Sanitizador existente, validação de esquemas e testes maliciosos. |

## Fora do escopo inicial

- Um campo separado de descrição/detalhes.
- Apagar automaticamente anexos com a tarefa.
- Alterar a profundidade da hierarquia nested.
- Restaurar criação múltipla implícita por quebras de linha dentro do rich text.
- Executar build de produção durante validação local.

## Ordem recomendada

1. Tarefas 1–3: conteúdo canónico, resumo simples e compatibilidade.
2. Tarefas 4–5: editor/uploader comum sem regressão nos comentários.
3. Tarefas 6–9: tornar a própria tarefa rich text e aprovar a experiência.
4. Tarefas 10–11: menções, notificações e hardening.

## Decisões a aprovar antes da implementação

1. **Modelo:** `content` rico visível + `name` simples gerado internamente. Recomendado.
2. **Drag:** pequeno handle próprio em vez de arrastar por toda a tarefa. Necessário para conteúdo interativo.
3. **Conteúdo longo:** mostrar diretamente, com limite de altura e `Mostrar mais`. Recomendado.
4. **Atalhos:** `Enter` escreve; `Ctrl/Cmd+Enter` guarda; criação múltipla deixa de usar quebras de linha. Recomendado.
5. **Entrega:** implementar até ao Checkpoint 3, validar contigo, e só depois ativar menções. Recomendado.
