# Plano de atualização do Planka v2 personalizado

## Situação confirmada

Este fork já usa o esquema de dados do Planka v2:

- a base de dados tem a migração `20250228000022_version_2.js` aplicada;
- existem tabelas exclusivas da v2, como `user_account`, `project` e `file_reference`;
- o código foi baseado no `2.0.0-rc.4` e recebeu 122 commits de personalização desde então.

Os ficheiros `package.json` e `server/version.js` mostram `1.3.3` porque a versão foi alterada manualmente após a base `2.0.0-rc.4`. Este número não representa a versão arquitetural do Planka e não deve ser usado para decidir migrações.

O upstream atual é 2.1.1. Como este repositório e o upstream não têm ancestral Git comum, a atualização não deve usar `git merge`.

## Objetivo

Portar as personalizações deste fork v2 RC para uma base limpa e estável do Planka 2.1.1, validando a aplicação e os dados em staging antes de qualquer deploy em produção.

## Regras de segurança

- Nunca executar `docker compose down -v` em produção.
- Não executar `npm run db:upgrade`: esse comando é para converter uma base v1 em v2, e a base atual já é v2.
- Não usar `git merge upstream/master`, pois as histórias Git são independentes.
- Não usar a imagem `nightly` em produção.
- Fazer backup restaurável antes de qualquer alteração de containers, volumes ou base de dados.
- Manter o commit, imagem e volumes anteriores até a validação pós-deploy terminar.

## Fase 1 — Congelar e documentar o estado atual

1. Rever as alterações locais e criar um commit/branch de proteção com as personalizações relevantes.
2. Registar o commit atualmente em produção, a imagem Docker e a versão do esquema da base de dados.
3. Corrigir futuramente a versão declarada para algo inequívoco, por exemplo `2.0.0-rc.4-custom`, numa alteração separada e testada.

Critério de conclusão: é possível reconstruir exatamente a versão atual a partir de Git, imagem e configuração guardada.

## Fase 2 — Fazer backups verificáveis

O script `docker-backup.sh` cria um arquivo com a exportação PostgreSQL, anexos, avatares, fundos e favicons, sem depender de nomes fixos de containers:

```bash
./docker-backup.sh
```

Para outro ficheiro Compose, projeto Docker ou diretório de destino:

```bash
COMPOSE_FILE=docker-compose.yml COMPOSE_PROJECT_NAME=planka BACKUP_DIR=/caminho/seguro/backups ./docker-backup.sh
```

O script cria também um ficheiro `.sha256`. Copiar o arquivo para armazenamento externo e validar uma restauração em staging antes do deploy.

## Fase 3 — Preparar a base alvo

1. Usar o remoto `upstream` já configurado para obter o Planka oficial.
2. Criar uma worktree limpa a partir da release alvo, inicialmente 2.1.1.
3. Executar o relatório de diferenças para inventariar as personalizações:

```bash
./scripts/planka-upgrade-report.sh main 2.1.1
```

O relatório assinala explicitamente que não há uma base Git comum. A release alvo serve como base nova; não é um merge automático.

## Fase 4 — Portar as personalizações

1. Criar uma branch baseada no Planka 2.1.1.
2. Portar uma funcionalidade personalizada de cada vez, em commits pequenos: campos personalizados, etiquetas padrão, interface, notificações e configurações próprias. O módulo de finanças foi descontinuado e não será portado.
3. Para cada funcionalidade, adaptar o código às APIs e estruturas atuais do upstream e adicionar/atualizar migrações quando necessário.
4. Atualizar o Compose para o armazenamento v2 atual, incluindo o volume unificado `/app/data`, sem apagar os volumes antigos até a migração estar validada.

Critério de conclusão: a imagem candidata compila e contém todas as personalizações aprovadas sobre a base 2.1.1.

## Fase 5 — Staging e migração de dados

Criar staging com URL, porta, volumes e base de dados próprios. Restaurar uma cópia controlada do backup e:

1. iniciar PostgreSQL;
2. migrar os dados/ficheiros para a estrutura de armazenamento v2 atual quando aplicável;
3. executar apenas as migrações incrementais normais (`npm run db:migrate`), nunca `db:upgrade`;
4. arrancar a imagem construída a partir do fork atualizado;
5. validar login, projetos, quadros, cartões, anexos, notificações, campos personalizados e etiquetas.

Critério de conclusão: logs sem erros críticos e testes funcionais aprovados com dados migrados.

## Fase 6 — Deploy e rollback

1. Fazer backup final e preservar a imagem/commit atuais.
2. Publicar a branch aprovada e construir a imagem personalizada em produção.
3. Reiniciar sem apagar volumes:

```bash
docker compose down
docker compose up -d --build
```

4. Validar operações essenciais e monitorizar logs.

Para rollback, voltar ao commit/imagem anterior. Se uma migração de dados não for compatível, restaurar a base de dados e os ficheiros a partir do backup final.

## Registo obrigatório

Para cada atualização, guardar o commit alvo, o conjunto de personalizações portadas, a localização/checksum do backup, os resultados de staging, a data do deploy e qualquer decisão de rollback.
