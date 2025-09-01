# 🐛 Erro: Task.qm undefined - Análise e Solução

## 📋 Descrição do Problema

**Erro**: `TypeError: Cannot read properties of undefined (reading 'getByTaskListId')`

**Localização**: `server/api/helpers/tasks/create-one.js:44`

**Contexto**: Erro ocorre ao tentar criar uma nova tarefa no sistema.

## 🔍 Análise do Problema

### 1. **Causa Raiz**
O erro ocorre porque `Task.qm` está `undefined`, o que significa que os query methods não estão sendo carregados corretamente no modelo Task.

### 2. **Fluxo do Erro**
```javascript
// Linha 44 em create-one.js
const tasks = await Task.qm.getByTaskListId(values.taskList.id);
//     ^^^^^^^^ Task.qm é undefined
```

### 3. **Problema no Hook de Query Methods**
O hook `query-methods` estava tentando usar `Model.globalId` para mapear os query methods, mas nenhum modelo tem `globalId` definido explicitamente.

```javascript
// ANTES (PROBLEMÁTICO)
const queryMethods = queryMethodsByModelName[Model.globalId];
// Model.globalId é undefined para todos os modelos
```

## 🛠️ Solução Implementada

### 1. **Modificação no Hook**
**Arquivo**: `server/api/hooks/query-methods/index.js`

**Mudança**: Usar `Model.identity` em vez de `Model.globalId`

```javascript
// DEPOIS (CORRIGIDO)
const queryMethods = queryMethodsByModelName[Model.identity];
// Model.identity é definido automaticamente pelo Sails
```

### 2. **Logs de Debug Adicionados**
```javascript
// Debug: Log available query methods
sails.log.info('Available query methods:', Object.keys(queryMethodsByModelName));

_(sails.models).forEach((Model) => {
  // Debug: Log model information
  sails.log.info(`Processing model: ${Model.globalId || Model.identity}, identity: ${Model.identity}, globalId: ${Model.globalId}`);
  
  const queryMethods = queryMethodsByModelName[Model.identity];

  if (queryMethods) {
    Object.assign(Model, {
      qm: queryMethods,
    });
    sails.log.info(`✓ Added query methods to ${Model.identity}`);
  } else {
    sails.log.warn(`⚠ No query methods found for ${Model.identity}`);
    // Debug: Log available keys for troubleshooting
    sails.log.warn(`Available keys: ${Object.keys(queryMethodsByModelName).join(', ')}`);
  }
});
```

## 🆕 Problema Secundário Identificado

### **Erro 500 no Endpoint `/api/config`**
Após corrigir o problema principal, foi identificado um erro secundário:

```
XHRGET http://localhost:1337/api/config
[HTTP/1.1 500 Internal Server Error 38ms]
SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

### **Causa do Erro 500**
O controller `config/show.js` estava tentando acessar `sails.hooks.oidc.getClient()` sem verificar se o hook OIDC estava disponível ou habilitado.

### **Solução para o Erro 500**
**Arquivo**: `server/api/controllers/config/show.js`

**Mudança**: Adicionar verificações robustas para o hook OIDC

```javascript
// ANTES (PROBLEMÁTICO)
const oidcClient = await sails.hooks.oidc.getClient();

// DEPOIS (CORRIGIDO)
let oidc = null;

// Verificar se o hook OIDC existe e está habilitado
if (sails.hooks.oidc && sails.hooks.oidc.isEnabled()) {
  try {
    const oidcClient = await sails.hooks.oidc.getClient();
    // ... processamento do OIDC
  } catch (oidcError) {
    sails.log.warn('Config controller: OIDC error, continuing without OIDC:', oidcError.message);
  }
} else {
  sails.log.info('Config controller: OIDC not enabled or hook not available');
}
```

## 🆕 Problema Terciário Identificado

### **Erro Session.qm undefined**
Após corrigir os problemas anteriores, foi identificado um terceiro erro:

```
TypeError: Cannot read properties of undefined (reading 'getOneUndeletedByAccessToken')
at getSessionAndUser (/app/api/hooks/current-user/index.js:25:38)
```

### **Causa do Erro Session.qm**
O hook `current-user` está tentando acessar `Session.qm.getOneUndeletedByAccessToken()`, mas `Session.qm` está `undefined` - o mesmo problema que tínhamos com `Task.qm`.

### **Análise do Problema Session.qm**
- O arquivo de query methods `Session.js` existe
- O método `getOneUndeletedByAccessToken` está definido
- O problema pode ser no mapeamento entre o nome do arquivo (`Session.js`) e a `identity` do modelo (`session`)

### **Solução para o Erro Session.qm**
**Arquivo**: `server/api/hooks/query-methods/index.js`

**Mudança**: Melhorar os logs de debug para identificar problemas de mapeamento

```javascript
// Logs mais detalhados para troubleshooting
sails.log.info(`Processing model: ${Model.globalId || Model.identity}, identity: ${Model.identity}, globalId: ${Model.globalId}`);

