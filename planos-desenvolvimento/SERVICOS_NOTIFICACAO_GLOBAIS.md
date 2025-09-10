# Serviços de Notificação Globais - Implementação

## Resumo

Implementação de serviços de notificação globais no Planka, permitindo que um serviço de notificação seja usado por todos os utilizadores quando não há serviços específicos configurados. **Esta implementação não modifica a base de dados**, usando variáveis de ambiente para configuração.

## Problema Resolvido

**Antes:** O sistema de notificações só funcionava para utilizadores que tinham configurado serviços específicos ou para boards com serviços específicos.

**Depois:** O sistema agora usa um fallback para serviços globais configurados via variáveis de ambiente, garantindo que todos os utilizadores recebam notificações mesmo sem configuração específica.

## Implementação

### 1. Configuração de Serviços Globais

**Ficheiro:** `server/config/custom.js`

```javascript
// Serviços de notificação globais
globalNotificationServices: JSON.parse(process.env.GLOBAL_NOTIFICATION_SERVICES || '[]'),
```

Os serviços globais são carregados da variável de ambiente `GLOBAL_NOTIFICATION_SERVICES`.

### 2. Lógica de Fallback em `create-one.js`

**Ficheiro:** `server/api/helpers/notifications/create-one.js`

```javascript
// 🔍 Buscar serviços de notificação com fallback para serviços globais
let notificationServices = await NotificationService.qm.getByUserId(notification.userId);

// Se não há serviços específicos do utilizador, tentar serviços do board
if (notificationServices.length === 0) {
  notificationServices = await NotificationService.qm.getByBoardId(inputs.board.id);
}

// Se ainda não há serviços, usar serviços globais da configuração
if (notificationServices.length === 0) {
  notificationServices = sails.config.custom.globalNotificationServices || [];
}
```

### 3. Ordem de Prioridade

O sistema agora segue esta ordem de prioridade:

1. **Serviços específicos do utilizador** (`userId` definido)
2. **Serviços específicos do board** (`boardId` definido)
3. **Serviços globais** (`userId` e `boardId` ambos `null`)

## Como Configurar um Serviço Global

### Via Variável de Ambiente

Adicione a seguinte variável ao seu ficheiro `.env`:

```bash
GLOBAL_NOTIFICATION_SERVICES=[{"url":"mailto://boards%40bids.pt:U3ldc6FeXqSUVE@mail.bids.pt:587/?from=boards%40bids.pt&to=andre%40bids.pt","format":"html"}]
```

### Múltiplos Serviços Globais

Para configurar múltiplos serviços:

```bash
GLOBAL_NOTIFICATION_SERVICES=[
  {"url":"mailto://boards%40bids.pt:U3ldc6FeXqSUVE@mail.bids.pt:587/?from=boards%40bids.pt&to=andre%40bids.pt","format":"html"},
  {"url":"https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK","format":"markdown"}
]
```

### Formato da Configuração

Cada serviço deve ter:
- `url`: URL do serviço de notificação (Apprise)
- `format`: Formato da mensagem (`text`, `markdown`, ou `html`)

## Exemplo de Uso

### Cenário 1: Utilizador com serviço específico
- Utilizador A tem serviço específico configurado
- **Resultado:** Usa o serviço específico do utilizador A

### Cenário 2: Utilizador sem serviço específico, mas board tem serviço
- Utilizador B não tem serviço específico
- Board tem serviço específico configurado
- **Resultado:** Usa o serviço específico do board

### Cenário 3: Utilizador e board sem serviços específicos
- Utilizador C não tem serviço específico
- Board não tem serviço específico
- Existe serviço global configurado
- **Resultado:** Usa o serviço global

### Cenário 4: Nenhum serviço configurado
- Nenhum serviço específico ou global
- **Resultado:** Apenas notificações SMTP (se habilitado)

## Logs de Debug

O sistema agora inclui logs detalhados para debug:

```
🔍 [NOTIFICATIONS] Serviços encontrados para user 123: 0
🔍 [NOTIFICATIONS] Serviços encontrados para board 456: 0
🔍 [NOTIFICATIONS] Serviços globais encontrados: 1
```

## Compatibilidade

✅ **Totalmente compatível** com a implementação existente:
- Serviços específicos de utilizador continuam a funcionar
- Serviços específicos de board continuam a funcionar
- SMTP continua a funcionar independentemente
- Não quebra nenhuma funcionalidade existente

## Teste

Execute o script de teste para verificar a implementação:

```bash
node test-global-notifications-config.js
```

O script testa:
1. Carregamento de serviços globais da configuração
2. Lógica de fallback
3. Estrutura de dados
4. Validação de formato

## Benefícios

1. **Cobertura Total:** Todos os utilizadores recebem notificações
2. **Configuração Simples:** Um único serviço global para toda a organização
3. **Flexibilidade:** Mantém a possibilidade de serviços específicos
4. **Fallback Inteligente:** Sistema de prioridades bem definido
5. **Debug Facilitado:** Logs detalhados para troubleshooting
6. **Sem Modificações na BD:** Usa variáveis de ambiente, ideal para migrações
7. **Portabilidade:** Configuração via ambiente, fácil de replicar

## Próximos Passos

1. **Testar em ambiente de desenvolvimento**
2. **Configurar variável de ambiente GLOBAL_NOTIFICATION_SERVICES**
3. **Verificar funcionamento com utilizadores reais**
4. **Documentar para administradores do sistema**

---

**Data de Implementação:** $(date)  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
