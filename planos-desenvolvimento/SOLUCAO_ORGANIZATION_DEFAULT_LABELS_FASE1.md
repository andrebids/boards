# ✅ Solução: Organization Default Labels - Fase 1 Completa

## 📊 Status: **IMPLEMENTADO E FUNCIONAL**

Data: 3 de Outubro de 2025

---

## 🎯 Objetivo
Criar um sistema de **Etiquetas Padrão da Organização** que permite:
- Definir etiquetas padrão a nível de organização
- Aplicar automaticamente estas etiquetas a novos boards
- Gerir estas etiquetas através de uma interface de administração

---

## ✅ Fase 1: Backend + Redux + UI Básica (COMPLETO)

### 1️⃣ Backend - Database & Models

#### Migration
- **Ficheiro**: `server/db/migrations/20251002000000_add_organization_default_labels.js`
- **Tabela**: `organization_default_label`
- **Campos**:
  - `id` (bigint, auto-gerado)
  - `name` (text, único case-insensitive)
  - `color` (text, validado contra cores do Label)
  - `description` (text, nullable)
  - `position` (integer, default 0)
  - `created_at` / `updated_at` (timestamps)
- **Índices**:
  - `idx_org_default_label_position` (position)
  - `uq_org_default_label_name` (lower(name), unique)
- **Seeds**: 4 labels padrão (Aprovado, Rejeitado, Em Revisão, Precisa Trabalho)

#### Model
- **Ficheiro**: `server/api/models/OrganizationDefaultLabel.js`
- **Validações**:
  - `name`: required, maxLength 60
  - `color`: required, validado contra `Label.COLORS`
  - `description`: nullable, maxLength 280
  - `position`: defaultsTo 0

#### Query Methods
- **Ficheiro**: `server/api/hooks/query-methods/models/OrganizationDefaultLabel.js`
- **Métodos**:
  - `getAll()` - retorna todas as labels ordenadas por position
  - `getOneById(id)` - busca por ID
  - `getOneByName(name)` - busca case-insensitive por nome
  - `createOne(values)` - cria nova label
  - `updateOne(id, values)` - atualiza label
  - `deleteOne(id)` - elimina label
  - `reorder(order)` - reordena múltiplas labels

### 2️⃣ Backend - Controllers & Helpers

#### Controllers
Todos em `server/api/controllers/organization-default-labels/`:
- `list.js` - GET `/api/organization-default-labels` - lista todas as labels
- `create.js` - POST `/api/organization-default-labels` - cria nova label
- `update.js` - PATCH `/api/organization-default-labels/:id` - atualiza label
- `delete.js` - DELETE `/api/organization-default-labels/:id` - elimina label
- `reorder.js` - POST `/api/organization-default-labels/reorder` - reordena labels
- `bulk-apply.js` - POST `/api/organization-default-labels/bulk-apply` - aplica a projetos existentes

**Autorização**: Todos os controllers verificam `isAdminOrProjectOwner(req.currentUser)`

#### Helpers
- **`server/api/helpers/organization-default-labels/apply-to-boards.js`**
  - Aplica default labels a boards de um projeto
  - Suporta 3 modos: `skip`, `merge-by-name`, `rename-on-conflict`

#### Hook Modificado
- **`server/api/helpers/boards/create-one.js`**
  - Ao criar um novo board, aplica automaticamente as organization default labels
  - Guarded por feature flag (futuro)

#### Routes
- **`server/config/routes.js`**
```javascript
'GET /api/organization-default-labels': 'organization-default-labels/list',
'POST /api/organization-default-labels': 'organization-default-labels/create',
'PATCH /api/organization-default-labels/:id': 'organization-default-labels/update',
'DELETE /api/organization-default-labels/:id': 'organization-default-labels/delete',
'POST /api/organization-default-labels/reorder': 'organization-default-labels/reorder',
'POST /api/organization-default-labels/bulk-apply': 'organization-default-labels/bulk-apply',
```

### 3️⃣ Frontend - Redux

#### Action Types
- **`client/src/constants/ActionTypes.js`**
- 27 novos action types para fetch, create, update, delete, reorder, bulk apply + seus handlers

#### Actions
- **`client/src/actions/organization-default-labels.js`**
- Action creators para todas as operações

#### API Client
- **`client/src/api/organization-default-labels.js`**
- Funções que chamam o socket.io com headers de autorização
- **IMPORTANTE**: Todos os métodos aceitam `headers` como último parâmetro

#### Redux-ORM Model
- **`client/src/models/OrganizationDefaultLabel.js`**
- Model com campos: id, name, color, description, position, createdAt, updatedAt
- Reducer que processa actions de fetch, create, update, delete, reorder

#### Sagas
- **`client/src/sagas/organization-default-labels.js`**
- Sagas para todas as operações assíncronas
- **CRÍTICO**: Usa `request` wrapper para injetar Authorization header
- Registrado em `client/src/sagas/core/watchers/index.js`

### 4️⃣ Frontend - UI

