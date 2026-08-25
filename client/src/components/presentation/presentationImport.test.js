import { isPptxFile, PRESENTATION_FILE_ACCEPT } from './presentationImport';

describe('presentation import', () => {
  test('only accepts PowerPoint files before uploading', () => {
    expect(isPptxFile({ name: 'campaign.pptx' })).toBe(true);
    expect(isPptxFile({ name: 'CAMPAIGN.PPTX' })).toBe(true);
    expect(isPptxFile({ name: 'campaign.pdf' })).toBe(false);
    expect(isPptxFile(null)).toBe(false);
  });

  test('limits the file picker to the PowerPoint MIME type and extension', () => {
    expect(PRESENTATION_FILE_ACCEPT).toBe(
      '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
  });
});
