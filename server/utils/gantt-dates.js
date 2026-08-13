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
        startDate: merged.startDate,
        endDate: addDays(merged.startDate, merged.expectedDurationDays - 1),
        expectedDurationDays: merged.expectedDurationDays,
      };
    }

    throw new Error('DATES_MUST_BE_BOTH_PRESENT');
  }

  if (!parseDate(merged.startDate) || !parseDate(merged.endDate)) {
    throw new Error('INVALID_DATE');
  }

  if (!Number.isInteger(merged.expectedDurationDays) || merged.expectedDurationDays < 1) {
    throw new Error('INVALID_DURATION');
  }

  if (values.endDate !== undefined && values.expectedDurationDays === undefined) {
    const expectedDurationDays = differenceInDays(merged.startDate, merged.endDate) + 1;
    if (expectedDurationDays < 1) {
      throw new Error('INVALID_DATE_RANGE');
    }

    return {
      startDate: merged.startDate,
      endDate: merged.endDate,
      expectedDurationDays,
    };
  }

  return {
    startDate: merged.startDate,
    endDate: addDays(merged.startDate, merged.expectedDurationDays - 1),
    expectedDurationDays: merged.expectedDurationDays,
  };
};

module.exports = {
  addDays,
  differenceInDays,
  normalizeItemDates,
  normalizeStoredDate,
  parseDate,
};
