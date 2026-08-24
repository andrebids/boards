/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { toast } from 'react-hot-toast';

import http from './http';
import socket from './socket';

const ATTACHMENT_UPLOAD_TIMEOUT = 60 * 60 * 1000;

const getUploadErrorMessage = (error, filename) => {
  if (error.code === 'E_HTTP_TIMEOUT') {
    return `O carregamento de ${filename} demorou demasiado tempo. Tenta novamente.`;
  }
  if (error.code === 'E_HTTP_NETWORK') {
    return `Não foi possível carregar ${filename}. Verifica a ligação e tenta novamente.`;
  }
  if (
    typeof error.message === 'string' &&
    error.message !== 'HTTP request failed' &&
    error.message !== 'Invalid HTTP response'
  ) {
    return error.message;
  }

  return `Não foi possível carregar ${filename}. Tenta novamente.`;
};

/* Transformers */

export const transformAttachment = (attachment) => ({
  ...attachment,
  ...(attachment.createdAt && {
    createdAt: new Date(attachment.createdAt),
  }),
});

/* Actions */

const createAttachment = (cardId, data, headers) =>
  socket.post(`/cards/${cardId}/attachments`, data, headers).then((body) => ({
    ...body,
    item: transformAttachment(body.item),
  }));

const createAttachmentWithFile = (
  cardId,
  { file, skipCover = false, ...data },
  requestId,
  headers,
) =>
  http
    .post(
      `/cards/${cardId}/attachments?requestId=${requestId}${skipCover ? '&skipCover=true' : ''}`,
      {
        ...data,
        file,
      },
      headers,
      { timeout: ATTACHMENT_UPLOAD_TIMEOUT },
    )
    .then((body) => ({
      ...body,
      item: transformAttachment(body.item),
    }))
    .catch((error) => {
      toast.error(getUploadErrorMessage(error, file.name));
      throw error;
    });

const updateAttachment = (id, data, headers) =>
  socket.patch(`/attachments/${id}`, data, headers).then((body) => ({
    ...body,
    item: transformAttachment(body.item),
  }));

const deleteAttachment = (id, headers) =>
  socket.delete(`/attachments/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformAttachment(body.item),
  }));

/* Event handlers */

const makeHandleAttachmentCreate = (next) => (body) => {
  next({
    ...body,
    item: transformAttachment(body.item),
  });
};

const makeHandleAttachmentUpdate = makeHandleAttachmentCreate;

const makeHandleAttachmentDelete = makeHandleAttachmentCreate;

export default {
  createAttachment,
  createAttachmentWithFile,
  updateAttachment,
  deleteAttachment,
  makeHandleAttachmentCreate,
  makeHandleAttachmentUpdate,
  makeHandleAttachmentDelete,
};
