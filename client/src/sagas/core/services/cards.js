/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, fork, join, put, race, select, take } from 'redux-saga/effects';
import { LOCATION_CHANGE_HANDLE } from '../../../lib/redux-router';

import { goToBoard, goToCard } from './router';
import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import {
  isListArchiveOrTrash,
  isListFinite,
} from '../../../utils/record-helpers';
import ActionTypes from '../../../constants/ActionTypes';
import {
  BoardViews,
  ListTypes,
  AttachmentTypes,
} from '../../../constants/Enums';

// eslint-disable-next-line no-underscore-dangle
const _preloadImage = url =>
  new Promise(resolve => {
    const image = new Image();

    image.onload = resolve;
    image.onerror = resolve;

    image.src = url;
  });

export function* fetchCards(listId) {
  const { boardId, lastCard } = yield select(selectors.selectListById, listId);
  const { search } = yield select(selectors.selectBoardById, boardId);
  const filterUserIds = yield select(
    selectors.selectFilterUserIdsForCurrentBoard
  );
  const filterLabelIds = yield select(
    selectors.selectFilterLabelIdsForCurrentBoard
  );

  function* getCardsRequest() {
    const response = {};

    try {
      response.body = yield call(request, api.getCards, listId, {
        search: (search && search.trim()) || undefined,
        filterUserIds:
          filterUserIds.length > 0 ? filterUserIds.join(',') : undefined,
        filterLabelIds:
          filterLabelIds.length > 0 ? filterLabelIds.join(',') : undefined,
        before: lastCard || undefined,
      });
    } catch (error) {
      response.error = error;
    }

    return response;
  }

  yield put(actions.fetchCards(listId));

  const getCardsRequestTask = yield fork(getCardsRequest);

  const [response] = yield race([
    join(getCardsRequestTask),
    take(
      action =>
        action.type === ActionTypes.CARDS_FETCH &&
        action.payload.listId === listId
    ),
  ]);

  if (!response) {
    return;
  }

  if (response.error) {
    yield put(actions.fetchCards.failure(listId, response.error));
    return;
  }

  const {
    body: {
      items: cards,
      included: {
        users,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
      },
    },
  } = response;

  yield put(
    actions.fetchCards.success(
      listId,
      cards,
      users,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues
    )
  );
}

export function* fetchCardsInCurrentList() {
  const currentListId = yield select(selectors.selectCurrentListId);

  yield call(fetchCards, currentListId);
}

export function* handleCardsUpdate(cards, activities) {
  yield put(actions.handleCardsUpdate(cards, activities));
}

export function* createCard(listId, data, autoOpen, userIds = [], labelIds = []) {
  const localId = yield call(createLocalId);
  const list = yield select(selectors.selectListById, listId);

  const currentUserMembership = yield select(
    selectors.selectCurrentUserMembershipByBoardId,
    list.boardId
  );

  const nextData = {
    ...data,
  };

  if (isListFinite(list)) {
    nextData.position = yield select(selectors.selectNextCardPosition, listId);
  }

  yield put(
    actions.createCard(
      {
        ...nextData,
        listId,
        id: localId,
        boardId: list.boardId,
        creatorUserId: currentUserMembership.userId,
      },
      autoOpen
    )
  );

  // TODO: use race instead
  let watchForCreateCardActionTask;
  if (autoOpen) {
    watchForCreateCardActionTask = yield fork(
      function* watchForCreateCardAction() {
        yield take(
          action =>
            action.type === ActionTypes.CARD_CREATE && action.payload.autoOpen
        );
      }
    );
  }

  let card;
  try {
    ({ item: card } = yield call(request, api.createCard, listId, nextData));
  } catch (error) {
    yield put(actions.createCard.failure(localId, error));
    return;
  }

  yield put(actions.createCard.success(localId, card));

  // Adicionar utilizadores ao cartão (se especificados)
  if (userIds.length > 0) {
    console.log('👥 Adicionando utilizadores ao cartão:', { cardId: card.id, userIds });
    for (const userId of userIds) {
      console.log('👥 Adicionando utilizador:', { cardId: card.id, userId });
      try {
        yield put(actions.addUserToCard(userId, card.id, false));
        const membership = yield call(request, api.createCardMembership, card.id, { userId });
        yield put(actions.addUserToCard.success(membership.item));
        console.log('✅ Utilizador adicionado com sucesso:', { cardId: card.id, userId });
      } catch (error) {
        yield put(actions.addUserToCard.failure(userId, card.id, error));
        console.error('❌ Erro ao adicionar utilizador:', { cardId: card.id, userId, error });
      }
    }
  }

  // Adicionar etiquetas ao cartão (se especificadas)
  if (labelIds.length > 0) {
    console.log('🏷️ Adicionando etiquetas ao cartão:', { cardId: card.id, labelIds });
    for (const labelId of labelIds) {
      console.log('🏷️ Adicionando etiqueta:', { cardId: card.id, labelId });
      try {
        yield put(actions.addLabelToCard(labelId, card.id));
        const cardLabel = yield call(request, api.createCardLabel, card.id, { labelId });
        yield put(actions.addLabelToCard.success(cardLabel.item));
        console.log('✅ Etiqueta adicionada com sucesso:', { cardId: card.id, labelId });
      } catch (error) {
        yield put(actions.addLabelToCard.failure(labelId, card.id, error));
        console.error('❌ Erro ao adicionar etiqueta:', { cardId: card.id, labelId, error });
      }
    }
  }

  if (
    watchForCreateCardActionTask &&
    watchForCreateCardActionTask.isRunning()
  ) {
    yield call(goToCard, card.id);
  }
}

