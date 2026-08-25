export const PRESENTATION_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const PRESENTATION_FILE_ACCEPT = `.pptx,${PRESENTATION_MIME_TYPE}`;

export const isPptxFile = (file) => Boolean(file && /\.pptx$/i.test(file.name));
