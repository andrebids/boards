import dateFns from 'date-fns/locale/pt';
// Import original para usar como base
import timeAgoOriginal from 'javascript-time-ago/locale/pt-PT';

import markdownEditor from './markdown-editor.json';

// Traduções personalizadas que sobrepõem as da biblioteca
const timeAgo = {
  locale: 'pt-PT',
  long: {
    year: {
      previous: 'ano passado',
      current: 'este ano',
      next: 'próximo ano',
      past: {
        one: 'há {0} ano',
        other: 'há {0} anos',
      },
      future: {
        one: 'dentro de {0} ano',
        other: 'dentro de {0} anos',
      },
    },
    quarter: {
      previous: 'trimestre passado',
      current: 'este trimestre',
      next: 'próximo trimestre',
      past: {
        one: 'há {0} trimestre',
        other: 'há {0} trimestres',
      },
      future: {
        one: 'dentro de {0} trimestre',
        other: 'dentro de {0} trimestres',
      },
    },
    month: {
      previous: 'mês passado',
      current: 'este mês',
      next: 'próximo mês',
      past: {
        one: 'há {0} mês',
        other: 'há {0} meses',
      },
      future: {
        one: 'dentro de {0} mês',
        other: 'dentro de {0} meses',
      },
    },
    week: {
      previous: 'semana passada',
      current: 'esta semana',
      next: 'próxima semana',
      past: {
        one: 'há {0} semana',
        other: 'há {0} semanas',
      },
      future: {
        one: 'dentro de {0} semana',
        other: 'dentro de {0} semanas',
      },
    },
    day: {
      previous: 'ontem',
      'previous-2': 'anteontem',
      current: 'hoje',
      next: 'amanhã',
      'next-2': 'depois de amanhã',
      past: {
        one: 'há {0} dia',
        other: 'há {0} dias',
      },
      future: {
        one: 'dentro de {0} dia',
        other: 'dentro de {0} dias',
      },
    },
    hour: {
      current: 'esta hora',
      past: {
        one: 'há {0} hora',
        other: 'há {0} horas',
      },
      future: {
        one: 'dentro de {0} hora',
        other: 'dentro de {0} horas',
      },
    },
    minute: {
      current: 'este minuto',
      past: {
        one: 'há {0} minuto',
        other: 'há {0} minutos',
      },
      future: {
        one: 'dentro de {0} minuto',
        other: 'dentro de {0} minutos',
      },
    },
    second: {
      current: 'agora',
      past: {
        one: 'há {0} segundo',
        other: 'há {0} segundos',
      },
      future: {
        one: 'dentro de {0} segundo',
        other: 'dentro de {0} segundos',
      },
    },
  },
  short: {
    year: {
      previous: 'ano passado',
      current: 'este ano',
      next: 'próximo ano',
      past: {
        one: 'há {0} ano',
        other: 'há {0} anos',
      },
      future: {
        one: 'dentro de {0} ano',
        other: 'dentro de {0} anos',
      },
    },
    quarter: {
      previous: 'trim. passado',
      current: 'este trim.',
      next: 'próximo trim.',
      past: 'há {0} trim.',
      future: 'dentro de {0} trim.',
    },
    month: {
      previous: 'mês passado',
      current: 'este mês',
      next: 'próximo mês',
      past: {
        one: 'há {0} mês',
        other: 'há {0} meses',
      },
      future: {
        one: 'dentro de {0} mês',
        other: 'dentro de {0} meses',
      },
    },
    week: {
      previous: 'semana passada',
      current: 'esta semana',
      next: 'próxima semana',
      past: 'há {0} sem.',
      future: 'dentro de {0} sem.',
    },
    day: {
      previous: 'ontem',
      'previous-2': 'anteontem',
      current: 'hoje',
      next: 'amanhã',
      'next-2': 'depois de amanhã',
      past: {
        one: 'há {0} dia',
        other: 'há {0} dias',
      },
      future: {
        one: 'dentro de {0} dia',
        other: 'dentro de {0} dias',
      },
    },
    hour: {
      current: 'esta hora',
      past: 'há {0} h',
      future: 'dentro de {0} h',
    },
    minute: {
      current: 'este minuto',
      past: 'há {0} min',
      future: 'dentro de {0} min',
    },
    second: {
      current: 'agora',
      past: 'há {0} s',
      future: 'dentro de {0} s',
    },
  },
  narrow: {
    year: {
      previous: 'ano passado',
      current: 'este ano',
      next: 'próximo ano',
      past: {
        one: '-{0} ano',
        other: '-{0} anos',
      },
      future: {
        one: '+{0} ano',
        other: '+{0} anos',
      },
    },
    quarter: {
      previous: 'trim. passado',
      current: 'este trim.',
      next: 'próximo trim.',
      past: '-{0} trim.',
      future: '+{0} trim.',
    },
    month: {
      previous: 'mês passado',
      current: 'este mês',
      next: 'próximo mês',
      past: {
        one: '-{0} mês',
        other: '-{0} meses',
      },
      future: {
        one: '+{0} mês',
        other: '+{0} meses',
      },
    },
    week: {
      previous: 'semana passada',
      current: 'esta semana',
      next: 'próxima semana',
      past: '-{0} sem.',
      future: '+{0} sem.',
    },
    day: {
      previous: 'ontem',
      'previous-2': 'anteontem',
      current: 'hoje',
      next: 'amanhã',
      'next-2': 'depois de amanhã',
      past: {
        one: '-{0} dia',
        other: '-{0} dias',
      },
      future: {
        one: '+{0} dia',
        other: '+{0} dias',
      },
    },
    hour: {
      current: 'esta hora',
      past: '-{0} h',
      future: '+{0} h',
    },
    minute: {
      current: 'este minuto',
      past: '-{0} min',
      future: '+{0} min',
    },
    second: {
      current: 'agora',
      past: '-{0} s',
      future: '+{0} s',
    },
  },
};

