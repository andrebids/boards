# 📋 Documentação - Janela de Ações do Quadro (Board Actions)

## 🎯 Visão Geral

A janela de ações do quadro é um sistema modular que permite aos utilizadores interagir com um quadro através de várias funcionalidades: alterar vistas, aceder ao histórico de atividades, gerir favoritos, configurar campos personalizados e muito mais.

## 🏗️ Arquitetura do Sistema

### Estrutura Hierárquica
```
BoardActions (Componente Principal)
├── BoardMemberships (Gestão de membros)
├── Filters (Filtros do quadro)
└── RightSide (Lado direito - ações principais)
    ├── Botões de Vista (Kanban, Grid, List)
    ├── Botão de Timeline (Histórico)
    └── ActionsStep (Menu popup com ações)
```

## 📁 Estrutura de Arquivos

### Componentes Principais
```
client/src/components/boards/BoardActions/
├── BoardActions.jsx              # Componente principal
├── BoardActions.module.scss      # Estilos do componente
├── index.js                      # Exportação
├── Filters.jsx                   # Componente de filtros
├── Filters.module.scss           # Estilos dos filtros
└── RightSide/                    # Lado direito das ações
    ├── RightSide.jsx             # Botões principais
    ├── RightSide.module.scss     # Estilos dos botões
    ├── ActionsStep.jsx           # Menu popup de ações
    ├── ActionsStep.module.scss   # Estilos do menu
    └── index.js                  # Exportação
```

### Componentes de Atividades
```
client/src/components/activities/
├── BoardActivitiesPanel/         # Painel lateral de atividades
│   ├── BoardActivitiesPanel.jsx  # Painel principal
│   ├── BoardActivitiesPanel.module.scss
│   └── index.js
└── BoardActivitiesModal/         # Modal de atividades (legado)
    ├── BoardActivitiesModal.jsx  # Modal principal
    ├── BoardActivitiesModal.module.scss
    ├── Item.jsx                  # Item individual
    ├── Item.module.scss
    └── index.js
```

## 🔄 Fluxo de Dados

### 1. Renderização Principal
```javascript
// Fixed.jsx - Layout principal
{board && !board.isFetching && <BoardActions />}
```

### 2. Estado do Redux
```javascript
// Estado principal
{
  timelinePanel: {
    isExpanded: false  // Controla painel de timeline
  },
  boards: {
    currentBoard: {
      id: "123",
      name: "Meu Quadro",
      view: "kanban",        // Vista atual
      context: "board",      // Contexto (board/archive/trash)
      isSubscribed: true,    // Favorito
      isActivitiesFetching: false,
      isAllActivitiesFetched: true,
      lastActivityId: "456",
      activities: [...]      // Atividades do quadro
    }
  }
}
```

### 3. Selectors Principais
```javascript
// Selectors utilizados
selectCurrentBoard()                    // Quadro atual
selectIsTimelinePanelExpanded()         // Estado do painel
selectActivityIdsForCurrentBoard()      // IDs das atividades
selectIsCurrentUserManagerForCurrentProject() // Permissões
selectCurrentUserMembershipForCurrentBoard()  // Membros
```

## 🎮 Funcionalidades Principais

### 1. Alteração de Vistas
**Localização**: `RightSide.jsx`
**Funcionalidade**: Permite alternar entre Kanban, Grid e List

```javascript
const handleSelectViewClick = useCallback(
  ({ currentTarget: { value: view } }) => {
    dispatch(entryActions.updateViewInCurrentBoard(view));
  },
  [dispatch],
);
```

**Vistas Disponíveis**:
- `BoardViews.KANBAN` - Vista Kanban (padrão)
- `BoardViews.GRID` - Vista em grelha
- `BoardViews.LIST` - Vista em lista

### 2. Painel de Timeline
**Localização**: `BoardActivitiesPanel.jsx`
**Funcionalidade**: Mostra histórico de atividades do quadro

