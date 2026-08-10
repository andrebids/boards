const { expect } = require('chai');
const path = require('path');
const sails = require('sails');
const lodash = require('lodash');

process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3008';
delete process.env.ATTACHMENT_MAX_BYTES;
sails.config = { appPath: path.resolve(__dirname, '../..') };

const { custom } = require('../../config/custom');

const FILE_TYPE = 'file';

global.Attachment = { Types: { FILE: FILE_TYPE, LINK: 'link' } };
global.BoardMembership = { Roles: { EDITOR: 'editor' } };
global._ = lodash;
global.sails = sails;

const createAttachmentAction = require('../../api/controllers/attachments/create');

const runFileUpload = async (file) => {
  let receivedMaxBytes;
  let processedFile;

  sails.config.custom = custom;
  sails.helpers = {
    cards: {
      getPathToProjectById: () => ({
        intercept: () =>
          Promise.resolve({
            card: { id: 'card-1' },
            list: { id: 'list-1' },
            board: { id: 'board-1' },
            project: { id: 'project-1' },
          }),
      }),
    },
    utils: {
      receiveFile: {
        with: async ({ maxBytes }) => {
          receivedMaxBytes = maxBytes;
          return [file];
        },
      },
    },
    attachments: {
      processUploadedFile: async (nextFile) => {
        processedFile = nextFile;
        return { filename: nextFile.filename };
      },
      createOne: {
        with: async () => ({ id: 'attachment-1' }),
      },
      presentOne: (attachment) => attachment,
    },
  };
  sails.models = {
    boardmembership: {
      qm: {
        getOneByBoardIdAndUserId: async () => ({ role: 'editor' }),
      },
    },
  };

  let uploadError;
  const result = await createAttachmentAction.fn.call(
    { req: { currentUser: { id: 'user-1' } } },
    { cardId: 'card-1', type: FILE_TYPE, name: file.filename },
    {
      success: (body) => body,
      uploadError: (message) => {
        uploadError = message;
        return { uploadError: message };
      },
    },
  );

  return { processedFile, receivedMaxBytes, result, uploadError };
};

describe('attachment upload limit', () => {
  it('accepts regular attachments up to 25 MiB by default', () => {
    expect(custom.attachmentMaxBytes).to.equal(25 * 1024 * 1024);
  });

  it('accepts design attachments up to 500 MiB by default', () => {
    expect(custom.designAttachmentMaxBytes).to.equal(500 * 1024 * 1024);
    expect(custom.psdAttachmentMaxBytes).to.equal(500 * 1024 * 1024);
  });

  it('accepts video attachments up to 250 MiB by default', () => {
    expect(custom.videoAttachmentMaxBytes).to.equal(250 * 1024 * 1024);
  });

  it('accepts ZIP and RAR attachments up to 500 MiB by default', () => {
    expect(custom.archiveAttachmentMaxBytes).to.equal(500 * 1024 * 1024);
  });

  it('uses the PSD transport limit and processes a PSD larger than 25 MiB', async () => {
    const file = {
      fd: path.join(__dirname, 'missing-design.psd'),
      filename: 'design.psd',
      size: 100 * 1024 * 1024,
    };

    const result = await runFileUpload(file);

    expect(result.receivedMaxBytes).to.equal(500 * 1024 * 1024);
    expect(result.processedFile).to.equal(file);
    expect(result.uploadError).to.equal(undefined);
    expect(result.result.item.id).to.equal('attachment-1');
  });

  ['ai', 'eps'].forEach((extension) => {
    it(`allows ${extension.toUpperCase()} files up to the 500 MiB design limit`, async () => {
      const file = {
        fd: path.join(__dirname, `missing-design.${extension}`),
        filename: `design.${extension}`,
        size: 400 * 1024 * 1024,
      };

      const result = await runFileUpload(file);

      expect(result.processedFile).to.equal(file);
      expect(result.uploadError).to.equal(undefined);
    });
  });

  it('rejects Illustrator files above the 500 MiB design limit', async () => {
    const result = await runFileUpload({
      fd: path.join(__dirname, 'missing-large-design.ai'),
      filename: 'large-design.ai',
      size: 501 * 1024 * 1024,
    });

    expect(result.processedFile).to.equal(undefined);
    expect(result.uploadError).to.equal('O ficheiro de design não pode ter mais de 500 MB.');
  });

  it('rejects a non-PSD attachment above the regular 25 MiB limit', async () => {
    const result = await runFileUpload({
      fd: path.join(__dirname, 'missing-document.pdf'),
      filename: 'document.pdf',
      size: 26 * 1024 * 1024,
    });

    expect(result.processedFile).to.equal(undefined);
    expect(result.uploadError).to.equal('O ficheiro não pode ter mais de 25 MB.');
  });

  it('uses the video limit and processes an MP4 larger than 25 MiB', async () => {
    const file = {
      fd: path.join(__dirname, 'missing-video.mp4'),
      filename: 'video.mp4',
      size: 200 * 1024 * 1024,
    };

    const result = await runFileUpload(file);

    expect(result.receivedMaxBytes).to.equal(500 * 1024 * 1024);
    expect(result.processedFile).to.equal(file);
    expect(result.uploadError).to.equal(undefined);
  });

  it('rejects an MP4 above the 250 MiB video limit', async () => {
    const result = await runFileUpload({
      fd: path.join(__dirname, 'missing-large-video.mp4'),
      filename: 'large-video.mp4',
      size: 251 * 1024 * 1024,
    });

    expect(result.processedFile).to.equal(undefined);
    expect(result.uploadError).to.equal('O vídeo não pode ter mais de 250 MB.');
  });

  it('allows ZIP attachments up to 500 MiB', async () => {
    const file = {
      fd: path.join(__dirname, 'missing-delivery.zip'),
      filename: 'delivery.zip',
      size: 400 * 1024 * 1024,
    };

    const result = await runFileUpload(file);

    expect(result.processedFile).to.equal(file);
    expect(result.uploadError).to.equal(undefined);
  });

  it('rejects ZIP attachments above 500 MiB', async () => {
    const result = await runFileUpload({
      fd: path.join(__dirname, 'missing-large-delivery.zip'),
      filename: 'large-delivery.zip',
      size: 501 * 1024 * 1024,
    });

    expect(result.processedFile).to.equal(undefined);
    expect(result.uploadError).to.equal('O ficheiro comprimido não pode ter mais de 500 MB.');
  });
});
