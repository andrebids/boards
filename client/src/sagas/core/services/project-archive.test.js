import { runSaga } from 'redux-saga';
import toast from 'react-hot-toast';
import request from '../request';
import { goToRoot } from './router';
import { setProjectArchived } from './projects';

jest.mock('../../../selectors', () => ({
  __esModule: true,
  default: {
    selectProjectById: (state) => state.project,
    selectPath: (state) => state.path,
  },
}));
jest.mock('../../../actions', () => {
  const updateProject = (id, data) => ({ type: 'pending', payload: data });
  updateProject.success = (project) => ({ type: 'success', payload: project });
  return {
    __esModule: true,
    default: {
      updateProject,
      closeModal: () => ({ type: 'close' }),
    },
  };
});
jest.mock('../../../api', () => ({ __esModule: true, default: { updateProject: jest.fn() } }));
jest.mock('../request', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../requests', () => ({ __esModule: true, default: {} }));
jest.mock('./router', () => ({ goToRoot: jest.fn() }));
jest.mock('../../../i18n', () => ({ __esModule: true, default: { t: (key) => key } }));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

const run = (state, isArchived, actions = []) =>
  runSaga(
    {
      getState: () => state,
      dispatch: (action) => {
        actions.push(action);
        if (['pending', 'success'].includes(action.type))
          Object.assign(state.project, action.payload);
      },
    },
    setProjectArchived,
    'project',
    isArchived,
  );

test('waits for persistence, ignores duplicate clicks and navigates only after archive succeeds', async () => {
  const state = { project: { id: 'project', isArchived: false }, path: { projectId: 'project' } };
  let finish;
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const actions = [];
  const task = run(state, true, actions);
  expect(state.project.isArchived).toBe(false);
  expect(state.project.isArchiveSubmitting).toBe(true);
  await run(state, true).toPromise();
  expect(request).toHaveBeenCalledTimes(1);
  expect(goToRoot).not.toHaveBeenCalled();
  finish({ item: { id: 'project', isArchived: true } });
  await task.toPromise();
  expect(state.project).toMatchObject({ isArchived: true, isArchiveSubmitting: false });
  expect(actions.map((a) => a.type)).toEqual(['pending', 'success', 'close']);
  expect(goToRoot).toHaveBeenCalledTimes(1);
});

test.each([true, false])(
  'keeps the confirmed state when setting archive=%s fails',
  async (next) => {
    const state = { project: { id: 'project', isArchived: !next }, path: { projectId: 'project' } };
    request.mockRejectedValue(new Error('Offline'));
    await run(state, next).toPromise();
    expect(state.project).toMatchObject({ isArchived: !next, isArchiveSubmitting: false });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(goToRoot).not.toHaveBeenCalled();
  },
);

test('restores hidden projects without changing visibility or navigating away from the archive', async () => {
  const project = { id: 'project', isArchived: true, isHidden: true, isFavorite: true };
  const state = { project, path: {} };
  request.mockResolvedValue({ item: { ...project, isArchived: false } });
  await run(state, false).toPromise();
  expect(state.project).toMatchObject({ isArchived: false, isHidden: true, isFavorite: true });
  expect(toast.success).toHaveBeenCalledWith('common.projectRestoredHidden');
  expect(goToRoot).not.toHaveBeenCalled();
});
