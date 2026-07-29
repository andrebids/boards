import { call, take } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';
import { createCardWithAttachmentWatcher } from './cards';

jest.mock('../services', () => ({
  createCardWithAttachment: jest.fn(),
}));

describe('createCardWithAttachmentWatcher', () => {
  test('queues card and attachment creation in dispatch order', () => {
    const channel = {
      take: jest.fn(),
      close: jest.fn(),
    };
    const firstFile = { name: 'INSTRUCTION 1.jpg' };
    const secondFile = { name: 'INSTRUCTION 2.jpg' };
    const firstAction = {
      type: EntryActionTypes.CARD_WITH_ATTACHMENT_CREATE,
      payload: {
        listId: 'list-1',
        cardData: { name: 'INSTRUCTION 1', type: 'story' },
        attachmentFile: firstFile,
      },
    };
    const secondAction = {
      type: EntryActionTypes.CARD_WITH_ATTACHMENT_CREATE,
      payload: {
        listId: 'list-1',
        cardData: { name: 'INSTRUCTION 2', type: 'story' },
        attachmentFile: secondFile,
      },
    };

    const generator = createCardWithAttachmentWatcher();
    const channelEffect = generator.next().value;

    expect(channelEffect).toMatchObject({
      type: 'ACTION_CHANNEL',
      payload: {
        pattern: EntryActionTypes.CARD_WITH_ATTACHMENT_CREATE,
      },
    });
    expect(channelEffect.payload.buffer).toEqual(
      expect.objectContaining({
        put: expect.any(Function),
        take: expect.any(Function),
      }),
    );
    expect(generator.next(channel).value).toEqual(take(channel));
    expect(generator.next(firstAction).value).toEqual(
      call(
        services.createCardWithAttachment,
        firstAction.payload.listId,
        firstAction.payload.cardData,
        firstAction.payload.attachmentFile,
      ),
    );
    expect(generator.next().value).toEqual(take(channel));
    expect(generator.next(secondAction).value).toEqual(
      call(
        services.createCardWithAttachment,
        secondAction.payload.listId,
        secondAction.payload.cardData,
        secondAction.payload.attachmentFile,
      ),
    );
  });
});
