# 🔄 GUIA DE INTEGRAÇÃO - TRIGGERS E NOTIFICAÇÕES GLOBAIS

## 🎯 VISÃO GERAL

Este guia explica como o **sistema de notificações globais com Nodemailer** se integra com os **triggers de notificações** existentes no Planka.

---

## 🔄 FLUXO COMPLETO DOS TRIGGERS

### **Arquitetura do Sistema:**
```
EVENTO → ACTION → NOTIFICATION → ENVIO (Nodemailer Global)
```

### **1. Evento (Trigger)**
```javascript
// Exemplo: Utilizador cria um cartão
// Frontend chama API
POST /api/cards
{
  "name": "Novo Cartão",
  "listId": "123"
}
```

### **2. Action (Registo do Evento)**
```javascript
// server/api/helpers/actions/create-one.js
// Cria registo da ação na BD
const action = await Action.qm.createOne({
  type: 'CREATE_CARD',
  data: { card: newCard },
  userId: currentUser.id,
  cardId: newCard.id
});

// Verifica se deve criar notificação
if (sails.models.action.INTERNAL_NOTIFIABLE_TYPES.includes(action.type)) {
  // Determina utilizadores a notificar
  const notifiableUserIds = await getNotifiableUsers(action);
  
  // Cria notificação para cada utilizador
  await Promise.all(
    notifiableUserIds.map(userId =>
      sails.helpers.notifications.createOne.with({
        values: { userId, action, type: action.type, ... },
        project, board, list
      })
    )
  );
}
```

### **3. Notification (Criação da Notificação)**
```javascript
// server/api/helpers/notifications/create-one.js
async fn(inputs) {
  // 1. Criar notificação na BD
  const notification = await Notification.qm.createOne({
    userId: inputs.values.userId,
    type: inputs.values.type,
    data: inputs.values.data,
    creatorUserId: inputs.values.creatorUser.id,
    boardId: inputs.values.card.boardId,
    cardId: inputs.values.card.id
  });

  // 2. Broadcast via WebSocket (notificação em tempo real)
  sails.sockets.broadcast(`user:${notification.userId}`, 'notificationCreate', {
    item: notification,
    included: { users: [creatorUser] }
  });

  // 3. 🎯 AQUI É ONDE INTEGRAMOS O NODEMAILER GLOBAL
  await sendGlobalNotification(notification, inputs);

  return notification;
}
```

### **4. Envio Global (Nodemailer)**
```javascript
// Função integrada no create-one.js
const sendGlobalNotification = async (notification, inputs) => {
  const globalNotificationsEnabled = sails.config.custom.globalNotifications?.enabled;
  
  if (!globalNotificationsEnabled) return;

  try {
    // Determinar destinatário
    const recipientEmail = getRecipientEmail(notification);
    
    // Gerar dados do template
    const templateData = buildTemplateData(notification, inputs);
    
    // Gerar HTML
    const html = await generateEmailHtml(notification, templateData);
    
    // Enviar com Nodemailer
    await sails.helpers.utils.sendGlobalNotification.with({
      to: recipientEmail,
      subject: buildTitle(notification),
      html: html,
      data: templateData
    });
    
    sails.log.info('✅ Notificação global enviada com Nodemailer');
  } catch (error) {
    sails.log.error('❌ Erro na notificação global:', error.message);
    // Não falhar o processo se email falhar
  }
};
```

---

## 🎯 TIPOS DE TRIGGERS SUPORTADOS

### **Triggers Internos (Notificações na Interface):**
```javascript
// server/api/models/Action.js
INTERNAL_NOTIFIABLE_TYPES: [
  'CREATE_CARD',
  'MOVE_CARD', 
  'COMMENT_CARD',
  'ADD_MEMBER_TO_CARD',
  'MENTION_IN_COMMENT',
  'COMPLETE_TASK',
  // ... outros tipos
]
```

### **Triggers Externos (Emails/Webhooks):**
```javascript
// server/api/models/Action.js  
EXTERNAL_NOTIFIABLE_TYPES: [
  'CREATE_CARD',
  'MOVE_CARD',
  'COMMENT_CARD', 
  'ADD_MEMBER_TO_CARD',
  'MENTION_IN_COMMENT',
  // ... outros tipos
]
```

### **Triggers Pessoais (Para utilizador específico):**
```javascript
// server/api/models/Action.js
PERSONAL_NOTIFIABLE_TYPES: [
  'ADD_MEMBER_TO_CARD',
  'MENTION_IN_COMMENT',
  // ... outros tipos
]
```

---

## 🔧 INTEGRAÇÃO NO SISTEMA EXISTENTE

### **Modificação Mínima em `create-one.js`:**

```javascript
// server/api/helpers/notifications/create-one.js
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

## 📊 CENÁRIOS DE INTEGRAÇÃO

### **Cenário 1: Cartão Criado**
```
1. Utilizador A cria cartão
   ↓
2. Action CREATE_CARD criada
   ↓
3. Utilizadores B, C, D (subscritos ao board) recebem notificação
   ↓
4. Para cada notificação:
   - WebSocket: Notificação em tempo real na interface
   - Email Global: Email enviado via Nodemailer
```

### **Cenário 2: Comentário Adicionado**
```
1. Utilizador A comenta no cartão
   ↓
2. Action COMMENT_CARD criada
   ↓
3. Utilizadores B, C, D (subscritos ao cartão) recebem notificação
   ↓
4. Para cada notificação:
   - WebSocket: Notificação em tempo real
   - Email Global: Email com template de comentário
