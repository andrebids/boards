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

**5. 🚨 DESCOBERTA CRÍTICA - ClassName do MentionsInput:**
- **Comentários (funcionam):** `className="mentions-input"` (classe global)
- **AddCard (não funcionava):** `className={styles.field}` (CSS modules apenas)
- **✅ SOLUÇÃO ENCONTRADA:** AddCard deve usar AMBAS as classes:
  ```jsx
  className={classNames(
    "mentions-input", // ← OBRIGATÓRIO para CSS global funcionar
    styles.field,     // ← CSS modules local
    isProcessing && styles.fieldProcessing
  )}
  ```
- **⚠️ PROBLEMA:** O CSS global `.mentions-input__suggestions` só se aplica quando a classe base `mentions-input` está presente
- **🔧 SOLUÇÃO FINAL:** Usar `data-attributes` + JavaScript para isolamento perfeito entre AddCard e Comentários

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
    trigger="@"
    appendSpaceOnAdd
    data={usersData}
    displayTransform={(_, display) => `@${display}`}
    renderSuggestion={suggestionRenderer}
    onAdd={handleUserAdd}
    className={styles.mention}
  />
  <Mention
    trigger="#"
    appendSpaceOnAdd
    data={labelsData}
    displayTransform={(_, display) => `#${display}`}
    renderSuggestion={renderLabelSuggestion}
    onAdd={handleLabelAdd}
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

### 🎨 **DESCOBERTA FINAL: Solução Completa para Glass Effect Isolado**

**⚠️ PROBLEMA IDENTIFICADO:** Conseguir aplicar glass effect apenas no AddCard sem afetar comentários era extremamente complexo devido à estrutura do react-mentions.

**✅ SOLUÇÃO IMPLEMENTADA COM SUCESSO:**

#### **🔍 Passos da Solução Final (TESTADA E FUNCIONANDO):**

**Passo 1: Corrigir className no AddCard.jsx**
```jsx
// ANTES (não funcionava):
className={classNames(styles.field, isProcessing && styles.fieldProcessing)}

// DEPOIS (funciona):
className={classNames(
  "mentions-input", // ← CRÍTICO: classe global obrigatória
  styles.field,     // ← CSS modules local
  isProcessing && styles.fieldProcessing
)}
```

**Passo 2: Adicionar identificador único ao AddCard**
```jsx
<div {...clickAwayProps} ref={nameFieldRef} 
     className={styles.mentionsWrapper} 
     data-mentions-context="add-card">  // ← Identificador único
```

**Passo 3: JavaScript para isolamento automático**
```jsx
useEffect(() => {
  const observer = new MutationObserver(() => {
    const dropdowns = document.querySelectorAll('.mentions-input__suggestions');
    dropdowns.forEach(dropdown => {
      const isInAddCard = dropdown.closest('[data-mentions-context="add-card"]');
      if (isInAddCard) {
        dropdown.setAttribute('data-add-card-dropdown', 'true');
        // Marca também os itens
        const items = dropdown.querySelectorAll('.mentions-input__suggestions__item');
        items.forEach(item => item.classList.add('suggestions-item-add-card'));
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}, []);
```

**Passo 4: CSS isolado com exclusões**
```scss
// CSS para comentários (exclui AddCard):
.mentions-input {
  &__suggestions:not([data-add-card-dropdown="true"]) {
    // Estilo original dos comentários
  }
  &__item:not(.suggestions-item-add-card) {
    // Estilo original dos comentários
  }
}

// CSS exclusivo para AddCard:
[data-mentions-context="add-card"] .mentions-input__suggestions,
.mentions-input__suggestions[data-add-card-dropdown="true"] {
  // Glass effect especial para AddCard
  background: rgba(14, 17, 23, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  // ... estilos únicos
}
```

#### **🎯 Resultado Final:**
- ✅ **AddCard:** Glass theme específico e diferenciado
- ✅ **Comentários:** Tema original preservado sem alterações
- ✅ **Isolamento Total:** Zero interferência entre contextos
- ✅ **Auto-aplicação:** Funciona automaticamente via JavaScript Observer

