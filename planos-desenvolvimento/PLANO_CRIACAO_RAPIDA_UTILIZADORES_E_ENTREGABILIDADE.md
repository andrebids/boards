# Plano — Criação rápida de utilizadores e entrega segura das credenciais

**Data:** 31 de julho de 2026  
**Estado:** Proposto  
**Âmbito:** Administração de utilizadores, email de boas-vindas e destinatários protegidos por Mailinblack

## 1. Resumo executivo

O projeto já possui o fluxo base necessário:

- criação com nome, email e idioma;
- geração criptograficamente segura de uma password temporária;
- armazenamento apenas do hash da password;
- email multilingue com a password temporária;
- obrigação de alterar a password no primeiro acesso;
- ação administrativa para reenviar o email.

O próximo passo não é reconstruir este sistema. A proposta é torná-lo mais rápido e operacionalmente fiável através de:

1. **Criação rápida individual**, mantendo o formulário aberto para adicionar vários utilizadores sem repetir a navegação.
2. **Criação em lote**, por colagem de linhas ou importação CSV, com validação antes da criação.
3. **Fila persistente de onboarding**, para a criação da conta não ficar à espera do SMTP.
4. **Estado de entrega por utilizador**, distinguindo “aceite pelo SMTP” de “efetivamente entregue”.
5. **Tratamento legítimo de Mailinblack**, preferencialmente através da autorização prévia do remetente e, como fallback, resolução humana do CAPTCHA.

## 2. Objetivos e métricas

### 2.1 Objetivos funcionais

- Criar um utilizador individual em poucos segundos e preparar imediatamente o formulário seguinte.
- Criar até 100 utilizadores numa única operação.
- Enviar a cada utilizador um email no idioma escolhido com a password temporária.
- Mostrar ao administrador o resultado individual de cada conta e email.
- Permitir repetir apenas os envios falhados ou bloqueados.
- Não perder trabalhos pendentes quando o servidor reinicia.

### 2.2 Métricas propostas

| Métrica | Meta inicial |
| --- | --- |
| Resposta da criação individual | inferior a 500 ms, excluindo carga do servidor |
| Aceitação de lote de 100 linhas | inferior a 2 s |
| Linhas inválidas detetadas antes do envio | 100% |
| Password em respostas, sockets ou logs | 0 ocorrências |
| Estado final conhecido dos jobs | 100% (`sent`, `failed`, `challenge_required` ou `cancelled`) |
| Reenvio manual | apenas sobre itens selecionados e sem duplicar contas |

Os tempos de entrega do email dependem do servidor SMTP e dos filtros do destinatário e não devem bloquear a resposta da API.

## 3. Estado atual confirmado no repositório

### Backend

- `server/api/controllers/users/create.js` gera a password temporária e espera pelo envio SMTP antes de responder.
- `server/api/helpers/users/generate-temporary-password.js` usa `crypto.randomInt`, gera atualmente 20 caracteres e respeita o validador atual. A implementação proposta reduz a password temporária para 8 caracteres.
- `server/api/helpers/users/send-welcome-email.js` constrói HTML e texto simples no idioma do utilizador.
- `server/api/controllers/users/resend-welcome-email.js` gera uma nova password e repete o envio.
- `server/api/hooks/smtp/index.js` usa Nodemailer com pool SMTP.
- `mustChangePassword` e `welcomeEmailSentAt` já existem no modelo e na base de dados.
- Já existe um padrão de outbox persistente para emails do chat, que pode servir de referência para concorrência, retries e recuperação após reinício.

### Frontend

- `AddStep.jsx` já pede apenas nome, email e idioma.
- Quando o envio é aceite, o modal fecha; isto obriga o administrador a reabrir o fluxo para cada utilizador.
- Quando o envio falha, já existe uma ação de reenvio.
- A página de ações do utilizador já expõe o reenvio enquanto a password for temporária.

### Limitação principal