export function* createCardInCurrentList(data, autoOpen, userIds = [], labelIds = []) {
  const currentListId = yield select(selectors.selectCurrentListId);

  yield call(createCard, currentListId, data, autoOpen, userIds, labelIds);
}

export function* createCardInFirstFiniteList(data, autoOpen, userIds = [], labelIds = []) {
  const firstFiniteListId = yield select(selectors.selectFirstFiniteListId);

  yield call(createCard, firstFiniteListId, data, autoOpen, userIds, labelIds);
}

export function* createCardWithAttachment(listId, cardData, attachmentFile) {
  console.log('🚀 Saga createCardWithAttachment iniciada');
  console.log('📋 ListId:', listId);
  console.log('📋 Dados do card:', cardData);
  console.log('📎 Arquivo:', attachmentFile);
  console.log(
    '📎 Nome do arquivo:',
    attachmentFile ? attachmentFile.name : 'undefined'
  );

  const localId = yield call(createLocalId);
  const list = yield select(selectors.selectListById, listId);

  const currentUserMembership = yield select(
    selectors.selectCurrentUserMembershipByBoardId,
    list.boardId
  );

  const nextCardData = {
    ...cardData,
  };

  if (isListFinite(list)) {
    nextCardData.position = yield select(
      selectors.selectNextCardPosition,
      listId
    );
  }

  console.log('🎴 Criando card no servidor...');
  console.log('🎴 Local ID:', localId);
  console.log('🎴 Board ID:', list.boardId);
  console.log('🎴 Creator User ID:', currentUserMembership.userId);

  // Criar o card primeiro
  yield put(
    actions.createCard(
      {
        ...nextCardData,
        listId,
        id: localId,
        boardId: list.boardId,
        creatorUserId: currentUserMembership.userId,
      },
      false // Não abrir automaticamente
    )
  );

  let card;
  try {
    // Criar o card no servidor
    console.log('🎴 Chamando API createCard...');
    ({ item: card } = yield call(
      request,
      api.createCard,
      listId,
      nextCardData
    ));
    console.log('✅ Card criado com sucesso:', card);
  } catch (error) {
    console.error('❌ Erro ao criar card:', error);
    console.error('❌ Detalhes do erro:', error.message);
    yield put(actions.createCard.failure(localId, error));
    return;
  }

  yield put(actions.createCard.success(localId, card));
  console.log('✅ Card criado e action de sucesso disparada');

  // Agora criar o anexo
  console.log('📎 Criando anexo...');
  console.log('📎 Card ID:', card.id);
  console.log('📎 AttachmentTypes.FILE:', AttachmentTypes.FILE);

  try {
    const attachmentData = {
      name: attachmentFile.name,
      type: AttachmentTypes.FILE,
    };

    console.log('📎 Dados do anexo:', attachmentData);

    const requestId = yield call(createLocalId);
    console.log('📎 Request ID:', requestId);

    let attachment;
    console.log('📎 Chamando API createAttachmentWithFile...');
    ({ item: attachment } = yield call(
      request,
      api.createAttachmentWithFile,
      card.id,
      { ...attachmentData, file: attachmentFile },
      requestId
    ));

    // O anexo será processado automaticamente pelo sistema de eventos
    console.log('✅ Anexo criado com sucesso:', attachment);
  } catch (error) {
    console.error('❌ Erro ao criar anexo:', error);
    console.error('❌ Detalhes do erro:', error.message);
    console.error('❌ Stack trace:', error.stack);
    // Não fazer rollback do card, apenas logar o erro
  }

  console.log('✅ Saga createCardWithAttachment finalizada');
}

