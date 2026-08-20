# Plano de implementação: apresentações colaborativas com CryptPad

## Objetivo

Adicionar ao Planka uma apresentação colaborativa por projeto, ativável nas configurações gerais do projeto no mesmo local e com o mesmo padrão de interação do Gantt. Quando ativa, a funcionalidade aparece como um separador próprio do projeto e abre o editor `Presentation` do CryptPad incorporado no Planka. A apresentação conserva uma ligação visível ao projeto onde nasceu, pode inserir media já usada nesse projeto e mantém o chat existente do Planka como único canal de conversa. Vários utilizadores autorizados podem editar a mesma apresentação em tempo real; o Planka continua responsável por permissões, armazenamento do ficheiro e ciclo de vida da funcionalidade.

Este documento é um plano de implementação. Não instala o CryptPad nem altera a aplicação.

## Resultado da investigação de compatibilidade

**Veredito:** a integração é tecnicamente compatível, mas não é uma dependência que possa ser adicionada apenas ao `package.json`. Exige um serviço CryptPad separado, dois domínios em produção, TLS, proxy de WebSocket e os recursos cliente do OnlyOffice. O uso é exclusivamente interno e a aprovação OnlyOffice já foi obtida; o foco de decisão passa a ser isolamento operacional e não regressão no Planka.

| Área | Estado | Evidência e consequência |
| --- | --- | --- |
| Cliente Planka | Compatível | O Planka usa React 18.2, React Router 6.30 e Vite 6.3. O CryptPad é carregado através de `cryptpad-api.js` e substitui um contentor por um editor/iframe, sem partilhar dependências npm com o Planka. |
| Servidor Planka | Compatível com desenvolvimento adicional | Sails 1.5, PostgreSQL e o file manager existente conseguem suportar metadados, chaves e versões do `.pptx`; serão necessários endpoints dedicados e gravação atómica. |
| Docker local | Compatível | Docker 29.5.3 está disponível. O compose oficial do CryptPad expõe internamente 3000/3003; no desenvolvimento devem ser mapeados para 3010/3013 para não colidir com o Planka de produção, que já publica a porta 3000. |
| Produção | Compatível sob condição | CryptPad exige dois domínios/subdomínios, TLS e suporte de WebSocket. A configuração do proxy de produção de `boards.dsproject.pt` não está neste repositório e precisa de ser confirmada antes da instalação. |
| Execução em subpasta | Incompatível | A documentação afirma que o CryptPad não pode correr numa subpasta. Não usar `boards.dsproject.pt/cryptpad`; usar domínios próprios, por exemplo `slides.dsproject.pt` e `slides-sandbox.dsproject.pt`. |
| Presentation/OnlyOffice | Compatível sob condição | A aplicação Presentation não vem incluída na instalação base. É obrigatório instalar os recursos cliente do OnlyOffice com `CPAD_INSTALL_ONLYOFFICE=yes` e aceitar previamente a respetiva licença. Não é necessário executar o OnlyOffice Document Server. |
| Incorporação remota | Compatível sob condição | A instância tem de ser 2024.6 ou posterior e a opção **Remote embedding** tem de ser ativada em Administração > Security. |
| Persistência | Requer Planka | Na Integration API, o CryptPad apenas mantém a sessão colaborativa; a aplicação integradora guarda o ficheiro, as permissões e as chaves. O Planka tem de implementar `onSave` e `onNewKey`. |
| Biblioteca de media do Planka | Requer extensão controlada | A Integration API documentada não oferece callback para substituir ou ampliar o seletor nativo de upload/media. Para a biblioteca aparecer no fluxo **Inserir/Upload files**, é necessária uma ponte `postMessage` e um patch mínimo, versionado, na versão fixada do CryptPad; uma gaveta externa no Planka é apenas fallback. |
| Chat | Compatível sob validação | O OnlyOffice suporta `document.permissions.chat = false`, mas é necessário provar no spike se o CryptPad encaminha esta opção. Se não encaminhar, o mesmo patch mínimo remove/desativa o chat interno. O ChatLauncher/ChatDock do Planka permanece disponível. |
| Licenças | Registo técnico interno | O servidor CryptPad é AGPL-3.0-or-later e os exemplos da Integration API são MIT. Como o uso é exclusivamente interno e OnlyOffice está aprovado, não bloqueia o desenvolvimento. Qualquer patch CryptPad fica versionado e disponível à equipa que usa o serviço. |