#### **🔍 Análise da Implementação Original (ATUALIZADA):**

**1. Diferença entre Comentários vs Criação de Cartão:**
- **Comentários:** Usam `className="mentions-input"` (classe global)
- **AddCard:** DEVE usar `className="mentions-input"` + classes locais (DESCOBERTA CRÍTICA)

**2. Estrutura Correta do MentionsInput:**
```jsx
// AddCard.jsx - IMPLEMENTAÇÃO CORRETA
<MentionsInput
  allowSpaceInQuery
  allowSuggestionsAboveCursor
  ref={nameMentionsRef}
  inputRef={nameInputRef}
  value={data.name}
  placeholder={t('common.enterCardTitle')}
  maxLength={1024}
  className="mentions-input"  // ← CHAVE: Classe global (não CSS modules)
  style={{
    control: {
      minHeight: '32px',  // ← Apenas estilos básicos necessários
    },
  }}
>
  <Mention
    trigger="@"
    appendSpaceOnAdd
    data={usersData}
    displayTransform={(_, display) => `@${display}`}
    renderSuggestion={suggestionRenderer}
    onAdd={handleUserAdd}
    // ← SEM className aqui (diferente dos comentários)
  />
  <Mention
    trigger="#"
    appendSpaceOnAdd
    data={labelsData}
    displayTransform={(_, display) => `#${display}`}
    renderSuggestion={renderLabelSuggestion}
    onAdd={handleLabelAdd}
    // ← SEM className aqui
  />
</MentionsInput>
```

#### **3. CSS Global para Glass Effect (styles.module.scss):**

**Estratégia de Seletores com Máxima Especificidade:**
```scss
// Seletores múltiplos para garantir aplicação
[class*="mentions-input__suggestions"],
.mentions-input__suggestions,
div[class*="mentions-input__suggestions"],
html .mentions-input__suggestions,
body .mentions-input__suggestions,
#app .mentions-input__suggestions {
  // Glass Effect Moderno
  background: rgba(14, 17, 23, 0.95) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  -moz-backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 16px !important;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.7) !important,
    0 8px 16px rgba(0, 0, 0, 0.5) !important,
    inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  z-index: 100020 !important;
  padding: 12px !important;
  margin-top: 8px !important;
  max-height: 250px !important;
  overflow-y: auto !important;
  color: rgba(230, 237, 243, 0.9) !important;
}

// Itens do dropdown
[class*="mentions-input__suggestions__item"],
.mentions-input__suggestions__item,
div[class*="mentions-input__suggestions__item"],
html .mentions-input__suggestions__item,
body .mentions-input__suggestions__item,
#app .mentions-input__suggestions__item {
  background: transparent !important;
  color: rgba(230, 237, 243, 0.85) !important;
  padding: 12px 16px !important;
  border-radius: 10px !important;
  margin: 2px 0 !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
  
  &:hover {
    background: rgba(59, 130, 246, 0.12) !important;
    color: #ffffff !important;
  }
}

