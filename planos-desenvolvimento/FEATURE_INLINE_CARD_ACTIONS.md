# 🚀 Plano de Implementação: Ações Inline com `react-mentions` (`#label` e `@user`)

## 1. Visão Geral

**Objetivo:** Implementar um sistema de autocompletar para etiquetas e utilizadores diretamente no campo de título do cartão **APENAS durante a criação** (não na edição). Ao digitar `@` ou `#`, o utilizador poderá selecionar um membro ou etiqueta para adicionar ao cartão, e o texto da menção será removido do título, mantendo-o limpo.

**Tecnologia-chave:** Utilizar a biblioteca `react-mentions`, que já está em uso na secção de comentários, para garantir consistência visual e funcional.

**Funcionalidades:**
- **Autocompletar de Utilizadores:** Ao digitar `@` no título, um dropdown com os membros do quadro deve aparecer.
- **Autocompletar de Etiquetas:** Ao digitar `#`, um dropdown com as etiquetas do quadro deve ser apresentado.
- **Adição Múltipla:** Permitir a adição de vários utilizadores e várias etiquetas no mesmo fluxo de criação.
- **Limpeza Automática:** Após selecionar um utilizador ou etiqueta, o texto da menção (ex: `@andre` ou `#bug`) deve ser removido automaticamente do campo de título.
- **Preview Visual:** Mostrar previews dos utilizadores e etiquetas adicionados na mesma posição e com as mesmas classes CSS que aparecem no cartão final, mantendo total consistência visual.
- **Suporte Completo de Utilizadores:** Funcionar tanto com nome (`user.name`) como com nome de utilizador (`user.username`), usando `user.name || user.username` como display.
- **Consistência de UI:** O design deve ser minimalista e integrado, e o dropdown de sugestões deve ser idêntico ao da secção de comentários.
- **Âmbito:** A funcionalidade será implementada **APENAS** no campo de criação rápida de cartão na lista (`AddCard.jsx`). **NÃO será implementada** no modal de edição do cartão (`NameField.jsx`).

## ⚠️ **STATUS ATUAL - ANÁLISE REAL**

**IMPORTANTE:** Após análise detalhada do código, verificou-se que **a funcionalidade NÃO está implementada** nos componentes mencionados. O documento anterior continha afirmações incorretas sobre o estado da implementação.

### ✅ **O que REALMENTE está implementado:**
- Sistema de `react-mentions` funcional nos comentários (`components/comments/Comments/Add.jsx`)
- Ações `addUserToCurrentCard(id)` e `addLabelToCurrentCard(id)` existem e funcionam
- Sagas para adicionar utilizadores/etiquetas a cartões existentes

### ❌ **O que NÃO está implementado (contrário ao que estava documentado):**
- `AddCard.jsx` **não tem** sistema de preview de utilizadores/etiquetas
- **Não existe** `usersToAdd` e `labelsToAdd` no estado local do `AddCard.jsx`
- Saga `createCard` **não tem** lógica para processar utilizadores/etiquetas durante a criação
- **Não existe** sistema de preview visual no campo de criação de cartões
- **Nota:** `NameField.jsx` (edição) **NÃO será modificado** - funcionalidade apenas para criação

### ⚠️ **CONFLITOS IDENTIFICADOS COM A IMPLEMENTAÇÃO DO PLANKA:**

**1. Ordem de Prioridade dos Utilizadores:**
- **Planka usa:** `user.username || user.name` (username primeiro)
- **Documentação original:** `user.name || user.username` (name primeiro)
- **✅ CORREÇÃO:** Usar `user.username || user.name` para consistência

**2. Props do MentionsInput:**
- **Planka usa:** `appendSpaceOnAdd={true}` (com espaço)
- **Documentação original:** `appendSpaceOnAdd={false}` (sem espaço)
- **✅ CORREÇÃO:** Usar `appendSpaceOnAdd` conforme necessário

**3. Estrutura de Callback:**
- **Planka usa:** `(_, text)` - ignora primeiro parâmetro
- **Documentação original:** `(event, newValue, newPlainTextValue, mentions)` - todos os parâmetros
- **✅ CORREÇÃO:** Usar estrutura do Planka para consistência

**4. Refs e Gestão de Estado:**
- **Planka usa:** `useRef` + `useNestedRef` + `useCallback`
- **Documentação original:** Apenas `useRef`
- **✅ CORREÇÃO:** Seguir padrão do Planka para compatibilidade

## 2. Estratégia Central com `react-mentions`

