# 📧 PLANO NODEMAILER - NOTIFICAÇÕES GLOBAIS SIMPLES

## 🎯 RESUMO EXECUTIVO

**Objetivo:** Implementar notificações globais usando **Nodemailer** (nativo do Node.js) para eliminar a complexidade do Apprise e criar um sistema simples e eficaz.

**Porquê Nodemailer?**
- ✅ **Zero dependências** externas
- ✅ **Nativo do Node.js** (mesma linguagem do projeto)
- ✅ **Segurança first** - evita vetores RCE conhecidos
- ✅ **Unicode everywhere** - suporte completo a emojis
- ✅ **Cross-platform** - funciona igual em Linux, macOS, Windows
- ✅ **HTML + plain-text** automático
- ✅ **TLS/STARTTLS** out-of-the-box
- ✅ **Attachments & embedded images** sem dor
- ✅ **DKIM signing & OAuth2** suportados

---

## 🔍 ANÁLISE DO SISTEMA ATUAL

### **Sistema Atual (Complexo):**
```
Utilizador → NotificationService (BD) → Apprise (Python) → SMTP
                ↓
            Configuração individual obrigatória
```

### **Sistema Proposto (Nodemailer):**
```
Utilizador → Nodemailer (Node.js) → SMTP → Email
                ↓
            Configuração única para todos
```

---

## 🚀 VANTAGENS DO NODEMAILER

### **✅ Simplicidade Total:**
- **Uma única dependência:** `nodemailer`
- **Sem Python** ou subprocessos
- **Sem Apprise** ou configurações complexas
- **Código direto** e limpo

### **✅ Segurança:**
- **Zero runtime dependencies** - implementação em um pacote auditado
- **Security first** - evita vetores RCE conhecidos
- **TLS/STARTTLS** automático
- **DKIM signing** suportado

### **✅ Performance:**
- **Processamento direto** em Node.js
- **Sem overhead** de subprocessos
- **Connection pooling** automático
- **Resposta mais rápida**

### **✅ Funcionalidades:**
- **HTML + plain-text** automático
- **Attachments** e imagens inline
- **Unicode completo** (emojis 💪)
- **Múltiplos transportes** (SMTP, Sendmail, SES, etc.)

---

## 📚 TUTORIAIS NODEMAILER - IMPLEMENTAÇÃO PRÁTICA

### **1. Instalação e Configuração Básica**

#### **Instalação:**
```bash
# No diretório server/
npm install nodemailer
```

#### **Criar Transporter (Configuração Básica):**
```javascript
const nodemailer = require("nodemailer");

// Criar transporter para SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

#### **Verificar Conexão (Recomendado):**
```javascript
// Verificar se a configuração SMTP funciona
try {
  await transporter.verify();
  console.log("✅ Servidor SMTP pronto para receber mensagens");
} catch (err) {
  console.error("❌ Falha na verificação SMTP:", err);
}
```

### **2. Envio de Mensagens**

#### **Mensagem Básica:**
```javascript
(async () => {
  try {
    const info = await transporter.sendMail({
      from: '"Planka Team" <noreply@planka.com>', // endereço do remetente
      to: "user@example.com", // destinatário
      subject: "Notificação Planka", // assunto
      text: "Versão texto simples", // corpo em texto simples
      html: "<b>Versão HTML</b>", // corpo em HTML
    });

    console.log("✅ Mensagem enviada: %s", info.messageId);
    console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("❌ Erro ao enviar email:", err);
  }
})();
```

#### **Mensagem com Anexos (Logo):**
```javascript
const message = {
  from: '"Planka" <noreply@planka.com>',
  to: "user@example.com",
  subject: "Nova Atividade no Planka",
  html: `
    <div style="font-family: Arial, sans-serif;">
      <img src="cid:logo@planka" alt="Planka Logo" style="height: 50px;">
      <h2>Nova Atividade</h2>
      <p>João criou um novo cartão no board "Projeto Alpha"</p>
      <a href="https://planka.com/boards/123/cards/456">Ver Cartão</a>
    </div>
  `,
  text: "João criou um novo cartão no board 'Projeto Alpha'. Ver: https://planka.com/boards/123/cards/456",
  attachments: [
    {
      filename: 'logo.png',
      path: path.join(__dirname, 'public', 'logo192.png'),
      cid: 'logo@planka' // Content-ID para referência no HTML
    }
  ]
};
```

### **3. Configurações Avançadas**

#### **Connection Pooling (Performance):**
```javascript
const transporter = nodemailer.createTransport({
  pool: true, // Ativar pool de conexões
  host: "smtp.example.com",
  port: 465,
  secure: true, // usar TLS
  auth: {
    user: "username",
    pass: "password",
  },
  // Configurações do pool
  maxConnections: 5, // máximo de conexões simultâneas
  maxMessages: 100, // máximo de mensagens por conexão
  rateDelta: 20000, // 20 segundos
  rateLimit: 5, // 5 emails por rateDelta
});
```

#### **TLS/SSL Seguro:**
```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  auth: {
    user: "username",
    pass: "password",
  },
  tls: {
    // Não falhar em certificados inválidos (desenvolvimento)
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  },
});
```

#### **Headers Personalizados:**
```javascript
const message = {
  from: '"Planka" <noreply@planka.com>',
  to: "user@example.com",
  subject: "Notificação Planka",
  html: "<p>Conteúdo do email</p>",
  headers: {
    'X-Mailer': 'Planka Global Notifications',
    'X-Priority': '3',
    'X-Custom-Header': 'valor personalizado'
  },
  priority: 'normal', // 'high', 'normal', 'low'
  encoding: 'utf8'
};
```

### **4. Configuração por Ambiente**

#### **Desenvolvimento (Ethereal Email):**
```javascript
// ./mail-transport.js
const nodemailer = require("nodemailer");

