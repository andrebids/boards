const { expect } = require('chai');
const lodash = require('lodash');

const presentAttachment = require('../../api/helpers/attachments/present-one');
const presentChatAttachment = require('../../api/helpers/chat-message-attachments/present-one');
const createAttachmentActivity = require('../../api/helpers/activities/create-attachment-activity');

describe('attachment media URLs', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      Action: global.Action,
      Attachment: global.Attachment,
      sails: global.sails,
    };

    global._ = lodash;
    global.Attachment = { Types: { FILE: 'file', LINK: 'link' } };
    global.sails = {
      config: {
        custom: {
          baseUrl: 'http://localhost:3008',
          baseUrlPath: '/',
        },
      },
      sockets: {
        broadcast: () => {},
      },
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
  });

  it('presents card video media on the current origin', () => {
    const attachment = presentAttachment.fn({
      record: {
        id: 'attachment-1',
        type: 'file',
        name: 'video.mp4',
        data: {
          filename: 'video.mp4',
          mimeType: 'video/mp4',
          video: {
            status: 'ready',
            playback: { filename: 'playback.mp4' },
            thumbnails: [{ frame360: 'frame-0-360.png' }],
          },
        },
      },
    });

    expect(attachment.data.url).to.equal('/attachments/attachment-1/download/video.mp4');
    expect(attachment.data.playbackUrl).to.equal('/attachments/attachment-1/stream');
    expect(attachment.data.thumbnailUrls).to.deep.equal({
      outside360: '/attachments/attachment-1/download/video-thumbnails/frame-0-360.png',
      outside720: '/attachments/attachment-1/download/video-thumbnails/frame-0-720.png',
    });
  });

  it('presents chat video media on the current origin', () => {
    const attachment = presentChatAttachment.fn({
      record: {
        id: 'chat-attachment-1',
        name: 'video.mp4',
        data: {
          filename: 'video.mp4',
          mimeType: 'video/mp4',
          video: {
            status: 'ready',
            playback: { filename: 'playback.mp4' },
            thumbnails: [{ frame360: 'frame-0-360.png' }],
          },
        },
      },
    });

    expect(attachment.data.url).to.equal(
      '/api/chat-message-attachments/chat-attachment-1/download',
    );
    expect(attachment.data.playbackUrl).to.equal(
      '/api/chat-message-attachments/chat-attachment-1/stream',
    );
    expect(attachment.data.thumbnailUrls).to.deep.equal({
      outside360: '/api/chat-message-attachments/chat-attachment-1/download?variant=video360',
      outside720: '/api/chat-message-attachments/chat-attachment-1/download?variant=video720',
    });
  });

  it('stores activity video thumbnails on the current origin', async () => {
    global.Action = {
      create: (values) => ({
        fetch: async () => ({ id: 'activity-1', ...values }),
      }),
    };

    const activity = await createAttachmentActivity.fn({
      attachment: {
        id: 'attachment-1',
        name: 'video.mp4',
        data: {
          mimeType: 'video/mp4',
          video: {
            thumbnails: [{ frame360: 'frame-0-360.png' }],
          },
        },
      },
      board: { id: 'board-1' },
      card: { id: 'card-1', name: 'Card' },
      user: { id: 'user-1' },
      action: 'create',
    });

    expect(activity.data.thumbnailUrls).to.deep.equal({
      outside360: '/attachments/attachment-1/download/video-thumbnails/frame-0-360.png',
      outside720: '/attachments/attachment-1/download/video-thumbnails/frame-0-720.png',
    });
  });
});