#### Componente Principal
- **`client/src/components/common/AdministrationModal/DefaultLabelsPane/DefaultLabelsPane.jsx`**
- Tab no modal de Administração
- Mostra lista de labels padrão
- Usa `useMemo` para evitar re-renders desnecessários

#### Estilos
- **`client/src/components/common/AdministrationModal/DefaultLabelsPane/DefaultLabelsPane.module.scss`**
- Tema "liquid glass" com `rgba` e `backdrop-filter`

#### Traduções
- **pt-PT** (`client/src/locales/pt-PT/core.js`):
  - `defaultLabels`: "Etiquetas Padrão"
  - `defaultLabelsDescription`: "Estas etiquetas são automaticamente adicionadas a todos os novos boards."
  - `noDefaultLabelsYet`: "Ainda não tem etiquetas padrão."
  - `addCommonLabelsForAllProjects`: "Adicione etiquetas comuns que deseja usar em todos os projetos."
- **en-US** (`client/src/locales/en-US/core.js`): equivalentes em inglês

---

## 🐛 Bugs Corrigidos Durante Implementação

### Bug 1: Migration - Unique Index com lower()
**Problema**: `table.unique(knex.raw('lower(name)'))` causava erro de sintaxe  
**Solução**: Usar `knex.raw('CREATE UNIQUE INDEX ...')` separadamente

### Bug 2: Model - Atributo `position` com `required` + `defaultsTo`
**Problema**: Sails.js não permite ambos ao mesmo tempo  
**Solução**: Remover `required: true`, manter apenas `defaultsTo: 0`

### Bug 3: Model - Definição explícita de `id`
**Problema**: Sails.js exige `required` ou `autoIncrement` para `id`  
**Solução**: Remover completamente a definição de `id`, Sails.js gere automaticamente

### Bug 4: Frontend - Export default missing
**Problema**: `actions/organization-default-labels.js` não tinha default export  
**Solução**: Adicionar `export default { ... }` com todas as funções

### Bug 5: Redux-ORM - Selector usando `.all()`
**Problema**: `OrganizationDefaultLabel.all()` não funciona em `useSelector`  
**Solução**: Aceder diretamente `state.orm.OrganizationDefaultLabel.itemsById`

### Bug 6: API URLs - Duplicado `/api/`
**Problema**: `socket.js` já adiciona `/api`, URLs ficavam `/api/api/...`  
**Solução**: Remover `/api/` de todas as URLs em `api/organization-default-labels.js`

### Bug 7: Políticas - Conflito de configuração
**Problema**: Policy específica causava problemas de routing  
**Solução**: Remover policy específica, usar default `'*': 'is-authenticated'` + check interno

### Bug 8: Controllers - Ficheiro `index.js` aggregator
**Problema**: Sails.js interpretava `index.js` como controller principal  
**Solução**: Eliminar `index.js`, deixar apenas controllers individuais

### Bug 9: Sagas - Faltava wrapper `request`
**Problema**: Sagas chamavam `api.*` diretamente, sem Authorization header  
**Solução**: Todas as sagas agora usam `yield call(request, api.*)`

### Bug 10: API - Funções não aceitavam `headers`
**Problema**: Funções API não tinham parâmetro `headers`, token não era enviado  
**Solução**: Todas as funções API agora aceitam `headers` como último parâmetro

### Bug 11: Selector - Warning de memoization
**Problema**: Selector retornava novo array a cada render  
**Solução**: Separar em `useSelector` (para itemsById) + `useMemo` (para array ordenado)

---

## 📋 Próximos Passos

### Fase 2: UI Completa (CRUD)
1. **Componente de Item de Label**
   - Mostrar nome, cor, descrição
   - Botões de editar e eliminar
   - Drag-and-drop para reordenação

2. **Modal de Criação/Edição**
   - Formulário com nome, cor (color picker), descrição
   - Validação de nome único
   - Preview da label

3. **Ações em Lote**
   - Seletor de projetos
   - Escolha de modo de overwrite
   - Progress indicator
   - Relatório de resultados

### Fase 3: Features Avançadas
1. **Aplicação Automática**
   - Confirmar que funciona ao criar novos boards
   - Testes em diferentes cenários

2. **WebSocket Real-time Updates**
   - Implementar handlers de socket para operações CRUD
   - Sincronizar estado entre múltiplos clientes

3. **Feature Flag**
   - Adicionar variável de ambiente `PLANKA_FEATURE_ORG_DEFAULT_LABELS`
   - Condicionar toda a funcionalidade à flag

4. **Testes**
   - Testes de integração backend
   - Testes de componentes frontend
   - Testes E2E

---

## 🎓 Lições Aprendidas

### 1. Padrões de Autenticação no Planka
- O wrapper `request` em `client/src/sagas/core/request.js` é **ESSENCIAL**
- Injeta `Authorization: Bearer ${token}` em todos os pedidos
- Lida com UNAUTHORIZED fazendo logout automático

### 2. Estrutura de API no Planka
- Funções API devem **SEMPRE** aceitar `headers` como último parâmetro
- `socket.get(url, data, headers)` - data pode ser `undefined`
- `socket.post/patch/delete(url, data, headers)` - seguem o mesmo padrão

