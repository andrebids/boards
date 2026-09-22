const { expect } = require('chai');
// Exercise the machine runtime supplied by Sails rather than only the helper's raw fn.
// eslint-disable-next-line import/no-extraneous-dependencies
const { buildWithCustomUsage } = require('machine');

const { isActiveParticipant, getActiveParticipants } = require('../../utils/chat-lifecycle');
const { isMessageVisible } = require('../../api/helpers/chat/is-message-visible');
const visibilityHelper = require('../../api/helpers/chat/is-message-visible');
const { isHistoricalExtraVisible } = require('../../utils/chat-history');

describe('Chat participant lifecycle boundaries', () => {
  it('returns a boolean through the real Sails machine contract', () => {
    const helper = buildWithCustomUsage({
      def: { identity: 'is-message-visible', ...visibilityHelper },
      implementationSniffingTactic: 'analogOrClassical',
      execStyle: 'natural',
    });
    expect(
      helper({
        message: { id: '21' },
        participant: { leftAt: '2026-09-21T10:00:00.000Z', historyVisibleThroughMessageId: '20' },
      }),
    ).to.equal(false);
    expect(helper({ message: { id: '1' } })).to.equal(true);
  });

  it('rejects late attachment, reaction and refreshed preview metadata', () => {
    const participant = { leftAt: '2026-09-21T10:00:00.000Z' };
    expect(
      isHistoricalExtraVisible({ createdAt: '2026-09-21T09:00:00.000Z' }, participant),
    ).to.equal(true);
    ['createdAt', 'updatedAt', 'fetchedAt'].forEach((key) => {
      expect(isHistoricalExtraVisible({ [key]: '2026-09-21T11:00:00.000Z' }, participant)).to.equal(
        false,
      );
    });
  });
  it('keeps only active project members in the writer set', () => {
    const participants = [
      { id: 'owner', userId: 'u1', leftAt: null },
      { id: 'member', userId: 'u2', leftAt: null },
      { id: 'left', userId: 'u3', leftAt: '2026-09-21T10:00:00.000Z' },
      { id: 'external', userId: 'u4', leftAt: null },
    ];

    expect(isActiveParticipant(participants[0])).to.equal(true);
    expect(getActiveParticipants(participants, ['u1', 'u2', 'u3'])).to.deep.equal(
      participants.slice(0, 2),
    );
  });

  it('applies the private lower boundary and historical upper boundary', () => {
    const participant = {
      historyClearedThroughMessageId: '10',
      leftAt: '2026-09-21T10:00:00.000Z',
      historyVisibleThroughMessageId: '20',
    };

    expect(isMessageVisible({ id: '10', editedAt: null }, participant)).to.equal(false);
    expect(
      isMessageVisible({ id: '15', editedAt: '2026-09-21T09:00:00.000Z' }, participant),
    ).to.equal(true);
    expect(isMessageVisible({ id: '20', editedAt: null }, participant)).to.equal(true);
    expect(isMessageVisible({ id: '21', editedAt: null }, participant)).to.equal(false);
    expect(
      isMessageVisible({ id: '15', editedAt: '2026-09-21T11:00:00.000Z' }, participant),
    ).to.equal(false);
  });

  it('does not expose historical content when the re-entry upper boundary is absent', () => {
    expect(
      isMessageVisible(
        { id: '1', editedAt: null },
        { leftAt: '2026-09-21T10:00:00.000Z', historyVisibleThroughMessageId: null },
      ),
    ).to.equal(false);
  });
});
