# Plano robusto: arranque e gravação de apresentações CryptPad/OnlyOffice

## Objetivo

Reduzir de forma mensurável o tempo entre abrir uma apresentação e o editor ficar utilizável, eliminar os erros determinísticos da integração e garantir que o autosave não exporta ou envia `.pptx` sem uma alteração real. O trabalho preserva a conversão e colaboração encriptadas no browser, não altera Ansible e só avança para imagem/deploy depois de validação local autenticada.

## Evidência atual

- O novo registo chega a `OO ready`; os pedidos de `v9/plugins.json` e `v9/themes.json` falham depois. São erros reais de empacotamento, mas não explicam por si só o bloqueio inicial.
- A importação inicial de um `.pptx` com cerca de 5,35 MB inicializa `x2t` e produz uma long task de aproximadamente 1037 ms. O arranque interno do OnlyOffice contém ainda uma long task de aproximadamente 716 ms antes de `OO ready`.
- O registo novo não contém `ISAVE` nem `ISAVED`. Um registo anterior mostrou muitos ciclos, mas uma consola copiada não distingue eventos reais de stack traces ou duplicação de logging. O protocolo de gravação não será alterado sem correlação e timestamps.
- O bridge do CryptPad marca o documento como alterado quando sincroniza uma mensagem OnlyOffice `saveChanges`; o temporizador de autosave apenas limita quando esse estado pode originar uma exportação `bin -> pptx` por `x2t`.
- `documentType: "presentation"` é o valor público correto para a Integration API do CryptPad. A API já converte o alias OnlyOffice `slide` para a aplicação interna `presentation`. O warning nasce mais abaixo, quando o bridge volta a entregar `presentation` à configuração pública do OnlyOffice, que desde 6.1 espera `slide`.
- O CryptPad instalado tem configurações canónicas vazias para plugins e temas, mas não as expõe nos caminhos pedidos pelo bundle v9. Plugins e macros são deliberadamente desativados pelo CryptPad por razões de segurança.
- A preparação de `x2t.wasm`, service worker e cache está atualmente ligada ao arranque do compose local. A imagem de produção não copia nem executa esse preparador, criando risco de diferença entre local e produção.

## Fontes oficiais e consequências

