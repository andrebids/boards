import {
  getPresentationImportFile,
  getPresentationImportOrigins,
  isInvalidPresentationImportError,
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

  test('reconstructs byte payloads produced by the native ONLYOFFICE action', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
    const file = getPresentationImportFile({
      type: 'planka:presentation-import',
      file: { name: 'campaign.pptx', lastModified: 123, bytes },
    });

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('campaign.pptx');
    expect(file.type).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    expect(file.lastModified).toBe(123);
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array(bytes));
  });

  test('normalizes cached legacy File payloads into the current window', () => {
    const legacyFile = new File(['pptx'], 'campaign.pptx');
    const file = getPresentationImportFile({
      type: 'planka:presentation-import',
      file: legacyFile,
    });

    expect(file).toBeInstanceOf(File);
    expect(file).not.toBe(legacyFile);
    expect(file.size).toBe(legacyFile.size);
  });

  test('rejects malformed import messages', () => {
    const file = new File(['pptx'], 'campaign.pptx');

    expect(getPresentationImportFile({ type: 'planka:presentation-import' })).toBeNull();
    expect(getPresentationImportFile({ type: 'planka:other-action', file })).toBeNull();
    expect(
      getPresentationImportFile({
        type: 'planka:presentation-import',
        file: { name: 'campaign.pptx', bytes: new ArrayBuffer(0) },
      }),
    ).toBeNull();
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