## Fontes oficiais verificadas

- Instalação e requisitos do CryptPad 2026.5: https://docs.cryptpad.org/en/admin_guide/installation.html
- Integration API, armazenamento, autosave e gestão de chaves: https://github.com/cryptpad/cryptpad-api-examples
- Compose oficial e volumes: https://github.com/cryptpad/cryptpad/blob/main/docker-compose.yml
- Relação entre CryptPad e OnlyOffice: https://docs.cryptpad.org/en/FAQ.html#what-is-the-relationship-between-cryptpad-and-onlyoffice
- Funcionalidades e limitações de Presentation: https://docs.cryptpad.org/en/user_guide/apps/presentation.html
- Licença do CryptPad: https://github.com/cryptpad/cryptpad
- Release estável atual investigada, 2026.5.1: https://github.com/cryptpad/cryptpad/releases/tag/2026.5.1
- Permissões do editor OnlyOffice, incluindo desativação do chat: https://api.onlyoffice.com/docs/docs-api/usage-api/config/document/permissions/

### Discrepância encontrada na documentação

A página de instalação está identificada como documentação 2026.5.0, mas alguns exemplos de clone ainda mostram a tag `2025.12.0`. A página de releases identifica `2026.5.1` como a versão estável mais recente e essa correção inclui um problema de corrupção nas aplicações Office. A implementação deve, por isso, fixar a imagem `cryptpad/version-2026.5.1` e o respetivo digest, nunca `latest`, depois de confirmar que a tag existe no registry durante o spike de infraestrutura.

## Decisões de produto

- A ativação fica em `ProjectSettingsModal > GeneralPane`, imediatamente depois do bloco Gantt, visível às mesmas pessoas que podem gerir o Gantt.
- A funcionalidade nasce desligada por defeito. Falha, indisponibilidade ou remoção do CryptPad não altera boards, cartões, anexos, chat, autenticação nem rotas existentes do Planka.
- O controlo é um toggle separado com o texto **Disponibilidade da apresentação**.
- Desativar oculta a apresentação sem apagar ficheiro, chaves ou histórico, tal como o Gantt preserva os seus dados.
- A funcionalidade tem rota própria, irmã do Gantt: `/projects/:id/presentation`.
- Quando ativa, o separador **Apresentação** aparece na barra de separadores do projeto, imediatamente depois de Gantt e antes do botão para adicionar quadro.
- O MVP contém uma apresentação por projeto. Várias apresentações por projeto ficam fora deste plano.
- Gestores do projeto e administradores podem ativar/desativar. Para cumprir o objetivo colaborativo, membros com permissão de edição no projeto recebem a chave de edição; utilizadores apenas de leitura recebem exclusivamente a chave de visualização.
- A interface usa o idioma atual do Planka e passa o nome do utilizador ao editor colaborativo.
- O workspace mostra sempre o projeto de origem e uma ação clara para regressar a esse projeto.
- A biblioteca **Media do projeto** reúne fundos do projeto, capas visuais dos cartões dos boards visíveis e uploads feitos diretamente para a apresentação.
- O upload do PC usa o `FilePicker`, receção, processamento, limites, miniaturas, video processing e file manager já usados pelos anexos dos boards; não cria um serviço de ficheiros CryptPad nem uma cópia adicional do ficheiro no armazenamento Planka.
- Ao escolher media existente ou fazer upload, os bytes são incorporados no `.pptx`; esta cópia interna do deck é inevitável e permite que o slide sobreviva se a origem for apagada, mas não se duplica o blob-fonte no Planka.
- O chat do CryptPad/OnlyOffice fica desativado. A conversa continua no ChatLauncher/ChatDock e na conversa geral do projeto já existentes no Planka, sem criar mensagens, notificações ou unread counts paralelos.
- Macros e plugins OnlyOffice ficam fora do âmbito; o próprio CryptPad desativa-os por razões de segurança.

