# Quadro bloqueado por referência de botão incompatível

## Sintoma

Ao entrar num quadro, a aplicação mostrava `Ocorreu um erro inesperado. Recarregue a página para continuar.`

## Causa

`Button` passou a encaminhar uma referência direta para o elemento DOM. `useNestedRef`, usado em `AddCard`, assumia sempre a referência antiga do Semantic UI (`element.ref.current`) e tentava ler `current` de uma referência inexistente. O erro era lançado ao montar o quadro.

## Correção

`useNestedRef` agora aceita ambos os formatos: usa a referência aninhada quando ela existe e, caso contrário, usa o elemento direto. Foi adicionado um teste de regressão para os dois casos.

## Evidência

- A navegação da página inicial para um quadro foi repetida no ambiente de desenvolvimento; o quadro carregou sem o erro e sem novos erros na consola.
- `npm test -- --runInBand src/hooks/use-nested-ref.test.js` passou com 2 testes.
- A suite completa teve 18 suites aprovadas e 1 falha preexistente de configuração: `BoardActivitiesPanel.test.js` usa JSX, mas o Jest não carrega `@babel/preset-react`.