// Estado focused
[class*="mentions-input__suggestions__item--focused"],
.mentions-input__suggestions__item--focused,
div[class*="mentions-input__suggestions__item--focused"],
html .mentions-input__suggestions__item--focused,
body .mentions-input__suggestions__item--focused,
#app .mentions-input__suggestions__item--focused {
  background: rgba(59, 130, 246, 0.25) !important;
  color: #ffffff !important;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.3) !important,
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}
```

#### **4. JavaScript Backup (Opcional - AddCard.jsx):**

**Para garantir aplicação em casos extremos:**
```jsx
// Force glass effect via JavaScript (backup)
useEffect(() => {
  const applyGlassEffect = () => {
    const dropdowns = document.querySelectorAll('.mentions-input__suggestions');
    dropdowns.forEach(dropdown => {
      dropdown.style.cssText = `
        background: rgba(14, 17, 23, 0.95) !important;
        backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 16px !important;
        // ... outros estilos
      `;
    });
  };

  const observer = new MutationObserver(() => applyGlassEffect());
  observer.observe(document.body, { childList: true, subtree: true });
  applyGlassEffect();

  return () => observer.disconnect();
}, []);
```

#### **5. Pontos Críticos para Sucesso:**

**✅ O que FUNCIONA:**
- Usar `className="mentions-input"` (classe global)
- CSS com múltiplos seletores e `!important`
- Estrutura idêntica aos comentários (que já funcionam)

**❌ O que NÃO funciona:**
- `className={styles.field}` (CSS modules)
- Estilos inline complexos no `MentionsInput`
- Seletores CSS sem especificidade suficiente

**🎯 Resultado:** Dropdown com glass effect moderno apenas na criação de cartão, sem afetar comentários.

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
    - **Display:** Usar `user.username || user.name` para consistência com o sistema existente (username primeiro).
    - **Dados do Mention:** Incluir tanto `name` como `username` para permitir busca por ambos.
    - **Renderização:** Mostrar username principal e name secundário (se diferente) no dropdown.
4.  **Implementar `onAdd` - IMPLEMENTAR NOVA LÓGICA:**
    - **Para Utilizadores:** Adicionar o ID ao array `usersToAdd` (implementar).
    - **Para Etiquetas:** Adicionar o ID ao array `labelsToAdd` (implementar).
    - **Limpeza do Texto:** Remover o texto da menção do campo `name` (implementar).
5.  **Preview Visual - ESTRUTURA DEFINIDA BASEADA NO PLANKA:**
    - **Localização:** O preview deve aparecer **dentro do `.fieldWrapper`** (linha 264-274) logo **ANTES** do campo de texto.
    - **Estrutura dos Previews:**
      
      **🏷️ Labels (Etiquetas) - FICAM NO TOPO, ALINHADOS À ESQUERDA:**
      ```jsx
      {labelsToAdd.length > 0 && (
        <div className={styles.previewLabels}>
          {labelsToAdd.map(labelId => (
            <span key={labelId} className={classNames(styles.previewAttachment, styles.previewAttachmentLeft)}>
              <LabelChip id={labelId} size="tiny" />
            </span>
          ))}
        </div>
      )}
      ```
      
      **👥 Utilizadores - FICAM NO TOPO, ALINHADOS À DIREITA (float: right):**
      ```jsx
      {usersToAdd.length > 0 && (
        <div className={classNames(styles.previewAttachments, styles.previewAttachmentsRight)}>
          {usersToAdd.map(userId => (
            <span key={userId} className={classNames(styles.previewAttachment, styles.previewAttachmentRight)}>
              <UserAvatar id={userId} size="small" />
            </span>
          ))}
        </div>
      )}
      ```
    
    - **Classes CSS a Adicionar ao `AddCard.module.scss`:**
      ```scss
      .previewAttachment {
        display: inline-block;
        line-height: 0;
        margin: 0 0 6px 0;
        max-width: 100%;
        vertical-align: top;
      }
      
      .previewAttachmentLeft {
        margin-right: 4px;
      }
      
      .previewAttachmentRight {
        margin-left: 2px;
      }
      
      .previewAttachments {
        display: inline-block;
        padding-bottom: 2px;
      }
      
      .previewAttachmentsRight {
        float: right;
        line-height: 0;
        margin-top: 6px;
      }
      
      .previewLabels {
        max-width: 100%;
        overflow: hidden;
        margin-bottom: 4px;
      }
      
      // Clearfix para garantir layout correto com float
      .fieldWrapper:after {
        clear: both;
        content: "";
        display: table;
      }
      ```
    
    - **Posicionamento:** 
      - Labels ficam numa linha própria no topo, alinhados à esquerda
      - Utilizadores ficam numa linha própria no topo, alinhados à direita (float)
      - Campo de texto fica por baixo dos previews
      - **Exatamente como nos cartões do Planka** - mesma estrutura visual
6.  **Tema Glass Effect - ESPECIFICAÇÃO EXATA BASEADA NO PROJETO:**
    
    **📍 Localização:** Os estilos já existem em `client/src/styles.module.scss` (linhas 79-102).
    
    **🎨 Estilos Atuais do Dropdown (a substituir):**
    ```scss
    // ATUAL em styles.module.scss (linhas 85-101)
    .mentions-input {
      &__suggestions {
        border: 1px solid #d4d4d5;
        border-radius: 3px;
        box-shadow: 0 8px 16px -4px rgba(9, 45, 66, 0.25);
        max-height: 200px;
        overflow-y: auto;
        
        &__item {
          padding: 8px 12px;
          &--focused {
            background-color: rgba(0, 0, 0, 0.05);
            color: rgba(0, 0, 0, 0.95);
          }
        }
      }
    }
    ```
    
    **✨ Novos Estilos Glass Theme (a implementar):**
    ```scss
    // NOVO - Glass Theme para mentions dropdown
    .mentions-input {
      &__highlighter {
        line-height: 1.4;
        padding: 8px 12px;
      }

      &__suggestions {
        // Glass Effect baseado no glass-theme.css
        background: rgba(var(--glass-bg-rgb), 0.85) !important;
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border);
        border-radius: 16px; // Consistente com modais glass
        box-shadow: var(--glass-shadow);
        max-height: 200px;
        overflow-y: auto;
        z-index: 100020; // Acima de todos os elementos
        
        // Scroll glass theme
        &::-webkit-scrollbar {
          width: 8px;
        }
        
        &::-webkit-scrollbar-thumb {
          border-radius: 4px;
          background: linear-gradient(
            180deg,
            rgba(59, 130, 246, 0.45),
            rgba(29, 78, 216, 0.45)
          );
        }

        &__item {
          padding: 8px 12px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          
          &--focused {
            background: rgba(59, 130, 246, 0.15);
            color: var(--text-primary);
            border-radius: 8px;
            margin: 2px 4px;
          }
        }
      }
    }
    ```
    
    **⚠️ VARIÁVEIS CSS NECESSÁRIAS:**
    As variáveis já existem em `glass-theme.css`:
    - `--glass-bg-rgb: 14, 17, 23`
    - `--glass-border: rgba(255, 255, 255, 0.06)`
    - `--glass-shadow: 0 14px 34px rgba(0, 0, 0, 0.55)`
    - `--text-primary: #e6edf3`
    - `--text-secondary: rgba(230, 237, 243, 0.75)`
    
    **🔧 IMPLEMENTAÇÃO:**
    1. **Substituir** os estilos atuais em `styles.module.scss` (linhas 85-101)
    2. **Aplicar** os novos estilos glass theme
    3. **Testar** que o dropdown aparece com o efeito glass correto
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
- **Teste 6:** **Posicionamento dos Previews:** 
  - Labels devem aparecer no topo, alinhados à esquerda
  - Utilizadores devem aparecer no topo, alinhados à direita (float: right)
  - Campo de texto deve ficar por baixo dos previews
  - Layout deve ser idêntico aos cartões normais do Planka
