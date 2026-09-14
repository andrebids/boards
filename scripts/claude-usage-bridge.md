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

- O Claude Code só envia `rate_limits` a contas Pro/Max autenticadas com claude.ai, depois da
  primeira resposta da sessão e enquanto uma sessão está aberta. Sem sessão ativa, o painel mostra
  a hora da última leitura e marca-a como desatualizada após 30 minutos.
- Quando a hora de reposição de uma janela passa, a percentagem antiga deixa de ser mostrada.
- O formato dos transcripts é interno ao Claude Code. Linhas desconhecidas são ignoradas; os
  tokens incluem input, output e cache (criação e leitura), contando cada mensagem uma vez.
- O endpoint não documentado `api.anthropic.com/api/oauth/usage` não é usado, nem as credenciais
  locais do Claude Code.

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

A tarefa só lê ficheiros locais e envia para o Planka: não faz pedidos à Anthropic nem consome
utilização da subscrição. Os limites só ficam atuais enquanto o Claude Code (com o status line
configurado) está a ser usado; nos restantes períodos o painel mostra a idade da última leitura.

`run.ps1` lê do utilizador Windows `CLAUDE_USAGE_PLANKA_URL`, `CLAUDE_USAGE_BRIDGE_TOKEN` e,
como alternativa ao segundo, `CODEX_USAGE_BRIDGE_TOKEN`. Para passar de desenvolvimento para
produção, altere `CLAUDE_USAGE_PLANKA_URL` para o URL HTTPS de produção e o
`CLAUDE_USAGE_BRIDGE_TOKEN` para o segredo de produção (ou remova-o para usar o do Codex).