export default {
  dateFns,
  timeAgo,
  markdownEditor,

  format: {
    date: 'dd/MM/yyyy',
    time: 'p',
    dateTime: '$t(format:date) $t(format:time)',
    longDate: 'd MMM',
    longDateTime: "d 'de' MMMM 'às' p",
    fullDate: 'd MMM, y',
    fullDateTime: "d 'de' MMMM, y 'às' p",
  },

  translation: {
    common: {
      aboutPlanka: 'Sobre o Bids',
      account: 'Conta',
      actions: 'Histórico de Ações',
      activateUser_title: 'Ativar Utilizador',
      active: 'Ativo',
      addAttachment_title: 'Adicionar Anexo',
      addCustomFieldGroup_title: 'Adicionar Grupo de Campos Personalizados',
      addCustomField_title: 'Adicionar Campo Personalizado',
      addManager_title: 'Adicionar gestor',
      addMember_title: 'Adicionar Membro',
      addTaskList_title: 'Adicionar Lista de Tarefas',
      addUser_title: 'Adicionar Utilizador',
      admin: 'Administrador',
      administration: 'Administração',
      all: 'Todos',
      allChangesWillBeAutomaticallySavedAfterConnectionRestored:
        'Todas as alterações serão salvas automaticamente<br />após a conexão ser restaurada.',
      alphabetically: 'Alfabeticamente',
      alwaysDisplayCardCreator: 'Mostrar sempre o criador do cartão',
      archive: 'Arquivar',
      archiveCard_title: 'Arquivar Cartão',
      archiveCards_title: 'Arquivar Cartões',
      areYouSureYouWantToActivateThisUser:
        'Tem certeza de que deseja ativar este utilizador?',
      areYouSureYouWantToArchiveCards:
        'Tem certeza de que deseja arquivar os cartões?',
      areYouSureYouWantToArchiveThisCard:
        'Tem certeza de que deseja arquivar este cartão?',
      areYouSureYouWantToAssignThisProjectManagerAsOwner:
        'Tem certeza de que deseja atribuir este gerente de projeto como proprietário?',
      areYouSureYouWantToDeactivateThisUser:
        'Tem certeza de que deseja desativar este utilizador?',
      areYouSureYouWantToDeleteThisAttachment:
        'Tem certeza de que deseja excluir este anexo?',
      areYouSureYouWantToDeleteThisBackgroundImage:
        'Tem certeza de que deseja excluir esta imagem de fundo?',
      areYouSureYouWantToDeleteThisBoard:
        'Tem certeza de que deseja excluir este quadro?',
      areYouSureYouWantToDeleteThisCard:
        'Tem certeza de que deseja excluir este cartão?',
      areYouSureYouWantToDeleteThisCardForever:
        'Tem certeza de que deseja excluir este cartão permanentemente?',
      areYouSureYouWantToDeleteThisComment:
        'Tem certeza de que deseja excluir este comentário?',
      areYouSureYouWantToDeleteThisCustomField:
        'Tem certeza de que deseja excluir este campo personalizado?',
      areYouSureYouWantToDeleteThisCustomFieldGroup:
        'Tem certeza de que deseja excluir este grupo de campos personalizados?',
      areYouSureYouWantToDeleteThisLabel:
        'Tem certeza de que deseja excluir este rótulo?',
      areYouSureYouWantToDeleteThisList:
        'Tem certeza de que deseja excluir esta lista? Todos os cartões serão movidos para o lixo.',
      areYouSureYouWantToDeleteThisNotificationService:
        'Tem certeza de que deseja excluir este serviço de notificação?',
      areYouSureYouWantToDeleteThisProject:
        'Tem certeza de que deseja excluir este projeto?',
      areYouSureYouWantToDeleteThisTask:
        'Tem certeza de que deseja excluir esta tarefa?',
      areYouSureYouWantToDeleteThisTaskList:
        'Tem certeza de que deseja excluir esta lista de tarefas?',
      areYouSureYouWantToDeleteThisUser:
        'Tem a certeza de que deseja eliminar este utilizador?',
      areYouSureYouWantToEmptyTrash:
        'Tem certeza de que deseja esvaziar o lixo?',
      areYouSureYouWantToLeaveBoard:
        'Tem certeza de que deseja sair do quadro?',
      areYouSureYouWantToLeaveProject:
        'Tem certeza de que deseja sair do projeto?',
      areYouSureYouWantToMakeThisProjectShared:
        'Tem certeza de que deseja tornar este projeto partilhado?',
      areYouSureYouWantToRemoveThisManagerFromProject:
        'Tem certeza de que deseja remover este gerente do projeto?',
      areYouSureYouWantToRemoveThisMemberFromBoard:
        'Tem certeza de que deseja remover este membro do quadro?',
      assignAsOwner_title: 'Atribuir Como Proprietário',
      atLeastOneListMustBePresent: 'Pelo menos uma lista deve estar presente',
      attachment: 'Anexo',
      attachments: 'Anexos',
      authentication: 'Autenticação',
      background: 'Fundo',
      baseCustomFields_title: 'Campos Personalizados Base',
      baseGroup: 'Grupo base',
      board: 'Quadro',
      boardActions_title: 'Histórico do Quadro',
      boardNotFound_title: 'Quadro não encontrado',
      boardSubscribed: 'Quadro subscrito',
      boardUser: 'Utilizador do quadro',
      byCreationTime: 'Por tempo de criação',
      byDefault: 'Por padrão',
      byDueDate: 'Por data limite',
      canBeInvitedToWorkInBoards:
        'Pode ser convidado para trabalhar em quadros.',
      canComment: 'Pode comentar',
      canCreateOwnProjectsAndBeInvitedToWorkInOthers:
        'Pode criar projetos próprios e ser convidado para trabalhar em outros.',
      canEditBoardLayoutAndAssignMembersToCards:
        'Pode editar o layout do quadro e atribuir membros aos cartões.',
      canManageSystemWideSettingsAndActAsProjectOwner:
        'Pode gerir as configurações do sistema e atuar como proprietário do projeto.',
      canOnlyViewBoard: 'Só pode visualizar o quadro.',
      cardActions_title: 'Ações do Cartão',
      cardNotFound_title: 'Cartão não encontrado',
      cardsOnThisListAreAvailableToAllBoardMembers:
        'Os cartões nesta lista estão disponíveis para todos os membros do quadro.',
      cardsOnThisListAreCompleteAndReadyToBeArchived:
        'Os cartões nesta lista estão completos e prontos para serem arquivados.',
      cardsOnThisListAreReadyToBeWorkedOn:
        'Os cartões nesta lista estão prontos para serem trabalhados.',
      clickHereOrRefreshPageToUpdate:
        '<0>Clique aqui</0> ou atualize a página para atualizar.',
      closed: 'Fechado',
      color: 'Cor',
      comments: 'Comentários',
      contentExceedsLimit: 'O conteúdo excede {{limit}}',
      contentOfThisAttachmentIsTooBigToDisplay:
        'O conteúdo deste anexo é demasiado grande para ser exibido.',
      copy_inline: 'copiar',
      createBoard_title: 'Criar Quadro',
      createCustomFieldGroup_title: 'Criar Grupo de Campos Personalizados',
      createLabel_title: 'Criar Rótulo',
      createNewOneOrSelectExistingOne:
        'Criar um novo ou selecionar<br />um existente.',
      createProject_title: 'Criar Projeto',
      createTextFile_title: 'Criar Arquivo de Texto',
      creator: 'Criador',
      currentPassword: 'Palavra-passe atual',
      customFieldGroup_title: 'Grupo de Campos Personalizados',
      customFieldGroups_title: 'Grupos de Campos Personalizados',
      customField_title: 'Campo Personalizado',
      customFields_title: 'Campos Personalizados',
      dangerZone_title: 'Zona de Perigo',
      date: 'Data',
      deactivateUser_title: 'Desativar Utilizador',
      defaultCardType_title: 'Tipo de Cartão Padrão',
      defaultView_title: 'Vista Padrão',
      deleteAllBoardsToBeAbleToDeleteThisProject:
        'Elimine todos os quadros para poder eliminar este projeto',
      deleteAttachment_title: 'Excluir Anexo',
      deleteBackgroundImage_title: 'Excluir Imagem de Fundo',
      deleteBoard_title: 'Excluir Quadro',
      deleteCardForever_title: 'Excluir Cartão Permanentemente',
      deleteCard_title: 'Excluir Cartão',
      deleteComment_title: 'Excluir Comentário',
      deleteCustomFieldGroup_title: 'Excluir Grupo de Campos Personalizados',
      deleteCustomField_title: 'Excluir Campo Personalizado',
      deleteLabel_title: 'Excluir Rótulo',
      deleteList_title: 'Excluir Lista',
      deleteNotificationService_title: 'Excluir Serviço de Notificação',
      deleteProject_title: 'Excluir Projeto',
      deleteTaskList_title: 'Excluir Lista de Tarefas',
      deleteTask_title: 'Excluir Tarefa',
      deleteUser_title: 'Eliminar Utilizador',
      deletedUser_title: 'Utilizador Eliminado',
      description: 'Descrição',
      detectAutomatically: 'Detectar automaticamente',
      display: 'Exibir',
      dropFileToUpload: 'Solte o ficheiro para enviar',
      dueDate_title: 'Data Limite',
      dynamicAndUnevenlySpacedLayout:
        'Layout dinâmico e espaçado irregularmente.',
      editAttachment_title: 'Editar Anexo',
      editAvatar_title: 'Editar Avatar',
      editColor_title: 'Editar Cor',
      editCustomFieldGroup_title: 'Editar Grupo de Campos Personalizados',
      editCustomField_title: 'Editar Campo Personalizado',
      editDueDate_title: 'Editar Data Limite',
      editEmail_title: 'Editar E-mail',
      editInformation_title: 'Editar Informações',
      editLabel_title: 'Editar Rótulo',
      editPassword_title: 'Editar Palavra-passe',
      editPermissions_title: 'Editar Permissões',
      editRole_title: 'Editar Função',
      editStopwatch_title: 'Editar Cronômetro',
      editType_title: 'Editar Tipo',
      editUsername_title: 'Editar Nome de Utilizador',
      editor: 'Editor',
      editors: 'Editores',
      email: 'E-mail',
      emptyTrash_title: 'Esvaziar Lixo',
      enterCardTitle: 'Digite o título do cartão...',
      dropImagesHere: 'Largue as imagens aqui...',
      dropFilesHere: 'Largue os ficheiros aqui...',
      processingImages: 'A processar imagens...',
      processingFiles: 'A processar ficheiros...',
      enterDescription: 'Digite a descrição...',
      enterFilename: 'Digite o nome do ficheiro',
      enterListTitle: 'Digite o título da lista...',
      enterTaskDescription: 'Digite a descrição da tarefa...',
      filterByLabels_title: 'Filtrar por Rótulos',
      filterByMembers_title: 'Filtrar por Membros',
      forPersonalProjects: 'Para projetos pessoais.',
      forTeamBasedProjects: 'Para projetos baseados em equipa.',
      fromComputer_title: 'Do Computador',
      fromTrello: 'Do Trello',
      general: 'Geral',
      gradients: 'Gradientes',
      grid: 'Grelha',
      hideFromProjectListAndFavorites:
        'Ocultar da lista de projetos e favoritos',
      hours: 'Horas',
      importBoard_title: 'Importar Quadro',
      invalidCurrentPassword: 'Palavra-passe atual inválida',
      kanban: 'Kanban',
      labels: 'Rótulos',
      language: 'Idioma',
      leaveBoard_title: 'Sair do Quadro',
      leaveProject_title: 'Sair do Projeto',
      limitCardTypesToDefaultOne: 'Limitar tipos de cartão ao padrão',
      list: 'Lista',
      listActions_title: 'Ações da Lista',
      lists: 'Listas',
      makeProjectShared_title: 'Tornar Projeto Partilhado',
      managers: 'Gestores',
      memberActions_title: 'Ações do Membro',
      members: 'Membros',
      minutes: 'Minutos',
      moveCard_title: 'Mover Cartão',
      myOwn_title: 'Meus Boards',
      name: 'Nome',
      newEmail: 'Novo e-mail',
      newPassword: 'Nova palavra-passe',
      newUsername: 'Novo nome de utilizador',
      newVersionAvailable: 'Nova versão disponível',
      newestFirst: 'Mais recentes primeiro',
      noBoards: 'Sem quadros',
      noConnectionToServer: 'Sem conexão com o servidor',
      noLists: 'Sem listas',
      noProjects: 'Sem projetos',
      noUnreadNotifications: 'Nenhuma notificação não lida.',
      notifications: 'Notificações',
      oldestFirst: 'Mais antigos primeiro',
      openBoard_title: 'Abrir Quadro',
      optional_inline: 'opcional',
      organization: 'Organização',
      others: 'Outros',
      phone: 'Telefone',
      plankaUsesAppriseToSendNotificationsToOver100PopularServices:
        'O Blachere Boards usa <1><0>Apprise</0></1> para enviar notificações para mais de 100 serviços populares.',
      preferences: 'Preferências',
      pressPasteShortcutToAddAttachmentFromClipboard:
        'Dica: pressione Ctrl-V (Cmd-V no Mac) para adicionar um anexo da área de transferência.',
      private: 'Privado',
      project: 'Projeto',
      projectNotFound_title: 'Projeto não encontrado',
      projectOwner: 'Proprietário do projeto',
      referenceDataAndKnowledgeStorage:
        'Armazenamento de dados de referência e conhecimento.',
      removeManager_title: 'Remover Gestor',
      removeMember_title: 'Remover Membro',
      role: 'Função',
      searchCards: 'Pesquisar cartões...',
      searchCustomFieldGroups: 'Pesquisar grupos de campos personalizados...',
      searchCustomFields: 'Pesquisar campos personalizados...',
      searchLabels: 'Pesquisar rótulos...',
      searchLists: 'Pesquisar listas...',
      searchMembers: 'Pesquisar membros...',
      searchProjects: 'Pesquisar projetos...',
      searchUsers: 'Pesquisar utilizadores...',
      seconds: 'Segundos',
      selectAssignee_title: 'Selecionar Responsável',
      selectBoard: 'Selecionar quadro',
      selectList: 'Selecionar lista',
      selectListToRestoreThisCard:
        'Selecionar lista para restaurar este cartão',
      selectOrder_title: 'Selecionar Ordem',
      selectPermissions_title: 'Selecionar Permissões',
      selectProject: 'Selecionar projeto',
      selectRole_title: 'Selecionar Função',
      selectType_title: 'Selecionar Tipo',
      sequentialDisplayOfCards: 'Exibição sequencial de cartões.',
      settings: 'Configurações',
      shared: 'Partilhado',
      sharedWithMe_title: 'Partilhado Comigo',
      showOnFrontOfCard: 'Mostrar na frente do cartão',
      sortList_title: 'Ordenar Lista',
      stopwatch: 'Cronômetro',
      story: 'História',
      subscribeToCardWhenCommenting: 'Entrar no cartão ao comentar',
      subscribeToMyOwnCardsByDefault:
        'Entrar automaticamente nos meus próprios cartões',
      taskActions_title: 'Ações da Tarefa',
      taskAssignmentAndProjectCompletion:
        'Atribuição de tarefas e conclusão de projetos.',
      taskListActions_title: 'Ações da Lista de Tarefas',
      taskList_title: 'Lista de Tarefas',
      team: 'Boards de equipa',
      thereIsNoPreviewAvailableForThisAttachment:
        'Não há pré-visualização disponível para este anexo.',
      time: 'Tempo',
      title: 'Título',
      trash: 'Lixo',
      trashHasBeenSuccessfullyEmptied: 'O lixo foi esvaziado com sucesso.',
      turnOffRecentCardHighlighting: 'Desativar destaque de cartões recentes',
      typeNameToConfirm: 'Digite o nome para confirmar.',
      typeTitleToConfirm: 'Digite o título para confirmar.',
      unsavedChanges: 'Alterações não guardadas',
      uploadedImages: 'Imagens enviadas',
      userActions_title: 'Ações do Utilizador',
      userAddedCardToList:
        '<0>{{user}}</0> adicionou um cartão <2>{{card}}</2> à {{list}}',
      userCreatedCard: '<0>{{user}}</0> criou um cartão <2>{{card}}</2> em {{list}}',
      userAddedThisCardToList:
        '<0>{{user}}</0> adicionou este cartão à {{list}}',
      userAddedUserToCard:
        '<0>{{actorUser}}</0> adicionou {{addedUser}} ao cartão <4>{{card}}</4>',
      userAddedUserToThisCard:
        '<0>{{actorUser}}</0> adicionou {{addedUser}} a este cartão',
      userAddedYouToCard: '<0>{{user}}</0> adicionou-o ao cartão <2>{{card}}</2>',
      userAddedAttachmentToCard:
        '<0>{{user}}</0> adicionou um anexo ao cartão <2>{{card}}</2>',
      userCompletedTaskOnCard:
        '<0>{{user}}</0> completou a tarefa <2>{{task}}</2> no cartão <4>{{card}}</4>',
      userCompletedTaskOnThisCard:
        '<0>{{user}}</0> completou a tarefa <2>{{task}}</2> neste cartão',
      userJoinedCard: '<0>{{user}}</0> juntou-se ao cartão <2>{{card}}</2>',
      userJoinedThisCard: '<0>{{user}}</0> juntou-se a este cartão',
      userLeftCard: '<0>{{user}}</0> saiu do cartão <2>{{card}}</2>',
      userLeftNewCommentToCard:
        '<0>{{user}}</0> deixou um novo comentário «{{comment}}» no cartão <2>{{card}}</2>',
      userCommentedOnCard:
        '<0>{{user}}</0> comentou no cartão <2>{{card}}</2>',
      userRepliedToCommentOnCard:
        '<0>{{user}}</0> respondeu a um comentário no cartão <2>{{card}}</2>',
      userUpdatedCommentOnCard:
        '<0>{{user}}</0> editou comentário no cartão <2>{{card}}</2>',
      userDeletedCommentOnCard:
        '<0>{{user}}</0> removeu comentário no cartão <2>{{card}}</2>',
      userLeftThisCard: '<0>{{user}}</0> saiu deste cartão',
      userMarkedTaskIncompleteOnCard:
        '<0>{{user}}</0> marcou a tarefa <2>{{task}}</2> como incompleta no cartão <4>{{card}}</4>',
      userMarkedTaskIncompleteOnThisCard:
        '<0>{{user}}</0> marcou a tarefa <2>{{task}}</2> como incompleta neste cartão',
      userCreatedTaskOnCard:
        '<0>{{user}}</0> criou a tarefa <2>{{task}}</2> no cartão <4>{{card}}</4>',
      userCreatedTaskOnThisCard:
        '<0>{{user}}</0> criou a tarefa <2>{{task}}</2> neste cartão',
      userDeletedTaskOnCard:
        '<0>{{user}}</0> excluiu a tarefa <2>{{task}}</2> do cartão <4>{{card}}</4>',
      userDeletedTaskOnThisCard:
        '<0>{{user}}</0> excluiu a tarefa <2>{{task}}</2> deste cartão',
      userUpdatedTaskOnCard:
        '<0>{{user}}</0> atualizou a tarefa <2>{{task}}</2> no cartão <4>{{card}}</4>',
      userUpdatedTaskOnThisCard:
        '<0>{{user}}</0> atualizou a tarefa <2>{{task}}</2> neste cartão',
      userCreatedTaskListOnCard:
        '<0>{{user}}</0> criou lista de tarefas <2>{{taskList}}</2> no cartão <4>{{card}}</4>',
      userCreatedTaskListOnThisCard:
        '<0>{{user}}</0> criou lista de tarefas <2>{{taskList}}</2> neste cartão',
      userDeletedTaskListOnCard:
        '<0>{{user}}</0> excluiu lista de tarefas <2>{{taskList}}</2> do cartão <4>{{card}}</4>',
      userDeletedTaskListOnThisCard:
        '<0>{{user}}</0> excluiu lista de tarefas <2>{{taskList}}</2> deste cartão',
      userCreatedAttachmentOnCard:
        '<0>{{user}}</0> criou anexo <2>{{attachment}}</2> no cartão <4>{{card}}</4>',
      userCreatedAttachmentOnThisCard:
        '<0>{{user}}</0> criou anexo <2>{{attachment}}</2> neste cartão',
      userCreatedVideoOnCard:
        '<0>{{user}}</0> adicionou vídeo <2>{{attachment}}</2> ao cartão <4>{{card}}</4>',
      userCreatedVideoOnThisCard:
        '<0>{{user}}</0> adicionou vídeo <2>{{attachment}}</2> a este cartão',
      userDeletedAttachmentOnCard:
        '<0>{{user}}</0> excluiu anexo <2>{{attachment}}</2> do cartão <4>{{card}}</4>',
      userDeletedAttachmentOnThisCard:
        '<0>{{user}}</0> excluiu anexo <2>{{attachment}}</2> deste cartão',
      userDeletedVideoOnCard:
        '<0>{{user}}</0> removeu vídeo <2>{{attachment}}</2> do cartão <4>{{card}}</4>',
      userDeletedVideoOnThisCard:
        '<0>{{user}}</0> removeu vídeo <2>{{attachment}}</2> deste cartão',
      userMentionedYouInCommentOnCard:
        '<0>{{user}}</0> mencionou-o num comentário «{{comment}}» no cartão <2>{{card}}</2>',
      userMovedCardFromListToList:
        '<0>{{user}}</0> moveu um cartão <2>{{card}}</2> de {{fromList}} para {{toList}}',
      userMovedThisCardFromListToList:
        '<0>{{user}}</0> moveu este cartão de {{fromList}} para {{toList}}',
      userRemovedUserFromCard:
        '<0>{{actorUser}}</0> removeu {{removedUser}} do cartão <4>{{card}}</4>',
      userRemovedUserFromThisCard:
        '<0>{{actorUser}}</0> removeu {{removedUser}} deste cartão',
      userSetDueDateToCard:
        '<0>{{user}}</0> definiu data limite para <2>{{date}}</2> no cartão <4>{{card}}</4>',
      userRemovedDueDateFromCard:
        '<0>{{user}}</0> removeu data limite do cartão <2>{{card}}</2>',
      userChangedDueDateOfCard:
        '<0>{{user}}</0> alterou data limite de <2>{{oldDate}}</2> para <4>{{newDate}}</4> no cartão <6>{{card}}</6>',
      userAddedLabelToCard:
        '<0>{{user}}</0> adicionou label <2>{{label}}</2> ao cartão <4>{{card}}</4>',
      userRemovedLabelFromCard:
        '<0>{{user}}</0> removeu label <2>{{label}}</2> do cartão <4>{{card}}</4>',
      userCreatedTaskOnCard:
        '<0>{{user}}</0> criou tarefa <2>{{task}}</2> no cartão <4>{{card}}</4>',
      userDeletedTaskOnCard:
        '<0>{{user}}</0> excluiu tarefa <2>{{task}}</2> do cartão <4>{{card}}</4>',
      userCompletedTaskOnCard:
        '<0>{{user}}</0> concluiu tarefa <2>{{task}}</2> no cartão <4>{{card}}</4>',
      userUncompletedTaskOnCard:
        '<0>{{user}}</0> marcou como não concluída a tarefa <2>{{task}}</2> no cartão <4>{{card}}</4>',
      userCreatedTaskListOnCard:
        '<0>{{user}}</0> criou lista de tarefas <2>{{taskList}}</2> no cartão <4>{{card}}</4>',
      userDeletedTaskListOnCard:
        '<0>{{user}}</0> excluiu lista de tarefas <2>{{taskList}}</2> do cartão <4>{{card}}</4>',
      userSetDueDateOnCard:
        '<0>{{user}}</0> definiu data limite <2>{{date}}</2> para o cartão <4>{{card}}</4>',
      activityLogMessage:
        '<0>{{user}}</0> realizou uma ação no cartão <2>{{card}}</2>',
      username: 'Nome de utilizador',
      users: 'Utilizadores',
      viewer: 'Visualizador',
      viewers: 'Visualizadores',
      visualTaskManagementWithLists: 'Gestão visual de tarefas com listas.',
      withoutBaseGroup: 'Sem grupo base',
      writeComment: 'Escreva um comentário...',
      video: 'Vídeo',
      loadingVideoPreview: 'A carregar pré-visualização do vídeo...',
      noVideoPreviewAvailable: 'Nenhuma pré-visualização disponível',
      errorLoadingVideoPreview: 'Erro ao carregar pré-visualização',
    },

    action: {
      activateUser: 'Ativar utilizador',
      activateUser_title: 'Ativar Utilizador',
      addAnotherCard: 'Adicionar outro cartão',
      addAnotherList: 'Adicionar outra lista',
      addAnotherTask: 'Adicionar outra tarefa',
      addCard: 'Adicionar cartão',
      addCard_title: 'Adicionar Cartão',
      addComment: 'Adicionar comentário',
      addCustomField: 'Adicionar campo personalizado',
      addCustomFieldGroup: 'Adicionar grupo de campos personalizados',
      addList: 'Adicionar lista',
      addMember: 'Adicionar membro',
      addMoreDetailedDescription: 'Adicionar descrição mais detalhada',
      addTask: 'Adicionar tarefa',
      addTaskList: 'Adicionar lista de tarefas',
      addToCard: 'Adicionar ao cartão',
      addUser: 'Adicionar utilizador',
      archive: 'Arquivar',
      archiveCard: 'Arquivar cartão',
      archiveCard_title: 'Arquivar Cartão',
      archiveCards: 'Arquivar cartões',
      archiveCards_title: 'Arquivar Cartões',
      assignAsOwner: 'Atribuir como proprietário',
      cancel: 'Cancelar',
      createBoard: 'Criar quadro',
      createCustomField: 'Criar campo personalizado',
      createCustomFieldGroup: 'Criar grupo de campos personalizados',
      createFile: 'Criar ficheiro',
      createLabel: 'Criar rótulo',
      createNewLabel: 'Criar novo rótulo',
      createProject: 'Criar projeto',
      createTaskList: 'Criar lista de tarefas',
      deactivateUser: 'Desativar utilizador',
      deactivateUser_title: 'Desativar Utilizador',
      delete: 'Excluir',
      deleteAttachment: 'Excluir anexo',
      deleteAvatar: 'Excluir avatar',
      deleteBackgroundImage: 'Excluir imagem de fundo',
      deleteBoard: 'Excluir quadro',
      deleteBoard_title: 'Excluir Quadro',
      deleteCard: 'Excluir cartão',
      deleteCardForever: 'Excluir cartão permanentemente',
      deleteCard_title: 'Excluir Cartão',
      deleteComment: 'Excluir comentário',
      deleteCustomField: 'Excluir campo personalizado',
      deleteCustomFieldGroup: 'Excluir grupo de campos personalizados',
      deleteForever_title: 'Excluir Permanentemente',
      deleteGroup: 'Excluir grupo',
      deleteLabel: 'Excluir rótulo',
      deleteList: 'Excluir lista',
      deleteList_title: 'Excluir lista',
      deleteNotificationService: 'Excluir serviço de notificação',
      deleteProject: 'Excluir projeto',
      deleteProject_title: 'Excluir Projeto',
      deleteTask: 'Excluir tarefa',
      deleteTaskList: 'Excluir lista de tarefas',
      deleteTask_title: 'Excluir Tarefa',
      deleteUser: 'Eliminar utilizador',
      deleteUser_title: 'Eliminar Utilizador',
      dismissAll: 'Dispensar todos',
      duplicate: 'Duplicar',
      duplicateCard_title: 'Duplicar Cartão',
      edit: 'Editar',
      editColor: 'Editar cor',
      editColor_title: 'Editar Cor',
      editCustomField: 'Editar campo personalizado',
      editCustomFieldGroup: 'Editar grupo de campos personalizados',
      editDescription_title: 'Editar Descrição',
      editDueDate_title: 'Editar Data Limite',
      editEmail_title: 'Editar E-mail',
      editGroup: 'Editar grupo',
      editInformation_title: 'Editar Informações',
      editPassword_title: 'Editar Senha',
      editPermissions: 'Editar permissões',
      editRole: 'Editar função',
      editRole_title: 'Editar Função',
      editStopwatch_title: 'Editar Cronômetro',
      editTitle_title: 'Editar Título',
      editType: 'Editar tipo',
      editType_title: 'Editar Tipo',
      editUsername_title: 'Editar Nome de Usuário',
      emptyTrash: 'Esvaziar lixo',
      emptyTrash_title: 'Esvaziar Lixo',
      import: 'Importar',
      join: 'Juntar-se',
      leave: 'Sair',
      leaveBoard: 'Sair do quadro',
      leaveProject: 'Sair do projeto',
      logOut_title: 'Sair',
      makeCover_title: 'Tornar Capa',
      makeProjectShared: 'Tornar projeto partilhado',
      makeProjectShared_title: 'Tornar Projeto Partilhado',
      move: 'Mover',
      moveCard_title: 'Mover Cartão',
      remove: 'Remover',
      removeAssignee: 'Remover responsável',
      removeColor: 'Remover cor',
      removeCover_title: 'Remover Capa',
      removeFromBoard: 'Remover do quadro',
      removeFromProject: 'Remover do projeto',
      removeManager: 'Remover gestor',
      removeMember: 'Remover membro',
      restoreToList: 'Restaurar para {{list}}',
      returnToBoard: 'Voltar ao quadro',
      save: 'Salvar',
      showActive: 'Mostrar ativos',
      showAllAttachments: 'Mostrar todos os anexos ({{hidden}} ocultos)',
      showCardsWithThisUser: 'Mostrar cartões com este utilizador',
      showDeactivated: 'Mostrar desativados',
      showFewerAttachments: 'Mostrar menos anexos',
      showLess: 'Mostrar menos',
      showMore: 'Mostrar mais',
      sortList_title: 'Ordenar Lista',
      start: 'Iniciar',
      stop: 'Parar',
      subscribe: 'Entrar',
      unsubscribe: 'Cancelar inscrição',
      uploadNewAvatar: 'Enviar novo avatar',
      uploadNewImage: 'Enviar nova imagem',
      expandPanel: 'Expandir painel',
      collapsePanel: 'Recolher painel',
      openActivityHistory: 'Abrir histórico de atividades',
    },
  },
};