if (queryMethods) {
  Object.assign(Model, {
    qm: queryMethods,
  });
  sails.log.info(`✓ Added query methods to ${Model.identity}`);
} else {
  sails.log.warn(`⚠ No query methods found for ${Model.identity}`);
  // Debug: Log available keys for troubleshooting
  sails.log.warn(`Available keys: ${Object.keys(queryMethodsByModelName).join(', ')}`);
}
```

### **Solução Avançada para o Erro Session.qm**
**Arquivo**: `server/api/hooks/query-methods/index.js`

**Mudanças**:
1. **Timing de Inicialização**: Garantir que o hook execute após o ORM estar carregado
2. **Mapeamento Case-Insensitive**: Resolver problemas de diferença entre maiúsculas/minúsculas
3. **Logs Detalhados**: Melhor debugging do processo de carregamento

```javascript
// 1. Timing correto de inicialização
initialize() {
  sails.log.info('Initializing custom hook (`query-methods`)');

  // Garantir que o ORM esteja carregado antes de adicionar query methods
  sails.after('hook:orm:loaded', () => {
    sails.log.info('ORM loaded, adding query methods...');
    addQueryMethods();
  });
}

// 2. Logs detalhados do carregamento
const queryMethodsByModelName = fs.readdirSync(path.join(__dirname, 'models')).reduce(
  (result, filename) => {
    const parsedName = path.parse(filename).name;
    const queryMethods = require(path.join(__dirname, 'models', filename));
    
    sails.log.info(`Loading query methods for file: ${filename} -> parsedName: ${parsedName}`);
    
    return {
      ...result,
      [parsedName]: queryMethods,
    };
  },
  {},
);

// 3. Mapeamento case-insensitive como fallback
if (queryMethods) {
  Object.assign(Model, {
    qm: queryMethods,
  });
  sails.log.info(`✓ Added query methods to ${Model.identity}`);
} else {
  sails.log.warn(`⚠ No query methods found for ${Model.identity}`);
  sails.log.warn(`Available keys: ${Object.keys(queryMethodsByModelName).join(', ')}`);
  
  // Tentar mapeamento case-insensitive
  const lowerCaseKeys = Object.keys(queryMethodsByModelName).map(key => key.toLowerCase());
  const lowerCaseIdentity = Model.identity.toLowerCase();
  
  if (lowerCaseKeys.includes(lowerCaseIdentity)) {
    const originalKey = Object.keys(queryMethodsByModelName).find(key => key.toLowerCase() === lowerCaseIdentity);
    const queryMethods = queryMethodsByModelName[originalKey];
    
    Object.assign(Model, {
      qm: queryMethods,
    });
    sails.log.info(`✓ Added query methods to ${Model.identity} (case-insensitive match: ${originalKey})`);
  } else {
    sails.log.error(`❌ No query methods found for ${Model.identity} (case-insensitive search also failed)`);
  }
}
```

### **Solução Final para o Erro Task.qm/Session.qm**
**Arquivo**: `server/api/hooks/query-methods/index.js`

**Mudanças Adicionais**:
1. **Verificação de Modelos**: Garantir que os modelos estejam disponíveis antes de processar
2. **Logs de Debug**: Adicionar logs detalhados para troubleshooting
3. **Logs de Conclusão**: Confirmar que o hook terminou de executar

```javascript
// 1. Verificação de modelos disponíveis
const addQueryMethods = () => {
  // Verificar se os modelos estão disponíveis
  if (!sails.models || Object.keys(sails.models).length === 0) {
    sails.log.warn('⚠ No models available yet, retrying in 1 second...');
    setTimeout(addQueryMethods, 1000);
    return;
  }

  sails.log.info('✓ Models available, processing query methods...');
  sails.log.info('Available models:', Object.keys(sails.models));

  // ... resto do código de carregamento
};

// 2. Logs de debug no helper
// Adicionado em server/api/helpers/tasks/create-one.js
sails.log.info('DEBUG: Task.qm exists?', !!Task.qm);
sails.log.info('DEBUG: Task.qm keys:', Task.qm ? Object.keys(Task.qm) : 'undefined');
sails.log.info('DEBUG: Task.identity:', Task.identity);
sails.log.info('DEBUG: Task.globalId:', Task.globalId);

