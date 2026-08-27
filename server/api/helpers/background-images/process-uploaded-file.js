/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const createUploadedImageProcessor = require('../../../utils/uploaded-image-processor');

module.exports = createUploadedImageProcessor({
  getPathSegment: () => sails.config.custom.backgroundImagesPathSegment,
  thumbnail: {
    name: 'outside-360',
    width: 360,
    height: 360,
    options: {
      fit: 'outside',
      withoutEnlargement: true,
    },
  },
});
