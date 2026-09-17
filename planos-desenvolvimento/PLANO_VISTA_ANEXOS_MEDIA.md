# PLANO — Vista "Anexos" (Media view) ao estilo PLANKA Pro

Objetivo: replicar a vista `media` do PLANKA Pro (`pro.demo.planka.cloud`) — uma
grelha masonry com todos os anexos do board, com lightbox, filtros por tipo e
atalho para o card de origem.

## 1. O que o Pro faz (investigação feita no bundle do demo)

Enum e ícone (client):

```
BoardViews  = { KANBAN, GRID, LIST, CALENDAR, TIMELINE, MAP, MEDIA:'media' }
BoardViewIcons[BoardViews.MEDIA] = 'images'
```

O componente chama-se `MediaContent` e é escolhido em `Board.jsx`:

```
if (view === MEDIA) Content = MediaContent
```

Estrutura de render (reconstruída do bundle minificado):

```
<div class={wrapper}>                       // scroll vertical, padding-left 20px
  <Gallery withCaption withDownloadButton={false} uiElements={downloadMenu} options={...}>
    <Masonry columns={Math.floor(windowWidth / 300)} spacing={20}>
      {attachments.map(a => (
        <div>                                // wrapper exigido pelo Masonry
          <GalleryItem {...galleryProps} original={...} caption={`${nome} — ${card}`}>
            {({ ref, open }) => (
              <div class={tile} role="button" tabIndex={0}
                   title={card ? `${nome} — ${card}` : nome}
                   onClick={openOrNewTab} onKeyDown={Enter/Space}>
                {thumb
                  ? <div class={image} style={{backgroundImage:url(outside360), aspectRatio: w/h}} />
                  : <div class={image imagePlaceholder}><span class={placeholderName}>{nome}</span></div>}
                <div class={bottomOverlay}>
                  <div class={overlayAttachmentName}>{nome}</div>
                  {card && <div class={overlayCardName}>{card}</div>}
                </div>
                <button class={hoverButton hoverButtonLeft}>   // abrir / abrir noutro separador
                  <Icon name={isLink ? 'external square' : 'expand'} />
                </button>
                {cardId && <button class={hoverButton hoverButtonRight}>
                  <Icon name="sticky note outline" />           // ir para o card
                </button>}
              </div>
            )}
          </GalleryItem>
        </div>
      ))}
    </Masonry>
  </Gallery>
  <BoardMobileBar />
</div>
```

Comportamento por tipo:
- `type === LINK` → clique abre `window.open(url, '_blank', 'noopener,noreferrer')`, nunca lightbox.
- `type === FILE` com `data.image` → lightbox com `thumbnailUrls.inline` (fallback `data.url`).
  **Atenção:** a variante `inline` (e `image.inlineWidth/inlineHeight`) não existe neste
  fork — ver §6. Usar `outside720`, como já faz o `Attachments/Item.jsx`.
- PDF / áudio / CSV / vídeo / texto UTF-8 → conteúdo embebido no lightbox (mesma
  lógica que já existe em `Attachments/Item.jsx`).
- Sem preview → mensagem `common.thereIsNoPreviewAvailableForThisAttachment`.

Estado vazio (confirmado no demo — é o ecrã do screenshot):

```
<div class={emptyState}><div class={emptyStateCard}>
  <Icon name="folder open outline" size="big" />
  <div>No attachments to display</div>
</div></div>
```

Filtro por tipo (aparece na FilterBar só quando `board.view === MEDIA`):
botões `All | Images | Documents | Links | Others`, com ícones
`th large | image | file text | linkify | attach`, guardados em `board.mediaTypeFilter`
(array; vazio = todos). Categorização:

```
LINK                                    -> LINKS
FILE com data.image                     -> IMAGES
FILE cuja extensão pertence a {pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,markdown,
                      rtf,csv,odt,ods,odp,json,xml,html,htm} -> DOCUMENTS
resto                                   -> OTHERS
```

Selector: `selectFilteredAttachmentsForCurrentBoard` percorre os cards filtrados
do board, junta `card.attachments`, deduplica por id, aplica a pesquisa do board
(`board.search`, incluindo o modo regex `/...`, comparando `name` e `data.filename`)
e o `mediaTypeFilter`, e devolve `{ ...attachment.ref, cardId, cardName }`.

Menu de download do lightbox (`uiElements`): botão SVG próprio que, para imagens
com thumbnail, abre um mini-menu com "Download this image" (jpg do thumbnail) e
"Download original image"; para o resto faz download direto. Só é montado se o
utilizador não for guest.

