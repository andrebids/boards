/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const addDays = (value, amount) => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDate(date);
};

const differenceInDays = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
};

const isBusinessDay = (date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

const addBusinessDays = (value, amount) => {
  const date = parseDate(value);
  let remaining = amount % 5;
  while (!isBusinessDay(date)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCDate(date.getUTCDate() + Math.floor(amount / 5) * 7);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (isBusinessDay(date)) remaining -= 1;
  }
  return formatDate(date);
};

const countBusinessDays = (startDate, endDate) => {
  const date = parseDate(startDate);
  const end = parseDate(endDate);
  const fullWeeks = Math.floor(Math.max(0, differenceInDays(startDate, endDate) + 1) / 7);
  let count = fullWeeks * 5;
  date.setUTCDate(date.getUTCDate() + fullWeeks * 7);
  while (date <= end) {
    if (isBusinessDay(date)) count += 1;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return Math.max(1, count);
};

const normalizeStoredDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return String(value).slice(0, 10);
};

const normalizeItemDates = ({ current = {}, values }) => {
  const merged = {
    startDate: normalizeStoredDate(current.startDate),
    endDate: normalizeStoredDate(current.endDate),
    expectedDurationDays: current.expectedDurationDays || 1,
    ...values,
  };

  if (!Number.isInteger(merged.expectedDurationDays) || merged.expectedDurationDays < 1) {
    throw new Error('INVALID_DURATION');
  }
  if (
    (merged.startDate !== null && !parseDate(merged.startDate)) ||
    (merged.endDate !== null && !parseDate(merged.endDate))
  ) {
    throw new Error('INVALID_DATE');
  }

  if (merged.startDate === null || merged.endDate === null) {
    if (merged.startDate === null && merged.endDate === null) {
      return {
        startDate: null,
        endDate: null,
        expectedDurationDays: merged.expectedDurationDays,
      };
    }

    if (merged.startDate && values.expectedDurationDays !== undefined) {
      return {
        startDate: addBusinessDays(merged.startDate, 0),
        endDate: addBusinessDays(merged.startDate, merged.expectedDurationDays - 1),
        expectedDurationDays: merged.expectedDurationDays,
      };
    }

    throw new Error('DATES_MUST_BE_BOTH_PRESENT');
  }

  if (values.endDate !== undefined && values.expectedDurationDays === undefined) {
    if (merged.endDate < merged.startDate) {
      throw new Error('INVALID_DATE_RANGE');
    }

    return {
      startDate: merged.startDate,
      endDate: merged.endDate,
      expectedDurationDays: countBusinessDays(merged.startDate, merged.endDate),
    };
  }

  return {
    startDate: addBusinessDays(merged.startDate, 0),
    endDate: addBusinessDays(merged.startDate, merged.expectedDurationDays - 1),
    expectedDurationDays: merged.expectedDurationDays,
  };
};

module.exports = {
  addBusinessDays,
  addDays,
  countBusinessDays,
  differenceInDays,
  normalizeItemDates,
  normalizeStoredDate,
  parseDate,
};