O núcleo da implementação será um componente configurado `MentionsInput` que será reutilizado, **aproveitando as funcionalidades já existentes** para adicionar utilizadores e etiquetas aos cartões.

### 📚 **Configuração Técnica do `react-mentions`**

**Importação necessária:**
```javascript
import { MentionsInput, Mention } from 'react-mentions';
```

**Estrutura básica do componente (baseada na implementação real do Planka):**
```javascript
<MentionsInput
  allowSpaceInQuery
  allowSuggestionsAboveCursor
  ref={mentionsRef}
  inputRef={inputRef}
  value={value}
  placeholder={placeholder}
  maxLength={1024}
  className="mentions-input"
  style={{
    control: {
      minHeight: '37px', // ou altura dinâmica
    },
  }}
  onFocus={handleFocus}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
>
  <Mention
    appendSpaceOnAdd
    data={usersData}
    displayTransform={(_, display) => `@${display}`}
    renderSuggestion={suggestionRenderer}
    className={styles.mention}
  />
  <Mention
    appendSpaceOnAdd
    data={labelsData}
    displayTransform={(_, display) => `#${display}`}
    renderSuggestion={renderLabelSuggestion}
    className={styles.mention}
  />
</MentionsInput>
```

**Props importantes do `MentionsInput`:**
- `value`: String com o valor atual do campo
- `onChange`: Função callback `(event, newValue, newPlainTextValue, mentions)`
- `className`: Classe CSS para estilização
- `style`: Estilos inline para o componente
- `allowSpaceInQuery`: `true` para permitir espaços na busca
- `allowSuggestionsAboveCursor`: `true` para mostrar sugestões acima se necessário

**Props importantes do `Mention`:**
- `trigger`: String ou regex para ativar (`"@"` ou `"#"`)
- `data`: Array de objetos com `{id, display}` ou função de busca
- `renderSuggestion`: Função para renderizar cada sugestão
- `onAdd`: Callback quando uma sugestão é selecionada
- `appendSpaceOnAdd`: `false` para não adicionar espaço automaticamente
- `displayTransform`: Função para transformar o display final

### 🔧 **Estrutura de Dados e Fontes**

- **Fontes de Dados:**
  - **Utilizadores:** A lista de membros do quadro será obtida do estado do Redux (`selectors.selectMembershipsForCurrentBoard`). Apenas os utilizadores disponíveis serão mostrados.
  - **Etiquetas:** A lista de etiquetas virá do Redux (`selectors.selectLabelsForCurrentBoard`).

- **Gatilhos (`Mention`):**
  - `<Mention trigger="@" ... />` para utilizadores.
  - `<Mention trigger="#" ... />` para etiquetas.

- **Lógica de Adição (`onAdd`):** **IMPLEMENTAR APENAS PARA CRIAÇÃO:**
  1. **Para Criação de Cartão (`AddCard.jsx`):** **IMPLEMENTAR NOVO SISTEMA** com `usersToAdd` e `labelsToAdd` no estado local, que serão processados após a criação do cartão.
  2. **Limpeza do Texto:** Após selecionar um item, remover automaticamente o texto da menção do campo de título.
  3. **Nota:** Edição de cartões (`NameField.jsx`) **NÃO será modificada** - funcionalidade apenas para criação.

- **Vantagens desta Abordagem:**
  - **Consistência:** Usa exatamente as mesmas ações e fluxos que já existem no sistema.
  - **Manutenibilidade:** Não duplica lógica, aproveita o que já está testado e funcional.
  - **Simplicidade:** Menos código para manter e menos pontos de falha.

### 🎨 **Estilização e Temas**

**Baseado no sistema existente dos comentários:**
- Usar as mesmas classes CSS do sistema de comentários (`components/comments/Comments/Add.jsx`)
- Aplicar tema glass effect consistente com o resto da aplicação
- Manter z-index adequado para aparecer por cima de outros elementos

**Estrutura de dados para utilizadores (baseada na implementação real do Planka):**
```javascript
const usersData = boardMemberships.map(({ user }) => ({
  id: user.id,
  display: user.username || user.name, // ⚠️ ORDEM INVERTIDA: username primeiro, como no Planka
}));
```

**Estrutura de dados para etiquetas:**
```javascript
const labelsData = labels.map(label => ({
  id: label.id,
  display: label.name,
  color: label.color
}));
```

**Funções de renderização (baseadas na implementação real do Planka):**
```javascript
// ⚠️ IMPORTANTE: Usar exatamente a mesma estrutura do sistema de comentários
const suggestionRenderer = useCallback(
  (entry, _, highlightedDisplay) => (
    <div className={styles.suggestion}>
      <UserAvatar id={entry.id} size="tiny" />
      {highlightedDisplay}
    </div>
  ),
  []
);

