import { toast } from 'react-hot-toast';

import handleAttachmentFiles, { hasPendingAttachment } from './attachment-upload';

jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('attachment upload validation', () => {
  beforeEach(() => {
    toast.error.mockReset();
  });

  test('accepts supported files and explains every rejected file', () => {
    const acceptedFiles = [];
    const t = (key, values = {}) => `${key}:${values.name || ''}:${values.extension || ''}`;
    const files = [
      { name: 'scene.obj', size: 10, type: 'application/octet-stream' },
      { name: 'large-design.psb', size: 10, type: 'application/octet-stream' },
      { name: 'installer.exe', size: 10, type: 'application/x-msdownload' },
      { name: 'empty.jpg', size: 0, type: 'image/jpeg' },
    ];

    const result = handleAttachmentFiles(files, {
      onAccepted: (file) => acceptedFiles.push(file),
      t,
    });

    expect(result).toEqual(files.slice(0, 2));
    expect(acceptedFiles).toEqual(files.slice(0, 2));
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenNthCalledWith(
      1,
      'common.unsupportedAttachmentFileType:installer.exe:.EXE',
    );
    expect(toast.error).toHaveBeenNthCalledWith(2, 'common.emptyAttachmentFile:empty.jpg:');
  });

  test('can return accepted files without submitting them immediately', () => {
    const files = [{ name: 'scene.fbx', size: 10, type: 'application/octet-stream' }];

    expect(handleAttachmentFiles(files, { t: (key) => key })).toEqual(files);
  });

  test('rejects files above their category limit before starting an upload', () => {
    const acceptedFiles = [];
    const t = (key, values = {}) => `${key}:${values.name || ''}:${values.size || ''}`;
    const files = [
      { name: 'large-photo.jpg', size: 500 * 1024 * 1024 + 1, type: 'image/jpeg' },
      { name: 'large-design.psd', size: 1024 * 1024 * 1024 + 1, type: 'application/octet-stream' },
      { name: 'large-scene.obj', size: 1024 * 1024 * 1024 + 1, type: 'application/octet-stream' },
      { name: 'large-video.mp4', size: 250 * 1024 * 1024 + 1, type: 'video/mp4' },
    ];

    expect(
      handleAttachmentFiles(files, {
        onAccepted: (file) => acceptedFiles.push(file),
        t,
      }),
    ).toEqual([]);
    expect(acceptedFiles).toEqual([]);
    expect(toast.error).toHaveBeenNthCalledWith(
      1,
      'common.attachmentFileTooLarge:large-photo.jpg:500',
    );
    expect(toast.error).toHaveBeenNthCalledWith(
      2,
      'common.attachmentFileTooLarge:large-design.psd:1024',
    );
    expect(toast.error).toHaveBeenNthCalledWith(
      3,
      'common.attachmentFileTooLarge:large-scene.obj:1024',
    );
    expect(toast.error).toHaveBeenNthCalledWith(
      4,
      'common.attachmentFileTooLarge:large-video.mp4:250',
    );
  });
});

describe('attachment upload state', () => {
  test('detects optimistic attachments while ignoring persisted attachments', () => {
    expect(hasPendingAttachment([{ id: 'attachment-1' }, { id: 'local:attachment-2' }])).toBe(true);
    expect(hasPendingAttachment([{ id: 'attachment-1' }])).toBe(false);
  });
});
