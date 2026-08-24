import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import { createAttachment } from './attachments';

jest.mock('../request', () => jest.fn());
jest.mock('../../../selectors', () => ({
  selectCurrentUserId: jest.fn(),
}));
jest.mock('../../../api', () => ({
  createAttachmentWithFile: jest.fn(),
}));

describe('createAttachment', () => {
  const cardId = 'card-1';
  const file = { name: 'brief.pdf' };
  const data = { file, name: file.name, type: 'file' };

  test('returns the persisted attachment after replacing the optimistic item', () => {
    const attachment = { id: 'attachment-1', cardId, name: file.name };
    const generator = createAttachment(cardId, data);

    expect(generator.next().value).toEqual(call(createLocalId));
    expect(generator.next('local:attachment-1').value).toEqual(
      select(selectors.selectCurrentUserId),
    );
    expect(generator.next('user-1').value).toEqual(
      put(
        actions.createAttachment({
          cardId,
          creatorUserId: 'user-1',
          id: 'local:attachment-1',
          name: file.name,
          type: 'file',
        }),
      ),
    );
    expect(generator.next().value).toEqual(
      call(request, api.createAttachmentWithFile, cardId, data, 'local:attachment-1'),
    );
    expect(generator.next({ item: attachment }).value).toEqual(
      put(actions.createAttachment.success('local:attachment-1', attachment)),
    );
    expect(generator.next().value).toBe(attachment);
    expect(generator.next().done).toBe(true);
  });

  test('returns null after removing a failed optimistic item', () => {
    const error = new Error('upload failed');
    const generator = createAttachment(cardId, data);

    generator.next();
    generator.next('local:attachment-1');
    generator.next('user-1');
    generator.next();

    expect(generator.throw(error).value).toEqual(
      put(actions.createAttachment.failure('local:attachment-1', error)),
    );
    expect(generator.next().value).toBeNull();
    expect(generator.next().done).toBe(true);
  });
});
