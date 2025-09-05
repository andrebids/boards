# 📧 PLANO COMPLETO - TEMPLATES DE NOTIFICAÇÃO POR EMAIL

## 📋 RESUMO EXECUTIVO

**Objetivo:** Implementar um sistema de templates profissionais para notificações por email, substituindo o HTML inline atual por templates reutilizáveis e bem estruturados.

**Problema Atual:** 
- HTML inline hardcoded no ficheiro `create-one.js` (linha 145-203)
- Templates não reutilizáveis
- Design básico e pouco profissional
- Dificuldade de manutenção e personalização

**Solução:** Sistema de templates baseado em Handlebars com design profissional e responsivo.

---

## 🔍 ANÁLISE DO SISTEMA ATUAL

### **Ficheiros Identificados para Modificação:**

#### **1. Ficheiros Principais:**
- `server/api/helpers/notifications/create-one.js` - **CRÍTICO** (linhas 145-203)
- `server/api/helpers/utils/send-email.js` - **MODERADO** (pode precisar de ajustes)
- `server/utils/send_notifications.py` - **BAIXO** (pode precisar de ajustes menores)

#### **2. Novos Ficheiros a Criar:**
- `views/email-templates/` - **NOVO** (pasta para templates)
- `views/email-templates/master.hbs` - **NOVO** (template master)
- `views/email-templates/partials/` - **NOVO** (partials reutilizáveis)
- `server/api/helpers/utils/compile-email-template.js` - **NOVO** (helper para compilar templates)

#### **3. Tipos de Notificação Identificados:**
```javascript
// Notification.Types (server/api/models/Notification.js)
const Types = {
  MOVE_CARD: 'moveCard',           // ✅ Template necessário
  COMMENT_CARD: 'commentCard',     // ✅ Template necessário  
  ADD_MEMBER_TO_CARD: 'addMemberToCard', // ✅ Template necessário
  MENTION_IN_COMMENT: 'mentionInComment', // ✅ Template necessário
};
```

---

## 🎯 ESTRUTURA DO SISTEMA DE TEMPLATES

### **1. Template Master (master.hbs)**
```html
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>{{notification_title}}</title>
  <style>
    .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
    @media (max-width:600px){
      .container { width:100%!important; }
      .stack { display:block!important; width:100%!important; }
      .px { padding-left:16px!important; padding-right:16px!important; }
      .h1 { font-size:22px!important; line-height:28px!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f2f4f7;">
  <div class="preheader">{{preheader_text}}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width:600px; background:#ffffff; border:1px solid #e6e8eb; border-radius:12px;">
          {{> header}}
          {{> notification_type}}
          {{> notification_title}}
          {{> notification_summary}}
          {{> card_details}}
          {{> (lookup . 'notification_type')}} <!-- ✅ Usar partial do tipo -->
          {{> footer}}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### **2. Partials Reutilizáveis:**

#### **header.hbs**
```html
<!-- Header -->
<tr>
  <td class="px" style="padding:20px 24px 12px 24px;">
    <table role="presentation" width="100%">
      <tr>
        <td align="left">
          <a href="{{planka_base_url}}" target="_blank" style="text-decoration:none;">
            <img src="{{logo_url}}" alt="Planka" width="120" height="28" style="display:block; border:0;">
          </a>
        </td>
        <td align="right" style="font:500 12px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#374151;">
          Notificação • {{send_date}}
        </td>
      </tr>
    </table>
  </td>
</tr>
```

#### **notification_type.hbs**
```html
<!-- Tipo -->
<tr>
  <td style="padding:0 24px;">
    <table role="presentation" width="100%">
      <tr>
        <td style="background:{{type_background_color}}; border:1px solid {{type_border_color}}; color:{{type_text_color}}; font:600 12px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif; text-transform:uppercase; padding:10px 12px; border-radius:8px;">
          {{notification_type_label}}
        </td>
      </tr>
    </table>
  </td>
</tr>
```

#### **notification_title.hbs**
```html
<!-- Título -->
<tr>
  <td class="px" style="padding:16px 24px 0 24px;">
    <h1 style="margin:0; font:700 22px/28px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#1f2937;">
      {{actor_name}} {{action_verb}} {{action_object}}
    </h1>
  </td>
