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

1.  **Estado Local:** Introduzir estados para gerir o nome do cartão e as seleções.
    - `name`: Para o texto do título.
2.  **Substituição do Input:** Trocar o `TextareaAutosize` pelo `MentionsInput` configurado.
    - O `value` do input será ligado ao estado `name`.
    - O `onChange` atualizará o estado `name`, tendo em atenção a incompatibilidade com o hook `useField` (será necessário adaptar o valor).
3.  **Fontes de Dados:** Carregar utilizadores e etiquetas do Redux.
4.  **Implementar `onAdd`:**
    - Na seleção, despachar imediatamente a ação Redux correspondente (`addUserToCurrentCard` ou `addLabelToCurrentCard`), uma vez que o cartão já existe.
    - Após o dispatch, limpar o texto da menção do estado `name`.
5.  **Estilização Inicial:** Aplicar as classes de CSS existentes ao `MentionsInput` para manter a aparência do campo de texto original.

---
### **Pausa para Testes ⏸️: Verificação da Edição de Cartões**
**Objetivo:** Validar a funcionalidade no modal de edição antes de prosseguir.
- **Teste 1:** Abrir um cartão para editar. O layout do modal deve estar intacto.
- **Teste 2:** Digitar `@` no título. A lista de utilizadores deve aparecer e estar **visível** (não por baixo de outros elementos).
- **Teste 3:** Selecionar um utilizador. O utilizador deve ser imediatamente adicionado ao cartão e o texto `@nome` deve desaparecer do título.
- **Teste 4:** Repetir os testes 2 e 3 com `#` para etiquetas.
- **Teste 5:** Verificar se a edição normal do título (sem menções) continua a funcionar como esperado.
---

### Passo 3: Implementação na Criação de Cartão (`AddCard.jsx`)

1.  **Estado Local:** Similar ao `NameField`, vamos usar estados locais:
    - `name`: Para o título do novo cartão.
    - `usersToAdd`: Array de IDs de utilizadores a serem atribuídos.
    - `labelsToAdd`: Array de IDs de etiquetas a serem adicionadas.
2.  **Integração do `MentionsInput`:** Substituir o `TextareaAutosize` pelo `MentionsInput`, aplicando os estilos existentes.
3.  **Implementar `onAdd`:**
    - Na seleção de um utilizador ou etiqueta, adicionar o seu ID ao estado local (`usersToAdd` ou `labelsToAdd`).
    - Atualizar o estado `name` para remover o texto da menção.
4.  **Lógica de Submissão (`handleSubmit`):**
    - Modificar a saga ou a lógica de submissão para, após a criação bem-sucedida do cartão, percorrer os arrays `usersToAdd` e `labelsToAdd` e despachar as ações para associar os itens ao novo cartão.
5.  **Correção de `z-index`:** Aplicar um `z-index` elevado ao dropdown de menções para garantir que ele apareça sempre por cima da lista de cartões.

---
### **Pausa para Testes ⏸️: Verificação da Criação de Cartões**
**Objetivo:** Validar o fluxo de criação de cartões de ponta a ponta.
- **Teste 1:** O layout da coluna e do formulário de criação deve estar intacto.
- **Teste 2:** Digitar um título com `@`. A lista de utilizadores deve aparecer e estar **visível**.
- **Teste 3:** Selecionar um utilizador e uma etiqueta. Os textos das menções devem desaparecer.
- **Teste 4:** Clicar em "Adicionar Cartão".
- **Teste 5:** Verificar se o cartão foi criado com o título correto (sem as menções) e se o utilizador e a etiqueta selecionados foram corretamente associados a ele.
- **Teste 6:** Adicionar um cartão sem menções para garantir que o fluxo normal não foi afetado.
---

### Passo 4: Adição de Logs para Debugging

- **Ação:** Adicionar `console.log` para monitorizar o fluxo de dados em pontos-chave.
- **Nota:** Os logs devem ser mantidos no código até que a funcionalidade seja validada e aprovada pelo utilizador.
- **Pontos de Log:**
  - `NameField.jsx` e `AddCard.jsx`: Logar os dados carregados do Redux.
  - `onAdd` callback: Logar o item selecionado.
  - `handleSubmit` em `AddCard.jsx`: Logar os arrays de utilizadores e etiquetas antes de despachar as ações.

### Passo 5: Pontos de Atenção e Erros Comuns a Evitar

- **Incompatibilidade de `ref`:** Utilizar `useRef` do React em vez de `useNestedRef` se surgirem problemas.
- **Incompatibilidade com `useForm`:** Adaptar o `onChange` do `MentionsInput` para passar os dados no formato que o `useForm` espera.
- **Gestão de `ref` com `useClickAwayListener`:** Garantir que as referências são geridas corretamente para evitar erros.

### Passo 6: Verificação Manual (Utilizador)
- **Ação:** O utilizador irá testar a funcionalidade manualmente para garantir que todos os requisitos foram cumpridos.
- **Resultado Esperado:** A funcionalidade de menções funciona como esperado na criação e edição de cartões.