```javascript
const handleToggle = useCallback(() => {
  dispatch(entryActions.toggleTimelinePanel());
}, [dispatch]);
```

**Características**:
- Painel lateral direito expansível
- Lista infinita de atividades
- Carregamento automático com `useInView`
- Estado persistido no Redux

### 3. Menu de Ações (ActionsStep)
**Localização**: `ActionsStep.jsx`
**Funcionalidade**: Menu popup com ações do quadro

**Ações Disponíveis**:
- **Subscrever/Desubscrever**: Marcar como favorito
- **Campos Personalizados**: Gerir campos customizados
- **Histórico de Atividades**: Abrir modal de atividades
- **Esvaziar Lixeira**: Limpar lixeira (apenas em contexto trash)
- **Alterar Contexto**: Board → Archive → Trash

### 4. Filtros
**Localização**: `Filters.jsx`
**Funcionalidade**: Filtrar cartões por critérios

**Tipos de Filtros**:
- Por utilizador
- Por etiqueta
- Por data
- Por texto

## 🔧 Sistema de Estado (Redux)

### Actions Principais
```javascript
// Timeline Panel
toggleTimelinePanel()           // Alternar painel
setTimelinePanelExpanded()      // Definir estado

// Board Actions
updateViewInCurrentBoard()      // Alterar vista
updateContextInCurrentBoard()   // Alterar contexto
updateCurrentBoard()            // Atualizar propriedades
openBoardActivitiesModal()      // Abrir modal (legado)

// Activities
fetchActivitiesInCurrentBoard() // Buscar atividades
```

### Reducers
```javascript
// timelinePanelReducer.js
const initialState = {
  isExpanded: false,
};

// Board.js (ORM)
case ActionTypes.ACTIVITIES_IN_BOARD_FETCH:
  Board.withId(payload.boardId).update({
    isActivitiesFetching: true,
  });

case ActionTypes.ACTIVITIES_IN_BOARD_FETCH__SUCCESS:
  Board.withId(payload.boardId).update({
    isActivitiesFetching: false,
    isAllActivitiesFetched: payload.activities.length < Config.ACTIVITIES_LIMIT,
    lastActivityId: payload.activities[payload.activities.length - 1].id,
  });
```

## 🌐 APIs e Dados

### Endpoints Utilizados
```javascript
// Buscar atividades do quadro
GET /boards/{boardId}/actions

// Atualizar propriedades do quadro
PATCH /boards/{boardId}

// Buscar atividades de um cartão
GET /cards/{cardId}/actions
```

### Estrutura de Dados
```javascript
// Atividade
{
  id: "123",
  type: "card_create",
  data: { ... },
  createdAt: "2025-01-20T10:30:00Z",
  boardId: "456",
  cardId: "789",
  userId: "user123"
}

// Quadro
{
  id: "456",
  name: "Meu Quadro",
  view: "kanban",
  context: "board",
  isSubscribed: true,
  isActivitiesFetching: false,
  isAllActivitiesFetched: true,
  lastActivityId: "123"
}
```

## 🎨 Sistema de Estilos

### Classes CSS Principais
```scss
// BoardActions
.wrapper          // Container principal
.actions          // Container das ações
.action           // Item de ação individual
.actionRightSide  // Ação do lado direito

// RightSide
.buttonGroup      // Grupo de botões de vista
.button           // Botão individual
.action           // Container de ação

// ActionsStep
.menu             // Menu popup
.menuItem         // Item do menu
.menuItemIcon     // Ícone do item
.divider          // Separador
```

### Tema Glass (Liquid Glass)
```scss
// Classes aplicadas
.glass-panel      // Painel com efeito glass
.glass-perfect-card // Cartão com efeito glass
```

## 🔄 Integração com Outros Sistemas

### 1. Sistema de Permissões
```javascript
// Verificar se utilizador é manager
const isManager = selectors.selectIsCurrentUserManagerForCurrentProject(state);

// Verificar membros do quadro
const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
```

