import ChatParticipant from './ChatParticipant';
import ActionTypes from '../constants/ActionTypes';

describe('ChatParticipant group reconciliation', () => {
  test('removes participants omitted from an authoritative group update', () => {
    const keptParticipant = { id: 'participant-1', conversationId: 'conversation-1' };
    const removedParticipant = {
      id: 'participant-2',
      conversationId: 'conversation-1',
      delete: jest.fn(),
    };
    const model = {
      filter: jest.fn(() => ({
        toModelArray: () => [keptParticipant, removedParticipant],
      })),
      upsert: jest.fn(),
    };

    ChatParticipant.reducer(
      {
        type: ActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE,
        payload: {
          chatParticipants: [keptParticipant],
        },
      },
      model,
    );

    expect(removedParticipant.delete).toHaveBeenCalledTimes(1);
    expect(model.upsert).toHaveBeenCalledWith(keptParticipant);
  });
});

describe('ChatParticipant notification preferences', () => {
  const reducePreferences = (participant, type, payload) => {
    ChatParticipant.reducer(
      { type, payload },
      {
        withId: (id) => (id === participant.id ? participant : null),
      },
    );
  };

  test.each([
    {
      notificationLevel: 'all',
      mutedUntil: '2026-07-14T18:00:00.000Z',
    },
    {
      notificationLevel: 'none',
      mutedUntil: null,
    },
  ])('shows the muted state optimistically for %#', (data) => {
    const participant = {
      id: 'participant-1',
      update: jest.fn(),
    };

    reducePreferences(participant, ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE, {
      participantId: participant.id,
      data,
    });

    expect(participant.update).toHaveBeenCalledWith({ ...data, isMuted: true });
  });

  test('restores the previous state when the request fails', () => {
    const participant = {
      id: 'participant-1',
      update: jest.fn(),
    };
    const previousData = {
      notificationLevel: 'all',
      mutedUntil: null,
      isMuted: false,
    };

    reducePreferences(participant, ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__FAILURE, {
      participantId: participant.id,
      previousData,
    });

    expect(participant.update).toHaveBeenCalledWith(previousData);
  });
});
