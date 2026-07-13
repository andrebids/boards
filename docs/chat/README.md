# Documentação do chat

Este diretório é a fonte de verdade para o estado atual do chat por projeto. Os ficheiros em `planos-desenvolvimento/` continuam a guardar planos e análises históricas, mas não devem ser usados isoladamente para determinar o que já está implementado.

Última revisão da documentação: **2026-07-13**.

## Navegação

- [Arquitetura](./ARCHITECTURE.md): componentes, dados, API, eventos e fluxos principais.
- [Histórico de alterações](./CHANGELOG.md): alterações funcionais e técnicas relevantes para o chat.
- [Decisões](./DECISIONS.md): decisões que condicionam futuras implementações.
- [Processo de manutenção](./WORKFLOW.md): checklist para desenvolver e documentar alterações.

## Estado atual

O chat está associado a um projeto e pode ser ativado para gestores ou para todos os membros do projeto. A implementação atual inclui:

- conversa geral do projeto, conversas diretas e grupos personalizados;
- mensagens em tempo real com paginação, estado de leitura e contadores de não lidas;
- criação idempotente, retry, edição e remoção lógica de mensagens;
- respostas, reencaminhamento, mensagens guardadas e deep links;
- anexos, reações e previews externos de links opcionais;
- preferências de notificação, mute e indicação temporária de escrita;
- restauro das janelas abertas, reconexão e revogação de acesso no cliente.

Há trabalho operacional ainda identificado antes de uma ativação geral: E2E com duas sessões reais, quotas de armazenamento, métricas e alertas, rollout progressivo e revisão responsiva completa. O detalhe permanece em [PLANO_MELHORIAS_CHAT.md](../../planos-desenvolvimento/PLANO_MELHORIAS_CHAT.md) e [PLANO_CHAT_COLABORACAO_RESPOSTAS_PREVIEWS.md](../../planos-desenvolvimento/PLANO_CHAT_COLABORACAO_RESPOSTAS_PREVIEWS.md).

## Pontos de entrada no código

| Área | Localização |
|---|---|
| Interface | `client/src/components/chat/` |
| Estado e efeitos | `client/src/reducers/chat.js`, `client/src/models/Chat*.js`, `client/src/sagas/core/` |
| Cliente da API | `client/src/api/chat.js` |
| Rotas HTTP/Socket | `server/config/routes.js` |
| Controllers | `server/api/controllers/chat-*/` |
| Regras de domínio | `server/api/helpers/chat/` e `server/api/helpers/chat-*/` |
| Modelos | `server/api/models/Chat*.js` |
| Queries | `server/api/hooks/query-methods/models/Chat*.js` |
| Migrações | `server/db/migrations/*chat*.js` |
| Testes principais | `server/test/utils/chat*.test.js` e testes de chat em `client/src/` |

## Regra simples

Uma alteração ao chat só está documentalmente concluída quando:

1. o [CHANGELOG](./CHANGELOG.md) descreve o impacto;
2. a [arquitetura](./ARCHITECTURE.md) foi atualizada se mudou um contrato, fluxo ou modelo;
3. uma decisão duradoura foi registada em [DECISIONS](./DECISIONS.md);
4. os testes e passos de validação constam da alteração ou do plano associado.
