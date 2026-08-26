# CryptPad/OnlyOffice — checklist do fix robusto

## Tarefa 1: Instrumentar o caminho crítico

**Descrição:** Adicionar uma sonda ativada apenas em diagnóstico que correlacione fases do host, iframe CryptPad, x2t, OnlyOffice e save sem registar conteúdo nem chaves.

**Critérios de aceitação:**

- [ ] Cada abertura tem `runId` e `editorGeneration` únicos.
- [ ] Fetch, START, x2t import/export, OO ready, dirty, locks e upload têm timestamps e duração.
- [ ] Logs não contêm blobs, URLs privadas, edit/view keys ou conteúdo.

**Verificação:** teste unitário da forma/redação dos eventos e inspeção de um trace em `http://localhost:3008` por hot reload.

**Dependências:** nenhuma.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationEditor.jsx`
- `client/src/components/presentation/PresentationEditor.config.test.js`
- `infra/cryptpad/patch-onlyoffice-integration.js`
- `infra/cryptpad/patch-onlyoffice-integration.test.js`

**Escopo:** médio.

## Tarefa 2: Fixar a baseline

**Descrição:** Medir cinco execuções cold e warm do template e do PowerPoint real, mais cenários idle, edição e dois utilizadores, guardando um resumo comparável.

**Critérios de aceitação:**

- [ ] Existem p50/p95 de `open -> onDocumentReady` e duração por fase.
- [ ] Long tasks e recursos têm atribuição/cache/status.
- [ ] O número real de exports/uploads idle e por edição está provado.

**Verificação:** repetir o protocolo numa segunda sessão e obter resultados dentro da variância documentada.

**Dependências:** tarefa 1.

**Ficheiros prováveis:** nenhum ficheiro de produto; artefactos de diagnóstico descartáveis.

**Escopo:** pequeno.

## Checkpoint 1: Evidência causal

- [ ] O caminho crítico e os eventos dirty/save estão medidos.
- [ ] A baseline foi revista antes de alterar comportamento.

## Tarefa 3: Separar o tipo CryptPad do tipo OnlyOffice

**Descrição:** Manter `presentation` na Integration API e mapear para `slide` apenas na configuração passada a `DocsAPI.DocEditor`.

**Critérios de aceitação:**

- [ ] A rota/aplicação interna continua `presentation`.
- [ ] A configuração pública OnlyOffice usa `slide` e o warning desaparece.
- [ ] Picker de imagens e import/export continuam a reconhecer apresentações.

**Verificação:** `node --test infra/cryptpad/patch-onlyoffice-integration.test.js` e smoke local autenticado.

**Dependências:** tarefa 2.

**Ficheiros prováveis:**

- `infra/cryptpad/patch-onlyoffice-integration.js`
- `infra/cryptpad/patch-onlyoffice-integration.test.js`

**Escopo:** pequeno.

## Tarefa 4: Expor metadados v9 válidos

**Descrição:** Preparar `plugins.json` vazio e `themes.json` vazio nos paths version-root pedidos pelo bundle, a partir das fontes canónicas instaladas e com validação de JSON.

**Critérios de aceitação:**

- [ ] Ambos os paths devolvem 200, MIME JSON e conteúdo parseável.
- [ ] Plugins/macros permanecem desativados.
- [ ] A preparação falha de forma visível se os paths upstream mudarem.

**Verificação:** `node --test infra/cryptpad/patch-static-cache.test.js` e pedidos HTTP locais aos dois paths.

**Dependências:** tarefa 2.

**Ficheiros prováveis:**

- `infra/cryptpad/patch-static-cache.js`
- `infra/cryptpad/patch-static-cache.test.js`

**Escopo:** pequeno.

## Tarefa 5: Garantir paridade local/imagem

**Descrição:** Fazer a mesma preparação estática correr no ambiente local e na imagem final sem depender de bind mounts de desenvolvimento.

**Critérios de aceitação:**

- [ ] x2t Brotli, service worker e metadados v9 são preparados nas duas variantes.
- [ ] A operação é idempotente e tolera volume persistente já preparado.
- [ ] A imagem não arranca se um patch obrigatório deixou de aplicar.

**Verificação:** testes Node do preparador; smoke do compose local; inspeção separada da imagem apenas na fase de release.

**Dependências:** tarefa 4.

**Ficheiros prováveis:**

- `infra/cryptpad/Dockerfile`
- `infra/cryptpad/docker-compose.dev.yml`
- `infra/cryptpad/patch-static-cache.js`
- `infra/cryptpad/patch-static-cache.test.js`

**Escopo:** médio.

## Checkpoint 2: Integração limpa

- [ ] Não há warning `documentType` nem 404 de plugins/temas.
- [ ] Import, edição, imagens, save/reload e view mode funcionam.
- [ ] Nenhum alias foi criado para `.ndjson` ou erros de extensões.

## Tarefa 6: Classificar os eventos de gravação

**Descrição:** Usar a sonda para distinguir edição real, replay inicial, sync remoto, duplicação e alteração durante um save.

**Critérios de aceitação:**

- [ ] Cada exportação tem um `saveChanges` causal identificado.
- [ ] Idle, uma edição, edição durante save e dois utilizadores estão classificados.
- [ ] A decisão “alterar ou não alterar o bridge” fica baseada nos traces.

**Verificação:** matriz manual no Chrome e comparação dos contadores esperados.

**Dependências:** tarefas 1, 3 e 5.

**Ficheiros prováveis:** nenhum, além da sonda temporária da tarefa 1.

**Escopo:** pequeno.

## Tarefa 7: Corrigir dirty/save apenas se provado

**Descrição:** Se a tarefa 6 provar eventos falsos ou duplicados, filtrar no bridge antes de `inte.changed()` preservando alterações concorrentes e retries.

**Critérios de aceitação:**

- [ ] Dois minutos idle produzem zero exports/uploads.
- [ ] Uma edição produz um save; edição durante save produz exatamente um save adicional.
- [ ] Falha de upload mantém dirty e colaboração elege apenas um saver.

**Verificação:** testes de estado/ordenação no patch, teste focado do cliente e matriz Chrome com dois utilizadores.

**Dependências:** tarefa 6; condicional à evidência.

**Ficheiros prováveis:**

- `infra/cryptpad/patch-onlyoffice-integration.js`
- `infra/cryptpad/patch-onlyoffice-integration.test.js`
- `client/src/components/presentation/PresentationEditor.jsx`
- `client/src/components/presentation/PresentationEditor.config.test.js`

**Escopo:** médio.

## Checkpoint 3: Gravação correta

- [ ] Idle, edição, retry e multiutilizador cumprem os contadores definidos.
- [ ] Reload conserva a última alteração confirmada.

## Tarefa 8: Sobrepor download e bootstrap

**Descrição:** Experimentar uma fonte assíncrona de blob que permita criar o iframe e validar a sessão enquanto o Planka obtém o PowerPoint.

**Critérios de aceitação:**

- [ ] Não há segundo download nem acesso direto da sandbox à rota privada.
- [ ] Cancelamento/unmount não inicia editor nem retém blob.
- [ ] O p50 cold melhora pelo menos 2 segundos e 10%; caso contrário, reverter a experiência.

**Verificação:** testes de lifecycle do componente e protocolo A/B cold/warm.

**Dependências:** checkpoint 2.

**Ficheiros prováveis:**

- `client/src/components/presentation/PresentationEditor.jsx`
- `client/src/components/presentation/PresentationEditor.config.test.js`
- `infra/cryptpad/patch-onlyoffice-integration.js`
- `infra/cryptpad/patch-onlyoffice-integration.test.js`

**Escopo:** médio.

## Tarefa 9: Warm-up dirigido de x2t

**Descrição:** Antecipar apenas o runtime x2t dentro do iframe CryptPad enquanto decorrem tarefas independentes, sem carregar Word/Cell/Visio.

**Critérios de aceitação:**

- [ ] Warm-up só ocorre ao abrir apresentações e é cancelável.
- [ ] Documento e chaves não saem do contexto CryptPad; buffers são libertados.
- [ ] Passa os gates cold/warm/CPU; caso contrário, remover por completo.

**Verificação:** teste do patch e comparação A/B com Resource Timing e long tasks.

**Dependências:** tarefa 8.

**Ficheiros prováveis:**

- `infra/cryptpad/patch-onlyoffice-integration.js`
- `infra/cryptpad/patch-onlyoffice-integration.test.js`

**Escopo:** médio.

## Tarefa 10: Spike de Worker x2t, se necessário

**Descrição:** Só se o warm-up não passar o gate, provar se mover a conversão para Worker do mesmo iframe reduz bloqueio sem quebrar a distribuição ou a fronteira de segurança.

**Critérios de aceitação:**

- [ ] Compatibilidade de Worker/WASM/CSP demonstrada num protótipo removível.
- [ ] Paridade binária de import/export e lifecycle sem leaks.
- [ ] Ganho passa os gates; caso contrário, nenhum código do spike permanece.

**Verificação:** fixtures `.pptx`, hashes dos resultados normalizados e perfil A/B.

**Dependências:** tarefa 9 falhar o gate.

**Ficheiros prováveis:** a definir pelo spike, máximo de cinco; não integrar antes de revisão.

**Escopo:** médio.

## Checkpoint 4: Desempenho aceite

- [ ] Apenas experiências com ganho quantitativo permanecem.
- [ ] Warm não regrediu mais de 5% e o p95 não piorou.
- [ ] O resto do Planka não carrega recursos OnlyOffice.

## Tarefa 11: Regressão local completa

**Descrição:** Verificar o incremento final no Chrome autenticado, removendo a sonda/flags temporárias e executando testes focados.

**Critérios de aceitação:**

- [ ] Importar, abrir, editar, inserir imagem, gravar, reload e view mode passam.
- [ ] Dois utilizadores, rotação de chave e erro/retry passam.
- [ ] Consola fica sem os erros em escopo e as métricas mantêm os gates.

**Verificação:** hot reload em `http://localhost:3008`, Jest focado e testes Node dos patches; sem build local.

**Dependências:** checkpoints 3 e 4.

**Ficheiros prováveis:** apenas testes/implementação das tarefas anteriores.

**Escopo:** médio.

## Tarefa 12: Imagem, canário e rollback

**Descrição:** Depois de aprovação, construir uma imagem CryptPad com tag imutável, verificar por digest e executar canário autenticado antes da promoção.

**Critérios de aceitação:**

- [ ] Imagem e source ref são rastreáveis; digest anterior fica disponível.
- [ ] Smoke do canário cobre PowerPoint e métricas cold/warm.
- [ ] Rollback foi documentado/testado sem editar ou commitar Ansible.

**Verificação:** workflow manual `Build CryptPad image`, inspeção do digest e smoke no canário.

**Dependências:** tarefa 11 e aprovação humana.

**Ficheiros prováveis:** nenhum ficheiro Ansible; alterações de workflow só se uma lacuna for provada.

**Escopo:** pequeno.

## Checkpoint final

- [ ] Definition of Done do plano satisfeita.
- [ ] Resultados A/B e regressão revistos pelo utilizador.
- [ ] Nenhuma alteração, commit ou push no Ansible.
- [ ] Pronto para decisão explícita de merge/imagem/deploy.

