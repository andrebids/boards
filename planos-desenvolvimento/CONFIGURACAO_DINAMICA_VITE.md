# 🔧 Configuração Dinâmica do Vite

## 📋 Visão Geral

O `vite.config.js` foi configurado para ser dinâmico e funcionar em diferentes ambientes sem necessidade de alterações manuais.

## 🎯 Como Funciona

### 1. **Detecção Automática**
- Detecta automaticamente se está rodando no Docker
- Usa o nome correto do container baseado no ambiente

### 2. **Variáveis de Ambiente**
- Prioriza a variável `PLANKA_SERVER_HOST` se definida
- Permite configuração manual quando necessário

### 3. **Fallbacks Inteligentes**
- Docker: `http://boards-planka-server-1:1337`
- Local: `http://localhost:1337`

## 🚀 Configuração

### **Opção 1: Automática (Recomendado)**
Não precisa fazer nada! O sistema detecta automaticamente.

### **Opção 2: Variável de Ambiente**
Crie um arquivo `.env` no diretório `client/`:

```bash
# Para desenvolvimento local
PLANKA_SERVER_HOST=http://localhost:1337

# Para outro servidor
PLANKA_SERVER_HOST=http://meu-servidor:1337

# Para Docker com nome diferente
PLANKA_SERVER_HOST=http://meu-container:1337
```

### **Opção 3: Linha de Comando**
```bash
PLANKA_SERVER_HOST=http://meu-servidor:1337 npm run dev
```

## 🔄 Migração para Outro Servidor

### **Cenário 1: Mesmo Docker Compose**
- ✅ Funciona automaticamente
- Não precisa alterar nada

### **Cenário 2: Servidor Diferente**
- Defina `PLANKA_SERVER_HOST` no `.env`
- Ou use variável de ambiente

### **Cenário 3: Nome de Container Diferente**
- Defina `PLANKA_SERVER_HOST` no `.env`
- Ou modifique a lógica de detecção no `vite.config.js`

## 🛠️ Personalização Avançada

Se precisar de lógica mais complexa, modifique a função `getServerTarget()` no `vite.config.js`:

```javascript
function getServerTarget() {
  // Sua lógica personalizada aqui
  if (process.env.NODE_ENV === 'production') {
    return process.env.PRODUCTION_SERVER;
  }

  if (process.env.DOCKER_ENV === 'custom') {
    return process.env.CUSTOM_SERVER;
  }

  // Fallback padrão
  return "http://localhost:1337";
}
```

## ✅ Benefícios

1. **Zero Configuração**: Funciona automaticamente
2. **Flexível**: Suporta diferentes ambientes
3. **Manutenível**: Fácil de modificar quando necessário
4. **Portável**: Funciona em qualquer servidor
5. **Robusto**: Múltiplos fallbacks para evitar falhas