export function* handleCardCreate(card) {
  let users;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;

  try {
    ({
      item: card, // eslint-disable-line no-param-reassign
      included: {
        users,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
      },
    } = yield call(request, api.getCard, card.id));
  } catch {
    return;
  }

  yield put(
    actions.handleCardCreate(
      card,
      users,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues
    )
  );
}

export function* updateCard(id, data) {
  let prevListId;
  if (data.listId) {
    const list = yield select(selectors.selectListById, data.listId);

    const card = yield select(selectors.selectCardById, id);
    const prevList = yield select(selectors.selectListById, card.listId);

    if (prevList.type === ListTypes.TRASH) {
      prevListId = null;
    } else if (isListArchiveOrTrash(list)) {
      prevListId = prevList.id;
    } else if (prevList.type === ListTypes.ARCHIVE) {
      prevListId = null;
    }
  }

  yield put(
    actions.updateCard(id, {
      ...data,
      ...(prevListId !== undefined && {
        prevListId,
      }),
    })
  );

  let card;
  try {
    ({ item: card } = yield call(request, api.updateCard, id, data));
  } catch (error) {
    yield put(actions.updateCard.failure(id, error));
    return;
  }

  yield put(actions.updateCard.success(card));
}

export function* updateCurrentCard(data) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(updateCard, cardId, data);
}

export function* handleCardUpdate(card) {
  const { cardId, boardId } = yield select(selectors.selectPath);

  let fetch = false;
  if (card.boardId) {
    const isAvailableForCurrentUser = yield select(
      selectors.selectIsCardWithIdAvailableForCurrentUser,
      card.id
    );

    fetch = !isAvailableForCurrentUser;
  }

  let users;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;

  if (fetch) {
    try {
      ({
        item: card, // eslint-disable-line no-param-reassign
        included: {
          users,
          cardMemberships,
          cardLabels,
          taskLists,
          tasks,
          attachments,
          customFieldGroups,
          customFields,
          customFieldValues,
        },
      } = yield call(request, api.getCard, card.id));
    } catch {
      fetch = false;
    }
  }

  yield put(
    actions.handleCardUpdate(
      card,
      fetch,
      users,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues
    )
  );

  if (card.boardId === null && card.id === cardId) {
    yield call(goToBoard, boardId);
  }
}

export function* moveCard(id, listId, index) {
  const data = {};
  if (listId) {
    data.listId = listId;
  } else {
    // eslint-disable-next-line no-param-reassign
    ({ listId } = yield select(selectors.selectCardById, id));
  }

  const list = yield select(selectors.selectListById, listId);

  if (isListFinite(list)) {
    data.position = yield select(
      selectors.selectNextCardPosition,
      listId,
      index,
      id
    );
  }

  yield call(updateCard, id, data);
}

export function* moveCurrentCard(listId, index, autoClose) {
  const { cardId, boardId } = yield select(selectors.selectPath);

  if (autoClose) {
    yield call(goToBoard, boardId);
  }

  yield call(moveCard, cardId, listId, index);
}

export function* moveCardToArchive(id) {
  const archiveListId = yield select(
    selectors.selectArchiveListIdForCurrentBoard
  );

  yield call(moveCard, id, archiveListId);
}

export function* moveCurrentCardToArchive() {
  const archiveListId = yield select(
    selectors.selectArchiveListIdForCurrentBoard
  );

  yield call(moveCurrentCard, archiveListId, undefined, true);
}

export function* moveCardToTrash(id) {
  const trashListId = yield select(selectors.selectTrashListIdForCurrentBoard);

  yield call(moveCard, id, trashListId);
}

export function* moveCurrentCardToTrash() {
  const trashListId = yield select(selectors.selectTrashListIdForCurrentBoard);

  yield call(moveCurrentCard, trashListId, undefined, true);
}

export function* transferCard(id, boardId, listId, index) {
  const { cardId: currentCardId, boardId: currentBoardId } = yield select(
    selectors.selectPath
  );

  // TODO: hack?
  if (id === currentCardId) {
    yield call(goToBoard, currentBoardId);
  }

  const list = yield select(selectors.selectListById, listId);

  const data = {
    listId,
    boardId,
  };

  if (isListFinite(list)) {
    data.position = yield select(
      selectors.selectNextCardPosition,
      listId,
      index,
      id
    );
  }

  yield call(updateCard, id, data);
}