`welcomeEmailSentAt` significa atualmente que o SMTP aceitou a mensagem. Não prova que a caixa do destinatário a recebeu. Um filtro como Mailinblack pode aceitar/intercetar a mensagem e pedir autenticação depois desse momento.

## 4. Experiência de criação proposta

### 4.1 Modo rápido individual — primeira entrega

Manter o formulário atual, mas alterar o comportamento após a submissão:

1. A API cria a conta e coloca o email na fila.
2. A interface mostra “Utilizador criado; email em fila”.
3. O campo `nome` é limpo e recebe foco.
4. O campo `email` é limpo.
5. O idioma selecionado é mantido para a próxima criação.
6. O modal continua aberto e apresenta uma lista compacta dos utilizadores criados nesta sessão.
7. O botão secundário passa a ser “Concluir”.

Atalhos:

- `Enter`: criar quando os campos são válidos;
- após sucesso, foco automático no nome seguinte;
- opção “Criar e fechar” para quem pretende adicionar apenas uma conta.

Este ajuste entrega valor rapidamente e não depende ainda da importação em lote.

### 4.2 Modo em lote — segunda entrega

Adicionar duas abas no mesmo fluxo:

- **Um utilizador**;
- **Vários utilizadores**.

O modo em lote aceita:

- colagem direta a partir de Excel/Google Sheets;
- ficheiro `.csv` em UTF-8;
- colunas `nome`, `email` e `idioma`;
- idioma global como fallback para linhas sem idioma.

Exemplo de conteúdo:

```csv
nome,email,idioma
Ana Silva,ana@empresa.pt,pt-PT
Jean Martin,jean@empresa.fr,fr-FR
```

Antes de criar, apresentar uma pré-visualização com estados:

- válido;
- email inválido;
- idioma não suportado;
- duplicado dentro do ficheiro;
- email já existente na aplicação.

Por defeito, apenas as linhas válidas avançam. Nenhuma correção automática deve alterar nomes ou endereços sem ficar visível na pré-visualização.

### 4.3 Resultado do lote

O ecrã do lote apresenta contadores e detalhe por linha:

| Estado | Significado |
| --- | --- |
| `created` | conta criada, email ainda não processado |
| `queued` | email colocado na fila |
| `smtp_accepted` | servidor SMTP aceitou a mensagem |
| `challenge_required` | foi detetado um pedido de autenticação Mailinblack |
| `delivered` | entrega confirmada pelo fornecedor, quando disponível |
| `failed` | falha final após retries |
| `skipped` | linha inválida ou conta já existente |

A interface deve permitir:

- filtrar por estado;
- copiar a lista de erros;
- exportar um CSV de resultados sem passwords;
- reenviar os itens falhados;
- abrir a resolução assistida dos itens `challenge_required`.

## 5. Contratos de API

### 5.1 Criação individual

Manter:

```http
POST /api/users
```

Alterar a resposta para refletir a fila:

```json
{
  "item": {},
  "included": {
    "welcomeEmailStatus": "queued",
    "welcomeEmailJobId": "123"
  }
}
```

Durante uma transição curta, `welcomeEmailSent` pode continuar a ser devolvido para compatibilidade, mas deve ser removido quando todos os consumidores usarem o novo estado.

### 5.2 Validação e criação em lote

Rotas propostas:

```http
POST /api/users/bulk/validate
POST /api/users/bulk
GET  /api/user-onboarding-batches/:id
POST /api/user-onboarding-batches/:id/retry
```

Regras:

- apenas administradores;
- máximo inicial de 100 linhas por lote;
- email normalizado para minúsculas antes da comparação;
- `idempotencyKey` obrigatório no pedido de criação;
- uma repetição do mesmo pedido devolve o lote original;
- resultado por linha, sem rollback global por causa de uma linha inválida;
- nunca devolver passwords, payloads cifrados ou links Mailinblack não validados.

## 6. Fila persistente de onboarding

### 6.1 Razão

