# HeroUI — CSS para implementação no chat

> Escopo: apenas o chat de `client/src/components/chat`.
>
> Formato: CSS/SCSS sem instalar ou importar HeroUI, React 19 ou Tailwind CSS.
>
> Consulta dos estilos oficiais efetuada em 31 de julho de 2026.

## Regra de implementação

Este documento contém apenas estilos. O markup, o estado e os comportamentos
acessíveis existentes no chat continuam a ser implementados pelos componentes
atuais.

O CSS oficial de `@heroui/styles` usa BEM e diretivas Tailwind `@apply`. Como este
projeto usa SCSS Modules, as diretivas foram convertidas para declarações CSS
normais e os seletores foram mapeados para as classes que já existem no chat.

Não é necessário:

- Instalar `@heroui/react`.
- Instalar `@heroui/styles`.
- Atualizar React.
- Introduzir Tailwind CSS.
- Importar qualquer Provider.

## Fontes CSS oficiais

- [surface.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/surface.css)
- [card.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/card.css)
- [chip.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/chip.css)
- [button.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css)
- [toolbar.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/toolbar.css)
- [popover.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/popover.css)
- [dropdown.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/dropdown.css)
- [tooltip.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/tooltip.css)
- [scroll-shadow.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/scroll-shadow.css)
- [skeleton.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/skeleton.css)
- [toast.css](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/toast.css)

---

## 1. Tokens do chat

Destino:

`client/src/components/chat/theme.scss`

Os tokens abaixo traduzem a hierarquia de superfícies do HeroUI para os tokens que
o chat já utiliza.

```scss
#app {
  /*
   * HeroUI dark surfaces:
   * background -> surface -> surface-secondary -> surface-tertiary -> overlay
   */
  --chat-surface-tertiary: color-mix(
    in oklab,
    var(--chat-surface-secondary) 92%,
    var(--chat-foreground) 8%
  );
  --chat-overlay-foreground: var(--chat-foreground);
  --chat-default-soft: color-mix(in oklab, var(--chat-default) 70%, transparent);

  /*
   * HeroUI uses large, concentric radii. These values are reduced for the
   * compact 360px chat while preserving the same hierarchy.
   */
  --chat-radius-message: 18px;
  --chat-radius-attachment: 14px;
  --chat-radius-overlay: 20px;
  --chat-radius-chip: 16px;

  /*
   * HeroUI dark overlays use a subtle inset highlight instead of a large
   * external shadow.
   */
  --chat-overlay-shadow:
    0 0 1px rgba(255, 255, 255, 0.3) inset,
    0 14px 28px rgba(0, 0, 0, 0.24);

  --chat-ease-smooth: cubic-bezier(0.2, 0, 0, 1);
  --chat-ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
}
```

---

## 2. Bolhas e cartões de anexos

Origem:

- `card.css`
- `surface.css`

Destino:

`client/src/components/chat/MessageList/MessageList.module.scss`

```scss
:global(#app) {
  .bubble {
    background: var(--chat-bubble-received);
    border: 1px solid var(--chat-border);
    border-radius: var(--chat-radius-message);
    color: var(--chat-foreground);
    overflow-wrap: anywhere;
    padding: 8px 12px;
    position: relative;
    white-space: pre-wrap;
  }

  .own .bubble {
    background: var(--chat-bubble-sent);
    border-color: var(--chat-bubble-sent);
    color: var(--chat-accent-foreground);
  }

  /*
   * Card horizontal compacto inspirado no exemplo HeroUI.
   * Mantém o elemento atual como button; só altera a apresentação.
   */
  .attachment {
    align-items: center;
    background: var(--chat-surface-tertiary);
    border: 1px solid var(--chat-border);
    border-radius: var(--chat-radius-attachment);
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.12) inset;
    color: var(--chat-foreground);
    cursor: pointer;
    display: inline-flex;
    font-family: inherit;
    font-size: var(--chat-font-body);
    gap: 10px;
    max-width: 280px;
    min-height: 46px;
    overflow: hidden;
    padding: 6px 10px 6px 6px;
    text-align: left;
    transition:
      background-color 100ms var(--chat-ease-smooth),
      border-color 100ms var(--chat-ease-smooth),
      transform 150ms var(--chat-ease-smooth);
    width: 100%;

    &:hover {
      background: var(--chat-default-hover);
      border-color: color-mix(
        in oklab,
        var(--chat-border) 78%,
        var(--chat-foreground) 22%
      );
    }

    &:active {
      transform: scale(0.98);
    }

    &:focus-visible {
      box-shadow:
        0 0 0 2px var(--chat-focus-ring),
        0 0 1px rgba(255, 255, 255, 0.12) inset;
      outline: 2px solid var(--chat-accent);
      outline-offset: 2px;
    }

    > svg {
      color: var(--chat-muted);
      flex: 0 0 auto;
      margin: 0 7px;
    }

    > span {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .attachmentVisual {
    align-items: center;
    flex-direction: row;
    padding: 6px 10px 6px 6px;

    img {
      aspect-ratio: 1;
      border-radius: 10px;
      display: block;
      flex: 0 0 34px;
      height: 34px;
      object-fit: cover;
      outline: 1px solid rgba(255, 255, 255, 0.1);
      outline-offset: -1px;
      width: 34px;
    }

    span {
      padding: 0;
    }
  }

  .imageMessage {
    border-radius: var(--chat-radius-message);
  }

  .imageAttachment img {
    outline: 1px solid rgba(255, 255, 255, 0.1);
    outline-offset: -1px;
  }
}
```

