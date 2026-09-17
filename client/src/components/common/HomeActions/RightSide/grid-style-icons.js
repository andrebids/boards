/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { ProjectsGridStyles } from '../../../../constants/Enums';
import RegularGridIcon from '../../../../assets/images/grid-regular-icon.svg?react';
import SquareGridIcon from '../../../../assets/images/grid-square-icon.svg?react';
import GalleryGridIcon from '../../../../assets/images/grid-gallery-icon.svg?react';

export default {
  [ProjectsGridStyles.REGULAR]: RegularGridIcon,
  [ProjectsGridStyles.SQUARE]: SquareGridIcon,
  [ProjectsGridStyles.GALLERY]: GalleryGridIcon,
};
