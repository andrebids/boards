# Documentação do Erro de Validação - List Update

## Problema Identificado

**Erro:** `E_MISSING_OR_INVALID_PARAMS: The server could not fulfill this request (PATCH /api/lists/1580585844777944075) due to 1 missing or invalid parameter.`

**Endpoint:** `PATCH /api/lists/:id`

## Análise do Problema

### Parâmetros Válidos para List Update

1. **id** (obrigatório)
   - Tipo: string
   - Regex: `/^[1-9][0-9]*$/`
   - Deve ser número positivo

2. **type** (opcional)
   - Tipo: string
   - Valores válidos: `['active', 'closed']`

3. **position** (opcional)
   - Tipo: number
   - Deve ser >= 0

4. **name** (opcional)
   - Tipo: string
   - Não pode ser vazio ou apenas espaços
   - Máximo 128 caracteres

5. **color** (opcional)
   - Tipo: string ou null
   - Valores válidos: `['berry-red', 'pumpkin-orange', 'lagoon-blue', 'pink-tulip', 'light-mud', 'orange-peel', 'bright-moss', 'antique-blue', 'dark-granite', 'turquoise-sea']`

## Possíveis Causas do Erro

### 1. Nome Vazio ou Apenas Espaços
- **Cenário:** Usuário tenta salvar lista com nome vazio ou apenas espaços
- **Validação:** `isNotEmptyString` falha
- **Solução:** Validar no frontend antes de enviar

### 2. Cor Inválida
- **Cenário:** Frontend envia cor que não está na lista de cores válidas
- **Validação:** `isIn: List.COLORS` falha
- **Solução:** Usar apenas cores da lista predefinida

### 3. Type Inválido
- **Cenário:** Frontend envia type que não está em `List.FINITE_TYPES`
- **Validação:** `isIn: List.FINITE_TYPES` falha
- **Solução:** Usar apenas tipos válidos

### 4. Position Inválido
- **Cenário:** Frontend envia position como string ou número negativo
- **Validação:** `type: 'number', min: 0` falha
- **Solução:** Garantir que position seja número >= 0

## Logs de Debug Implementados

### 1. Logs no Controlador
- Inputs recebidos
- Headers da requisição
- Body da requisição
- Validação de cada campo

### 2. Script de Teste
- Validação manual de parâmetros
- Testes de cenários específicos
- Verificação de regras de validação

## Plano de Resolução

### Fase 1: Diagnóstico ✅
- [x] Adicionar logs de debug
- [x] Criar script de teste
- [x] Identificar parâmetros válidos

### Fase 2: Monitoramento
- [ ] Reproduzir erro no ambiente
- [ ] Capturar logs detalhados
- [ ] Identificar parâmetro específico que falha

### Fase 3: Correção
- [ ] Corrigir validação no frontend
- [ ] Implementar validação preventiva
- [ ] Testar cenários específicos

### Fase 4: Limpeza
- [ ] Remover logs de debug
- [ ] Documentar solução final
- [ ] Implementar testes automatizados

## Próximos Passos

1. **Reproduzir o erro** no ambiente de desenvolvimento
2. **Capturar logs** com os dados de debug
3. **Identificar** qual parâmetro específico está falhando
4. **Implementar correção** no frontend ou backend conforme necessário
5. **Testar** a solução
6. **Limpar** código de debug

## Comandos Úteis

```bash
# Monitorar logs em tempo real
docker-compose -f docker-compose-local.yml logs -f planka

# Executar script de teste
docker-compose -f docker-compose-local.yml exec planka node test-validation.js

# Reiniciar container
docker-compose -f docker-compose-local.yml restart planka
```
