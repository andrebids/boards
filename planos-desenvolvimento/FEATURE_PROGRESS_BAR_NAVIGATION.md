# 🚀 Plano de Desenvolvimento: Barra de Progresso nas Abas dos Boards

## 🎯 Visão Geral

**Objetivo:** Implementar uma barra de progresso personalizável nas abas de cada quadro (board). Esta funcionalidade permitirá aos utilizadores visualizar rapidamente o andamento de cada quadro diretamente nas abas horizontais de navegação. A percentagem de progresso será definida manualmente pelos utilizadores nas configurações do quadro.

**Contexto Técnico:**
*   **Entidade Alvo:** Quadros (`Boards`).
*   **Localização na UI:** Integrada nas abas dos boards (`components/boards/Boards/Item.jsx`), abaixo do título de cada quadro.
*   **Permissões:** A configuração será visível e editável apenas para utilizadores com perfil de **Administrador** ou **Editor** (reutilizando sistema existente).
*   **Tecnologias:**
    *   **UI:** React com componentes da biblioteca **Semantic UI**.
    *   **Atualizações em Tempo Real:** **WebSockets** existentes (`BOARD_UPDATE_HANDLE`) para propagar as alterações instantaneamente.
    *   **Sistema de Cores:** Integração com sistema existente de cores do Planka.

---

## 📝 Fases de Implementação

### Fase 1: Backend e Modelo de Dados (Melhorado)

1.  **Migração de Base de Dados:**
    *   **Localização:** `server/db/migrations/[timestamp]_add_board_progress_fields.js`
    *   **Implementação:**
    ```javascript
    exports.up = (knex) => {
      return knex.schema.table('boards', (table) => {
        table.boolean('progress_bar_enabled').defaultTo(false);
        table.integer('progress_bar_percentage').defaultTo(0);
        table.check('progress_bar_percentage >= 0 AND progress_bar_percentage <= 100');
      });
    };

    exports.down = (knex) => {
      return knex.schema.table('boards', (table) => {
        table.dropColumn('progress_bar_enabled');
        table.dropColumn('progress_bar_percentage');
      });
    };
    ```

2.  **Modelo de Dados `Board`:**
    *   **Localização:** `server/api/models/Board.js`
    *   **Alteração:** Adicionar campos ao modelo existente:
    ```javascript
    progressBarEnabled: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'progress_bar_enabled',
    },
    progressBarPercentage: {
      type: 'number',
      defaultsTo: 0,
      max: 100,
      min: 0,
      columnName: 'progress_bar_percentage',
    },
    ```

3.  **API e Permissões (Reutilizando Sistema Existente):**
    *   **Localização:** Controlador de boards existente
    *   **Aproveitamento:** Usar verificações de permissão já implementadas:
    ```javascript
    // Reutilizar lógica existente de BoardMembershipRoles.EDITOR
    const boardMembership = sails.helpers.users.getCurrentMembershipForBoard(userId, boardId);
    const canEdit = boardMembership && boardMembership.role === 'editor';
    ```
    *   **Logs Estratégicos:**
    ```javascript
    sails.log.info(`[PROGRESS_BAR] Atualizando progresso do board ${boardId}: ${progressBarPercentage}%`);
    ```

4.  **WebSockets (Aproveitando Infraestrutura Existente):**
    *   **Aproveitamento:** Usar sistema de WebSocket já implementado
    *   **Evento Existente:** `BOARD_UPDATE_HANDLE` já disponível
    *   **Implementação:** Incluir novos campos na resposta do WebSocket existente

---

### Fase 2: Frontend - Lógica e Estado (Aproveitando Redux Existente)

1.  **Gestão de Estado (Reutilizando Infraestrutura):**
    *   **Aproveitamento:** Usar actions e reducers existentes para boards
    *   **Actions Existentes:** `BOARD_UPDATE`, `BOARD_UPDATE_HANDLE`, `CURRENT_BOARD_UPDATE`
    *   **Alteração Mínima:** Apenas incluir novos campos nos dados do board
    *   **Localização:** `client/src/models/Board.js` - adicionar campos ao modelo

