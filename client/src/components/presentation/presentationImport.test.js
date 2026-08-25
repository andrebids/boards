import {
  getPresentationImportPluginUrl,
  isPresentationImportRequest,
  isPptxFile,
  PRESENTATION_FILE_ACCEPT,
} from './presentationImport';

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

  test('builds the CryptPad-hosted ONLYOFFICE plugin URL', () => {
    expect(getPresentationImportPluginUrl('https://cryptpad.example.com')).toBe(
      'https://cryptpad.example.com/customize/planka-plugins/presentation-import/config.json',
    );
  });

  test('only accepts import messages produced by the presentation plugin', () => {
    const file = { name: 'campaign.pptx' };

    expect(isPresentationImportRequest({ type: 'planka:presentation-import', file })).toBe(true);
    expect(isPresentationImportRequest({ type: 'planka:presentation-import' })).toBe(false);
    expect(isPresentationImportRequest({ type: 'planka:other-action', file })).toBe(false);
  });
});