## 2. O que já existe neste repo (nada disto é preciso construir)

- `react-photoswipe-gallery` e `photoswipe` já nas dependências do client.
- `Masonry` em `client/src/lib/custom-ui/components/Masonry` e `useWindowWidth`
  em `client/src/lib/hooks` — já usados por `GridView.jsx` com o mesmo
  `Math.floor(windowWidth / 300)`.
- `client/src/components/attachments/Attachments/Item.jsx` já tem toda a lógica
  de preview por mime-type e de `thumbnailUrls.outside720 / outside360`.
- `client/src/models/Attachment.js` já preenche `data.filename` e `data.extension`.
- **O servidor já envia tudo:** `server/api/controllers/boards/show.js` faz
  `attachment.qm.getByCardIds(cardIds)` e devolve os anexos de todos os cards do
  board em `included.attachments`. Não é preciso endpoint novo.
- `board.view` é estado só do cliente (vem de `defaultView` no fetch), portanto
  trocar de vista não exige alterações no servidor.

## 3. Passos de implementação

### Client

1. `client/src/constants/Enums.js`
   - `BoardViews.MEDIA = 'media'`.
   - novo `MediaTypeFilters = { IMAGES:'images', DOCUMENTS:'documents', LINKS:'links', OTHERS:'others' }`.
2. `client/src/constants/Icons.js` — `[BoardViews.MEDIA]: 'images'`.
3. `client/src/utils/categorise-attachment.js` (novo) — `DOCUMENT_EXTENSIONS` +
   `categoriseAttachment(attachment)` conforme a tabela acima. Com teste
   `categorise-attachment.test.js` (o repo já testa utils assim).
4. `client/src/models/Board.js` — método `getFilteredAttachmentsModelArray()`:
   itera `getFilteredCardsModelArray()`, junta `cardModel.attachments.toModelArray()`,
   deduplica, aplica `this.search` (nome/filename, com suporte a regex) e
   `this.mediaTypeFilter`.
   Adicionar também o campo `mediaTypeFilter` (default `[]`) ao model/reducer,
   limpo no fetch do board tal como `search`.
5. `client/src/selectors/boards.js` — `selectFilteredAttachmentsForCurrentBoard`,
   mapeando para `{ ...ref, cardId, cardName }`; exportar no índice de selectors.
6. `client/src/entry-actions` + `actions` — `updateMediaTypeFilterInCurrentBoard`
   (mesmo padrão do `search`/`updateViewInCurrentBoard`, só estado local).
7. `client/src/components/boards/Board/MediaView.jsx` + `.module.scss` (novo) —
   o componente descrito em §1. O SCSS pode ser copiado quase 1:1 do Pro
   (classes `wrapper / tile / image / imagePlaceholder / placeholderName /
   bottomOverlay / overlayAttachmentName / overlayCardName / hoverButton(+Left/Right) /
   emptyState / emptyStateCard / emptyStateIcon / emptyStateText`); os valores
   exactos estão em §4.
   Reaproveitar a lógica de preview extraindo-a de `Attachments/Item.jsx` para
   `client/src/utils/attachment-gallery-props.js` em vez de duplicar.
8. `client/src/components/boards/Board/Board.jsx` — `if (board.view === BoardViews.MEDIA) Content = MediaView;`
   antes do switch por contexto.
9. `client/src/components/boards/BoardActions/RightSide/RightSide.jsx` —
   acrescentar `BoardViews.MEDIA` ao array `views` (hoje só tem KANBAN neste fork;
   no Pro é `push(MEDIA)` para todos os contextos excepto `recurring`).
10. `client/src/components/boards/BoardActions/Filters.jsx` — renderizar a linha
    de botões `All/Images/Documents/Links/Others` apenas quando
    `board.view === BoardViews.MEDIA`.
11. Traduções em `client/src/locales/*/core.js` (pt-PT, en-US, es-ES, fr-FR):
    `common.noAttachmentsToDisplay`, `common.images`, `common.documents`,
    `common.links`, `common.others`, `common.all`, `common.openCard`,
    `common.open`, `common.openInNewTab`, `action.downloadThisImage`,
    `action.downloadOriginalImage`.

### Server (opcional — só se a vista puder ser guardada como vista por omissão do board)

12. `server/api/models/Board.js` — `Views.MEDIA = 'media'`. O `isIn` de
    `defaultView` em `controllers/boards/update.js` deriva daqui, não precisa de
    mudança própria. Sem isto a vista funciona na mesma, mas não persiste como
    `defaultView` (é escolha por sessão).

