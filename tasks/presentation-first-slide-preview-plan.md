# Plano de implementação: criador e capa da apresentação no Kanban

## Objetivo

No quadro Kanban, apresentar uma única peça de navegação para a apresentação do próprio quadro:

- Sem apresentação e com permissão de edição, um criador pequeno e explícito, com uma ação: **Criar apresentação**.
- Com apresentação e miniatura disponível, apenas a imagem 16:9 do primeiro slide, clicável para abrir a apresentação desse quadro.

O resultado deve reutilizar a largura, escala, cores, foco e deslocação horizontal das listas Planka. Não cria uma nova página, coleção, rota ou editor.

## Plano de conclusão Ponytail (estado real em 2026-08-26)

O caminho funcional já existe no commit `b1cf909`: guardar o PPTX marca a preview como pendente, enfileira a versão, converte `PPTX -> PDF -> primeira página JPEG`, guarda a imagem no armazenamento privado, publica a atualização por socket e o tile pede o endpoint autorizado de preview.

O bloqueio confirmado no ambiente local é menor: o `Dockerfile` de produção já instala LibreOffice e Poppler, mas o `Dockerfile.dev` não. O job atual chegou ao worker e falhou com `spawn soffice ENOENT`. A tabela da fila existe; há um job falhado e duas apresentações locais com PPTX.

### Tarefa A: completar o runtime de desenvolvimento

**Descrição:** adicionar `libreoffice` e `poppler-utils` à lista existente de pacotes de `Dockerfile.dev`, espelhando apenas as dependências que o worker já invoca.

**Critérios de aceitação:**

- [ ] `soffice` e `pdftoppm` existem dentro de `planka-server`.
- [ ] O servidor inicia com o hook `project-presentation-preview` ativo.

**Verificação:** reconstruir/recriar apenas o container de desenvolvimento do servidor e executar `command -v soffice` e `command -v pdftoppm`. Não executar build do cliente.

**Dependências:** nenhuma. **Âmbito:** XS, um ficheiro (`Dockerfile.dev`).

### Tarefa B: reiniciar corretamente uma nova tentativa

**Descrição:** no `ON CONFLICT` de `project-presentation-preview/enqueue`, repor `attempts = 0` quando uma nova versão do PPTX volta a enfileirar a apresentação. Sem isto, um job anteriormente esgotado fica com o contador antigo.

**Critérios de aceitação:**

- [ ] Uma nova gravação substitui um job falhado por `pending` com zero tentativas.
- [ ] O teste focado da fila cobre essa reposição.

**Verificação:** executar apenas os testes de `project-presentation-preview` do servidor.

**Dependências:** nenhuma. **Âmbito:** S, helper e teste existente.

### Tarefa C: gerar e confirmar a capa real

**Descrição:** depois do novo container estar ativo, guardar uma vez cada apresentação local que ainda não tenha preview. Essa gravação reaproveita o fluxo normal e evita criar código permanente de backfill para dois registos.

**Critérios de aceitação:**

- [ ] O job termina em `ready` sem `ENOENT`.
- [ ] O endpoint privado devolve `image/jpeg` apenas a um utilizador autorizado.
- [ ] O tile troca o placeholder pelo primeiro slide sem recarregar o quadro.
- [ ] Uma falha de conversão continua a mostrar o placeholder e não bloqueia a gravação.

**Verificação:** logs do worker, estado do job, pedido autenticado ao endpoint e inspeção no Kanban por hot reload.

**Dependências:** tarefas A e B. **Âmbito:** validação, sem novo código.

### Deliberadamente fora deste incremento

- Backfill automático ou serviço adicional para apresentações antigas; adicionar apenas quando houver volume que torne impraticável guardar cada apresentação uma vez.
- Miniaturas de todos os slides, seleção manual de capa ou screenshots do iframe.

## Leitura de design

Produto de gestão visual, para utilizadores que já trabalham no Kanban, com linguagem escura, densa e funcional do Planka. Preservar o sistema existente, sem cards de marketing, gradientes, animação automática ou texto sobre a miniatura.

Parâmetros aplicados: variância 2, movimento 2, densidade 8. O único movimento é o feedback nativo de hover, foco e clique já usado no produto.

## Estado atual confirmado

- `ProjectPresentation.boardId` é único, logo a relação já é uma apresentação por quadro.
- O cliente já carrega as apresentações no `ProjectPresentationProvider` e já sabe criar uma por `POST /boards/:id/presentation`.
- O quadro já contém trabalho local não commitado para `PresentationBoardTile`; ele cria/abre a apresentação sem a colocar no `Droppable` das listas.
- O PPTX e a miniatura ficam privados em `project-presentations/<id>/...`; `documentData.preview` liga a imagem à versão atual do PPTX.
- A fila, o endpoint autorizado e o conversor já existem. O `Dockerfile` de produção inclui LibreOffice/Poppler, mas a imagem de desenvolvimento atual não; o OnlyOffice dentro do CryptPad continua fora deste fluxo.

