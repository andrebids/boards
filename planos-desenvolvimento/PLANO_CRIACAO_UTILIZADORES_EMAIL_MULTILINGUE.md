# Plano — Criação simplificada de utilizadores com email multilingue

## 1. Objetivo

Simplificar a criação de utilizadores no PLANKA para que um administrador tenha de indicar apenas:

- nome;
- email;
- idioma.

O sistema deve gerar automaticamente uma password temporária segura, criar a conta e enviar um email no idioma escolhido com:

- endereço de acesso ao PLANKA;
- email utilizado no login;
- password temporária;
- indicação para alterar a password após o primeiro acesso.

Endereço de produção atual:

```text
https://boards.dsproject.pt/
```

O endereço não deve ficar hardcoded no código. Deve ser obtido através de `sails.config.custom.baseUrl`, alimentado pela variável de ambiente `BASE_URL`.

## 2. Decisões funcionais

### 2.1 Campos apresentados na criação

O formulário de criação passa a apresentar:

| Campo | Obrigatório | Valor por defeito |
| --- | --- | --- |
| Nome | Sim | — |
| Email | Sim | — |
| Idioma | Sim | `pt-PT` |

Deixam de ser pedidos no formulário:

- password;
- username;
- função global do utilizador.

### 2.2 Função global criada por defeito

Todos os utilizadores criados por este fluxo recebem a função global:

```text
boardUser
```

Esta é a função correta para utilizadores normais. Um `boardUser` pode ser adicionado a boards por um gestor do respetivo projeto.

Existem duas permissões diferentes que não devem ser confundidas:

| Nível | Valores | Finalidade |
| --- | --- | --- |
| Função global do utilizador | `admin`, `projectOwner`, `boardUser` | Controla administração e gestão de projetos |
| Função dentro de um board | `editor`, `viewer` | Controla o que o membro pode fazer nesse board |

Assim, um utilizador global `boardUser` pode ser membro de vários boards e ter, por exemplo, função `editor` num board e `viewer` noutro.

O `boardUser` não pode, por defeito:

- administrar a plataforma;
- criar projetos;
- gerir utilizadores;
- adicionar-se sozinho a boards aos quais não tem acesso.

### 2.3 Idiomas dos emails

O idioma guardado no utilizador deve ser também o idioma utilizado no email de boas-vindas.

O backend possui atualmente traduções de email para:

- `en-GB` — Inglês (Reino Unido);
- `en-US` — Inglês (Estados Unidos);
- `es-ES` — Espanhol;
- `fr-FR` — Francês;
- `it-IT` — Italiano;
- `pt-PT` — Português (Portugal);
- `ru-RU` — Russo.

Na primeira versão, o seletor de idioma da criação deve apresentar estes idiomas. Isto garante que qualquer idioma selecionado tem um email completamente traduzido.

Novos idiomas podem ser ativados depois de serem adicionadas as respetivas traduções no servidor. Não se deve apresentar no formulário um idioma cujo email de boas-vindas ainda não esteja traduzido.

## 3. Fluxo funcional

```text
Administrador preenche nome, email e idioma
                    ↓
Backend valida dados e email duplicado
                    ↓
Backend gera password temporária segura
                    ↓
Backend guarda apenas o hash da password
                    ↓
Conta é criada como boardUser
                    ↓
Template é escolhido através do idioma
                    ↓
Email de boas-vindas é enviado por SMTP
                    ↓
Interface apresenta o resultado do envio
```

## 4. Alterações no frontend

### 4.1 Formulário de criação

Ficheiro principal:

```text
client/src/components/common/AdministrationModal/UsersPane/AddStep.jsx
```

Alterações:

1. Remover o campo de password e a respetiva validação.
2. Remover o campo de username.
3. Remover o seletor de função global.
4. Adicionar um `Dropdown` de idioma.
5. Reutilizar os nomes, códigos e bandeiras existentes em `client/src/locales`.
6. Definir `pt-PT` como idioma inicial.
7. Enviar para a API apenas:

```json
{
  "name": "Nome do utilizador",
  "email": "utilizador@empresa.pt",
  "language": "pt-PT"
}
```

### 4.2 Resultado apresentado ao administrador

Em caso de sucesso completo:

```text
Utilizador criado e email de acesso enviado com sucesso.
```

Se a conta for criada, mas o SMTP falhar:

```text
O utilizador foi criado, mas não foi possível enviar o email de acesso.
```

Nesse caso deve ser apresentada uma ação `Reenviar email de acesso`.

### 4.3 Traduções da interface

Adicionar às traduções do cliente as mensagens necessárias para:

