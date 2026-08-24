# CryptPad local para Presentation

Este compose é deliberadamente separado de `boards-dev-*`: não tem `DATABASE_URL`, Redis, volumes ou rede partilhada com o Planka.

1. Copiar `.env.example` para `.env` se for necessário alterar os domínios locais.
2. Criar a configuração operacional:

   ```powershell
   Copy-Item config/config.js.example config/config.js
   ```

3. Arrancar com `docker compose --env-file .env -f docker-compose.dev.yml up -d`.
4. Abrir `http://localhost:3010/checkup/` e concluir a configuração de administrador.
5. Em Administração > Security, ativar **Remote embedding** e autorizar `http://localhost:3008`.

O compose fixa `cryptpad/cryptpad:version-2026.5.1`; não usar `latest`. A imagem e volumes CryptPad pertencem apenas ao editor colaborativo. Projetos, utilizadores, permissões, chat e ficheiros permanentes continuam no Planka. O ficheiro `config/config.js` mantém a chave pública do administrador entre recriações do contentor e não é versionado.

## Preparação de produção

- A imagem customizada é construída apenas manualmente pelo workflow `Build CryptPad image` e deve ser usada por digest, nunca por `latest`.
- O deployment de produção pertence ao role `apps/cryptpad` do repositório Ansible e permanece bloqueado até serem definidos os dois domínios HTTPS e aberta a confirmação explícita.
- Os `.pptx` permanentes continuam em `private/attachments/project-presentations` no volume de anexos do Planka e entram no backup normal do Boards.
- Configuração, dados colaborativos, customizações e recursos OnlyOffice do CryptPad usam volumes próprios e entram no backup CryptPad separado.