- **Teste 7:** Clicar em "Adicionar Cartão".
- **Teste 8:** Verificar se o cartão foi criado com o título correto (sem as menções) e se o utilizador e a etiqueta selecionados foram corretamente associados a ele.
- **Teste 9:** Adicionar um cartão sem menções para garantir que o fluxo normal não foi afetado.
- **Teste 10:** **Verificar que a edição de cartões NÃO foi afetada** - abrir um cartão existente e verificar que o campo de título funciona normalmente (sem menções).
- **Teste 11:** **Verificar funcionalidades existentes de edição:**
  - Clicar no botão "Membros" no modal de edição - deve funcionar normalmente
  - Clicar no botão "Etiquetas" no modal de edição - deve funcionar normalmente
  - Adicionar/remover utilizadores via edição - deve funcionar normalmente
  - Adicionar/remover etiquetas via edição - deve funcionar normalmente
- **Teste 12:** **Verificar sintonia entre criação e edição:**
  - Criar um cartão com menções `@user` e `#label`
  - Abrir o cartão criado e verificar que os utilizadores/etiquetas aparecem nos botões de edição
  - Adicionar mais utilizadores/etiquetas via edição
  - Verificar que tudo aparece consistentemente no cartão

### **🔬 TESTES DE EDGE CASES (CRÍTICOS):**
- **Teste Edge 1:** **Caracteres Especiais:** Digitar `@@`, `##`, `@#`, `#@` - dropdown deve aparecer apenas no último caractere
- **Teste Edge 2:** **Performance:** Criar quadro com 50+ utilizadores e 20+ labels - dropdown deve aparecer rapidamente
- **Teste Edge 3:** **Texto Longo:** Digitar título com 1000+ caracteres incluindo menções - deve funcionar normalmente
- **Teste Edge 4:** **Múltiplas Menções:** `@user1 @user2 #label1 #label2` no mesmo título - todas devem ser processadas
- **Teste Edge 5:** **Cancellation:** Digitar `@` e depois ESC - dropdown deve desaparecer sem adicionar nada
- **Teste Edge 6:** **Keyboard Navigation:** Usar setas para navegar dropdown, Enter para selecionar
- **Teste Edge 7:** **Mobile/Touch:** Testar em dispositivo móvel ou simulador - touch deve funcionar
- **Teste Edge 8:** **Utilizadores Duplicados:** Tentar adicionar o mesmo utilizador duas vezes - deve aparecer apenas uma vez
- **Teste Edge 9:** **Conflito Drag & Drop:** Arrastar arquivo sobre o campo enquanto dropdown está aberto
- **Teste Edge 10:** **Concorrência:** Abrir várias abas e criar cartões simultaneamente