// Para etiquetas (nova implementação):
const renderLabelSuggestion = useCallback(
  (entry, search, highlightedDisplay) => (
    <div className={styles.suggestion}>
      <LabelChip id={entry.id} size="tiny" />
      {highlightedDisplay}
    </div>
  ),
  []
);
```

**Callbacks de adição:**
```javascript
const handleUserAdd = (id, display, startPos, endPos) => {
  // Para NameField: dispatch(entryActions.addUserToCurrentCard(id));
  // Para AddCard: adicionar ao usersToAdd array
  // Limpar texto da menção do campo
};

const handleLabelAdd = (id, display, startPos, endPos) => {
  // Para NameField: dispatch(entryActions.addLabelToCurrentCard(id));
  // Para AddCard: adicionar ao labelsToAdd array
  // Limpar texto da menção do campo
};
```

## 3. Plano de Implementação Detalhado

### Passo 1: Preparação e Limpeza
- **Ação:** Verificar que o ficheiro `AddCard.jsx` está limpo e pronto para implementação.
- **Nota:** `NameField.jsx` (edição) **NÃO será modificado** - funcionalidade apenas para criação.

### Passo 2: Implementação na Criação de Cartão (`AddCard.jsx`)

1.  **Estado Local:** **IMPLEMENTAR NOVO SISTEMA:**
    - **Criar** `usersToAdd` e `labelsToAdd` no estado local.
    - **Implementar** sistema para passar estes dados para a saga `createCard`.
2.  **Integração do `MentionsInput`:** **IMPLEMENTAR** - Substituir o `TextareaAutosize` pelo `MentionsInput`, aplicando os estilos existentes.
3.  **Estrutura de Dados dos Utilizadores:** **IMPLEMENTAR - GARANTIR SUPORTE COMPLETO:**
    - **Display:** Usar `user.name || user.username` para mostrar o nome completo ou username como fallback.
    - **Dados do Mention:** Incluir tanto `name` como `username` para permitir busca por ambos.
    - **Renderização:** Mostrar nome principal e username secundário (se diferente) no dropdown.
4.  **Implementar `onAdd` - IMPLEMENTAR NOVA LÓGICA:**
    - **Para Utilizadores:** Adicionar o ID ao array `usersToAdd` (implementar).
    - **Para Etiquetas:** Adicionar o ID ao array `labelsToAdd` (implementar).
    - **Limpeza do Texto:** Remover o texto da menção do campo `name` (implementar).
5.  **Preview Visual:** **IMPLEMENTAR SISTEMA DE PREVIEW:**
    - **Criar** sistema de preview funcional para mostrar utilizadores e etiquetas selecionados.
    - **Implementar** preview usando `usersToAdd` e `labelsToAdd`.
    - **Classes CSS:** Usar `StoryContent.module.scss`:
      - Utilizadores: `styles.attachments`, `styles.attachmentsRight`, `styles.attachment`, `styles.attachmentRight`
      - Etiquetas: `styles.labels`, `styles.attachment`, `styles.attachmentLeft`
    - **Componentes:** Usar `UserAvatar` (size="small") e `LabelChip` (size="tiny").
6.  **Tema Glass Effect:** **IMPLEMENTAR - APLICAR AO DROPDOWN:**
    - **Base:** Usar o sistema de estilos já existente em `mentions-input-style.js`.
    - **Glass Effect:** Aplicar o tema glass effect do `glass-modal.css`:
      - Background: `rgba(14, 17, 23, 0.75)` com `backdrop-filter: blur(16px)`
      - Border: `1px solid rgba(255, 255, 255, 0.08)`
      - Box-shadow: `0 14px 34px rgba(0, 0, 0, 0.55)`
      - Border-radius: `16px` para consistência
    - **Z-index:** Manter `z-index: 100020` para aparecer por cima de todos os elementos.
7.  **Lógica de Submissão:** **IMPLEMENTAR NOVA LÓGICA:**
    - **Modificar** a saga `createCard` para processar `userIds` e `labelIds`.
    - **Implementar** sistema para despachar as ações `addUserToCard` e `addLabelToCard` após a criação.
    - **⚠️ IMPORTANTE:** Usar as **mesmas ações Redux** que o sistema de edição usa, garantindo total compatibilidade.

8.  **Compatibilidade com Sistema Existente:**
    - **Garantir** que as ações `addUserToCurrentCard` e `addLabelToCurrentCard` continuem funcionando normalmente.
    - **Manter** os popups de seleção de utilizadores/etiquetas no modal de edição funcionais.
    - **Sincronizar** o estado entre criação (menções) e edição (popups) para consistência total.

---
### **Pausa para Testes ⏸️: Verificação da Criação de Cartões**
**Objetivo:** Validar o fluxo de criação de cartões de ponta a ponta.
- **Teste 1:** O layout da coluna e do formulário de criação deve estar intacto.
- **Teste 2:** Digitar um título com `@`. A lista de utilizadores deve aparecer e estar **visível**.
- **Teste 3:** Selecionar um utilizador e uma etiqueta. Os textos das menções devem desaparecer.
- **Teste 4:** **Suporte de Utilizadores:** Testar com utilizadores que têm apenas `name`, apenas `username`, e ambos os campos.
- **Teste 5:** **Tema Glass Effect:** Verificar se o dropdown de sugestões tem o tema glass effect aplicado (fundo translúcido com blur, bordas glass, sombras).
- **Teste 6:** Clicar em "Adicionar Cartão".
- **Teste 7:** Verificar se o cartão foi criado com o título correto (sem as menções) e se o utilizador e a etiqueta selecionados foram corretamente associados a ele.
- **Teste 8:** Adicionar um cartão sem menções para garantir que o fluxo normal não foi afetado.
- **Teste 9:** **Verificar que a edição de cartões NÃO foi afetada** - abrir um cartão existente e verificar que o campo de título funciona normalmente (sem menções).
- **Teste 10:** **Verificar funcionalidades existentes de edição:**
  - Clicar no botão "Membros" no modal de edição - deve funcionar normalmente
  - Clicar no botão "Etiquetas" no modal de edição - deve funcionar normalmente
  - Adicionar/remover utilizadores via edição - deve funcionar normalmente
  - Adicionar/remover etiquetas via edição - deve funcionar normalmente
- **Teste 11:** **Verificar sintonia entre criação e edição:**
  - Criar um cartão com menções `@user` e `#label`
  - Abrir o cartão criado e verificar que os utilizadores/etiquetas aparecem nos botões de edição
  - Adicionar mais utilizadores/etiquetas via edição
  - Verificar que tudo aparece consistentemente no cartão