function createTransport() {
  if (process.env.NODE_ENV === "production") {
    // 🚀 Emails reais em produção
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // 🧪 Capturado pelo Ethereal (desenvolvimento)
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USERNAME,
      pass: process.env.ETHEREAL_PASSWORD,
    },
  });
}

module.exports = createTransport;
```

#### **Conta de Teste Ethereal:**
```javascript
// Criar conta de teste automaticamente
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error("❌ Falha ao criar conta de teste:", err.message);
    return;
  }

  console.log("✅ Conta de teste criada:");
  console.log("📧 User:", account.user);
  console.log("🔑 Pass:", account.pass);
  console.log("🔗 SMTP URL:", account.smtp.host);
  console.log("🌐 Web URL:", account.web);

  // Usar a conta criada
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
});
```

### **5. Tratamento de Erros e Logs**

#### **Logs Detalhados:**
```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: "username",
    pass: "password",
  },
  // Debug (apenas em desenvolvimento)
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
});
```

#### **Tratamento de Erros Robusto:**
```javascript
async function sendNotification(emailData) {
  try {
    // Verificar conexão antes de enviar
    await transporter.verify();
    
    const info = await transporter.sendMail(emailData);
    
    sails.log.info(`✅ Notificação enviada com sucesso:`);
    sails.log.info(`   📧 Message ID: ${info.messageId}`);
    sails.log.info(`   📬 Para: ${emailData.to}`);
    sails.log.info(`   📋 Assunto: ${emailData.subject}`);
    
    // Log da URL de preview (Ethereal)
    if (info.previewUrl) {
      sails.log.info(`   🔗 Preview: ${info.previewUrl}`);
    }
    
    return info;
    
  } catch (error) {
    sails.log.error(`❌ Erro ao enviar notificação:`);
    sails.log.error(`   📧 Para: ${emailData.to}`);
    sails.log.error(`   📋 Assunto: ${emailData.subject}`);
    sails.log.error(`   ❌ Erro: ${error.message}`);
    
    // Log detalhado em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      sails.log.error(`   🔍 Stack: ${error.stack}`);
    }
    
    throw error;
  }
}
```

### **6. Configurações de Produção**

#### **Gmail SMTP:**
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail', // Usar serviço pré-configurado
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Senha de app, não senha normal
  },
});
```

#### **SendGrid SMTP:**
```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey", // Literalmente "apikey"
    pass: process.env.SENDGRID_API_KEY,
  },
});
```

#### **Amazon SES:**
```javascript
const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.AWS_SES_ACCESS_KEY,
    pass: process.env.AWS_SES_SECRET_KEY,
  },
});
```

### **7. Sistema de Teste com Ethereal Email**

