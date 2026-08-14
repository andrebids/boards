import GANTT_STATUSES, {
  getEffectiveGanttStatus,
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
    ['In testing', 'testing'],
    ['Em teste', 'testing'],
    ['Em testes', 'testing'],
    ['Completed', 'completed'],
    ['Concluído', 'completed'],
  ])('normalizes %s', (status, expected) => {
    expect(normalizeGanttStatus(status)).toBe(expected);
  });

  test('exposes canonical values and translation keys', () => {
    expect(GANTT_STATUSES).toEqual(['notStarted', 'inProgress', 'testing', 'completed']);
    expect(getGanttStatusTranslationKey('Em curso')).toBe('common.ganttStatus_inProgress');
    expect(getGanttStatusTranslationKey('Em testes')).toBe('common.ganttStatus_testing');
  });

  test('resolves autonomous and board-linked item statuses', () => {
    expect(getEffectiveGanttStatus({ status: 'Em testes' })).toBe('testing');
    expect(getEffectiveGanttStatus({ status: 'unknown' })).toBe('notStarted');
    expect(getEffectiveGanttStatus({ status: null }, 'inProgress')).toBe('inProgress');
    expect(getEffectiveGanttStatus({ sourceTask: { isCompleted: false } })).toBe('notStarted');
    expect(getEffectiveGanttStatus({ sourceTask: { isCompleted: true } })).toBe('completed');
  });
});
