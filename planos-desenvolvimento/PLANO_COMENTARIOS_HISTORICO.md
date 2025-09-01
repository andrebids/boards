# 📋 PLANO DE IMPLEMENTAÇÃO - COMENTÁRIOS NO HISTÓRICO DO PROJETO (VERSÃO COMPLETA)

## 🎯 OBJETIVO

Integrar o sistema de comentários com o histórico de atividades do projeto, permitindo que comentários apareçam no painel de timeline e modal de atividades, criando um histórico completo e contextualizado de todas as interações, **seguindo os padrões do projeto e integrando com o sistema glass existente**.

---

## 🔍 ANÁLISE DO SISTEMA ATUAL (MELHORADA)

### **Sistema de Comentários (Já Funciona)**
- **Frontend**: Componentes `Add.jsx`, `Item.jsx`, `Edit.jsx`
- **Backend**: Helper `create-one.js` com notificações e webhooks
- **Redux**: Actions `COMMENT_CREATE`, `COMMENT_UPDATE`, `COMMENT_DELETE`
- **API**: Endpoint `POST /api/cards/:cardId/comments`

### **Sistema de Atividades (Já Funciona)**
- **Frontend**: `BoardActivitiesPanel.jsx`, `BoardActivitiesModal.jsx`
- **Backend**: Helper `create-one.js` com tipos de atividade
- **Redux**: Actions `ACTIVITY_CREATE`, `ACTIVITY_FETCH`
- **Tipos**: `cardCreate`, `cardMove`, `cardArchive`, etc.

### **Sistema Glass (Já Implementado)**
- **CSS Variables**: `--glass-bg`, `--glass-border`, `--glass-shadow`
- **Backdrop-filter**: `backdrop-filter: blur(20px)`
- **Contraste dinâmico**: Sistema iOS 26 para legibilidade

---

## 🚨 LACUNAS CRÍTICAS IDENTIFICADAS E SOLUÇÕES

### **1. GESTÃO DE ESTADO REDUX**
**❌ PROBLEMA**: O plano não aborda como as novas atividades de comentário serão integradas no Redux.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **1.1 Atualizar models/Activity.js**
```javascript
// client/src/models/Activity.js
case ActionTypes.ACTIVITY_CREATE_HANDLE: {
  const { activity } = payload;
  
  switch (activity.type) {
    case 'commentCreate':
    case 'commentUpdate':
    case 'commentDelete':
      return Activity.upsert(activity);
    // ... outros casos existentes
  }
}
```

#### **1.2 Atualizar sagas/core/services/activities.js**
```javascript
// Verificar se o serviço suporta os novos tipos
export function* fetchActivitiesInBoard(boardId) {
  // Garantir que os novos tipos são incluídos na query
  const query = {
    boardId,
    type: {
      $in: [
        'cardCreate', 'cardMove', 'cardArchive',
        'commentCreate', 'commentUpdate', 'commentDelete' // NOVOS TIPOS
      ]
    }
  };
}
```

#### **1.3 Atualizar selectors**
```javascript
// client/src/selectors/activities.js
export const selectActivitiesInBoard = (state, boardId) => {
  return Activity.selectors
    .selectAll(state)
    .filter(activity => 
      activity.boardId === boardId && 
      ['cardCreate', 'cardMove', 'cardArchive', 'commentCreate', 'commentUpdate', 'commentDelete'].includes(activity.type)
    );
};
```

### **2. PERFORMANCE E OTIMIZAÇÃO**
**❌ PROBLEMA**: Comentários frequentes podem sobrecarregar o sistema de atividades.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **2.1 Debouncing de Atividades**
```javascript
// client/src/utils/activityDebouncer.js
class ActivityDebouncer {
  constructor(delay = 2000) {
    this.delay = delay;
    this.timeouts = new Map();
  }

  debounce(activityKey, activityData) {
    if (this.timeouts.has(activityKey)) {
      clearTimeout(this.timeouts.get(activityKey));
    }

    this.timeouts.set(activityKey, setTimeout(() => {
      this.createActivity(activityData);
      this.timeouts.delete(activityKey);
    }, this.delay));
  }
}
```