Resultado esperado:

- Anexo semelhante à referência enviada: miniatura quadrada e nome numa única
  superfície compacta.
- Cantos do thumbnail menores do que os cantos do cartão.
- Nenhuma alteração ao download ou preview atual.

---

## 3. Reações como chips

Origem:

`chip.css`

Destino:

`client/src/components/chat/MessageList/MessageList.module.scss`

```scss
:global(#app) {
  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 5px;
    position: relative;
    z-index: 1;

    button {
      --reaction-background: var(--chat-default-soft);
      --reaction-foreground: var(--chat-muted);

      align-items: center;
      background: var(--reaction-background);
      border: 1px solid transparent;
      border-radius: var(--chat-radius-chip);
      color: var(--reaction-foreground);
      cursor: pointer;
      display: inline-flex;
      font-family: inherit;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      gap: 3px;
      justify-content: center;
      line-height: 20px;
      min-height: 24px;
      min-width: 28px;
      padding: 1px 8px;
      transition:
        background-color 100ms var(--chat-ease-smooth),
        border-color 100ms var(--chat-ease-smooth),
        color 100ms var(--chat-ease-smooth),
        transform 150ms var(--chat-ease-smooth);

      &:hover {
        --reaction-background: var(--chat-default-hover);
        --reaction-foreground: var(--chat-foreground);
      }

      &:active {
        transform: scale(0.98);
      }

      &:focus-visible {
        outline: 2px solid var(--chat-accent);
        outline-offset: 2px;
      }
    }

    .reacted {
      --reaction-background: var(--chat-accent-soft);
      --reaction-foreground: var(--chat-accent);

      border-color: color-mix(
        in oklab,
        var(--chat-accent) 28%,
        transparent
      );

      &:hover {
        --reaction-background: var(--chat-accent-soft-hover);
        --reaction-foreground: var(--chat-accent);
      }
    }
  }

  .moreReactions {
    border-left: 1px solid var(--chat-separator);
    margin-left: 2px;
    padding-left: 5px;
  }
}
```

---

## 4. Toolbar de ações da mensagem

Origem:

- `toolbar.css`
- `button.css`

Destino:

`client/src/components/chat/MessageList/MessageList.module.scss`

```scss
:global(#app) {
  .hoverActions {
    align-items: center;
    background: var(--chat-popup);
    border: 1px solid var(--chat-border);
    border-radius: var(--chat-radius-overlay);
    box-shadow: var(--chat-overlay-shadow);
    display: grid;
    gap: 2px;
    grid-auto-flow: column;
    padding: 4px;

    > button,
    .reactionControl > button,
    .messageActions > button {
      --action-background: transparent;
      --action-foreground: var(--chat-muted);

      align-items: center;
      background: var(--action-background);
      border: 0;
      border-radius: 12px;
      color: var(--action-foreground);
      cursor: pointer;
      display: inline-flex;
      height: 30px;
      justify-content: center;
      padding: 0;
      transition:
        background-color 100ms var(--chat-ease-smooth),
        color 100ms var(--chat-ease-smooth),
        transform 150ms var(--chat-ease-smooth);
      width: 30px;

      &:hover {
        --action-background: var(--chat-default);
        --action-foreground: var(--chat-foreground);
      }

      &:active {
        transform: scale(0.97);
      }

      &:focus-visible {
        outline: 2px solid var(--chat-accent);
        outline-offset: 1px;
      }

      svg {
        height: 16px;
        pointer-events: none;
        width: 16px;
      }
    }
  }

  .hoverActionDivider {
    align-self: center;
    background: var(--chat-separator);
    height: 16px;
    margin: 0 2px;
    width: 1px;
  }
}
```

Nota: este CSS reproduz a aparência `toolbar--attached`. Navegação por setas exige
JavaScript/ARIA; manter o comportamento atual até existir uma implementação
específica.

---

