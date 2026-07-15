# Decisões do chat

Registo leve de decisões arquiteturais. Serve para preservar o contexto que o código, por si só, não explica.

Estados possíveis: `Proposta`, `Aceite`, `Substituída` e `Rejeitada`.

## CHAT-005 — Launcher único e resumo global separado

- Data: 2026-07-15
- Estado: Aceite

### Contexto

Um utilizador pode participar em muitos projetos e não deve ter de os abrir individualmente para descobrir conversas por ler. Carregar todas as conversas completas de todos os projetos aumentaria o estado, o tráfego e o risco de misturar dados parciais com o projeto ativo.

### Decisão

Existe uma única bolha de chat na posição atual. Na homepage abre uma Inbox global; dentro de um projeto abre primeiro o âmbito local e permite mudar para o global. A Inbox guarda resumos autorizados num estado separado de `ChatConversation`.

### Consequências

- O badge principal conta conversas globais não lidas.
- Históricos e participantes completos continuam limitados ao projeto ativo.
- Eventos dirigidos ao utilizador atualizam Inbox e conversa local de forma independente.
- O sino de notificações permanece separado das mensagens.
- A reconexão refaz o snapshot global para recuperar eventos perdidos.

## CHAT-001 — Servidor como fonte de verdade

- Data: 2026-07-13
- Estado: Aceite

### Contexto

O chat recebe operações concorrentes, retries de rede e eventos em várias sessões. Estado exclusivamente otimista pode duplicar mensagens, regredir cursores de leitura ou conservar dados depois de uma revogação.

### Decisão

O servidor é a fonte de verdade para mensagens, permissões, participantes e leitura. O cliente pode antecipar a interface, mas reconcilia o resultado com respostas e broadcasts canónicos.

### Consequências

- Escritas repetíveis precisam de idempotência.
- Cursores de leitura são monotónicos no banco de dados.
- Falhas otimistas exigem rollback ou refetch.
- Reconexão volta a validar acesso e estado.

## CHAT-002 — Autorização por projeto e conversa

- Data: 2026-07-13
- Estado: Aceite

### Contexto

Ser membro global da aplicação não implica acesso a todos os projetos ou a todas as conversas privadas.

### Decisão

Cada operação valida primeiro o `chatMode` e membership do projeto e depois as regras do tipo de conversa. Conversas diretas e grupos personalizados exigem participação explícita.

### Consequências

- Esconder controlos no frontend é apenas UX.
- Subscrições Socket.IO também passam por autorização.
- Alterações de membership devem reconciliar salas e publicar revogação.

## CHAT-003 — Remoção lógica com apresentação sanitizada

- Data: 2026-07-13
- Estado: Aceite

### Contexto

Respostas, ordenação e referências a mensagens beneficiam de conservar a identidade de uma mensagem removida, mas o conteúdo privado não pode continuar no payload.

### Decisão

Mensagens usam `deletedAt`. O presenter devolve `text: null` e remove anexos, reações, previews, estado guardado e contexto de resposta.

### Consequências

- Todo endpoint e broadcast devolve mensagens através do presenter canónico.
- O download de anexos removidos é recusado.
- A interface mostra um marcador neutro de mensagem removida.

## CHAT-004 — Janelas abertas determinam subscrições ativas

- Data: 2026-07-13
- Estado: Aceite

### Contexto

Subscrever todas as conversas indefinidamente aumenta memória e tráfego, enquanto perder a subscrição de uma janela aberta quebra a experiência em tempo real.

### Decisão

Abrir/restaurar uma janela subscreve a sala da conversa; fechar a janela abandona-a. A lista agregada e eventos dirigidos ao utilizador mantêm os contadores e avisos fora dessas salas.

### Consequências

- A reconexão restaura apenas conversas ainda válidas.
- Janelas persistidas são separadas por utilizador e projeto.
- Revogação limpa subscrições, modelos e `localStorage`.

## Modelo para nova decisão

Copiar a estrutura seguinte para o topo das decisões, usando o próximo número sequencial:

```markdown
## CHAT-XXX — Título

- Data: AAAA-MM-DD
- Estado: Proposta

### Contexto

Problema, restrições e alternativas relevantes.

### Decisão

Opção escolhida e motivo.

### Consequências

- Benefícios, custos, riscos e trabalho futuro.
```

Quando uma decisão muda, não apagar a anterior. Marcar como `Substituída` e indicar o identificador da nova decisão.
