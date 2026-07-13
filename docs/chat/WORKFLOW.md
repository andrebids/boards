# Processo de manutenção do chat

O objetivo deste processo é permitir perceber rapidamente o que mudou, porquê, onde e como foi validado.

## Antes de alterar

1. Ler [README](./README.md), [arquitetura](./ARCHITECTURE.md) e decisões relacionadas.
2. Confirmar se existe um plano ativo em `planos-desenvolvimento/`.
3. Identificar contratos afetados: dados, API, sockets, permissões, estado do cliente e interface.
4. Se a alteração mudar uma decisão duradoura, criar primeiro uma entrada `Proposta` em [DECISIONS](./DECISIONS.md).

## Durante a implementação

- Manter controllers pequenos e regras reutilizáveis nos helpers/query methods.
- Autorizar no servidor cada endpoint e subscrição.
- Usar IDs como strings no JavaScript.
- Preservar idempotência, leitura monotónica e apresentação sanitizada.
- Adicionar uma migração nova; nunca editar uma migração já aplicada em ambientes partilhados.
- Atualizar os contratos do cliente e do servidor no mesmo conjunto de alterações.
- Cobrir sucesso, falha, concorrência e revogação quando forem relevantes.

## Antes de concluir

- [ ] Testes dirigidos do backend passam.
- [ ] Testes dirigidos do frontend passam.
- [ ] Lint das áreas alteradas passa.
- [ ] Migrações validam `up` e `down`, quando aplicável.
- [ ] Fluxo em tempo real foi testado com duas sessões, quando aplicável.
- [ ] Permissões foram testadas para os três `chatMode` e tipos de conversa afetados.
- [ ] `CHANGELOG.md` foi atualizado.
- [ ] `ARCHITECTURE.md` foi atualizado se algum contrato mudou.
- [ ] A decisão associada foi aceite, substituída ou rejeitada.
- [ ] O plano associado reflete o que ficou concluído e o que permanece pendente.

## Formato recomendado para uma alteração

Usar na descrição da tarefa, commit ou pull request:

```markdown
## Objetivo

Problema observável e resultado pretendido.

## Alterações

- Backend:
- Frontend:
- Dados/migrações:
- API/eventos:

## Segurança e compatibilidade

- Permissões:
- Dados existentes:
- Rollback:

## Validação

- Testes automatizados:
- Testes manuais:
- Casos não validados:

## Documentação

- Changelog:
- Arquitetura/decisão:
```

## Critério para abrir um plano separado

Criar um plano em `planos-desenvolvimento/` quando a alteração:

- atravessa backend, frontend e dados;
- exige mais de uma entrega;
- tem riscos de segurança, concorrência ou migração;
- depende de uma decisão de produto ainda aberta.

O plano gere trabalho futuro. Quando a implementação termina, o estado final deve ser consolidado nestes documentos e não ficar apenas no plano.
