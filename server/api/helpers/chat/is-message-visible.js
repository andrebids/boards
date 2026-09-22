const { isIdAtOrBefore } = require('../../../utils/id-helpers');

const isMessageVisible = (message, participant) => {
  if (!message) {
    return false;
  }
  if (!participant) {
    return true;
  }
  if (
    participant.historyClearedThroughMessageId &&
    isIdAtOrBefore(message.id, participant.historyClearedThroughMessageId)
  ) {
    return false;
  }
  if (participant.leftAt) {
    if (
      participant.leftAt &&
      message.editedAt &&
      new Date(message.editedAt).getTime() > new Date(participant.leftAt).getTime()
    ) {
      return false;
    }
    return Boolean(
      participant.historyVisibleThroughMessageId &&
        isIdAtOrBefore(message.id, participant.historyVisibleThroughMessageId),
    );
  }
  return true;
};

module.exports = {
  sync: true,
  isMessageVisible,

  inputs: {
    message: { type: 'ref', required: true },
    participant: { type: 'ref' },
  },

  fn(inputs) {
    return isMessageVisible(inputs.message, inputs.participant);
  },
};
