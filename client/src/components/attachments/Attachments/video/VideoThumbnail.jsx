/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Icon } from 'semantic-ui-react';

import getVideoThumbnailState from './get-video-thumbnail-state';

import styles from './VideoThumbnail.module.scss';

var VideoThumbnail = React.memo(function VideoThumbnail(props) {
  var attachment = props.attachment;
  var size = props.size || '360';
  var t = useTranslation()[0];
  const [loadedThumbnailUrl, setLoadedThumbnailUrl] = React.useState(null);
  const [failedThumbnailUrl, setFailedThumbnailUrl] = React.useState(null);

  const thumbnailUrl = React.useMemo(
    () => {
      if (!attachment.data.thumbnailUrls) {
        return null;
      }

      // Usar thumbnail do tamanho especificado (360 ou 720)
      if (size === '720') {
        return attachment.data.thumbnailUrls.outside720 || null;
      }
      return attachment.data.thumbnailUrls.outside360 || null;
    },
    [attachment.data.thumbnailUrls, size],
  );

  const isLoading = Boolean(thumbnailUrl && loadedThumbnailUrl !== thumbnailUrl);
  const hasError = Boolean(thumbnailUrl && failedThumbnailUrl === thumbnailUrl);
  const state = getVideoThumbnailState({
    status: attachment.data.video && attachment.data.video.status,
    thumbnailUrl,
    hasError,
  });

  const handleLoad = () => {
    setLoadedThumbnailUrl(thumbnailUrl);
    setFailedThumbnailUrl(null);
  };

  const handleError = () => {
    setFailedThumbnailUrl(thumbnailUrl);
  };

  if (state === 'processing') {
    return React.createElement(
      'div',
      {
        className: styles.container,
        role: 'status',
        'aria-live': 'polite',
      },
      React.createElement(
        'div',
        { className: styles.loading },
        React.createElement('div', { className: styles.spinner, 'aria-hidden': 'true' }),
        React.createElement('span', null, t('common.generatingVideoPreview')),
      ),
    );
  }

  if (state === 'unavailable') {
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

  if (state === 'error') {
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
