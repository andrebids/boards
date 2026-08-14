const GANTT_STATUSES = ['notStarted', 'inProgress', 'testing', 'completed'];

const ALIASES = {
  'not started': 'notStarted',
  planned: 'notStarted',
  planeado: 'notStarted',
  'por iniciar': 'notStarted',
  'in progress': 'inProgress',
  'em curso': 'inProgress',
  'in testing': 'testing',
  'em teste': 'testing',
  'em testes': 'testing',
  completed: 'completed',
  concluido: 'completed',
  concluído: 'completed',
};

export const normalizeGanttStatus = (status) =>
  GANTT_STATUSES.includes(status) ? status : ALIASES[status?.trim().toLowerCase()] || status;

export const getEffectiveGanttStatus = (item, fallback = 'notStarted') => {
  if (item?.sourceTask) {
    return item.sourceTask.isCompleted ? 'completed' : 'notStarted';
  }

  const status = normalizeGanttStatus(item?.status);
  return GANTT_STATUSES.includes(status) ? status : fallback;
};

export const getGanttStatusTranslationKey = (status) => {
  const normalizedStatus = normalizeGanttStatus(status);
  return GANTT_STATUSES.includes(normalizedStatus)
    ? `common.ganttStatus_${normalizedStatus}`
    : null;
};

export default GANTT_STATUSES;
