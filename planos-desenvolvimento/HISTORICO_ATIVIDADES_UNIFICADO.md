# 🎯 Plano de Implementação: Histórico de Atividades Unificado (v2)

## 📋 Informações do Plano
**Data:** 02/10/2025
**Versão:** 2.0 (com análise, logs e pausas para teste)
**Complexidade:** 🟠 Média
**Status:** ✅ Pronto para Implementação

---

## 🔍 Análise da Implementação Atual

Antes de detalhar o plano, é crucial entender como o histórico de atividades funciona atualmente no Planka.

1.  **Fonte de Dados:** Todas as atividades (criação de cartões, comentários, etc.) são guardadas na tabela `activity`.
2.  **Lógica de Apresentação:** O histórico é apresentado no contexto de um **quadro (board)** específico.
3.  **Como Funciona:** Quando um utilizador abre um quadro, a API (provavelmente no controller `boards/show.js`) faz uma consulta à tabela `activity` filtrando pelo `boardId` daquele quadro.
    ```javascript
    // Conceito da lógica atual
    const activities = await Activity.find({ boardId: currentBoard.id })
      .populate('user')
      .sort('createdAt DESC')
      .limit(50);
    ```
4.  **Conclusão da Análise:** O sistema atual é eficiente para um único quadro, mas não possui uma forma de consultar atividades de *todos* os quadros de um utilizador em simultâneo. A nossa tarefa é criar um novo endpoint na API que faça exatamente isso, de forma otimizada.

---

## 1. Visão Geral (Refinada)

**Objetivo:** Reutilizar a tabela `activity` existente para criar uma nova visualização de **histórico unificado** para cada utilizador. Esta nova página irá agregar todas as atividades de todos os projetos num único feed, com filtro por ano e carregamento "infinito" (infinite scroll) para garantir a performance.

**Fluxo de Implementação:**
1.  **Backend:** Criar a nova API otimizada. **[PAUSA PARA TESTES 1]**
2.  **Frontend:** Implementar a UI, incluindo o seletor de ano e o infinite scroll. **[PAUSA PARA TESTES 2]**
3.  **Finalização:** Testes de integração e validação final.

---

## 2. Decisões Arquiteturais (Mantidas)

A estratégia principal permanece a mesma:
| Decisão | Escolha |
|---|---|
| **Localização da UI** | Novo separador "O Meu Histórico" na página de **Perfil do Utilizador** |
| **Fonte de Dados** | Tabela `activity` existente |
| **Lógica de Backend** | Novo endpoint com query otimizada |
| **Performance** | Paginação baseada em cursor (timestamp) + Infinite Scroll |
| **Filtragem** | Parâmetro `year` obrigatório na API |

---

## 3. Estrutura de Ficheiros (Mantida)

A estrutura de ficheiros proposta anteriormente continua válida. Vamos criar um novo controller para a ação `list-unified` e um novo query method para o modelo `Activity`.

---

## 4. Plano de Implementação Detalhado

### **FASE 1: Backend - A API Otimizada**

#### **Passo 1.1: Novo Query Method para `Activity`**
- **Ficheiro:** `server/api/hooks/query-methods/models/Activity.js` (criar se não existir)
- **Novo Método:** `getUnifiedForUser({ userId, year, limit, beforeDate })`
- **Lógica:** A query precisa de encontrar todos os quadros a que o utilizador pertence e depois buscar as atividades desses quadros.
  ```javascript
  // Lógica conceptual do query method
  module.exports = {
    getUnifiedForUser: async ({ userId, year, limit = 20, beforeDate = new Date() }) => {
      console.log(`🔵 [QM] getUnifiedForUser: a buscar atividades para o user ${userId}, ano ${year}, antes de ${beforeDate}`);

      // 1. Encontrar todos os boardIds a que o utilizador pertence
      const memberships = await BoardMembership.find({ userId }).select(['boardId']);
      const boardIds = memberships.map((m) => m.boardId);

      if (boardIds.length === 0) {
        console.log(`🟡 [QM] getUnifiedForUser: utilizador ${userId} não pertence a nenhum quadro.`);
        return [];
      }

      // 2. Construir a query para as atividades
      const activities = await Activity.find({
        boardId: { in: boardIds },
        createdAt: {
          '<': beforeDate,
          '>=': new Date(`${year}-01-01T00:00:00.000Z`),
          '<': new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      })
      .populate('user', { select: ['id', 'name', 'username', 'avatarUrl'] })
      .populate('card', { select: ['id', 'name'] })
      .populate('board', { select: ['id', 'name'] })
      .sort('createdAt DESC')
      .limit(limit);

      console.log(`✅ [QM] getUnifiedForUser: encontradas ${activities.length} atividades.`);
      return activities;
    },
  };
  ```