## Arquitetura proposta

```text
Browser do utilizador
  |
  +-- Planka React em boards.dsproject.pt
  |     |-- autenticação e permissões
  |     |-- ligação ao projeto, biblioteca de media e chat Planka
  |     |-- GET do snapshot .pptx -> Blob URL local
  |     |-- PUT do Blob recebido em onSave
  |     `-- edit key ou view key conforme a permissão
  |
  `-- cryptpad-api.js em slides.dsproject.pt
        |-- editor Presentation em iframe
        |-- UI isolada em slides-sandbox.dsproject.pt
        `-- sessão colaborativa encriptada via WebSocket

Planka Sails/PostgreSQL
  |-- metadados e estado de ativação
  |-- catálogo autenticado de fundos e capas acessíveis
  |-- chaves edit/view cifradas em repouso
  `-- ficheiro .pptx no file manager/volume de attachments

CryptPad container
  |-- aplicação e WebSockets
  |-- recursos cliente OnlyOffice
  `-- volumes próprios de configuração e dados
```

O CryptPad corre num compose/serviço isolado, sem acesso direto à PostgreSQL do Planka. O Planka comunica apenas pelos endpoints de Presentation e pela API do browser; continua a ser dono da autenticação, dos projetos e dos ficheiros. Não se altera o núcleo do Gantt, boards, cartões ou chat para introduzir esta funcionalidade.

### Porque o ficheiro entra no editor através de Blob URL

A Integration API aceita uma URL do documento. O cliente Planka deve primeiro descarregar o `.pptx` por um endpoint same-origin autenticado e criar `URL.createObjectURL(blob)`. Assim, o iframe não precisa de receber cookies do Planka nem de aceder diretamente a um endpoint autenticado cross-origin. No `onSave`, o editor devolve um `Blob`, que o cliente envia para o Planka com a sessão normal. O Blob URL é revogado ao desmontar o workspace.

### Responsabilidades de cada serviço

**Planka:** ativação, autorização, ligação ao projeto, catálogo de media, chat, separação edit/view, armazenamento permanente, tamanho máximo, chaves da sessão, rotação, auditoria e eventos socket de estado.

**CryptPad:** editor de slides, sincronização colaborativa temporária, cifragem no browser, emissão dos callbacks da Integration API e ponte mínima para pedir/inserir media do anfitrião. O seu chat interno fica desativado.

O CryptPad não substitui a base de dados nem o armazenamento do Planka neste modo de integração.

## Ligação ao projeto, biblioteca de media e chat

### O que o Planka já permite reutilizar

O modelo `Board` não tem um campo de capa. No estado atual do repositório, há duas fontes reais de media que correspondem ao pedido:

| Fonte | Dados existentes | Uso na biblioteca |
| --- | --- | --- |
| Fundos do projeto | `BackgroundImage` pertence a `Project` e já expõe original e miniatura `outside360`. | Secção **Fundos do projeto**, incluindo o fundo atualmente escolhido como capa visual do projeto. |
| Capas dos cartões | `Card.coverAttachmentId` aponta para `Attachment`; anexos de imagem/vídeo já têm URLs e miniaturas autenticadas. | Secção **Capas dos boards**, agrupada por board e identificada com board/cartão de origem. |

A pesquisa é feita ao abrir a biblioteca, com paginação e deduplicação. Um gestor/admin vê todos os boards do projeto; um membro normal vê apenas media dos boards aos quais já tem acesso. Não se cria uma permissão lateral que permita descobrir nomes, thumbnails ou ficheiros de boards privados.

### Integração com Inserir/Upload files

A API pública do CryptPad não documenta um evento para o anfitrião fornecer media ao seletor nativo. Como o editor está num iframe cross-origin, o Planka também não pode alterar esse modal por DOM/CSS. O plano assume, portanto, um patch pequeno e mantido sobre a versão fixada do CryptPad:

1. O comando **Media do projeto** aparece no fluxo de inserir/upload do editor.
2. O CryptPad envia ao anfitrião um pedido `postMessage` com nonce e origem estritamente validados.
3. O Planka abre a biblioteca autenticada do projeto e devolve apenas o item escolhido como `Blob`/`ArrayBuffer` e MIME type.
4. A ponte manda o editor inserir os bytes no documento e limpa referências temporárias.
5. O ficheiro fica incorporado no deck; apagar depois o fundo/anexo original não quebra a apresentação.

O spike deve primeiro procurar um hook interno estável na versão fixada. Se ele não existir, o patch fica em `infra/cryptpad/patches`, com teste de contrato e instruções de rebase. Uma gaveta Planka ao lado do editor é fallback apenas se a manutenção desse patch não for aprovada; não satisfaz exatamente o pedido de aparecer em Upload files.

### Um único chat: o do Planka

- Passar `document.permissions.chat = false` se o CryptPad o encaminhar para o OnlyOffice; caso contrário, aplicar a desativação no patch/configuração CryptPad.
- Manter `ChatProvider`, `ChatLauncher` e `ChatDock` ativos na rota `/projects/:id/presentation`.
- Garantir que a nova rota continua a resolver `projectId`, para a navegação de chat existente conservar o workspace e abrir a conversa geral do projeto.
- Pode existir uma ação **Chat do projeto** no cabeçalho do workspace que invoque `openGeneralConversation`; ela reutiliza integralmente mensagens, permissões, notificações e contagens não lidas do Planka.

## Topologia de instalação

### Desenvolvimento local

- Manter os serviços Planka existentes em `http://localhost:3008` e `http://localhost:1337`.
- Executar o CryptPad num compose separado para permitir arranque, atualização e remoção independentes.
- Mapear `3010:3000` para o domínio principal e `3013:3003` para o sandbox.
- Configurar:
  - `CPAD_MAIN_DOMAIN=http://localhost:3010`
  - `CPAD_SANDBOX_DOMAIN=http://localhost:3013`
  - `CPAD_INSTALL_ONLYOFFICE=yes`
  - `CPAD_CONF=/cryptpad/config/config.js`
