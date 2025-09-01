# Plano de Redesign – Modal de Notificações (Sino) e Tema Global "Liquid Glass"

## Objetivo
Aplicar um novo visual ao modal de notificações (ícone do sino), inspirado na imagem enviada: tema escuro, cartões arredondados com sombras suaves, hierarquia tipográfica clara e badge do sino com gradiente.

## Escopo (apenas UI)
- Sem mudanças em backend/sagas/APIs.
- Manter funcionalidades: abrir/fechar popup, apagar item, apagar tudo, navegar para o cartão.

## Onde está no código
- Sino e badge: `client/src/components/common/Header/Header.jsx` + `client/src/components/common/Header/Header.module.scss`
- Conteúdo do popup: `client/src/components/notifications/NotificationsStep/NotificationsStep.jsx`
- Estilos do conteúdo/lista: `client/src/components/notifications/NotificationsStep/NotificationsStep.module.scss`
- Item de notificação: `client/src/components/notifications/NotificationsStep/Item.jsx` + `client/src/components/notifications/NotificationsStep/Item.module.scss`
- Popup base (wrapper): `client/src/lib/popup/use-popup.jsx` e `client/src/lib/popup/Popup.module.css`

## Fase A — Tema Global "Liquid Glass" (Popups e Modais)

### Novos ficheiros
- `client/src/styles/glass-theme.css`: variáveis de tema (cores, sombras, blur) e utilitários `.glass-panel`, `.glass-scroll`, `.glass-ghost-button`, `.glass-card`.
- `client/src/styles/glass-modal.css`: regras para `.ui.modal.glass` e `.ui.basic.modal.glass` (fundo translúcido, blur, borda e sombra).

### Alterações
- `client/src/index.js`: importar `./styles/glass-theme.css` e `./styles/glass-modal.css`.
- `client/src/lib/popup/Popup.module.css`: criar `.glass` (container genérico com blur, borda e sombra) além de `.notifications`.
- `client/src/lib/popup/use-popup.jsx`: definir `variantClass` padrão `'glass'` e aceitar também classe global (fallback direto ao valor recebido).
- `client/src/hooks/use-closable-modal.jsx`: acrescentar classe `'glass'` ao `Modal` (preserva qualquer `className` já passado).

### Validação
- Testar popups: notificações, utilizador, ações de listas/labels/filters.
- Testar modais: cartões, projetos, boards, administração, definições.

---

## Fase B — Notificações (escopo já iniciado)

### Ficheiros-alvo e alterações
1) `Header.module.scss`
   - Redesenhar `.notification` (badge): gradiente, raio 10px, sombra, posição.
   - Adicionar `.notificationsPopup` para estilizar SOMENTE o container do popup das notificações (largura, raio, sombra, fundo/borda).

2) `Header.jsx`
   - Passar classe específica para o popup: `usePopup(NotificationsStep, { position: 'bottom right', className: styles.notificationsPopup })`.

3) `use-popup.jsx`
   - Aceitar `className` nas opções e mesclar com a classe padrão do wrapper do `SemanticUIPopup` (não impactar outros popups).

4) `NotificationsStep.jsx`
   - Envolver conteúdo em `div` container para padding/tema.
   - (Opcional) Cabeçalho interno com título e ação ("Dispensar tudo"/"Ver tudo").

5) `NotificationsStep.module.scss`
   - Estilos do container, lista com scroll fino, cabeçalho interno e botão ghost/link.

6) `Item.module.scss`
   - Cartão do item: fundo escuro (#12161c–#0c0f14), raio 14–16px, sombra leve, borda translúcida; hover com brilho/outline; autor com maior contraste; timestamp à direita; botão apagar discreto e visível no hover.

7) (Opcional) `Item.jsx`
   - Adicionar wrappers/classes auxiliares caso necessário para posicionamento do timestamp/ações sem alterar a lógica.

## Tokens de estilo sugeridos
- Container do popup: fundo `#0e1117`, borda `1px solid rgba(255,255,255,0.06)`, sombra `0 8px 24px rgba(0,0,0,0.4)`, raio `18–20px`, largura `380–400px`.
- Item: fundo `#141922`, raio `16px`, hover com outline gradiente `rgba(139,92,246,.45) → rgba(59,130,246,.35)`.
- Tipografia: título/autor `#e6edf3`; secundário `rgba(230,237,243,0.7)`; timestamp `rgba(230,237,243,0.55)`.
- Acento (links/botões): roxo `#7c3aed` ou azul `#3b82f6` (decidir).
- Badge: gradiente `135deg, #7c3aed 0%, #3b82f6 100%`; raio 10px; fonte 12–13px; sombra suave.

