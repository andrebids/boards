/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const createUploadedImageProcessor = require('../../../utils/uploaded-image-processor');

module.exports = createUploadedImageProcessor({
  getPathSegment: () => sails.config.custom.userAvatarsPathSegment,
  thumbnail: {
    name: 'cover-180',
    width: 180,
    height: 180,
    options: {
      withoutEnlargement: true,
    },
  },
});
