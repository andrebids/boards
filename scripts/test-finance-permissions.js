/*!
 * Script de Teste - Permissões do Finance Panel
 * 
 * Este script testa as permissões de acesso ao módulo de despesas.
 * Execute com: node scripts/test-finance-permissions.js
 */

const fetch = require('node-fetch');

// Configuração - Ajuste conforme seu ambiente
const BASE_URL = process.env.BASE_URL || 'http://localhost:1337';
const TOKEN_ADMIN = process.env.TOKEN_ADMIN; // Token de um admin
const TOKEN_FINANCE_MEMBER = process.env.TOKEN_FINANCE_MEMBER; // Token de um finance member
const TOKEN_NORMAL_USER = process.env.TOKEN_NORMAL_USER; // Token de um usuário normal
const PROJECT_ID = process.env.PROJECT_ID; // ID de um projeto para testar

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}!${colors.reset} ${msg}`),
};

async function testEndpoint(endpoint, token, expectedStatus, userType) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const success = response.status === expectedStatus;
    
    if (success) {
      log.success(
        `${userType} - GET ${endpoint} → ${response.status} (esperado: ${expectedStatus})`
      );
    } else {
      log.error(
        `${userType} - GET ${endpoint} → ${response.status} (esperado: ${expectedStatus})`
      );
    }

    return success;
  } catch (error) {
    log.error(`${userType} - Erro ao testar ${endpoint}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== TESTE DE PERMISSÕES - FINANCE PANEL ===\n');

  if (!TOKEN_ADMIN || !TOKEN_FINANCE_MEMBER || !TOKEN_NORMAL_USER || !PROJECT_ID) {
    log.error('Variáveis de ambiente não configuradas!');
    log.info('Configure as seguintes variáveis:');
    log.info('  TOKEN_ADMIN - Token de autenticação de um administrador');
    log.info('  TOKEN_FINANCE_MEMBER - Token de um finance member');
    log.info('  TOKEN_NORMAL_USER - Token de um usuário normal');
    log.info('  PROJECT_ID - ID do projeto para testar');
    log.info('\nExemplo:');
    log.info(
      '  TOKEN_ADMIN=xxx TOKEN_FINANCE_MEMBER=yyy TOKEN_NORMAL_USER=zzz PROJECT_ID=abc node scripts/test-finance-permissions.js'
    );
    process.exit(1);
  }

  const endpoints = [
    `/api/projects/${PROJECT_ID}/finance`,
    `/api/projects/${PROJECT_ID}/expenses`,
    `/api/projects/${PROJECT_ID}/expenses/stats`,
  ];

  let totalTests = 0;
  let passedTests = 0;

  // Testes esperados:
  // - Admin e Finance Member devem ter acesso (200)
  // - Usuário normal não deve ter acesso (403)

  log.info('Testando acesso com Admin...\n');
  for (const endpoint of endpoints) {
    totalTests++;
    const passed = await testEndpoint(endpoint, TOKEN_ADMIN, 200, 'ADMIN');
    if (passed) passedTests++;
  }

  console.log('');
  log.info('Testando acesso com Finance Member...\n');
  for (const endpoint of endpoints) {
    totalTests++;
    const passed = await testEndpoint(endpoint, TOKEN_FINANCE_MEMBER, 200, 'FINANCE MEMBER');
    if (passed) passedTests++;
  }

  console.log('');
  log.info('Testando acesso com Usuário Normal (deve ser negado)...\n');
  for (const endpoint of endpoints) {
    totalTests++;
    const passed = await testEndpoint(endpoint, TOKEN_NORMAL_USER, 403, 'NORMAL USER');
    if (passed) passedTests++;
  }

  console.log('\n=== RESUMO ===\n');
  log.info(`Total de testes: ${totalTests}`);
  log.success(`Testes passados: ${passedTests}`);
  if (totalTests !== passedTests) {
    log.error(`Testes falhados: ${totalTests - passedTests}`);
  }

  if (totalTests === passedTests) {
    console.log('');
    log.success('Todos os testes passaram! Sistema de permissões funcionando corretamente. ✓');
    process.exit(0);
  } else {
    console.log('');
    log.error('Alguns testes falharam. Verifique as permissões.');
    process.exit(1);
  }
}

// Executar testes
runTests().catch((error) => {
  log.error(`Erro ao executar testes: ${error.message}`);
  console.error(error);
  process.exit(1);
});

