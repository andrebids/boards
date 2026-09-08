# Arquivar projetos — plano funcional, UI e implementação

Data: 7 de setembro de 2026  
Estado: implementado e validado em desenvolvimento em 7 de setembro de 2026; sem publicação em produção.

## 1. Objetivo e decisões propostas

Permitir arquivar um projeto diretamente em **Project settings → General**, mesmo quando contém boards. Preservar boards, cartões, anexos, membros, comentários, chat e restantes dados. Permitir encontrar e restaurar os projetos através de um acesso discreto no painel principal apresentado pelo utilizador.

Direção visual: manter o painel atual, os grupos My Own/Team e os cartões existentes. Acrescentar apenas a ação de arquivo e um acesso secundário ao respetivo conteúdo, usando os componentes, fontes, cores e espaçamentos do Planka.

| Tema | Decisão proposta |
| --- | --- |
| Ação principal | Botão **Archive project** no General, acima da Danger Zone |
| Acesso no painel | Link discreto **View archived projects** depois da última secção de projetos |
| Consulta | Modal com pesquisa e lista compacta de projetos arquivados |
| Recuperação | **Restore project** no General e **Restore** em cada linha da lista, conforme permissões |
| Estado | Novo `isArchived`, independente de `isHidden` |
| Primeira versão | Arquivo para organização: retirar da navegação habitual, mantendo o acesso e as permissões de edição existentes |
| Eliminação | Manter a regra atual: só eliminar projetos sem boards |

**Pressuposto explícito:** o pedido define a organização e o UI; não exige bloquear edições. Este plano assume que as boards continuam editáveis por quem já tem essa permissão, incluindo por link direto. Arquivo só de leitura, como no Trello, é uma extensão descrita no final e não deve ser prometida pelo UI desta versão.

## 2. Referência do Trello

