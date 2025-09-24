# 🚀 Plano de Implementação: Ações Inline com `react-mentions` (`#label` e `@user`)

## 1. Visão Geral

**Objetivo:** Implementar um sistema de autocompletar para etiquetas e utilizadores diretamente no campo de título do cartão, tanto na criação como na edição. Ao digitar `@` ou `#`, o utilizador poderá selecionar um membro ou etiqueta para adicionar ao cartão, e o texto da menção será removido do título, mantendo-o limpo.

**Tecnologia-chave:** Utilizar a biblioteca `react-mentions`, que já está em uso na secção de comentários, para garantir consistência visual e funcional.

**Funcionalidades:**
- **Autocompletar de Utilizadores:** Ao digitar `@` no título, um dropdown com os membros do quadro deve aparecer.
- **Autocompletar de Etiquetas:** Ao digitar `#`, um dropdown com as etiquetas do quadro deve ser apresentado.
- **Adição Múltipla:** Permitir a adição de vários utilizadores e várias etiquetas no mesmo fluxo de criação/edição.
- **Limpeza Automática:** Após selecionar um utilizador ou etiqueta, o texto da menção (ex: `@andre` ou `#bug`) deve ser removido automaticamente do campo de título.
- **Preview Visual:** Mostrar previews dos utilizadores e etiquetas adicionados na mesma posição e com as mesmas classes CSS que aparecem no cartão final, mantendo total consistência visual.
- **Suporte Completo de Utilizadores:** Funcionar tanto com nome (`user.name`) como com nome de utilizador (`user.username`), usando `user.name || user.username` como display.
- **Consistência de UI:** O design deve ser minimalista e integrado, e o dropdown de sugestões deve ser idêntico ao da secção de comentários.
- **Âmbito:** A funcionalidade será implementada no campo de título do modal de edição do cartão (`NameField.jsx`) e no campo de criação rápida de cartão na lista (`AddCard.jsx`).

## 2. Estratégia Central com `react-mentions`

O núcleo da implementação será um componente configurado `MentionsInput` que será reutilizado, **aproveitando as funcionalidades já existentes** para adicionar utilizadores e etiquetas aos cartões.

- **Fontes de Dados:**
  - **Utilizadores:** A lista de membros do quadro será obtida do estado do Redux (`selectors.selectMembershipsForCurrentBoard`). Apenas os utilizadores disponíveis serão mostrados.
  - **Etiquetas:** A lista de etiquetas virá do Redux (`selectors.selectLabelsForCurrentBoard`).

- **Gatilhos (`Mention`):**
  - `<Mention trigger="@" ... />` para utilizadores.
  - `<Mention trigger="#" ... />` para etiquetas.

- **Lógica de Adição (`onAdd`):** **REUTILIZAR AS FUNCIONALIDADES EXISTENTES:**
  1. **Para Edição de Cartão (`NameField.jsx`):** Usar diretamente `entryActions.addUserToCurrentCard(userId)` e `entryActions.addLabelToCurrentCard(labelId)` - estas ações já existem e funcionam imediatamente.
  2. **Para Criação de Cartão (`AddCard.jsx`):** Manter o sistema atual com `usersToAdd` e `labelsToAdd` no estado local, que são passados para a saga `createCard` que já tem a lógica implementada para adicionar utilizadores e etiquetas após a criação.
  3. **Limpeza do Texto:** Após selecionar um item, remover automaticamente o texto da menção do campo de título.

- **Vantagens desta Abordagem:**
  - **Consistência:** Usa exatamente as mesmas ações e fluxos que já existem no sistema.
  - **Manutenibilidade:** Não duplica lógica, aproveita o que já está testado e funcional.
  - **Simplicidade:** Menos código para manter e menos pontos de falha.

## 3. Plano de Implementação Detalhado

### Passo 1: Preparação e Limpeza
- **Ação:** Assegurar que qualquer código de tentativas anteriores de implementação desta funcionalidade foi completamente removido dos ficheiros `NameField.jsx` e `AddCard.jsx` para evitar conflitos.

### Passo 2: Implementação no Modal de Edição (`NameField.jsx`)

1.  **Estado Local:** Manter o estado existente para o nome do cartão.
    - O `value` e `setValue` já existem e funcionam com o `useField`.
2.  **Substituição do Input:** Trocar o `TextareaAutosize` pelo `MentionsInput` configurado.
    - O `value` do input será ligado ao estado existente.
    - O `onChange` será adaptado para funcionar com o `useField` existente.
