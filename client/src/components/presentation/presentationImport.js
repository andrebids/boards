export const PRESENTATION_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const PRESENTATION_FILE_ACCEPT = `.pptx,${PRESENTATION_MIME_TYPE}`;

export const PRESENTATION_IMPORT_MESSAGE_TYPE = 'planka:presentation-import';

export const getPresentationImportOrigins = (cryptPadUrl, cryptPadSandboxUrl) => {
  const cryptPadOrigin = new URL(cryptPadUrl).origin;
  const origins = new Set([cryptPadOrigin]);

  if (cryptPadSandboxUrl) {
    origins.add(new URL(cryptPadSandboxUrl).origin);
  } else {
    const cryptPadLocation = new URL(cryptPadUrl);
    if (cryptPadLocation.hostname === 'localhost' || cryptPadLocation.hostname === '127.0.0.1') {
      cryptPadLocation.port = '3013';
      origins.add(cryptPadLocation.origin);
    }
  }

  return origins;
};

export const isPptxFile = (file) => Boolean(file && /\.pptx$/i.test(file.name));

export const isInvalidPresentationImportError = (error) =>
  Boolean(
    error &&
      (error.invalidPresentationFile ||
        (error.statusCode === 422 &&
          error.code === 'E_UNPROCESSABLE_ENTITY' &&
          error.message === 'Invalid presentation file')),
  );

export const isPresentationImportRequest = (data) =>
  Boolean(
    data &&
      typeof data === 'object' &&
      data.type === PRESENTATION_IMPORT_MESSAGE_TYPE &&
      isPptxFile(data.file),
  );