- Persistir `blob`, `block`, `data`, `datastore`, `customize`, `onlyoffice-dist`, `onlyoffice-conf` e `config.js`.
- Ativar Remote embedding e autorizar a origem `http://localhost:3008` através da configuração suportada pela versão fixada.

### Produção

- Reservar dois nomes DNS, propostos:
  - `slides.dsproject.pt`
  - `slides-sandbox.dsproject.pt`
- Emitir certificado TLS que cubra ambos.
- Usar Nginx estável e partir da configuração oficial básica do CryptPad, incluindo WebSocket e cabeçalhos CSP do sandbox.
- Não publicar as portas 3000/3003 diretamente na Internet; ligá-las apenas ao proxy/rede interna.
- Manter CryptPad num serviço/compose separado do ciclo de release do Planka.
- Fixar a versão e digest da imagem.
- Executar `https://slides.dsproject.pt/checkup/` após a instalação e após cada atualização.
- Fazer backup dos volumes CryptPad e do armazenamento de apresentações do Planka antes de atualizar.

## Modelo de dados proposto

Tabela `project_presentation`:

| Campo | Finalidade |
| --- | --- |
| `id` | Identificador interno. |
| `project_id` | Relação única com o projeto; cascade delete. |
| `is_enabled` | Controla visibilidade sem apagar conteúdo. |
| `title` | Nome apresentado e usado na exportação. |
| `file_reference_id` | Referência para o ficheiro `.pptx` permanente no file manager. |
| `file_name`, `mime_type`, `size_in_bytes` | Metadados e validação do snapshot atual. |
| `edit_key_ciphertext`, `view_key_ciphertext` | Chaves CryptPad cifradas em repouso; nunca regressam juntas a clientes read-only. |
| `key_version` | Controlo otimista/compare-and-swap na rotação de chaves. |
| `document_version` | Incrementado apenas depois de uma gravação atómica bem-sucedida. |
| `created_by_user_id`, `updated_by_user_id` | Auditoria. |
| `created_at`, `updated_at` | Auditoria temporal. |