</tr>
```

#### **notification_summary.hbs**
```html
<!-- Resumo -->
<tr>
  <td class="px" style="padding:8px 24px 0 24px;">
    <p style="margin:0; font:500 14px/22px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#374151;">
      Projeto: <strong style="color:#111827;">{{project_name}}</strong> • 
      Board: <strong style="color:#111827;">{{board_name}}</strong> • 
      Lista: <strong style="color:#111827;">{{list_name}}</strong>
    </p>
  </td>
</tr>
```

#### **card_details.hbs**
```html
<!-- Cartão -->
<tr>
  <td class="px" style="padding:16px 24px;">
    <table role="presentation" width="100%" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px;">
      <tr>
        <td style="padding:16px 16px 8px 16px;">
          <div style="font:600 16px/22px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#111827;">
            {{card_title}}
          </div>
          <div style="margin-top:6px; font:400 13px/20px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#374151;">
            ID: {{card_id}} • Prazo: {{due_date}}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 16px 16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="border-top:1px solid #e5e7eb;">&nbsp;</td>
            </tr>
          </table>
          <div style="margin-top:12px; font:400 14px/22px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#1e293b;">
            {{> (lookup . 'notification_type')}}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 16px 16px;">
          {{> cta_button}}
        </td>
      </tr>
    </table>
  </td>
</tr>
```

#### **cta_button.hbs**
```html
<!-- Botão CTA com VML para Outlook -->
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{card_url}}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#1d4ed8">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Abrir no Planka</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{card_url}}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font:700 14px/40px Arial,sans-serif;border-radius:6px;padding:0 18px;">Abrir no Planka</a>
<!--<![endif]-->
```

#### **footer.hbs**
```html
<!-- Footer -->
<tr>
  <td class="px" style="padding:12px 24px 20px;">
    <table role="presentation" width="100%">
      <tr>
        <td style="font:400 12px/18px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#6b7280;">
          <p style="margin:0 0 8px 0;">
            Esta notificação foi enviada para {{user_email}}.
          </p>
          <p style="margin:0;">
            © {{current_year}} Planka. Todos os direitos reservados.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

### **3. Templates Específicos por Tipo:**

#### **move-card.hbs**
```html
<strong style="color:#111827;">Movido:</strong> {{from_list}} → {{to_list}}
```

#### **comment-card.hbs**
```html
<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
  <img src="{{actor_avatar_url}}" 
       alt="{{actor_avatar_alt}}"
       style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
  <div>
    <div style="font:600 14px/20px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#111827;">
      {{actor_name}}
    </div>
    <div style="font:400 13px/18px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#6b7280;">
      {{send_date}}
    </div>
  </div>
</div>
<div style="padding:12px; background:#f9fafb; border-radius:8px;">
  <strong style="color:#111827;">Comentário:</strong><br>
  "{{comment_excerpt}}"
</div>
```

#### **add-member-to-card.hbs**
```html
<strong style="color:#111827;">Adicionado como membro</strong> do cartão por {{actor_name}}.
```

#### **mention-in-comment.hbs**
```html
<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
  <img src="{{actor_avatar_url}}" 
       alt="{{actor_avatar_alt}}"
       style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
  <div>
    <div style="font:600 14px/20px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#111827;">
      {{actor_name}}
    </div>
    <div style="font:400 13px/18px -apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#6b7280;">
      {{send_date}}
    </div>
  </div>
</div>
<div style="padding:12px; background:#f9fafb; border-radius:8px;">
  <strong style="color:#111827;">Mencionado por {{actor_name}}:</strong><br>
  "{{comment_excerpt}}"
</div>
```

---

## ✅ ANÁLISE DE COMPATIBILIDADE DAS VARIÁVEIS

### **Variáveis DISPONÍVEIS no Sistema Planka:**

#### **✅ Dados Básicos - TODOS FUNCIONAM:**
- `{{actor_name}}` - ✅ `actorUser.name`
- `{{card_title}}` - ✅ `card.name`
- `{{card_id}}` - ✅ `card.id`
- `{{project_name}}` - ✅ `project.name` (via `inputs.project`)
- `{{board_name}}` - ✅ `board.name`
- `{{list_name}}` - ✅ `sails.helpers.lists.makeName(inputs.list)`
- `{{card_url}}` - ✅ `${sails.config.custom.baseUrl}/cards/${card.id}`
- `{{planka_base_url}}` - ✅ `sails.config.custom.baseUrl`
- `{{logo_url}}` - ✅ `cid:logo@planka` (anexo inline)
- `{{send_date}}` - ✅ `new Date().toLocaleDateString('pt-PT')`
- `{{user_email}}` - ✅ `notifiableUser.email`
- `{{current_year}}` - ✅ `new Date().getFullYear()`

