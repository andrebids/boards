module.exports = (presentationId, filename = 'presentation.pptx') =>
  `${sails.config.custom.attachmentsPathSegment}/project-presentations/${presentationId}/${filename}`;
