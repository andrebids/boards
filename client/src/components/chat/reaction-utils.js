export const QUICK_REACTION_EMOJIS = Object.freeze(['👍', '❤️', '😂', '😮']);

const FLOATING_PICKER_MARGIN = 12;

export const getReactionEmojiPickerPosition = (element, pickerWidth, pickerHeight) => {
  const rect = element.getBoundingClientRect();
  const maximumLeft = Math.max(
    FLOATING_PICKER_MARGIN,
    window.innerWidth - pickerWidth - FLOATING_PICKER_MARGIN,
  );
  const preferredTop = rect.top - pickerHeight - 8;
  const top =
    preferredTop >= FLOATING_PICKER_MARGIN
      ? preferredTop
      : Math.min(window.innerHeight - pickerHeight - FLOATING_PICKER_MARGIN, rect.bottom + 8);

  return {
    left: Math.min(Math.max(FLOATING_PICKER_MARGIN, rect.left), maximumLeft),
    top: Math.max(FLOATING_PICKER_MARGIN, top),
  };
};