- idioma do email;
- criação e envio com sucesso;
- conta criada com falha de envio;
- reenvio em curso;
- reenvio concluído;
- erro no reenvio.

## 5. Alterações no backend

### 5.1 Contrato de criação

Ficheiro principal:

```text
server/api/controllers/users/create.js
```

Alterações:

1. Tornar `password` e `role` desnecessários na entrada da API.
2. Aceitar `name`, `email` e `language` como campos obrigatórios.
3. Validar o idioma contra a lista de idiomas suportados pelo email de boas-vindas.
4. Definir internamente:

```javascript
{
  role: User.Roles.BOARD_USER,
  username: null,
  language: inputs.language,
}
```

5. Gerar a password no servidor.
6. Nunca devolver a password na resposta da API.

A rota continua protegida pelas políticas atuais `is-authenticated` e `is-admin`.

### 5.2 Geração da password

Criar um helper dedicado, por exemplo:

```text
server/api/helpers/users/generate-temporary-password.js
```

Requisitos:

- usar o módulo criptográfico nativo do Node.js;
- gerar pelo menos 16 caracteres;
- incluir maiúsculas, minúsculas, números e símbolos;
- garantir que a password passa o validador atual `isPassword`;
- evitar caracteres visualmente ambíguos, se possível;
- manter a password em texto simples apenas em memória durante a criação e o envio;
- nunca escrever a password nos logs, webhooks ou resposta HTTP.

O helper de criação existente continua responsável por guardar apenas o hash com `bcrypt`.

### 5.3 Estado de password temporária

Adicionar ao modelo de utilizador:

```text
mustChangePassword: boolean
```

Valor na criação automática:

```text
true
```

Depois de o próprio utilizador alterar a password:

```text
false
```

Isto requer:

- migration da base de dados;
- atualização do modelo `User`;
- inclusão segura deste estado na apresentação do utilizador atual;
- encaminhamento do utilizador para alteração de password depois do primeiro login;
- bloqueio das restantes áreas até a password temporária ser substituída.

### 5.4 Email de boas-vindas

Criar um template dedicado, separado dos templates de notificações de cartões, por exemplo:

```text
server/views/email-templates/user-welcome.hbs
```

Criar um helper dedicado:

```text
server/api/helpers/users/send-welcome-email.js
```

Dados do template:

```javascript
{
  name,
  email,
  temporaryPassword,
  loginUrl: sails.config.custom.baseUrl,
  language,
}
```

O template deve ter versões HTML e texto simples e manter a identidade visual dos emails atuais.

### 5.5 Tradução do email

Adicionar chaves próprias aos ficheiros em:

```text
server/config/locales/
```

Chaves propostas:

```text
email:welcome:subject
email:welcome:preheader
email:welcome:greeting
email:welcome:introduction
email:welcome:accessUrl
email:welcome:loginEmail
email:welcome:temporaryPassword
email:welcome:changePasswordWarning
email:welcome:openBoards
email:welcome:securityNotice
```

O helper deve carregar as traduções usando exatamente `user.language`.

Fallback defensivo:

```text
idioma inexistente ou inválido → pt-PT
```

O fallback não deverá ocorrer no fluxo normal porque a API e o formulário usam a mesma lista de idiomas permitidos.

## 6. Conteúdo funcional do email

Exemplo em português:

```text
Assunto: A sua conta no Blachere Boards foi criada

Olá, {{name}},

Foi criada uma conta para si no Blachere Boards.

Endereço de acesso:
{{loginUrl}}

Email: {{email}}
Password temporária: {{temporaryPassword}}

Por segurança, altere a password depois do primeiro acesso.
```

Todos os textos, incluindo o assunto e o botão, devem seguir o idioma escolhido pelo administrador.

## 7. Tratamento de falhas e reenvio

Uma falha de SMTP não deve apagar automaticamente uma conta já criada, pois a criação também provoca eventos de socket e webhooks.

A resposta da API deve indicar separadamente o estado do envio:

```json
{
  "item": {},
  "included": {
    "welcomeEmailSent": true
  }
}
```

Quando `welcomeEmailSent` for `false`, a interface mantém a criação como concluída e apresenta o reenvio.

Criar uma rota administrativa, por exemplo:

```text
POST /api/users/:id/resend-welcome-email
```

Regras do reenvio:

1. Apenas administradores podem executar a ação.
2. Confirmar que o utilizador existe e não é SSO.
3. Gerar uma nova password temporária.
4. Atualizar o hash e invalidar sessões existentes.
5. Manter `mustChangePassword = true`.
6. Enviar o novo email no idioma guardado no utilizador.
7. A password anterior deixa de funcionar.

## 8. Segurança e configuração SMTP