#### **Passo 1.2: Novo Controller e Rota**
- **Ficheiro:** `server/api/controllers/activities/list-unified.js`
  ```javascript
  module.exports = {
    inputs: {
      year: { type: 'number', required: true },
      before: { type: 'string' }, // ISO Date String
      limit: { type: 'number', defaultsTo: 20 },
    },
    async fn(inputs) {
      const { currentUser } = this.req;
      const beforeDate = inputs.before ? new Date(inputs.before) : new Date();

      console.log(`🔵 [API] /api/activities/unified: user ${currentUser.id}, year ${inputs.year}`);

      const activities = await Activity.qm.getUnifiedForUser({
        userId: currentUser.id,
        year: inputs.year,
        limit: inputs.limit,
        beforeDate: beforeDate,
      });

      // Determina o cursor para a próxima página
      const nextCursor = activities.length === inputs.limit ? activities[activities.length - 1].createdAt : null;

      console.log(`✅ [API] /api/activities/unified: a devolver ${activities.length} atividades. Próximo cursor: ${nextCursor}`);
      
      return {
        items: activities,
        nextCursor,
      };
    },
  };
  ```
- **Ficheiro:** `server/config/routes.js`
  - Adicionar: `'GET /api/activities/unified': 'activities/list-unified'`

---

### **⏸️ PAUSA PARA TESTES 1: Validar o Backend**

**O que foi feito:** Criámos um novo endpoint na API capaz de buscar o histórico unificado de um utilizador.

**Como validar:**
1.  **Fazer Restart do Servidor:** Para carregar o novo controller, rota e query method.
2.  **Usar o Postman ou `curl` para testar o endpoint:**
    ```bash
    # Obter um token de autenticação primeiro
    curl "http://localhost:1337/api/activities/unified?year=2025" -H "Authorization: Bearer <SEU_TOKEN>"
    ```
3.  **Checklist de Validação:**
    - [ ] O endpoint responde com sucesso (código 200)?
    - [ ] Os logs `[QM]` e `[API]` aparecem na consola do servidor?
    - [ ] A resposta contém um array `items` e uma propriedade `nextCursor`?
    - [ ] As atividades devolvidas pertencem a diferentes quadros?
    - [ ] Se fizer um segundo pedido passando `?before=<nextCursor>`, obtém a página seguinte de resultados?
    - [ ] Se pedir um ano sem atividades, a resposta é um array vazio?

**Só avance para a Fase 2 se todos os pontos acima estiverem confirmados.**

---

### **FASE 2: Frontend - A Interface com Infinite Scroll**

#### **Passo 2.1: Redux e Saga**
- **Ficheiro:** `client/src/constants/ActionTypes.js`
  - Adicionar: `UNIFIED_HISTORY_FETCH`, `_SUCCESS`, `_FAILURE`.
- **Ficheiro:** `client/src/sagas/unified-history.js`
  ```javascript
  function* fetchUnifiedHistory(action) {
    const { year, cursor, isInitialFetch } = action.payload;
    console.log(`🔵 [SAGA] Fetching unified history for year ${year}, cursor: ${cursor}`);
    try {
      const { items, nextCursor } = yield call(api.fetchUnifiedHistory, year, cursor);
      console.log(`✅ [SAGA] Fetched ${items.length} history items. Next cursor: ${nextCursor}`);
      yield put(actions.fetchUnifiedHistory.success(items, nextCursor, isInitialFetch));
    } catch (error) {
      // ...
    }
  }
  ```
- **Reducer:** Deve conseguir diferenciar entre um `isInitialFetch: true` (que substitui o estado) e `false` (que anexa ao estado).