## 4. CSS extraído do Pro (referência exacta)

```scss
.wrapper { overflow: hidden scroll; padding-left: 20px;
  padding-bottom: var(--board-mobile-bar-height, 0); scrollbar-gutter: stable; width: 100%; }

.tile { background: var(--surface-view-wash); backdrop-filter: blur(4px);
  border-radius: 5px; cursor: pointer; outline: none; overflow: hidden; padding: 8px;
  position: relative; transition: background .12s, transform .12s;
  &:hover { background: var(--alpha-shadow-18-6); }
  &:focus-visible { outline: 2px solid var(--alpha-shadow-40); outline-offset: 2px; } }

.image { aspect-ratio: 16/9; background: center/cover no-repeat; border-radius: 3px;
  max-height: 310px; position: relative; width: 100%; }
.imagePlaceholder { align-items: center; background: var(--alpha-navy-3);
  display: flex; justify-content: center; padding: 12px; }
.placeholderName { color: var(--slate-blue-400); font-size: 14px; font-weight: 600;
  line-height: 1.35; max-width: 100%; overflow: hidden; text-align: center;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; word-break: break-word; }

.bottomOverlay { background: linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.72) 70%, rgba(0,0,0,0));
  bottom: 8px; left: 8px; right: 8px; padding: 24px 12px 8px; color: #fff;
  pointer-events: none; position: absolute; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
.overlayAttachmentName { font-size: 13px; font-weight: 700; line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overlayCardName { font-size: 11px; font-weight: 400; line-height: 1.3; margin-top: 2px;
  opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.hoverButton { align-items: center; background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  border: none; border-radius: 4px; color: #fff; cursor: pointer; display: inline-flex;
  font-size: 14px; height: 28px; width: 28px; justify-content: center; opacity: 0;
  outline: none; padding: 0; position: absolute; top: 14px;
  transition: opacity .12s, background .12s; z-index: 2;
  &:hover { background: rgba(0,0,0,.78); } }
.hoverButtonLeft { left: 14px; }
.hoverButtonRight { right: 14px; }
.tile:hover .hoverButton, .tile:focus-visible .hoverButton { opacity: 1; }

.emptyState { align-items: center; display: flex; justify-content: center;
  inset: 0 0 auto 0; min-height: 60vh; padding: 40px 20px;
  pointer-events: none; position: absolute; }
.emptyStateCard { align-items: center; background: var(--surface-view-wash, rgba(0,0,0,.24));
  backdrop-filter: blur(6px); border-radius: 8px; color: var(--text-on-accent, #fff);
  display: flex; flex-direction: column; gap: 16px; padding: 32px 40px; text-align: center; }
.emptyStateIcon { opacity: .6; }
.emptyStateText { font-size: 15px; font-weight: 500; letter-spacing: .02em; opacity: .9; }
```

Verificar que as variáveis `--surface-view-wash`, `--alpha-shadow-18-6`,
`--alpha-shadow-40`, `--alpha-navy-3`, `--slate-blue-400`, `--text-on-accent`
existem neste fork; onde não existirem, substituir pelos equivalentes locais.

## 5. Ordem sugerida / faseamento

- **Fase 1 (vista funcional):** passos 1, 2, 7 (sem filtros), 8, 9, 11.
- **Fase 2 (filtros):** passos 3, 4, 5, 6, 10.
- **Fase 3 (extras):** menu de download no lightbox, persistência como
  `defaultView` (passo 12), e `BoardMobileBar` se existir neste fork.

## 6. Diferenças confirmadas entre o Pro e este fork

| Pro | Este fork | Decisão |
|---|---|---|
| `data.thumbnailUrls.inline` + `image.inlineWidth/inlineHeight` no lightbox | `present-one.js` só gera `outside360` e `outside720` | usar `outside720` no lightbox e `outside360` no tile; dimensões de `data.image.width/height` |
| `<BoardMobileBar />` no fim da vista | não existe | omitir (e omitir também o `padding-bottom: var(--board-mobile-bar-height)`) |
| `isAvailableForUser` / roles `GUEST`, `WORKER` | sem guests; só `EDITOR`/`VIEWER` | o gate de download passa a ser "tem membership" |
| `getFilteredCardsModelArrayAvailableForMember(member, contextCards)` | `getFilteredCardsModelArray()` sem parâmetros | usar a assinatura local |
| Classes `.filterButtonActive` e `.groupToggle` na FilterBar | só existem `.filterButton`, `.filterButtonClickable`, `.filterLabel`, `.filterLabelIcon` | acrescentar as duas classes ao `Filters.module.scss` (CSS do Pro abaixo) |

