/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Icon } from 'semantic-ui-react';

import styles from './VideoThumbnail.module.scss';

var VideoThumbnail = React.memo(function VideoThumbnail(props) {
  var attachment = props.attachment;
  var size = props.size || '360';
  var t = useTranslation()[0];
  var loadingState = React.useState(true);
  var isLoading = loadingState[0];
  var setIsLoading = loadingState[1];
  var errorState = React.useState(false);
  var hasError = errorState[0];
  var setHasError = errorState[1];

    var thumbnailUrl = React.useMemo(function() {
    if (!attachment.data.thumbnailUrls) {
      return null;
    }

    // Usar thumbnail do tamanho especificado (360 ou 720)
    if (size === '720') {
      return attachment.data.thumbnailUrls.outside720 || null;
    }
    return attachment.data.thumbnailUrls.outside360 || null;
  }, [attachment.data.thumbnailUrls, size]);

  var handleLoad = function() {
    setIsLoading(false);
    setHasError(false);
  };

  var handleError = function() {
    setIsLoading(false);
    setHasError(true);
  };

  if (!thumbnailUrl) {
    return React.createElement(
      'div',
      { className: classNames(styles.container, styles.error) },
      React.createElement(
        'div',
        { className: styles.errorMessage },
        t('common.noVideoPreviewAvailable')
      )
    );
  }

  if (hasError) {
    return React.createElement(
      'div',
      { className: classNames(styles.container, styles.error) },
      React.createElement(
        'div',
        { className: styles.errorMessage },
        t('common.errorLoadingVideoPreview')
      )
    );
  }
  return React.createElement(
    'div',
    { className: styles.container },
    isLoading && React.createElement(
      'div',
      { className: styles.loading },
      React.createElement('div', { className: styles.spinner }),
      React.createElement('span', null, t('common.loadingVideoPreview'))
    ),
    React.createElement(
      'div',
      { className: classNames(styles.preview, { [styles.hidden]: isLoading }) },
      React.createElement('img', {
        src: thumbnailUrl,
        alt: attachment.name,
        onLoad: handleLoad,
        onError: handleError,
        className: styles.thumbnail
      }),
      // Indicador de vídeo
      React.createElement(
        'div',
        { className: styles.videoIndicator },
        React.createElement(Icon, { name: 'video' }),
        t('common.video')
      ),
      // Duração do vídeo
      attachment.data.video && attachment.data.video.duration && React.createElement(
        'div',
        { className: styles.videoDuration },
        Math.round(attachment.data.video.duration) + 's'
      )
    )
  );
});

VideoThumbnail.propTypes = {
  attachment: PropTypes.object.isRequired,
  size: PropTypes.oneOf(['360', '720'])
};

export default VideoThumbnail;
