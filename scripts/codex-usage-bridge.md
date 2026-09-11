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

## Background no Windows (baixo consumo)

Neste computador, a tarefa `Codex Usage Bridge` executa o launcher
`%USERPROFILE%\.codex\codex-usage-bridge\run.ps1` com `--once`, sem janela,
no inicio de sessao e a cada 5 minutos. Entre sincronizacoes nao ha um processo
residente do bridge. A tarefa usa prioridade baixa, ignora arranques duplicados
e limita cada execucao a 2 minutos. Em caso de erro tenta novamente apos 1 minuto
(ate 3 tentativas); o agendamento de 5 minutos continua depois disso.

O launcher mantem o mutex `Local\CodexUsageBridge` e roda o log ao ultrapassar
1 MB. O modo `--once` termina com codigo 1 quando a sincronizacao falha, para o
Windows reconhecer a falha. Cada snapshot inclui a hora UTC no log.

E necessario manter a sessao Windows iniciada e o computador acordado; bloquear
o ecra ou fechar o terminal nao interrompe o agendamento. A tarefa nao acorda o
computador. Para parar intencionalmente, desative `Codex Usage Bridge` no
Agendador de Tarefas; terminar apenas uma execucao nao desativa as seguintes.

A acao da tarefa usa `wscript.exe //B //NoLogo` com
`%USERPROFILE%\.codex\codex-usage-bridge\run-hidden.vbs`, que inicia o PowerShell
oculto desde o arranque, espera pelo `run.ps1` e propaga o codigo de saida.
Isto evita iniciar diretamente uma aplicacao de consola que so oculta a janela
depois de arrancar. O wrapper tambem termina depois de cada sincronizacao.
