export const compareIds = (left, right) => {
  if (!left || !right) return 0;

  const leftValue = String(left);
  const rightValue = String(right);
  if (/^\d+$/.test(leftValue) && /^\d+$/.test(rightValue)) {
    const normalizedLeft = leftValue.replace(/^0+/, '') || '0';
    const normalizedRight = rightValue.replace(/^0+/, '') || '0';
    return (
      normalizedLeft.length - normalizedRight.length ||
      normalizedLeft.localeCompare(normalizedRight)
    );
  }

  return leftValue.localeCompare(rightValue);
};

export const isIdAtOrBefore = (id, cursorId) =>
  Boolean(id && cursorId && compareIds(id, cursorId) <= 0);