CSS das duas classes em falta na FilterBar:

```scss
.groupToggle { /* no bar normal não tem regras próprias; só no modo empilhado */ }
.filterButtonActive .filterLabel {
  background: var(--alpha-shadow-50);
  box-shadow: inset 0 0 0 1px var(--alpha-highlight-79);
  color: var(--bar-fg, var(--text-primary));
  &:hover { background: var(--alpha-shadow-60); }
}
```

## 7. Notas

- O layout preenchido foi primeiro reconstruído a partir do bundle JS e do CSS em
  runtime e depois confirmado visualmente com anexos reais — ver §8.
- Não há custo de rede: os anexos já vêm no payload do board.

## 8. Validação visual no demo (com anexos reais)

Foram carregados no demo 13 anexos de teste (5 imagens com rácios diferentes,
5 ficheiros não-imagem, e 3 imagens num segundo card) para ver a vista preenchida.
Confirmado:

- **Colunas**: `floor(windowWidth / 300)` — a 1440px dá 4 colunas, como esperado.
- **Rácio**: o tile usa o rácio real da imagem via `style.aspectRatio`, e não o
  `16/9` do CSS (esse é só o fallback). O `max-height: 310px` corta imagens muito
  verticais — a 900x1600 aparece cortada em cima e em baixo por causa do
  `background-size: cover`.
- **Hover**: os dois botões aparecem mesmo — canto superior esquerdo `expand`
  (abre lightbox), canto superior direito `sticky note outline` (vai ao card).
- **Lightbox**: photoswipe normal, com contador `2 / 13` no canto superior esquerdo.
- **Filtros**: a linha `All | Images | Documents | Links | Others` aparece numa
  segunda linha da FilterBar, com `All` activo por omissão. `.pdf .txt .csv .json`
  caíram em Documents e o `.zip` em Others — a categorização de §1 está correcta.
- **Nome mostrado**: é o `attachment.name`, que o Planka gera a partir do nome do
  ficheiro (hífenes viram espaços, extensão removida) — `test-wide-16-9-1600x900.png`
  aparece como `Test wide 16 9 1600x900`. Não é o `data.filename`.

### Problema encontrado no design do Pro (vale a pena NÃO copiar)

Os tiles de ficheiros não-imagem ficam maus: o `--alpha-navy-3` é translúcido, por
isso o fundo do board aparece por baixo e o nome centrado (`.placeholderName`) fica
quase ilegível. Pior, o mesmo nome aparece logo a seguir no `.bottomOverlay`, ou
seja está duplicado — uma vez ilegível e outra legível.

Sugestão para este fork: no placeholder, trocar o nome centrado por um **ícone do
tipo de ficheiro** (o repo já tem `client/src/utils/fileTypeUtils.js`) sobre um
fundo opaco, e deixar o nome só no overlay de baixo.

## 9. Estado — Fase 1 implementada

Ficheiros alterados/criados:

- `client/src/constants/Enums.js` — `BoardViews.MEDIA`.
- `client/src/constants/Icons.js` — `[BoardViews.MEDIA]: 'images'`.
- `client/src/models/Board.js` — `getFilteredAttachmentsModelArray()`.
- `client/src/selectors/boards.js` — `selectFilteredAttachmentsForCurrentBoard`
  (mais a entrada no export por omissão).
- `client/src/components/boards/Board/MediaView.jsx` (novo).
- `client/src/components/boards/Board/MediaView.module.scss` (novo).
- `client/src/components/boards/Board/Board.jsx` — wiring da vista.
- `client/src/components/boards/BoardActions/RightSide/RightSide.jsx` — botão.
- `client/src/locales/{en-US,pt-PT,es-ES,fr-FR}/core.js` — `noAttachmentsToDisplay`,
  `openAttachment`, `openInNewTab`, `openCard`.

Desvios deliberados em relação ao Pro:

- **Cores e estilo mantidos do fork.** O `MediaView.module.scss` usa a mesma
  linguagem visual do `GridView.module.scss` (`rgba(0,0,0,.24)` / `.32`,
  `border-radius: 3px`, `transition ... 85ms ease-in`) em vez das variáveis
  `--surface-view-wash` / `--alpha-*` do Pro, que não existem aqui.