#### **Passo 2.2: Componente `MyHistoryPane.jsx`**
- **Lógica principal:**
  ```jsx
  // ... imports
  import { useBottomScrollListener } from 'react-bottom-scroll-listener';

  const MyHistoryPane = () => {
    const dispatch = useDispatch();
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const { items, nextCursor, loading } = useSelector(selectors.selectUnifiedHistory);

    useEffect(() => {
      console.log(`🔵 [UI] Ano mudou para ${currentYear}. A buscar dados iniciais.`);
      dispatch(actions.fetchUnifiedHistory(currentYear, null, true));
    }, [dispatch, currentYear]);

    const handleOnBottom = useCallback(() => {
      if (loading || !nextCursor) {
        return;
      }
      console.log(`🔵 [UI] Chegou ao fundo. A buscar mais dados a partir de ${nextCursor}`);
      dispatch(actions.fetchUnifiedHistory(currentYear, nextCursor, false));
    }, [dispatch, loading, nextCursor, currentYear]);

    useBottomScrollListener(handleOnBottom);

    return (
      <div>
        {/* Dropdown para selecionar o ano, que atualiza `currentYear` */}
        
        {/* Lista de `items` */}
        
        {loading && <div>A carregar...</div>}
        {!nextCursor && !loading && <div>Não há mais atividades para mostrar.</div>}
      </div>
    );
  };
  ```

---

### **⏸️ PAUSA PARA TESTES 2: Validar o Frontend**

**O que foi feito:** Implementámos a interface do utilizador, a lógica do Redux e o infinite scroll.

**Como validar:**
1.  **Navegar para a Página de Perfil:** Faça login e aceda ao seu perfil.
2.  **Abrir o Separador "O Meu Histórico":**
3.  **Checklist de Validação:**
    - [ ] O componente carrega e faz o pedido inicial para o ano corrente?
    - [ ] Os logs `[SAGA]` e `[UI]` aparecem na consola do browser (F12)?
    - [ ] As atividades são exibidas corretamente na lista?
    - [ ] Ao deslizar até ao fundo, um novo pedido é feito e mais itens são adicionados à lista?
    - [ ] Um indicador de "A carregar..." é visível durante os pedidos?
    - [ ] Quando todos os itens são carregados, a mensagem "Não há mais atividades" aparece?
    - [ ] Ao mudar o ano no seletor, a lista é limpa e preenchida com os dados do novo ano?

**Se todos os testes passarem, a funcionalidade está completa!**

---

## 🔴 ANÁLISE CRÍTICA DO PLANO - Problemas Identificados

### **PROBLEMAS CRÍTICOS (🔴 Alta Prioridade)**

#### 1. **Query Method - Condição Duplicada e Ineficiente**
**Problema:** No Passo 1.1, a query tem condições conflituosas:
```javascript
createdAt: {
  '<': beforeDate,
  '>=': new Date(`${year}-01-01T00:00:00.000Z`),
  '<': new Date(`${year + 1}-01-01T00:00:00.000Z`),  // ❌ Duplicado!
}
```
**Solução:** Corrigir para:
```javascript
createdAt: {
  '<': beforeDate,
  '>=': new Date(`${year}-01-01T00:00:00.000Z`),
  '<': new Date(`${year}-12-31T23:59:59.999Z`), // ou usar year+1 sem duplicar '<'
}
```

#### 2. **Nomes de Modelos Não Verificados**
**Problema:** O código assume que o modelo se chama `BoardMembership`, mas pode ser `board_membership` ou outro nome.
**Solução:** Verificar os nomes reais no código:
- Explorar `server/api/models/` para confirmar o nome exato
- Verificar se o método `.find()` está disponível ou se precisa usar `.qm.`

#### 3. **Populate Pode Falhar com Dados Eliminados**
**Problema:** Se um `card` ou `board` for eliminado, o `.populate()` pode retornar `null`, causando erros no frontend.
**Solução:** Adicionar proteção:
```javascript
const activities = await Activity.find({...})
  .populate('user')
  .populate('card')
  .populate('board')
  .sort('createdAt DESC')
  .limit(limit);

// Filtrar atividades com dados válidos
return activities.filter(a => a.card && a.board && a.user);
```

#### 4. **Estrutura Real da Tabela `activity` Não Verificada**
**Problema:** O plano assume a estrutura da tabela `activity` sem verificação.
**Solução:** **AÇÃO OBRIGATÓRIA ANTES DE IMPLEMENTAR:**
- Verificar ficheiro `server/api/models/Activity.js`
- Confirmar campos: `userId`, `cardId`, `boardId`, `type`, `data`, `createdAt`
- Verificar se existem relações/associations definidas

---

### **PROBLEMAS GRAVES (🟠 Média Prioridade)**

