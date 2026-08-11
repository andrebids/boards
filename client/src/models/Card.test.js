import orm from '../orm';
import ormReducer from '../reducers/orm';
import actions from '../actions/cards';
import selectors from '../selectors';

jest.mock('../constants/Config', () => ({
  __esModule: true,
  default: {
    ACTIVITIES_LIMIT: 10,
    CARDS_LIMIT: 50,
    COMMENTS_LIMIT: 50,
    POSITION_GAP: 65536,
  },
}));
jest.mock('../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));

const createState = () => {
  const session = orm.mutableSession(orm.getEmptyState());

  session.User.create({ id: 'user-1', name: 'User' });
  session.Board.create({ id: 'board-1' });
  session.Board.create({ id: 'board-2' });
  session.List.create({ id: 'list-1', boardId: 'board-1', type: 'active' });
  session.List.create({ id: 'list-2', boardId: 'board-1', type: 'active' });
  session.List.create({ id: 'list-3', boardId: 'board-2', type: 'active' });
  session.Label.create({ id: 'label-1', boardId: 'board-1', name: 'Label' });

  const cardModel = session.Card.create({
    id: 'card-1',
    boardId: 'board-1',
    listId: 'list-1',
    name: 'Original',
    position: 1,
  });

  cardModel.users.add('user-1');
  cardModel.labels.add('label-1');

  session.TaskList.create({
    id: 'task-list-1',
    cardId: 'card-1',
    name: 'Tasks',
    position: 1,
  });
  session.Task.create({
    id: 'task-1',
    taskListId: 'task-list-1',
    name: 'Task',
    position: 1,
  });
  session.Attachment.create({
    id: 'attachment-1',
    cardId: 'card-1',
    creatorUserId: 'user-1',
    name: 'Attachment',
  });
  cardModel.update({ coverAttachmentId: 'attachment-1' });
  session.CustomFieldGroup.create({
    id: 'custom-field-group-1',
    cardId: 'card-1',
    name: 'Fields',
    position: 1,
  });
  session.CustomField.create({
    id: 'custom-field-1',
    customFieldGroupId: 'custom-field-group-1',
    name: 'Field',
    position: 1,
  });
  session.CustomFieldValue.create({
    id: 'card-1:custom-field-group-1:custom-field-1',
    cardId: 'card-1',
    customFieldGroupId: 'custom-field-group-1',
    customFieldId: 'custom-field-1',
    content: 'Value',
  });
  session.Comment.create({
    id: 'comment-1',
    cardId: 'card-1',
    userId: 'user-1',
    text: 'Comment',
  });

  return session.state;
};

const expectCardAggregateToExist = (state) => {
  const session = orm.session(state);
  const cardModel = session.Card.withId('card-1');

  expect(cardModel).not.toBeNull();
  expect(cardModel.ref).toMatchObject({
    boardId: 'board-1',
    listId: 'list-1',
    name: 'Original',
    position: 1,
    coverAttachmentId: 'attachment-1',
  });
  expect(cardModel.users.toRefArray().map((user) => user.id)).toEqual(['user-1']);
  expect(cardModel.labels.toRefArray().map((label) => label.id)).toEqual(['label-1']);
  expect(session.TaskList.idExists('task-list-1')).toBe(true);
  expect(session.Task.idExists('task-1')).toBe(true);
  expect(session.Attachment.idExists('attachment-1')).toBe(true);
  expect(session.CustomFieldGroup.idExists('custom-field-group-1')).toBe(true);
  expect(session.CustomField.idExists('custom-field-1')).toBe(true);
  expect(session.CustomFieldValue.idExists('card-1:custom-field-group-1:custom-field-1')).toBe(
    true,
  );
  expect(session.Comment.idExists('comment-1')).toBe(true);
};

describe('Card optimistic rollback', () => {
  test('restores fields after a failed update or move', () => {
    const initialState = createState();
    const rollbackData = selectors.selectCardRollbackDataById({ orm: initialState }, 'card-1');

    const optimisticState = ormReducer(
      initialState,
      actions.updateCard('card-1', {
        listId: 'list-2',
        name: 'Changed',
        position: 2,
      }),
    );

    expect(orm.session(optimisticState).Card.withId('card-1').ref).toMatchObject({
      listId: 'list-2',
      name: 'Changed',
      position: 2,
    });

    const restoredState = ormReducer(
      optimisticState,
      actions.updateCard.failure('card-1', new Error('network'), rollbackData),
    );

    expectCardAggregateToExist(restoredState);
  });

  test.each([
    [
      'transfer',
      actions.updateCard('card-1', {
        boardId: 'board-2',
        listId: 'list-2',
      }),
      (rollbackData, error) => actions.updateCard.failure('card-1', error, rollbackData),
    ],
    [
      'delete',
      actions.deleteCard('card-1'),
      (rollbackData, error) => actions.deleteCard.failure('card-1', error, rollbackData),
    ],
  ])('restores the full aggregate after a failed %s', (_, action, failure) => {
    const initialState = createState();
    const rollbackData = selectors.selectCardRollbackDataById({ orm: initialState }, 'card-1');
    const optimisticState = ormReducer(initialState, action);
    const optimisticSession = orm.session(optimisticState);

    expect(optimisticSession.Card.idExists('card-1')).toBe(false);
    expect(optimisticSession.TaskList.idExists('task-list-1')).toBe(false);
    expect(optimisticSession.Task.idExists('task-1')).toBe(false);
    expect(optimisticSession.Attachment.idExists('attachment-1')).toBe(false);
    expect(optimisticSession.Comment.idExists('comment-1')).toBe(false);

    const restoredState = ormReducer(optimisticState, failure(rollbackData, new Error('network')));

    expectCardAggregateToExist(restoredState);
  });

  test('ignores an old update failure after a newer update succeeds', () => {
    const initialState = createState();
    const rollbackData = selectors.selectCardRollbackDataById({ orm: initialState }, 'card-1');
    const firstState = ormReducer(
      initialState,
      actions.updateCard('card-1', { name: 'First' }, 'operation-1'),
    );
    const secondState = ormReducer(
      firstState,
      actions.updateCard('card-1', { name: 'Second' }, 'operation-2'),
    );
    const succeededState = ormReducer(
      secondState,
      actions.updateCard.success({ id: 'card-1', name: 'Second' }, 'operation-2'),
    );
    const stateAfterOldFailure = ormReducer(
      succeededState,
      actions.updateCard.failure('card-1', new Error('late failure'), rollbackData, 'operation-1'),
    );

    expect(stateAfterOldFailure).toBe(succeededState);
    expect(orm.session(stateAfterOldFailure).Card.withId('card-1').name).toBe('Second');
  });

  test.each([
    [
      'transfer',
      actions.updateCard('card-1', { boardId: 'board-2', listId: 'list-3' }, 'operation-2'),
      actions.updateCard.success(
        {
          id: 'card-1',
          boardId: 'board-2',
          listId: 'list-3',
          name: 'Transferred',
        },
        'operation-2',
      ),
      true,
    ],
    [
      'delete',
      actions.deleteCard('card-1', 'operation-2'),
      actions.deleteCard.success({ id: 'card-1' }, 'operation-2'),
      false,
    ],
  ])(
    'does not let an old update failure undo a newer %s',
    (_, newerAction, newerSuccess, cardShouldExist) => {
      const initialState = createState();
      const rollbackData = selectors.selectCardRollbackDataById({ orm: initialState }, 'card-1');
      const firstState = ormReducer(
        initialState,
        actions.updateCard('card-1', { name: 'Old update' }, 'operation-1'),
      );
      const secondState = ormReducer(firstState, newerAction);
      const succeededState = ormReducer(secondState, newerSuccess);
      const stateAfterOldFailure = ormReducer(
        succeededState,
        actions.updateCard.failure(
          'card-1',
          new Error('late failure'),
          rollbackData,
          'operation-1',
        ),
      );

      expect(stateAfterOldFailure).toBe(succeededState);
      expect(orm.session(stateAfterOldFailure).Card.idExists('card-1')).toBe(cardShouldExist);
    },
  );

  test.each([
    [
      'update',
      (rollbackData) =>
        actions.updateCard('card-1', { name: 'Second' }, 'operation-2', rollbackData),
    ],
    [
      'transfer',
      (rollbackData) =>
        actions.updateCard(
          'card-1',
          { boardId: 'board-2', listId: 'list-3' },
          'operation-2',
          rollbackData,
        ),
    ],
    ['delete', (rollbackData) => actions.deleteCard('card-1', 'operation-2', rollbackData)],
  ])(
    'rebases the newer %s snapshot when both operations fail out of order',
    (_, createSecondAction) => {
      const initialState = createState();
      const firstRollbackData = selectors.selectCardRollbackDataById(
        { orm: initialState },
        'card-1',
      );
      const firstState = ormReducer(
        initialState,
        actions.updateCard('card-1', { name: 'First' }, 'operation-1', firstRollbackData),
      );
      const secondRollbackData = selectors.selectCardRollbackDataById(
        { orm: firstState },
        'card-1',
      );
      const secondState = ormReducer(firstState, createSecondAction(secondRollbackData));
      const stateAfterFirstFailure = ormReducer(
        secondState,
        actions.updateCard.failure(
          'card-1',
          new Error('first failed'),
          firstRollbackData,
          'operation-1',
        ),
      );

      expect(orm.session(stateAfterFirstFailure).Card.idExists('card-1')).toBe(
        orm.session(secondState).Card.idExists('card-1'),
      );

      const restoredState = ormReducer(
        stateAfterFirstFailure,
        actions.updateCard.failure(
          'card-1',
          new Error('second failed'),
          secondRollbackData,
          'operation-2',
        ),
      );

      expectCardAggregateToExist(restoredState);
    },
  );
});
