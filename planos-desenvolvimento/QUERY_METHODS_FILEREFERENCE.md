# Query Methods - FileReference

## 📋 Visão Geral

Este documento descreve os query methods personalizados implementados para o modelo `FileReference` no Planka.

## 🎯 Objetivo

Os query methods do FileReference foram criados para:
- ✅ Resolver o aviso de "No query methods found for filereference"
- ✅ Fornecer métodos úteis para gerenciar referências de arquivos
- ✅ Facilitar operações de limpeza e manutenção do sistema de anexos

## 🔧 Métodos Disponíveis

### Métodos Básicos

#### `createOne(values)`
Cria uma nova referência de arquivo.
```javascript
const fileRef = await FileReference.qm.createOne({
  total: 0
});
```

#### `getByIds(ids)`
Busca múltiplas referências por IDs.
```javascript
const refs = await FileReference.qm.getByIds([1, 2, 3]);
```

#### `getOneById(id)`
Busca uma referência específica por ID.
```javascript
const ref = await FileReference.qm.getOneById(123);
```

#### `updateOne(criteria, values)`
Atualiza uma referência.
```javascript
await FileReference.qm.updateOne({ id: 123 }, { total: 5 });
```

#### `deleteOne(criteria)`
Remove uma referência.
```javascript
await FileReference.qm.deleteOne({ id: 123 });
```

### Métodos Especializados

#### `getByTotal(total)`
Busca referências com um total específico.
```javascript
// Buscar referências com 0 anexos (órfãs)
const orphaned = await FileReference.qm.getByTotal(0);

// Buscar referências com 5 anexos
const withFiveAttachments = await FileReference.qm.getByTotal(5);
```

#### `getOrphaned()`
Busca todas as referências órfãs (total = 0).
```javascript
const orphanedRefs = await FileReference.qm.getOrphaned();
```

#### `getReferenced()`
Busca todas as referências que têm anexos (total > 0).
```javascript
const referencedRefs = await FileReference.qm.getReferenced();
```

### Métodos de Contador

#### `incrementTotal(id, increment = 1)`
Incrementa o contador de anexos de uma referência.
```javascript
// Incrementar em 1
await FileReference.qm.incrementTotal(123);

// Incrementar em 3
await FileReference.qm.incrementTotal(123, 3);
```

#### `decrementTotal(id, decrement = 1)`
Decrementa o contador de anexos de uma referência (não vai abaixo de 0).
```javascript
// Decrementar em 1
await FileReference.qm.decrementTotal(123);

// Decrementar em 2
await FileReference.qm.decrementTotal(123, 2);
```

### Métodos de Limpeza

#### `deleteOrphaned()`
Remove todas as referências órfãs.
```javascript
const deletedCount = await FileReference.qm.deleteOrphaned();
```

#### `cleanupOrphaned()`
Limpeza inteligente de referências órfãs com relatório.
```javascript
const result = await FileReference.qm.cleanupOrphaned();
console.log(result);
// Resultado: { deleted: 5, message: "5 referência(s) órfã(s) removida(s)", orphanedIds: [1,2,3,4,5] }
```

### Métodos de Estatísticas

#### `getStats()`
Obtém estatísticas gerais das referências de arquivos.
```javascript
const stats = await FileReference.qm.getStats();
console.log(stats);
// Resultado: {
//   total_references: 100,
//   orphaned_references: 10,
//   referenced_files: 90,
//   total_attachments: 450
// }
```

## 🚀 Exemplos de Uso

### Exemplo 1: Limpeza Automática
```javascript
// Limpar referências órfãs periodicamente
setInterval(async () => {
  try {
    const result = await FileReference.qm.cleanupOrphaned();
    if (result.deleted > 0) {
      console.log(`🧹 Limpeza automática: ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Erro na limpeza automática:', error);
  }
}, 24 * 60 * 60 * 1000); // A cada 24 horas
```

### Exemplo 2: Monitoramento de Estatísticas
```javascript
// Verificar estatísticas do sistema
const stats = await FileReference.qm.getStats();
console.log(`📊 Estatísticas do sistema:`);
console.log(`   - Total de referências: ${stats.total_references}`);
console.log(`   - Referências órfãs: ${stats.orphaned_references}`);
console.log(`   - Arquivos referenciados: ${stats.referenced_files}`);
console.log(`   - Total de anexos: ${stats.total_attachments}`);
```

### Exemplo 3: Gerenciamento de Anexos
```javascript
// Quando um anexo é criado
const fileRefId = 123;
await FileReference.qm.incrementTotal(fileRefId);

// Quando um anexo é removido
await FileReference.qm.decrementTotal(fileRefId);

// Verificar se a referência ficou órfã
const ref = await FileReference.qm.getOneById(fileRefId);
if (ref.total === 0) {
  console.log('⚠️ Referência ficou órfã, pode ser removida');
}
```

## 🔍 Benefícios

1. **Eliminação do Aviso**: O aviso "No query methods found for filereference" não aparecerá mais
2. **Funcionalidades Úteis**: Métodos especializados para gerenciar referências
3. **Limpeza Automática**: Facilita a manutenção do sistema
4. **Monitoramento**: Estatísticas para acompanhar o estado do sistema
5. **Transações Seguras**: Operações de contador usam transações para garantir consistência

## 📝 Notas Técnicas

- Todos os métodos que modificam contadores usam transações para garantir consistência
- O método `decrementTotal` usa `GREATEST(0, total - decrement)` para evitar valores negativos
- Os métodos de limpeza são seguros e podem ser executados periodicamente
- As estatísticas são calculadas diretamente no banco de dados para melhor performance

## 🎉 Resultado

Com estes query methods implementados:
- ✅ O aviso nos logs será eliminado
- ✅ O sistema terá métodos úteis para gerenciar FileReferences
- ✅ A manutenção do sistema de anexos será mais fácil
- ✅ O código estará preparado para futuras funcionalidades