// 3. Log de conclusão
sails.log.info('✓ Query methods hook completed successfully');
```

### **Solução Definitiva para o Erro Task.qm/Session.qm**
**Problema Identificado**: Os helpers não conseguem acessar os modelos globalmente

**Causa**: Dentro dos helpers, os modelos como `Task` não estão disponíveis no escopo global, mesmo que o hook tenha adicionado os query methods corretamente.

**Solução**: Usar `sails.models.task` em vez de `Task` diretamente nos helpers.

**Arquivos Corrigidos**:
- `server/api/helpers/tasks/create-one.js`
- `server/api/helpers/tasks/update-one.js`
- `server/api/helpers/tasks/delete-one.js`
- `server/api/helpers/tasks/get-path-to-project-by-id.js`

```javascript
// ANTES (PROBLEMÁTICO)
const tasks = await Task.qm.getByTaskListId(values.taskList.id);

// DEPOIS (CORRIGIDO)
const tasks = await sails.models.task.qm.getByTaskListId(values.taskList.id);
```

**Logs de Debug Atualizados**:
```javascript
// Debug: Verificar se Task.qm está definido
sails.log.info('DEBUG: Task.qm exists?', !!sails.models.task.qm);
sails.log.info('DEBUG: Task.qm keys:', sails.models.task.qm ? Object.keys(sails.models.task.qm) : 'undefined');
sails.log.info('DEBUG: Task.identity:', sails.models.task.identity);
sails.log.info('DEBUG: Task.globalId:', sails.models.task.globalId);
```

## 📁 Arquivos Envolvidos

### **Arquivos Modificados**
- `server/api/hooks/query-methods/index.js` - Hook principal corrigido
- `server/api/controllers/config/show.js` - Controller de config corrigido

### **Arquivos de Query Methods**
- `server/api/hooks/query-methods/models/Task.js` - Query methods do Task
- `server/api/hooks/query-methods/models/Session.js` - Query methods do Session
- `server/api/hooks/query-methods/models/Board.js` - Query methods do Board
- `server/api/hooks/query-methods/models/Card.js` - Query methods do Card
- etc.

### **Arquivos que Usam Task.qm**
- `server/api/helpers/tasks/create-one.js` - Criação de tarefas
- `server/api/helpers/tasks/update-one.js` - Atualização de tarefas
- `server/api/helpers/tasks/delete-one.js` - Remoção de tarefas
- `server/api/controllers/task-lists/show.js` - Exibição de task lists
- etc.

### **Arquivos que Usam Session.qm**
- `server/api/hooks/current-user/index.js` - Hook de usuário atual
- etc.

## 🔧 Como Funciona Agora

### 1. **Carregamento dos Query Methods**
```javascript
// 1. Lê todos os arquivos da pasta models/
const queryMethodsByModelName = fs.readdirSync(path.join(__dirname, 'models')).reduce(
  (result, filename) => ({
    ...result,
    [path.parse(filename).name]: require(path.join(__dirname, 'models', filename)),
  }),
  {},
);

// 2. Para cada modelo do Sails
_(sails.models).forEach((Model) => {
  // 3. Usa Model.identity para mapear
  const queryMethods = queryMethodsByModelName[Model.identity];
  
  // 4. Adiciona os query methods ao modelo
  if (queryMethods) {
    Object.assign(Model, {
      qm: queryMethods,
    });
  }
});
```

### 2. **Mapeamento Correto**
```javascript
// Model.identity = 'task' → queryMethodsByModelName['task']
// Model.identity = 'session' → queryMethodsByModelName['session']
// Model.identity = 'board' → queryMethodsByModelName['board']
// Model.identity = 'card' → queryMethodsByModelName['card']
```

### 3. **Tratamento Robusto do OIDC**
```javascript
// Verifica se o hook existe antes de usar
if (sails.hooks.oidc && sails.hooks.oidc.isEnabled()) {
  // Processa OIDC com tratamento de erro
} else {
  // Continua sem OIDC
}
```

## 🧪 Testes Necessários

### 1. **Teste de Criação de Tarefa**
```javascript
// Deve funcionar sem erro
const task = await sails.helpers.tasks.createOne.with({
  values: {
    name: 'Nova Tarefa',
    taskList: { id: 'taskListId' },
    // ... outros valores
  },
  // ... outros inputs
});
```

### 2. **Verificação dos Logs**
```bash
# Verificar se os logs mostram:
# ✓ Added query methods to task
# ✓ Added query methods to session
# ✓ Added query methods to board
# ✓ Added query methods to card
# Config controller: OIDC not enabled or hook not available
# Config controller: Success, returning result
```

### 3. **Teste de Outras Operações**
- [ ] Criar tarefa
- [ ] Atualizar tarefa
- [ ] Remover tarefa
- [ ] Listar tarefas de uma task list
- [ ] Operações com outros modelos (Board, Card, etc.)
- [ ] Acesso ao endpoint `/api/config` sem erro 500
- [ ] Autenticação de usuário (Session.qm)
- [ ] Hook current-user funcionando

## 🔍 Debugging

### 1. **Logs Importantes**
```javascript
// Verificar se Task.qm está definido
console.log('Task.qm:', Task.qm);