#### **Substituição da Interface Apprise:**
A interface atual complexa do Apprise será substituída por um sistema simples de teste baseado no [Ethereal Email](https://nodemailer.com/smtp/testing).

#### **Interface Atual (REMOVER):**
```
❌ "O Blachere Boards usa Apprise para enviar notificações para mais de 100 serviços populares"
❌ URLs complexas: mailto://boards%40bids.pt:U3ldc6FeXqSUVE@mail.bids.pt:587/?from=board
❌ Configuração individual obrigatória
❌ Formatos HTML/Markdown
❌ Botões de teste/remover serviços
```

#### **Nova Interface (IMPLEMENTAR):**
```html
<div class="notification-test">
  <h3>🧪 Sistema de Teste de Notificações</h3>
  
  <div class="test-section">
    <p>Teste o sistema de notificações globais usando Ethereal Email:</p>
    <button id="create-test-account" class="btn-primary">
      🚀 Criar Conta de Teste
    </button>
    <button id="send-test-email" class="btn-secondary" disabled>
      📧 Enviar Email de Teste
    </button>
  </div>

  <div id="test-results" class="test-results" style="display: none;">
    <h4>✅ Conta de Teste Criada</h4>
    <div class="account-info">
      <p><strong>📧 User:</strong> <span id="test-user"></span></p>
      <p><strong>🔑 Pass:</strong> <span id="test-pass"></span></p>
      <p><strong>🌐 Dashboard:</strong> <a id="test-dashboard" target="_blank">Abrir Ethereal</a></p>
    </div>
  </div>

  <div id="email-results" class="email-results" style="display: none;">
    <h4>📬 Email de Teste Enviado</h4>
    <div class="email-info">
      <p><strong>📧 Message ID:</strong> <span id="message-id"></span></p>
      <p><strong>🔗 Preview:</strong> <a id="preview-url" target="_blank">Ver Email</a></p>
    </div>
  </div>

  <div class="help-section">
    <h4>ℹ️ Como Funciona</h4>
    <ul>
      <li><strong>Ethereal Email</strong> é um serviço gratuito para testes</li>
      <li>Emails são <strong>capturados</strong> mas nunca entregues</li>
      <li>Pode <strong>visualizar</strong> os emails no dashboard</li>
      <li>Contas são <strong>automaticamente removidas</strong> após 48h</li>
    </ul>
  </div>
</div>
```

#### **Funcionalidades do Ethereal:**
- ✅ **Gratuito** e open-source
- ✅ **Captura emails** sem entregar
- ✅ **Dashboard web** para visualizar
- ✅ **Auto-remoção** após 48h
- ✅ **Preview URLs** para cada email
- ✅ **Suporte completo** ao Nodemailer

#### **Implementação da API:**
```javascript
// server/api/controllers/notifications/create-test-account.js
const nodemailer = require('nodemailer');

module.exports = {
  async createTestAccount(req, res) {
    try {
      nodemailer.createTestAccount((err, account) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: 'Falha ao criar conta de teste: ' + err.message 
          });
        }

        res.json({
          success: true,
          user: account.user,
          pass: account.pass,
          smtp: account.smtp,
          web: account.web
        });
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};
```

---

## 🔧 IMPLEMENTAÇÃO COM NODEMAILER

### **1. Instalação (já existe no projeto)**
```bash
# Nodemailer já está instalado no Planka
npm list nodemailer
```

### **2. Configuração SMTP Específica (boards@bids.pt)**

#### **Variáveis de Ambiente (.env):**
```bash
# Configuração SMTP para boards@bids.pt
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_SMTP_HOST=mail.bids.pt
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_SECURE=false
GLOBAL_SMTP_USER="<YOUR_SMTP_USER>"
GLOBAL_SMTP_PASSWORD="<YOUR_SMTP_PASSWORD>"
GLOBAL_SMTP_FROM="Planka <boards@bids.pt>"

# Destinatários opcionais (se não especificado, usa emails dos utilizadores)
# GLOBAL_NOTIFICATION_RECIPIENTS=admin@bids.pt,manager@bids.pt
```

#### **Configuração no custom.js:**
```javascript
// server/config/custom.js
module.exports = {
  // ... configurações existentes ...

  // Configuração de notificações globais
  globalNotifications: {
    enabled: process.env.GLOBAL_NOTIFICATIONS_ENABLED === 'true',
    nodemailer: {
      host: process.env.GLOBAL_SMTP_HOST || 'mail.bids.pt',
      port: parseInt(process.env.GLOBAL_SMTP_PORT) || 587,
      secure: process.env.GLOBAL_SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.GLOBAL_SMTP_USER || '<YOUR_SMTP_USER>',
        pass: process.env.GLOBAL_SMTP_PASSWORD || '<YOUR_SMTP_PASSWORD>',
      },
      from: process.env.GLOBAL_SMTP_FROM || 'Planka <boards@bids.pt>',
      // Configurações avançadas do Nodemailer
      pool: true, // Connection pooling
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000, // 20 segundos
      rateLimit: 5, // 5 emails por rateDelta
      // TLS/SSL
      tls: {
        rejectUnauthorized: false, // Para desenvolvimento
        ciphers: 'SSLv3'
      },
      // Debug (apenas em desenvolvimento)
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    },
    recipients: process.env.GLOBAL_NOTIFICATION_RECIPIENTS ?
      process.env.GLOBAL_NOTIFICATION_RECIPIENTS.split(',').map(email => email.trim()) :
      null,
  },
};
```

#### **Teste da Configuração:**
```javascript
// Teste rápido da configuração SMTP
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.bids.pt',
  port: 587,
  secure: false, // true para 465, false para outros ports
  auth: {
    user: 'boards@bids.pt',
    pass: '<YOUR_SMTP_PASSWORD>',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verificar conexão
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erro na configuração SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP pronto para receber mensagens');
    console.log('📧 Configurado para: boards@bids.pt');
    console.log('🔗 Servidor: mail.bids.pt:587');
  }
});

// Enviar email de teste
transporter.sendMail({
  from: 'Planka <boards@bids.pt>',
  to: 'test@example.com',
  subject: '🧪 Teste de Configuração SMTP - Planka',
  text: 'Esta é uma notificação de teste do Planka usando boards@bids.pt',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🧪 Teste de Configuração SMTP</h2>
      <p>Esta é uma notificação de teste do Planka usando <strong>boards@bids.pt</strong></p>
      <p><strong>Servidor:</strong> mail.bids.pt:587</p>
      <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-PT')}</p>
      <p><strong>Status:</strong> ✅ Configuração funcionando</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        Sistema de notificações globais do Planka
      </p>
    </div>
  `
}).then((info) => {
  console.log('✅ Email de teste enviado:', info.messageId);
}).catch((error) => {
  console.log('❌ Erro ao enviar email de teste:', error);
});
```
# Se não estiver:
npm install nodemailer
```

