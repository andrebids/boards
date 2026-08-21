module.exports = (presentationId) =>
  `${sails.config.custom.attachmentsPathSegment}/project-presentations/${presentationId}/presentation.pptx`;
