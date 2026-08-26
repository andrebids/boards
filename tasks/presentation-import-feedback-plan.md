# Plano de melhoria: feedback na importação de PowerPoint

## Objetivo

Tornar inequívoco o que acontece depois de escolher um `.pptx` no OnlyOffice: confirmar a substituição num diálogo visível do Planka, mostrar que o ficheiro está a carregar e confirmar que a apresentação está a ser reaberta. Manter o atual `POST /api/project-presentations/:id/file`, a validação e a sessão CryptPad.

## Diagnóstico que orienta o plano

O upload da Julie foi concluído, mas o fluxo atual não mostra sucesso nem progresso. A confirmação é `window.confirm()` acionada por uma mensagem do iframe; é um diálogo do browser sem contexto do ficheiro e pode não ser evidente quando a ação começou no OnlyOffice. A aplicação já tem `react-hot-toast` global, portanto não é necessário introduzir uma dependência ou um novo sistema de notificações.

## Decisões

- Substituir apenas a confirmação nativa por um `Modal` controlado no Planka; o ficheiro fica em estado local até o utilizador escolher **Importar** ou **Cancelar**.
- Reutilizar `toast.loading`, `toast.success` e `toast.error` já instalados. O toast de carregamento é substituído pelo resultado, evitando notificações acumuladas.
- O sucesso é confirmado quando o POST termina e antes da reinicialização do editor: “PowerPoint importado. A abrir a apresentação…”. Não fingir progresso percentual, porque o endpoint não o fornece.
- Registar no servidor somente evento, fase, `presentationId`, resultado HTTP e razão de validação permitida; nunca nome/conteúdo do ficheiro nem chaves CryptPad.

## Fluxo alvo

`Escolher ficheiro no OnlyOffice` → `modal: confirmar substituição, com nome do ficheiro` → `toast: A carregar…` → `POST` → `toast: importado, a abrir…` → `reiniciar sessão CryptPad`.

Em falha: fechar o toast de carregamento, manter o editor atual e mostrar erro recuperável. Cancelar não envia pedido.

## Tarefas

### Tarefa 1 — confirmação dentro da aplicação

**Descrição:** Trocar `window.confirm()` por um modal acessível que mostra o nome do PowerPoint e explica que a apresentação atual será substituída. Guardar o ficheiro pendente localmente, impedir duplo clique durante uma importação e iniciar o POST apenas depois da confirmação explícita.

**Critérios de aceitação:**

- [ ] Selecionar um `.pptx` abre sempre uma confirmação visual do Planka; `window.confirm()` deixa de ser usado.
- [ ] Confirmar inicia uma única importação; cancelar não faz qualquer pedido nem modifica a apresentação.
- [ ] O modal tem foco inicial, Escape/cancelamento e botões com nomes claros.

**Verificação:** teste focado do componente/fluxo e teste manual no editor com um ficheiro pequeno.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationEditor.jsx`
- `client/src/components/presentation/PresentationImportConfirmModal.jsx` (novo)
- `client/src/components/presentation/PresentationEditor.config.test.js`

**Escopo:** pequeno.

### Tarefa 2 — estados visíveis de carregamento, sucesso e erro

**Descrição:** Reutilizar o `react-hot-toast` global para apresentar o estado real da operação: carregamento com o nome do ficheiro, sucesso antes de reabrir o editor e erro acionável. Atualizar as traduções já existentes em inglês, francês e português.

**Critérios de aceitação:**

- [ ] Depois de confirmar, surge “A carregar PowerPoint…” até o POST resolver ou falhar.
- [ ] Um sucesso informa que o ficheiro foi importado e que o editor está a abrir; um erro diz que a importação falhou e que o utilizador pode tentar novamente.
- [ ] Mensagens são anunciadas de forma não intrusiva aos leitores de ecrã e não dependem apenas de cor ou ícone.

**Verificação:** testes focados para `toast.loading/success/error`; validação manual de sucesso, cancelamento e erro HTTP simulado em `http://localhost:3008` por hot reload.

**Dependências:** tarefa 1.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationEditor.jsx`
- `client/src/components/presentation/PresentationEditor.config.test.js`
- `client/src/locales/en-US/core.js`
- `client/src/locales/fr-FR/core.js`
- `client/src/locales/pt-PT/core.js`
- `client/src/locales/pt-BR/core.js`

**Escopo:** médio (as traduções são atualização mecânica do mesmo conjunto de mensagens).

### Tarefa 3 — observabilidade sanitizada do endpoint

**Descrição:** Adicionar registos estruturados mínimos ao upload da apresentação para distinguir rejeição de acesso, receção multipart, validação, persistência e sucesso. Isto serve incidentes futuros; não altera a resposta pública nem guarda dados do ficheiro.

**Critérios de aceitação:**

- [ ] Um 404/422/5xx deixa fase e motivo seguro nos logs, ligado ao `presentationId`.
- [ ] O log não contém nome de ficheiro, bytes, URL de documento, cookies ou chaves CryptPad.
- [ ] Um upload válido continua a devolver o mesmo contrato de resposta.

**Verificação:** estender o teste existente do controlador para cada fase de erro e inspecionar a saída de um teste focado.

**Dependências:** nenhuma; pode avançar em paralelo com as tarefas 1–2.

**Ficheiros prováveis:**

- `server/api/controllers/project-presentations/upload-file.js`
- `server/test/utils/project-presentation-controllers.test.js`

**Escopo:** pequeno.

## Checkpoint de integração

- [ ] Selecionar → confirmar → carregar → sucesso é legível sem abrir DevTools.
- [ ] Cancelar, ficheiro inválido, timeout e erro de validação deixam uma ação clara e não substituem o documento atual.
- [ ] O iframe continua a reinicializar com o ficheiro importado e o autosave anterior não o sobrepõe.
- [ ] Testes focados passam; não executar build local, porque o projeto valida por hot reload.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| O toast desaparece antes de o CryptPad estar pronto | A mensagem de sucesso diz “A abrir…” e o estado de carregamento já existente do editor continua visível. |
| Duplicação por dois eventos `postMessage` | Reutilizar `isImporting` e limpar o ficheiro pendente ao confirmar/cancelar. |
| Expor detalhes internos num erro | Usar texto amigável na UI e motivos sanitizados apenas nos logs. |
| Traduções em falta | Atualizar exatamente os quatro ficheiros que já definem as mensagens da importação. |