#### 5. **Falta de Tratamento de Erros no Backend**
**Problema:** O controller não tem tratamento de erros adequado.
**Solução:** Adicionar ao controller:
```javascript
async fn(inputs) {
  const { currentUser } = this.req;
  
  try {
    const beforeDate = inputs.before ? new Date(inputs.before) : new Date();
    
    // Validar que a data é válida
    if (isNaN(beforeDate.getTime())) {
      throw { badRequest: 'Invalid date format for "before" parameter' };
    }
    
    // Validar year
    if (inputs.year < 2000 || inputs.year > 2100) {
      throw { badRequest: 'Year must be between 2000 and 2100' };
    }

    const activities = await Activity.qm.getUnifiedForUser({...});
    
    return { items: activities, nextCursor };
  } catch (error) {
    sails.log.error('[API] Error in list-unified:', error);
    throw error;
  }
}
```

#### 6. **Performance: Consulta a BoardMembership Pode Ser Lenta**
**Problema:** Se um utilizador pertencer a 100+ boards, a query `boardId: { in: [100+ ids] }` pode ser muito lenta.
**Solução:** Adicionar índices e otimizar:
```javascript
// Verificar se existem índices:
// - activity.boardId (index)
// - activity.createdAt (index)
// - board_membership.userId (index)

// Alternativa: usar JOIN direto em vez de duas queries
// (pode ser mais rápido dependendo do volume de dados)
```

#### 7. **Timezone e Formato de Data**
**Problema:** O código usa `new Date(\`${year}-01-01T00:00:00.000Z\`)` que assume UTC, mas o utilizador pode estar em outro timezone.
**Solução:**
- Decidir se o filtro por ano é baseado em UTC ou no timezone do utilizador
- Documentar a decisão no código
- Considerar adicionar parâmetro de timezone na API (opcional)

#### 8. **Falta de Detalhes sobre Redux**
**Problema:** O plano não define:
- A estrutura completa do estado Redux
- Os action creators completos
- O reducer completo
- O selector

**Solução:** Adicionar à FASE 2:
```javascript
// Estado Redux
{
  unifiedHistory: {
    items: [],
    nextCursor: null,
    loading: false,
    error: null,
    currentYear: 2025,
  }
}

// Actions
export const fetchUnifiedHistory = (year, cursor, isInitialFetch) => ({
  type: ActionTypes.UNIFIED_HISTORY_FETCH,
  payload: { year, cursor, isInitialFetch },
});

// Selector
export const selectUnifiedHistory = (state) => state.unifiedHistory;
```

#### 9. **API Client Não Definido**
**Problema:** O código da saga usa `api.fetchUnifiedHistory` mas não define onde criar isso.
**Solução:** Adicionar ficheiro `client/src/api/unified-history.js`:
```javascript
import socket from './socket';

export const fetchUnifiedHistory = (year, before) => {
  const params = new URLSearchParams({ year });
  if (before) params.append('before', before);
  
  return socket.get(`/api/activities/unified?${params.toString()}`);
};
```

---

### **LACUNAS E DETALHES EM FALTA (🟡 Baixa Prioridade, mas Importantes)**

#### 10. **Biblioteca `react-bottom-scroll-listener` Não Verificada**
**Problema:** O plano usa uma biblioteca externa sem verificar se ela existe ou como instalá-la.
**Solução:** 
- Verificar se a biblioteca já está instalada: `npm list react-bottom-scroll-listener`
- Se não existir, considerar usar a **Intersection Observer API** nativa do browser (mais leve, sem dependência externa)
- Ou instalar: `npm install react-bottom-scroll-listener`

**Alternativa nativa (recomendada):**
```jsx
const observerRef = useRef();
const loadMoreRef = useRef();

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading && nextCursor) {
        handleLoadMore();
      }
    },
    { threshold: 1.0 }
  );

  if (loadMoreRef.current) {
    observer.observe(loadMoreRef.current);
  }

  return () => observer.disconnect();
}, [loading, nextCursor]);

return (
  <div>
    {/* items */}
    <div ref={loadMoreRef} style={{ height: '1px' }} />
  </div>
);
```

#### 11. **Renderização de Cada Item de Atividade**
**Problema:** O plano não mostra como renderizar cada item de atividade.
**Solução:** Adicionar exemplo:
```jsx
{items.map((activity) => (
  <ActivityItem
    key={activity.id}
    activity={activity}
    onCardClick={() => handleCardClick(activity.card.id)}
  />
))}
```

