const GANTT_STATUSES = ['notStarted', 'inProgress', 'completed'];

const ALIASES = {
  'not started': 'notStarted',
  planned: 'notStarted',
  planeado: 'notStarted',
  'por iniciar': 'notStarted',
  'in progress': 'inProgress',
  'em curso': 'inProgress',
  completed: 'completed',
  concluido: 'completed',
  concluído: 'completed',
};

export const normalizeGanttStatus = (status) =>
  GANTT_STATUSES.includes(status) ? status : ALIASES[status?.trim().toLowerCase()] || status;

export const getGanttStatusTranslationKey = (status) => {
  const normalizedStatus = normalizeGanttStatus(status);
  return GANTT_STATUSES.includes(normalizedStatus)
    ? `common.ganttStatus_${normalizedStatus}`
    : null;
};

export default GANTT_STATUSES;
