# CryptPad de produção para Apresentações

Este diretório é o pacote reproduzível do serviço CryptPad usado pelas
Apresentações do Planka. É independente da base de dados, Redis, volumes e
rede da aplicação principal.

Inclui os overrides de branding, a remoção do pedido de donativo e os dois
temas adicionais do ONLYOFFICE. Não inclui segredos nem dados colaborativos.
Os ficheiros `.env` e `config/config.js` são deliberadamente ignorados.

## Pré-requisitos

- Dois nomes DNS públicos, ambos com TLS: um principal e um sandbox. O
  CryptPad não pode ser servido numa subpasta.
- Um reverse proxy que reencaminhe o domínio principal para `127.0.0.1:3020`,
  o sandbox para `127.0.0.1:3023` e o WebSocket para `127.0.0.1:3022`,
  preservando `Host`, `Upgrade` e `Connection`.
- Um backup inicial dos volumes `cryptpad-*` antes de cada atualização.
- O frontend Planka publicado com `VITE_CRYPTPAD_URL` igual ao domínio
  principal deste serviço, por exemplo `https://slides.example.com`.

## Bootstrap no servidor

1. Copiar `.env.example` para `.env` e preencher os dois domínios HTTPS.
2. Copiar `config/config.js.example` para `config/config.js`; substituir os
   exemplos de domínio e mantê-lo fora de Git.
3. Construir e iniciar somente o CryptPad:

   ```sh
   docker compose --env-file .env -f docker-compose.yml build cryptpad
   docker compose --env-file .env -f docker-compose.yml up -d cryptpad
   ```

4. Esperar que `https://<dominio-principal>/checkup/` esteja acessível e
   concluir a criação do administrador. Guardar a chave pública em
   `config/config.js` como `adminKeys`.
5. Na administração CryptPad, ativar Remote embedding e autorizar a origem
   HTTPS do Planka.
6. Instalar os temas depois de o ONLYOFFICE ter concluído a primeira
   instalação:

   ```sh
   docker compose --env-file .env -f docker-compose.yml --profile tools run --rm theme-sync
   docker compose --env-file .env -f docker-compose.yml restart cryptpad
   ```

7. Reconstruir/publicar o frontend Planka com `VITE_CRYPTPAD_URL` definido
   para o domínio principal do passo 1. Não usar o fallback `localhost`.

## Validação de publicação

Depois do restart, validar no browser através da rota de Apresentações:

- o loader não contém CryptPad;
- não aparece a caixa de donativo;
- não aparecem ONLYOFFICE, Help ou About;
- o dropdown Design lista `IT Software Sales Proposal` e `Roadmap Infographics`;
- edição, gravação e reabertura funcionam por HTTPS.

Também é possível confirmar os assets sem usar cache:

```sh
curl -fsS https://slides.example.com/common/onlyoffice/dist/v9/sdkjs/slide/themes/themes.js | grep 'Roadmap Infographics'
curl -fsSI https://slides-sandbox.example.com/common/onlyoffice/dist/v9/sdkjs/slide/themes/theme8/theme.bin
```

## Atualizar ou reverter

- Antes de atualizar, exportar backups dos seis volumes `cryptpad-*`.
- Para reverter branding/temas, publicar a revisão anterior deste diretório,
  executar novamente `theme-sync` e reiniciar apenas `cryptpad`.
- Nunca apagar volumes para fazer rollback: isso remove sessões e dados
  colaborativos.
- Sempre validar em staging com os dois domínios e WebSocket antes de trocar a
  imagem em produção.
- Ao alterar `pre-loading.js`, atualizar o sufixo `ver=planka-cryptpad-1` nos
  dois ficheiros HTML de override para invalidar o cache do browser.
