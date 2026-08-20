# Apresentações CryptPad — checklist executável

## Tarefa 1: fechar os gates de isolamento e infraestrutura

**Descrição:** Registar uso exclusivamente interno e aprovação OnlyOffice, confirmar responsável por DNS/TLS/proxy, topologia do host, capacidade e isolamento completo entre CryptPad e os serviços existentes do Planka.

**Critérios de aceitação:**

- [ ] O uso interno e a aprovação OnlyOffice estão registados; qualquer patch CryptPad fica versionado e acessível à equipa.
- [ ] `slides.dsproject.pt` e `slides-sandbox.dsproject.pt` têm responsável e plano de DNS/TLS.
- [ ] O host escolhido cumpre 2 CPUs, 2 GB RAM e 20 GB mínimos com margem definida.
- [ ] O compose CryptPad não partilha PostgreSQL, Redis, volumes, variáveis de ambiente ou credenciais com o Planka.

**Verificação:** revisão do registo, inspeção do compose/rede/volumes e resolução DNS/TLS em staging.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `docs/cryptpad/decision.md` (novo)
- documentação externa de DNS/proxy, se não viver neste repositório

**Escopo:** pequeno.

## Tarefa 2: criar deployment CryptPad local fixado

**Descrição:** Criar um compose separado com a imagem 2026.5.1 fixada por digest, volumes persistentes, portas 3010/3013 e instalação dos recursos cliente OnlyOffice.

**Critérios de aceitação:**

- [ ] Reiniciar/recriar o contentor preserva configuração, utilizador admin e recursos OnlyOffice.
- [ ] O domínio principal e sandbox local respondem sem conflito com 3008, 1337 ou 3000.
- [ ] Parar/remover os contentores CryptPad não altera a disponibilidade nem os dados do Planka local.
- [ ] A aplicação Presentation pode ser criada e o `/checkup/` não apresenta falhas da topologia local esperada.

**Verificação:** `docker compose ps`, logs, `/checkup/` e abertura manual de Presentation; não executar build do Planka.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `infra/cryptpad/docker-compose.dev.yml` (novo)
- `infra/cryptpad/config/config.js.example` (novo)
- `infra/cryptpad/customize/application_config.js.example` (novo)
- `infra/cryptpad/.env.example` (novo)

**Escopo:** médio.

## Tarefa 3: provar a Integration API antes de desenvolver o domínio

**Descrição:** Criar um smoke test descartável que carrega `cryptpad-api.js`, abre `documentType: "presentation"` em dois browsers e captura `onSave`, `onNewKey`, view key e lista de utilizadores. Inspecionar/provar também o hook mínimo para media do anfitrião e a desativação do chat OnlyOffice.

**Critérios de aceitação:**

- [ ] Dois browsers editam o mesmo deck e veem alterações em tempo real.
- [ ] `onSave` devolve um Blob reabrível e `onNewKey` resolve uma corrida simulada.
- [ ] Um browser com view key não consegue editar; usar edit key em view mode é rejeitado pelo integrador.
- [ ] Está identificado e testado o ponto de extensão que permite ao fluxo Inserir/Upload files pedir e receber media do Planka por `postMessage` validado.
- [ ] `document.permissions.chat = false` desativa o chat; se a opção não for encaminhada, existe uma prova mínima do patch/configuração necessário.

**Verificação:** smoke test Playwright/manual em Chrome/Edge e Firefox com evidência dos callbacks sem imprimir chaves.

**Dependências:** tarefa 2.

**Ficheiros prováveis:**

- `client/tests/cryptpad-integration-smoke.cjs` (novo)
- `client/tests/fixtures/blank-presentation.pptx` (novo)

**Escopo:** pequeno.

## Checkpoint 1: viabilidade externa

- [ ] Licença e infraestrutura aprovadas.
- [ ] CryptPad/OnlyOffice/sandbox passam o checkup relevante.
- [ ] Presentation, colaboração, save e chaves funcionam no browser.
- [ ] Inserção de media do anfitrião e ausência do chat interno foram provadas na versão fixada.
- [ ] Revisão humana autoriza criar schema e UI definitiva.

## Tarefa 4: criar modelo, acesso e ciclo de ativação

**Descrição:** Introduzir `project_presentation`, query methods, helper de acesso e endpoints show/activate/disable, reutilizando a política de gestão do Gantt e preservando dados ao desativar.

**Critérios de aceitação:**

- [ ] Existe no máximo uma apresentação por projeto e apagar o projeto remove o registo.
- [ ] Apenas quem pode gerir o Gantt ativa/desativa; membros autorizados conseguem consultar capabilities.
- [ ] Desativar altera apenas `isEnabled` e emite `projectPresentationUpdate` aos utilizadores relacionados.