### **🎯 TESTES DE INTEGRAÇÃO ESPECÍFICOS:**
- **Teste Int 1:** **Boards com Diferentes Configurações:** Testar em board sem utilizadores, board sem labels
- **Teste Int 2:** **Permissões:** Testar com utilizador com permissões limitadas
- **Teste Int 3:** **Browser Compatibility:** Chrome, Firefox, Safari, Edge
- **Teste Int 4:** **Network Issues:** Simular rede lenta durante criação de cartão
- **Teste Int 5:** **Undo/Redo:** Testar Ctrl+Z no campo de texto com menções
---

### Passo 4: Estratégia de Logs para Debugging (EXPANDIDA)

**⚠️ NOTA:** Os logs devem ser mantidos no código até que a funcionalidade seja validada e aprovada pelo utilizador [[memory:9198107]].

#### **📊 LOGS ESTRATÉGICOS OBRIGATÓRIOS:**

**1. 🏗️ Logs de Inicialização:**
```javascript
console.log('🚀 AddCard: Dados Redux carregados:', {
  boardMemberships: boardMemberships.length,
  labels: labels.length,
  usersData: usersData.length,
  labelsData: labelsData.length
});
```

**2. 💬 Logs do Sistema de Mentions:**
```javascript
console.log('🔍 Dropdown apareceu:', { trigger, query, suggestions: data.length });
console.log('✅ Item selecionado:', { type: trigger, id, display, position: {startPos, endPos} });
console.log('🧹 Texto limpo:', { antes: oldValue, depois: newPlainTextValue });
```

**3. 🎨 Logs dos Previews:**
```javascript
console.log('👥 Utilizadores preview atualizados:', usersToAdd);
console.log('🏷️ Labels preview atualizados:', labelsToAdd);
console.log('🔄 Render preview triggered:', { usersCount: usersToAdd.length, labelsCount: labelsToAdd.length });
```

**4. 🚀 Logs de Submissão:**
```javascript
console.log('📤 Submissão iniciada:', { 
  cardName: cleanData.name, 
  usersToAdd: usersToAdd.length, 
  labelsToAdd: labelsToAdd.length 
});
console.log('⚡ Saga createCard chamada:', { cardData: cleanData, userIds: usersToAdd, labelIds: labelsToAdd });
```

