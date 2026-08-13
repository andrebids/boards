const DAY_IN_MILLISECONDS = 86400000;

export const parseGanttDate = (value) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatGanttDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addGanttDays = (value, amount) => {
  const date = typeof value === 'string' ? parseGanttDate(value) : new Date(value);
  date.setDate(date.getDate() + amount);
  return formatGanttDate(date);
};

export const differenceInGanttDays = (startDate, endDate) => {
  const start = parseGanttDate(startDate);
  const end = parseGanttDate(endDate);
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / DAY_IN_MILLISECONDS);
};
