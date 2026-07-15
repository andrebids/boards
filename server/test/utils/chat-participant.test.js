const { expect } = require('chai');

const ChatParticipantDefinition = require('../../api/models/ChatParticipant');

describe('Chat participant notification preferences', () => {
  const now = Date.parse('2026-07-14T12:00:00.000Z');

  it('derives active mute state from the notification level and expiration', () => {
    expect(
      ChatParticipantDefinition.isMuted(
        { notificationLevel: 'all', mutedUntil: '2026-07-14T13:00:00.000Z' },
        now,
      ),
    ).to.equal(true);
    expect(
      ChatParticipantDefinition.isMuted(
        { notificationLevel: 'all', mutedUntil: '2026-07-14T12:00:00.000Z' },
        now,
      ),
    ).to.equal(false);
    expect(
      ChatParticipantDefinition.isMuted(
        { notificationLevel: ChatParticipantDefinition.NotificationLevels.NONE, mutedUntil: null },
        now,
      ),
    ).to.equal(true);
  });

  it('serializes an expired temporary mute as inactive', () => {
    const serialized = ChatParticipantDefinition.customToJSON.call({
      id: 'participant-1',
      notificationLevel: 'all',
      mutedUntil: '2000-01-01T00:00:00.000Z',
      isMuted: true,
      toJSON: () => null,
    });

    expect(serialized).to.include({
      id: 'participant-1',
      isMuted: false,
    });
    expect(serialized).not.to.have.property('toJSON');
  });
});