**5. 🐛 Logs de Debugging Críticos:**
```javascript
console.log('⚠️ Dropdown z-index check:', window.getComputedStyle(dropdownElement).zIndex);
console.log('🔧 useForm integration:', { formValue: data.name, mentionsValue: newPlainTextValue });
console.log('🎯 Performance check - render time:', performance.now() - renderStart);
```

#### **📍 LOCALIZAÇÃO DOS LOGS:**
- **Inicialização:** No `useEffect` que carrega dados Redux
- **Mentions:** Nos callbacks `onAdd`, `onChange`, e `renderSuggestion`
- **Previews:** No render dos componentes de preview
- **Submissão:** Na função `submit` e antes de chamar `onCreate`
- **Performance:** Em componentes que renderizam listas grandes

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

// Para integração com useForm existente (SIMPLIFICADO):
const handleMentionsChange = (event, newValue, newPlainTextValue, mentions) => {
  console.log('🔄 MentionsInput changed:', { newPlainTextValue, mentions });
  
  // 1. Atualizar campo de texto (simples)
  handleFieldChange({
    target: {
      name: 'name',
      value: newPlainTextValue
    }
  });
  
  // 2. Processar apenas mentions NOVAS (evitar duplicatas)
  // NOTA: Lógica de onAdd já cuida da adição - aqui só sincronizamos
};

// Callbacks separados e simples:
const handleUserAdd = useCallback((id, display) => {
  console.log('👥 Utilizador adicionado:', { id, display });
  setUsersToAdd(prev => prev.includes(id) ? prev : [...prev, id]);
}, []);

const handleLabelAdd = useCallback((id, display) => {
  console.log('🏷️ Label adicionada:', { id, display });
  setLabelsToAdd(prev => prev.includes(id) ? prev : [...prev, id]);
}, []);
```

### Passo 6: Estratégia de Rollback e Contingência

#### **🚨 PLANO DE CONTINGÊNCIA (OBRIGATÓRIO):**

**1. 💾 Checkpoints de Backup:**
- **Antes Fase 1:** `git stash push -m "backup-antes-mentions-feature"`
- **Após Fase 2:** `git commit -m "estrutura-basica-previews"`
- **Após Fase 4:** `git commit -m "mentions-funcional-sem-styling"`
- **Antes Saga:** `git commit -m "antes-modificacao-saga"`

**2. 🔄 Estratégias de Rollback Rápido:**
```bash
# Se algo correr mal durante implementação:
git stash  # Guarda trabalho atual
git reset --hard HEAD~1  # Volta ao último checkpoint

# Se problema for só CSS:
git checkout HEAD -- src/styles.module.scss
git checkout HEAD -- src/components/cards/AddCard/AddCard.module.scss

