# 🚀 Plano de Implementação: Ações Inline com `react-mentions` (`#label` e `@user`)

## 1. Visão Geral

**Objetivo:** Implementar um sistema de autocompletar para etiquetas e utilizadores diretamente no campo de título do cartão, tanto na criação como na edição. Ao digitar `@` ou `#`, o utilizador poderá selecionar um membro ou etiqueta para adicionar ao cartão, e o texto da menção será removido do título, mantendo-o limpo.

**Tecnologia-chave:** Utilizar a biblioteca `react-mentions`, que já está em uso na secção de comentários, para garantir consistência visual e funcional.

**Funcionalidades:**
- **Autocompletar de Utilizadores:** Ao digitar `@` no título, um dropdown com os membros do quadro deve aparecer.
- **Autocompletar de Etiquetas:** Ao digitar `#`, um dropdown com as etiquetas do quadro deve ser apresentado.
- **Adição Múltipla:** Permitir a adição de vários utilizadores e várias etiquetas no mesmo fluxo de criação/edição.
- **Limpeza Automática:** Após selecionar um utilizador ou etiqueta, o texto da menção (ex: `@andre` ou `#bug`) deve ser removido automaticamente do campo de título.
- **Consistência de UI:** O design deve ser minimalista e integrado, e o dropdown de sugestões deve ser idêntico ao da secção de comentários.
- **Âmbito:** A funcionalidade será implementada no campo de título do modal de edição do cartão (`NameField.jsx`) e no campo de criação rápida de cartão na lista (`AddCard.jsx`).

## 2. Estratégia Central com `react-mentions`

O núcleo da implementação será um componente configurado `MentionsInput` que será reutilizado.

- **Fontes de Dados:**
  - **Utilizadores:** A lista de membros do quadro será obtida do estado do Redux (`selectors.selectMembershipsForCurrentBoard`). Apenas os utilizadores disponíveis serão mostrados.
  - **Etiquetas:** A lista de etiquetas virá do Redux (`selectors.selectLabelsForCurrentBoard`).

- **Gatilhos (`Mention`):**
  - `<Mention trigger="@" ... />` para utilizadores.
  - `<Mention trigger="#" ... />` para etiquetas.

- **Lógica de Adição (`onAdd`):** Este é o passo mais crítico. O callback `onAdd` será usado para:
  1. Identificar se o item adicionado é um utilizador ou uma etiqueta.
  2. Adicionar o ID do item a uma lista temporária no estado local do componente (ex: `usersToAdd`, `labelsToAdd`).
  3. **Não despachar a ação Redux imediatamente na criação do cartão.** As ações serão despachadas apenas no momento de salvar/criar o cartão.
  4. **Importante:** A remoção do texto da menção será gerida de forma controlada através do estado do input, e não pelo `onAdd` diretamente.

- **Controlo do Input:** Vamos controlar o valor do `MentionsInput` através do estado do React. Quando um item é selecionado, vamos atualizar o estado do texto para remover a substring da menção que acabou de ser adicionada.

## 3. Plano de Implementação Detalhado

### Passo 1: Preparação e Limpeza
- **Ação:** Assegurar que qualquer código de tentativas anteriores de implementação desta funcionalidade foi completamente removido dos ficheiros `NameField.jsx` e `AddCard.jsx` para evitar conflitos.

### Passo 2: Implementação no Modal de Edição (`NameField.jsx`)

1.  **Estado Local:** Introduzir estados para gerir o nome do cartão e as seleções:
    - `name`: Para o texto do título.
    - `usersToAdd`: Array de IDs de utilizadores selecionados.
    - `labelsToAdd`: Array de IDs de etiquetas selecionadas.

2.  **Substituição do Input:** Trocar o `TextareaAutosize` pelo `MentionsInput` configurado.
    - O `value` do input será ligado ao estado `name`.
    - O `onChange` atualizará o estado `name`.

3.  **Implementar `onAdd`:**
    - Na seleção, adicionar o ID do utilizador/etiqueta ao respetivo array no estado local (`usersToAdd` ou `labelsToAdd`).
    - Despachar imediatamente a ação Redux correspondente (`addUserToCurrentCard` ou `addLabelToCurrentCard`), uma vez que o cartão já existe.
    - Após o dispatch, limpar o texto da menção do estado `name`.

### Passo 3: Implementação na Criação de Cartão (`AddCard.jsx`)

1.  **Estado Local:** Similar ao `NameField`, vamos usar estados locais:
    - `name`: Para o título do novo cartão.
    - `usersToAdd`: Array de IDs de utilizadores a serem atribuídos.
    - `labelsToAdd`: Array de IDs de etiquetas a serem adicionadas.

