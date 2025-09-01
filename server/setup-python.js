const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐍 Configurando ambiente Python...');

// Verificar se Python está instalado
try {
    execSync('python --version', { stdio: 'pipe' });
    console.log('✅ Python encontrado');
} catch (error) {
    console.log('❌ Python não encontrado. Tentando com python3...');
    try {
        execSync('python3 --version', { stdio: 'pipe' });
        console.log('✅ Python3 encontrado');
    } catch (error2) {
        console.log('❌ Python não está instalado ou não está no PATH');
        console.log('💡 Instale Python de https://python.org');
        process.exit(1);
    }
}

// Verificar se requirements.txt existe
const requirementsPath = path.join(__dirname, 'requirements.txt');
if (!fs.existsSync(requirementsPath)) {
    console.log('⚠️ requirements.txt não encontrado, criando arquivo vazio...');
    fs.writeFileSync(requirementsPath, 'apprise==1.9.3\n');
}

// Criar ambiente virtual
const venvPath = path.join(__dirname, '.venv');
if (fs.existsSync(venvPath)) {
    console.log('🧹 Removendo ambiente virtual existente...');
    fs.rmSync(venvPath, { recursive: true, force: true });
}

console.log('📦 Criando ambiente virtual...');
try {
    execSync('python -m venv .venv', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Ambiente virtual criado');
} catch (error) {
    console.log('❌ Erro ao criar ambiente virtual:', error.message);
    process.exit(1);
}

// Instalar dependências
console.log('📦 Instalando dependências Python...');
const isWindows = process.platform === 'win32';
const pipPath = isWindows ? '.venv\\Scripts\\pip' : '.venv/bin/pip';

try {
    execSync(`${pipPath} install -r requirements.txt`, { 
        stdio: 'inherit', 
        cwd: __dirname 
    });
    console.log('✅ Dependências Python instaladas com sucesso');
} catch (error) {
    console.log('❌ Erro ao instalar dependências:', error.message);
    console.log('💡 Tentando atualizar pip primeiro...');
    
    try {
        execSync(`${pipPath} install --upgrade pip`, { 
            stdio: 'inherit', 
            cwd: __dirname 
        });
        execSync(`${pipPath} install -r requirements.txt`, { 
            stdio: 'inherit', 
            cwd: __dirname 
        });
        console.log('✅ Dependências Python instaladas com sucesso (após atualizar pip)');
    } catch (error2) {
        console.log('❌ Erro persistente ao instalar dependências:', error2.message);
        process.exit(1);
    }
}

console.log('🎉 Configuração Python concluída com sucesso!'); 