## Decisões de produto e arquitetura

1. O tile mantém-se fora do `Droppable`. É navegação, não uma lista e nunca altera índices, placeholder ou drag-and-drop.
2. Depois de criar com sucesso, navegar imediatamente para `/projects/:projectId/presentation?board=:boardId`. Não exigir um segundo clique para começar a editar.
3. Uma apresentação pronta é uma capa sem texto visível: a imagem 16:9 do primeiro slide ocupa todo o tile. O link recebe `aria-label` e `title` para continuar compreensível por teclado e leitor de ecrã.
4. A imagem é derivada do PPTX persistido no servidor, em segundo plano, e é privada. Não usar canvas, screenshot ou conteúdo do iframe CryptPad como fonte.
5. Reutilizar `documentData` JSON para os metadados da miniatura, por exemplo `preview: { status, sourceFilename, filename, mimeType }`; não é necessária uma migração apenas para estes quatro campos.
6. Criar uma fila pequena e durável de preview, modelada na fila local já usada pelo processamento de vídeo. Cada trabalho fica ligado ao `presentationId` e ao `sourceFilename` imutável. Isto impede que uma conversão atrasada publique o slide de uma versão anterior.
7. Introduzir no ambiente de servidor a conversão explícita e limitada: LibreOffice headless para PDF e Poppler para renderizar apenas a página 1 como JPEG/WebP. A tarefa corre sem rede, com timeout, limite de tamanho e diretório temporário por job.

## Estados do tile

| Condição | Visual | Ação |
| --- | --- | --- |
| Não existe apresentação, editor | Tile compacto com ícone Planka e `Criar apresentação` | Cria uma apresentação e abre o editor do quadro |
| A criar | Mesmo tile, desativado e com feedback de progresso | Evita pedidos duplicados |
| Apresentação sem PPTX ou preview pendente | Capa neutra 16:9, sem simular um slide | Abre o editor; a fila continua em segundo plano |
| Preview pronto para o PPTX atual | Só a imagem do primeiro slide, sem faixa, título ou CTA visível | Abre a apresentação do quadro |
| Preview falhou definitivamente | Capa neutra, sem miniatura antiga | Abre o editor; a fila volta a tentar conforme política definida |
| Sem permissão de edição e sem apresentação | Não mostrar criador | Mantém as permissões atuais |

## Dependências

```text
upload/import/autosave de PPTX
        |
        +-- documentData atualizado com preview pendente
        |
        +-- fila persistida de preview
                |
                +-- conversor isolado (PPTX -> PDF -> página 1)
                |
                +-- imagem privada + documentData pronto + socket update
                        |
                        +-- ProjectPresentationProvider
                                |
                                +-- PresentationBoardTile no Kanban
```

## Tarefa 1: consolidar o tile de criação e abertura

**Descrição:** Ajustar o `PresentationBoardTile` já iniciado para ser o único ponto visual no Kanban. Reutilizar o provider e `makePathWithPresentationBoard`; quando `activate` resolver, navegar para a rota do quadro. No estado pronto, remover título, tipo e texto de abertura visíveis, deixando apenas a capa.

**Critérios de aceitação:**