#### **2.2 Paginação Inteligente**
```javascript
// client/src/sagas/core/services/activities.js
export function* fetchActivitiesInBoard(boardId, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  
  const query = {
    boardId,
    $skip: offset,
    $limit: limit,
    $sort: { createdAt: -1 }
  };
}
```

#### **2.3 Virtualização de Lista**
```javascript
// client/src/components/activities/BoardActivitiesModal/List.jsx
import { FixedSizeList as List } from 'react-window';

const VirtualizedActivityList = ({ activities }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ActivityItem activity={activities[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={activities.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### **3. SEGURANÇA E VALIDAÇÃO**
**❌ PROBLEMA**: Falta validação de permissões e sanitização de dados.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **3.1 Validação de Permissões**
```javascript
// server/api/helpers/activities/create-one.js
const validateActivityPermissions = async (userId, boardId, activityType) => {
  const boardMembership = await BoardMembership.findOne({
    where: { userId, boardId }
  });

  if (!boardMembership) {
    throw new Error('Access denied');
  }

  // Verificar se o usuário pode criar atividades de comentário
  if (activityType.startsWith('comment') && boardMembership.role === 'viewer') {
    throw new Error('Viewers cannot create comment activities');
  }

  return boardMembership;
};
```

#### **3.2 Sanitização de Dados**
```javascript
// server/utils/sanitizer.js
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeActivityData = (data) => {
  return {
    ...data,
    text: DOMPurify.sanitize(data.text || ''),
    metadata: {
      ...data.metadata,
      commentText: DOMPurify.sanitize(data.metadata?.commentText || '')
    }
  };
};
```

### **4. TESTES E QUALIDADE**
**❌ PROBLEMA**: Falta estratégia de testes para as novas funcionalidades.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **4.1 Testes Unitários**
```javascript
// client/src/components/activities/__tests__/CommentActivityItem.test.jsx
import { render, screen } from '@testing-library/react';
import CommentActivityItem from '../CommentActivityItem';