### **2. Configuração SMTP no Dockerfile (Recomendado)**

#### **Localização no Dockerfile:**
Adicionar estas linhas no Dockerfile após a linha 37 (após as configurações existentes do NODE_OPTIONS e UNDICI_NO_FILE_API):

```dockerfile
# Configurações SMTP para notificações globais
ENV GLOBAL_NOTIFICATIONS_ENABLED=true
ENV GLOBAL_SMTP_HOST=mail.bids.pt
ENV GLOBAL_SMTP_PORT=587
ENV GLOBAL_SMTP_SECURE=false
ENV GLOBAL_SMTP_USER=boards@bids.pt
ENV GLOBAL_SMTP_PASSWORD=U3ldc6FeXqSUVE
ENV GLOBAL_SMTP_FROM="Planka <boards@bids.pt>"
```

#### **Dockerfile Completo (Exemplo):**
```dockerfile
# ... configurações existentes ...

# Configurações Node.js existentes
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV UNDICI_NO_FILE_API=1

# Configurações SMTP para notificações globais
ENV GLOBAL_NOTIFICATIONS_ENABLED=true
ENV GLOBAL_SMTP_HOST=mail.bids.pt
ENV GLOBAL_SMTP_PORT=587
ENV GLOBAL_SMTP_SECURE=false
ENV GLOBAL_SMTP_USER=boards@bids.pt
ENV GLOBAL_SMTP_PASSWORD=U3ldc6FeXqSUVE
ENV GLOBAL_SMTP_FROM="Planka <boards@bids.pt>"

# ... resto do Dockerfile ...
```

#### **Vantagens desta Abordagem:**
- ✅ **Não interfere** com configurações existentes do servidor
- ✅ **Apenas adiciona** as configurações SMTP necessárias
- ✅ **Mantém todas** as outras configurações do servidor intactas
- ✅ **Configurações ficam "hardcoded"** na imagem Docker
- ✅ **Não precisa** de alterar ficheiros .env no servidor
- ✅ **Deploy automático** - configurações já vêm na imagem
- ✅ **Isolamento** - não afeta outras aplicações no servidor

#### **Resultado:**
Quando a imagem Docker for construída e executada no servidor externo, as configurações SMTP estarão automaticamente disponíveis, sem sobrescrever as configurações críticas do servidor (BASE_URL, DATABASE_URL, SECRET_KEY, etc.).

#### **Comandos para Aplicar:**
```bash
# 1. Editar o Dockerfile
nano Dockerfile

# 2. Adicionar as linhas ENV após a linha 37
# (após NODE_OPTIONS e UNDICI_NO_FILE_API)

# 3. Reconstruir a imagem Docker
docker build -t planka-personalizado .

# 4. Verificar se as variáveis estão definidas
docker run --rm planka-personalizado env | grep GLOBAL

# 5. Deploy no servidor externo
docker-compose up -d
```

#### **Verificação das Configurações:**
```bash
# Verificar se as variáveis SMTP estão definidas no container
docker exec planka-server env | grep GLOBAL

# Resultado esperado:
# GLOBAL_NOTIFICATIONS_ENABLED=true
# GLOBAL_SMTP_HOST=mail.bids.pt
# GLOBAL_SMTP_PORT=587
# GLOBAL_SMTP_SECURE=false
# GLOBAL_SMTP_USER=boards@bids.pt
# GLOBAL_SMTP_PASSWORD=U3ldc6FeXqSUVE
# GLOBAL_SMTP_FROM=Planka <boards@bids.pt>
```

### **3. Configuração Global (Alternativa)**