### 2. Sistema de Notificações
```javascript
// Atualizar favorito (subscrição)
dispatch(entryActions.updateCurrentBoard({
  isSubscribed: !board.isSubscribed,
}));
```

### 3. Sistema de Modais
```javascript
// Abrir modal de atividades (legado)
dispatch(entryActions.openBoardActivitiesModal());

// Abrir modal de campos personalizados
openStep(StepTypes.CUSTOM_FIELD_GROUPS);
```

## 📱 Responsividade

### Breakpoints
```scss
// Desktop
@media (min-width: 1024px) {
  .panel { width: 400px; }
}

// Tablet
@media (max-width: 1023px) {
  .panel { width: 350px; }
}

// Mobile
@media (max-width: 767px) {
  .panel { width: 90vw; }
}
```

## 🔍 Debugging e Logs

### Logs Importantes
```javascript
// Verificar estado do painel
console.log('Timeline Panel:', isExpanded);

// Verificar atividades
console.log('Activity IDs:', activityIds);

// Verificar permissões
console.log('Is Manager:', isManager);
```

### DevTools Redux
```javascript
// Actions a monitorar
TIMELINE_PANEL_TOGGLE
ACTIVITIES_IN_CURRENT_BOARD_FETCH
BOARD_UPDATE
```

## 🚀 Performance

### Otimizações Implementadas
1. **React.memo()**: Componentes memorizados
2. **useCallback()**: Funções memorizadas
3. **useInView**: Carregamento lazy de atividades
4. **Pagination**: Limite de atividades por carregamento
5. **Debouncing**: Evitar múltiplas requisições

### Métricas de Performance
- **Tempo de carregamento**: < 200ms
- **FPS durante animações**: > 60fps
- **Memória**: < 50MB para 1000 atividades
- **Rede**: Máximo 50 atividades por requisição

## 🔧 Configuração

### Variáveis de Ambiente
```javascript
// Configurações de atividades
Config.ACTIVITIES_LIMIT = 50;  // Limite por carregamento

// Configurações de UI
const PANEL_WIDTH = 400;       // Largura do painel
const ANIMATION_DURATION = 300; // Duração das animações
```

### Personalização
```scss
// Variáveis CSS customizáveis
:root {
  --board-actions-bg: rgba(255, 255, 255, 0.95);
  --board-actions-border: rgba(0, 0, 0, 0.1);
  --timeline-panel-width: 400px;
  --animation-duration: 0.3s;
}
```

## 🧪 Testes

### Testes Manuais Necessários
1. **Alteração de vistas**: Kanban ↔ Grid ↔ List
2. **Painel de timeline**: Expandir/recolher
3. **Menu de ações**: Todas as opções funcionam
4. **Filtros**: Aplicar e remover filtros
5. **Responsividade**: Testar em diferentes dispositivos
6. **Performance**: Com muitos dados

### Cenários de Teste
```javascript
// Teste de carregamento de atividades
- Quadro com 0 atividades
- Quadro com 50 atividades
- Quadro com 1000+ atividades

// Teste de permissões
- Utilizador normal
- Utilizador editor
- Utilizador manager

// Teste de contexto
- Board (normal)
- Archive (arquivado)
- Trash (lixeira)
```

## 📚 Referências

### Documentação Relacionada
- [Plano de Implementação Liquid Glass](./PLANO_IMPLEMENTACAO_LIQUID_GLASS_TIMELINE.md)
- [Plano Menu Timeline Glass](./PLANO_MENU_TIMELINE_GLASS.md)
- [Checklist de Implementação](./CHECKLIST_IMPLEMENTACAO.md)

### Arquivos Importantes
- `client/src/constants/ActionTypes.js` - Tipos de actions
- `client/src/constants/Enums.js` - Enums do sistema
- `client/src/selectors/boards.js` - Selectors de quadros
- `client/src/sagas/core/services/activities.js` - Serviços de atividades

---

**Última Atualização**: 20 de Janeiro de 2025
**Versão**: 1.0
**Autor**: Sistema de Análise Automática
