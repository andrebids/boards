import { call, put } from 'redux-saga/effects';
import toast from 'react-hot-toast';

import request from '../request';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import ToastTypes from '../../../constants/ToastTypes';
import { uploadCardAttachment } from './cards';

jest.mock('../request', () => jest.fn());
jest.mock('../../../lib/redux-router', () => ({
  LOCATION_CHANGE_HANDLE: 'LOCATION_CHANGE_HANDLE',
}));
jest.mock('../../../selectors', () => ({}));
jest.mock('../../../api', () => ({
  createAttachmentWithFile: jest.fn(),
}));
jest.mock('./router', () => ({
  goToBoard: jest.fn(),
  goToCard: jest.fn(),
}));

describe('uploadCardAttachment', () => {
  const cardId = 'card-1';
  const attachmentFile = { name: 'brief.pdf' };

  test('adds the uploaded attachment to the local store', () => {
    const attachment = {
      id: 'attachment-1',
      cardId,
      name: attachmentFile.name,
    };
    const generator = uploadCardAttachment(cardId, attachmentFile);

    expect(generator.next().value).toEqual(call(createLocalId));
    expect(generator.next('request-1').value).toEqual(
      call(
        request,
        api.createAttachmentWithFile,
        cardId,
        {
          name: attachmentFile.name,
          type: 'file',
          file: attachmentFile,
        },
        'request-1',
      ),
    );
    expect(generator.next({ item: attachment }).value).toEqual(
      put(actions.handleAttachmentCreate(attachment)),
    );
    expect(generator.next().done).toBe(true);
  });

  test('shows a retryable error without deleting the card when upload fails', () => {
    const generator = uploadCardAttachment(cardId, attachmentFile);

    generator.next();
    generator.next('request-1');

    expect(generator.throw(new Error('upload failed')).value).toEqual(
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