Não guardar chaves em logs, eventos socket, analytics ou URLs. A cifra em repouso deve usar uma chave de aplicação dedicada, diferente de passwords e configurada por `PRESENTATION_KEY_ENCRYPTION_SECRET`.

Tabela `project_presentation_media`:

| Campo | Finalidade |
| --- | --- |
| `id`, `project_presentation_id` | Identidade e pertença à apresentação/projeto. |
| `file_reference_id`, `filename`, `mime_type`, `size_in_bytes` | Uma única referência ao blob guardado pelo file manager do Planka e os metadados para o apresentar. |
| `image`, `video` | Metadados e miniaturas produzidos pelo pipeline já usado nos anexos. |
| `created_by_user_id`, `created_at` | Auditoria e controlo de autoria. |

Esta tabela existe apenas para organizar uploads próprios da apresentação. Não duplica `Attachment`, não obriga a criar um cartão artificial e reutiliza o helper de processamento de upload existente. As fontes já presentes nos boards são lidas diretamente dos seus `Attachment`, sem cópia no storage do Planka.

## Contrato de API proposto

| Método e rota | Uso | Permissão |
| --- | --- | --- |
| `GET /api/projects/:projectId/presentation` | Estado, metadados e capabilities do utilizador. | Membro relacionado com o projeto. |
| `POST /api/projects/:projectId/presentation` | Criar ou reativar. | Mesma regra de gestão do Gantt. |
| `POST /api/project-presentations/:id/disable` | Ocultar sem apagar. | Mesma regra de gestão do Gantt. |
| `GET /api/project-presentations/:id/file` | Obter o `.pptx` atual ou template inicial. | View ou edit. |
| `PUT /api/project-presentations/:id/file` | Gravar Blob do `onSave`. | Edit. |
| `POST /api/project-presentations/:id/session-key` | Compare-and-swap de `old`, `new` e `view` vindo de `onNewKey`. | Edit; resposta filtrada por capability. |
| `POST /api/project-presentations/:id/rotate-key` | Invalidar chave guardada após alteração de acessos. | Gestor/admin ou helper interno. |
| `GET /api/projects/:projectId/presentation-media` | Catálogo paginado de fundos do projeto e capas de cartões, com origem e thumbnails. | Apenas fontes pertencentes a boards que o utilizador pode ver. |
| `POST /api/projects/:projectId/presentation-media` | Upload do PC para a biblioteca da apresentação, usando o pipeline de anexos/file manager existente. | Edit. |
| `GET /api/projects/:projectId/presentation-media/:sourceType/:sourceId/file` | Entregar os bytes do item escolhido para incorporação no deck, ou redirecionar internamente para o presenter autenticado existente. | Revalidar projeto, board e media em cada pedido. |
| `DELETE /api/project-presentation-media/:id` | Remover um upload próprio da biblioteca e libertar o blob apenas quando já não tiver referências. | Edit ou criador, conforme regra final. |

O endpoint de configuração nunca envia `editKey` a um utilizador read-only. A `viewKey` real é obrigatória: a documentação alerta que abrir `mode: "view"` com a chave de edição apenas bloqueia a interface e pode ser contornado na consola.

## Fluxos principais

### Ativar

1. Gestor abre Configurações do projeto > Geral.
2. Liga **Disponibilidade da apresentação**, junto do Gantt.
3. O servidor cria ou reativa `project_presentation` e emite `projectPresentationUpdate` aos membros relacionados.
4. O separador Apresentação aparece sem recarregar a página.

### Primeira abertura

