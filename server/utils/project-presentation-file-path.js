const getFilePath = (presentationId, filename = 'presentation.pptx') =>
  `${sails.config.custom.attachmentsPathSegment}/project-presentations/${presentationId}/${filename}`;

const getPreviewFilePath = (presentationId, sourceFilename) => {
  const basename = sourceFilename.replace(/\.pptx$/i, '');
  return getFilePath(presentationId, `preview-${basename}.jpg`);
};

module.exports = getFilePath;
module.exports.getPreviewFilePath = getPreviewFilePath;