# Se problema for só no componente:
git checkout HEAD -- src/components/cards/AddCard/AddCard.jsx
```

**3. 🛡️ Proteções Durante Implementação:**
- **Nunca modificar** ações Redux existentes (`addUserToCurrentCard`, etc.)
- **Nunca tocar** em `NameField.jsx` (edição de cartões)
- **Testar cada checkpoint** antes de continuar
- **Manter funcionalidade existente** sempre funcional

**4. 🚩 Sinais de Alerta (PARAR IMEDIATAMENTE):**
- Sistema de criação de cartões normais para de funcionar
- Modal de edição de cartões fica quebrado
- Drag & drop de ficheiros para de funcionar
- Performance geral do board degradada significativamente
- Console com mais de 10 erros por operação

**5. 📞 Plano B (Se Implementação Falhar):**
- **Opção 1:** Implementar apenas previews (sem mentions)
- **Opção 2:** Implementar apenas mentions (sem previews)
- **Opção 3:** Usar modal simples em vez de inline mentions
- **Opção 4:** Adiar feature e investigar alternativas

### Passo 7: Verificação Manual (Utilizador)
- **Ação:** O utilizador irá testar a funcionalidade manualmente para garantir que todos os requisitos foram cumpridos.
- **Resultado Esperado:** A funcionalidade de menções funciona como esperado na criação de cartões.
- **⚠️ ROLLBACK:** Se qualquer teste falhar criticamente, usar estratégia de rollback apropriada.

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

2. **Saga createCard (ESPECIFICAÇÃO DETALHADA):**
   
   **📍 Localização:** `client/src/sagas/cards.js` - função `createCard`
   
   **🔧 Modificação Necessária:**
   ```javascript
   // ANTES (atual):
   function* createCard(data) {
     const card = yield call(api.createCard, data);
     // ... resto da lógica
   }
   
   // DEPOIS (com mentions):
   function* createCard(data, userIds = [], labelIds = []) {
     console.log('⚡ createCard saga:', { data, userIds, labelIds });
     
     // 1. Criar cartão normalmente
     const card = yield call(api.createCard, data);
     
     // 2. Adicionar utilizadores (se existirem)
     if (userIds.length > 0) {
       for (const userId of userIds) {
         console.log('👥 Adicionando user ao cartão:', { cardId: card.id, userId });
         yield put(entryActions.addUserToCard(card.id, userId));
       }
     }
     
     // 3. Adicionar labels (se existirem)
     if (labelIds.length > 0) {
       for (const labelId of labelIds) {
         console.log('🏷️ Adicionando label ao cartão:', { cardId: card.id, labelId });
         yield put(entryActions.addLabelToCard(card.id, labelId));
       }
     }
     
     // ... resto da lógica original
   }
   ```
   
   **⚠️ IMPORTANTE:** 
   - Usar ações `addUserToCard` e `addLabelToCard` (NÃO as de currentCard)
   - Manter toda a lógica original da saga
   - Apenas ADICIONAR a nova funcionalidade no final

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

---

## ✅ **APIS CORRETAS DESCOBERTAS DURANTE IMPLEMENTAÇÃO**

### 🔧 **APIs Funcionais (Testadas e Aprovadas):**

**Para Utilizadores:**
```javascript
// Action
yield put(actions.addUserToCard(userId, cardId, false));

// API Call  
const membership = yield call(request, api.createCardMembership, cardId, { userId });

// Success
yield put(actions.addUserToCard.success(membership.item));
```

**Para Etiquetas:**
```javascript
// Action
yield put(actions.addLabelToCard(labelId, cardId));

// API Call
const cardLabel = yield call(request, api.createCardLabel, cardId, { labelId });

// Success
yield put(actions.addLabelToCard.success(cardLabel.item));
```

### ❌ **APIs que NÃO existem (evitar):**
- ~~`actions.createCardMembership`~~ → Use `actions.addUserToCard`
- ~~`api.addLabelToCard`~~ → Use `api.createCardLabel`

---

## 🎯 **ESPECIFICAÇÃO TÉCNICA EXATA: POSICIONAMENTO DOS PREVIEWS**

### 📍 **Localização no AddCard.jsx (Linha 264-274):**

**ESTRUTURA ATUAL:**
```jsx
<div className={classNames(
  styles.fieldWrapper,
  isDragOver && styles.fieldWrapperDragOver,
  isProcessing && styles.fieldWrapperProcessing
)} ...>
  <TextArea ... />  // ← Campo de texto atual
  {/* overlays de drag e processing */}
</div>
```

**ESTRUTURA NOVA (com previews):**
```jsx
<div className={classNames(
  styles.fieldWrapper,
  isDragOver && styles.fieldWrapperDragOver,
  isProcessing && styles.fieldWrapperProcessing
)} ...>
  
  {/* 🏷️ LABELS PREVIEW - TOPO ESQUERDA */}
  {labelsToAdd.length > 0 && (
    <div className={styles.previewLabels}>
      {labelsToAdd.map(labelId => (
        <span key={labelId} className={classNames(styles.previewAttachment, styles.previewAttachmentLeft)}>
          <LabelChip id={labelId} size="tiny" />
        </span>
      ))}
    </div>
  )}
  
  {/* 👥 USERS PREVIEW - TOPO DIREITA */}
  {usersToAdd.length > 0 && (
    <div className={classNames(styles.previewAttachments, styles.previewAttachmentsRight)}>
      {usersToAdd.map(userId => (
        <span key={userId} className={classNames(styles.previewAttachment, styles.previewAttachmentRight)}>
          <UserAvatar id={userId} size="small" />
        </span>
      ))}
    </div>
  )}
  
  <MentionsInput ... />  // ← Campo de texto (substituído)
  {/* overlays de drag e processing */}