1. O Planka obtém estado/capabilities.
2. Descarrega o template `.pptx` em branco como Blob.
3. Carrega `cryptpad-api.js` uma única vez.
4. Inicializa `window.CryptPadAPI` com `documentType: "presentation"`, idioma, nome, modo, autosave, `onSave`, `onNewKey`, `onHasUnsavedChanges` e `onUserlistChange`.
5. O CryptPad gera o primeiro par edit/view; o Planka guarda-o por compare-and-swap e devolve ao callback a chave vencedora.

### Colaboração e autosave

1. Todos os editores recebem a mesma chave de edição atual.
2. O CryptPad sincroniza as alterações em tempo real.
3. Após o intervalo de inatividade, um cliente recebe `onSave(file, callback)`.
4. O cliente envia o Blob para o Planka.
5. O servidor valida tipo/tamanho, grava para um caminho temporário, troca atomicamente o snapshot e incrementa `document_version`.
6. Só depois de sucesso o cliente chama `callback`; se falhar, o CryptPad volta a tentar.

### Inserir media do projeto

1. O utilizador escolhe **Media do projeto** no fluxo Inserir/Upload files do editor; pode selecionar uma origem existente ou **Carregar do computador**.
2. A ponte valida `origin`, `nonce`, apresentação e projeto antes de abrir o seletor Planka.
3. Um upload do PC passa pelo `FilePicker` e pelo mesmo receiver/file manager, processamento de MIME, limites e miniaturas dos anexos atuais; fica uma vez em `project_presentation_media`.
4. O catálogo mostra fundos, capas e uploads próprios apenas dos boards/fontes que esse utilizador pode consultar.
5. Ao selecionar, o Planka volta a verificar a permissão, descarrega os bytes pela sessão autenticada e entrega-os à ponte sem expor cookies ao iframe.
6. O editor incorpora os bytes no `.pptx`; o resultado fica sujeito ao autosave normal.

### Conversar durante a edição

1. O chat interno CryptPad/OnlyOffice não é apresentado nem recebe dados.
2. O ChatLauncher/ChatDock global do Planka continua ativo no workspace Presentation.
3. **Chat do projeto** abre a conversa geral do projeto através do `ChatContext` existente, sem sair da apresentação.

### Desativar

1. Gestor desliga o toggle no mesmo local do Gantt.
2. O servidor muda apenas `is_enabled` e emite evento.
3. O separador desaparece; utilizadores que tenham a rota aberta regressam ao projeto/quadro.
4. O ficheiro e as chaves permanecem para uma futura reativação.

### Alteração ou revogação de acesso

1. Uma alteração de membros dispara rotação/invalidação da chave guardada.
2. O servidor emite um evento para os clientes ativos recarregarem a sessão.
3. Novos acessos recebem apenas a chave atual adequada à permissão.
4. O plano não promete expulsão criptográfica instantânea de um utilizador que já tenha a chave enquanto a sessão antiga continuar viva; este limite da Integration API deve ser documentado e testado.

## Fases de implementação

### Fase 0 — gates de infraestrutura e isolamento

- [ ] Confirmar quem gere DNS, TLS e proxy de `dsproject.pt`.
- [ ] Confirmar disponibilidade dos dois subdomínios.
- [ ] Registar que o uso é interno e que OnlyOffice foi aprovado; guardar o patch CryptPad versionado para a equipa.
- [ ] Confirmar capacidade mínima: 2 CPUs, 2 GB RAM e pelo menos 20 GB, mais margem para recursos OnlyOffice e documentos.
- [ ] Confirmar que o compose CryptPad não usa rede, volumes, variáveis ou credenciais da PostgreSQL/Redis do Planka.

### Fase 1 — spike de instalação e Integration API

- [ ] Subir CryptPad 2026.5.1 localmente, com volumes e OnlyOffice persistentes.
- [ ] Ativar apenas Presentation e Remote embedding.
- [ ] Validar `/checkup/`, carregamento de `cryptpad-api.js`, sandbox e WebSocket.
- [ ] Demonstrar dois browsers a editar o mesmo `.pptx` e receber um Blob em `onSave`.
- [ ] Determinar o hook interno mínimo para pedir/inserir media do anfitrião e provar a troca segura por `postMessage`.
- [ ] Provar se `document.permissions.chat = false` é encaminhado; se não for, provar a desativação no patch mínimo.
- [ ] Validar Chrome/Edge e Firefox; Safari apenas se fizer parte dos browsers suportados pelo produto.