```

### **Cenário 3: Membro Adicionado**
```
1. Utilizador A adiciona Utilizador B ao cartão
   ↓
2. Action ADD_MEMBER_TO_CARD criada
   ↓
3. Apenas Utilizador B recebe notificação (trigger pessoal)
   ↓
4. Notificação:
   - WebSocket: Notificação em tempo real
   - Email Global: Email personalizado para B
```

---

## ⚙️ CONFIGURAÇÃO DOS TRIGGERS

### **Variáveis de Ambiente:**
```bash
# Ativar notificações globais
GLOBAL_NOTIFICATIONS_ENABLED=true

# Configuração SMTP
GLOBAL_SMTP_HOST=smtp.gmail.com
GLOBAL_SMTP_PORT=587
GLOBAL_SMTP_USER=boards@empresa.com
GLOBAL_SMTP_PASSWORD=senha_segura
GLOBAL_SMTP_FROM=Planka <boards@empresa.com>

# Destinatários (opcional)
GLOBAL_NOTIFICATION_RECIPIENTS=admin@empresa.com,manager@empresa.com
```

### **Configuração no Sistema:**
```javascript
// server/config/custom.js
globalNotifications: {
  enabled: process.env.GLOBAL_NOTIFICATIONS_ENABLED === 'true',
  nodemailer: {
    host: process.env.GLOBAL_SMTP_HOST,
    port: process.env.GLOBAL_SMTP_PORT,
    secure: process.env.GLOBAL_SMTP_SECURE === 'true',
    auth: {
      user: process.env.GLOBAL_SMTP_USER,
      pass: process.env.GLOBAL_SMTP_PASSWORD,
    },
    from: process.env.GLOBAL_SMTP_FROM,
  },
  recipients: process.env.GLOBAL_NOTIFICATION_RECIPIENTS ? 
    process.env.GLOBAL_NOTIFICATION_RECIPIENTS.split(',').map(email => email.trim()) : 
    null,
}
```

---

## 🧪 TESTES DE INTEGRAÇÃO

### **Teste 1: Trigger de Criação de Cartão**
```bash
# 1. Criar cartão via API
curl -X POST http://localhost:1337/api/cards \
  -H "Content-Type: application/json" \
  -d '{"name": "Teste Trigger", "listId": "123"}'

# 2. Verificar logs
docker-compose logs planka | grep "Notificação global enviada"

# 3. Verificar email
# Deve chegar email para destinatários configurados
```

### **Teste 2: Trigger de Comentário**
```bash
# 1. Adicionar comentário via API
curl -X POST http://localhost:1337/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "Teste comentário", "cardId": "456"}'

# 2. Verificar logs
docker-compose logs planka | grep "Notificação global enviada"

# 3. Verificar email
# Deve chegar email com template de comentário
```

### **Teste 3: Trigger de Membro**
```bash
# 1. Adicionar membro via API
curl -X POST http://localhost:1337/api/card-memberships \
  -H "Content-Type: application/json" \
  -d '{"userId": "789", "cardId": "456"}'

# 2. Verificar logs
docker-compose logs planka | grep "Notificação global enviada"

# 3. Verificar email
# Deve chegar email personalizado para o membro
```

---

## 🔍 LOGS E DEBUGGING

### **Logs dos Triggers:**
```bash
# Verificar criação de actions
docker-compose logs planka | grep "Action created"

# Verificar criação de notificações
docker-compose logs planka | grep "Notification created"

# Verificar envio de emails globais
docker-compose logs planka | grep "Notificação global enviada com Nodemailer"

# Verificar erros
docker-compose logs planka | grep "Erro na notificação global"
```

### **Debug de Triggers:**
```bash
# Verificar tipos de notificação suportados
docker-compose exec planka-server node -e "
console.log('INTERNAL_NOTIFIABLE_TYPES:', sails.models.action.INTERNAL_NOTIFIABLE_TYPES);
console.log('EXTERNAL_NOTIFIABLE_TYPES:', sails.models.action.EXTERNAL_NOTIFIABLE_TYPES);
console.log('PERSONAL_NOTIFIABLE_TYPES:', sails.models.action.PERSONAL_NOTIFIABLE_TYPES);
"
```

---

## 🎯 BENEFÍCIOS DA INTEGRAÇÃO

### **Para o Sistema:**
- ✅ **Compatibilidade total** com triggers existentes
- ✅ **Sem quebra** de funcionalidades
- ✅ **Rollback fácil** se necessário
- ✅ **Performance mantida**

### **Para os Utilizadores:**
- ✅ **Notificações automáticas** em todos os eventos
- ✅ **Sem configuração** necessária
- ✅ **Templates profissionais** para cada tipo
- ✅ **Experiência consistente**

### **Para os Administradores:**
- ✅ **Configuração única** para toda a organização
- ✅ **Gestão centralizada** de notificações
- ✅ **Logs detalhados** para monitorização
- ✅ **Flexibilidade** de destinatários

---

## 🚀 IMPLEMENTAÇÃO

### **Passos:**
1. **Configurar variáveis** de ambiente
2. **Criar helper** Nodemailer
3. **Modificar create-one.js** com nova lógica
4. **Testar triggers** existentes
5. **Validar funcionamento**

### **Tempo:** 45 minutos
### **Complexidade:** Baixa
### **Risco:** Baixo (rollback fácil)

---

**🎯 Sistema de notificações globais totalmente integrado com os triggers existentes do Planka!**