A documentação oficial distingue fechar uma board de a eliminar. A ação fica no menu da board; uma board fechada sai da lista habitual, mantém os dados e deixa de poder ser editada. Fonte: [Close a board — Atlassian](https://support.atlassian.com/trello/docs/closing-a-board/).

Para recuperar, a página de boards disponibiliza **View all closed boards**, que pode exigir deslocação até ao fundo da página. Abre uma lista de boards fechadas com a ação **Re-open**, sujeita a permissões. Fonte: [Reopen a closed board — Atlassian](https://support.atlassian.com/trello/docs/reopening-a-closed-board/).

A mesma página inclui capturas do [acesso no painel](https://images.ctfassets.net/zsv3d0ugroxu/4OTYEuy0D6uyDFgUgRG0Jy/d6471ad6753ef1e6d4cd6e8bd604ac25/screenshot_ReopeningAClosedBoard) e da [lista de recuperação](https://images.ctfassets.net/zsv3d0ugroxu/4cre94zpOb2OlxUrVYxr3I/f05683f3c26342990d0771e8f363e596/screenshot_ReopeningAClosedBoard2).

Adaptação proposta para o Planka: aproveitar a localização secundária e o fluxo de recuperação. A referência é sobre boards do Trello; aqui a ação aplica-se ao projeto inteiro. O desenho abaixo é uma proposta para o Planka, não uma reprodução do UI atual do Trello. Pesquisa baseada na documentação pública consultada nesta data; não foi feita uma sessão autenticada no Trello.

## 3. UI — General

Adicionar uma secção **Archive** entre Gantt e Danger Zone. Usar o separador e o estilo de secção já existentes. Botão secundário com ícone de arquivo da biblioteca já usada; reservar o vermelho para Delete.

```text
General
  … configurações existentes …

  Archive
  Remove this project from the main project list and favorites.
  Boards and their contents are kept. Members can still access
  and edit them according to their permissions.

  [ Archive project ]

  ───────────────────────────────────────────────────────────
  Danger Zone
  [ Delete Project ]
  Delete all boards to be able to delete this project
```

### Arquivar

1. O utilizador seleciona **Archive project**.
2. Abrir uma confirmação leve com o padrão existente de confirmação: título **Archive this project?**, nome do projeto e mensagem de que os dados serão mantidos e a alteração se aplica a todos os membros.
3. Ações **Cancel** e **Archive project**. Não exigir escrever o nome do projeto para uma operação reversível.
4. Durante o pedido: desativar a ação e mostrar **Archiving…**; impedir submissões duplicadas.
5. Depois de sucesso confirmado pelo servidor: fechar as definições, regressar ao painel e apresentar **Project archived. Find it in “View archived projects”.**
6. Em caso de erro: manter o contexto, permitir repetir e não apresentar sucesso nem navegar para fora.

A presença de boards nunca desativa Archive. A autorização é validada no servidor e refletida no botão.

### Projeto já arquivado

A mesma secção mostra o estado **Archived** e substitui o botão por **Restore project**. Não renderizar simultaneamente Archive e Restore.

Ao abrir uma board ou projeto arquivado por link ou pela lista, mostrar um aviso compacto no cabeçalho partilhado do projeto: **This project is archived.** A ação **Restore project** aparece apenas a quem pode restaurar. Não usar um aviso que diga “read-only” nesta versão.

## 4. UI — acesso discreto no painel

Colocar um único botão com aparência de link depois de todas as secções da vista atual, alinhado à esquerda com a grelha. Na imagem fornecida, ficará abaixo da última linha de Team, depois de “2027 COLLECTIONS” e do cartão de criação. Nas outras configurações, ficará depois da última secção que estiver efetivamente renderizada.

```text
Search projects…

My Own
[ projeto ] [ projeto ] [ Create project ]

Team
[ projeto ] [ projeto ] [ projeto ]
[ projeto ] [ Create project ]

  [ícone de arquivo] View archived projects
```

Regras visuais e de interação:

- Texto secundário legível, com sublinhado ou realce no hover/foco; sem fundo de cartão, vermelho, contador chamativo ou nova secção permanente na sidebar.
- Espaço vertical aproximado de 24 px depois da grelha, ajustado à escala já usada no projeto.
- Ícone pequeno acompanhado de texto. O acesso não depende de hover nem de conhecer o significado de um ícone isolado.
- Manter o link quando não há projetos ativos, quando a pesquisa do painel não encontra resultados e quando não existem arquivados. Assim o acesso nunca desaparece por causa de um filtro.
- Presente nas vistas Grid e Grouped e também na vista de projetos ocultos. O ícone do olho continua a servir exclusivamente os projetos ocultos.
- Montar o acesso uma vez no componente Home, depois da vista selecionada; não repetir por grupo.
- Não adicionar inicialmente um segundo acesso no topo ou um menu de três pontos só para esta ação. Se o volume real tornar o rodapé difícil de alcançar, avaliar um atalho num menu existente numa revisão posterior.

## 5. UI — lista de projetos arquivados

Reutilizar o modal e os controlos do projeto. Largura de referência: cerca de 640 px, limitada à janela, com lista de scroll interno. Em ecrãs pequenos, usar a largura disponível com margens e adaptar cada linha sem scroll horizontal.

```text
Archived projects                                         [×]

[ Search archived projects…                              ]

[miniatura] TAREFAS 2025/2026              [ Open ] [ Restore ]
            Team
─────────────────────────────────────────────────────────────
[miniatura] Retouch lightmag photos       [ Open ] [ Restore ]
            My Own
```

- Mostrar apenas projetos a que o utilizador continua a ter acesso, incluindo arquivados que também estejam ocultos.
- Lista alfabética pelo nome; pesquisa local no nome, usando a normalização já existente. A pesquisa do modal é independente da pesquisa do painel.
- Nome completo acessível; permitir quebra de linha para nomes longos. Reutilizar a miniatura/fundo do projeto, sem carregar dados adicionais apenas para decoração.
- Grupo ou tipo apresentado segundo as regras existentes. Não mostrar número total de boards sem garantir que esse número respeita as permissões de quem só vê algumas boards.
- **Open** usa a navegação existente e não restaura automaticamente.
- **Restore** executa uma ação direta e reversível, sem segunda confirmação. Durante o pedido, só a linha correspondente fica ocupada.
- Após sucesso, remover a linha, atualizar as listagens e apresentar **Project restored**. Manter o modal aberto para permitir gerir outros projetos.
- Se o projeto era também oculto, preservar esse estado; o feedback deve explicar **Project restored. It remains hidden.**
- Sem permissão para restaurar: manter Open e mostrar uma indicação textual discreta de que a restauração requer um gestor do projeto; não sugerir que um clique concederá acesso.
- Estado vazio: **No archived projects**. Pesquisa sem resultados: **No projects match your search**. Falha de carregamento, se aplicável ao fluxo existente: mensagem e **Retry**.
- Se o último projeto for restaurado, apresentar o estado vazio e manter o fecho disponível.
- Tab percorre pesquisa e ações; Escape fecha; foco contido no modal e devolvido ao link ao fechar. Ao remover uma linha, passar o foco para a linha seguinte ou para o estado vazio, sem o perder.
- Contraste de texto normal de pelo menos 4,5:1; alvos de interação adequados ao toque, de preferência 44 px. Respeitar redução de movimento e os estilos existentes de foco.

## 6. Contrato funcional e compatibilidade

### Estado separado de Hide

Adicionar `Project.isArchived`, booleano com valor inicial `false`, persistido como `is_archived`. Não converter projetos ocultos existentes em arquivados nem substituir silenciosamente o significado de Hide.

| `isArchived` | `isHidden` | Destino |
| --- | --- | --- |
| false | false | Painel normal e favoritos segundo as preferências existentes |
| false | true | Vista de projetos ocultos |
| true | false | Lista de arquivados |
| true | true | Lista de arquivados; ao restaurar, regressa aos ocultos |

Arquivar altera apenas `isArchived`. Preservar favoritos e ordenação guardados, sem remover as relações da base de dados. Ao restaurar, o projeto volta a respeitar essas preferências.

O arquivo aplica-se a todos os utilizadores. Não apaga nem recria entidades, não muda IDs, membros, permissões, estado dos cartões, chat, Gantt ou apresentações. Não arquivar individualmente cada cartão ou board.

### Permissões

Reutilizar a regra de autorização de `isHidden` no controller de atualização: gestores do projeto e administradores nos casos já permitidos para projetos partilhados. Não alargar o acesso de administradores a projetos privados nem permitir que um membro comum arquive por chamada direta à API.

Criar/reutilizar um seletor de capacidade de arquivo que corresponda a essa regra, em vez de usar um teste genérico “é administrador”. A lista de arquivo usa os projetos já autorizados para o utilizador; não pode revelar nomes, fundos ou boards de projetos inacessíveis.

### Superfícies afetadas

- Painel normal, favoritos e sidebar excluem arquivados, incluindo com ordenação personalizada e pesquisa ativa.
- Aplicar o filtro antes de ordenar e antes de limitar o número de projetos. Existe atualmente um caminho em `selectSidebarProjects` que retorna a ordenação personalizada antes de filtrar `isHidden`; incluir uma regressão que assegure os dois filtros nesse caminho.
- Evitar filtrar globalmente o conjunto de projetos autorizado: o arquivo precisa de continuar disponível no modal, por link direto e para outras funcionalidades.
- Nesta primeira versão, pesquisa global de cartões, notificações, Dashboard TV, relatórios, chat e Gantt mantêm o seu comportamento. Arquivar não equivale a suspender lembretes, congelar trabalho ou retirar dados dos relatórios. Não prometer esses efeitos na confirmação.
- Atualizações por websocket fazem o projeto sair/entrar nas listas de outras sessões. Uma sessão que já esteja numa board mantém-se aberta e passa a mostrar o aviso de arquivo.
- Pedidos repetidos do mesmo estado são idempotentes; duas sessões convergem para o último estado confirmado pelo servidor.

## 7. Mapa técnico verificado e sequência de implementação

Os caminhos abaixo são relativos à raiz `D:\Projetos\planka-personalizado`. São pontos de alteração previstos, não uma lista obrigatória de novos ficheiros.

### Etapa 1 — persistência e API

- [ ] Criar migration aditiva em `server/db/migrations/` para `is_archived`, não nulo e com default `false`, segundo as convenções da base de dados atual.
- [ ] Adicionar o atributo em `server/api/models/Project.js`.
- [ ] Aceitar e validar `isArchived` em `server/api/controllers/projects/update.js`, aplicando a mesma matriz de autorização de `isHidden` e incluindo o campo nos valores permitidos.
- [ ] Reutilizar `server/api/helpers/projects/update-one.js` para persistência e evento `projectUpdate`; verificar que nenhuma normalização/serialização remove o novo campo.
- [ ] Verificar listagem e acesso direto em `server/api/controllers/projects/index.js` e `show.js`. Preservar a inclusão dos projetos arquivados autorizados; nesta versão, não criar outro endpoint de listagem nem descarregar todas as boards de novo ao abrir o modal.
- [ ] Manter a validação em `server/api/helpers/projects/delete-one.js`: o arquivo não contorna a exigência de eliminar boards antes de eliminar o projeto.

### Etapa 2 — modelo cliente e navegação

- [ ] Adicionar `isArchived` em `client/src/models/Project.js` e verificar hidratação inicial, refresh e eventos.
- [ ] Ajustar os filtros relevantes de `client/src/models/User.js`, `client/src/selectors/users.js` e `client/src/selectors/sidebarSelectors.js`. Criar um seletor dedicado à lista autorizada de arquivados, independente do filtro de ocultos.
- [ ] Reutilizar a API de atualização e o fluxo em `client/src/sagas/core/services/projects.js`. O fluxo atual inicia uma atualização otimista: verificar rollback e acrescentar conclusão explícita para que o arquivo só feche o modal/navegue depois de sucesso real. Não alterar a semântica das restantes atualizações de projeto por arrasto.
- [ ] Garantir feedback de erro, ação ocupada e sincronização de duas sessões. Não criar um segundo store de projetos nem guardar o arquivo no localStorage.

### Etapa 3 — General, rodapé e modal

- [ ] Inserir a secção Archive em `client/src/components/projects/ProjectSettingsModal/GeneralPane/GeneralPane.jsx` e estilos adjacentes.
- [ ] Reutilizar os componentes locais de Button, confirmação, modal e pesquisa; não instalar bibliotecas.
- [ ] Acrescentar o acesso no fim de `client/src/components/common/Home/Home.jsx`, cobrindo `GridProjectsView.jsx` e `GroupedProjectsView.jsx` com a mesma entrada.
- [ ] Criar um componente pequeno para a lista de arquivados e estilos adjacentes, usando o mecanismo de modal existente. Nome de ficheiro sugerido: `ArchivedProjectsModal`.
- [ ] Localizar o cabeçalho partilhado que cobre projeto/board e integrar o aviso compacto. Confirmar este ponto durante a implementação; não duplicar o aviso por cada tipo de board.
- [ ] Traduzir os textos em en-US, pt-PT, es-ES e fr-FR; preservar o fallback já configurado para os restantes idiomas. Os wireframes usam inglês por corresponder ao UI das imagens.

### Etapa 4 — validação e entrega local

- [ ] Executar testes focados de autorização, preservação de dados e filtros; usar os runners já existentes.
- [ ] Validar no navegador em `http://localhost:3008` através de hot reload, com projeto de teste autorizado, em Grid e Grouped.
- [ ] Verificar desktop, 768 px e 320–390 px, teclado, modal, nomes longos e estados vazios/erro.
- [ ] Registar evidência antes/depois e limitações reais da validação. Executar lint/formatação adequados aos ficheiros alterados e `git diff --check`.

Não executar build para testar alterações locais. Uma futura aplicação da migration em desenvolvimento deve usar o procedimento existente. Publicação, migration e eventuais reinícios em produção exigem autorização explícita e indicação prévia do impacto, conforme AGENTS.md. A criação deste plano não executa nenhuma dessas operações.

## 8. Critérios de aceitação

- [ ] Um gestor consegue arquivar um projeto com várias boards; Delete continua bloqueado enquanto elas existirem.
- [ ] Boards, cartões, anexos e membros mantêm os mesmos IDs e quantidades depois de arquivar/restaurar.
- [ ] Um membro sem permissão não consegue arquivar/restaurar por UI nem por API; não vê projetos que não lhe pertencem.
- [ ] O projeto sai das vistas normais, favoritos e sidebar, incluindo após refresh e com ordenação guardada.
- [ ] O link de arquivo está disponível em Grid/Grouped, sem projetos ativos e com pesquisa sem resultados.
- [ ] O modal contém apenas arquivados autorizados e a sua pesquisa não herda o filtro do painel.
- [ ] Restore repõe a visibilidade anterior, respeitando Hide, favoritos e ordem; os restantes dados não mudam.
- [ ] Uma falha de API não deixa um arquivo/restauro falso no cliente nem provoca navegação de sucesso.
- [ ] Duas sessões recebem a alteração e uma board já aberta mostra o estado atualizado.
- [ ] O projeto pode ser aberto por link com as permissões existentes; o UI não afirma que está em modo só de leitura.
- [ ] O modal funciona por teclado e toque, com foco previsível, sem corte dos botões em ecrãs pequenos.

## 9. Extensão futura: arquivo só de leitura

Se for pretendido o comportamento completo de encerramento do Trello, decidir isso antes da implementação e ampliar este plano. Exige bloquear escrita no servidor, não apenas desativar botões.

O trabalho adicional deve inventariar e proteger mutações de boards, listas, cartões, comentários, anexos, membros, movimentos entre projetos, chat, Gantt, apresentações e integrações/jobs que escrevem nesses recursos. Também deve definir exceções de gestão/restauro, regras para notificações e o tratamento de operações já em curso quando o projeto é arquivado.

Essa variante precisa de testes de escrita recusada via API e de permissões para cada família de operação. A primeira versão descrita acima não implementa nem simula esse bloqueio.

## 10. Limites desta preparação

Na preparação foi analisado o código local dos projetos, listagens, sidebar e fluxo de atualização, e consultada a documentação oficial do Trello. As imagens fornecidas orientaram a localização das ações. A implementação e a validação subsequentes estão registadas abaixo; as alterações de código de outros trabalhos foram preservadas.

## 11. Implementação e validação realizadas

- Persistência com `isArchived` separado de `isHidden`. A migration `20260907000000_add_project_archive.js` foi aplicada apenas ao serviço de desenvolvimento `boards-dev`.
- General inclui Archive com confirmação e estado de submissão; Restore aparece quando arquivado. O cabeçalho tem uma indicação compacta de arquivo e atalho de restauro.
- O acesso no rodapé abre um modal com pesquisa, grupos traduzidos, Open e Restore. Foram reutilizados os componentes locais. O modal usa o estado já carregado, sem novo pedido de listagem.
- O fluxo de arquivo aguarda a API, impede submissões duplicadas e comunica falhas sem alterar antecipadamente o estado persistido no cliente.
- Foram adicionados 7 testes de cliente e 11 de servidor. Passaram também os 3 testes existentes de preferências do modelo User: 21 testes focados no total.
- Teste real da API com um projeto temporário: 2 boards, 1 cartão, 1 anexo de ligação e 1 membro de board preservados, incluindo IDs/conteúdo, gestores, Hide e favoritos. Foram confirmados pedidos idempotentes, erro 422 na eliminação com boards e erro 400 para um valor de arquivo inválido.
- No navegador local foram verificados: arquivo pelo General, confirmação, regresso ao painel, abertura de projeto arquivado sem restauro automático, restauro no cabeçalho e no modal, preservação de Hide, atualização entre dois separadores, foco após remoção da linha, Escape, ciclo de Tab, pesquisa sem resultados e vistas Grid/Grouped.
- Inspeção visual feita em desktop e a 390 e 320 px. O campo de pesquisa foi ajustado aos tokens escuros existentes. Não foi executada uma auditoria completa com leitor de ecrã nem uma validação separada a 768 px.
- Os testes e o lint dos componentes novos/fluxo de arquivo passaram. Uma verificação mais ampla encontrou regras antigas de `var` e funções anónimas na sidebar, fora das linhas alteradas; não foram refatoradas neste trabalho.
- O projeto temporário e as suas duas boards foram removidos após a validação. Os projetos preexistentes não foram arquivados nem eliminados. A vista do painel usada no teste foi reposta.
- Não foi executado build nem efetuada qualquer operação em produção. O comportamento continua a ser arquivo para organização, com edição segundo as permissões existentes.