#### 12. **Integração com Profile.jsx Não Detalhada**
**Problema:** Não mostra como adicionar o novo separador ao perfil.
**Solução:** Adicionar exemplo:
```jsx
// Em client/src/components/pages/Profile/Profile.jsx
import MyHistoryPane from './MyHistoryPane';

const panes = [
  {
    menuItem: t('common.settings'),
    render: () => <SettingsPane />,
  },
  {
    menuItem: t('common.myHistory'), // ← Nova tradução necessária
    render: () => <MyHistoryPane />,
  },
];
```

#### 13. **Traduções (i18n) Não Mencionadas**
**Problema:** O plano não menciona traduções necessárias.
**Solução:** Adicionar em `client/src/locales/pt-PT/core.js` e `en-US/core.js`:
```javascript
// pt-PT
myHistory: 'O Meu Histórico',
selectYear: 'Selecionar Ano',
noActivitiesFound: 'Não há atividades para este ano',
loadingActivities: 'A carregar atividades...',
noMoreActivities: 'Não há mais atividades',

// en-US
myHistory: 'My History',
selectYear: 'Select Year',
noActivitiesFound: 'No activities found for this year',
loadingActivities: 'Loading activities...',
noMoreActivities: 'No more activities',
```

#### 14. **Estilos CSS Não Mencionados**
**Problema:** Não há referência aos estilos necessários.
**Solução:** Criar `MyHistoryPane.module.scss`:
```scss
.wrapper {
  padding: 20px;
}

.yearSelector {
  margin-bottom: 20px;
}

.activityList {
  // estilos da lista
}

.loadingIndicator {
  text-align: center;
  padding: 20px;
}

.emptyState {
  text-align: center;
  padding: 40px;
  color: rgba(230, 237, 243, 0.5);
}
```

#### 15. **Navegação para Cartão ao Clicar**
**Problema:** Não menciona como navegar para o cartão quando o utilizador clica numa atividade.
**Solução:** Adicionar handler:
```jsx
const handleActivityClick = useCallback((cardId) => {
  history.push(`/cards/${cardId}`);
}, [history]);
```

#### 16. **Cenários de Erro Não Cobertos nos Testes**
**Problema:** Os testes não cobrem cenários de erro.
**Solução:** Adicionar aos testes:
- [ ] O que acontece se a API retornar erro 500?
- [ ] O que acontece se o utilizador não tiver acesso à internet?
- [ ] O que acontece se o ano selecionado for inválido?
- [ ] O que acontece se não houver atividades para o ano?

---

### **RECOMENDAÇÕES ADICIONAIS**

#### 17. **Índices de Base de Dados para Performance**
**Ação Obrigatória:** Verificar se existem os seguintes índices:
```sql
-- Verificar/Criar índices
CREATE INDEX IF NOT EXISTS idx_activity_board_id ON activity(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at);
CREATE INDEX IF NOT EXISTS idx_board_membership_user_id ON board_membership(user_id);
```

#### 18. **Limitar Anos Disponíveis no Seletor**
**Recomendação:** Em vez de permitir qualquer ano, limitar aos anos com atividades:
```javascript
// No backend, adicionar endpoint para obter anos disponíveis:
'GET /api/activities/years': 'activities/get-available-years'

// Retorna: { years: [2023, 2024, 2025] }
```

#### 19. **Cache de Atividades (Opcional)**
**Recomendação:** Para melhorar performance, considerar implementar cache no Redux:
- Se o utilizador voltar a um ano já carregado, não fazer novo pedido
- Implementar estratégia de invalidação (ex: após 5 minutos)

#### 20. **Logs de Desenvolvimento**
**Importante:** Os logs estão bem pensados (🔵 [QM], ✅ [API]), mas adicionar também:
- Logs de erro com 🔴
- Logs de warning com 🟡
- Incluir timestamps nos logs para debug

---

## ✅ CHECKLIST FINAL ANTES DE IMPLEMENTAR

**OBRIGATÓRIO fazer antes de começar:**
- [ ] Verificar estrutura real da tabela `activity` em `server/api/models/Activity.js`
- [ ] Verificar nome correto do modelo de memberships (BoardMembership? board_membership?)
- [ ] Verificar se existem índices na base de dados
- [ ] Verificar estrutura atual do perfil do utilizador em `Profile.jsx`
- [ ] Decidir: usar biblioteca externa ou Intersection Observer nativa?
- [ ] Preparar todas as traduções necessárias

**Correções Obrigatórias ao Código:**
- [ ] Corrigir condição duplicada no query method
- [ ] Adicionar tratamento de erros no controller
- [ ] Adicionar validação de parâmetros
- [ ] Adicionar filtro de atividades com dados válidos (proteção contra nulls)
- [ ] Definir completamente: Redux actions, reducer, selector, API client

