# Bridge de uso da conta Claude

A metade Claude do painel da TV mostra dois tipos de dados, com origens diferentes:

| Métrica | Origem | Âmbito |
| --- | --- | --- |
| Limite semanal (`seven_day`) e sessão de 5 h (`five_hour`): % usada e hora de reposição | Campo `rate_limits` do JSON documentado do [status line do Claude Code](https://code.claude.com/docs/en/statusline) | Subscrição Claude.ai Pro/Max |
| Atividade de tokens (total, pico diário, streaks, calendário) | Transcripts locais do Claude Code (`~/.claude/projects/**/*.jsonl`) | Só sessões Claude Code deste computador, dentro da retenção local (30 dias por omissão) |

Não é apresentado consumo faturado pela API Anthropic. Esse consumo só está disponível
na Admin API (`/v1/organizations/usage_report/messages` e `/v1/organizations/cost_report`)
com uma Admin API key da organização, e não inclui a subscrição Claude.ai.

Limitações conhecidas:

- Com `~/.claude/planka-usage/config.json` contendo `{"oauthEnabled":true}`, a bridge
  consulta `https://api.anthropic.com/api/oauth/usage` em cada execução usando o access token
  de `~/.claude/.credentials.json` (ou `CLAUDE_CONFIG_DIR`). Renova automaticamente o access
  token pelo endpoint OAuth oficial quando necessário, usando o refresh token existente. Esta opção é explícita porque
  o endpoint não é documentado e pode mudar. Funciona sem uma sessão de terminal ativa.
  Só os limites normalizados são enviados ao Planka; os tokens não são registados nem enviados
  ao Planka. Redirecionamentos são recusados e cada pedido tem timeout de 15 segundos.
  Uma falha mantém a leitura anterior em produção, sem renovar a data de captura.
  A renovação fica guardada localmente até a substituição das credenciais concluir. Bloqueios
  temporários do Windows são repetidos; se persistirem, a execução seguinte recupera a renovação
  pendente sem reutilizar o refresh token antigo. Uma autenticação mais recente do Claude é preservada.
  A bridge impede consultas OAuth simultâneas da tarefa e do status line.
  Se a renovação for recusada com HTTP 400/401, voltar a executar `claude auth login`.
  Remover esta opção repõe o modo baseado no status line.

- No modo status line, o Claude Code só envia `rate_limits` a contas Pro/Max autenticadas com claude.ai, depois da
  primeira resposta da sessão e enquanto uma sessão está aberta. Sem sessão ativa, o painel mostra
  a hora da última leitura e marca-a como desatualizada após 30 minutos.
- Quando a hora de reposição de uma janela passa, a percentagem antiga deixa de ser mostrada.
- O formato dos transcripts é interno ao Claude Code. Linhas desconhecidas são ignoradas; os
  tokens incluem input, output e cache (criação e leitura), contando cada mensagem uma vez.
- Sem a opção OAuth, não são usadas as credenciais locais nem o endpoint privado.

## Configuração

1. No servidor Planka, o endpoint `POST /api/dashboard/claude-usage` aceita o segredo
   `CLAUDE_USAGE_BRIDGE_TOKEN` e, se não estiver definido, `CODEX_USAGE_BRIDGE_TOKEN`
   (em `server/.env`, fora do Git).
2. No computador onde o Claude Code corre, defina para o utilizador Windows:

   ```powershell
   [Environment]::SetEnvironmentVariable('CLAUDE_USAGE_PLANKA_URL', 'https://boards.exemplo.pt', 'User')
   # Opcional se CODEX_USAGE_BRIDGE_TOKEN já tiver o mesmo segredo do servidor
   [Environment]::SetEnvironmentVariable('CLAUDE_USAGE_BRIDGE_TOKEN', '<segredo>', 'User')
   ```

   A publicação automática só acontece com `CLAUDE_USAGE_PLANKA_URL` definido.
3. Configure o status line em `~/.claude/settings.json`:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node D:/Projetos/planka-personalizado/scripts/claude-usage-statusline.mjs",
       "refreshInterval": 60
     }
   }
   ```

   O script mostra `Modelo · 5h N% · 7d N%`, grava apenas os limites em
   `~/.claude/planka-usage/rate-limits.json` e lança a bridge em segundo plano no máximo uma vez
   por minuto. Erros ficam em `~/.claude/planka-usage/bridge.log`.
4. Envio manual (por exemplo, para testar):

   ```powershell
   node scripts/claude-usage-bridge.mjs --once
   ```

Fora de localhost, a bridge aceita apenas HTTPS.

## Background no Windows (igual ao Codex)

A tarefa `Claude Usage Bridge` executa `%USERPROFILE%\.claude\planka-usage\run-hidden.vbs`
(via `wscript.exe //B //NoLogo`), que corre `run.ps1` oculto com `--once` no início de sessão e a
cada 5 minutos. Usa o mutex `Local\ClaudeUsageBridge`, limita cada execução a 2 minutos, tenta
de novo após 1 minuto em caso de erro (até 3 vezes) e roda o `bridge.log` acima de 1 MB.

A tarefa consulta os limites na Anthropic quando a opção OAuth está ativa, sem pedidos de geração.
Sem essa opção, só lê ficheiros locais: os limites ficam atuais enquanto o Claude Code
(com o status line configurado) está a ser usado. O painel mostra a idade da última leitura.

`run.ps1` lê do utilizador Windows `CLAUDE_USAGE_PLANKA_URL`, `CLAUDE_USAGE_BRIDGE_TOKEN` e,
como alternativa ao segundo, `CODEX_USAGE_BRIDGE_TOKEN`. Para passar de desenvolvimento para
produção, altere `CLAUDE_USAGE_PLANKA_URL` para o URL HTTPS de produção e o
`CLAUDE_USAGE_BRIDGE_TOKEN` para o segredo de produção (ou remova-o para usar o do Codex).
