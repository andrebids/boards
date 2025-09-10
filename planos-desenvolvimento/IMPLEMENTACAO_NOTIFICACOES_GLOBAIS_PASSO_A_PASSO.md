# 🚀 IMPLEMENTAÇÃO PASSO A PASSO - NOTIFICAÇÕES GLOBAIS

## 📋 RESUMO EXECUTIVO

**Objetivo:** Implementar notificações globais simples que funcionem para todos os utilizadores sem configuração individual, **eliminando a dependência do Apprise** e usando **Nodemailer** (nativo do Node.js).

**Tempo estimado:** 45 minutos  
**Complexidade:** Baixa  
**Impacto:** Alto (simplicidade + funcionalidade)  

---

## 📚 **TUTORIAIS NODEMAILER - REFERÊNCIA RÁPIDA**

### **Instalação:**
```bash
# No diretório server/
npm install nodemailer
```

### **Configuração Básica:**
```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar conexão
await transporter.verify();
```

### **Envio de Email:**
```javascript
const info = await transporter.sendMail({
  from: '"Planka" <noreply@planka.com>',
  to: "user@example.com",
  subject: "Notificação Planka",
  text: "Versão texto simples",
  html: "<b>Versão HTML</b>",
});

console.log("✅ Mensagem enviada:", info.messageId);
```

### **Configuração por Ambiente:**
```javascript
// Desenvolvimento (Ethereal)
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: process.env.ETHEREAL_USERNAME,
    pass: process.env.ETHEREAL_PASSWORD,
  },
});

// Produção (SMTP real)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

### **Connection Pooling (Performance):**
```javascript
const transporter = nodemailer.createTransport({
  pool: true, // Ativar pool de conexões
  host: "smtp.example.com",
  port: 465,
  secure: true,
  auth: { user: "username", pass: "password" },
  maxConnections: 5, // máximo de conexões simultâneas
  maxMessages: 100, // máximo de mensagens por conexão
  rateDelta: 20000, // 20 segundos
  rateLimit: 5, // 5 emails por rateDelta
});
```

### **Tratamento de Erros:**
```javascript
try {
  await transporter.verify();
  const info = await transporter.sendMail(message);
  console.log("✅ Email enviado:", info.messageId);
} catch (error) {
  console.error("❌ Erro:", error.message);
}
```

### **Configuração SMTP Específica (boards@bids.pt):**
```bash
# Variáveis de ambiente (.env)
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_SMTP_HOST=mail.bids.pt
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_SECURE=false
GLOBAL_SMTP_USER=boards@bids.pt
GLOBAL_SMTP_PASSWORD=U3ldc6FeXqSUVE
GLOBAL_SMTP_FROM=Planka <boards@bids.pt>
```

```javascript
// Configuração Nodemailer para boards@bids.pt
const transporter = nodemailer.createTransport({
  host: 'mail.bids.pt',
  port: 587,
  secure: false,
  auth: {
    user: 'boards@bids.pt',
    pass: 'U3ldc6FeXqSUVE',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Teste da configuração
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erro SMTP:', error);
  } else {
    console.log('✅ SMTP configurado: boards@bids.pt');
  }
});
```

### **Sistema de Teste com Ethereal Email:**
```javascript
// Criar conta de teste automaticamente
const nodemailer = require("nodemailer");

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

  // Enviar email de teste
  transporter.sendMail({
    from: "Planka Test <test@planka.com>",
    to: "user@example.com",
    subject: "🧪 Teste de Notificação - Planka",
    text: "Esta é uma notificação de teste do Planka.",
    html: "<h2>🧪 Teste de Notificação</h2><p>Esta é uma notificação de teste do Planka.</p>",
  }).then((info) => {
    console.log("✅ Mensagem enviada:", info.messageId);
    console.log("🔗 Preview URL:", nodemailer.getTestMessageUrl(info));
  }).catch(console.error);
});
```

---

## 🔄 **SUBSTITUIÇÃO DA INTERFACE APPRISE**

### **Interface Atual (Apprise) - REMOVER:**
```
❌ Configuração individual complexa
❌ URLs como: mailto://boards%40bids.pt:U3ldc6FeXqSUVE@mail.bids.pt:587/?from=board
❌ Formatos HTML/Markdown
❌ Botões de teste/remover serviços
❌ "O Blachere Boards usa Apprise para enviar notificações para mais de 100 serviços populares"
```

### **Nova Interface (Nodemailer + Ethereal) - IMPLEMENTAR:**
```html
<div class="notification-settings">
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

