import {
  preventFileDropPropagation,
  processSupportedFiles,
  validateImageFiles,
  validateSupportedFiles,
} from './file-helpers';

const createFile = (index, type = 'image/jpeg', extension = 'jpg') => ({
  name: `INSTRUCTION ${index}.${extension}`,
  type,
});

describe('file helpers', () => {
  test('prevents a nested file drop from reaching the parent list', () => {
    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };

    preventFileDropPropagation(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  test('keeps every supported file in natural filename order', () => {
    const files = [
      createFile(18),
      ...Array.from({ length: 17 }, (_, index) => createFile(index + 1)),
    ];
    const naturallySortedFiles = Array.from({ length: 18 }, (_, index) => createFile(index + 1));

    expect(validateSupportedFiles(files)).toEqual(files);
    expect(validateImageFiles(files)).toEqual(files);
    expect(processSupportedFiles(files).map(({ file }) => file)).toEqual(naturallySortedFiles);
  });

  test('filters unsupported files without reordering the remaining files', () => {
    const files = [createFile(1), createFile(2, 'application/octet-stream', 'bin'), createFile(3)];

    expect(processSupportedFiles(files).map(({ file }) => file)).toEqual([files[0], files[2]]);
  });
});