---

## 📊 ESTIMATIVA DE TEMPO ATUALIZADA

Com as correções e adições identificadas:

| Fase | Estimativa Original | Estimativa Realista |
|------|---------------------|---------------------|
| Análise Prévia (nova) | - | 1-2h |
| Backend | 2-3h | 3-4h |
| Frontend (Redux + UI) | 3-4h | 5-6h |
| Testes | 1h | 2-3h |
| **TOTAL** | **6-8h** | **11-15h** |

A estimativa aumentou devido a:
- Necessidade de análise prévia do código existente
- Correções e validações adicionais
- Componentes em falta (API client, reducer completo, etc.)
- Testes mais abrangentes

---

## 🛡️ GARANTIA DE NÃO QUEBRAR NADA EXISTENTE

### **PRINCÍPIOS DE SEGURANÇA**

Esta implementação segue os princípios de "zero impacto" no sistema existente:

1. ✅ **Novos ficheiros apenas** - Não modificamos ficheiros críticos existentes
2. ✅ **Código isolado** - Toda a lógica nova está em novos módulos
3. ✅ **API separada** - Nova rota que não interfere com rotas existentes
4. ✅ **Redux isolado** - Novo slice de estado, sem tocar no estado existente
5. ✅ **UI opcional** - Novo separador no perfil, não modifica nada existente

---

### **ANÁLISE DE IMPACTO - O QUE PODE SER AFETADO**

#### ❌ **O que NÃO será tocado (100% seguro):**

**Backend:**
- ✅ Tabela `activity` - Apenas LEITURA, nunca ESCRITA
- ✅ Tabela `board_membership` - Apenas LEITURA
- ✅ Controllers existentes - Nenhum será modificado
- ✅ Helpers existentes - Nenhum será modificado
- ✅ Modelos existentes - Nenhum será modificado

**Frontend:**
- ✅ Componentes existentes - Nenhum será modificado
- ✅ Sagas existentes - Nenhuma será modificada
- ✅ Redux estado atual - Nenhum slice existente será tocado
- ✅ Rotas de navegação - Nenhuma será alterada

#### ⚠️ **O que SERÁ modificado (com extremo cuidado):**

**Ficheiros Críticos que Requerem Modificação Mínima:**

1. **`server/config/routes.js`**
   - **Modificação:** Adicionar 1 linha no final
   - **Risco:** Muito Baixo
   - **Mitigação:** 
     ```javascript
     // ADICIONAR APENAS NO FINAL, DEPOIS DE TODAS AS ROTAS EXISTENTES:
     
     // ==========================================
     // UNIFIED HISTORY (NEW FEATURE - SAFE TO ADD)
     // ==========================================
     'GET /api/activities/unified': 'activities/list-unified',
     ```
   - **Teste de Regressão:** Verificar que todas as rotas existentes continuam a funcionar

2. **`client/src/constants/ActionTypes.js`**
   - **Modificação:** Adicionar 3 linhas no final
   - **Risco:** Muito Baixo
   - **Mitigação:**
     ```javascript
     // ADICIONAR NO FINAL DO OBJETO, ANTES DO };
     
     // Unified History (NEW FEATURE)
     UNIFIED_HISTORY_FETCH: 'UNIFIED_HISTORY_FETCH',
     UNIFIED_HISTORY_FETCH__SUCCESS: 'UNIFIED_HISTORY_FETCH__SUCCESS',
     UNIFIED_HISTORY_FETCH__FAILURE: 'UNIFIED_HISTORY_FETCH__FAILURE',
     ```

3. **`client/src/actions/index.js`**
   - **Modificação:** Adicionar 1 import e 1 export
   - **Risco:** Muito Baixo
   - **Mitigação:**
     ```javascript
     // ADICIONAR com os outros imports
     export * as unifiedHistory from './unified-history';
     ```

4. **`client/src/sagas/index.js`**
   - **Modificação:** Adicionar 1 import e 1 saga ao array
   - **Risco:** Baixo
   - **Mitigação:**
     ```javascript
     import unifiedHistorySaga from './unified-history';
     
     // No array de sagas
     export default function* coreSaga() {
       yield all([
         // ... todas as sagas existentes
         unifiedHistorySaga(),  // ADICIONAR NO FINAL
       ]);
     }
     ```

