# Plano de implementação: abrir o cartão a partir de um movimento no histórico

## Objetivo

No histórico de atividades do quadro, um movimento de cartão deve ser uma ação clara: ao clicar no respetivo registo, o utilizador abre o cartão associado no seu estado e localização atuais. A aplicação continuará a usar a rota canónica do cartão (`/cards/:id`), que já carrega o quadro atual do cartão quando ele tiver sido movido novamente.

## Decisões de implementação

- O âmbito é apenas `MOVE_CARD` no histórico do quadro (modal e painel lateral, que reutilizam o mesmo componente `BoardActivitiesModal/Item`).
- A interação será implementada no cliente. Não são necessárias alterações de API, base de dados ou ao payload da atividade: este já contém `activity.cardId`.
- O alvo será `Paths.CARDS.replace(':id', activity.cardId)`, o contrato já usado nas notificações e nos restantes itens de atividade. Isto garante que uma mudança posterior de lista/quadro abre o cartão atual, e não uma reconstrução falsa do estado histórico.
- O cartão permanece texto acessível e o novo alvo terá indicação visual e navegação por teclado. Se não existir um `cardId` válido, o registo mantém-se informativo e não clicável.
- O clique não restaura, nem executa, o movimento; apenas abre o cartão referido pelo movimento.

## Dependências

```text
Atividade MOVE_CARD (cardId)
        ↓
Item do histórico do quadro
        ↓
Rota /cards/:id
        ↓
Carregamento do cartão e do respetivo quadro atual
```

## Tarefas

### Tarefa 1: Tornar o movimento do histórico um alvo de navegação explícito

**Descrição:** Ajustar o caso `MOVE_CARD` em `BoardActivitiesModal/Item.jsx` para que o utilizador possa abrir o cartão a partir do registo de movimento, sem afetar os restantes tipos de atividade. Aplicar a mesma experiência no painel lateral automaticamente, porque este componente já é reutilizado por ambos os pontos de entrada.

**Critérios de aceitação:**

- [ ] Um registo de movimento permite abrir o cartão por clique e teclado.
- [ ] A navegação usa a rota canónica `/cards/:id` do cartão da atividade.
- [ ] Um cartão que tenha voltado a ser movido abre na localização atual.
- [ ] O registo sem `cardId` continua legível e não produz uma rota inválida.

**Verificação:**

- [ ] Teste focado confirma o destino do link/ação para uma atividade `MOVE_CARD`.
- [ ] Verificação manual em `http://localhost:3008`: no painel lateral e no modal, clicar num movimento abre o cartão certo; repetir depois de o mover novamente.

**Dependências:** Nenhuma.

**Ficheiros prováveis:**

- `client/src/components/activities/BoardActivitiesModal/Item.jsx`
- `client/src/components/activities/BoardActivitiesModal/Item.module.scss`
- teste novo ou ampliado junto de `client/src/components/activities/BoardActivitiesModal/`

**Dimensão estimada:** Pequena (2–3 ficheiros).

### Ponto de controlo: funcionalidade concluída

- [ ] O teste focado passa.
- [ ] A verificação manual cobre o modal e o painel lateral, incluindo a navegação para outro quadro se aplicável.
- [ ] Não é executado build local: o projeto usa hot reload para validação de desenvolvimento.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Confundir “abrir” com repetir o movimento | Alto | A ação limita-se a navegar para o cartão; não dispara ações de mover. |
| Cartão eliminado ou sem acesso | Médio | Só tornar interativo quando houver `cardId`; manter o comportamento de rota/erro já existente para recursos indisponíveis. |
| Estilo de um link dentro da frase não ser evidente | Médio | Dar ao alvo uma affordance visual de botão/link e foco visível, sem tornar o texto de listas clicável. |

## Fora de âmbito

- Restaurar o cartão à lista que tinha no momento do histórico.
- Alterar ou criar atividades no servidor.
- Tornar todos os outros tipos de atividade clicáveis nesta alteração.