## 5. Popups e dropdowns

Origem:

- `popover.css`
- `dropdown.css`

Destinos:

- `MessageComposer/MessageComposer.module.scss`
- `MessageList/MessageList.module.scss`
- `ConversationActions/ConversationActions.module.scss`
- `ChatWindow/ChatWindow.module.scss`

### Bloco partilhado

Aplicar as propriedades deste bloco às classes já existentes:

- `.attachmentMenu`
- `.actionsMenu`
- `.forwardMenu`
- `.menu`
- `.headerMenu`
- `.groupEditor`

```scss
background: var(--chat-popup);
border: 1px solid var(--chat-border);
border-radius: var(--chat-radius-overlay);
box-shadow: var(--chat-overlay-shadow);
color: var(--chat-overlay-foreground);
overscroll-behavior: contain;
transform-origin: var(--chat-popup-transform-origin, top right);
```

### Entrada e saída

O HeroUI usa 150ms na entrada e 100ms na saída, animando apenas opacity e transform.

```scss
@keyframes chatPopupEnter {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.9);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes chatPopupExit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(-2px) scale(0.95);
  }
}

.attachmentMenu,
.actionsMenu,
.forwardMenu,
.menu,
.headerMenu,
.groupEditor {
  animation: chatPopupEnter 150ms var(--chat-ease-smooth) both;
}
```

Não adicionar `chatPopupExit` sem estado de saída no JSX. Remover o elemento
imediatamente impediria a animação de terminar.

### Itens dos menus

```scss
button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  color: var(--chat-foreground);
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: var(--chat-font-body);
  gap: 8px;
  min-height: 34px;
  padding: 7px 10px;
  text-align: left;
  transition:
    background-color 100ms var(--chat-ease-smooth),
    color 100ms var(--chat-ease-smooth),
    transform 150ms var(--chat-ease-smooth);
  width: 100%;

  &:hover,
  &:focus-visible {
    background: var(--chat-default);
    outline: none;
  }

  &:active {
    transform: scale(0.98);
  }
}
```

### Ação destrutiva

```scss
.destructiveAction,
.leaveGroup {
  color: var(--chat-danger);

  &:hover,
  &:focus-visible {
    background: color-mix(
      in oklab,
      var(--chat-danger) 15%,
      transparent
    );
    color: var(--chat-danger);
  }
}
```

---

## 6. Tooltip CSS-only

Origem:

`tooltip.css`

O CSS pode ser reutilizado, mas mostrar/esconder e posicionar o tooltip continua a
exigir markup/estado existente ou uma implementação futura.

```scss
.chatTooltip {
  background: var(--chat-popup);
  border: 1px solid var(--chat-border);
  border-radius: 12px;
  box-shadow: var(--chat-overlay-shadow);
  color: var(--chat-foreground);
  font-size: 12px;
  line-height: 16px;
  max-width: 240px;
  overflow-wrap: anywhere;
  padding: 7px 9px;
  transform-origin: var(--chat-tooltip-transform-origin, center bottom);

  &[data-entering='true'] {
    animation: chatTooltipEnter 150ms var(--chat-ease-smooth) both;
  }

  &[data-exiting='true'] {
    animation: chatTooltipExit 100ms var(--chat-ease-smooth) both;
  }
}

.chatTooltipArrow {
  fill: var(--chat-popup);
  stroke: color-mix(in oklab, var(--chat-border) 70%, transparent);
}

@keyframes chatTooltipEnter {
  from {
    opacity: 0;
    transform: translateY(3px) scale(0.9);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes chatTooltipExit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(2px) scale(0.95);
  }
}
```

---

## 7. Scroll shadow

Origem:

`scroll-shadow.css`

O HeroUI ativa as máscaras com atributos `data-*`. No chat atual, o mesmo resultado
pode ser usado de forma permanente nas listas verticais, sem dependência.

Destino principal:

`client/src/components/chat/MessageList/MessageList.module.scss`

```scss
:global(#app) {
  .list {
    --scroll-shadow-size: 28px;
    --scroll-shadow-scrollbar-size: 6px;

    mask-image:
      linear-gradient(
        to bottom,
        transparent 0,
        #000 var(--scroll-shadow-size),
        #000 calc(100% - var(--scroll-shadow-size)),
        transparent 100%
      ),
      linear-gradient(#000, #000);
    mask-position:
      left top,
      right top;
    mask-repeat: no-repeat;
    mask-size:
      calc(100% - var(--scroll-shadow-scrollbar-size)) 100%,
      var(--scroll-shadow-scrollbar-size) 100%;
    -webkit-mask-image:
      linear-gradient(
        to bottom,
        transparent 0,
        #000 var(--scroll-shadow-size),
        #000 calc(100% - var(--scroll-shadow-size)),
        transparent 100%
      ),
      linear-gradient(#000, #000);
    -webkit-mask-position:
      left top,
      right top;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size:
      calc(100% - var(--scroll-shadow-scrollbar-size)) 100%,
      var(--scroll-shadow-scrollbar-size) 100%;
  }
}
```

