# HeroUI v3 — referência de implementação para o chat

> Documento de referência criado a partir da documentação oficial do HeroUI v3.0.5.
> Consulta efetuada em 31 de julho de 2026.

## Objetivo

Reunir num único ficheiro os padrões e exemplos de código do HeroUI que podem ser
aplicados ao chat: anexos, reações, ações contextuais, popups, scroll, loading e
feedback.

Este documento separa explicitamente:

1. **Código oficial HeroUI** — exemplos públicos copiados da documentação.
2. **Adaptação proposta** — composição específica para o chat deste projeto.

Não inclui cópias da implementação interna dos componentes. O HeroUI recomenda
consumir os componentes através de `@heroui/react`.

## Bloqueio de compatibilidade

O projeto atual não pode receber HeroUI v3 diretamente sem uma migração prévia.

| Requisito | HeroUI v3 | Projeto atual |
| --- | --- | --- |
| React | 19 ou superior | 18.2.0 |
| Tailwind CSS | v4 | Não instalado |
| HeroUI | `@heroui/react` e `@heroui/styles` | Não instalado |
| Estilos do chat | Tailwind v4 + HeroUI | SCSS Modules e tokens próprios |

Portanto, existem duas decisões possíveis:

- **Integração direta:** atualizar React, introduzir Tailwind CSS v4 e instalar HeroUI.
- **Referência visual:** manter React 18/SCSS e continuar a adaptar os padrões.

Este documento prepara a primeira opção, conforme solicitado. Não executar os
comandos abaixo no branch principal sem aprovar primeiro a migração de stack.

## Fontes oficiais