3.  **Fontes de Dados:** Carregar utilizadores e etiquetas do Redux (já implementado).
4.  **Estrutura de Dados dos Utilizadores:** **GARANTIR SUPORTE COMPLETO:**
    - **Display:** Usar `user.name || user.username` para mostrar o nome completo ou username como fallback.
    - **Dados do Mention:** Incluir tanto `name` como `username` para permitir busca por ambos.
    - **Renderização:** Mostrar nome principal e username secundário (se diferente) no dropdown.
5.  **Implementar `onAdd` - REUTILIZAR FUNCIONALIDADES EXISTENTES:**
    - **Para Utilizadores:** Usar `entryActions.addUserToCurrentCard(userId)` - ação já existente e funcional.
    - **Para Etiquetas:** Usar `entryActions.addLabelToCurrentCard(labelId)` - ação já existente e funcional.
    - **Limpeza do Texto:** Após o dispatch, remover automaticamente o texto da menção do campo.
5.  **Preview Visual:** **NOVO - Adicionar preview dos utilizadores e etiquetas:**
    - **Estado Local:** Adicionar estados `usersToPreview` e `labelsToPreview` para controlar os previews.
    - **Posicionamento:** Usar as mesmas classes CSS do `StoryContent.module.scss`:
      - Utilizadores: `styles.attachments`, `styles.attachmentsRight`, `styles.attachment`, `styles.attachmentRight`
      - Etiquetas: `styles.labels`, `styles.attachment`, `styles.attachmentLeft`
    - **Componentes:** Usar `UserAvatar` (size="small") e `LabelChip` (size="tiny") como no cartão final.
    - **Sincronização:** Atualizar os previews quando utilizadores/etiquetas são adicionados via menções.
6.  **Estilização:** Aplicar as classes de CSS existentes ao `MentionsInput` para manter a aparência original.
7.  **Tema Glass Effect:** **NOVO - Aplicar o tema glass effect ao dropdown:**
    - **Base:** Usar o sistema de estilos já existente em `mentions-input-style.js` e `styles.module.scss`.
    - **Glass Effect:** Aplicar o tema glass effect do `glass-modal.css`:
      - Background: `rgba(14, 17, 23, 0.75)` com `backdrop-filter: blur(16px)`
      - Border: `1px solid rgba(255, 255, 255, 0.08)`
      - Box-shadow: `0 14px 34px rgba(0, 0, 0, 0.55)`
      - Border-radius: `16px` para consistência
    - **Z-index:** Manter `z-index: 100020` para aparecer por cima de todos os elementos.

---
### **Pausa para Testes ⏸️: Verificação da Edição de Cartões**
**Objetivo:** Validar a funcionalidade no modal de edição antes de prosseguir.
- **Teste 1:** Abrir um cartão para editar. O layout do modal deve estar intacto.
- **Teste 2:** Digitar `@` no título. A lista de utilizadores deve aparecer e estar **visível** (não por baixo de outros elementos).
- **Teste 3:** Selecionar um utilizador. O utilizador deve ser imediatamente adicionado ao cartão e o texto `@nome` deve desaparecer do título.
- **Teste 4:** Repetir os testes 2 e 3 com `#` para etiquetas.
- **Teste 5:** **NOVO - Suporte de Utilizadores:** Testar com utilizadores que têm apenas `name`, apenas `username`, e ambos os campos.
- **Teste 6:** **NOVO - Preview Visual:** Verificar se os previews dos utilizadores e etiquetas aparecem na mesma posição e com o mesmo estilo que no cartão final.
- **Teste 7:** **NOVO - Tema Glass Effect:** Verificar se o dropdown de sugestões tem o tema glass effect aplicado (fundo translúcido com blur, bordas glass, sombras).
- **Teste 8:** Verificar se a edição normal do título (sem menções) continua a funcionar como esperado.
---

### Passo 3: Implementação na Criação de Cartão (`AddCard.jsx`)

1.  **Estado Local:** **MANTER O SISTEMA ATUAL QUE JÁ FUNCIONA:**
    - `usersToAdd` e `labelsToAdd` já existem e funcionam perfeitamente.
    - O sistema atual já passa estes dados para a saga `createCard`.
2.  **Integração do `MentionsInput`:** Substituir o `TextareaAutosize` pelo `MentionsInput`, aplicando os estilos existentes.
3.  **Estrutura de Dados dos Utilizadores:** **GARANTIR SUPORTE COMPLETO:**
    - **Display:** Usar `user.name || user.username` para mostrar o nome completo ou username como fallback.
    - **Dados do Mention:** Incluir tanto `name` como `username` para permitir busca por ambos.
    - **Renderização:** Mostrar nome principal e username secundário (se diferente) no dropdown.
