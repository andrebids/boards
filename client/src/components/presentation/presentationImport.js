export const PRESENTATION_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const PRESENTATION_FILE_ACCEPT = `.pptx,${PRESENTATION_MIME_TYPE}`;

export const PRESENTATION_IMPORT_MESSAGE_TYPE = 'planka:presentation-import';

export const isPptxFile = (file) => Boolean(file && /\.pptx$/i.test(file.name));

export const getPresentationImportPluginUrl = (cryptPadUrl) =>
  new URL('/customize/planka-plugins/presentation-import/config.json', cryptPadUrl).toString();

export const isPresentationImportRequest = (data) =>
  Boolean(
    data &&
      typeof data === 'object' &&
      data.type === PRESENTATION_IMPORT_MESSAGE_TYPE &&
      isPptxFile(data.file),
  );