---

### Passo 4: Adição de Logs para Debugging

- **Ação:** Adicionar `console.log` para monitorizar o fluxo de dados em pontos-chave.
- **Nota:** Os logs devem ser mantidos no código até que a funcionalidade seja validada e aprovada pelo utilizador.
- **Pontos de Log:**
  - `AddCard.jsx`: Logar os dados carregados do Redux.
  - `onAdd` callback: Logar o item selecionado e a ação a ser despachada.
  - **Vantagem:** Como estamos a reutilizar as ações existentes, os logs já existentes nas sagas e entry-actions ajudarão no debugging.
  - **Nota:** `NameField.jsx` **NÃO será modificado** - sem logs necessários.

### Passo 5: Pontos de Atenção e Erros Comuns a Evitar

#### ⚠️ **Problemas Específicos do `react-mentions`:**

- **Incompatibilidade de `ref`:** Utilizar `useRef` do React em vez de `useNestedRef` se surgirem problemas.
- **Incompatibilidade com `useForm`:** Adaptar o `onChange` do `MentionsInput` para passar os dados no formato que o `useForm` espera.
- **Gestão de `ref` com `useClickAwayListener`:** Garantir que as referências são geridas corretamente para evitar erros.
- **Integração com sistema existente:** Garantir que a nova funcionalidade não quebra o sistema atual de criação/edição de cartões.

#### 🔧 **Problemas Técnicos Específicos do `react-mentions`:**

- **`onChange` callback:** O `MentionsInput` passa 4 parâmetros: `(event, newValue, newPlainTextValue, mentions)`. Usar `newPlainTextValue` para o valor limpo.
- **Limpeza de texto:** Após `onAdd`, remover manualmente o texto da menção do campo usando `newPlainTextValue`.
- **Estilização:** O `react-mentions` gera classes CSS automaticamente. Usar `className` prop para aplicar estilos customizados.
- **Z-index:** As sugestões podem ficar por baixo de outros elementos. Verificar z-index do dropdown.
- **Performance:** Para muitos utilizadores/etiquetas, considerar implementar busca assíncrona com função `data`.
- **Acessibilidade:** Usar `a11ySuggestionsListLabel` para melhor suporte a screen readers.