describe('CommentActivityItem', () => {
  it('should render comment activity correctly', () => {
    const activity = {
      id: '1',
      type: 'commentCreate',
      text: 'Added a comment',
      metadata: {
        commentText: 'This is a test comment',
        commentId: 'comment-1'
      },
      user: { id: 'user-1', name: 'John Doe' },
      createdAt: new Date().toISOString()
    };

    render(<CommentActivityItem activity={activity} />);
    
    expect(screen.getByText('Added a comment')).toBeInTheDocument();
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });
});
```

#### **4.2 Testes de Integração**
```javascript
// server/api/helpers/activities/__tests__/create-one.test.js
describe('createActivity', () => {
  it('should create comment activity with proper validation', async () => {
    const activityData = {
      type: 'commentCreate',
      boardId: 'board-1',
      cardId: 'card-1',
      userId: 'user-1',
      metadata: {
        commentId: 'comment-1',
        commentText: 'Test comment'
      }
    };

    const result = await createActivity(activityData);
    
    expect(result.type).toBe('commentCreate');
    expect(result.metadata.commentId).toBe('comment-1');
  });
});
```

### **5. MIGRAÇÃO DE DADOS**
**❌ PROBLEMA**: Como lidar com comentários existentes que não têm atividades.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **5.1 Script de Migração**
```javascript
// server/scripts/migrate-comments-to-activities.js
const migrateCommentsToActivities = async () => {
  const comments = await Comment.findAll({
    include: [
      { model: Card, include: [{ model: Board }] },
      { model: User }
    ]
  });

  for (const comment of comments) {
    // Verificar se já existe atividade para este comentário
    const existingActivity = await Activity.findOne({
      where: {
        type: 'commentCreate',
        'metadata.commentId': comment.id
      }
    });

    if (!existingActivity) {
      await Activity.create({
        type: 'commentCreate',
        boardId: comment.Card.Board.id,
        cardId: comment.cardId,
        userId: comment.userId,
        text: 'Added a comment',
        metadata: {
          commentId: comment.id,
          commentText: comment.text
        },
        createdAt: comment.createdAt
      });
    }
  }
};
```

### **6. NOTIFICAÇÕES E WEBHOOKS**
**❌ PROBLEMA**: Como integrar as novas atividades com o sistema de notificações existente.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **6.1 Atualizar Sistema de Notificações**
```javascript
// server/api/helpers/notifications/create-one.js
const createNotificationForActivity = async (activity) => {
  if (activity.type.startsWith('comment')) {
    // Notificar membros do cartão sobre comentários
    const cardMemberships = await CardMembership.findAll({
      where: { cardId: activity.cardId }
    });

    for (const membership of cardMemberships) {
      if (membership.userId !== activity.userId) {
        await Notification.create({
          userId: membership.userId,
          type: 'commentActivity',
          activityId: activity.id,
          isRead: false
        });
      }
    }
  }
};
```

#### **6.2 Webhooks para Atividades de Comentário**
```javascript
// server/api/helpers/webhooks/trigger.js
const triggerWebhooksForActivity = async (activity) => {
  if (activity.type.startsWith('comment')) {
    const webhooks = await Webhook.findAll({
      where: { 
        boardId: activity.boardId,
        events: { $contains: ['commentActivity'] }
      }
    });

    for (const webhook of webhooks) {
      await sendWebhook(webhook, {
        event: 'commentActivity',
        activity: activity
      });
    }
  }
};
```

### **7. INTERNACIONALIZAÇÃO (I18N)**
**❌ PROBLEMA**: Falta suporte para múltiplos idiomas nas atividades de comentário.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **7.1 Atualizar Traduções**
```javascript
// client/src/locales/en.json
{
  "activity": {
    "commentCreate": "Added a comment",
    "commentUpdate": "Updated a comment", 
    "commentDelete": "Deleted a comment",
    "commentReply": "Replied to a comment"
  }
}

// client/src/locales/pt.json
{
  "activity": {
    "commentCreate": "Adicionou um comentário",
    "commentUpdate": "Atualizou um comentário",
    "commentDelete": "Removeu um comentário", 
    "commentReply": "Respondeu a um comentário"
  }
}
```

### **8. ACESSIBILIDADE**
**❌ PROBLEMA**: Falta consideração para acessibilidade nas novas atividades.

**✅ SOLUÇÃO NECESSÁRIA**:

#### **8.1 ARIA Labels e Roles**
```javascript
// client/src/components/activities/CommentActivityItem.jsx
const CommentActivityItem = ({ activity }) => {
  return (
    <div 
      role="listitem"
      aria-label={`Comment activity by ${activity.user.name}`}
      className="activity-item"
    >
      <div className="activity-content">
        <span className="sr-only">Activity type: {activity.type}</span>
        <Trans i18nKey={`activity.${activity.type}`} />
      </div>
    </div>
  );
};
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO DETALHADO

### **FASE 1: FUNDAÇÃO (3-4 dias)**

#### **Dia 1: Preparação do Backend**
- [ ] **Atualizar Enums.js** com novos tipos de atividade
- [ ] **Criar helper create-one.js** para atividades de comentário
- [ ] **Implementar validação de permissões**
- [ ] **Adicionar sanitização de dados**
- [ ] **Criar script de migração** para comentários existentes

#### **Dia 2: Integração Redux**
- [ ] **Atualizar models/Activity.js** para suportar novos tipos
- [ ] **Modificar sagas/core/services/activities.js**
- [ ] **Atualizar selectors** para incluir atividades de comentário
- [ ] **Implementar debouncing** para performance

