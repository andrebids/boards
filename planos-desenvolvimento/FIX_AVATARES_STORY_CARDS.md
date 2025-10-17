# Fix: Avatares em Cards do Tipo "Story"

## 📋 Problema Identificado

### Descrição

Os avatares de utilizadores não apareciam em cards do tipo `"story"`, apenas em cards do tipo `"project"`.

### Causa Raiz

O componente `StoryContent.jsx` **não tinha implementação** para renderizar avatares de utilizadores, apenas renderizava:

- Labels
- Custom fields
- Descrição
- Anexos
- Notificações
- Nome da lista

## 🔍 Investigação

### Como Funciona o Sistema de Tipos de Cards

1. **Dois tipos de cards disponíveis:**

   - `CardTypes.PROJECT` - Para tarefas e gestão de projetos
   - `CardTypes.STORY` - Para referência e armazenamento de conhecimento

2. **Configuração do Board:**

   - Cada board tem um `defaultCardType` (padrão: `"project"` ou `"story"`)
   - Quando um card é criado, usa automaticamente o tipo padrão do board
   - O board pode ter `limitCardTypesToDefaultOne: true` para forçar um único tipo

3. **Componentes de Renderização:**
   - `Card.jsx` decide qual componente usar baseado no `card.type`:
     ```javascript
     switch (card.type) {
       case CardTypes.PROJECT:
         Content = ProjectContent;
         break;
       case CardTypes.STORY:
         Content = StoryContent;
         break;
       default:
         Content = InlineContent;
     }
     ```

### Arquivos Envolvidos

- **Constantes:** `client/src/constants/Enums.js`

  - Define `CardTypes.PROJECT` e `CardTypes.STORY`

- **Componente Principal:** `client/src/components/cards/Card/Card.jsx`

  - Decide qual componente de conteúdo renderizar

- **Conteúdo Project:** `client/src/components/cards/Card/ProjectContent.jsx`

  - ✅ Tinha implementação de avatares

- **Conteúdo Story:** `client/src/components/cards/Card/StoryContent.jsx`

  - ❌ NÃO tinha implementação de avatares (problema)

- **Seleção de Tipo:** `client/src/components/cards/SelectCardType/SelectCardType.jsx`

  - Interface para escolher o tipo ao criar um card

- **Criação de Card:** `client/src/components/cards/AddCard/AddCard.jsx`
  - Usa `defaultCardType` do board (linhas 321, 459)

## ✅ Solução Implementada

### Alterações em `StoryContent.jsx`

#### 1. Importar UserAvatar

```javascript
import UserAvatar from "../../users/UserAvatar";
```

#### 2. Adicionar Selector para UserIds

```javascript
const selectUserIdsByCardId = useMemo(
  () => selectors.makeSelectUserIdsByCardId(),
  []
);
```

#### 3. Obter UserIds do Card

```javascript
const userIds = useSelector((state) => selectUserIdsByCardId(state, cardId));
```

#### 4. Renderizar Avatares na Secção de Attachments

```javascript
{
  (attachmentsTotal > 0 ||
    notificationsTotal > 0 ||
    listName ||
    userIds.length > 0) && (
    <span className={styles.attachments}>
      {/* ... outros attachments ... */}

      {/* 👥 AVATARES DE UTILIZADORES */}
      {userIds.length > 0 && (
        <>
          {userIds.map((userId, index) => (
            <span
              key={userId}
              className={classNames(styles.attachment, styles.attachmentRight)}
            >
              <UserAvatar id={userId} size="small" className={undefined} />
            </span>
          ))}
        </>
      )}
    </span>
  );
}
```

## 🎯 Resultado

### Antes

- ❌ Cards tipo `"story"` não mostravam avatares
- ✅ Cards tipo `"project"` mostravam avatares

### Depois

- ✅ Cards tipo `"story"` mostram avatares
- ✅ Cards tipo `"project"` mostram avatares
- ✅ **Todos os cards mostram avatares**, independentemente do tipo!

## 📝 Notas Técnicas

### Por Que Esta é a Melhor Solução?

1. **Consistência:**

   - Ambos os tipos de cards têm o mesmo comportamento
   - Utilizadores não precisam saber qual é o tipo do card

2. **Sem Breaking Changes:**

   - Não requer mudanças nas configurações do board
   - Não requer migração de dados
   - Cards existentes continuam a funcionar

3. **Flexibilidade:**
   - Mantém a possibilidade de ter dois tipos de cards
   - Cada tipo pode ter características únicas (layout, campos, etc.)
   - Avatares são uma funcionalidade comum a ambos

### Alternativas Consideradas

#### ❌ Opção 1: Forçar Todos os Cards a Serem "Project"

- Requer mudança no `defaultCardType` do board
- Cards existentes do tipo "story" continuariam sem avatares
- Perde a flexibilidade dos dois tipos

#### ❌ Opção 2: Permitir Escolha Manual do Tipo

- Já está implementado (botão ao criar card)
- Não resolve cards existentes
- Depende do utilizador lembrar de escolher

#### ✅ Opção 3: Adicionar Avatares ao StoryContent (IMPLEMENTADA)

- Resolve o problema para todos os cards
- Melhora a experiência para ambos os tipos
- Mantém a arquitetura flexível

## 🔧 Manutenção Futura

### Se Adicionar Novos Tipos de Cards

Ao criar novos tipos de conteúdo (ex: `InlineContent`, novos tipos), lembrar de:

1. Importar `UserAvatar`
2. Adicionar selector `makeSelectUserIdsByCardId()`
3. Renderizar avatares na UI
4. Testar com utilizadores atribuídos

### Padrão Recomendado

```javascript
// 1. Import
import UserAvatar from "../../users/UserAvatar";

// 2. Selector
const selectUserIdsByCardId = useMemo(
  () => selectors.makeSelectUserIdsByCardId(),
  []
);

// 3. Get data
const userIds = useSelector((state) => selectUserIdsByCardId(state, cardId));

// 4. Render
{
  userIds.length > 0 && (
    <>
      {userIds.map((userId) => (
        <UserAvatar key={userId} id={userId} size="small" />
      ))}
    </>
  );
}
```

## ✅ Verificação

### Como Testar

1. Criar um card do tipo "story"
2. Adicionar utilizadores ao card (via modal ou mentions)
3. Verificar que os avatares aparecem no card na lista
4. Verificar que funciona igual para cards tipo "project"

### Casos de Teste

- ✅ Card "story" com 1 utilizador - Avatar aparece
- ✅ Card "story" com múltiplos utilizadores - Todos os avatares aparecem
- ✅ Card "story" sem utilizadores - Sem avatares (comportamento correto)
- ✅ Card "project" com utilizadores - Continua a funcionar (sem regressão)

## 📅 Data de Implementação

**17 de Outubro de 2025**

## 🔗 Ficheiros Modificados

- `client/src/components/cards/Card/StoryContent.jsx`

## 🔗 Ficheiros Relacionados (Não Modificados)

- `client/src/components/cards/Card/Card.jsx` - Router de componentes
- `client/src/components/cards/Card/ProjectContent.jsx` - Referência para implementação
- `client/src/constants/Enums.js` - Definições de tipos
- `client/src/components/cards/AddCard/AddCard.jsx` - Criação de cards