#### **✅ Dados Específicos por Tipo:**
- `{{from_list}}` - ✅ `sails.helpers.lists.makeName(notification.data.fromList)`
- `{{to_list}}` - ✅ `sails.helpers.lists.makeName(notification.data.toList)`
- `{{comment_excerpt}}` - ✅ `notification.data.text` (null-safe)
- `{{due_date}}` - ✅ `card.dueDate` (formatado, null-safe)
- `{{actor_avatar_url}}` - ✅ Avatar do utilizador (com fallback)
- `{{actor_avatar_alt}}` - ✅ Nome do utilizador

---

## 🌐 COMPATIBILIDADE DE AMBIENTES (LOCALHOST vs LIVE)

### **✅ Links Funcionam em AMBOS os Ambientes:**

#### **Configuração Automática por Ambiente:**

**🔧 Desenvolvimento (localhost):**
```javascript
// docker-compose-dev.yml - linha 21
BASE_URL=http://localhost:3000

// Resultado nos emails:
card_url: "http://localhost:3000/cards/123"
logo_url: "cid:logo@planka"
planka_base_url: "http://localhost:3000"
```

**🚀 Produção (Live):**
```javascript
// docker-compose.yml - linha 17
BASE_URL=${PLANKA_BASE_URL:-http://104.197.195.116:3000}

// Para https://boards.dsproject.pt/ seria:
BASE_URL=https://boards.dsproject.pt

// Resultado nos emails:
card_url: "https://boards.dsproject.pt/cards/123"
logo_url: "cid:logo@planka"
planka_base_url: "https://boards.dsproject.pt"
```

---

## 🎨 PERSONALIZAÇÃO E CONFIGURAÇÃO

### **1. Cores por Tipo de Notificação:**
```javascript
const NOTIFICATION_COLORS = {
  moveCard: {
    background: '#eff8ff',
    border: '#b2ddff',
    text: '#175cd3',
  },
  commentCard: {
    background: '#f0f9ff',
    border: '#7dd3fc',
    text: '#0369a1',
  },
  addMemberToCard: {
    background: '#f0fdf4',
    border: '#86efac',
    text: '#166534',
  },
  mentionInComment: {
    background: '#fef3c7',
    border: '#fcd34d',
    text: '#92400e',
  },
};
```

### **2. Suporte a Múltiplos Idiomas:**
```javascript
// Traduções necessárias para pt-PT, en-US, fr-FR
const getSafeLanguage = (userLanguage) => {
  const supportedLanguages = ['en-US', 'en-GB', 'es-ES', 'it-IT', 'pt-PT', 'ru-RU', 'fr-FR'];
  return supportedLanguages.includes(userLanguage) ? userLanguage : 'en-US';
};
```

---

## 🚨 ANÁLISE CRÍTICA FINAL - PONTOS QUE VÃO MORDER

### **❌ PROBLEMAS CRÍTICOS IDENTIFICADOS:**

#### **1. HANDLEBARS/PARTIALS - REGISTO INCORRETO**
```javascript
// ❌ PROBLEMA: Passar HTML como string não funciona
notification_specific_content: specificTemplate, // HTML escapado

// ✅ FIX: Registar partials corretamente
const partialsDir = path.join(sails.config.appPath, 'views', 'email-templates', 'partials');
const typesDir = path.join(sails.config.appPath, 'views', 'email-templates', 'types');

// Varrer e registar todos os partials
fs.readdirSync(partialsDir).forEach(file => {
  const name = path.basename(file, '.hbs');
  const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
  Handlebars.registerPartial(name, content);
});

fs.readdirSync(typesDir).forEach(file => {
  const name = path.basename(file, '.hbs');
  const content = fs.readFileSync(path.join(typesDir, file), 'utf8');
  Handlebars.registerPartial(name, content);
});

// No master.hbs usar: {{> move-card}} em vez de {{{notification_specific_content}}}
```

