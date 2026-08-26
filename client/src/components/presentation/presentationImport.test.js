import {
  getPresentationImportOrigins,
  isInvalidPresentationImportError,
  isPresentationImportRequest,
  isPptxFile,
  PRESENTATION_FILE_ACCEPT,
} from './presentationImport';
import enUS from '../../locales/en-US/core';
import frFR from '../../locales/fr-FR/core';
import ptBR from '../../locales/pt-BR/core';
import ptPT from '../../locales/pt-PT/core';

describe('presentation import', () => {
  test('only accepts PowerPoint files before uploading', () => {
    expect(isPptxFile({ name: 'campaign.pptx' })).toBe(true);
    expect(isPptxFile({ name: 'CAMPAIGN.PPTX' })).toBe(true);
    expect(isPptxFile({ name: 'campaign.pdf' })).toBe(false);
    expect(isPptxFile(null)).toBe(false);
  });

  test('distinguishes a rejected PowerPoint from an upload failure', () => {
    expect(
      isInvalidPresentationImportError({
        code: 'E_UNPROCESSABLE_ENTITY',
        message: 'Invalid presentation file',
        statusCode: 422,
      }),
    ).toBe(true);
    expect(isInvalidPresentationImportError({ code: 'E_HTTP_NETWORK' })).toBe(false);
  });

  test('limits the file picker to the PowerPoint MIME type and extension', () => {
    expect(PRESENTATION_FILE_ACCEPT).toBe(
      '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
  });

  test('only accepts import messages produced by the native ONLYOFFICE action', () => {
    const file = { name: 'campaign.pptx' };

    expect(isPresentationImportRequest({ type: 'planka:presentation-import', file })).toBe(true);
    expect(isPresentationImportRequest({ type: 'planka:presentation-import' })).toBe(false);
    expect(isPresentationImportRequest({ type: 'planka:other-action', file })).toBe(false);
  });

  test('accepts the configured CryptPad sandbox origin used by ONLYOFFICE', () => {
    expect(
      getPresentationImportOrigins('https://cryptpad.example.com', 'https://sandbox.example.com'),
    ).toEqual(new Set(['https://cryptpad.example.com', 'https://sandbox.example.com']));
  });

  test('accepts the local CryptPad sandbox origin by default', () => {
    expect(getPresentationImportOrigins('http://localhost:3010')).toEqual(
      new Set(['http://localhost:3010', 'http://localhost:3013']),
    );
  });

  test.each([
    ['en-US', enUS.translation.common],
    ['fr-FR', frFR.translation.common],
    ['pt-BR', ptBR.translation.common],
    ['pt-PT', ptPT.translation.common],
  ])('describes confirmation and feedback in %s', (_, common) => {
    expect(common.presentationImportConfirm).toContain('{{name}}');
    expect(common.presentationImportLoading).toContain('{{name}}');
    expect(common.presentationImportSuccess).toBeTruthy();
    expect(common.presentationImportFailed).toBeTruthy();
  });
});
