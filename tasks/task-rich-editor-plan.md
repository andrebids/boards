# Plano mínimo: a própria tarefa como rich text

## Resultado pretendido

A tarefa continua a ser um único elemento, mas o texto simples é substituído pelo mesmo rich text dos comentários. Tarefas e subtarefas passam a aceitar formatação, emojis, links e imagens por picker, paste e drag-and-drop.

Não existe um campo ou painel separado de detalhes.

## O que já existe e será reutilizado

- `common/MarkdownEditor`: editor WYSIWYG/Markdown e toolbar.
- `EmojiToolbarButton` e `LazyEmojiPicker`: emojis.
- `common/Markdown`: renderização e sanitização.
- `comments/Comments/image-upload.js`: upload inline para anexos do cartão.
- `api.createAttachmentWithFile`: transporte do ficheiro.
- Processamento existente de imagens, thumbnails e HEIC/HEIF no servidor.
- `defaultEditorMode`: preferência atual do utilizador.
- Modelo, ações, sagas, sockets e endpoints atuais das tarefas.

Não será criado outro editor, uploader, sistema de anexos, biblioteca, endpoint ou tabela de associação.

## Única separação de dados necessária

Para o utilizador há apenas uma tarefa. Internamente são necessários dois valores:

| Campo | Função |
| --- | --- |
| `content` | Markdown mostrado e editado na própria tarefa |
| `name` | Resumo simples gerado automaticamente para Gantt, atividades e acessibilidade |

Guardar Markdown diretamente no `name` faria o Gantt e as atividades mostrarem `**texto**` e URLs de imagens. O campo `content` é a menor alteração que evita corrigir cada consumidor separadamente.

O servidor gera `name` a partir de `content` com uma função pequena e testada: remove sintaxe Markdown, mantém texto/emoji/alt da imagem, normaliza espaços e trunca a 1024 caracteres.

## Comportamento

- `Adicionar tarefa` e `Adicionar subtarefa` usam diretamente `MarkdownEditor`.
- Editar substitui a tarefa pelo mesmo editor inline.
- A tarefa fechada renderiza `content` com `Markdown`; registos antigos usam `name`.
- Imagens são anexos normais do cartão com `skipCover: true`, como nos comentários.
- Eliminar a tarefa não elimina imagens automaticamente.
- `Enter` escreve uma nova linha; `Ctrl/Cmd+Enter` ou o botão guarda.
- A criação múltipla implícita por várias linhas é removida, porque as linhas passam a pertencer ao rich text.
- Conteúdo extenso usa apenas CSS/`Mostrar mais` se o browser demonstrar que é necessário.
- O drag atual é mantido inicialmente; só será criado um handle próprio se o teste real mostrar conflito com links ou seleção.

## Implementação

### Tarefa 1: persistir o conteúdo rico

**Descrição:** Adicionar `task.content`, preencher tarefas existentes com `name` e gerar o resumo simples no servidor.

**Critérios de aceitação:**

- [ ] Tarefas antigas mantêm exatamente o conteúdo atual.
- [ ] Criar/editar aceita Markdown e devolve `content` e `name`.
- [ ] Gantt e atividades continuam a receber texto simples.

**Verificação:** teste pequeno do conversor Markdown → nome e testes focados de create/update.

**Ficheiros prováveis:**

- `server/db/migrations/<timestamp>_add_task_content.js`
- `server/api/models/Task.js`
- `server/utils/task-content.js`
- `server/api/controllers/tasks/{create,update}.js`
- `server/test/utils/task-content.test.js`

**Dependências:** nenhuma.

**Escopo:** médio.

### Tarefa 2: usar o editor existente na criação e edição

**Descrição:** Trocar `TextareaAutosize` por `MarkdownEditor` em `AddTask` e `EditName`, passando o mesmo emoji, modo e uploader já usados nos comentários.

**Critérios de aceitação:**

- [ ] Tarefa e subtarefa aceitam formatação, emoji e imagem.
- [ ] Picker, paste e drop usam o uploader existente.
- [ ] Erro de upload mantém o editor aberto e o rascunho intacto.

**Verificação:** reutilizar/ampliar o teste existente de `image-upload` e validar os dois formulários no hot reload.

**Ficheiros prováveis:**

- `client/src/components/task-lists/TaskList/AddTask.jsx`
- `client/src/components/task-lists/TaskList/AddTask.module.scss`
- `client/src/components/task-lists/TaskList/Task/EditName.jsx`
- `client/src/components/task-lists/TaskList/Task/EditName.module.scss`
- `client/src/components/comments/Comments/image-upload.js`

**Dependências:** tarefa 1.

**Escopo:** médio.

### Tarefa 3: renderizar rich text na própria tarefa

**Descrição:** Substituir `Linkify(task.name)` pelo `Markdown` existente, usando `task.content || task.name`.

**Critérios de aceitação:**

- [ ] Texto simples continua compacto.
- [ ] Formatação, links, emojis e imagens aparecem dentro da linha da tarefa.
- [ ] Checkbox, ações, nested e conclusão automática continuam corretos.

**Verificação:** browser com tarefa simples, tarefa rica, imagem, link, tarefa pai e subtarefa.

**Ficheiros prováveis:**

- `client/src/models/Task.js`
- `client/src/components/task-lists/TaskList/Task/Task.jsx`
- `client/src/components/task-lists/TaskList/Task/Task.module.scss`

**Dependências:** tarefas 1 e 2.

**Escopo:** pequeno.

### Tarefa 4: preservar conteúdo ao duplicar cartões

**Descrição:** Copiar `content` com a tarefa e, dentro do helper atual de duplicação, remapear URLs dos anexos duplicados.

**Critérios de aceitação:**

- [ ] Tarefas e subtarefas duplicadas mantêm o rich text.
- [ ] Imagens da cópia apontam para os anexos da cópia.
- [ ] Links externos não são alterados.

**Verificação:** um teste focado do helper de duplicação.

**Ficheiros prováveis:**

- `server/api/helpers/cards/duplicate-one.js`
- `server/test/utils/card-task-content-duplication.test.js`

**Dependências:** tarefa 1.

**Escopo:** pequeno.

### Tarefa 5: verificar o fluxo completo

**Descrição:** Validar apenas os comportamentos afetados e corrigir conflitos observados, sem adicionar abstrações preventivas.

**Critérios de aceitação:**

- [ ] Criar, editar, concluir, eliminar e promover filhos funciona com rich text.
- [ ] PNG/JPEG/GIF e HEIC real funcionam pelos métodos de upload existentes.
- [ ] Gantt, atividades, sockets e duplicação não mostram Markdown cru.

**Verificação:** testes focados, ESLint, `git diff --check` e browser em `http://localhost:3008`; sem build local.

**Dependências:** tarefas 1–4.

**Escopo:** pequeno-médio.

## Deliberadamente adiado

- Wrapper novo para o editor: adicionar apenas se surgir um terceiro consumidor com duplicação real.
- Novo drag handle: adicionar apenas se links/seleção entrarem em conflito no browser.
- Notificações específicas para menções em tarefas: implementar apenas se as menções forem pedidas explicitamente.
- Upload progress customizado: usar primeiro o comportamento do editor existente.
- Compatibilidade complexa entre versões antigas/novas: tratar no plano de deploy, não no primeiro incremento local.
- Nova relação tarefa–anexo e limpeza automática: desnecessária para o comportamento pedido.

## Ordem

1. Persistência mínima.
2. Reutilizar editor/uploader nos dois formulários.
3. Renderizar na tarefa.
4. Corrigir duplicação.
5. Validar no browser e só adicionar o que falhar realmente.