#### **2. CSS PARA EMAIL - INLINING OBRIGATÓRIO**
```javascript
// ❌ PROBLEMA: <style> no <head> não funciona em Outlook
// ✅ FIX: Usar juice para inlinar CSS
npm install juice --save

// No compile-email-template.js:
const juice = require('juice');
const html = compiledTemplate(templateData);
return juice(html); // Inline CSS automaticamente
```

#### **3. BOTÃO VML PARA OUTLOOK - FALTANDO**
```html
<!-- ✅ FIX: Adicionar VML para Outlook -->
<!-- views/email-templates/partials/cta_button.hbs -->
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{card_url}}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#1d4ed8">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Abrir no Planka</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{card_url}}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font:700 14px/40px Arial,sans-serif;border-radius:6px;padding:0 18px;">Abrir no Planka</a>
<!--<![endif]-->
```

#### **4. HTML ALTERNATIVO - FALTANDO**
```javascript
// ❌ PROBLEMA: Sem text/plain = spam + clientes antigos
// ✅ FIX: Gerar multipart/alternative
// No send-email.js:
const generatePlainText = (data) => {
  return `${data.actor_name} ${data.action_verb} ${data.action_object}
  
Projeto: ${data.project_name}
Board: ${data.board_name}
Lista: ${data.list_name}

Cartão: ${data.card_title}
ID: ${data.card_id}

${data.card_url}

© ${data.current_year} Planka.`;
};

// Enviar como multipart
await transporter.sendMail({
  ...inputs,
  from: sails.config.custom.smtpFrom,
  text: generatePlainText(templateData), // ✅ Texto simples
  html: html, // ✅ HTML rico
});
```

#### **5. IMAGENS/LOGO - BLOQUEIO REMOTO**
```javascript
// ❌ PROBLEMA: Logo por URL = bloqueado por clientes
// ✅ FIX: Logo como anexo inline CID
const logoPath = path.join(sails.config.appPath, 'client', 'public', 'logo192.png');
const logoCid = 'logo@planka';

await transporter.sendMail({
  ...inputs,
  from: sails.config.custom.smtpFrom,
  attachments: [{
    filename: 'logo.png',
    path: logoPath,
    cid: logoCid
  }],
  html: html.replace('{{logo_url}}', `cid:${logoCid}`)
});
```

#### **6. I18N NO SERVIDOR - FALLBACK CONTROLADO**
```javascript
// ❌ PROBLEMA: fr-FR pode falhar
// ✅ FIX: Fallback controlado
const getSafeLanguage = (userLanguage) => {
  const supportedLanguages = ['en-US', 'en-GB', 'es-ES', 'it-IT', 'pt-PT', 'ru-RU', 'fr-FR'];
  return supportedLanguages.includes(userLanguage) ? userLanguage : 'en-US';
};

const t = sails.helpers.utils.makeTranslator(getSafeLanguage(notifiableUser.language));
```

#### **7. TIMEZONES - SERVIDOR vs UTILIZADOR**
```javascript
// ❌ PROBLEMA: toLocaleDateString usa timezone do servidor
// ✅ FIX: Usar timezone do utilizador
npm install luxon --save

const { DateTime } = require('luxon');
const userTimezone = notifiableUser.timezone || 'Europe/Lisbon';
const sendDate = DateTime.now().setZone(userTimezone).toLocaleString(DateTime.DATE_MED);
```

#### **8. PERFORMANCE - CACHE DE TEMPLATES**
```javascript
// ❌ PROBLEMA: Compilar a cada envio = lento
// ✅ FIX: Cache em memória
const templateCache = new Map();

const compileTemplate = (templateName) => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }
  
  const templatePath = path.join(sails.config.appPath, 'views', 'email-templates', `${templateName}.hbs`);
  const template = fs.readFileSync(templatePath, 'utf8');
  const compiled = Handlebars.compile(template);
  
  templateCache.set(templateName, compiled);
  return compiled;
};
```

#### **9. NULL-SAFETY - DADOS INEXISTENTES**
```javascript
// ❌ PROBLEMA: comment_excerpt, due_date podem ser null
// ✅ FIX: Null-safety
const templateData = {
  comment_excerpt: notification.data.text ? 
    escapeHtml(notification.data.text.substring(0, 100) + '...') : 
    'Sem comentário',
  due_date: card.dueDate ? 
    DateTime.fromJSDate(card.dueDate).setZone(userTimezone).toLocaleString(DateTime.DATE_MED) : 
    'Sem prazo',
  actor_avatar_url: actorUser.avatar ? 
    `${sails.config.custom.baseUrl}/api/avatars/${actorUser.avatar.dirname}/cover-180.${actorUser.avatar.extension}` : 
    `${sails.config.custom.baseUrl}/default-avatar.png`
};
```