4.  **Implementar `onAdd` - REUTILIZAR LÓGICA EXISTENTE:**
    - **Para Utilizadores:** Adicionar o ID ao array `usersToAdd` existente (já implementado).
    - **Para Etiquetas:** Adicionar o ID ao array `labelsToAdd` existente (já implementado).
    - **Limpeza do Texto:** Remover o texto da menção do campo `name` (já implementado).
4.  **Preview Visual:** **APROVEITAR O SISTEMA JÁ IMPLEMENTADO:**
    - O `AddCard.jsx` já tem um sistema de preview funcional (linhas 405-434).
    - **Manter o sistema atual:** Usar `usersToAdd` e `labelsToAdd` para mostrar os previews.
    - **Classes CSS:** Já estão implementadas corretamente usando `StoryContent.module.scss`:
      - Utilizadores: `styles.attachments`, `styles.attachmentsRight`, `styles.attachment`, `styles.attachmentRight`
      - Etiquetas: `styles.labels`, `styles.attachment`, `styles.attachmentLeft`
    - **Componentes:** Já usa `UserAvatar` (size="small") e `LabelChip` (size="tiny").
5.  **Tema Glass Effect:** **APLICAR AO DROPDOWN:**
    - **Base:** Usar o sistema de estilos já existente em `mentions-input-style.js`.
    - **Glass Effect:** Aplicar o tema glass effect do `glass-modal.css`:
      - Background: `rgba(14, 17, 23, 0.75)` com `backdrop-filter: blur(16px)`
      - Border: `1px solid rgba(255, 255, 255, 0.08)`
      - Box-shadow: `0 14px 34px rgba(0, 0, 0, 0.55)`
      - Border-radius: `16px` para consistência
    - **Z-index:** Manter `z-index: 100020` para aparecer por cima de todos os elementos.
6.  **Lógica de Submissão:** **NÃO ALTERAR - JÁ FUNCIONA:**
    - A saga `createCard` já tem a lógica implementada para processar `userIds` e `labelIds`.
    - O sistema atual já despacha as ações `addUserToCard` e `addLabelToCard` após a criação.

---
### **Pausa para Testes ⏸️: Verificação da Criação de Cartões**
**Objetivo:** Validar o fluxo de criação de cartões de ponta a ponta.
- **Teste 1:** O layout da coluna e do formulário de criação deve estar intacto.
- **Teste 2:** Digitar um título com `@`. A lista de utilizadores deve aparecer e estar **visível**.
- **Teste 3:** Selecionar um utilizador e uma etiqueta. Os textos das menções devem desaparecer.
- **Teste 4:** **NOVO - Suporte de Utilizadores:** Testar com utilizadores que têm apenas `name`, apenas `username`, e ambos os campos.
- **Teste 5:** **NOVO - Tema Glass Effect:** Verificar se o dropdown de sugestões tem o tema glass effect aplicado (fundo translúcido com blur, bordas glass, sombras).
- **Teste 6:** Clicar em "Adicionar Cartão".
- **Teste 7:** Verificar se o cartão foi criado com o título correto (sem as menções) e se o utilizador e a etiqueta selecionados foram corretamente associados a ele.
- **Teste 8:** Adicionar um cartão sem menções para garantir que o fluxo normal não foi afetado.
---

### Passo 4: Adição de Logs para Debugging

- **Ação:** Adicionar `console.log` para monitorizar o fluxo de dados em pontos-chave.
- **Nota:** Os logs devem ser mantidos no código até que a funcionalidade seja validada e aprovada pelo utilizador.
- **Pontos de Log:**
  - `NameField.jsx` e `AddCard.jsx`: Logar os dados carregados do Redux.
  - `onAdd` callback: Logar o item selecionado e a ação a ser despachada.
  - **Vantagem:** Como estamos a reutilizar as ações existentes, os logs já existentes nas sagas e entry-actions ajudarão no debugging.

### Passo 5: Pontos de Atenção e Erros Comuns a Evitar

- **Incompatibilidade de `ref`:** Utilizar `useRef` do React em vez de `useNestedRef` se surgirem problemas.
- **Incompatibilidade com `useForm`:** Adaptar o `onChange` do `MentionsInput` para passar os dados no formato que o `useForm` espera.
- **Gestão de `ref` com `useClickAwayListener`:** Garantir que as referências são geridas corretamente para evitar erros.
- **Vantagem da Reutilização:** Como estamos a usar as ações existentes, muitos dos problemas de integração já foram resolvidos e testados.

### Passo 6: Verificação Manual (Utilizador)
- **Ação:** O utilizador irá testar a funcionalidade manualmente para garantir que todos os requisitos foram cumpridos.
- **Resultado Esperado:** A funcionalidade de menções funciona como esperado na criação e edição de cartões.