- [Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start)
- [Design Principles](https://heroui.com/en/docs/react/getting-started/design-principles)
- [Card](https://heroui.com/en/docs/react/components/card)
- [Chip](https://heroui.com/en/docs/react/components/chip)
- [Toolbar](https://heroui.com/en/docs/react/components/toolbar)
- [Popover](https://heroui.com/en/docs/react/components/popover)
- [Dropdown](https://heroui.com/en/docs/react/components/dropdown)
- [ScrollShadow](https://heroui.com/en/docs/react/components/scroll-shadow)
- [Skeleton](https://heroui.com/en/docs/react/components/skeleton)
- [Toast](https://heroui.com/en/docs/react/components/toast)
- [Tooltip](https://heroui.com/en/docs/react/components/tooltip)

---

## 1. Instalação oficial

Fonte: [HeroUI Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start).

### Pacotes

```bash
npm i @heroui/styles @heroui/react
```

### Importação de estilos

O HeroUI exige esta ordem:

```css
@import "tailwindcss";
@import "@heroui/styles";
```

O HeroUI v3 não necessita de um Provider global para os componentes normais.
O `Toast` é uma exceção funcional: precisa de `Toast.Provider`.

### Smoke test oficial

```tsx
import { Button } from '@heroui/react';

function App() {
  return (
    <Button>
      My Button
    </Button>
  );
}
```

---

## 2. Card — base para anexos e previews

Fonte: [HeroUI Card](https://heroui.com/en/docs/react/components/card).

### Anatomia oficial

```tsx
import { Card } from "@heroui/react";

export default () => (
  <Card>
    <Card.Header>
      <Card.Title />
      <Card.Description />
    </Card.Header>
    <Card.Content />
    <Card.Footer />
  </Card>
);
```

### Variantes oficiais relevantes

```tsx
import {Card} from "@heroui/react";

export function Variants() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="w-[320px]" variant="transparent">
        <Card.Header>
          <Card.Title>Transparent</Card.Title>
          <Card.Description>Minimal prominence with transparent background</Card.Description>
        </Card.Header>
      </Card>

      <Card className="w-[320px]" variant="default">
        <Card.Header>
          <Card.Title>Default</Card.Title>
          <Card.Description>Standard card appearance (bg-surface)</Card.Description>
        </Card.Header>
      </Card>

      <Card className="w-[320px]" variant="secondary">
        <Card.Header>
          <Card.Title>Secondary</Card.Title>
          <Card.Description>Medium prominence (bg-surface-secondary)</Card.Description>
        </Card.Header>
      </Card>
    </div>
  );
}
```

### Adaptação proposta: anexo compacto do chat

O componente abaixo é uma composição específica do projeto, construída com a API
oficial de `Card` e `Button`.

```tsx
import {Button, Card} from "@heroui/react";
import {ArrowDownToLine, File} from "lucide-react";

export function ChatAttachmentCard({
  attachment,
  onOpen,
  onDownload,
}) {
  return (
    <Card
      className="w-full max-w-[280px] flex-row items-center gap-3 p-2"
      variant="secondary"
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-default">
        {attachment.thumbnailUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            src={attachment.thumbnailUrl}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted">
            <File aria-hidden="true" size={18} />
          </span>
        )}
      </div>

      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onOpen}
      >
        <Card.Title className="truncate text-sm">
          {attachment.name}
        </Card.Title>
        <Card.Description className="truncate text-xs">
          {attachment.typeLabel} · {attachment.sizeLabel}
        </Card.Description>
      </button>

      <Button
        isIconOnly
        aria-label={`Descarregar ${attachment.name}`}
        size="sm"
        variant="tertiary"
        onPress={onDownload}
      >
        <ArrowDownToLine aria-hidden="true" size={16} />
      </Button>
    </Card>
  );
}
```

Aplicar em:

- `client/src/components/chat/MessageList/MessageList.jsx`
- Substituir o markup de `.attachment` e `.attachmentVisual`.
- Preservar o preview já existente para imagens, vídeos e PDF.

---

## 3. Chip — reações e estados

Fonte: [HeroUI Chip](https://heroui.com/en/docs/react/components/chip).

### Código oficial

```tsx
import {CircleDashed} from "@gravity-ui/icons";
import {Chip} from "@heroui/react";

export function ChipWithIcon() {
  return (
    <Chip color="accent" variant="soft">
      <CircleDashed />
      <Chip.Label>Label</Chip.Label>
    </Chip>
  );
}
```

### Adaptação proposta: reação

`Chip` é informativo. Para uma reação interativa, o controlo clicável deve continuar
a ser um `button` ou `ToggleButton`, com o chip apenas como conteúdo visual.

```tsx
import {Chip} from "@heroui/react";

export function MessageReaction({
  emoji,
  count,
  isSelected,
  onPress,
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`${emoji}, ${count} reações`}
      onClick={onPress}
    >
      <Chip
        color={isSelected ? "accent" : "default"}
        size="sm"
        variant={isSelected ? "soft" : "secondary"}
      >
        <Chip.Label>{emoji} {count}</Chip.Label>
      </Chip>
    </button>
  );
}
```

Aplicar em:

- `client/src/components/chat/MessageList/MessageList.jsx`
- Bloco `message.reactions`.

---

## 4. Toolbar — ações que aparecem sobre a mensagem

Fonte: [HeroUI Toolbar](https://heroui.com/en/docs/react/components/toolbar).

### Código oficial: toolbar attached

```tsx
import {Bold, Copy, Italic, Scissors, Underline} from "@gravity-ui/icons";
import {
  Button,
  ButtonGroup,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
} from "@heroui/react";

export function Attached() {
  return (
    <Toolbar isAttached aria-label="Text formatting">
      <ToggleButtonGroup aria-label="Text style" selectionMode="multiple">
        <ToggleButton isIconOnly aria-label="Bold" id="bold">
          <Bold />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label="Italic" id="italic">
          <ToggleButtonGroup.Separator />
          <Italic />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label="Underline" id="underline">
          <ToggleButtonGroup.Separator />
          <Underline />
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator />
      <ButtonGroup variant="tertiary">
        <Button isIconOnly aria-label="Copy">
          <Copy />
        </Button>
        <Button isIconOnly aria-label="Cut">
          <ButtonGroup.Separator />
          <Scissors />
        </Button>
      </ButtonGroup>
    </Toolbar>
  );
}
```

### Adaptação proposta: toolbar da mensagem

```tsx
import {Button, ButtonGroup, Separator, Toolbar} from "@heroui/react";
import {Ellipsis, Forward, Reply, SmilePlus} from "lucide-react";

export function MessageActionToolbar({
  onReact,
  onReply,
  onForward,
  onMore,
}) {
  return (
    <Toolbar isAttached aria-label="Ações da mensagem">
      <ButtonGroup variant="tertiary">
        <Button isIconOnly aria-label="Adicionar reação" onPress={onReact}>
          <SmilePlus aria-hidden="true" size={16} />
        </Button>
        <Button isIconOnly aria-label="Responder" onPress={onReply}>
          <ButtonGroup.Separator />
          <Reply aria-hidden="true" size={16} />
        </Button>
        <Button isIconOnly aria-label="Encaminhar" onPress={onForward}>
          <ButtonGroup.Separator />
          <Forward aria-hidden="true" size={16} />
        </Button>
      </ButtonGroup>
      <Separator />
      <Button isIconOnly aria-label="Mais ações" variant="tertiary" onPress={onMore}>
        <Ellipsis aria-hidden="true" size={16} />
      </Button>
    </Toolbar>
  );
}
```

Aplicar em:

- `client/src/components/chat/MessageList/MessageList.jsx`
- Substituir a estrutura visual de `.hoverActions`.
- A navegação por teclado passa a ser responsabilidade do `Toolbar`.

---

## 5. Dropdown — menu de ações

Fonte: [HeroUI Dropdown](https://heroui.com/en/docs/react/components/dropdown).

### Código oficial

```tsx
"use client";

import {Button, Dropdown, Label} from "@heroui/react";

export function Default() {
  return (
    <Dropdown>
      <Button aria-label="Menu" variant="secondary">
        Actions
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => console.log(`Selected: ${key}`)}>
          <Dropdown.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Dropdown.Item>
          <Dropdown.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </Dropdown.Item>
          <Dropdown.Item id="edit-file" textValue="Edit file">
            <Label>Edit file</Label>
          </Dropdown.Item>
          <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
            <Label>Delete file</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
```

### Adaptação proposta: menu da mensagem

```tsx
import {Dropdown, Header, Kbd, Label, Separator} from "@heroui/react";

export function MessageActionsMenu({isOwn, onAction}) {
  return (
    <Dropdown.Popover>
      <Dropdown.Menu aria-label="Mais ações da mensagem" onAction={onAction}>
        <Dropdown.Section>
          <Header>Mensagem</Header>
          <Dropdown.Item id="copy" textValue="Copiar">
            <Label>Copiar</Label>
            <Kbd slot="keyboard" variant="light">
              <Kbd.Abbr keyValue="command" />
              <Kbd.Content>C</Kbd.Content>
            </Kbd>
          </Dropdown.Item>
          <Dropdown.Item id="reply" textValue="Responder">
            <Label>Responder</Label>
          </Dropdown.Item>
          <Dropdown.Item id="forward" textValue="Encaminhar">
            <Label>Encaminhar</Label>
          </Dropdown.Item>
        </Dropdown.Section>

        {isOwn ? (
          <>
            <Separator />
            <Dropdown.Item id="edit" textValue="Editar">
              <Label>Editar</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete" textValue="Eliminar" variant="danger">
              <Label>Eliminar</Label>
            </Dropdown.Item>
          </>
        ) : null}
      </Dropdown.Menu>
    </Dropdown.Popover>
  );
}
```

Aplicar em:

- `client/src/components/chat/MessageList/MessageList.jsx`
- `client/src/components/chat/ConversationActions/ConversationActions.jsx`
- `client/src/components/chat/ChatWindow/ChatWindow.jsx`

---

## 6. Popover — notificações, perfis e conteúdo rico

Fonte: [HeroUI Popover](https://heroui.com/en/docs/react/components/popover).

### Anatomia oficial

```tsx
import { Popover } from '@heroui/react';

export default () => (
  <Popover>
    <Popover.Trigger/>
    <Popover.Content>
      <Popover.Arrow />
      <Popover.Dialog>
        <Popover.Heading/>
      </Popover.Dialog>
    </Popover.Content>
  </Popover>
)
```

### Código oficial com seta

```tsx
import {Ellipsis} from "@gravity-ui/icons";
import {Button, Popover} from "@heroui/react";

export function PopoverWithArrow() {
  return (
    <Popover>
      <Button isIconOnly variant="tertiary">
        <Ellipsis />
      </Button>
      <Popover.Content className="max-w-64" offset={10}>
        <Popover.Dialog>
          <Popover.Arrow />
          <Popover.Heading>Popover with Arrow</Popover.Heading>
          <p className="mt-2 text-sm text-muted">
            The arrow shows which element triggered the popover.
          </p>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
```

Comportamentos oficiais relevantes:

- `placement`: `top`, `bottom`, `left`, `right` e variantes.
- `offset`: `8` por defeito.
- `shouldFlip`: `true` por defeito.
- Conteúdo renderizado num portal.

Aplicar em:

- Preferências de notificações em `ChatWindow`.
- Perfil resumido ao clicar num avatar.
- Detalhes de reações.
- Popup de anexos quando tiver conteúdo rico.

---

## 7. ScrollShadow — indicação de conteúdo deslocável

Fonte: [HeroUI ScrollShadow](https://heroui.com/en/docs/react/components/scroll-shadow).

### Código oficial

```tsx
import {ScrollShadow} from "@heroui/react";

export default function Default() {
  return (
    <div className="w-full p-0 sm:max-w-sm">
      <ScrollShadow className="max-h-[240px] p-4">
        <div className="space-y-4">
          {Array.from({length: 10}).map((_, idx) => (
            <p key={`scroll-shadow-content-${idx}`}>
              Scrollable content
            </p>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}
```

### Adaptação proposta

```tsx
import {ScrollShadow} from "@heroui/react";

export function ChatMessageScroller({children}) {
  return (
    <ScrollShadow
      className="min-h-0 flex-1"
      orientation="vertical"
      size={28}
    >
      {children}
    </ScrollShadow>
  );
}
```

Aplicar em:

- Lista principal de mensagens.
- Lista de conversas.
- Menu de encaminhamento.
- Seleção de membros.

---

## 8. Skeleton — loading com a forma do conteúdo

Fonte: [HeroUI Skeleton](https://heroui.com/en/docs/react/components/skeleton).

### Código oficial: itens de lista

```tsx
import {Skeleton} from "@heroui/react";

export function List() {
  return (
    <div className="w-full max-w-sm space-y-4">
      {Array.from({length: 3}).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Adaptação proposta: mensagens

```tsx
import {Skeleton} from "@heroui/react";

export function MessageListSkeleton() {
  return (
    <div aria-label="A carregar mensagens" className="space-y-4">
      <div className="flex items-end gap-2">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-14 w-3/5 rounded-xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/5 rounded-xl" />
      </div>
      <div className="flex items-end gap-2">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-20 w-4/5 rounded-xl" />
      </div>
    </div>
  );
}
```

Para dark mode, a documentação permite configurar:

```css
.dark, [data-theme="dark"] {
  --skeleton-animation: pulse;
}
```

---

## 9. Toast — upload, sucesso e erro

Fonte: [HeroUI Toast](https://heroui.com/en/docs/react/components/toast).

### Setup oficial

```tsx
import { Toast, Button, toast } from '@heroui/react';

function App() {
  return (
    <div>
      <Toast.Provider />
      <Button onPress={() => toast("Simple message")}>
        Show toast
      </Button>
    </div>
  );
}
```

### API oficial para promises

```tsx
import { toast } from '@heroui/react';

toast.promise(
  uploadFile(),
  {
    loading: "Uploading file...",
    success: (data) => `File ${data.filename} uploaded`,
    error: "Failed to upload file",
  }
);
```

### Adaptação proposta

```tsx
toast.promise(
  uploadChatAttachment(file),
  {
    loading: `A enviar ${file.name}…`,
    success: `${file.name} foi enviado`,
    error: `Não foi possível enviar ${file.name}`,
  },
);
```

Não substituir erros inline do composer por toasts. Usar toast para:

- Confirmação de upload.
- Confirmação de cópia de link.
- Confirmação de encaminhamento.
- Falhas globais sem campo específico onde mostrar o erro.

---

## 10. Tooltip — descoberta dos controlos por ícone

Fonte: [HeroUI Tooltip](https://heroui.com/en/docs/react/components/tooltip).

### Código oficial com seta

```tsx
import {Button, Tooltip} from "@heroui/react";

export function TooltipWithArrow() {
  return (
    <Tooltip delay={0}>
      <Button variant="secondary">With Arrow</Button>
      <Tooltip.Content showArrow>
        <Tooltip.Arrow />
        <p>Tooltip with arrow indicator</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
```

### Adaptação proposta

```tsx
import {Button, Tooltip} from "@heroui/react";
import {Paperclip} from "lucide-react";

export function AttachmentButton({onPress}) {
  return (
    <Tooltip delay={500}>
      <Button
        isIconOnly
        aria-label="Anexar ficheiros"
        variant="tertiary"
        onPress={onPress}
      >
        <Paperclip aria-hidden="true" size={18} />
      </Button>
      <Tooltip.Content showArrow placement="top">
        <Tooltip.Arrow />
        <p>Anexar ficheiros</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
```

Aplicar aos botões:

- Anexar.
- Emoji.
- Preferências de notificações.
- Responder.
- Encaminhar.
- Mais ações.
- Fechar.

---

## 11. Composição recomendada por ficheiro

| Ficheiro atual | Componentes HeroUI |
| --- | --- |
| `MessageList/MessageList.jsx` | `Card`, `Chip`, `Toolbar`, `Dropdown`, `ScrollShadow`, `Skeleton`, `Tooltip` |
| `MessageComposer/MessageComposer.jsx` | `Button`, `Popover`, `Tooltip`, `Toast` |
| `ChatWindow/ChatWindow.jsx` | `Popover`, `Dropdown`, `Tooltip` |
| `ConversationActions/ConversationActions.jsx` | `Dropdown` |
| `ConversationList/ConversationList.jsx` | `ScrollShadow`, `Skeleton` |
| `ChatPanel/ChatPanel.jsx` | `Tabs`, `ScrollShadow`, `Skeleton` |

## 12. Ordem de implementação

### Fase 0 — migração obrigatória

- [ ] Criar branch dedicada.
- [ ] Atualizar React e React DOM para 19+.
- [ ] Validar bibliotecas incompatíveis com React 19.
- [ ] Instalar/configurar Tailwind CSS v4.
- [ ] Instalar `@heroui/react` e `@heroui/styles`.
- [ ] Importar `tailwindcss` antes de `@heroui/styles`.
- [ ] Executar smoke test com `Button`.

### Fase 1 — baixo risco

- [ ] Introduzir `Tooltip` nos botões por ícone.
- [ ] Introduzir `ScrollShadow` nas listas.
- [ ] Introduzir `Skeleton` no carregamento.
- [ ] Introduzir `Toast.Provider` e feedback de upload.

### Fase 2 — mensagens

- [ ] Converter anexos para `Card`.
- [ ] Converter reações para apresentação baseada em `Chip`.
- [ ] Converter barra de ações para `Toolbar`.

### Fase 3 — overlays

- [ ] Converter menus de mensagem para `Dropdown`.
- [ ] Converter notificações e perfis para `Popover`.
- [ ] Remover posicionamento manual apenas depois de validar portal, flip e foco.

## 13. Critérios de aceitação

- Todos os controlos por ícone mantêm `aria-label`.
- Toolbar é navegável por teclado.
- Dropdown fecha com `Escape` e devolve foco ao trigger.
- Popover faz flip quando não existe espaço.
- Anexos mostram nome truncado sem perder o nome acessível.
- Reações expõem `aria-pressed`.
- Skeleton respeita `prefers-reduced-motion`.
- Toast não substitui erros junto ao campo onde a ação ocorreu.
- O chat mantém as funcionalidades atuais de resposta, encaminhamento, edição,
  eliminação, preview, download e retry.
- O hot reload continua a ser o método de validação local; não executar build salvo
  pedido explícito ou validação de release.

## 14. Decisão antes de implementar

A integração direta não é uma alteração apenas visual. Ela introduz React 19,
Tailwind CSS v4 e uma nova biblioteca de componentes no projeto.

Antes de começar, aprovar uma destas opções:

1. **Migração completa para HeroUI v3** — seguir todas as fases deste documento.
2. **PoC isolada** — implementar primeiro uma única superfície do chat numa rota ou
   componente experimental.
3. **Manter stack atual** — usar este documento apenas como referência de padrões.