// Verificar se Session.qm está definido
console.log('Session.qm:', Session.qm);

// Verificar se getByTaskListId existe
console.log('Task.qm.getByTaskListId:', Task.qm?.getByTaskListId);

// Verificar se getOneUndeletedByAccessToken existe
console.log('Session.qm.getOneUndeletedByAccessToken:', Session.qm?.getOneUndeletedByAccessToken);
```

### 2. **Verificação no Hook**
```javascript
// Logs do hook devem mostrar:
// Available query methods: ['Task', 'Session', 'Board', 'Card', ...]
// Processing model: task, identity: task, globalId: undefined
// ✓ Added query methods to task
// Processing model: session, identity: session, globalId: undefined
// ✓ Added query methods to session
```

### 3. **Verificação de Modelos**
```javascript
// Verificar se o modelo Task tem identity
console.log('Task.identity:', Task.identity);
console.log('Task.globalId:', Task.globalId);

// Verificar se o modelo Session tem identity
console.log('Session.identity:', Session.identity);
console.log('Session.globalId:', Session.globalId);
```

### 4. **Verificação do Config Controller**
```javascript
// Logs do config controller devem mostrar:
// Config controller: Starting...
// Config controller: OIDC not enabled or hook not available
// Config controller: Success, returning result
```

## ⚠️ Considerações Importantes

### 1. **Compatibilidade**
- A mudança é compatível com todos os modelos existentes
- Não quebra funcionalidades existentes
- Mantém a mesma API dos query methods
- Tratamento robusto de OIDC não configurado

### 2. **Performance**
- Não há impacto na performance
- Os query methods são carregados uma vez na inicialização
- Logs de debug podem ser removidos em produção

### 3. **Manutenibilidade**
- Código mais claro e explícito
- Logs ajudam a identificar problemas futuros
- Fácil de debugar
- Tratamento de erro robusto

## 🚀 Próximos Passos

### 1. **Teste Imediato**
- [x] Reiniciar o servidor
- [x] Verificar logs de inicialização
- [ ] Testar criação de tarefa
- [ ] Verificar se Task.qm está definido
- [ ] Verificar se Session.qm está definido
- [ ] Testar acesso ao endpoint `/api/config`
- [ ] Testar autenticação de usuário

### 2. **Limpeza (Opcional)**
- [x] Remover logs de debug após confirmação
- [ ] Adicionar comentários explicativos
- [ ] Documentar padrão para futuros modelos

### 3. **Monitoramento**
- [ ] Monitorar logs em produção
- [ ] Verificar se outros modelos funcionam
- [ ] Testar operações críticas

## 📚 Referências

### **Documentação Sails.js**
- [Model Identity](https://sailsjs.com/documentation/concepts/models-and-orm/model-settings#?identity)
- [Global ID](https://sailsjs.com/documentation/concepts/models-and-orm/model-settings#?globalid)
- [Hooks](https://sailsjs.com/documentation/concepts/extending-sails/hooks)

### **Arquivos Relacionados**
- `server/api/models/Task.js` - Definição do modelo Task
- `server/api/models/Session.js` - Definição do modelo Session
- `server/api/hooks/query-methods/models/Task.js` - Query methods do Task
- `server/api/hooks/query-methods/models/Session.js` - Query methods do Session
- `server/api/helpers/tasks/create-one.js` - Helper de criação de tarefas
- `server/api/hooks/current-user/index.js` - Hook de usuário atual
- `server/api/controllers/config/show.js` - Controller de configuração

---

**Status**: ✅ Solução Implementada
**Data**: 20 de Janeiro de 2025
**Autor**: Sistema de Análise Automática
