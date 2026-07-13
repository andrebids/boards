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