O envio SMTP é atualmente síncrono. Em lotes, isso aumenta o tempo da requisição e cria risco de timeout. Deve ser adotado o padrão de outbox já usado em `chat_email_notification`.

### 6.2 Tabelas propostas

#### `user_onboarding_batch`

- `id`;
- `created_by_user_id`;
- `idempotency_key` único;
- `total_count`, `created_count`, `skipped_count`, `failed_count`;
- `status` (`validating`, `processing`, `completed`, `completed_with_errors`);
- `created_at`, `updated_at`, `completed_at`.

#### `user_onboarding_item`

- `id`;
- `batch_id`, opcional para criação individual;
- `user_id`;
- `row_number`, opcional;
- `recipient_email`;
- `language`;
- `status`;
- `attempts`;
- `scheduled_at`, `processing_started_at`, `smtp_accepted_at`, `delivered_at`;
- `smtp_message_id`;
- `last_error_code` e `last_error_summary`;
- `challenge_url_encrypted`, opcional;
- dados cifrados necessários ao primeiro envio;
- `created_at`, `updated_at`.

Não guardar o HTML completo do email, a password em claro ou respostas integrais do SMTP.

### 6.3 Worker

Criar um hook e helpers dedicados, seguindo o padrão já existente:

```text
server/api/hooks/user-onboarding-emails/index.js
server/api/helpers/user-onboarding-emails/enqueue.js
server/api/helpers/user-onboarding-emails/process-due.js
```

Comportamento:

- claim de jobs através de transação e `FOR UPDATE SKIP LOCKED`;
- concorrência configurável, começando em 3 envios;
- retries com exponential backoff e jitter;
- recuperação de jobs `processing` abandonados após reinício;
- máximo de 5 tentativas;
- erro permanente para destinatário inválido e erro temporário para timeout/SMTP 4xx;
- atualização por socket para a interface refletir o progresso sem polling agressivo;
- rate limit separado do email de notificações.

## 7. Password temporária e segurança

### 7.1 Requisito atual

O requisito mantém o email com password temporária. A geração deve continuar no backend, mas o comprimento passa de 20 para **8 caracteres**.

A password temporária deve continuar a incluir pelo menos:

- uma letra maiúscula;
- uma letra minúscula;
- um número;
- um símbolo;
- validação pelo `isPassword` existente.

No primeiro acesso, o utilizador escolhe a sua password definitiva. Essa password deve ter **no mínimo 8 caracteres** e continuar a passar a validação de força do frontend e do backend. Ter 8 caracteres não significa que qualquer sequência simples, como `12345678`, seja aceite.

A password nunca pode aparecer em:

- resposta HTTP;
- evento de socket;
- webhook genérico;
- log;
- exportação CSV;
- analytics ou Sentry.

### 7.2 Consequência do envio assíncrono

Uma fila persistente precisa da password em claro no momento em que o email for composto, mas o hash guardado no utilizador não permite recuperá-la. Se for obrigatório manter este modelo, guardar temporariamente a password **cifrada**, nunca apenas codificada ou com hash.

Requisitos mínimos:

- AES-256-GCM;
- chave exclusiva em `WELCOME_EMAIL_ENCRYPTION_KEY`, fora da base de dados e do repositório;
- `iv` aleatório e `authTag` por registo;
- AAD com o `user_id` e o identificador do job;
- apagar ciphertext, IV e tag imediatamente após sucesso final;
- TTL máximo de 24 horas para o segredo;
- se o TTL expirar, cancelar o job e exigir emissão de uma nova credencial;
- nunca reutilizar a chave SMTP como chave de cifragem.

No reenvio, gerar uma password apenas uma vez por pedido e reutilizar o mesmo segredo cifrado em cada retry. Não gerar uma password diferente em cada tentativa.

### 7.3 Evolução recomendada

Como fase posterior, substituir a password por um **link de ativação de utilização única**, com validade curta, no qual o próprio utilizador define a password. Este modelo elimina a necessidade de guardar temporariamente uma password reversível e reduz o impacto de encaminhamentos ou quarentenas de email.