export function* transferCurrentCard(boardId, listId, index) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(transferCard, cardId, boardId, listId, index);
}

export function* duplicateCard(id, data) {
  const localId = yield call(createLocalId);
  const { boardId, listId } = yield select(selectors.selectCardById, id);
  const index = yield select(selectors.selectCardIndexById, id);

  const currentUserMembership = yield select(
    selectors.selectCurrentUserMembershipByBoardId,
    boardId
  );

  const nextData = {
    ...data,
    position: yield select(selectors.selectNextCardPosition, listId, index + 1),
  };

  yield put(
    actions.duplicateCard(id, localId, {
      ...nextData,
      creatorUserId: currentUserMembership.userId,
    })
  );

  let card;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;

  try {
    ({
      item: card,
      included: {
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
      },
    } = yield call(request, api.duplicateCard, id, nextData));
  } catch (error) {
    yield put(actions.duplicateCard.failure(localId, error));
    return;
  }

  if (card.coverAttachmentId) {
    const coverAttachment = attachments.find(
      attachment => attachment.id === card.coverAttachmentId
    );

    if (coverAttachment) {
      yield call(_preloadImage, coverAttachment.data.thumbnailUrls.outside360);
    }
  }

  yield put(
    actions.duplicateCard.success(
      localId,
      card,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues
    )
  );
}

export function* duplicateCurrentCard(data) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(duplicateCard, cardId, data);
}

export function* goToAdjacentCard(direction) {
  const card = yield select(selectors.selectCurrentCard);
  const list = yield select(selectors.selectListById, card.listId);

  let cardIds;
  if (isListFinite(list)) {
    const { view } = yield select(selectors.selectCurrentBoard);

    if (view === BoardViews.KANBAN) {
      cardIds = yield select(
        selectors.selectFilteredCardIdsByListId,
        card.listId
      );
    } else {
      cardIds = yield select(selectors.selectFilteredCardIdsForCurrentBoard);
    }
  } else {
    cardIds = yield select(
      selectors.selectFilteredCardIdsByListId,
      card.listId
    );

    if (direction === 1 && card.id === cardIds[cardIds.length - 1]) {
      if (list.isCardsFetching || list.isAllCardsFetched) {
        return;
      }

      const [, cancelled] = yield race([
        call(fetchCards, list.id),
        take(LOCATION_CHANGE_HANDLE),
      ]);

      if (cancelled) {
        return;
      }

      cardIds = yield select(
        selectors.selectFilteredCardIdsByListId,
        card.listId
      );
    }
  }

  const index = cardIds.indexOf(card.id);

  if (index === -1) {
    return;
  }

  const adjacentCardId = cardIds[index + direction];

  if (adjacentCardId) {
    yield call(goToCard, adjacentCardId);
  }
}

export function* deleteCard(id) {
  const { cardId, boardId } = yield select(selectors.selectPath);

  yield put(actions.deleteCard(id));

  if (id === cardId) {
    yield call(goToBoard, boardId);
  }

  let card;
  try {
    ({ item: card } = yield call(request, api.deleteCard, id));
  } catch (error) {
    yield put(actions.deleteCard.failure(id, error));
    return;
  }

  yield put(actions.deleteCard.success(card));
}

export function* deleteCurrentCard() {
  const { cardId } = yield select(selectors.selectPath);

  yield call(deleteCard, cardId);
}

export function* handleCardDelete(card) {
  const { cardId } = yield select(selectors.selectPath);

  yield put(actions.handleCardDelete(card));

  if (card.id === cardId) {
    yield call(goToBoard, card.boardId);
  }
}

export default {
  fetchCards,
  fetchCardsInCurrentList,
  handleCardsUpdate,
  createCard,
  createCardInCurrentList,
  handleCardCreate,
  createCardInFirstFiniteList,
  createCardWithAttachment,
  updateCard,
  updateCurrentCard,
  handleCardUpdate,
  moveCard,
  moveCurrentCard,
  moveCardToArchive,
  moveCurrentCardToArchive,
  moveCardToTrash,
  moveCurrentCardToTrash,
  transferCard,
  transferCurrentCard,
  duplicateCard,
  duplicateCurrentCard,
  goToAdjacentCard,
  deleteCard,
  deleteCurrentCard,
  handleCardDelete,
};
