const { expect } = require('chai');
const path = require('path');
const sails = require('sails');
const lodash = require('lodash');

global._ = lodash;
global.sails = sails;
sails.config = {
  appPath: path.resolve(__dirname, '../..'),
};

global.Action = {};

const createAttachment = require('../../api/helpers/attachments/create-one');

const createImageAttachment = async (skipCover) => {
  let coverUpdateInputs;

  sails.models = {
    attachment: {
      Types: {
        FILE: 'file',
      },
      qm: {
        createOne: async (values) => ({
          id: 'attachment-1',
          ...values,
        }),
      },
    },
  };
  sails.sockets = {
    broadcast: () => {},
  };
  sails.helpers = {
    activities: {
      createAttachmentActivity: {
        with: async () => {},
      },
    },
    attachments: {
      presentOne: (attachment) => attachment,
    },
    cards: {
      updateOne: {
        with: async (inputs) => {
          coverUpdateInputs = inputs;
        },
      },
    },
    utils: {
      sendWebhooks: {
        with: () => {},
      },
    },
  };

  await createAttachment.fn({
    values: {
      type: 'file',
      data: {
        image: { width: 100, height: 100 },
      },
      name: 'comment-image.png',
      card: {
        id: 'card-1',
        coverAttachmentId: null,
      },
      creatorUser: { id: 'user-1' },
    },
    project: { id: 'project-1' },
    board: { id: 'board-1' },
    list: { id: 'list-1' },
    skipCover,
  });

  return coverUpdateInputs;
};

describe('attachment skip cover', () => {
  it('does not make an inline comment image the card cover', async () => {
    expect(await createImageAttachment(true)).to.equal(undefined);
  });

  it('preserves automatic cover selection for normal image attachments', async () => {
    const coverUpdateInputs = await createImageAttachment(false);

    expect(coverUpdateInputs.values.coverAttachmentId).to.equal('attachment-1');
  });
});