</div>
```

### 🎨 **Layout Visual Final:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Label1] [Label2] [Label3]              [👤] [👤] [👤]    │ ← Previews
│                                                             │
│ Digite o título do cartão...                                │ ← Campo MentionsInput
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**⚠️ IMPORTAÇÕES NECESSÁRIAS:**
- `{ MentionsInput, Mention }` de `'react-mentions'`
- `LabelChip` de `'../../../components/ui/'`
- `UserAvatar` de `'../../../components/ui/'`
- `classNames` (já importado)
- `useCallback` de `'react'` (para callbacks otimizados)
- `useMemo` de `'react'` (para otimização de listas)
- Seletores Redux: `selectors.selectMembershipsForCurrentBoard`, `selectors.selectLabelsForCurrentBoard`

**⚠️ ORDEM DE IMPLEMENTAÇÃO CORRIGIDA (COM CHECKPOINTS):**

### **🔧 FASE 1: PREPARAÇÃO E BACKUP**
1. **Backup:** Criar branch ou `git stash` do estado atual
2. **Importações:** Adicionar todas as importações necessárias (`MentionsInput`, `Mention`, etc.)
3. **✅ CHECKPOINT 1:** Verificar que projeto ainda compila

### **🏗️ FASE 2: ESTRUTURA BÁSICA**
4. **Estados:** Adicionar `usersToAdd` e `labelsToAdd` no estado local
5. **CSS Previews:** Adicionar classes CSS de preview ao `AddCard.module.scss`
6. **HTML Previews:** Implementar HTML de previews (vazios inicialmente)
7. **✅ CHECKPOINT 2:** Verificar que previews aparecem vazios e layout não quebrou

### **🔌 FASE 3: FUNCIONALIDADE BÁSICA**
8. **MentionsInput Básico:** Substituir `TextArea` por `MentionsInput` (sem mentions ainda)
9. **Integração useForm:** Garantir que campo continua a funcionar como texto normal
10. **✅ CHECKPOINT 3:** Verificar que campo de texto funciona normalmente

### **💬 FASE 4: SISTEMA DE MENTIONS**
11. **Dados Redux:** Conectar utilizadores e labels do Redux
12. **Mentions Config:** Adicionar triggers, data, callbacks básicos
13. **Dropdown Básico:** Verificar que dropdown aparece (sem estilo glass ainda)
14. **✅ CHECKPOINT 4:** Verificar que dropdown de mentions aparece e funciona

### **🎨 FASE 5: LÓGICA DE PREVIEWS**
15. **Callbacks onAdd:** Implementar adição de items aos arrays
16. **Limpeza de Texto:** Implementar remoção de texto de menção
17. **Rendering Previews:** Conectar arrays aos componentes de preview
18. **✅ CHECKPOINT 5:** Verificar que previews funcionam completamente

### **✨ FASE 6: POLIMENTO E ESTILO**
19. **Glass Theme:** Aplicar estilos glass theme ao dropdown
20. **Otimizações:** Adicionar `useMemo` e `useCallback` onde necessário
21. **✅ CHECKPOINT 6:** Verificar tema glass e performance

### **🚀 FASE 7: INTEGRAÇÃO FINAL**
22. **Saga Modification:** Modificar saga `createCard` para processar arrays
23. **Testes Finais:** Executar todos os testes manuais
24. **✅ CHECKPOINT FINAL:** Validação completa da funcionalidade