Enquanto o email com password for um requisito de negócio, aplicar as proteções da secção anterior e manter `mustChangePassword = true`.

## 8. Mailinblack: abordagem permitida e fiável

### 8.1 O que acontece

O Mailinblack pode intercetar o primeiro email de um remetente desconhecido e enviar ao remetente um pedido de autenticação com link e CAPTCHA. A aceitação inicial pelo SMTP não significa que a mensagem chegou à inbox do utilizador.

### 8.2 Solução preferida — pré-autorização

Não tentar ultrapassar ou resolver o CAPTCHA automaticamente.

Configurar um remetente estável, por exemplo:

```env
SMTP_FROM=Blachere Boards <boards@dominio.pt>
```

Depois, pedir ao administrador Mailinblack da organização destinatária para:

- autorizar `boards@dominio.pt`; ou
- autorizar o domínio remetente, quando a política da organização o permitir; ou
- importar esse remetente numa lista de permitidos para os utilizadores abrangidos.

O Mailinblack documenta oficialmente a autorização manual de endereços/domínios e a importação de listas de remetentes permitidos. Uma vez autorizado o remetente correto, os emails seguintes deixam de exigir o CAPTCHA enquanto essa autorização se mantiver.

Referências:

- [Autorizar ou banir um remetente](https://support.mailinblack.com/fr/articles/142436-comment-autoriser-ou-bannir-un-expediteur)
- [Funcionamento da autenticação do remetente](https://www.mailinblack.com/cgum/)
- [Exemplo oficial de pré-autorização de um remetente](https://support.mailinblack.com/fr/articles/143203-comment-parametrer-mon-serveur-mailinblack-avec-une-messagerie-privee-comme-apicrypt)

Também é necessário configurar corretamente SPF, DKIM e DMARC para o domínio de envio. Isto não substitui a autorização Mailinblack, mas reduz falhas de reputação e spoofing.

### 8.3 Fallback — resolução humana assistida

Se não for possível obter pré-autorização:

1. `SMTP_FROM` deve corresponder a uma caixa real e monitorizada, não a um endereço sem inbox.
2. Um conector de entrada (IMAP dedicado ou webhook do fornecedor de email) deteta pedidos de autenticação recebidos.
3. O sistema associa o pedido ao `smtp_message_id`, destinatário e job, sem expor conteúdo sensível.
4. O job passa para `challenge_required`.
5. Um administrador vê “Resolver autenticação Mailinblack”.
6. O sistema abre o link oficial validado e o administrador resolve manualmente o CAPTCHA.
7. A mensagem original é libertada pelo Mailinblack; o estado fica `smtp_accepted` ou `delivered` se existir confirmação posterior.

Proteções do link:

- permitir apenas HTTPS;
- usar uma allowlist explícita de hosts Mailinblack confirmados durante a integração;
- não fazer fetch do URL pelo backend;
- não seguir redirects para hosts fora da allowlist;
- cifrar o URL em repouso e apagá-lo depois da resolução/expiração;
- mostrar destinatário, data e remetente antes de abrir o link.

O próprio Mailinblack indica que a resolução do CAPTCHA é uma ação humana para autenticar o remetente. Automatizar essa resolução não faz parte deste plano.

Referência: [Responder a um pedido de autenticação Mailinblack](https://support.mailinblack.com/fr/articles/518416-comment-repondre-a-une-demande-d-authentification).

### 8.4 Limite de deteção

Sem acesso à caixa do remetente ou a eventos do fornecedor de email, a aplicação só consegue afirmar `smtp_accepted`; não consegue distinguir inbox, quarentena ou CAPTCHA. Por isso:

- renomear o significado visual de “enviado” para “aceite pelo servidor de email”;
- só usar `delivered` quando existir um evento de entrega verificável;
- não classificar automaticamente domínios como Mailinblack apenas pelo endereço do destinatário.

## 9. Entregabilidade geral

- Usar um único remetente estável e uma caixa monitorizada.
- Configurar SPF, DKIM e DMARC alinhados com o domínio de `SMTP_FROM`.
- Configurar `Reply-To` apenas se existir um processo real de resposta; o desafio é normalmente enviado ao remetente do envelope, pelo que este também deve ser monitorizado.
- Guardar `messageId`, código SMTP e timestamps, mas não o corpo do email.
- Processar bounces e complaints através do webhook do fornecedor, se disponível.
- Separar `smtp_accepted`, `delivered`, `bounced` e `challenge_required`.
- Evitar rajadas: concorrência e rate limit configuráveis.
- Não fazer retries automáticos para erros permanentes 5xx, destinatários inválidos ou complaints.

## 10. Alterações previstas

### Frontend

Alterar:

```text
client/src/components/common/AdministrationModal/UsersPane/AddStep.jsx
client/src/reducers/ui/user-create-form.js
client/src/sagas/core/services/users.js
client/src/api/users.js
client/src/actions/users.js
client/src/entry-actions/users.js
client/src/constants/ActionTypes.js
client/src/locales/*/core.js
```

Criar, com nomes ajustáveis à estrutura final:

```text
client/src/components/common/AdministrationModal/UsersPane/BulkAddStep.jsx
client/src/components/common/AdministrationModal/UsersPane/BulkPreviewStep.jsx
client/src/components/common/AdministrationModal/UsersPane/OnboardingBatchResult.jsx
client/src/utils/user-import.js
```

Usar `papaparse`, que já é uma dependência do cliente, para o CSV.

### Backend

Alterar:

```text
server/api/controllers/users/create.js
server/api/controllers/users/resend-welcome-email.js
server/config/routes.js
server/config/policies.js
server/config/custom.js
server/.env.sample
```

Criar:

```text
server/api/controllers/users/bulk-validate.js
server/api/controllers/users/bulk-create.js
server/api/controllers/user-onboarding-batches/show.js
server/api/controllers/user-onboarding-batches/retry.js
server/api/helpers/user-onboarding-emails/enqueue.js
server/api/helpers/user-onboarding-emails/process-due.js
server/api/helpers/user-onboarding-emails/encrypt-secret.js
server/api/helpers/user-onboarding-emails/decrypt-secret.js
server/api/hooks/user-onboarding-emails/index.js
server/db/migrations/<timestamp>_add_user_onboarding_outbox.js
```

A integração de inbox Mailinblack deve ser um módulo opcional e só deve ser criada depois de confirmar o fornecedor da caixa usada em `SMTP_FROM`.

## 11. Fases de execução

### Fase 0 — Configuração operacional, 0,5–1 dia

- definir o endereço real de `SMTP_FROM`;
- confirmar quem administra o Mailinblack dos domínios afetados;
- autorizar previamente o remetente/domínio;
- validar SPF, DKIM e DMARC;
- fazer um teste real com uma conta protegida.

### Fase 1 — Criação rápida individual, 1–2 dias

- manter modal aberto;
- preservar idioma e limpar nome/email;
- lista de resultados da sessão;
- ação “Criar e fechar”;
- testes de reducer, saga e componente.

Esta fase pode ser entregue sem fila e já reduz bastante o tempo administrativo.

### Fase 2 — Outbox de onboarding, 3–5 dias

- migration e worker;
- cifragem temporária da password;
- retries, recovery e limites;
- estados detalhados;
- migração do envio individual e reenvio para a fila.

### Fase 3 — Criação em lote, 3–5 dias

- colagem/CSV e pré-visualização;
- validação em lote;
- idempotência;
- progresso em tempo real;
- retry e exportação de resultados.

### Fase 4 — Deteção Mailinblack opcional, 3–6 dias

- depende do fornecedor da caixa do remetente;
- ingestão de mensagens de autenticação;
- associação segura ao job;
- estado `challenge_required`;
- resolução manual assistida.

**Estimativa total:** 7–13 dias sem o conector Mailinblack; 10–19 dias com o conector. A pré-autorização do remetente pode eliminar a necessidade da Fase 4.

## 12. Testes

### Backend

- criação individual devolve rapidamente `queued`;
- lote mistura linhas válidas, inválidas e duplicadas sem duplicar contas;
- idempotência devolve o mesmo lote;
- apenas administradores acedem às novas rotas;
- password não aparece em respostas, sockets, logs ou erros;
- segredo cifrado não é decifrável com chave errada;
- ciphertext é apagado após envio e após TTL;
- workers concorrentes não reclamam o mesmo job;
- job abandonado volta a `pending`;
- retries respeitam backoff e máximo de tentativas;
- SMTP 4xx é temporário e 5xx permanente conforme classificação;
- reenvio cria uma única nova credencial e reutiliza-a nos retries;
- password temporária gerada tem exatamente 8 caracteres e contém os quatro grupos exigidos;
- password definitiva com 8 caracteres fortes é aceite e uma password simples de 8 caracteres é rejeitada;
- eventos de bounce/challenge são associados ao job correto.

### Frontend

- criação sucessiva mantém idioma e foco;
- “Criar e fechar” fecha o modal;
- colagem de TSV de uma folha de cálculo funciona;
- CSV com BOM, acentos e diferentes fins de linha é lido corretamente;
- pré-visualização mostra todos os erros;
- utilizador pode corrigir uma linha sem reimportar;
- progresso por socket e fallback de refresh apresentam o mesmo resultado;
- exportação nunca inclui passwords;
- ações são navegáveis por teclado e têm estados acessíveis.

### Entregabilidade

- Gmail/Outlook normal;
- endereço Mailinblack com remetente pré-autorizado;
- endereço Mailinblack desconhecido gera pedido de autenticação;
- resolução humana liberta a mensagem;
- bounce permanente atualiza o estado;
- reinício do servidor durante um lote não perde jobs.

## 13. Critérios de aceitação

1. Um administrador consegue criar vários utilizadores consecutivos sem fechar/reabrir o formulário.
2. Um lote de até 100 linhas é validado antes de criar contas.
3. Repetir um pedido não duplica utilizadores nem jobs.
4. A API deixa de aguardar pelo envio SMTP.
5. Cada linha tem um resultado claro e recuperável.
6. A password temporária de 8 caracteres continua a ser gerada apenas no backend e não é exposta fora do email.
7. Qualquer password temporariamente reversível fica cifrada e é eliminada após uso/TTL.
8. “SMTP aceite” não é apresentado como confirmação de entrega.
9. O remetente pode ser pré-autorizado no Mailinblack sem contornar CAPTCHA.
10. Quando existir CAPTCHA, a resolução é humana e auditável.
11. Falhas podem ser repetidas seletivamente sem recriar as contas.
12. O fluxo existente de alteração obrigatória da password continua funcional e aceita uma password definitiva com um mínimo de 8 caracteres, desde que passe a validação de força.

## 14. Decisões necessárias antes da implementação

1. **Volume típico e máximo:** quantos utilizadores são normalmente criados de uma vez?
2. **Formato preferido:** colagem de Excel, CSV ou ambos? A proposta suporta ambos.
3. **Remetente real:** qual é a caixa usada em `SMTP_FROM` e pode receber mensagens?
4. **Mailinblack:** a organização controla a lista de remetentes permitidos dos destinatários afetados?
5. **Eventos de entrega:** o fornecedor SMTP oferece webhooks de delivered/bounce/complaint?
6. **Segurança futura:** é aceitável migrar depois de password por email para link de ativação de utilização única?

## 15. Recomendação de arranque

Executar primeiro a **Fase 0** e a **Fase 1**. São as alterações de menor risco e maior retorno imediato. Em paralelo, recolher o volume real de criação e confirmar se a pré-autorização do remetente resolve os destinatários Mailinblack. Só depois avançar para a outbox e o lote completo.
