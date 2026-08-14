import GANTT_STATUSES, {
  getGanttStatusTranslationKey,
  normalizeGanttStatus,
} from './GanttStatuses';

describe('Gantt statuses', () => {
  test.each([
    ['Not started', 'notStarted'],
    ['Por iniciar', 'notStarted'],
    ['Planeado', 'notStarted'],
    ['In progress', 'inProgress'],
    ['Em curso', 'inProgress'],
    ['Completed', 'completed'],
    ['Concluído', 'completed'],
  ])('normalizes %s', (status, expected) => {
    expect(normalizeGanttStatus(status)).toBe(expected);
  });

  test('exposes canonical values and translation keys', () => {
    expect(GANTT_STATUSES).toEqual(['notStarted', 'inProgress', 'completed']);
    expect(getGanttStatusTranslationKey('Em curso')).toBe('common.ganttStatus_inProgress');
  });
});