#### **Dia 3: Componentes Base**
- [ ] **Criar CommentActivityItem.jsx** seguindo padrão glass
- [ ] **Implementar renderização condicional** no Item.jsx existente
- [ ] **Adicionar suporte a menções** e respostas
- [ ] **Implementar virtualização** para performance

#### **Dia 4: Testes e Validação**
- [ ] **Criar testes unitários** para novos componentes
- [ ] **Implementar testes de integração**
- [ ] **Validar performance** com muitos comentários
- [ ] **Testar acessibilidade** e ARIA labels

### **FASE 2: INTEGRAÇÃO AVANÇADA (2-3 dias)**

#### **Dia 5: Sistema de Notificações**
- [ ] **Integrar com notificações existentes**
- [ ] **Implementar webhooks** para atividades de comentário
- [ ] **Adicionar filtros** para notificações de comentário
- [ ] **Testar fluxo completo** de notificações

#### **Dia 6: Internacionalização**
- [ ] **Adicionar traduções** para todos os idiomas suportados
- [ ] **Implementar formatação** de data/hora localizada
- [ ] **Testar interface** em diferentes idiomas
- [ ] **Validar textos** longos e caracteres especiais

#### **Dia 7: Otimizações Finais**
- [ ] **Implementar cache** para atividades frequentes
- [ ] **Otimizar queries** de banco de dados
- [ ] **Adicionar métricas** de performance
- [ ] **Documentar APIs** e componentes

### **FASE 3: TESTES E DEPLOY (1-2 dias)**

#### **Dia 8: Testes Completos**
- [ ] **Testes de stress** com muitos comentários
- [ ] **Testes de segurança** e validação
- [ ] **Testes de acessibilidade** completos
- [ ] **Validação cross-browser**

#### **Dia 9: Deploy e Monitoramento**
- [ ] **Executar script de migração** em produção
- [ ] **Monitorar performance** e erros
- [ ] **Validar funcionalidade** em ambiente real
- [ ] **Documentar mudanças** para usuários

---

## 🎨 INTEGRAÇÃO COM SISTEMA GLASS

### **CSS Variables Utilizadas**
```scss
.comment-activity-item {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(20px);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
  
  &:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
  }
}
```

### **Componentes Reutilizados**
- `UserAvatar` - Avatar do usuário
- `TimeAgo` - Formatação de tempo relativo
- `Comment` - Renderização de comentários
- `Mention` - Sistema de menções
- `GlassCard` - Container com efeito glass

---

## 🔧 CONFIGURAÇÃO E DEPLOY

### **Variáveis de Ambiente**
```bash
# .env
ACTIVITY_COMMENT_ENABLED=true
ACTIVITY_DEBOUNCE_DELAY=2000
ACTIVITY_PAGE_SIZE=50
ACTIVITY_MIGRATION_BATCH_SIZE=1000
```

### **Comandos de Deploy**
```bash
# Executar migração
npm run migrate:comments-to-activities

# Build e deploy
npm run build
npm run deploy

# Verificar logs
npm run logs:activities
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### **Métricas a Monitorar**
- **Performance**: Tempo de carregamento das atividades
- **Uso**: Número de atividades de comentário criadas
- **Erros**: Falhas na criação de atividades
- **Cache**: Taxa de hit/miss do cache de atividades

### **Alertas Configurados**
- **Alta latência** (>2s para carregar atividades)
- **Muitos erros** (>5% de falhas)
- **Cache ineficiente** (<80% hit rate)
- **Migração falhou** (script de migração com erro)

---

## 🚀 CONCLUSÃO

Este plano melhorado aborda todas as lacunas críticas identificadas:

✅ **Gestão de Estado Redux** completa
✅ **Performance e otimização** com debouncing e virtualização
✅ **Segurança e validação** robusta
✅ **Testes abrangentes** (unitários e integração)
✅ **Migração de dados** para comentários existentes
✅ **Notificações e webhooks** integrados
✅ **Internacionalização** completa
✅ **Acessibilidade** com ARIA labels
✅ **Integração glass** seguindo padrões existentes
✅ **Monitoramento** e métricas

O plano agora está **completo e pronto para implementação**, seguindo todas as melhores práticas do projeto e considerando todos os aspectos críticos de uma funcionalidade de produção.

---

## 🔍 LOGS DE TESTE PARA INÍCIO DA IMPLEMENTAÇÃO

### **1. LOGS DE VERIFICAÇÃO DO SISTEMA ATUAL**

#### **1.1 Verificar Sistema de Comentários Existente**
```bash
# Verificar se comentários estão funcionando
curl -X GET "http://localhost:3000/api/cards/CARD_ID/comments" \
  -H "Authorization: Bearer TOKEN"

