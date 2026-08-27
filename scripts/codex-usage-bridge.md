# Bridge de uso do Codex

Este processo deve correr no computador onde o Codex Desktop tem sessao iniciada.
Ele le o limite semanal `primary` e a atividade de tokens atraves do App Server
local (`account/rateLimits/read` e `account/usage/read`) e envia o snapshot para
o Planka. A televisao consulta depois o Planka, nunca o computador nem a conta
Codex.

O snapshot de atividade inclui o total vitalicio, o pico diario, as streaks, a
duracao da tarefa mais longa e os buckets diarios devolvidos pelo Codex. Nao sao
lidos ficheiros de sessoes nem credenciais locais.

## Configuracao

1. Defina `CODEX_USAGE_BRIDGE_TOKEN` no ambiente do servidor Planka. Neste projeto,
   coloque-o em `server/.env`, tanto em desenvolvimento como em producao. Use um
   valor aleatorio longo e mantenha-o fora do Git.
2. No computador com o Codex Desktop, defina as mesmas variaveis no PowerShell:

   ```powershell
   $env:PLANKA_URL = 'https://boards.exemplo.pt'
   $env:CODEX_USAGE_BRIDGE_TOKEN = 'o-mesmo-segredo-do-servidor'
   ```

3. Confirme uma sincronizacao:

   ```powershell
   node scripts/codex-usage-bridge.mjs --once
   ```

4. Para atualizar continuamente enquanto esse computador estiver ligado:

   ```powershell
   node scripts/codex-usage-bridge.mjs
   ```

   O intervalo normal e 60 segundos. Opcionalmente, defina
   `CODEX_USAGE_INTERVAL_MS` entre `10000` e `3600000`.

Para desenvolvimento local use `http://localhost:3008` como `PLANKA_URL`.
Fora de localhost, a bridge aceita apenas HTTPS.