#### ⚠️ **COMPATIBILIDADE COM SISTEMA EXISTENTE:**

- **Não modificar ações Redux existentes:** As ações `addUserToCurrentCard`, `addLabelToCurrentCard`, etc. devem continuar funcionando exatamente como antes.
- **Manter consistência de dados:** Os utilizadores/etiquetas adicionados via menções devem usar as mesmas estruturas de dados que o sistema de edição.
- **Não quebrar popups existentes:** Os popups de seleção de utilizadores/etiquetas no modal de edição devem continuar funcionando normalmente.
- **Sincronização de estado:** Garantir que as mudanças feitas via criação (menções) e edição (popups) sejam refletidas consistentemente no Redux e na UI.

#### 📝 **Exemplo de Integração com `useForm` (baseado na implementação real do Planka):**

```javascript
// ⚠️ IMPORTANTE: Usar exatamente a mesma estrutura do sistema de comentários
const handleFieldChange = useCallback(
  (_, text) => {
    setData({
      text, // Usar diretamente o valor do react-mentions
    });
  },
  [setData]
);

// Para integração com useForm existente:
const handleMentionsChange = (event, newValue, newPlainTextValue, mentions) => {
  // Usar newPlainTextValue para o valor limpo (sem markup)
  handleFieldChange({
    target: {
      name: 'name',
      value: newPlainTextValue
    }
  });
  
  // Processar mentions se necessário
  mentions.forEach(mention => {
    if (mention.trigger === '@') {
      // Adicionar utilizador
    } else if (mention.trigger === '#') {
      // Adicionar etiqueta
    }
  });
};
```

### Passo 6: Verificação Manual (Utilizador)
- **Ação:** O utilizador irá testar a funcionalidade manualmente para garantir que todos os requisitos foram cumpridos.
- **Resultado Esperado:** A funcionalidade de menções funciona como esperado na criação e edição de cartões.

## 📋 **RESUMO DO QUE PRECISA SER IMPLEMENTADO**

### ✅ **Já existe (não precisa implementar):**
- Sistema de `react-mentions` nos comentários (referência)
- Ações `addUserToCurrentCard` e `addLabelToCurrentCard`
- Sagas para adicionar utilizadores/etiquetas a cartões existentes

### 🔨 **Precisa ser implementado (APENAS para criação):**
1. **AddCard.jsx:**
   - Implementar `usersToAdd` e `labelsToAdd` no estado
   - Substituir `TextareaAutosize` por `MentionsInput`
   - Implementar sistema de preview
   - Modificar lógica de submissão
   - Aplicar tema glass effect

2. **Saga createCard:**
   - Adicionar lógica para processar `userIds` e `labelIds`
   - Implementar despacho de ações após criação

### ❌ **NÃO será implementado:**
- **NameField.jsx (edição):** Manterá o sistema atual sem modificações
- **Modal de edição:** Não terá funcionalidade de menções

### ✅ **FUNCIONALIDADES EXISTENTES QUE DEVEM CONTINUAR A FUNCIONAR:**

**1. Adicionar Utilizadores a Cartões Existentes:**
- ✅ **Botão "Membros" no modal de edição** - deve continuar a funcionar normalmente
- ✅ **Ações `addUserToCurrentCard` e `removeUserFromCurrentCard`** - devem continuar funcionais
- ✅ **Sistema de popup de seleção de utilizadores** - deve manter toda a funcionalidade

**2. Adicionar Etiquetas a Cartões Existentes:**
- ✅ **Botão "Etiquetas" no modal de edição** - deve continuar a funcionar normalmente
- ✅ **Ações `addLabelToCurrentCard` e `removeLabelFromCurrentCard`** - devem continuar funcionais
- ✅ **Sistema de popup de seleção de etiquetas** - deve manter toda a funcionalidade

**3. Compatibilidade e Sintonia:**
- ✅ **Cartões criados com menções** devem ter os mesmos utilizadores/etiquetas que aparecem nos botões de edição
- ✅ **Utilizadores/etiquetas adicionados via edição** devem aparecer normalmente nos cartões
- ✅ **Sistema de preview** deve ser consistente entre criação e edição
- ✅ **Ações Redux** devem funcionar identicamente para ambos os fluxos