Antes da entrada em produção:

1. Remover credenciais SMTP definidas diretamente em `server/config/custom.js`.
2. Guardar segredos apenas em `server/.env` ou num gestor de segredos.
3. Rodar qualquer credencial que tenha estado guardada no repositório.
4. Ativar validação TLS em produção.
5. Não registar o HTML completo do email.
6. Não registar a password temporária.
7. Não incluir a password em webhooks ou eventos de socket.
8. Confirmar que `SMTP_FROM` utiliza um domínio autorizado.

Variáveis esperadas:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Blachere Boards <boards@dominio.pt>
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

## 9. Testes

### 9.1 Backend

- criar utilizador com nome, email e cada idioma suportado;
- rejeitar nome vazio;
- rejeitar email inválido;
- rejeitar email duplicado;
- rejeitar idioma não suportado;
- verificar que a função criada é sempre `boardUser`;
- verificar que a password não está na resposta;
- verificar que o hash guardado autentica a password gerada;
- verificar que passwords diferentes são geradas em criações diferentes;
- verificar seleção correta do idioma e assunto do email;
- verificar fallback defensivo para `pt-PT`;
- simular SMTP indisponível;
- testar reenvio e invalidação da password anterior;
- verificar que apenas administradores podem criar e reenviar;
- verificar alteração de `mustChangePassword`.

### 9.2 Frontend

- apresentar apenas nome, email e idioma;
- iniciar com `pt-PT` selecionado;
- enviar o código correto do idioma;
- mostrar sucesso de criação e envio;
- mostrar sucesso parcial quando o SMTP falhar;
- permitir reenvio;
- encaminhar o novo utilizador para alteração da password no primeiro login.

### 9.3 Email

- validar HTML e texto simples;
- validar caracteres acentuados;
- validar em desktop e mobile;
- validar Gmail, Outlook e webmail utilizado pela organização;
- confirmar que o botão usa `BASE_URL`;
- confirmar que assunto, conteúdo e botão correspondem ao idioma escolhido.

## 10. Critérios de aceitação

A funcionalidade fica concluída quando:

1. Um administrador cria uma conta indicando apenas nome, email e idioma.
2. A conta é sempre criada como `boardUser`.
3. O utilizador pode ser adicionado posteriormente a qualquer board como `editor` ou `viewer` por quem tenha permissões no projeto.
4. A password é gerada apenas no backend e guardada apenas como hash.
5. O email chega no idioma selecionado.
6. O email contém o URL, o email de login e a password temporária.
7. Nenhuma API, log, socket ou webhook expõe a password.
8. Uma falha de SMTP é comunicada sem deixar o administrador perante um falso erro de criação.
9. É possível reenviar as credenciais de forma segura.
10. O utilizador é obrigado a substituir a password temporária.

## 11. Fases de implementação

### Fase 1 — Formulário e contrato da API

- simplificar formulário;
- adicionar idioma;
- definir `boardUser` no backend;
- gerar password temporária.

Estimativa: 3–4 horas.

### Fase 2 — Email multilingue

- criar template;
- adicionar traduções;
- integrar SMTP;
- adicionar HTML e texto simples.

Estimativa: 4–6 horas.

### Fase 3 — Segurança de primeiro acesso

- migration `mustChangePassword`;
- obrigar alteração no primeiro login;
- invalidar sessões após alteração.

Estimativa: 3–5 horas.

### Fase 4 — Falhas e reenvio

- estado de envio na resposta;
- endpoint de reenvio;
- mensagens da interface;
- nova password em cada reenvio.

Estimativa: 2–4 horas.

### Fase 5 — Testes e publicação

- testes backend e frontend;
- testes SMTP reais;
- revisão de segurança;
- deployment e smoke test.

Estimativa: 3–4 horas.

Estimativa total: 15–23 horas de desenvolvimento e validação.

## 12. Ficheiros principais previstos

### Alterar

```text
client/src/components/common/AdministrationModal/UsersPane/AddStep.jsx
client/src/reducers/ui/user-create-form.js
client/src/locales/*/common.json
server/api/controllers/users/create.js
server/api/controllers/users/update-password.js
server/api/helpers/users/create-one.js
server/api/helpers/utils/send-email.js
server/api/models/User.js
server/config/custom.js
server/config/locales/*.json
server/config/routes.js
server/config/policies.js
```

### Criar

```text
server/api/controllers/users/resend-welcome-email.js
server/api/helpers/users/generate-temporary-password.js
server/api/helpers/users/send-welcome-email.js
server/views/email-templates/user-welcome.hbs
server/db/migrations/<timestamp>_add_must_change_password_to_user.js
```
