# 🐳 Guia Completo - Build do Planka para Docker

Este guia explica como fazer o build e executar o Planka usando Docker.

## 📋 Pré-requisitos

- Docker Desktop instalado e rodando
- Docker Compose instalado
- Git (para clonar o repositório)

## 🚀 Métodos de Build

### Método 1: Usando Scripts Automatizados (Recomendado)

#### Windows:
```bash
# Navegar para o diretório do projeto
cd planka

# Build da imagem
build-docker.bat

# Iniciar o Planka
start-planka.bat
```

#### Linux/Mac:
```bash
# Navegar para o diretório do projeto
cd planka

# Dar permissão aos scripts
chmod +x build-docker.sh start-planka.sh

# Build da imagem
./build-docker.sh

# Iniciar o Planka
./start-planka.sh
```

### Método 2: Comandos Manuais

#### Build da Imagem:
```bash
# Navegar para o diretório do projeto
cd planka

# Build da imagem Docker
docker build -t planka:latest .

# Ou usar o script npm
npm run docker:build
```

#### Executar com Docker Compose:
```bash
# Usar o arquivo de configuração local
docker-compose -f docker-compose-local.yml up -d

# Ou usar o arquivo original
docker-compose up -d
```

#### Executar Manualmente:
```bash
# 1. Iniciar PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=planka \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -v planka-db:/var/lib/postgresql/data \
  postgres:16-alpine

# 2. Iniciar Planka
docker run -d --name planka \
  -p 3000:1337 \
  -e BASE_URL=http://localhost:3000 \
  -e DATABASE_URL=postgresql://postgres@postgres/planka \
  -e SECRET_KEY=your-secret-key \
  -e DEFAULT_ADMIN_EMAIL=admin@example.com \
  -e DEFAULT_ADMIN_PASSWORD=admin123 \
  --link postgres:postgres \
  planka:latest
```

## ⚙️ Configurações

### Variáveis de Ambiente Principais

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `BASE_URL` | URL base da aplicação | `http://localhost:3000` |
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://postgres@postgres/planka` |
| `SECRET_KEY` | Chave secreta para JWT | `notsecretkey` |
| `DEFAULT_ADMIN_EMAIL` | Email do admin padrão | `admin@example.com` |
| `DEFAULT_ADMIN_PASSWORD` | Senha do admin padrão | `admin123` |
| `DEFAULT_ADMIN_NAME` | Nome do admin padrão | `Admin User` |
| `DEFAULT_ADMIN_USERNAME` | Username do admin padrão | `admin` |

### Volumes Persistentes

- `favicons`: Ícones personalizados
- `user-avatars`: Avatares dos usuários  
- `background-images`: Imagens de fundo
- `attachments`: Anexos dos cartões
- `db-data`: Dados do PostgreSQL

## 🔧 Comandos Úteis

### Gerenciamento de Containers:
```bash
# Ver logs em tempo real
docker-compose -f docker-compose-local.yml logs -f

# Parar serviços
docker-compose -f docker-compose-local.yml down

# Parar e remover volumes (cuidado - perde dados)
docker-compose -f docker-compose-local.yml down -v

# Reiniciar serviços
docker-compose -f docker-compose-local.yml restart

# Ver status dos containers
docker-compose -f docker-compose-local.yml ps
```

### Limpeza:
```bash
# Remover containers parados
docker container prune

# Remover imagens não utilizadas
docker image prune

# Remover volumes não utilizados
docker volume prune

# Limpeza completa
docker system prune -a
```

## 🌐 Acesso à Aplicação

Após iniciar com sucesso:

- **URL**: http://localhost:3000
- **Admin**: admin@example.com / admin123

## 🔍 Troubleshooting

### Problemas Comuns:

1. **Porta 3000 já em uso:**
   ```bash
   # Alterar porta no docker-compose-local.yml
   ports:
     - 3000:1337  # Porta padrão
   ```

2. **Erro de permissão no Windows:**
   - Execute o PowerShell como Administrador
   - Ou use WSL2 para Linux

3. **Build falha:**
   ```bash
   # Limpar cache do Docker
   docker builder prune
   
   # Rebuild sem cache
   docker build --no-cache -t planka:latest .
   ```

4. **Banco de dados não conecta:**
   ```bash
   # Verificar se PostgreSQL está rodando
   docker-compose -f docker-compose-local.yml ps
   
   # Ver logs do PostgreSQL
   docker-compose -f docker-compose-local.yml logs postgres
   ```

## 📊 Monitoramento

### Verificar Status:
```bash
# Status dos containers
docker-compose -f docker-compose-local.yml ps

# Uso de recursos
docker stats

# Logs específicos
docker-compose -f docker-compose-local.yml logs planka
docker-compose -f docker-compose-local.yml logs postgres
```

### Health Check:
O Planka possui health check configurado que verifica a aplicação a cada 10 segundos.

## 🔒 Segurança

### Para Produção:

1. **Alterar SECRET_KEY:**
   ```bash
   # Gerar chave segura
   openssl rand -base64 32
   ```

2. **Configurar HTTPS:**
   - Use um proxy reverso (nginx, traefik)
   - Configure certificados SSL

3. **Backup do Banco:**
   ```bash
   # Backup
   docker exec postgres pg_dump -U postgres planka > backup.sql
   
   # Restore
   docker exec -i postgres psql -U postgres planka < backup.sql
   ```

## 📝 Notas Importantes

- O Planka usa PostgreSQL como banco de dados
- A aplicação roda na porta 1337 internamente
- Todos os dados são persistidos em volumes Docker
- O build usa multi-stage para otimizar o tamanho da imagem
- Suporte a Node.js 18+ é requerido

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Consulte a documentação oficial: https://docs.planka.cloud/
3. Abra uma issue no GitHub do projeto
4. Entre no Discord da comunidade 