Limitação: a versão permanente desvanece os extremos mesmo quando já se chegou ao
topo ou fundo. Para igualar completamente o HeroUI, atualizar atributos como
`data-top-scroll` e `data-bottom-scroll` com o evento de scroll.

---

## 8. Skeleton de mensagens

Origem:

`skeleton.css`

Destino sugerido:

Novo `MessageListSkeleton.module.scss`, apenas se o componente de loading for criado.

```scss
.skeleton {
  background: color-mix(
    in oklab,
    var(--chat-surface-tertiary) 70%,
    transparent
  );
  border-radius: 8px;
  overflow: hidden;
  pointer-events: none;
  position: relative;

  &::after {
    animation: chatSkeleton 2s linear infinite;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in oklab, var(--chat-foreground) 9%, transparent),
      transparent
    );
    content: '';
    inset: 0;
    position: absolute;
    transform: translateX(-100%);
  }
}

.avatar {
  border-radius: 50%;
  height: 24px;
  width: 24px;
}

.receivedBubble {
  border-radius: var(--chat-radius-message);
  height: 54px;
  width: 62%;
}

.sentBubble {
  border-radius: var(--chat-radius-message);
  height: 38px;
  margin-left: auto;
  width: 44%;
}

@keyframes chatSkeleton {
  to {
    transform: translateX(200%);
  }
}
```

---

## 9. Toast visual

Origem:

`toast.css`

Este bloco é apenas a apresentação. O chat já possui mecanismos de mensagens e
erros; não adicionar uma biblioteca.

```scss
.chatToastRegion {
  bottom: 16px;
  left: 50%;
  max-width: calc(100vw - 32px);
  pointer-events: none;
  position: fixed;
  transform: translateX(-50%);
  width: 360px;
  z-index: 1200;
}

.chatToast {
  align-items: flex-start;
  animation: chatToastEnter 200ms var(--chat-ease-smooth) both;
  background: var(--chat-popup);
  border: 1px solid var(--chat-border);
  border-radius: var(--chat-radius-overlay);
  box-shadow: var(--chat-overlay-shadow);
  color: var(--chat-overlay-foreground);
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  pointer-events: auto;
}

.chatToastIndicator {
  align-items: center;
  color: var(--chat-muted);
  display: flex;
  flex: 0 0 auto;
  justify-content: center;
  padding: 2px;
}

.chatToastContent {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.chatToastTitle {
  color: var(--chat-foreground);
  font-size: var(--chat-font-body);
  font-weight: 650;
  line-height: 18px;
}

.chatToastDescription {
  color: var(--chat-muted);
  font-size: var(--chat-font-meta);
  line-height: 16px;
}

.chatToastSuccess .chatToastIndicator,
.chatToastSuccess .chatToastTitle {
  color: var(--chat-success);
}

.chatToastWarning .chatToastIndicator,
.chatToastWarning .chatToastTitle {
  color: var(--chat-warning);
}

.chatToastDanger .chatToastIndicator,
.chatToastDanger .chatToastTitle {
  color: var(--chat-danger);
}

@keyframes chatToastEnter {
  from {
    opacity: 0;
    transform: translateY(100%);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 10. Reduced motion

Adicionar aos módulos que recebem animações:

```scss
@media (prefers-reduced-motion: reduce) {
  .hoverActions,
  .attachment,
  .reactions button,
  .attachmentMenu,
  .actionsMenu,
  .forwardMenu,
  .menu,
  .headerMenu,
  .groupEditor,
  .chatTooltip,
  .chatToast,
  .skeleton::after {
    animation: none;
    transition: none;
  }
}
```

---

## 11. Ordem CSS recomendada

1. Adicionar os tokens em `theme.scss`.
2. Aplicar cartão compacto aos anexos.
3. Aplicar chips às reações.
4. Uniformizar toolbar e menus.
5. Testar popups em desktop e mobile.
6. Adicionar scroll shadow apenas depois de confirmar que não oculta mensagens nos
   extremos.
7. Criar Skeleton/Toast apenas se os respetivos estados forem implementados.

## 12. Fora do escopo

- Alterar páginas fora do chat.
- Instalar HeroUI.
- Introduzir Tailwind.
- Trocar os componentes React existentes.
- Copiar lógica interna de Popover, Dropdown ou Toolbar.
- Mudar APIs, reducers, sagas ou o servidor.