#### **10. FEATURE FLAG - ROLLBACK SEGURO**
```javascript
// ✅ FIX: Feature flag para rollback
const EMAIL_TEMPLATES_ENABLED = process.env.EMAIL_TEMPLATES_ENABLED === 'true';

const buildAndSendEmail = async (board, card, notification, actorUser, notifiableUser, t) => {
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      // Usar templates novos
      const html = await sails.helpers.utils.compileEmailTemplate.with({...});
      await sails.helpers.utils.sendEmail.with({ html, ... });
    } catch (error) {
      sails.log.error('Template error, falling back to inline HTML:', error);
      // Fallback para HTML inline antigo
      buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
    }
  } else {
    // Usar HTML inline antigo
    buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
  }
};
```

---

## 📋 LISTA SECA E ACCIONÁVEL

### **🔧 IMPLEMENTAÇÃO CRÍTICA (ORDEM OBRIGATÓRIA):**

#### **1. DEPENDÊNCIAS (5 min)**
```bash
cd server
npm install juice luxon --save
```

#### **2. ESTRUTURA DE PASTAS (2 min)**
```bash
mkdir -p views/email-templates/partials
mkdir -p views/email-templates/types
```

#### **3. FEATURE FLAG (1 min)**
```bash
# .env
EMAIL_TEMPLATES_ENABLED=true
```

#### **4. HELPER DE COMPILAÇÃO CORRIGIDO (15 min)**
```javascript
// server/api/helpers/utils/compile-email-template.js
const Handlebars = require('handlebars');
const juice = require('juice');
const fs = require('fs');
const path = require('path');

const templateCache = new Map();

module.exports = {
  inputs: {
    templateName: { type: 'string', required: true },
    data: { type: 'json', required: true },
  },

  async fn(inputs) {
    // Cache de templates
    if (!templateCache.has(inputs.templateName)) {
      const templatePath = path.join(sails.config.appPath, 'views', 'email-templates', `${inputs.templateName}.hbs`);
      const template = fs.readFileSync(templatePath, 'utf8');
      templateCache.set(inputs.templateName, Handlebars.compile(template));
    }
    
    const compiledTemplate = templateCache.get(inputs.templateName);
    const html = compiledTemplate(inputs.data);
    
    // Inlinar CSS para compatibilidade com email
    return juice(html);
  },
};
```

#### **5. REGISTO DE PARTIALS (10 min)**
```javascript
// server/api/helpers/utils/register-email-partials.js
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

module.exports = {
  registerPartials() {
    const partialsDir = path.join(sails.config.appPath, 'views', 'email-templates', 'partials');
    const typesDir = path.join(sails.config.appPath, 'views', 'email-templates', 'types');
    
    // Registar partials
    if (fs.existsSync(partialsDir)) {
      fs.readdirSync(partialsDir).forEach(file => {
        const name = path.basename(file, '.hbs');
        const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
        Handlebars.registerPartial(name, content);
      });
    }
    
    // Registar tipos como partials
    if (fs.existsSync(typesDir)) {
      fs.readdirSync(typesDir).forEach(file => {
        const name = path.basename(file, '.hbs');
        const content = fs.readFileSync(path.join(typesDir, file), 'utf8');
        Handlebars.registerPartial(name, content);
      });
    }
  }
};
```

#### **6. SEND-EMAIL CORRIGIDO (10 min)**
```javascript
// server/api/helpers/utils/send-email.js
const generatePlainText = (data) => {
  return `${data.actor_name} ${data.action_verb} ${data.action_object}

Projeto: ${data.project_name}
Board: ${data.board_name}
Lista: ${data.list_name}

Cartão: ${data.card_title}
ID: ${data.card_id}

${data.card_url}