2.  **WebSocket (Sistema Já Implementado):**
    *   **Aproveitamento:** Sistema de WebSocket já funcional
    *   **Event Handler Existente:** `BOARD_UPDATE_HANDLE` em `client/src/sagas/core/services/boards.js`
    *   **Implementação:** Novos campos automaticamente incluídos nas atualizações

---

### Fase 3: Frontend - Componentes de UI (Localização Correta Identificada)

1.  **Abas dos Boards (Localização Correta):**
    *   **Componente Identificado:** `client/src/components/boards/Boards/Item.jsx` (linhas 66-95)
    *   **CSS:** `client/src/components/boards/Boards/Item.module.scss`
    *   **Alteração:** Modificar o componente `Item.jsx` para incluir a barra de progresso:
    ```jsx
    // Após linha ~79 (span com board.name):
    <span className={styles.name}>{board.name}</span>
    {board.progressBarEnabled && (
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${board.progressBarPercentage}%` }}
        />
        <span className={styles.progressText}>
          {board.progressBarPercentage}%
        </span>
      </div>
    )}
    ```
    *   **Log Estratégico:**
    ```javascript
    console.log(`[PROGRESS_BAR] Rendering for board ${board.name}: ${board.progressBarPercentage}%`);
    ```

2.  **CSS da Barra de Progresso (Integração com Sistema Existente):**
    *   **Localização:** `Item.module.scss`
    *   **Implementação:**
    ```scss
    .progressBar {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      height: 6px;
      margin: 4px 14px 0;
      overflow: hidden;
      position: relative;
    }

    .progressFill {
      background: linear-gradient(90deg, #10b981, #34d399);
      border-radius: 8px;
      height: 100%;
      transition: width 0.3s ease;
    }

    .progressText {
      color: rgba(255, 255, 255, 0.8);
      font-size: 10px;
      margin-left: 14px;
      margin-top: 2px;
      display: block;
    }

    .tab {
      // Modificar altura para acomodar barra
      min-height: 50px; // Aumentado
    }
    ```

3.  **Modal de Configurações (Aproveitando BoardSettingsModal Existente):**
    *   **Localização:** `client/src/components/boards/BoardSettingsModal/GeneralPane/GeneralPane.jsx`
    *   **Aproveitamento:** Adicionar campos ao formulário existente:
    ```jsx
    <Form.Group widths="equal">
      <Form.Checkbox
        checked={data.progressBarEnabled}
        label={t('common.enableProgressBar')}
        name="progressBarEnabled"
        onChange={handleFieldChange}
      />
      {data.progressBarEnabled && (
        <Form.Input
          fluid
          type="number"
          min="0"
          max="100"
          label={t('common.progressPercentage')}
          name="progressBarPercentage"
          value={data.progressBarPercentage}
          onChange={handleFieldChange}
        />
      )}
    </Form.Group>
    ```

---

### Fase 4: Integração com Sistema de Cores Existente

1.  **Aproveitamento do Sistema de Cores do Planka:**
    *   **Sistema Identificado:** Extenso sistema de cores em `client/src/styles.module.scss` (linhas 739-1043)
    *   **Cores Disponíveis:** `.colorBerryRed`, `.backgroundBerryRed`, etc.
    *   **Implementação:** Integrar cores dinâmicas baseadas no projeto:
    ```scss
    .progressFill {
      // Cores dinâmicas baseadas no tema do projeto
      background: var(--board-primary-color, linear-gradient(90deg, #10b981, #34d399));
    }
    ```

2.  **Consistência Visual:**
    *   **Aproveitamento:** Seguir padrões visuais das abas existentes
    *   **Harmonia:** Barra de progresso integra-se naturalmente com o design das abas
    *   **Responsividade:** Manter comportamento responsivo das abas originais

---

## 🧪 Estratégia de Testes com Pausas Manuais

### **🔴 PAUSA 1 - Após Migração de Base de Dados**
**Comando de Verificação:**
```bash
# Executar migração
npm run db:migrate
```
**Teste Manual:**
- Verificar se as colunas `progress_bar_enabled` e `progress_bar_percentage` foram criadas
- Confirmar valores padrão (false, 0)

### **🟡 PAUSA 2 - Após API Backend**
**Comando de Verificação:**
```bash
# Teste manual do endpoint
curl -X PUT http://localhost:1337/api/boards/[ID] \
  -H "Content-Type: application/json" \
  -d '{"progressBarEnabled": true, "progressBarPercentage": 50}'
```
**Logs a Verificar:**
```
[PROGRESS_BAR] Atualizando progresso do board [ID]: 50%
```

### **🟢 PAUSA 3 - Após Componente UI**
**Testes Manuais:**
1. Verificar se a barra aparece nas abas dos boards
2. Testar diferentes percentagens (0%, 25%, 50%, 75%, 100%)
3. Verificar comportamento visual no hover das abas
4. Confirmar que abas sem progresso habilitado não mostram barra

**Logs a Verificar no Browser:**
```
[PROGRESS_BAR] Rendering for board [Nome]: [Percentagem]%
```

### **🔵 PAUSA 4 - Após Configurações no Modal**
**Testes Manuais:**
1. Abrir configurações do board (botão lápis na aba)
2. Testar toggle "Mostrar barra de progresso"
3. Testar input numérico de percentagem
4. Verificar validação (0-100)
5. Confirmar salvamento e atualização imediata na aba

### **🟣 PAUSA 5 - Após WebSockets**
**Teste de Tempo Real:**
1. Abrir aplicação em duas abas/navegadores diferentes
2. Modificar progresso numa aba
3. Verificar atualização automática na outra aba
4. Confirmar que não é necessário reload da página

**Logs WebSocket no Browser Console:**
```javascript
// Adicionar temporariamente para debug:
window.addEventListener('message', (e) => {
  if (e.data.type === 'BOARD_UPDATE_HANDLE') {
    console.log('[PROGRESS_BAR] Board update received:', e.data);
  }
});
```

### **✅ VERIFICAÇÃO FINAL**
**Checklist Completo:**
- [ ] Migração executada com sucesso
- [ ] API aceita e persiste novos campos
- [ ] Permissões funcionam (apenas editores podem alterar)
- [ ] Barra aparece corretamente nas abas
- [ ] Configurações funcionam no modal
- [ ] Atualizações em tempo real funcionam
- [ ] Design integra-se bem com abas existentes
- [ ] Performance não foi afetada

---

## 🔧 Melhorias Implementadas vs. Plano Original

### **❌ INCONSISTÊNCIAS CORRIGIDAS:**

1. **Localização Incorreta:**
   - **Original:** "barra de navegação dos quadros" (inexistente)
   - **Corrigido:** Abas dos boards em `components/boards/Boards/Item.jsx`

2. **Base de Dados:**
   - **Original:** Modificação direta do modelo
   - **Corrigido:** Migração Knex adequada com rollback

3. **Sistema Redux:**
   - **Original:** Criar nova infraestrutura
   - **Corrigido:** Aproveitar actions e WebSockets existentes

4. **Permissões:**
   - **Original:** Implementar verificações do zero
   - **Corrigido:** Reutilizar `BoardMembershipRoles.EDITOR`

### **✅ VANTAGENS DA IMPLEMENTAÇÃO REVISTA:**

1. **Menor Complexidade:** Aproveita 80% da infraestrutura existente
2. **Maior Confiabilidade:** Usa padrões já testados no Planka
3. **Melhor Manutenibilidade:** Segue convenções do projeto
4. **Testes Estruturados:** 5 pausas estratégicas com verificações específicas
5. **Logs Estratégicos:** Debugging facilitado em pontos críticos
6. **Integração Visual:** Harmoniza com design existente das abas

### **🎯 RESULTADO ESPERADO:**
Barra de progresso integrada naturalmente nas abas dos boards, visualmente consistente e funcionalmente robusta, aproveitando toda a arquitetura existente do Planka.
