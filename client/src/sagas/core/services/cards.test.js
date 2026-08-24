import { call } from 'redux-saga/effects';
import toast from 'react-hot-toast';

import ToastTypes from '../../../constants/ToastTypes';
import { createAttachment } from './attachments';
import { uploadCardAttachment } from './cards';

jest.mock('../../../lib/redux-router', () => ({
  LOCATION_CHANGE_HANDLE: 'LOCATION_CHANGE_HANDLE',
}));
jest.mock('../../../selectors', () => ({}));
jest.mock('../../../api', () => ({}));
jest.mock('./router', () => ({
  goToBoard: jest.fn(),
  goToCard: jest.fn(),
}));
jest.mock('./attachments', () => ({
  createAttachment: jest.fn(),
}));

describe('uploadCardAttachment', () => {
  const cardId = 'card-1';
  const attachmentFile = { name: 'brief.pdf' };

  test('adds the uploaded attachment to the local store', () => {
    const generator = uploadCardAttachment(cardId, attachmentFile);

    expect(generator.next().value).toEqual(
      call(createAttachment, cardId, {
        name: attachmentFile.name,
        type: 'file',
        file: attachmentFile,
      }),
    );
    expect(generator.next({ id: 'attachment-1' }).done).toBe(true);
  });

  test('shows a retryable error without deleting the card when upload fails', () => {
    const generator = uploadCardAttachment(cardId, attachmentFile);

    expect(generator.next().value).toEqual(
      call(createAttachment, cardId, {
        name: attachmentFile.name,
        type: 'file',
        file: attachmentFile,
      }),
    );
    expect(generator.next(null).value).toEqual(
      call(
        toast,
        {
          type: ToastTypes.CARD_ATTACHMENT_UPLOAD_FAILURE,
          params: {
            cardId,
            attachmentFile,
          },
        },
        {
          duration: 10000,
        },
      ),
    );
    expect(generator.next().done).toBe(true);
  });
});
