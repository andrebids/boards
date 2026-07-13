# Histórico de alterações do chat

Este histórico segue as categorias de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) sem impor versionamento próprio ao chat. Datas usam `AAAA-MM-DD`.

Registar aqui mudanças com impacto funcional, de contrato, dados, segurança, operação ou manutenção. Pequenas alterações internas sem impacto não precisam de entrada.

## Não publicado

### Adicionado

### Alterado

### Corrigido

### Segurança

### Removido

## 2026-07-13 — Baseline documental

Esta entrada fixa o estado encontrado no código nesta data; não tenta reconstruir a cronologia anterior.

### Adicionado

- Chat por projeto com modos `disabled`, `managers` e `allProjectMembers`.
- Conversa geral, conversas diretas e grupos personalizados com papéis de owner/member.
- Mensagens com paginação, idempotência, retry, edição, remoção lógica, resposta e reencaminhamento.
- Anexos com limites, referências transacionais, reações, mensagens guardadas e previews de links opcionais.
- Cursores de leitura monotónicos, não lidas, preferências de notificação, mute e estado temporário de escrita.
- Atualizações Socket.IO, subscrição por conversa, reconexão e revogação de acesso.
- Deep links e restauro por utilizador/projeto das janelas abertas.
- Testes unitários dirigidos ao domínio, anexos e estado do cliente.

### Segurança

- Revalidação de acesso no servidor para conversas, mensagens e anexos.
- Mensagens removidas deixam de expor conteúdo e extras na apresentação.
- Previews externos de links ficam desativados por omissão.

## Como adicionar uma entrada

Escrever uma frase curta sob `Não publicado`, com a categoria adequada e, quando existir, a referência da tarefa ou pull request.

Exemplo:

```markdown
### Corrigido

- Evitada a regressão do contador de não lidas durante pedidos de leitura concorrentes (#123).
```

Ao preparar uma release, mover as entradas de `Não publicado` para uma secção com a data da release e voltar a deixar as categorias vazias.
