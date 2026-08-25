import orm from '../orm';
import {
  makeSelectNotificationIdsByProjectId,
  selectReadNotificationIdsForCurrentUser,
} from './notifications';

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

describe('project notification selectors', () => {
  test('returns only unread notifications belonging to the selected project', () => {
    const session = orm.mutableSession(orm.getEmptyState());

    session.User.create({ id: 'user-1', name: 'Current user' });
    session.User.create({ id: 'user-2', name: 'Other user' });
    session.Project.create({ id: 'project-1', name: 'First project' });
    session.Project.create({ id: 'project-2', name: 'Second project' });
    session.Board.create({ id: 'board-1', projectId: 'project-1' });
    session.Board.create({ id: 'board-2', projectId: 'project-2' });

    session.Notification.create({
      id: 'notification-1',
      userId: 'user-1',
      boardId: 'board-1',
      isRead: false,
    });
    session.Notification.create({
      id: 'notification-2',
      userId: 'user-1',
      boardId: 'board-1',
      isRead: true,
    });
    session.Notification.create({
      id: 'notification-3',
      userId: 'user-1',
      boardId: 'board-2',
      isRead: false,
    });
    session.Notification.create({
      id: 'notification-4',
      userId: 'user-2',
      boardId: 'board-1',
      isRead: false,
    });

    const selectNotificationIdsByProjectId = makeSelectNotificationIdsByProjectId();
    const state = {
      auth: { userId: 'user-1' },
      orm: session.state,
    };

    expect(selectNotificationIdsByProjectId(state, 'project-1')).toEqual(['notification-1']);
  });

  test('returns read notifications for the current user newest first', () => {
    const session = orm.mutableSession(orm.getEmptyState());

    session.User.create({ id: 'user-1', name: 'Current user' });
    session.Notification.create({
      id: 'notification-1',
      userId: 'user-1',
      boardId: 'board-1',
      isRead: true,
    });
    session.Notification.create({
      id: 'notification-2',
      userId: 'user-1',
      boardId: 'board-1',
      isRead: false,
    });
    session.Notification.create({
      id: 'notification-3',
      userId: 'user-1',
      boardId: 'board-1',
      isRead: true,
    });

    expect(
      selectReadNotificationIdsForCurrentUser({
        auth: { userId: 'user-1' },
        orm: session.state,
      }),
    ).toEqual(['notification-3', 'notification-1']);
  });
});
