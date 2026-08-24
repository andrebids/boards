import { toast } from 'react-hot-toast';

import handleAttachmentFiles from './attachment-upload';

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

    handleAttachmentFiles(files, {
      onAccepted: (file) => acceptedFiles.push(file),
      t,
    });

    expect(acceptedFiles).toEqual(files.slice(0, 2));
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenNthCalledWith(
      1,
      'common.unsupportedAttachmentFileType:installer.exe:.EXE',
    );
    expect(toast.error).toHaveBeenNthCalledWith(2, 'common.emptyAttachmentFile:empty.jpg:');
  });
});