- **Sem `backdrop-filter`**, para não divergir do resto do board.
- **Placeholder com ícone** (`file outline` / `linkify`) em vez do nome do ficheiro
  centrado — evita o texto ilegível e duplicado descrito em §8.
- **Lightbox usa `outside720`**, já que não há variante `inline` neste fork (§6).
- **A pesquisa filtra cards, não anexos.** O Pro aplica a pesquisa às duas coisas
  em AND, o que torna a pesquisa quase inútil na vista; aqui os anexos vêm dos
  cards já filtrados.
- Vista disponível apenas no contexto `BOARD`, a par do Kanban.

Fica para a Fase 2: `MediaTypeFilters`, `board.mediaTypeFilter`, a acção
`updateMediaTypeFilterInCurrentBoard` e a linha de botões na `Filters.jsx`.

### Ajustes após validação no dev

Com dados reais do `quadro teste` (47 anexos) apareceram duas coisas a corrigir,
já aplicadas:

- **Thumbnails de vídeo.** A primeira versão só usava `thumbnailUrls` quando
  existia `data.image`, por isso os `.mp4` caíam todos em placeholder apesar de
  este servidor gerar thumbnails de vídeo (`present-one.js` gera-os a partir de
  `data.video.thumbnails`). Agora o tile usa `thumbnailUrls.outside360` seja qual
  for o tipo, e o rácio vem de `data.image` ou de `data.video`.
- **Vídeo no lightbox.** Passa a reutilizar o `common/VideoPlayer` já existente,
  com poster a partir do thumbnail, em vez de dizer que não há pré-visualização.
- O fundo do placeholder subiu de `rgba(0,0,0,.32)` para `.62` — a `.32` o fundo
  do board aparecia por baixo e o ícone quase não se via, o mesmo defeito
  apontado em §8.

Vídeos sem thumbnail gerado (processamento ainda não corrido) continuam, e devem
continuar, a mostrar o placeholder com ícone de vídeo.

## 10. Estado — Fase 2 implementada

Filtros por tipo de anexo, visíveis na FilterBar apenas quando
`board.view === BoardViews.MEDIA`.

Ficheiros novos:

- `client/src/utils/categorise-attachment.js` + `categorise-attachment.test.js`.

Ficheiros alterados:

- `client/src/constants/Enums.js` — `MediaTypeFilters`.
- `client/src/constants/ActionTypes.js` — `MEDIA_TYPE_FILTER_IN_BOARD_UPDATE`.
- `client/src/constants/EntryActionTypes.js` — `MEDIA_TYPE_FILTER_IN_CURRENT_BOARD_UPDATE`.
- `client/src/actions/boards.js` — `updateMediaTypeFilterInBoard`.
- `client/src/entry-actions/boards.js` — `updateMediaTypeFilterInCurrentBoard`.
- `client/src/sagas/core/services/boards.js` — serviço + entrada no export por omissão.
- `client/src/sagas/core/watchers/boards.js` — `takeEvery` do entry action.
- `client/src/models/Board.js` — campo `mediaTypeFilter` (default `[]`, reposto no
  fetch tal como o `search`), caso no reducer, e aplicação do filtro em
  `getFilteredAttachmentsModelArray()`.
- `client/src/components/boards/BoardActions/Filters.jsx` — linha de chips.
- `client/src/components/boards/BoardActions/Filters.module.scss` — `.filterButtonActive`
  e espaçamento do `.filterLabelIcon`.
- `client/src/locales/*/core.js` — `images`, `videos`, `documents`, `links`
  (`all` e `others` já existiam).

### Desvio: existe um chip "Vídeos"

O Pro tem quatro chips (`Images / Documents / Links / Others`) e os vídeos caem
em "Others", porque no Pro a categoria de imagem depende de `data.image`. Neste
fork os vídeos são de primeira classe (thumbnails, `VideoPlayer`, streaming), por
isso juntá-los a "Others" seria enganador e metê-los em "Images" seria errado no
nome. Ficaram com chip próprio, `film`, entre Images e Documents.

### Validado no dev

No `quadro teste`: 47 anexos com "Todos"; a filtrar por Vídeos → 9; Vídeos +
Documentos (selecção múltipla) → 15. O chip activo fica com fundo mais escuro e
um contorno interior de 1px.

Nota: a primeira tentativa falhou porque o serviço novo não estava listado no
`export default` de `sagas/core/services/boards.js` — o watcher rebentava com
`services.updateMediaTypeFilterInCurrentBoard is not a function`. Corrigido.
