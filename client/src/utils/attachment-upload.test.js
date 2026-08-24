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
});

describe('attachment upload state', () => {
  test('detects optimistic attachments while ignoring persisted attachments', () => {
    expect(hasPendingAttachment([{ id: 'attachment-1' }, { id: 'local:attachment-2' }])).toBe(true);
    expect(hasPendingAttachment([{ id: 'attachment-1' }])).toBe(false);
  });
});
