# Atualizações da Base de Dados

## 🔧 Script de Correção Rápida

### Problema: `fileReferenceNotFound`
Quando aparecer este erro ao carregar ficheiros/vídeos:

```
error: Sending 500 ("Server Error") response: Envelope: fileReferenceNotFound
```

### Solução:
```bash
# Executar dentro do container Docker
docker exec -it boards-server npm run db:updater
```

## 📝 Como Adicionar Novas Funcionalidades

Quando adicionares novas funcionalidades que precisem de novas tabelas ou colunas:

### 1. Editar o Script
Edita o ficheiro: `server/scripts/db-updater.js`

### 2. Adicionar Nova Lógica
Exemplo de adição de nova tabela:

```javascript
// ========================================
// NOVA FUNCIONALIDADE
// ========================================
console.log('\n🆕 Verificando nova tabela...');
const novaTabelaExists = await client.query(`
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'nova_tabela'
  );
`);

if (!novaTabelaExists.rows[0].exists) {
  console.log('   → Criando nova_tabela...');
  
  await client.query(`
    CREATE TABLE nova_tabela (
      id BIGINT PRIMARY KEY DEFAULT next_id(),
      nome TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  console.log('   ✅ Nova tabela criada com sucesso');
} else {
  console.log('   ✅ Nova tabela já existe');
}
```

### 3. Executar
```bash
npm run db:updater
```

## 🛡️ Segurança

O script é **100% seguro** porque:
- ✅ **Verifica** se tabelas/colunas já existem antes de criar
- ✅ **NUNCA** remove dados existentes
- ✅ **Pode ser executado** múltiplas vezes sem problemas
- ✅ **Corrige** dados órfãos automaticamente

## 🔧 Configuração Flexível

O script aceita variáveis de ambiente para diferentes configurações:

```bash
# Configuração personalizada
DB_HOST=meu-postgres DB_NAME=minha-db npm run db:updater

# Configuração padrão (Docker)
npm run db:updater
```

### Variáveis disponíveis:
- `DB_HOST` - Host do PostgreSQL (padrão: `postgres`)
- `DB_PORT` - Porta do PostgreSQL (padrão: `5432`)
- `DB_USER` - Utilizador (padrão: `postgres`)
- `DB_PASSWORD` - Password (padrão: vazio)
- `DB_NAME` - Nome da base de dados (padrão: `planka`)

## 💡 Dicas

- Execute este script sempre que mudares de servidor
- Execute quando adicionares novas funcionalidades
- Mantém um backup da base de dados antes de executar (por precaução)
- O script mostra sempre o que está a fazer e o resultado final