### **JavaScript para a Nova Interface:**
```javascript
// client/src/components/NotificationTest.jsx
import React, { useState } from 'react';

const NotificationTest = () => {
  const [testAccount, setTestAccount] = useState(null);
  const [testEmail, setTestEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  const createTestAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/create-test-account', {
        method: 'POST'
      });
      const account = await response.json();
      setTestAccount(account);
    } catch (error) {
      alert('❌ Erro ao criar conta de teste');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testAccount) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: testAccount })
      });
      const result = await response.json();
      setTestEmail(result);
    } catch (error) {
      alert('❌ Erro ao enviar email de teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-test">
      <h3>🧪 Sistema de Teste de Notificações</h3>
      
      <div className="test-section">
        <p>Teste o sistema de notificações globais usando Ethereal Email:</p>
        <button 
          onClick={createTestAccount}
          disabled={loading || testAccount}
          className="btn-primary"
        >
          {loading ? '⏳ Criando...' : '🚀 Criar Conta de Teste'}
        </button>
        
        <button 
          onClick={sendTestEmail}
          disabled={!testAccount || loading}
          className="btn-secondary"
        >
          {loading ? '⏳ Enviando...' : '📧 Enviar Email de Teste'}
        </button>
      </div>

      {testAccount && (
        <div className="test-results">
          <h4>✅ Conta de Teste Criada</h4>
          <div className="account-info">
            <p><strong>📧 User:</strong> {testAccount.user}</p>
            <p><strong>🔑 Pass:</strong> {testAccount.pass}</p>
            <p><strong>🌐 Dashboard:</strong> 
              <a href={testAccount.web} target="_blank" rel="noopener noreferrer">
                Abrir Ethereal
              </a>
            </p>
          </div>
        </div>
      )}

      {testEmail && (
        <div className="email-results">
          <h4>📬 Email de Teste Enviado</h4>
          <div className="email-info">
            <p><strong>📧 Message ID:</strong> {testEmail.messageId}</p>
            <p><strong>🔗 Preview:</strong> 
              <a href={testEmail.previewUrl} target="_blank" rel="noopener noreferrer">
                Ver Email
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="help-section">
        <h4>ℹ️ Como Funciona</h4>
        <ul>
          <li><strong>Ethereal Email</strong> é um serviço gratuito para testes</li>
          <li>Emails são <strong>capturados</strong> mas nunca entregues</li>
          <li>Pode <strong>visualizar</strong> os emails no dashboard</li>
          <li>Contas são <strong>automaticamente removidas</strong> após 48h</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationTest;
```

### **APIs de Suporte:**
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

// server/api/controllers/notifications/send-test-email.js
const nodemailer = require('nodemailer');

