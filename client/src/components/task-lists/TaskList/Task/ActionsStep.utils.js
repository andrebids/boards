export const getTaskDeleteConfirmation = (childTaskCount) => ({
  content: childTaskCount
    ? 'common.areYouSureYouWantToDeleteThisTaskWithSubtasks'
    : 'common.areYouSureYouWantToDeleteThisTask',
  contentValues: childTaskCount ? { count: childTaskCount } : undefined,
});

export default {
  getTaskDeleteConfirmation,
};