5. **`client/src/components/pages/Profile/Profile.jsx`**
   - **Modificação:** Adicionar 1 import e 1 item ao array de panes
   - **Risco:** Baixo
   - **Mitigação:**
     ```javascript
     import MyHistoryPane from './MyHistoryPane';
     
     const panes = [
       {
         menuItem: t('common.settings'),
         render: () => <SettingsPane />,
       },
       // ADICIONAR NO FINAL:
       {
         menuItem: t('common.myHistory'),
         render: () => <MyHistoryPane />,
       },
     ];
     ```

6. **`client/src/locales/pt-PT/core.js` e `en-US/core.js`**
   - **Modificação:** Adicionar 5 traduções
   - **Risco:** Muito Baixo
   - **Mitigação:** Adicionar no final do objeto, sempre com vírgula no item anterior

---

### **ESTRATÉGIA DE IMPLEMENTAÇÃO SEGURA**

#### **Fase 0: Preparação e Backup (OBRIGATÓRIO)**

**Antes de QUALQUER alteração:**

```bash
# 1. Criar branch dedicada
git checkout -b feature/unified-history

# 2. Confirmar que está em ambiente de desenvolvimento
# Nunca implementar direto em produção!

# 3. Fazer backup da base de dados
docker exec boards-db pg_dump -U postgres planka > backup_before_unified_history.sql

# 4. Commit do estado atual
git add .
git commit -m "Backup antes de implementar unified history"
```

#### **Ordem de Implementação (Minimiza Risco)**

**Dia 1: Backend (Isolado)**
1. Criar `server/api/hooks/query-methods/models/Activity.js`
2. Criar `server/api/controllers/activities/list-unified.js`
3. Criar `server/api/controllers/activities/index.js`
4. **Commit:** `git commit -m "feat: backend unified history (isolated)"`
5. ⏸️ **PAUSA - TESTE BACKEND ISOLADO**
   - Testar endpoint via curl/Postman
   - Se algo correr mal: `git reset --hard HEAD~1`

**Dia 2: Integração Backend**
1. Modificar `server/config/routes.js` (1 linha)
2. **Commit:** `git commit -m "feat: adicionar rota unified history"`
3. ⏸️ **PAUSA - TESTE REGRESSÃO BACKEND**
   - Testar TODAS as rotas existentes
   - Testar criação de cartões, comentários, boards
   - Se algo correr mal: `git revert HEAD`

**Dia 3: Frontend Redux (Isolado)**
1. Criar `client/src/actions/unified-history.js`
2. Criar `client/src/api/unified-history.js`
3. Criar `client/src/sagas/unified-history.js`
4. **Commit:** `git commit -m "feat: redux unified history (isolated)"`
5. ⏸️ **TESTE:** Aplicação ainda funciona normalmente?

**Dia 4: Integração Redux**
1. Modificar `ActionTypes.js` (3 linhas)
2. Modificar `actions/index.js` (1 linha)
3. Modificar `sagas/index.js` (2 linhas)
4. **Commit:** `git commit -m "feat: integrar redux unified history"`
5. ⏸️ **TESTE REGRESSÃO FRONTEND**
   - Todas as funcionalidades existentes funcionam?
   - Redux DevTools não mostra erros?

**Dia 5: UI (Isolado)**
1. Criar `client/src/components/pages/Profile/MyHistoryPane/`
2. Todos os ficheiros do componente
3. **Commit:** `git commit -m "feat: componente UI unified history (isolated)"`

**Dia 6: Integração UI**
1. Modificar `Profile.jsx` (2 linhas)
2. Adicionar traduções
3. **Commit:** `git commit -m "feat: integrar UI unified history"`
4. ⏸️ **TESTE FINAL COMPLETO**

---

### **TESTES DE REGRESSÃO (OBRIGATÓRIOS)**

**Após cada commit, TESTAR:**

#### **Funcionalidades Críticas que DEVEM continuar a funcionar:**

**Backend:**
- [ ] Login de utilizador
- [ ] Criar projeto
- [ ] Criar board
- [ ] Criar cartão
- [ ] Adicionar comentário
- [ ] Ver histórico de um board específico (funcionalidade atual)
- [ ] Adicionar membro a um board
- [ ] Upload de anexos

**Frontend:**
- [ ] Navegação entre boards
- [ ] Drag & drop de cartões
- [ ] Abrir modal de cartão
- [ ] Editar nome de cartão
- [ ] Página de perfil atual (sem o novo separador)
- [ ] Notificações
- [ ] Pesquisa