module.exports = {
  async sendTestEmail(req, res) {
    try {
      const { account } = req.body;

      const transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });

      const info = await transporter.sendMail({
        from: '"Planka Test" <test@planka.com>',
        to: 'test@example.com',
        subject: '🧪 Teste de Notificação Global - Planka',
        text: 'Esta é uma notificação de teste do sistema global de notificações do Planka.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🧪 Teste de Notificação Global</h2>
            <p>Esta é uma notificação de teste do sistema global de notificações do Planka.</p>
            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-PT')}</p>
            <p><strong>Sistema:</strong> Nodemailer + Ethereal Email</p>
            <p><strong>Status:</strong> ✅ Funcionando corretamente</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Esta notificação foi enviada automaticamente pelo sistema de teste.
            </p>
          </div>
        `
      });

      res.json({
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
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

## ⚙️ **CONFIGURAÇÃO SMTP ESPECÍFICA - boards@bids.pt**

### **Variáveis de Ambiente (.env):**
```bash
# Configuração SMTP para boards@bids.pt
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_SMTP_HOST=mail.bids.pt
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_SECURE=false
GLOBAL_SMTP_USER=boards@bids.pt
GLOBAL_SMTP_PASSWORD=U3ldc6FeXqSUVE
GLOBAL_SMTP_FROM=Planka <boards@bids.pt>

# Destinatários opcionais (se não especificado, usa emails dos utilizadores)
# GLOBAL_NOTIFICATION_RECIPIENTS=admin@bids.pt,manager@bids.pt
```

### **Configuração no custom.js:**
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
        user: process.env.GLOBAL_SMTP_USER || 'boards@bids.pt',
        pass: process.env.GLOBAL_SMTP_PASSWORD || 'U3ldc6FeXqSUVE',
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

### **Teste da Configuração:**
```javascript
// Teste rápido da configuração SMTP
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.bids.pt',
  port: 587,
  secure: false, // true para 465, false para outros ports
  auth: {
    user: 'boards@bids.pt',
    pass: 'U3ldc6FeXqSUVE',
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

### **Comandos de Teste:**
```bash
# 1. Verificar se Nodemailer está instalado
npm list nodemailer

# 2. Testar configuração SMTP
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'mail.bids.pt',
  port: 587,
  secure: false,
  auth: { user: 'boards@bids.pt', pass: 'U3ldc6FeXqSUVE' },
  tls: { rejectUnauthorized: false }
});
transporter.verify((err, success) => {
  if (err) console.log('❌ Erro:', err.message);
  else console.log('✅ SMTP configurado: boards@bids.pt');
});
"

# 3. Verificar logs do Planka
docker-compose logs planka | grep "SMTP"
```

---

## 🐳 **CONFIGURAÇÃO SMTP NO DOCKERFILE**

### **Localização no Dockerfile:**
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

### **Dockerfile Completo (Exemplo):**
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

### **Vantagens desta Abordagem:**
- ✅ **Não interfere** com configurações existentes do servidor
- ✅ **Apenas adiciona** as configurações SMTP necessárias
- ✅ **Mantém todas** as outras configurações do servidor intactas
- ✅ **Configurações ficam "hardcoded"** na imagem Docker
- ✅ **Não precisa** de alterar ficheiros .env no servidor
- ✅ **Deploy automático** - configurações já vêm na imagem
- ✅ **Isolamento** - não afeta outras aplicações no servidor

### **Resultado:**
Quando a imagem Docker for construída e executada no servidor externo, as configurações SMTP estarão automaticamente disponíveis, sem sobrescrever as configurações críticas do servidor (BASE_URL, DATABASE_URL, SECRET_KEY, etc.).

### **Comandos para Aplicar:**
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

### **Verificação das Configurações:**
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

---

## 🎯 ANÁLISE DO PROBLEMA ATUAL

### **Sistema Atual (Complexo):**
```
Utilizador → NotificationService (BD) → Apprise (Python) → SMTP
                ↓
            Configuração individual obrigatória
```

### **Problemas Identificados:**
- ❌ Cada utilizador precisa configurar notificações
- ❌ Dependência do Apprise (Python) desnecessária
- ❌ Configuração complexa para administradores
- ❌ Múltiplos pontos de falha
- ❌ Debugging difícil

### **Solução Proposta (Simplificada):**
```
Utilizador → Nodemailer (Node.js) → SMTP → Email
                ↓
            Configuração única para todos
```

---

## 🔧 IMPLEMENTAÇÃO PASSO A PASSO

### **PASSO 1: Configuração de Ambiente (5 min)**

#### **1.1 Adicionar Variáveis ao .env**
```bash
# Adicionar ao ficheiro .env
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_SMTP_HOST=smtp.gmail.com
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_SECURE=false
GLOBAL_SMTP_USER=boards@empresa.com
GLOBAL_SMTP_PASSWORD=senha_segura
GLOBAL_SMTP_FROM=Planka <boards@empresa.com>

# Opcional: Lista de emails para receber todas as notificações
# Se não definido, cada utilizador recebe no seu próprio email
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com
```

#### **1.2 Atualizar docker-compose.yml**
```yaml
# Adicionar ao docker-compose.yml
environment:
  - GLOBAL_NOTIFICATIONS_ENABLED=true
  - GLOBAL_SMTP_HOST=smtp.gmail.com
  - GLOBAL_SMTP_PORT=587
  - GLOBAL_SMTP_SECURE=false
  - GLOBAL_SMTP_USER=boards@empresa.com
  - GLOBAL_SMTP_PASSWORD=senha_segura
  - GLOBAL_SMTP_FROM=Planka <boards@empresa.com>
  - GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com
```

---

### **PASSO 2: Configuração do Sistema (5 min)**

#### **2.1 Modificar server/config/custom.js**
```javascript
// Adicionar no final do ficheiro server/config/custom.js
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
},
```

---

### **PASSO 3: Criar Helper de Notificação Global (10 min)**

#### **3.1 Criar Ficheiro**
```bash
# Criar o ficheiro
touch server/api/helpers/utils/send-global-notification.js
```

#### **3.2 Código do Helper com Nodemailer**
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
    const transporter = nodemailer.createTransporter({
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

---

### **PASSO 4: Modificar Sistema de Notificações (15 min)**

#### **4.1 Editar server/api/helpers/notifications/create-one.js**

**Adicionar no início do ficheiro (após os imports):**
```javascript
// 🆕 NOVA FUNÇÃO: Notificação global
const buildAndSendGlobalNotification = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  const globalConfig = sails.config.custom.globalNotifications;
  
  // Determinar destinatário
  let recipientEmail;
  if (globalConfig.recipients && globalConfig.recipients.length > 0) {
    // Usar lista global de destinatários
    recipientEmail = globalConfig.recipients[0]; // Por simplicidade, usar primeiro email
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

  // Enviar notificação global
  await sails.helpers.utils.sendGlobalNotification.with({
    to: recipientEmail,
    subject: buildTitle(notification, t),
    html: html,
    data: templateData,
  });
};

// 🆕 FUNÇÃO AUXILIAR: Construir dados do template
const buildTemplateData = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  const project = inputs.project;
  const currentList = inputs.list;
  const listName = sails.helpers.lists.makeName(currentList);
  
  return {
    actor_name: escapeHtml(actorUser.name),
    card_title: escapeHtml(card.name),
    card_id: card.id,
    project_name: escapeHtml(project.name),
    board_name: escapeHtml(board.name),
    list_name: escapeHtml(listName),
    card_url: `${sails.config.custom.baseUrl}/cards/${card.id}`,
    planka_base_url: sails.config.custom.baseUrl,
    logo_url: `{{logo_url}}`, // Será substituído pelo helper
    send_date: new Date().toLocaleDateString('pt-PT'),
    user_email: notifiableUser.email,
    current_year: new Date().getFullYear(),
    
    // Dados específicos por tipo
    ...getNotificationSpecificData(notification, actorUser, t, card, currentList),
  };
};
```

**Modificar a função `fn(inputs)` (substituir a lógica existente):**
```javascript
async fn(inputs) {
  const { values } = inputs;

  // ... código existente para criar notificação ...

  // 🔄 NOVA LÓGICA: Sistema de notificações simplificado
  const globalNotificationsEnabled = sails.config.custom.globalNotifications?.enabled;
  const hasUserServices = notificationServices.length > 0;
  const hasSmtpEnabled = sails.hooks.smtp.isEnabled();

  if (globalNotificationsEnabled || hasUserServices || hasSmtpEnabled) {
    const notifiableUser = values.user || (await User.qm.getOneById(notification.userId));
    const t = sails.helpers.utils.makeTranslator(notifiableUser.language);

    // 🎯 PRIORIDADE 1: Notificações globais (se ativas)
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
        sails.log.info('✅ Notificação global enviada com sucesso');
      } catch (error) {
        sails.log.error('❌ Erro na notificação global:', error.message);
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

### **PASSO 5: Testar Sistema (10 min)**

#### **5.1 Reiniciar Serviços**
```bash
# Reiniciar o Planka
docker-compose restart planka

# Verificar logs
docker-compose logs -f planka
```

#### **5.2 Verificar Configuração**
```bash
# Verificar se as variáveis estão carregadas
docker-compose exec planka-server env | grep GLOBAL

# Testar conectividade SMTP com Nodemailer
docker-compose exec planka-server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
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

#### **5.2.1 Teste de Envio com Nodemailer**
```bash
# Testar envio de email
docker-compose exec planka-server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
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

#### **5.3 Criar Notificação de Teste**
1. **Aceder ao Planka** no navegador
2. **Criar um cartão** ou **adicionar comentário**
3. **Verificar logs** para confirmar envio
4. **Verificar email** do destinatário

#### **5.4 Verificar Logs**
```bash
# Verificar se notificações globais estão ativas
docker-compose logs planka | grep "Notificações globais"

# Verificar conexão SMTP
docker-compose logs planka | grep "Conexão SMTP verificada"

# Verificar envio de notificações com Nodemailer
docker-compose logs planka | grep "Notificação global enviada com Nodemailer"

# Verificar destinatários
docker-compose logs planka | grep "Enviando para email"

# Verificar erros
docker-compose logs planka | grep "Erro ao enviar notificação global com Nodemailer"

# Verificar Message IDs
docker-compose logs planka | grep "Message ID"
```

---

## 🎯 CENÁRIOS DE TESTE

### **Cenário 1: Lista Global de Destinatários**
```bash
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com
```
**Teste:** Criar cartão → Verificar se admin@empresa.com recebe email

### **Cenário 2: Email Individual do Utilizador**
```bash
# GLOBAL_NOTIFICATION_RECIPIENTS não definido
```
**Teste:** Utilizador A cria cartão → Verificar se utilizador A recebe email

### **Cenário 3: Sistema Híbrido**
```bash
GLOBAL_NOTIFICATIONS_ENABLED=true
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com
# + utilizador com configuração específica
```
**Teste:** Utilizador com configuração específica → Verificar se ambos recebem

---

## 🔍 DEBUGGING E TROUBLESHOOTING

### **Problemas Comuns:**

#### **1. Notificações não são enviadas**
```bash
# Verificar se estão ativas
grep "Notificações globais desativadas" logs/planka.log

# Verificar configuração SMTP
docker-compose exec planka-server env | grep GLOBAL_SMTP
```

#### **2. Erro de SMTP**
```bash
# Testar conectividade
docker-compose exec planka-server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.GLOBAL_SMTP_HOST,
  port: process.env.GLOBAL_SMTP_PORT,
  auth: { user: process.env.GLOBAL_SMTP_USER, pass: process.env.GLOBAL_SMTP_PASSWORD }
});
transporter.verify().then(() => console.log('✅ SMTP OK')).catch(err => console.error('❌ SMTP Error:', err));
"
```

#### **3. Templates não funcionam**
```bash
# Verificar se templates estão ativos
grep "EMAIL_TEMPLATES_ENABLED" logs/planka.log

# Verificar erro nos templates
grep "Erro nos templates" logs/planka.log
```

#### **4. Emails não chegam**
```bash
# Verificar logs de envio
grep "Notificação global enviada" logs/planka.log

# Verificar destinatários
grep "Enviando para email" logs/planka.log
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **Configuração:**
- [ ] Variáveis de ambiente adicionadas ao .env
- [ ] docker-compose.yml atualizado
- [ ] server/config/custom.js modificado
- [ ] Conectividade SMTP testada

### **Código:**
- [ ] Helper `send-global-notification.js` criado
- [ ] Função `buildAndSendGlobalNotification` adicionada
- [ ] Função `buildTemplateData` adicionada
- [ ] Lógica de prioridades implementada

### **Testes:**
- [ ] Serviços reiniciados
- [ ] Configuração verificada
- [ ] Notificação de teste criada
- [ ] Email recebido confirmado
- [ ] Logs verificados

### **Validação:**
- [ ] Sistema atual continua funcionando
- [ ] Notificações globais funcionam
- [ ] Templates funcionam corretamente
- [ ] Performance mantida
- [ ] Rollback testado (se necessário)

---

## 🚨 ROLLBACK (SE NECESSÁRIO)

### **Desativar Notificações Globais:**
```bash
# Alterar no .env
GLOBAL_NOTIFICATIONS_ENABLED=false

# Reiniciar serviços
docker-compose restart planka
```

### **Remover Código (Opcional):**
```bash
# Remover helper
rm server/api/helpers/utils/send-global-notification.js

# Reverter create-one.js para versão anterior
git checkout HEAD~1 server/api/helpers/notifications/create-one.js
```

---

## 📊 RESULTADOS ESPERADOS

### **Antes da Implementação:**
- ❌ Utilizadores precisam configurar notificações individualmente
- ❌ Sistema complexo com Apprise (Python)
- ❌ Configuração difícil para administradores
- ❌ Múltiplos pontos de falha

### **Depois da Implementação:**
- ✅ **Todos os utilizadores** recebem notificações automaticamente
- ✅ **Sistema simples** apenas com Node.js
- ✅ **Configuração única** para toda a organização
- ✅ **Pontos de falha reduzidos**
- ✅ **Templates profissionais** funcionando
- ✅ **Sistema atual** continua funcionando
- ✅ **Rollback fácil** se necessário

---

## 🎉 CONCLUSÃO

Esta implementação:

1. **Elimina a complexidade** do Apprise
2. **Simplifica a configuração** para administradores
3. **Garante que todos os utilizadores** recebem notificações
4. **Mantém compatibilidade** com o sistema atual
5. **Permite rollback fácil** se necessário
6. **Usa apenas Node.js** (linguagem do projeto)
7. **Reutiliza templates** já implementados
8. **Melhora a performance** (sem subprocessos Python)

**Tempo total de implementação: 45 minutos**  
**Complexidade: Baixa**  
**Impacto: Alto**  
**Risco: Baixo** (rollback fácil)

---

**🚀 Sistema pronto para produção com notificações globais simples e eficazes!**