**Gate:** não criar schema nem UI definitiva enquanto o spike não provar `presentation`, `onSave`, `onNewKey`, edit key, view key, inserção de media do anfitrião e ausência do chat interno no ambiente real.

### Fase 2 — primeira fatia vertical no Planka

- [ ] Criar schema/modelo e acesso de apresentação.
- [ ] Criar show/activate/disable e socket update.
- [ ] Adicionar o toggle imediatamente junto do Gantt.
- [ ] Fazer o separador aparecer/desaparecer por hot reload, ainda com um workspace placeholder.
- [ ] Executar regressão focada de boards, cartões, anexos, Gantt e chat antes de ligar o editor real.

### Fase 3 — ficheiro, chaves e editor

- [ ] Adicionar template inicial e armazenamento atómico do `.pptx`.
- [ ] Implementar gestão cifrada e compare-and-swap das chaves.
- [ ] Criar o adaptador da Integration API e workspace.
- [ ] Criar o catálogo autenticado de fundos/capas/uploads da apresentação e a ponte versionada de inserção no editor.
- [ ] Manter o chat Planka no workspace e desativar o chat CryptPad/OnlyOffice.
- [ ] Ligar autosave, estado de alterações, lista de colaboradores e modo read-only real.

### Fase 4 — hardening e produção

- [ ] Rodar testes de concorrência, permissões, revogação e recuperação de falhas.
- [ ] Adicionar métricas/logs sem conteúdo nem chaves.
- [ ] Documentar instalação, backup, atualização e rollback.
- [ ] Instalar atrás de Nginx/TLS, executar checkup e canário multiutilizador.

## Índice de tarefas

Os critérios de aceitação, verificações, dependências e ficheiros prováveis estão detalhados em `tasks/cryptpad-presentation-todo.md`.

1. Gate de isolamento, DNS, TLS e capacidade.
2. Compose local CryptPad fixado e persistente.
3. Spike da Integration API com Presentation.
4. Modelo, acesso e endpoints de ativação.
5. Toggle e separador junto do Gantt.
6. Armazenamento e entrega atómica do `.pptx`.
7. Gestão segura e concorrente das chaves.
8. Adaptador cliente da Integration API.
9. Catálogo autenticado de media do projeto e upload do PC.
10. Ponte CryptPad para Inserir/Upload files e desativação do chat interno.
11. Workspace colaborativo, ligação ao projeto, chat Planka e modo read-only.
12. Revogação, eventos socket e recuperação.
13. Produção, observabilidade, backups e runbook.

## Estratégia de validação