# Log esperado:
# ✅ Comentários carregados: 5 comentários encontrados
# ✅ Sistema de comentários funcionando corretamente
```

#### **1.2 Verificar Sistema de Atividades Existente**
```bash
# Verificar atividades do quadro
curl -X GET "http://localhost:3000/api/boards/BOARD_ID/activities" \
  -H "Authorization: Bearer TOKEN"

# Log esperado:
# ✅ Atividades carregadas: 25 atividades encontradas
# ✅ Tipos de atividade: cardCreate, cardMove, cardArchive
# ✅ Sistema de atividades funcionando corretamente
```

#### **1.3 Verificar Integração Redux**
```javascript
// No console do navegador
console.log('Redux State - Activities:', store.getState().activities);
console.log('Redux State - Comments:', store.getState().comments);

// Log esperado:
// ✅ Redux activities: { ids: [...], entities: {...} }
// ✅ Redux comments: { ids: [...], entities: {...} }
// ✅ Ambos os sistemas funcionando no Redux
```

### **2. LOGS DE IMPLEMENTAÇÃO FASE 1**

#### **2.1 Logs de Criação de Atividade de Comentário**
```javascript
// server/api/helpers/activities/create-comment-activity.js
console.log('🔄 Iniciando criação de atividade de comentário:', {
  commentId: comment.id,
  cardId: card.id,
  userId: user.id,
  action: action
});

// Após criação bem-sucedida:
console.log('✅ Atividade de comentário criada:', {
  activityId: activity.id,
  type: activity.type,
  commentId: comment.id,
  cardName: card.name,
  timestamp: new Date().toISOString()
});

