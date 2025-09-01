# 🔧 CONFIGURAÇÃO - SISTEMA DE COMENTÁRIOS NO HISTÓRICO

## 📋 Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Configurações para Sistema de Comentários no Histórico

# Habilitar sistema de comentários no histórico
ACTIVITY_COMMENT_ENABLED=true

# Delay para debouncing de atividades (em ms)
ACTIVITY_DEBOUNCE_DELAY=2000

# Tamanho da página para carregamento de atividades
ACTIVITY_PAGE_SIZE=50

# Tamanho do lote para migração de comentários
ACTIVITY_MIGRATION_BATCH_SIZE=1000

# Nível de log para atividades de comentário (debug, info, warn, error)
ACTIVITY_LOG_LEVEL=info

# Habilitar cache de atividades
ACTIVITY_CACHE_ENABLED=true

# Tempo de expiração do cache (em segundos)
ACTIVITY_CACHE_TTL=300
```

## 🚀 Comandos de Deploy

### 1. Executar Migração de Comentários Existentes

```bash
# Executar migração
node server/scripts/migrate-comments-to-activities.js

# Ou via npm script (se configurado)
npm run migrate:comments-to-activities
```

### 2. Build e Deploy

```bash
# Build do projeto
npm run build

# Deploy
npm run deploy
```

### 3. Verificar Logs

```bash
# Verificar logs de atividades
npm run logs:activities

# Ou monitorar logs em tempo real
tail -f logs/application.log | grep -E "(comment|activity)"
```

## 🔍 Comandos de Teste

### 1. Teste de Criação de Comentário

```bash
# Criar comentário via API
curl -X POST "http://localhost:3000/api/cards/CARD_ID/comments" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Teste de comentário para histórico"}'

# Verificar se atividade foi criada
curl -X GET "http://localhost:3000/api/boards/BOARD_ID/activities" \
  -H "Authorization: Bearer TOKEN" | grep -i "comment"
```

### 2. Teste de Performance

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

### 3. Teste de Interface

```javascript
// No console do navegador
// 1. Verificar se comentários aparecem no histórico
document.querySelectorAll('[data-testid="comment-activity"]').length

// 2. Verificar se filtros funcionam
document.querySelector('[data-testid="filter-comments"]').click()

// 3. Verificar se tema glass está aplicado
document.querySelector('.comment-activity-item').classList.contains('glass-panel')
```

## 📊 Monitoramento

### Métricas a Monitorar

- **Performance**: Tempo de carregamento das atividades
- **Uso**: Número de atividades de comentário criadas
- **Erros**: Falhas na criação de atividades
- **Cache**: Taxa de hit/miss do cache de atividades

### Alertas Configurados

- **Alta latência** (>2s para carregar atividades)
- **Muitos erros** (>5% de falhas)
- **Cache ineficiente** (<80% hit rate)
- **Migração falhou** (script de migração com erro)

## 🔧 Troubleshooting

### Problemas Comuns

1. **Comentários não aparecem no histórico**
   - Verificar se `ACTIVITY_COMMENT_ENABLED=true`
   - Verificar logs do servidor
   - Verificar se o helper de atividades está funcionando

2. **Performance lenta**
   - Ajustar `ACTIVITY_PAGE_SIZE`
   - Habilitar cache com `ACTIVITY_CACHE_ENABLED=true`
   - Verificar queries de banco de dados

3. **Erros de migração**
   - Verificar permissões de banco de dados
   - Verificar se todos os modelos estão carregados
   - Executar migração em lotes menores

### Logs Importantes

```bash
# Logs de criação de atividade
grep "Atividade de comentário criada" logs/application.log

# Logs de erro
grep "Erro ao criar atividade" logs/application.log

# Logs de migração
grep "Migração concluída" logs/application.log
```

## 📚 Documentação Relacionada

- [Plano de Implementação](./PLANO_COMENTARIOS_HISTORICO.md)
- [Documentação Ações do Quadro](./DOCUMENTACAO_ACOES_QUADRO.md)
- [Sistema Glass](./PLANO_SEMANTIC_UI_GLASS_CORRIGIDO.md)
