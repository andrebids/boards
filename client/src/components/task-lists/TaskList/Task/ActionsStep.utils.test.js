import { getTaskDeleteConfirmation } from './ActionsStep.utils';

describe('task deletion confirmation', () => {
  it('warns that child tasks will be preserved', () => {
    expect(getTaskDeleteConfirmation(2)).toEqual({
      content: 'common.areYouSureYouWantToDeleteThisTaskWithSubtasks',
      contentValues: { count: 2 },
    });
  });

  it('keeps the standard confirmation when the task has no children', () => {
    expect(getTaskDeleteConfirmation(0)).toEqual({
      content: 'common.areYouSureYouWantToDeleteThisTask',
      contentValues: undefined,
    });
  });
});