- A [Integration API do CryptPad](https://github.com/cryptpad/cryptpad-api-examples) define `presentation` como aplicação e o autosave como segundos de inatividade; apenas um utilizador deve gravar numa sessão colaborativa e o callback de `onSave` tem de ser concluído.
- A [configuração do ONLYOFFICE](https://api.onlyoffice.com/docs/docs-api/usage-api/config/) define `slide` como tipo público de apresentação e marca `presentation` como depreciado.
- O [CryptPad explica a integração](https://docs.cryptpad.org/en/FAQ.html) como código OnlyOffice executado no cliente e conversão adaptada para o browser, evitando revelar o documento ao servidor. Não será proposta conversão server-side em claro.
- A [documentação de apresentações do CryptPad](https://docs.cryptpad.org/en/user_guide/apps/presentation.html) confirma que plugins e macros OnlyOffice não estão disponíveis. O `plugins.json` exposto deve, portanto, continuar vazio.
- O [preload oficial do ONLYOFFICE](https://api.onlyoffice.com/docs/docs-api/get-started/configuration/preload/) carrega os recursos num iframe. A experiência local mostrou que o preload genérico da distribuição atual tenta também recursos ausentes e não melhorou materialmente o tempo total; não será reintroduzido sem uma variante compatível e um ganho medido.
- `PerformanceObserver` permite atribuir [long tasks](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming) a documentos/iframes, e Resource Timing permite separar transferência, cache e processamento. Estas APIs serão usadas apenas em diagnóstico local, sem conteúdo, chaves ou URLs sensíveis nos logs.

## Modelo causal a validar

```text
abrir modal
  -> obter PPTX/template no Planka
  -> carregar cryptpad-api.js e criar iframe seguro
  -> validar/criar sessão CryptPad
  -> converter PPTX para bin com x2t no browser
  -> arrancar SDK/UI OnlyOffice
  -> OO ready / primeiro input possível

edição real
  -> OnlyOffice saveChanges
  -> bridge CryptPad marca dirty
  -> settle + janela de autosave
  -> converter bin para PPTX com x2t
  -> onSave no Planka
  -> confirmar save / limpar dirty
```

O caminho crítico atual é sequencial antes da criação do iframe: o Planka espera pelo download do ficheiro e só depois chama `CryptPadAPI`. A primeira hipótese de otimização é sobrepor download, criação do iframe e validação da sessão. A segunda é antecipar apenas o runtime `x2t` dentro do mesmo contexto seguro. Um preload genérico de Word/Cell/Slide não ataca diretamente este caminho.

## Decisões de arquitetura

1. Manter dois nomes semânticos explícitos: `presentation` na API/aplicação CryptPad; `slide` exclusivamente na fronteira `DocsAPI.DocEditor`.
2. Instrumentar antes de deduplicar saves. O valor local `autosave: 30` fica como proteção temporária, não como explicação causal.
3. Não usar hash no servidor como fix principal: ele pode evitar uma escrita repetida, mas ocorre depois da conversão cara `bin -> pptx`.
4. Não mover a conversão para o servidor nem registar conteúdo, blobs, chaves de sessão, edit keys ou view keys.
5. Tratar `plugins.json` e `themes.json` como artefactos versionados da distribuição. Não criar aliases para o `404` de `.ndjson`, que pode ser uma consulta/fallback normal do datastore.
6. Unificar a preparação de assets entre a imagem e o compose local. O comportamento de produção não pode depender de um bind mount que só existe em desenvolvimento.
7. Manter apenas otimizações que passam um gate quantitativo; experiências sem ganho são removidas por completo.

## Protocolo de medição

### Cenários

- Documento A: template vazio.
- Documento B: PowerPoint real usado no registo, aproximadamente 5,35 MB.
- Cinco execuções cold por documento num perfil Chrome limpo ou com storage/cache explicitamente limpos.
- Cinco execuções warm por documento no mesmo perfil, sem limpar cache.
- Dois minutos sem interação depois de `ready`.
- Uma edição simples, espera pela gravação, reload e confirmação visual.
- Duas sessões Chrome autenticadas no mesmo documento para validar eleição de um único saver.

### Marcos e contadores

- `presentation:open`
- início/fim de fetch do documento
- `cryptpad-api` disponível
- iframe criado e `START` enviado
- início/fim da inicialização e importação `x2t`
- `OO loading`, `OO ready` e callback público `onDocumentReady`
- cada `saveChanges`, transição dirty, pedido de lock, exportação x2t, `onSave`, resposta e `ISAVED`
- recursos `x2t.wasm`, SDK, fontes e temas: duração, transfer size, cache e status HTTP
- quantidade e duração total de long tasks, com atribuição ao iframe quando disponível

Todos os eventos recebem apenas um `runId`, `editorGeneration`, tipo de evento, timestamp, duração e tamanho em bytes. Chaves, blob URLs, nomes privados e conteúdo ficam excluídos.

### Gates de desempenho

- Uma experiência só permanece se reduzir o p50 cold de `open -> onDocumentReady` em pelo menos 2 segundos e 10% no documento B.
- O p95 não pode piorar e o p50 warm não pode regredir mais de 5%.
- A abertura normal do Planka fora de apresentações não pode ganhar novos recursos OnlyOffice nem novas long tasks.
- Dois minutos idle depois de `ready` têm zero exportações x2t e zero pedidos de upload ao Planka.
- Uma alteração isolada produz uma única exportação/upload depois da janela de settle/autosave, salvo nova edição durante a gravação.

## Plano de execução

### Fase 1 — tornar o comportamento observável

- [ ] Tarefa 1: adicionar uma sonda local e correlacionada do percurso completo.
- [ ] Tarefa 2: recolher a baseline cold/warm e idle/edit/multiutilizador no Chrome.

#### Checkpoint 1

- [ ] Cada intervalo do caminho crítico tem duração própria; não dependemos da ordem visual da consola.
- [ ] Sabemos se existem exportações idle reais e qual evento `saveChanges` as antecede.
- [ ] A baseline e os traces foram guardados sem dados sensíveis.

### Fase 2 — corrigir incompatibilidades determinísticas

- [ ] Tarefa 3: normalizar `presentation -> slide` apenas ao construir a configuração OnlyOffice.
- [ ] Tarefa 4: expor e validar os metadados vazios de plugins/temas no root de cada versão v9+.
- [ ] Tarefa 5: tornar a preparação estática idêntica na imagem e no compose local.

#### Checkpoint 2

- [ ] `OO ready` continua funcional e não há warning de `documentType`.
- [ ] `plugins.json` e `themes.json` respondem 200, JSON válido e MIME correto.
- [ ] Picker de imagens, drag/drop, import, edição, save/reload e modo view mantêm-se.
- [ ] O pedido `.ndjson` e mensagens de extensões não foram mascarados por aliases.

### Fase 3 — fechar o ciclo de gravação

- [ ] Tarefa 6: executar a matriz idle/edit/multiutilizador com a sonda.
- [ ] Tarefa 7: aplicar deduplicação no bridge apenas se a tarefa 6 provar dirty falso ou repetido.

O resultado da tarefa 6 decide a tarefa 7:

- Se não houver exportações idle, não alterar o protocolo; manter 30 segundos e remover a sonda de diagnóstico.
- Se o mesmo `saveChanges` for processado duas vezes, deduplicar por identidade/ordem do evento antes de `inte.changed()`.
- Se o replay inicial marcar dirty, abrir uma janela de bootstrap que termina em `OO ready`/sync concluído, sem ignorar a primeira edição real.
- Se uma nova edição acontecer durante o save, preservar um dirty pendente e executar exatamente mais um save depois do settle.

#### Checkpoint 3

- [ ] Idle não exporta nem envia ficheiros.
- [ ] Uma edição grava uma vez e sobrevive a reload.
- [ ] Erro de upload mantém dirty e volta a tentar sem loop apertado.
- [ ] Duas sessões elegem um saver e ambas convergem para o mesmo conteúdo.

### Fase 4 — otimizar o caminho crítico com experiências reversíveis

- [ ] Tarefa 8: sobrepor download do PPTX, bootstrap do iframe e validação da sessão.
- [ ] Tarefa 9: experimentar warm-up dirigido apenas ao runtime x2t no contexto CryptPad.
- [ ] Tarefa 10: só se a tarefa 9 falhar, avaliar conversão x2t num Worker do próprio iframe.

A tarefa 8 deve preferir uma extensão pequena da Integration API que aceite uma fonte assíncrona/callback de blob, para o iframe começar antes de o download terminar. Não se deve expor uma rota privada à sandbox nem duplicar downloads.

A tarefa 9 não usa `preload.html`; inicializa apenas o runtime x2t enquanto a sessão e o documento são preparados. Deve cancelar em unmount, libertar buffers e nunca arrancar para utilizadores que não abrem apresentações.

A tarefa 10 é um spike com gate próprio. Só avança se o perfil mostrar que o trabalho x2t bloqueia o contexto que atrasa a interação e se a distribuição suportar Worker sem copiar chaves/documentos para fora do iframe seguro.

#### Checkpoint 4

- [ ] Cada experiência tem comparação A/B cold e warm.
- [ ] Só permanecem experiências que ultrapassam os gates definidos.
- [ ] O preload genérico continua ausente.
- [ ] Não há buffers/documentos retidos depois de fechar ou trocar de apresentação.

### Fase 5 — validação e release

- [ ] Tarefa 11: executar regressão local autenticada no Chrome e testes focados.
- [ ] Tarefa 12: preparar imagem CryptPad versionada, canário e rollback.

O build da imagem só acontece nesta fase, depois da aprovação do plano e dos checkpoints locais. A imagem deve ser publicada com tag imutável e registada por digest. O canário de produção inclui import de `.pptx`, abrir, editar, gravar, reload, inserir imagem e comparar métricas cold/warm.

Não faz parte deste trabalho editar, fazer commit ou push no repositório Ansible. Um deploy futuro usa o mecanismo operacional já existente, apenas após autorização explícita, e mantém o digest anterior pronto para rollback.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---:|---|
| Confundir sync inicial com edição e perder o primeiro save | Alto | Instrumentar ordem/identidade; teste de edição imediata antes de qualquer dedupe |
| Alterar `presentation` globalmente e quebrar routing/picker CryptPad | Alto | Normalizar apenas na fronteira OnlyOffice; aceitar ambos os aliases nos testes |
| Otimização expor conteúdo fora do browser seguro | Alto | Manter blob e x2t no contexto CryptPad; revisão explícita de origem/CSP e logs |
| Worker ou warm-up aumentar memória e CPU | Médio | Cancelamento, libertação de buffers, medição cold/warm/memória e gate A/B |
| Corrigir 404 com ficheiro errado | Médio | Validar schema JSON e paths relativos; usar as fontes canónicas vazias já instaladas |
| Local continuar diferente da imagem | Alto | Uma função de preparação e os mesmos testes para dev e imagem; smoke sobre a imagem final |
| Cache esconder versão antiga | Médio | namespace/versionamento explícito, hard reload no teste de upgrade e verificação por digest |
| Regressão de colaboração/chaves | Alto | matriz com dois utilizadores, view key, rotação, reload e rollback antes do canário |

## Definition of Done

- [ ] Todos os critérios funcionais, de desempenho e de privacidade passaram.
- [ ] Testes focados do cliente e dos patches CryptPad passam.
- [ ] Hot reload local foi usado para alterações do cliente; nenhum build local foi usado como substituto do teste runtime.
- [ ] A imagem final foi testada separadamente apenas na fase de release.
- [ ] Não ficaram logs de diagnóstico, flags mortas, preload genérico ou aliases indiscriminados.
- [ ] O utilizador reviu os resultados A/B antes de merge, imagem ou deploy.
- [ ] Nenhum ficheiro ou commit Ansible foi criado.

## Questões não bloqueantes e defaults

- Budget absoluto: até ser definido um SLA, aplicam-se os gates relativos de 2 segundos/10%.
- Autosave: manter 30 segundos durante a investigação; reduzir apenas se as medições mostrarem save correto e a UX beneficiar.
- Telemetria: sonda local/flag de diagnóstico por defeito; não enviar métricas para produção nesta primeira correção.