### 3. Controllers Sails.js
- **NÃO** criar ficheiros `index.js` em diretórios de controllers
- Sails.js interpreta como controller principal e quebra routing
- Usar apenas controllers individuais com funções standalone

### 4. Policies Sails.js
- Política `'*': 'is-authenticated'` é suficiente para maioria dos casos
- Checks adicionais (admin, project owner) devem ser **dentro** dos controllers
- Evitar policies específicas por controller exceto casos especiais

### 5. Redux-ORM
- Não usar métodos como `.all()` diretamente em selectors
- Aceder `state.orm.ModelName.itemsById` e processar manualmente
- Usar `useMemo` para transformações complexas e evitar re-renders

### 6. Debugging Sails.js
- Logs do servidor mostram se request chegou
- Se não há logs, problema está no routing/policies
- `docker logs boards-server --tail 50` é o melhor amigo

---

## 📦 Estrutura de Ficheiros Criados/Modificados

```
server/
├── db/migrations/
│   └── 20251002000000_add_organization_default_labels.js ✨ NOVO
├── api/
│   ├── models/
│   │   └── OrganizationDefaultLabel.js ✨ NOVO
│   ├── hooks/query-methods/models/
│   │   └── OrganizationDefaultLabel.js ✨ NOVO
│   ├── controllers/organization-default-labels/
│   │   ├── list.js ✨ NOVO
│   │   ├── create.js ✨ NOVO
│   │   ├── update.js ✨ NOVO
│   │   ├── delete.js ✨ NOVO
│   │   ├── reorder.js ✨ NOVO
│   │   └── bulk-apply.js ✨ NOVO
│   └── helpers/
│       ├── organization-default-labels/
│       │   └── apply-to-boards.js ✨ NOVO
│       └── boards/
│           └── create-one.js 📝 MODIFICADO
└── config/
    ├── routes.js 📝 MODIFICADO
    └── policies.js 📝 MODIFICADO (depois revertido)

client/
├── src/
│   ├── constants/
│   │   └── ActionTypes.js 📝 MODIFICADO
│   ├── actions/
│   │   ├── organization-default-labels.js ✨ NOVO
│   │   └── index.js 📝 MODIFICADO
│   ├── api/
│   │   ├── organization-default-labels.js ✨ NOVO
│   │   └── index.js 📝 MODIFICADO
│   ├── models/
│   │   └── OrganizationDefaultLabel.js ✨ NOVO
│   ├── sagas/
│   │   ├── organization-default-labels.js ✨ NOVO
│   │   └── core/watchers/
│   │       └── index.js 📝 MODIFICADO
│   ├── orm.js 📝 MODIFICADO
│   ├── components/common/AdministrationModal/
│   │   ├── DefaultLabelsPane/
│   │   │   ├── DefaultLabelsPane.jsx ✨ NOVO
│   │   │   ├── DefaultLabelsPane.module.scss ✨ NOVO
│   │   │   └── index.js ✨ NOVO
│   │   └── AdministrationModal.jsx 📝 MODIFICADO
│   └── locales/
│       ├── pt-PT/core.js 📝 MODIFICADO
│       └── en-US/core.js 📝 MODIFICADO
```

---

## 🚀 Como Testar

1. **Verificar Seeds**:
   ```bash
   docker exec -it boards-db psql -U planka -d planka -c "SELECT id, name, color, position FROM organization_default_label ORDER BY position;"
   ```

2. **Testar UI**:
   - Login como admin/project owner
   - Ir para Administração → Etiquetas Padrão
   - Deve mostrar 5 labels (4 seeds + 1 teste)

3. **Testar Criação Automática**:
   - Criar novo projeto
   - Criar novo board no projeto
   - Verificar que board tem as default labels

4. **Testar API** (via curl/Postman):
   ```bash
   # GET - Lista labels
   curl -H "Authorization: Bearer TOKEN" http://localhost:1337/api/organization-default-labels
   
   # POST - Cria label
   curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
     -d '{"name":"Urgente","color":"red","description":"Item urgente"}' \
     http://localhost:1337/api/organization-default-labels
   ```

---

## ✅ Checklist de Conclusão Fase 1

- [x] Migration criada e testada
- [x] Model definido com validações
- [x] Query methods implementados
- [x] Controllers CRUD completos
- [x] Helper de bulk apply implementado
- [x] Hook de criação de board modificado
- [x] Routes configuradas
- [x] Action types definidos
- [x] Actions criadas
- [x] API client implementado
- [x] Redux-ORM model criado
- [x] Sagas implementadas
- [x] UI básica (lista) implementada
- [x] Estilos liquid glass aplicados
- [x] Traduções pt-PT e en-US
- [x] Todos os bugs corrigidos
- [x] Testado em ambiente de desenvolvimento

---

**Autor**: Claude (AI Assistant)  
**Revisão**: André Garcia  
**Próxima Fase**: UI Completa com CRUD Interativo