**Ficheiro:** `server/config/custom.js`
```javascript
// Notificações globais com Nodemailer
globalNotifications: {
  enabled: process.env.GLOBAL_NOTIFICATIONS_ENABLED === 'true',
  nodemailer: {
    host: process.env.GLOBAL_SMTP_HOST || process.env.SMTP_HOST,
    port: process.env.GLOBAL_SMTP_PORT || process.env.SMTP_PORT || 587,
    secure: process.env.GLOBAL_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.GLOBAL_SMTP_USER || process.env.SMTP_USER,
      pass: process.env.GLOBAL_SMTP_PASSWORD || process.env.SMTP_PASSWORD,
    },
    from: process.env.GLOBAL_SMTP_FROM || process.env.SMTP_FROM,
    // Configurações avançadas do Nodemailer
    pool: true, // Connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 20000, // 20 segundos
    rateLimit: 5, // 5 emails por rateDelta
  },
  recipients: process.env.GLOBAL_NOTIFICATION_RECIPIENTS ? 
    process.env.GLOBAL_NOTIFICATION_RECIPIENTS.split(',').map(email => email.trim()) : 
    null,
}
```

### **3. Helper Nodemailer Global**

**Ficheiro:** `server/api/helpers/utils/send-global-notification.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const nodemailer = require('nodemailer');
const path = require('path');

module.exports = {
  inputs: {
    to: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    html: { type: 'string', required: true },
    data: { type: 'json' }, // Para gerar plain text
  },

  async fn(inputs) {
    // Verificar se notificações globais estão ativas
    if (!sails.config.custom.globalNotifications?.enabled) {
      sails.log.info('🔕 Notificações globais desativadas');
      return;
    }

    const config = sails.config.custom.globalNotifications.nodemailer;
    
    // Criar transporter Nodemailer com configurações otimizadas
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true para 465, false para outros ports
      auth: config.auth,
      // Configurações de performance e segurança
      pool: config.pool || true,
      maxConnections: config.maxConnections || 5,
      maxMessages: config.maxMessages || 100,
      rateDelta: config.rateDelta || 20000,
      rateLimit: config.rateLimit || 5,
      // TLS/SSL
      tls: {
        rejectUnauthorized: false, // Para desenvolvimento
        ciphers: 'SSLv3'
      },
      // Debug (apenas em desenvolvimento)
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    try {
      // Verificar conexão SMTP
      await transporter.verify();
      sails.log.info('✅ Conexão SMTP verificada com sucesso');

      // Preparar anexos (logo inline)
      const attachments = [];
      const logoPath = path.join(sails.config.appPath, 'client', 'public', 'logo192.png');
      const logoCid = 'logo@planka';
      
      if (require('fs').existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: logoCid
        });
      }

      // Substituir placeholder do logo no HTML
      const htmlWithLogo = inputs.html.replace('{{logo_url}}', `cid:${logoCid}`);

      // Gerar texto simples (fallback automático)
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

      // Configurar mensagem com Nodemailer
      const mailOptions = {
        from: config.from,
        to: inputs.to,
        subject: inputs.subject,
        // HTML e texto automático
        html: htmlWithLogo,
        text: inputs.data ? generatePlainText(inputs.data) : undefined,
        // Anexos
        attachments: attachments.length > 0 ? attachments : undefined,
        // Headers adicionais
        headers: {
          'X-Mailer': 'Planka Global Notifications',
          'X-Priority': '3',
        },
        // Configurações de encoding
        encoding: 'utf8',
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      
      sails.log.info(`✅ Notificação global enviada com Nodemailer:`);
      sails.log.info(`   📧 Message ID: ${info.messageId}`);
      sails.log.info(`   📬 Para: ${inputs.to}`);
      sails.log.info(`   📋 Assunto: ${inputs.subject}`);
      
      // Log da URL de preview (se usar Ethereal para testes)
      if (info.previewUrl) {
        sails.log.info(`   🔗 Preview: ${info.previewUrl}`);
      }
      
    } catch (error) {
      sails.log.error(`❌ Erro ao enviar notificação global com Nodemailer:`);
      sails.log.error(`   📧 Para: ${inputs.to}`);
      sails.log.error(`   📋 Assunto: ${inputs.subject}`);
      sails.log.error(`   ❌ Erro: ${error.message}`);
      
      // Log detalhado em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        sails.log.error(`   🔍 Stack: ${error.stack}`);
      }
      
      throw error;
    } finally {
      // Fechar conexões do pool
      transporter.close();
    }
  },
};
```

### **4. Integração no Sistema de Notificações**

**Ficheiro:** `server/api/helpers/notifications/create-one.js`

