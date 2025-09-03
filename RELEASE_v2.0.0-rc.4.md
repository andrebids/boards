# 🚀 Release v2.0.0-rc.4

## 📅 Data de Publicação
Dezembro 2024

## ✨ Novas Funcionalidades

### 📋 Documentação Completa dos Boards
- **Board CREAS 2026**: Documentação completa com 20 colunas e estrutura organizacional
- **Board TAREFAS 2025/2026**: Documentação detalhada com 8 colunas e 20 cartões
- **Screenshots**: Capturas de ecrã completas dos boards
- **Análise**: Estatísticas e recomendações para desenvolvimento

### 🔧 Configuração GitHub Container Registry
- **Imagem Docker**: `ghcr.io/andrebids/boards:latest`
- **Workflow automático**: Build e push automático via GitHub Actions
- **Registry configurado**: ghcr.io (GitHub Container Registry)
- **Tags automáticas**: Versões, branches e commits

## 🛠️ Melhorias Técnicas
- **Build otimizado**: Vite com configuração de produção
- **Docker workflow**: CI/CD automático para imagens Docker
- **Cache otimizado**: GitHub Actions cache para builds mais rápidos
- **Tags inteligentes**: Sistema automático de versioning

## 🐳 Como Usar

```yaml
# docker-compose.yml
services:
  planka:
    image: ghcr.io/andrebids/boards:latest
    # ... resto da configuração
```

## 🔗 Links
- **GitHub**: https://github.com/andrebids/boards
- **Container Registry**: ghcr.io/andrebids/boards
- **Documentação**: Incluída no repositório

## 🎯 Próximos Passos
- Monitorização do workflow de build Docker
- Validação da imagem no GitHub Container Registry
- Atualizações futuras via releases e commits
