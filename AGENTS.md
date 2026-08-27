# Instruções do projeto

- Este projeto tem hot reload no ambiente de desenvolvimento. Não executar um build para testar alterações locais; usar os serviços de desenvolvimento em execução e validar as alterações através do hot reload.
- Executar um build apenas quando for explicitamente solicitado ou quando for necessário validar um build de produção/release.
- A cópia canónica de desenvolvimento está em `D:\Projetos\planka-personalizado` e é servida localmente em `http://localhost:3008`.
- Em produção, começar por verificações leves e só de leitura (`curl`, `docker ps` e logs limitados). Não executar builds, pulls, reinícios/recriações, migrações, backups, consultas pesadas à base de dados ou varrimentos amplos sem autorização explícita do utilizador; indicar antes o impacto esperado.