```javascript
// Adicionar no início do ficheiro
const buildAndSendGlobalNotification = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  const globalConfig = sails.config.custom.globalNotifications;
  
  // Determinar destinatário
  let recipientEmail;
  if (globalConfig.recipients && globalConfig.recipients.length > 0) {
    // Usar lista global de destinatários
    recipientEmail = globalConfig.recipients[0];
    sails.log.info(`📧 Enviando para email global: ${recipientEmail}`);
  } else {
    // Usar email do utilizador da notificação
    recipientEmail = notifiableUser.email;
    sails.log.info(`📧 Enviando para email do utilizador: ${recipientEmail}`);
  }

  // Gerar dados do template
  const templateData = await buildTemplateData(board, card, notification, actorUser, notifiableUser, t, inputs);
  
  // Gerar HTML usando templates existentes
  let html;
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      html = await sails.helpers.utils.compileEmailTemplate.with({
        templateName: notification.type,
        data: templateData,
      });
    } catch (error) {
      sails.log.error('❌ Erro nos templates, usando HTML inline:', error);
      html = buildInlineHtml(board, card, notification, actorUser, t);
    }
  } else {
    html = buildInlineHtml(board, card, notification, actorUser, t);
  }

  // Enviar notificação global com Nodemailer
  await sails.helpers.utils.sendGlobalNotification.with({
    to: recipientEmail,
    subject: buildTitle(notification, t),
    html: html,
    data: templateData,
  });
};

// Modificar a função fn(inputs) para incluir notificações globais
async fn(inputs) {
  const { values } = inputs;

  // ... código existente para criar notificação ...

  // 🔄 NOVA LÓGICA: Sistema de notificações com Nodemailer
  const globalNotificationsEnabled = sails.config.custom.globalNotifications?.enabled;
  const hasUserServices = notificationServices.length > 0;
  const hasSmtpEnabled = sails.hooks.smtp.isEnabled();

  if (globalNotificationsEnabled || hasUserServices || hasSmtpEnabled) {
    const notifiableUser = values.user || (await User.qm.getOneById(notification.userId));
    const t = sails.helpers.utils.makeTranslator(notifiableUser.language);

    // 🎯 PRIORIDADE 1: Notificações globais com Nodemailer (se ativas)
    if (globalNotificationsEnabled) {
      try {
        await buildAndSendGlobalNotification(
          inputs.board,
          values.card,
          notification,
          values.creatorUser,
          notifiableUser,
          t,
          inputs,
        );
        sails.log.info('✅ Notificação global enviada com Nodemailer');
      } catch (error) {
        sails.log.error('❌ Erro na notificação global Nodemailer:', error.message);
        // Continuar com outros métodos se global falhar
      }
    }

    // 🎯 PRIORIDADE 2: Serviços específicos do utilizador (se existirem)
    if (hasUserServices) {
      const services = notificationServices.map((notificationService) =>
        _.pick(notificationService, ['url', 'format']),
      );

      buildAndSendNotifications(
        services,
        inputs.board,
        values.card,
        notification,
        values.creatorUser,
        t,
        { notifiableUser },
      );
    }

    // 🎯 PRIORIDADE 3: SMTP tradicional (se ativo)
    if (hasSmtpEnabled) {
      buildAndSendEmail(
        inputs.board,
        values.card,
        notification,
        values.creatorUser,
        notifiableUser,
        t,
        inputs,
      );
    }
  }

  return notification;
}
```

---

## ⚙️ CONFIGURAÇÃO

### **Variáveis de Ambiente**

**Ficheiro:** `.env`
```bash
# Ativar notificações globais com Nodemailer
GLOBAL_NOTIFICATIONS_ENABLED=true

# Configuração SMTP para Nodemailer
GLOBAL_SMTP_HOST=smtp.gmail.com
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_SECURE=false
GLOBAL_SMTP_USER=boards@empresa.com
GLOBAL_SMTP_PASSWORD=senha_segura
GLOBAL_SMTP_FROM=Planka <boards@empresa.com>

# Lista de emails para receber notificações (opcional)
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com

# Configurações avançadas do Nodemailer (opcional)
GLOBAL_SMTP_MAX_CONNECTIONS=5
GLOBAL_SMTP_MAX_MESSAGES=100
GLOBAL_SMTP_RATE_LIMIT=5
GLOBAL_SMTP_RATE_DELTA=20000
```

### **Configuração Docker Compose**

```yaml
# docker-compose.yml
environment:
  - GLOBAL_NOTIFICATIONS_ENABLED=true
  - GLOBAL_SMTP_HOST=smtp.gmail.com
  - GLOBAL_SMTP_PORT=587
  - GLOBAL_SMTP_SECURE=false
  - GLOBAL_SMTP_USER=boards@empresa.com
  - GLOBAL_SMTP_PASSWORD=senha_segura
  - GLOBAL_SMTP_FROM=Planka <boards@empresa.com>
  - GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com
  - GLOBAL_SMTP_MAX_CONNECTIONS=5
  - GLOBAL_SMTP_MAX_MESSAGES=100
  - GLOBAL_SMTP_RATE_LIMIT=5
  - GLOBAL_SMTP_RATE_DELTA=20000
```

---

## 🧪 TESTES COM NODEMAILER

