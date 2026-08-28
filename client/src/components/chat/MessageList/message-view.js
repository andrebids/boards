const GROUP_INTERVAL_MS = 5 * 60 * 1000;

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const emojiSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const emojiGraphemePattern =
  /^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E|\p{Emoji_Modifier}|\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E|\p{Emoji_Modifier})?)*$/u;

const isSameDay = (first, second) => {
  const firstDate = new Date(first);
  const secondDate = new Date(second);

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
};

export const formatMessageTime = (value) => timeFormatter.format(new Date(value));

export const formatMessageDay = (value) => dayFormatter.format(new Date(value));

export const getMessageGrouping = (message, previousMessage, nextMessage) => {
  const startsNewDay = !previousMessage || !isSameDay(previousMessage.createdAt, message.createdAt);
  const continuesPrevious = Boolean(
    previousMessage &&
      previousMessage.userId === message.userId &&
      !startsNewDay &&
      new Date(message.createdAt) - new Date(previousMessage.createdAt) < GROUP_INTERVAL_MS,
  );
  const continuesNext = Boolean(
    nextMessage &&
      nextMessage.userId === message.userId &&
      isSameDay(message.createdAt, nextMessage.createdAt) &&
      new Date(nextMessage.createdAt) - new Date(message.createdAt) < GROUP_INTERVAL_MS,
  );

  return { continuesNext, continuesPrevious, startsNewDay };
};

export const isEmojiOnlyMessage = (text) => {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return false;

  const graphemes = emojiSegmenter
    ? Array.from(emojiSegmenter.segment(normalizedText), ({ segment }) => segment)
    : Array.from(normalizedText);
  const visibleGraphemes = graphemes.filter((grapheme) => !/^\s+$/u.test(grapheme));

  return (
    visibleGraphemes.length > 0 &&
    visibleGraphemes.length <= 3 &&
    visibleGraphemes.every((grapheme) => emojiGraphemePattern.test(grapheme))
  );
};

export const classifyMessageAttachments = (message) => {
  const attachments = message.deletedAt ? [] : message.attachments || [];

  return {
    imageAttachments: attachments.filter((attachment) => attachment.data?.image),
    otherAttachments: attachments.filter((attachment) => !attachment.data?.image),
  };
};

export const createMemberNameById = (members) => new Map(members.map(({ id, name }) => [id, name]));