- Respeitar `AGENTS.md`: não executar build para validar desenvolvimento local.
- Usar hot reload em `http://localhost:3008`.
- Executar testes Jest/Mocha focados nos ficheiros tocados.
- Usar duas sessões de browser com utilizadores diferentes para colaboração.
- Antes e depois de cada fatia, validar criação/edição de board e cartão, upload de anexo, Gantt e chat existente; a Presentation fica desligada se algum destes fluxos regredir.
- Validar `onSave` com falha temporária, retry e preservação do snapshot anterior.
- Validar utilizador edit, utilizador view e utilizador sem acesso.
- Validar ativar, desativar e reativar sem perda de conteúdo.
- Validar importação/exportação `.pptx`, `.odp` e `.pdf` oferecida pelo editor.
- Validar upload do PC, MIME/limites, miniaturas e remoção, usando o pipeline e file manager existentes.
- Validar que a biblioteca nunca revela media de boards inacessíveis e que a permissão é reavaliada ao obter o ficheiro.
- Validar que media inserida continua visível depois de apagar/mudar a origem e reabrir o `.pptx`.
- Validar que o chat interno não aparece e que o chat Planka abre a conversa geral sem desmontar/perder alterações do editor.
- Executar `git diff --check` e lint focado; reportar separadamente qualquer erro preexistente.
- Em produção, exigir checkup CryptPad integralmente verde antes de disponibilizar o toggle.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Domínios ou proxy indisponíveis | Alto | Tratar DNS/TLS/proxy como gate da Fase 0; nunca instalar em subpasta. |
| Alteração Presentation afetar o Planka existente | Crítico | Serviço isolado, feature flag desligada por defeito, alterações aditivas, testes focados de boards/cartões/anexos/Gantt/chat e rollback por disable imediato. |
| Instalação sem recursos OnlyOffice | Alto | Tornar o teste de criação de Presentation parte do healthcheck do deployment. |
| Chave edit entregue a viewer | Crítico | Endpoints separados por capability, resposta filtrada e testes negativos obrigatórios. |
| Corrida em `onNewKey` | Alto | Transação, lock/compare-and-swap por `key_version` e callback com a chave vencedora. |
| Corrupção/perda no autosave | Alto | Upload temporário, validação, troca atómica, versão e retenção curta do snapshot anterior. |
| Ficheiros grandes | Médio | `PRESENTATION_MAX_BYTES` configurável, limites no cliente e servidor e erro recuperável. |
| Browser bloquear recursos cross-origin | Alto | Blob URL same-origin para o ficheiro, Remote embedding, CSP oficial e matriz de browsers no spike. |
| Biblioteca revelar media privada | Crítico | Aplicar a mesma scoping de projeto/board em catálogo e download, testes negativos e nunca confiar nos IDs devolvidos pelo cliente. |
| Upload novo criar blobs duplicados | Médio | Reutilizar `FilePicker`, receiver, `processUploadedFile`, `FileReference` e file manager existentes; guardar uma só referência em `project_presentation_media`. A cópia incorporada no `.pptx` é documentada como parte do próprio documento. |
| `postMessage` aceitar origem ou pedido forjado | Crítico | Allowlist exata de origins, nonce por sessão, schema estrito, limites de tamanho/MIME e transferência sem credenciais para o iframe. |
| Atualização CryptPad quebrar a ponte de media | Alto | Patch mínimo versionado, teste de contrato e rebase obrigatório antes de trocar a imagem/digest. |
| Dois chats criarem conversas divergentes | Médio | Desativar o chat interno, não persistir mensagens no CryptPad e reutilizar exclusivamente o ChatContext do Planka. |
| Sessão antiga continua após revogação | Alto | Invalidar chave, broadcast de reload e documentar o limite enquanto a sessão antiga estiver viva. |
| Atualização CryptPad quebrar customizações | Médio | Fixar versão/digest, volumes separados, ler release notes e testar staging antes de atualizar. |
| Dados sensíveis em logs | Alto | Nunca logar Blob, conteúdo, edit/view keys ou URLs com chaves; apenas IDs, versões e resultados. |

## Fora do âmbito do MVP

- Várias apresentações por projeto.
- Associação de apresentações a cartões.
- Templates escolhidos pelo utilizador.
- Miniaturas geradas no servidor.
- Macros e plugins OnlyOffice.
- Edição offline.
- SSO ou contas CryptPad para membros do Planka.
- Modificações profundas/white-label ao código do CryptPad, além da ponte mínima de media e da desativação do chat necessárias a este plano.

## Questões que têm de estar respondidas antes da implementação de produção

1. Quem controla o DNS e proxy de `dsproject.pt` e pode criar os dois subdomínios?
2. O CryptPad correrá no mesmo host Docker ou num host Debian 12 dedicado?
3. Qual é a licença efetiva deste Planka personalizado, dado o conflito entre `LICENSE.md` e os cabeçalhos Fair Use?
4. O limite inicial de `PRESENTATION_MAX_BYTES` pode ser 100 MiB?
5. Pretende-se suportar Safari no primeiro lançamento?

As questões 1 a 3 são gates. As questões 4 e 5 podem usar os valores recomendados no plano caso não haja decisão diferente.