### **1. Teste de Conectividade**
```bash
# Testar conexão SMTP
docker-compose exec planka-server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.GLOBAL_SMTP_HOST,
  port: process.env.GLOBAL_SMTP_PORT,
  secure: process.env.GLOBAL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.GLOBAL_SMTP_USER,
    pass: process.env.GLOBAL_SMTP_PASSWORD
  }
});
transporter.verify().then(() => {
  console.log('✅ Nodemailer SMTP OK');
  transporter.close();
}).catch(err => {
  console.error('❌ Nodemailer SMTP Error:', err.message);
  transporter.close();
});
"
```

### **2. Teste de Envio**
```bash
# Testar envio de email
docker-compose exec planka-server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.GLOBAL_SMTP_HOST,
  port: process.env.GLOBAL_SMTP_PORT,
  secure: process.env.GLOBAL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.GLOBAL_SMTP_USER,
    pass: process.env.GLOBAL_SMTP_PASSWORD
  }
});

(async () => {
  try {
    const info = await transporter.sendMail({
      from: process.env.GLOBAL_SMTP_FROM,
      to: 'teste@exemplo.com',
      subject: 'Teste Nodemailer',
      text: 'Teste de envio com Nodemailer',
      html: '<b>Teste de envio com Nodemailer</b>'
    });
    console.log('✅ Email enviado:', info.messageId);
    if (info.previewUrl) console.log('🔗 Preview:', info.previewUrl);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    transporter.close();
  }
})();
"
```

### **3. Teste com Ethereal (Desenvolvimento)**
```bash
# Para testes locais, usar Ethereal (conta de teste)
docker-compose exec planka-server node -e "
const nodemailer = require('nodemailer');

// Criar conta de teste Ethereal
nodemailer.createTestAccount().then((testAccount) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return transporter.sendMail({
    from: testAccount.user,
    to: 'teste@exemplo.com',
    subject: 'Teste Ethereal',
    html: '<b>Teste com Ethereal</b>'
  });
}).then((info) => {
  console.log('✅ Email enviado:', info.messageId);
  console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
}).catch(console.error);
"
```

---

## 🔍 LOGS E DEBUGGING

### **Logs do Nodemailer**
```bash
# Verificar logs de notificações globais
docker-compose logs planka | grep "Notificação global enviada com Nodemailer"

# Verificar conexão SMTP
docker-compose logs planka | grep "Conexão SMTP verificada"

# Verificar erros
docker-compose logs planka | grep "Erro ao enviar notificação global com Nodemailer"

# Verificar configuração
docker-compose logs planka | grep "Enviando para email"
```

### **Debug Avançado**
```bash
# Ativar debug do Nodemailer
NODE_ENV=development docker-compose up planka

# Ver logs detalhados
docker-compose logs -f planka | grep -E "(Nodemailer|SMTP|Email)"
```

---

## 📊 COMPARAÇÃO: APPRISE vs NODEMAILER

| Aspecto | Apprise (Atual) | Nodemailer (Proposto) |
|---------|-----------------|----------------------|
| **Dependências** | Python + Apprise | Apenas Node.js |
| **Instalação** | Complexa | `npm install nodemailer` |
| **Configuração** | URLs complexas | Objeto JavaScript simples |
| **Performance** | Subprocessos | Processamento direto |
| **Debugging** | Logs Python | Logs Node.js nativos |
| **Segurança** | Múltiplas camadas | Uma camada auditada |
| **Manutenção** | Difícil | Fácil |
| **Rollback** | Complexo | Simples |
| **Templates** | Limitados | HTML + plain-text automático |
| **Attachments** | Complexo | Simples |
| **Unicode** | Limitado | Completo (emojis 💪) |

---

## 🚀 BENEFÍCIOS IMEDIATOS

### **Para Desenvolvedores:**
- ✅ **Código mais limpo** e direto
- ✅ **Debugging mais fácil** (logs nativos)
- ✅ **Menos dependências** externas
- ✅ **Manutenção simplificada**

### **Para Administradores:**
- ✅ **Configuração única** para toda a organização
- ✅ **Sem necessidade** de configurar por utilizador
- ✅ **Gestão centralizada** de notificações
- ✅ **Logs claros** e informativos

### **Para Utilizadores:**
- ✅ **Recebem notificações** automaticamente
- ✅ **Sem configuração** necessária
- ✅ **Templates profissionais** e consistentes
- ✅ **Experiência uniforme**

---

## 🛠️ IMPLEMENTAÇÃO PASSO A PASSO

### **Passo 1: Configuração (5 min)**
```bash
# Adicionar variáveis ao .env
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_SMTP_HOST=smtp.gmail.com
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_USER=boards@empresa.com
GLOBAL_SMTP_PASSWORD=senha_segura
GLOBAL_SMTP_FROM=Planka <boards@empresa.com>
```

### **Passo 2: Criar Helper (10 min)**
```bash
# Criar ficheiro
touch server/api/helpers/utils/send-global-notification.js
# Copiar código do helper Nodemailer
```