2.  **Integração do `MentionsInput`:** Substituir o `TextareaAutosize` pelo `MentionsInput`.

3.  **Implementar `onAdd`:**
    - Na seleção de um utilizador ou etiqueta, adicionar o seu ID ao estado local (`usersToAdd` ou `labelsToAdd`).
    - Atualizar o estado `name` para remover o texto da menção.

4.  **Lógica de Submissão (`handleSubmit`):**
    - Na função que cria o cartão, obter o ID do cartão recém-criado.
    - Após a criação bem-sucedida, percorrer os arrays `usersToAdd` e `labelsToAdd` e despachar as ações Redux (`addUserToCard`, `addLabelToCard`) para cada item, associando-os ao novo cartão.

### Passo 4: Estilização e Integração com Semantic UI

Esta é uma fase crítica que requer atenção especial para evitar os problemas de layout encontrados anteriormente.

- **Manter Layout Original:** O `MentionsInput` deve ser estilizado para se parecer e comportar exatamente como o `TextareaAutosize` que substitui. É crucial aplicar as classes CSS existentes para garantir que o layout da coluna não seja desconfigurado.
- **Corrigir Visibilidade do Dropdown:** O problema do dropdown de sugestões aparecer por baixo de outros elementos é quase sempre relacionado com `z-index`.
  - **Ação:** Inspecionar os elementos `div` gerados pela `react-mentions` e aplicar um `z-index` elevado (ex: `z-index: 9999;`) nos ficheiros SCSS correspondentes (`AddCard.module.scss`, etc.). Pode ser necessário também ajustar a `position` (ex: `position: relative;`) no contentor pai.
- **Consistência com Semantic UI:** O estilo do dropdown deve ser idêntico ao que já existe nos comentários. Reutilizar as mesmas classes e variáveis de SASS para garantir consistência visual.

### Passo 5: Adição de Logs para Debugging

- **Ação:** Adicionar `console.log` para monitorizar o fluxo de dados.
- **Pontos de Log:**
  - `NameField.jsx` e `AddCard.jsx`: Logar os dados carregados do Redux. Ex: `console.log('[Mentions] Carregados X utilizadores e Y etiquetas.');`
  - `onAdd` callback: Logar o item selecionado. Ex: `console.log('[Mentions] Item selecionado:', item);`
  - `handleSubmit` em `AddCard.jsx`: Logar os arrays de utilizadores e etiquetas antes de despachar as ações.

### Passo 6: Pontos de Atenção e Erros Comuns a Evitar

As tentativas anteriores revelaram alguns desafios técnicos. É importante estar ciente deles para não repetir os mesmos erros:

- **Incompatibilidade de `ref`:** A biblioteca `react-mentions` pode não ser compatível com hooks como `useNestedRef`.
  - **Solução:** Utilizar `useRef` do React diretamente para referenciar o input.
- **Incompatibilidade com `useForm`:** O `onChange` do `MentionsInput` tem uma assinatura diferente de um input normal, o que pode causar erros no hook `useForm`.
  - **Solução:** Criar uma função intermediária para o `onChange` que extrai o valor do texto e o passa para o `useForm` no formato que ele espera (ex: `{ target: { value: newPlainTextValue } }`).
- **Gestão de `ref` com `useClickAwayListener`:** O erro `current.contains is not a function` pode ocorrer se a `ref` não for gerida corretamente.
  - **Solução:** Garantir que o `useClickAwayListener` recebe uma `ref` corretamente associada a um elemento do DOM.

### Passo 7: Testes e Validação

- **Testes Manuais:**
  - **Cenário 1: Edição de Cartão**
    - Abrir um cartão, editar o título e digitar `@`. Verificar se a lista de membros aparece e está **visível**.
    - Selecionar um membro. Confirmar que é atribuído e que o texto `@user` desaparece.
    - Fazer o mesmo com `#` para etiquetas.
    - Adicionar múltiplos utilizadores e etiquetas na mesma edição.
  - **Cenário 2: Criação de Cartão**
    - No formulário de criação, digitar um nome e `@`. Verificar se a lista aparece e está **visível**.
    - Selecionar um membro e uma etiqueta.
    - Criar o cartão. Verificar se o cartão é criado com o nome correto (sem as menções) e com o utilizador e a etiqueta devidamente associados.
    - Testar a adição de múltiplos itens.
  - **Caso de Borda:** Testar a filtragem das listas (ex: `@an...`) e a seleção via teclado (setas e Enter).

### Passo 8: Verificação Final
- **Ação:** Executar o linter e o processo de build para garantir que não há erros pendentes antes de finalizar a tarefa.
- **Resultado Esperado:** O código deve compilar sem erros e passar em todas as verificações de qualidade de código.