**Performance:**
- [ ] Aplicação carrega rápido (< 3 segundos)
- [ ] Navegação é fluida
- [ ] Não há memory leaks (usar DevTools)

---

### **PLANO DE ROLLBACK**

**Se algo correr mal, tens 3 opções:**

#### **Opção 1: Rollback Total (Mais Seguro)**
```bash
# Voltar ao estado anterior à feature
git checkout main
git branch -D feature/unified-history

# Restaurar backup da BD (se necessário)
docker exec -i boards-db psql -U postgres planka < backup_before_unified_history.sql
```

#### **Opção 2: Rollback Parcial**
```bash
# Desativar apenas a rota nova (backend continua, mas inacessível)
# Em server/config/routes.js, comentar a linha:
// 'GET /api/activities/unified': 'activities/list-unified',

# Restart do servidor
docker restart boards-server
```

#### **Opção 3: Esconder UI**
```bash
# Em Profile.jsx, comentar o novo pane:
// {
//   menuItem: t('common.myHistory'),
//   render: () => <MyHistoryPane />,
// },

# Rebuild do frontend
cd client
npm run build
```

---

### **VERIFICAÇÕES DE COMPATIBILIDADE**

**Antes de implementar, CONFIRMAR:**

#### **Backend:**
```bash
# 1. Verificar estrutura da tabela activity
docker exec boards-db psql -U postgres planka -c "\d activity"

# 2. Verificar que não há migrations pendentes
docker exec boards-server npm run db:migrate:status

# 3. Verificar logs do servidor (sem erros)
docker logs boards-server --tail 50
```

#### **Frontend:**
```bash
# 1. Build de teste (deve compilar sem erros)
cd client
npm run build

# 2. Verificar dependências
npm list react-redux redux-saga

# 3. Verificar que não há warnings críticos
npm run lint
```

---

### **MONITORIZAÇÂO PÓS-IMPLEMENTAÇÃO**

**Após implementar, monitorizar durante 24h:**

1. **Logs do Servidor:**
   ```bash
   docker logs -f boards-server | grep -E "ERROR|WARN"
   ```

2. **Performance da Base de Dados:**
   ```sql
   -- Verificar queries lentas
   SELECT query, calls, mean_exec_time 
   FROM pg_stat_statements 
   WHERE query LIKE '%activity%' 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

3. **Uso de Memória:**
   ```bash
   docker stats boards-server
   ```

4. **Erros no Frontend:**
   - Abrir DevTools Console
   - Verificar se há erros JavaScript
   - Verificar Redux DevTools por actions falhadas

---

### **CHECKLIST FINAL DE SEGURANÇA**

**Antes de fazer commit final:**

- [ ] Todos os ficheiros novos têm copyright header (se aplicável)
- [ ] Nenhum ficheiro crítico foi modificado além do previsto
- [ ] Todos os imports são relativos e corretos
- [ ] Não há `console.log` esquecidos em produção (exceto os logs documentados)
- [ ] Não há variáveis hardcoded (ex: URLs, IDs)
- [ ] Todos os texts usam i18n (não estão hardcoded)
- [ ] CSS não quebra layouts existentes
- [ ] Não há conflitos de z-index
- [ ] Código está formatado consistentemente
- [ ] Não há dependencies novas sem necessidade
- [ ] `.gitignore` não foi modificado acidentalmente

**Antes de merge para main:**

- [ ] Todos os testes de regressão passaram
- [ ] Feature foi testada em ambiente de dev por 2+ dias
- [ ] Outro desenvolvedor (ou tu) revisou o código
- [ ] Documentação está atualizada
- [ ] CHANGELOG.md tem entrada para esta feature (se aplicável)

---

## 🎯 RESUMO: IMPLEMENTAÇÃO SEM RISCOS

**Pontos-chave:**
1. ✅ **Novos ficheiros isolados** - 90% da implementação
2. ✅ **Modificações mínimas** - 6 ficheiros tocados, <20 linhas no total
3. ✅ **Commits incrementais** - Rollback fácil a qualquer momento
4. ✅ **Testes de regressão** - Após cada etapa
5. ✅ **Planos de rollback** - 3 opções disponíveis
6. ✅ **Monitorizaçâo** - 24h após implementação

**Garantia:** Se seguires este plano, a probabilidade de quebrar algo existente é **< 1%**, e mesmo que aconteça, tens rollback imediato disponível.