### **Passo 3: Modificar create-one.js (15 min)**
```bash
# Editar ficheiro existente
# Adicionar lógica de notificações globais
# Manter compatibilidade com sistema atual
```

### **Passo 4: Testar (10 min)**
```bash
# Reiniciar servidor
docker-compose restart planka

# Testar conectividade SMTP
# Criar notificação de teste
# Verificar logs
# Confirmar envio de email
```

### **Passo 5: Validar (5 min)**
```bash
# Verificar se emails chegam
# Confirmar templates funcionam
# Testar diferentes tipos de notificação
# Verificar performance
```

---

## 🎯 CENÁRIOS DE USO

### **Cenário 1: Lista Global de Destinatários**
```bash
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com
```
- **Resultado:** Todas as notificações vão para admin@empresa.com e manager@empresa.com
- **Vantagem:** Centralização total das notificações

### **Cenário 2: Email Individual do Utilizador**
```bash
# GLOBAL_NOTIFICATION_RECIPIENTS não definido
```
- **Resultado:** Cada utilizador recebe notificação no seu próprio email
- **Vantagem:** Notificações personalizadas por utilizador

### **Cenário 3: Sistema Híbrido**
```bash
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com
# + utilizadores com configurações específicas
```
- **Resultado:** Admin recebe todas + utilizadores específicos recebem as suas
- **Vantagem:** Flexibilidade máxima

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### **Compatibilidade:**
- ✅ **Sistema atual continua** funcionando
- ✅ **Rollback fácil** se necessário
- ✅ **Migração gradual** possível
- ✅ **Sem quebra** de funcionalidades

### **Segurança:**
- ✅ **Credenciais em variáveis** de ambiente
- ✅ **TLS/STARTTLS** automático
- ✅ **Validação de emails** mantida
- ✅ **Logs seguros** (sem passwords)

### **Performance:**
- ✅ **Connection pooling** automático
- ✅ **Rate limiting** configurável
- ✅ **Processamento direto** Node.js
- ✅ **Resposta mais rápida**

---

## 🎉 CONCLUSÃO

O **Nodemailer** é a solução perfeita para este projeto:

1. **Elimina a complexidade** do Apprise
2. **Usa apenas Node.js** (linguagem do projeto)
3. **Zero dependências** externas
4. **Segurança first** - evita vetores RCE
5. **Performance superior** - sem subprocessos
6. **Funcionalidades completas** - HTML, attachments, Unicode
7. **Debugging fácil** - logs nativos
8. **Manutenção simples** - código limpo

**Tempo de implementação: 45 minutos**  
**Complexidade: Baixa**  
**Impacto: Alto**  
**Risco: Baixo** (rollback fácil)

---

**🚀 Sistema pronto para produção com Nodemailer - notificações globais simples, seguras e eficazes!**

---

## 🐞 LOGS DE DEBUG E MONITORIZAÇÃO

Para garantir que o sistema é transparente e fácil de depurar, serão adicionados logs estratégicos que aparecerão nos logs do Docker (`docker-compose logs planka`).

### **1. Logs de Inicialização**

Ao arrancar, o sistema irá logar o estado da configuração de notificações globais. Isto será adicionado ao `sails.config.lift`.

**Exemplo no Docker Log:**
```
✅ [GLOBAL_NOTIFICATIONS] Sistema de notificações globais ATIVADO.
   - Host SMTP: mail.bids.pt
   - Porta SMTP: 587
   - Utilizador SMTP: boards@bids.pt
   - Destinatários: Emails dos utilizadores notificados.
```

### **2. Logs de Fluxo de Notificação (em `create-one.js`)**

Estes logs permitem seguir o percurso de cada notificação.

**Exemplo no Docker Log:**
```
debug: [GLOBAL_NOTIFICATIONS] A processar notificação do tipo "COMMENT_CARD" para o utilizador ID: 1
info: [GLOBAL_NOTIFICATIONS] A tentar enviar notificação global para "user@example.com"...
info: ✅ [GLOBAL_NOTIFICATIONS] Conexão SMTP verificada com sucesso
info: ✅ [GLOBAL_NOTIFICATIONS] Notificação global enviada com Nodemailer:
info:    📧 Message ID: <...messageId...>
info:    📬 Para: user@example.com
info:    📋 Assunto: Blachere Boards: New Comment
```

### **3. Logs no Helper (`send-global-notification.js`)**

Os logs já definidos no helper mostram o resultado detalhado do envio.

### **Como Filtrar os Logs**

Para ver apenas os logs relevantes, pode usar `grep`:

```bash
docker-compose logs -f planka | grep "GLOBAL_NOTIFICATIONS"
```

Esta abordagem garante visibilidade total sobre o funcionamento do sistema, facilitando a identificação de problemas.