© ${data.current_year} Planka.`;
};

module.exports = {
  inputs: {
    to: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    html: { type: 'string', required: true },
    data: { type: 'json' }, // Para gerar plain text
  },

  async fn(inputs) {
    const transporter = sails.hooks.smtp.getTransporter();
    
    const mailOptions = {
      to: inputs.to,
      subject: inputs.subject,
      html: inputs.html,
      text: inputs.data ? generatePlainText(inputs.data) : undefined,
    };
    
    try {
      const info = await transporter.sendMail(mailOptions);
      sails.log.info(`Email sent: ${info.messageId}`);
    } catch (error) {
      sails.log.error(`Error sending email: ${error}`);
    }
  },
};
```

#### **7. BUILD-AND-SEND-EMAIL COM FALLBACK (20 min)**
```javascript
// server/api/helpers/notifications/create-one.js
const EMAIL_TEMPLATES_ENABLED = process.env.EMAIL_TEMPLATES_ENABLED === 'true';

const buildAndSendEmail = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      await buildAndSendEmailWithTemplates(board, card, notification, actorUser, notifiableUser, t, inputs);
    } catch (error) {
      sails.log.error('Template error, falling back to inline HTML:', error);
      await buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
    }
  } else {
    await buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
  }
};

const buildAndSendEmailWithTemplates = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  const project = inputs.project;
  const currentList = inputs.list;
  const listName = sails.helpers.lists.makeName(currentList);
  
  const templateData = {
    actor_name: escapeHtml(actorUser.name),
    card_title: escapeHtml(card.name),
    card_id: card.id,
    project_name: escapeHtml(project.name),
    board_name: escapeHtml(board.name),
    list_name: escapeHtml(listName),
    card_url: `${sails.config.custom.baseUrl}/cards/${card.id}`,
    planka_base_url: sails.config.custom.baseUrl,
    logo_url: `cid:logo@planka`, // CID para anexo inline
    send_date: new Date().toLocaleDateString('pt-PT'),
    user_email: notifiableUser.email,
    current_year: new Date().getFullYear(),
    
    // Null-safe
    comment_excerpt: notification.data.text ? 
      escapeHtml(notification.data.text.substring(0, 100) + '...') : 
      'Sem comentário',
    due_date: card.dueDate ? 
      new Date(card.dueDate).toLocaleDateString('pt-PT') : 
      'Sem prazo',
    
    ...getNotificationSpecificData(notification, actorUser, t, card, currentList),
  };

  const html = await sails.helpers.utils.compileEmailTemplate.with({
    templateName: notification.type,
    data: templateData,
  });

  await sails.helpers.utils.sendEmail.with({
    html,
    to: notifiableUser.email,
    subject: buildTitle(notification, t),
    data: templateData, // Para plain text
  });
};
```

#### **8. BOOT HOOK PARA REGISTAR PARTIALS (5 min)**
```javascript
// server/api/hooks/email-templates.js
module.exports = function(sails) {
  return {
    initialize: function(cb) {
      sails.on('hook:orm:loaded', function() {
        sails.helpers.utils.registerEmailPartials();
        cb();
      });
    }
  };
};
```

#### **9. TEMPLATE MASTER CORRIGIDO (5 min)**
```html
<!-- views/email-templates/master.hbs -->
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>{{notification_title}}</title>
  <style>
    .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
    @media (max-width:600px){
      .container { width:100%!important; }
      .stack { display:block!important; width:100%!important; }
      .px { padding-left:16px!important; padding-right:16px!important; }
      .h1 { font-size:22px!important; line-height:28px!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f2f4f7;">
  <div class="preheader">{{preheader_text}}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width:600px; background:#ffffff; border:1px solid #e6e8eb; border-radius:12px;">
          {{> header}}
          {{> notification_type}}
          {{> notification_title}}
          {{> notification_summary}}
          {{> card_details}}
          {{> (lookup . 'notification_type')}} <!-- ✅ Usar partial do tipo -->
          {{> footer}}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### **10. TESTE RÁPIDO (5 min)**
```bash
# Testar compilação
node -e "
const Handlebars = require('handlebars');
const fs = require('fs');
const template = fs.readFileSync('views/email-templates/master.hbs', 'utf8');
const compiled = Handlebars.compile(template);
console.log('✅ Template compila sem erros');
"
```

### **🎯 ORDEM DE IMPLEMENTAÇÃO:**
1. **Dependências** → 2. **Estrutura** → 3. **Feature Flag** → 4. **Helper** → 5. **Partials** → 6. **Send-Email** → 7. **Build-Email** → 8. **Boot Hook** → 9. **Templates** → 10. **Teste**

### **⚠️ PONTOS DE ATENÇÃO:**
- **Cache**: Templates ficam em memória (restart limpa)
- **Fallback**: HTML inline antigo como backup
- **CSS**: Juice inlina automaticamente
- **Partials**: Registados no boot
- **Null-safety**: Todos os campos protegidos
- **Multipart**: Text + HTML sempre

---

---

## 📊 ESTRUTURA DE FICHEIROS FINAL

```
views/
└── email-templates/
    ├── master.hbs                    # Template master
    ├── partials/
    │   ├── header.hbs               # Cabeçalho
    │   ├── notification_type.hbs    # Tipo de notificação
    │   ├── notification_title.hbs   # Título
    │   ├── notification_summary.hbs # Resumo
    │   ├── card_details.hbs         # Detalhes do cartão
    │   ├── cta_button.hbs           # Botão CTA com VML
    │   └── footer.hbs               # Rodapé
    └── types/
        ├── move-card.hbs            # Template para movimento
        ├── comment-card.hbs         # Template para comentário
        ├── add-member-to-card.hbs   # Template para adicionar membro
        └── mention-in-comment.hbs   # Template para menção

