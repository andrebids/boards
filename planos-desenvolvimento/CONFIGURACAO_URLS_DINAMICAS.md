# Configuração de URLs Dinâmicas

## ✅ Implementação Concluída

As URLs dos emails agora são **totalmente dinâmicas** e funcionam automaticamente em diferentes ambientes.

## 🔧 Como Funciona

### Função `generateUrl()`
- **Localização**: `server/api/helpers/notifications/create-one.js`
- **Função**: Gera URLs baseadas na variável de ambiente `BASE_URL`
- **Fallback**: Se `BASE_URL` não estiver definida, usa `http://localhost:3000`

### URLs Geradas Automaticamente
- **Card URL**: `{BASE_URL}/cards/{card_id}`
- **Base URL**: `{BASE_URL}`
- **Board URL**: `{BASE_URL}/boards/{board_id}`

## 🌍 Configuração por Ambiente

### Desenvolvimento Local
```bash
BASE_URL=http://localhost:3000
```

### Produção (Servidor Externo)
```bash
BASE_URL=https://boards.dsproject.pt
```

## 📧 Exemplos de URLs Geradas

### Em Desenvolvimento
- Card: `http://localhost:3000/cards/123`
- Base: `http://localhost:3000`

### Em Produção
- Card: `https://boards.dsproject.pt/cards/123`
- Base: `https://boards.dsproject.pt`

## 🔄 Variáveis de Ambiente Necessárias

```bash
# URL base da aplicação
BASE_URL=https://boards.dsproject.pt


## ✅ Benefícios

1. **Automático**: Não precisa alterar código para diferentes ambientes
2. **Seguro**: Fallback para localhost se configuração estiver em falta
3. **Consistente**: Todas as URLs usam a mesma base
4. **Flexível**: Funciona com qualquer domínio/configuração

## 🚀 Próximos Passos

1. **Configurar `BASE_URL`** no servidor de produção
2. **Testar emails** em ambos os ambientes
3. **Verificar links** nos emails recebidos

## 📝 Notas Técnicas

- A função `generateUrl()` limpa automaticamente barras duplicadas
- Logs de aviso são gerados se `BASE_URL` não estiver configurada
- Compatível com HTTP e HTTPS
- Suporta paths customizados