**Verificação:** migração up/down em base temporária e testes de integração de manager, member, viewer e outsider.

**Dependências:** checkpoint 1.

**Ficheiros prováveis:**

- `server/db/migrations/*_add_project_presentation.js` (novo)
- `server/api/models/ProjectPresentation.js` (novo)
- `server/api/helpers/project-presentations/get-project-access.js` (novo)
- `server/api/controllers/project-presentations/{show,create,disable}.js` (novos)
- `server/config/routes.js`

**Escopo:** médio; se os controladores ultrapassarem cinco ficheiros, separar a migração/modelo do ciclo HTTP em dois commits focados.

## Tarefa 5: apresentar o toggle e separador junto do Gantt

**Descrição:** Ligar o estado de ativação ao cliente e adicionar o toggle imediatamente depois do Gantt no GeneralPane, mais um separador Apresentação depois do Gantt com rota/workspace placeholder.

**Critérios de aceitação:**

- [ ] O toggle aparece no mesmo pane e sob a mesma regra de gestão do Gantt.
- [ ] Ativar/desativar faz o separador aparecer/desaparecer sem reload e preserva o estado no servidor.
- [ ] A rota `/projects/:id/presentation` respeita projeto inexistente, acesso e fallback para projeto/quadro.

**Verificação:** testes do contexto/tab e validação manual por hot reload em `http://localhost:3008`.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationContext.jsx` (novo)
- `client/src/components/projects/ProjectSettingsModal/GeneralPane/GeneralPane.jsx`
- `client/src/components/boards/Boards/PresentationTab.jsx` (novo)
- `client/src/constants/Paths.js`
- `client/src/components/common/{Root.jsx,Static/Static.jsx,Core/Core.jsx}`

**Escopo:** médio; implementar contexto/API e UI/rota em duas sessões se exceder cinco ficheiros por sessão.

## Checkpoint 2: fatia vertical de ativação

- [ ] Show/activate/disable e evento socket passam testes.
- [ ] Toggle e separador refletem o estado real com duas sessões abertas.
- [ ] Desativar numa sessão retira a outra sessão da rota sem perda de dados.
- [ ] Boards, cartões, anexos, Gantt e chat existente funcionam como antes com a Presentation desligada e ligada.

## Tarefa 6: implementar armazenamento atómico do snapshot

**Descrição:** Criar template inicial e endpoints autenticados para obter e substituir o `.pptx`, reutilizando o file manager e preservando o snapshot anterior até a nova gravação terminar.

**Critérios de aceitação:**

- [ ] O primeiro GET devolve um `.pptx` válido e os GET seguintes devolvem o último snapshot confirmado.
- [ ] Tipo e `PRESENTATION_MAX_BYTES` são validados no cliente e servidor.
- [ ] Uma falha a meio do upload não altera `documentVersion` nem elimina o snapshot anterior.

**Verificação:** testes de upload válido, tipo/tamanho inválido, falha simulada e reabertura do ficheiro guardado.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `server/api/controllers/project-presentations/{download-file,update-file}.js` (novos)
- `server/api/helpers/project-presentations/replace-file.js` (novo)
- `server/assets/templates/blank-presentation.pptx` (novo)
- `server/config/custom.js`
- `server/test/integration/project-presentation-file.test.js` (novo)

**Escopo:** médio.

## Tarefa 7: implementar gestão segura das chaves

**Descrição:** Cifrar edit/view keys, implementar compare-and-swap transacional de `onNewKey` e garantir que cada capability recebe apenas a chave permitida.

**Critérios de aceitação:**

- [ ] Chaves não ficam em claro na base de dados, logs, sockets ou URLs.
- [ ] Duas rotações concorrentes convergem na mesma chave vencedora.
- [ ] Um viewer nunca recebe edit key e um outsider não recebe qualquer chave.

**Verificação:** testes unitários de cifra e integração de corrida, permissões e segredo ausente/inválido.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `server/api/helpers/project-presentations/keys.js` (novo)
- `server/api/controllers/project-presentations/update-session-key.js` (novo)
- `server/config/custom.js`
- `server/test/integration/project-presentation-keys.test.js` (novo)

**Escopo:** médio.

## Tarefa 8: criar adaptador cliente da Integration API

**Descrição:** Isolar carregamento do script, criação/destruição do editor, Blob URL, config `presentation`, autosave e callbacks num adaptador testável sem acoplar o workspace à API global.

**Critérios de aceitação:**

- [ ] O script é carregado uma vez, erros/timeouts têm estado recuperável e o Blob URL é revogado.
- [ ] `onSave` só confirma callback após PUT bem-sucedido; falha permite retry do CryptPad.
- [ ] Config usa idioma/nome, edit ou view key correta e não expõe segredos em erros.

**Verificação:** Jest com API global simulada e hot reload com o CryptPad local.

**Dependências:** tarefas 3, 6 e 7.

**Ficheiros prováveis:**

- `client/src/components/presentation/cryptpadApi.js` (novo)
- `client/src/components/presentation/useCryptPadPresentation.js` (novo)
- `client/src/api/project-presentations.js` (novo)
- `client/src/components/presentation/cryptpadApi.test.js` (novo)

**Escopo:** médio.

## Tarefa 9: criar o catálogo autenticado de media do projeto e upload do PC

**Descrição:** Expor uma biblioteca paginada que agrega `BackgroundImage` do projeto, anexos visuais referidos por `Card.coverAttachmentId` nos boards acessíveis e uploads próprios da apresentação. Reutilizar `FilePicker`, receiver, `attachments/process-uploaded-file`, `FileReference`, file manager, limites e geração de miniaturas já implementados, sem criar uma cópia do blob-fonte no Planka.

**Critérios de aceitação:**

- [ ] O catálogo tem secções Fundos do projeto e Capas dos boards, com thumbnail, MIME type e identificação de board/cartão quando aplicável.
- [ ] **Carregar do computador** aceita ficheiros suportados e cria um único `project_presentation_media` associado à apresentação, usando o pipeline de ficheiros existente e sem cartão artificial.
- [ ] Manager/admin vê todos os boards do projeto; um membro vê apenas os boards a que já pertence; outsider não obtém catálogo nem bytes.
- [ ] O download revalida a autorização e os bytes escolhidos podem ser incorporados no deck sem expor cookies/URLs autenticadas ao iframe.
- [ ] Resultados são paginados, deduplicados e aceitam apenas formatos/tamanhos suportados pela apresentação.

**Verificação:** testes de integração com dois boards de visibilidade diferente, upload do PC, fontes apagadas e IDs manipulados; validar thumbnails, ficheiro original e que existe apenas uma referência de storage por upload novo.

**Dependências:** tarefas 4 e 6.

**Ficheiros prováveis:**

- `server/api/controllers/projects/show-presentation-media.js` (novo)
- `server/api/controllers/projects/create-presentation-media.js` (novo)
- `server/api/helpers/project-presentations/list-media.js` (novo)
- `server/api/helpers/project-presentations/process-uploaded-media.js` (novo; adaptador do pipeline de anexos)
- `server/api/models/ProjectPresentationMedia.js` (novo)
- `server/db/migrations/*_add_project_presentation_media.js` (novo)
- `server/config/routes.js`
- `server/test/integration/project-presentation-media.test.js` (novo)

**Escopo:** médio.

## Tarefa 10: criar a ponte de media e desativar o chat interno

**Descrição:** Aplicar à versão fixada do CryptPad a menor extensão possível para adicionar **Media do projeto** ao fluxo Inserir/Upload files, trocar pedidos/respostas com o Planka e inserir os bytes. Desativar o chat CryptPad/OnlyOffice pela configuração encaminhada ou pelo mesmo patch.

**Critérios de aceitação:**

- [ ] A ponte valida origin, nonce, schema, MIME type e tamanho; mensagens forjadas ou de outra sessão são rejeitadas.
- [ ] Escolher um fundo/capa insere uma cópia no `.pptx`; apagar a fonte depois não quebra o slide guardado.
- [ ] O chat interno não aparece e não guarda mensagens, membros ou notificações paralelas.
- [ ] Patch, versão base, teste de contrato e processo de rebase estão documentados; atualizar a imagem sem aplicar/testar o patch falha de forma visível.

**Verificação:** smoke multi-browser, tentativa de `postMessage` malicioso, reabertura após apagar a origem e inspeção da UI para confirmar ausência do chat interno.

**Dependências:** tarefas 3, 8 e 9.

**Ficheiros prováveis:**

- `infra/cryptpad/patches/README.md` (novo)
- `infra/cryptpad/patches/*-planka-media-bridge.patch` (novo; caminho interno fechado no spike)
- `client/src/components/presentation/cryptpadMediaBridge.js` (novo)
- `client/src/components/presentation/ProjectMediaLibrary.jsx` (novo)
- `client/src/components/presentation/cryptpadMediaBridge.test.js` (novo)

**Escopo:** grande; separar patch CryptPad, protocolo da ponte e UI da biblioteca em commits focados.

## Tarefa 11: entregar o workspace colaborativo ligado ao projeto

**Descrição:** Substituir o placeholder por editor responsivo com loading, erro/retry, estado saved/unsaved, colaboradores ativos, read-only, identificação/regresso ao projeto de origem, biblioteca de media e navegação segura ao sair. Manter o ChatLauncher/ChatDock do Planka e oferecer uma ação para a conversa geral do projeto.

**Critérios de aceitação:**

- [ ] Editores colaboram e viewers veem com a chave própria sem controlos falsamente editáveis.
- [ ] Alterações por guardar são anunciadas e a saída pede confirmação quando necessário.
- [ ] Loading, erro do CryptPad, erro de save e reativação têm mensagens traduzidas.
- [ ] O nome/breadcrumb do projeto e a ação de regresso são visíveis; a rota continua a resolver `projectId` para o contexto de chat.
- [ ] **Chat do projeto** abre `openGeneralConversation` no ChatDock existente sem desmontar o editor, e não existe chat CryptPad/OnlyOffice.
- [ ] **Media do projeto** apresenta apenas fundos/capas autorizados e uploads próprios; permite **Carregar do computador** e insere o item escolhido no deck.

**Verificação:** testes de componente e smoke multiutilizador em hot reload; testar ativar, editar, desativar e reativar.

**Dependências:** tarefas 5, 8, 9 e 10.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationWorkspace.jsx` (novo)
- `client/src/components/presentation/PresentationWorkspace.module.scss` (novo)
- `client/src/components/common/Static/Static.module.scss`
- `client/src/locales/{pt-PT,en-US,es-ES,fr-FR}/core.js`
- `client/src/components/presentation/PresentationWorkspace.test.jsx` (novo)

**Escopo:** médio.

## Checkpoint 3: colaboração completa em staging local

- [ ] Manager, editor, viewer e outsider têm comportamentos corretos.
- [ ] Dois editores sincronizam e o snapshot sobrevive ao fecho de todos os browsers.
- [ ] Falha/retry de save não corrompe o ficheiro.
- [ ] A biblioteca respeita a visibilidade dos boards e a media incorporada sobrevive à remoção da fonte.
- [ ] O único chat disponível é o do Planka e a conversa geral abre sem perder o estado do editor.
- [ ] `.pptx`, `.odp` e `.pdf` são exportáveis pelo editor.

## Tarefa 12: tratar revogação, sockets e recuperação

**Descrição:** Rodar chaves quando os acessos mudam, avisar sessões ativas, recuperar de sessão CryptPad expirada e impedir que rotas abertas mantenham UI autorizada após disable/revogação.

**Critérios de aceitação:**

- [ ] Remover acesso invalida a chave guardada e força reload/saída dos clientes Planka ativos.
- [ ] Chave de sessão expirada é renovada por `onNewKey` sem perder o snapshot.
- [ ] Limite da sessão antiga ainda ativa está documentado e não é apresentado como expulsão instantânea garantida.

**Verificação:** teste multi-browser de remoção de membro, rotação simultânea e retorno do CryptPad após indisponibilidade.

**Dependências:** checkpoint 3.

**Ficheiros prováveis:**

- `server/api/helpers/project-presentations/rotate-session.js` (novo)
- hooks/controladores de alteração de membership relevantes
- `client/src/components/presentation/PresentationContext.jsx`
- `server/test/integration/project-presentation-revocation.test.js` (novo)

**Escopo:** médio.

## Tarefa 13: preparar produção e operação

**Descrição:** Criar compose/config de produção, Nginx para os dois domínios, healthchecks, métricas sem conteúdo, backup, atualização fixada e rollback.

**Critérios de aceitação:**

- [ ] Ambos os domínios têm TLS, CSP/sandbox e WebSocket corretos; `/checkup/` passa.
- [ ] Backup/restore recupera apresentação, metadados e configuração CryptPad num staging limpo.
- [ ] Atualização e rollback são documentados e não usam imagem `latest`.

**Verificação:** ensaio de restore, checkup, canário com dois utilizadores e revisão de logs para ausência de chaves/conteúdo.

**Dependências:** tarefa 12.

**Ficheiros prováveis:**

- `infra/cryptpad/docker-compose.prod.yml` (novo)
- `infra/cryptpad/nginx/cryptpad.conf.example` (novo)
- `docs/cryptpad/operations.md` (novo)
- `server/.env.sample`

**Escopo:** médio.

## Checkpoint final

- [ ] Testes focados cliente e servidor passam.
- [ ] Hot reload validado em `http://localhost:3008`; nenhum build foi usado como teste local.
- [ ] Regressão focada de boards, cartões, anexos, Gantt e chat passa antes de disponibilizar o toggle.
- [ ] `git diff --check` e lint focado passam ou os bloqueios preexistentes estão separados no relatório.
- [ ] Checkup CryptPad, colaboração, persistência, permissões, revogação, backup e rollback foram validados.
- [ ] Biblioteca de media, isolamento entre boards, incorporação dos bytes e ponte cross-origin foram validados.
- [ ] Chat interno está desativado e o chat Planka funciona na rota Presentation.
- [ ] Revisão humana aprova disponibilizar o toggle em produção.