server/
├── api/
│   └── helpers/
│       ├── notifications/
│       │   └── create-one.js            # MODIFICADO
│       └── utils/
│           ├── compile-email-template.js # NOVO
│           ├── register-email-partials.js # NOVO
│           └── send-email.js            # MODIFICADO
└── api/
    └── hooks/
        └── email-templates.js          # NOVO
```

---

## 📈 BENEFÍCIOS ESPERADOS

### **Manutenibilidade:**
- ✅ **Templates reutilizáveis** e modulares
- ✅ **Separação de responsabilidades** (HTML vs lógica)
- ✅ **Fácil personalização** de design
- ✅ **Suporte a múltiplos idiomas**

### **Profissionalismo:**
- ✅ **Design responsivo** e moderno
- ✅ **Consistência visual** entre notificações
- ✅ **Branding profissional** com logo e cores
- ✅ **Experiência do utilizador** melhorada

### **Flexibilidade:**
- ✅ **Fácil adição** de novos tipos de notificação
- ✅ **Customização por tipo** (cores, ícones, etc.)
- ✅ **Suporte a A/B testing** de templates
- ✅ **Integração com sistemas externos**

---

## 🚨 RISCOS E MITIGAÇÕES

### **Riscos Identificados:**
1. **Breaking changes** no sistema de email existente
2. **Performance** na compilação de templates
3. **Compatibilidade** com clientes de email
4. **Dependências** externas (Handlebars, Juice, Luxon)

### **Mitigações:**
1. **Feature flag** para rollback imediato
2. **Cache de templates** compilados
3. **Testes em múltiplos clientes** de email
4. **Fallback** para HTML inline se necessário

---

## 📊 CRITÉRIOS DE SUCESSO

### **Funcionalidade:**
- ✅ **Todos os tipos** de notificação funcionam
- ✅ **Templates compilam** corretamente
- ✅ **Emails são enviados** com novo design
- ✅ **Responsividade** funciona em dispositivos móveis

### **Qualidade:**
- ✅ **Design profissional** e consistente
- ✅ **Performance** mantida ou melhorada
- ✅ **Compatibilidade** com clientes de email
- ✅ **Acessibilidade** básica implementada

### **Manutenibilidade:**
- ✅ **Código limpo** e bem documentado
- ✅ **Templates modulares** e reutilizáveis
- ✅ **Fácil adição** de novos tipos
- ✅ **Testes** abrangentes implementados

---

**Status:** ✅ **Plano Completo e Accionável**
**Prioridade:** 🔴 **Alta** (implementação imediata)
**Impacto:** 🚀 **Alto** (profissionalização + robustez)
**Timeline:** 2 horas (implementação crítica)
**Recursos:** 1 desenvolvedor experiente

---

**Próximos Passos:**
1. **Implementar lista seca** (ordem obrigatória)
2. **Testar cada passo** antes do seguinte
3. **Ativar feature flag** apenas após testes
4. **Monitorizar logs** para erros
5. **Rollback imediato** se necessário

---