## Fases de implementação
### Fase A – Tema global (popups e modais)
- [ ] Criar `glass-theme.css` e `glass-modal.css`.
- [ ] Importar em `index.js`.
- [ ] Adicionar `.glass` em `Popup.module.css` e definir `'glass'` como padrão em `use-popup.jsx`.
- [ ] Adicionar classe `'glass'` por padrão aos modais em `use-closable-modal.jsx`.

### Fase B – Notificações (badge e container)
- [ ] Atualizar `.notification` em `Header.module.scss`.
- [ ] Alterar `use-popup.jsx` para receber `className`.
- [ ] Passar `className: styles.notificationsPopup` no `Header.jsx`.
- [ ] Estilos de `.notificationsPopup` (raio, largura, fundo, sombra, borda).

### Fase B2 – Lista e cartão do item
- [ ] Ajustar `NotificationsStep.module.scss` (container, scroll, espaçamentos).
- [ ] Redesenhar `Item.module.scss` (cartão, hover, tipografia, timestamp, botão apagar no hover).
- [ ] Ajustes mínimos em `Item.jsx` se necessário (sem alterar lógica).

### Fase B3 – Cabeçalho interno
- [ ] Cabeçalho com "Notificações" à esquerda e ação à direita ("Dispensar tudo"/"Ver tudo").
- [ ] Estilo de botão/ligação ghost, mantendo i18n.

### Fase C – Polimento e responsividade
- [ ] Transitions 120–200ms.
- [ ] Testes em 320–375px (quebras, scroll, tap alvo).
- [ ] Ajustes de contraste AA onde necessário.

### Fase D – Testes manuais
- [ ] Abrir/fechar, apagar item, dispensar tudo, navegar para cartão.
- [ ] Confirmar que outros popups não foram afetados.
- [ ] Verificar performance do scroll.

## Critérios de aceitação
- [ ] Visual escuro com cartões arredondados e sombra suave.
- [ ] Badge do sino redesenhado com gradiente e contagem correta.
- [ ] Todas ações funcionam e sem regressões.
- [ ] Responsivo e acessível.
 - [ ] Todos os popups e modais usam o tema "liquid glass" com boa legibilidade.

---

## Guia de Implementação – Liquid Glass (CSS)

Objetivo: padronizar o efeito vidro líquido em todos os popups/modais usando camadas, blur e sombras, mantendo boa legibilidade.

### Estratégia
- Camadas (elemento + ::before + ::after) para profundidade e refração
- Backdrop filters (blur) para desfocar o que está atrás
- Opacidades e sombras equilibradas para contraste e leveza
- (Opcional) Distorção via SVG para granularidade orgânica

### Passo 1: Estrutura base
```css
.glass-card {
  position: relative;
  border-radius: 20px;
  isolation: isolate;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0px 6px 24px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

### Passo 2: Sombra interna e tinte
```css
.glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 20px;
  box-shadow: inset 0 0 20px -5px rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
}
```

### Passo 3: Backdrop blur e (opcional) distorção
```css
.glass-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 28px;
  backdrop-filter: blur(8px);
  filter: url(#glass-distortion);
  isolation: isolate;
}
```

### Passo 4: Filtro SVG opcional
```html
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute; overflow:hidden">
  <defs>
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
      <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
      <feDisplacementMap in="SourceGraphic" in2="blurred" scale="77" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  </svg>
```

### Guia de customização
- Blur: ajuste `backdrop-filter: blur(1px–30px)` conforme o caso
- Borda: controle a opacidade `rgba(..., 0–0.5)`
- Raio: alinhar ao design system (8px–32px)
- Sombras: varie `box-shadow` (desfoque e spread) conforme profundidade desejada

Observação: estes estilos podem ser incorporados em `client/src/styles/glass-theme.css` como utilitários e aplicados às superfícies dos modais/popups (ex.: adicionar `.glass-card` no container do conteúdo), mantendo tokens do tema para cores e opacidades.

## Riscos e mitigação
- Impacto global no Popup: mitigado com `className` específico no sino.
- Contraste/acessibilidade: validar tokens e ajustar opacidades.
- Layouts pequenos: reduzir largura do container; validar breakpoints.

## Rollback rápido
- Reverter suporte a `className` em `use-popup.jsx` e remoção do parâmetro no `Header.jsx`.
- Reverter mudanças de SCSS (`Header.module.scss`, `NotificationsStep.module.scss`, `Item.module.scss`).

## Referências no código
- Sino e badge: `Header.jsx` / `Header.module.scss`
- Modal e lista: `NotificationsStep.jsx` / `NotificationsStep.module.scss`
- Item: `Item.jsx` / `Item.module.scss`
- Popup base: `use-popup.jsx` / `Popup.module.css`

### Decisão pendente
Definir a cor de acento principal: roxo (`#7c3aed`) ou azul (`#3b82f6`).
