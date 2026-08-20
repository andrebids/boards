# CryptPad local para Presentation

Este compose é deliberadamente separado de `boards-dev-*`: não tem `DATABASE_URL`, Redis, volumes ou rede partilhada com o Planka.

1. Copiar `.env.example` para `.env` se for necessário alterar os domínios locais.
2. Arrancar com `docker compose --env-file .env -f docker-compose.dev.yml up -d`.
3. Abrir `http://localhost:3010/checkup/` e concluir a configuração de administrador.
4. Em Administração > Security, ativar **Remote embedding** e autorizar `http://localhost:3008`.

O compose fixa `cryptpad/cryptpad:version-2026.5.1`; não usar `latest`. A imagem e volumes CryptPad pertencem apenas ao editor colaborativo. Projetos, utilizadores, permissões, chat e ficheiros permanentes continuam no Planka.