// Em caso de erro:
console.error('❌ Erro ao criar atividade de comentário:', {
  error: error.message,
  commentId: comment.id,
  stack: error.stack
});
```

#### **2.2 Logs de Integração Redux**
```javascript
// client/src/models/Activity.js
case ActionTypes.ACTIVITY_CREATE_HANDLE: {
  console.log('🔄 Redux: Processando nova atividade:', {
    type: activity.type,
    boardId: activity.boardId,
    cardId: activity.cardId
  });
  
  // ... processamento ...
  
  console.log('✅ Redux: Atividade processada com sucesso:', {
    activityId: activity.id,
    type: activity.type
  });
}
```

#### **2.3 Logs de Renderização de Componentes**
```javascript
// client/src/components/activities/CommentActivityItem.jsx
const CommentActivityItem = ({ activity }) => {
  console.log('🔄 Renderizando CommentActivityItem:', {
    activityId: activity.id,
    type: activity.type,
    commentText: activity.metadata?.commentText?.substring(0, 50) + '...'
  });
  
  // ... renderização ...
  
  console.log('✅ CommentActivityItem renderizado com sucesso');
};
```

### **3. LOGS DE VALIDAÇÃO E TESTES**

#### **3.1 Logs de Teste de Performance**
```javascript
// client/src/utils/activityDebouncer.js
class ActivityDebouncer {
  debounce(activityKey, activityData) {
    console.log('🔄 Debouncing atividade:', {
      key: activityKey,
      type: activityData.type,
      timestamp: new Date().toISOString()
    });
    
    // ... debouncing logic ...
    
    console.log('✅ Atividade debounced criada:', {
      key: activityKey,
      delay: this.delay
    });
  }
}
```

#### **3.2 Logs de Validação de Permissões**
```javascript
// server/api/helpers/activities/create-one.js
const validateActivityPermissions = async (userId, boardId, activityType) => {
  console.log('🔄 Validando permissões:', {
    userId,
    boardId,
    activityType
  });
  
  const boardMembership = await BoardMembership.findOne({
    where: { userId, boardId }
  });
  
  console.log('✅ Permissões validadas:', {
    hasMembership: !!boardMembership,
    role: boardMembership?.role,
    canCreateCommentActivity: boardMembership?.role !== 'viewer'
  });
  
  return boardMembership;
};
```

#### **3.3 Logs de Migração de Dados**
```javascript
// server/scripts/migrate-comments-to-activities.js
const migrateCommentsToActivities = async () => {
  console.log('🔄 Iniciando migração de comentários para atividades');
  
  const comments = await Comment.findAll({
    include: [
      { model: Card, include: [{ model: Board }] },
      { model: User }
    ]
  });
  
  console.log(`📊 Encontrados ${comments.length} comentários para migrar`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const comment of comments) {
    const existingActivity = await Activity.findOne({
      where: {
        type: 'commentCreate',
        'metadata.commentId': comment.id
      }
    });
    
    if (!existingActivity) {
      await Activity.create({
        type: 'commentCreate',
        boardId: comment.Card.Board.id,
        cardId: comment.cardId,
        userId: comment.userId,
        text: 'Added a comment',
        metadata: {
          commentId: comment.id,
          commentText: comment.text
        },
        createdAt: comment.createdAt
      });
      
      migrated++;
      console.log(`✅ Migrado comentário ${comment.id} (${migrated}/${comments.length})`);
    } else {
      skipped++;
      console.log(`⏭️ Comentário ${comment.id} já tem atividade, pulando`);
    }
  }
  
  console.log('🎉 Migração concluída:', {
    total: comments.length,
    migrated,
    skipped
  });
};
```

### **4. LOGS DE MONITORAMENTO EM PRODUÇÃO**

#### **4.1 Logs de Métricas de Performance**
```javascript
// client/src/sagas/core/services/activities.js
export function* fetchActivitiesInBoard(boardId, page = 1, limit = 50) {
  const startTime = performance.now();
  
  console.log('🔄 Carregando atividades do quadro:', {
    boardId,
    page,
    limit,
    timestamp: new Date().toISOString()
  });
  
  // ... fetch logic ...
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log('✅ Atividades carregadas:', {
    boardId,
    count: activities.length,
    duration: `${duration.toFixed(2)}ms`,
    performance: duration < 1000 ? '✅ Boa' : '⚠️ Lenta'
  });
}
```

#### **4.2 Logs de Erros e Alertas**
```javascript
// Global error handler para atividades de comentário
window.addEventListener('error', (event) => {
  if (event.message.includes('comment') || event.message.includes('activity')) {
    console.error('🚨 Erro crítico em sistema de comentários/atividades:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
    
    // Enviar para sistema de monitoramento
    sendErrorToMonitoring({
      type: 'comment_activity_error',
      error: event
    });
  }
});
```

#### **4.3 Logs de Uso e Analytics**
```javascript
// client/src/components/activities/CommentActivityItem.jsx
const CommentActivityItem = ({ activity }) => {
  useEffect(() => {
    // Log de uso para analytics
    console.log('📊 Comentário visualizado no histórico:', {
      activityId: activity.id,
      commentId: activity.metadata?.commentId,
      type: activity.type,
      timestamp: new Date().toISOString()
    });
    
    // Enviar para analytics
    trackEvent('comment_activity_viewed', {
      activity_type: activity.type,
      has_mentions: activity.metadata?.mentions?.length > 0,
      is_reply: activity.metadata?.isReply
    });
  }, [activity]);
};
```

### **5. COMANDOS DE TESTE PARA VALIDAÇÃO**

#### **5.1 Teste de Criação de Comentário**
```bash
# 1. Criar comentário via API
curl -X POST "http://localhost:3000/api/cards/CARD_ID/comments" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Teste de comentário para histórico"}'

# 2. Verificar se atividade foi criada
curl -X GET "http://localhost:3000/api/boards/BOARD_ID/activities" \
  -H "Authorization: Bearer TOKEN" | grep -i "comment"

# 3. Verificar logs do servidor
tail -f logs/application.log | grep -E "(comment|activity)"
```

#### **5.2 Teste de Performance**
```bash
# Teste de carga com muitos comentários
for i in {1..50}; do
  curl -X POST "http://localhost:3000/api/cards/CARD_ID/comments" \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Comentário de teste $i\"}" &
done

# Monitorar performance
watch -n 1 'curl -s "http://localhost:3000/api/boards/BOARD_ID/activities" | jq ".length"'
```

#### **5.3 Teste de Interface**
```javascript
// No console do navegador
// 1. Verificar se comentários aparecem no histórico
document.querySelectorAll('[data-testid="comment-activity"]').length

// 2. Verificar se filtros funcionam
document.querySelector('[data-testid="filter-comments"]').click()

// 3. Verificar se tema glass está aplicado
document.querySelector('.comment-activity-item').classList.contains('glass-panel')
```

### **6. CHECKLIST DE VALIDAÇÃO COM LOGS**

#### **6.1 Checklist Backend**
- [ ] **Sistema de comentários funcionando**
  ```bash
  # Log esperado: ✅ Comentários carregados: X comentários encontrados
  ```
- [ ] **Sistema de atividades funcionando**
  ```bash
  # Log esperado: ✅ Atividades carregadas: X atividades encontradas
  ```
- [ ] **Novos tipos de atividade registrados**
  ```bash
  # Log esperado: ✅ Tipos de atividade: cardCreate, cardMove, commentCreate, commentUpdate, commentDelete
  ```
- [ ] **Permissões validadas**
  ```bash
  # Log esperado: ✅ Permissões validadas: hasMembership=true, role=member, canCreateCommentActivity=true
  ```

#### **6.2 Checklist Frontend**
- [ ] **Redux integrado**
  ```javascript
  // Log esperado: ✅ Redux activities: { ids: [...], entities: {...} }
  ```
- [ ] **Componentes renderizando**
  ```javascript
  // Log esperado: ✅ CommentActivityItem renderizado com sucesso
  ```
- [ ] **Tema glass aplicado**
  ```javascript
  // Log esperado: ✅ Tema glass aplicado: glass-panel class found
  ```
- [ ] **Performance aceitável**
  ```javascript
  // Log esperado: ✅ Atividades carregadas: count=X, duration=XXXms, performance=✅ Boa
  ```

#### **6.3 Checklist Integração**
- [ ] **Comentários aparecem no histórico**
  ```bash
  # Log esperado: ✅ Atividade de comentário criada: activityId=XXX, type=commentCreate
  ```
- [ ] **Filtros funcionando**
  ```javascript
  // Log esperado: ✅ Filtro de comentários aplicado: X comentários filtrados
  ```
- [ ] **Notificações enviadas**
  ```bash
  # Log esperado: ✅ Notificação enviada: userId=XXX, type=commentActivity
  ```
- [ ] **Migração concluída**
  ```bash
  # Log esperado: 🎉 Migração concluída: total=X, migrated=X, skipped=X
  ```

---

**Nota**: Todos estes logs devem ser implementados durante o desenvolvimento para facilitar o debugging e validação da implementação. Os logs de produção devem ser configurados para níveis apropriados (INFO, WARN, ERROR) e integrados com sistemas de monitoramento.