- [ ] Um editor vê um tile de criação apenas se o quadro não tiver apresentação ativa.
- [ ] Criar produz uma única apresentação e abre-a automaticamente no quadro correto.
- [ ] Um deck com preview pronto mostra apenas a imagem 16:9 e abre pelo rato, Enter e teclado.
- [ ] Arrastar listas e cartões conserva os índices e o placeholder atuais.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationBoardTile.jsx`
- `client/src/components/presentation/PresentationBoardTile.module.scss`
- `client/src/components/presentation/presentationBoardTileState.js`
- `client/src/components/boards/Board/KanbanContent/KanbanContent.jsx`

**Dependências:** nenhuma.

## Tarefa 2: contrato e fila persistida de miniaturas

**Descrição:** Adicionar uma tabela de jobs de preview de apresentação e helpers de `enqueue` e `processDue`, seguindo a recuperação, tentativa, `FOR UPDATE SKIP LOCKED` e backoff da fila de vídeo existente. Ao guardar/importar um PPTX, marcar a preview como pendente e enfileirar a versão pelo nome de ficheiro gerado.

**Critérios de aceitação:**

- [ ] Cada nova versão de PPTX invalida a miniatura anterior antes de a nova ficar pública.
- [ ] Jobs duplicados para a mesma apresentação convergem para o ficheiro mais recente.
- [ ] Reiniciar o processo recupera jobs interrompidos e não publica uma imagem com `sourceFilename` desatualizado.
- [ ] A gravação do PPTX continua bem-sucedida mesmo que a miniatura falhe.

**Ficheiros prováveis:**

- `server/db/migrations/<timestamp>_add_project_presentation_preview_jobs.js`
- `server/api/models/ProjectPresentationPreviewJob.js`
- `server/api/helpers/project-presentation-preview/{enqueue,process-due,process-one}.js`
- `server/api/hooks/project-presentation-preview/index.js`
- `server/api/controllers/project-presentations/upload-file.js`
- `server/config/custom.js`

**Dependências:** tarefa 1 pode avançar em paralelo; esta tarefa vem antes da imagem real.

## Tarefa 3: renderização segura e armazenamento privado

**Descrição:** Executar a conversão no servidor/worker a partir do stream privado do file manager. Guardar apenas o primeiro slide com dimensão limitada no diretório isolado da apresentação, atualizar `documentData.preview` somente quando a origem ainda coincidir e apagar a imagem substituída. Estender a remoção de ficheiros da apresentação para incluir a capa.

**Critérios de aceitação:**

- [ ] Um PPTX válido gera no máximo uma imagem do primeiro slide na dimensão definida.
- [ ] Timeout, ficheiro malformado e erro de conversão não bloqueiam autosave, não deixam temporários e não expõem conteúdo nos logs.
- [ ] Uma conversão de versão antiga é descartada, sem sobrescrever a imagem da versão nova.
- [ ] Apagar um quadro/projeto remove PPTX, preview e jobs relacionados.

**Ficheiros prováveis:**

- `Dockerfile`
- `server/api/helpers/project-presentation-preview/process-one.js`
- `server/api/helpers/project-presentations/remove-related-files.js`
- `server/utils/project-presentation-file-path.js`
- testes focados de helpers e controlador

**Dependências:** tarefa 2.

## Tarefa 4: endpoint autorizado e atualização em tempo real

**Descrição:** Expor um endpoint de preview que reutiliza integralmente a verificação atual de projeto, board e utilizador de `download-file`. Devolver cache privada com um ETag/versão apenas para a imagem atual. Depois de atualizar `documentData.preview`, emitir `projectPresentationUpdate` para o provider já existente.

**Critérios de aceitação:**

- [ ] Só membros autorizados do quadro recebem a imagem; utilizadores externos recebem 404, como no PPTX.
- [ ] O tile passa de pendente a imagem pronta sem recarregar o quadro.
- [ ] Um thumbnail antigo não fica visível depois de o PPTX ser substituído.

**Ficheiros prováveis:**

- `server/config/routes.js`
- `server/api/controllers/project-presentations/download-preview.js`
- `server/api/helpers/project-presentations/present-one.js`
- `client/src/api/presentations.js` (apenas se o URL não puder ser derivado do id)
- `client/src/components/presentation/PresentationBoardTile.jsx`

**Dependências:** tarefas 2 e 3.

## Tarefa 5: validação focada por hot reload

**Descrição:** Cobrir a seleção dos estados do tile e os invariantes da fila e autorização. Validar manualmente o fluxo verdadeiro no ambiente de desenvolvimento, sem build local.

**Critérios de aceitação:**

- [ ] Testes puros do tile cobrem criar, pendente, pronto, erro e ausência de permissão.
- [ ] Testes de servidor cobrem enfileiramento, job obsoleto, autorização e limpeza.
- [ ] Em `http://localhost:3008`, verificar 320px, 768px, 1024px e 1440px, foco Tab/Enter, criação, atualização visual e drag-and-drop de listas.
- [ ] Não executar build: o projeto usa hot reload no desenvolvimento.

**Dependências:** tarefas 1 a 4.

## Checkpoints

### Após tarefa 1

- [ ] O criador é claro, requer só uma ação e mantém o Kanban nativo.
- [ ] A abertura é direta e DnD não regressou.

### Após tarefas 2 a 4

- [ ] Uma capa verdadeira é criada somente para o PPTX atual e permanece privada.
- [ ] Falhas de renderização degradam para uma capa neutra, sem impedir a edição.

### Final

- [ ] A aparência com preview é apenas o primeiro slide, sem texto sobreposto.
- [ ] Acessibilidade, permissões, armazenamento e limpeza foram validados.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Screenshot do iframe lento, cross-origin ou desatualizado | Não usar browser/iframe para gerar a imagem. Renderizar a versão persistida no worker. |
| Conversão bloqueia autosave | Fila persistida e assíncrona; o upload termina antes do render. |
| Job antigo publica imagem errada | Ligar cada job ao nome do PPTX e comparar a origem antes de publicar. |
| Nova superfície de acesso expõe ficheiros privados | Reutilizar a mesma verificação de acesso do download do PPTX; cache privada. |
| Pacotes de conversão tornam a imagem de produção pesada | Adicionar o custo ao Docker e medir o tempo de um deck pequeno e um grande antes de ativar em produção. |
| Trabalho local atual é substituído por engano | Integrar e rever os ficheiros não commitados existentes, sem os sobrescrever em bloco. |

## Fora do âmbito

- Miniaturas de todos os slides, galeria ou seleção de capa manual.
- Gerar preview no cliente, a partir de screenshots, ou carregar o CryptPad dentro do Kanban.
- Alterar modelo de permissões, associação por quadro ou navegação principal de Apresentações.
