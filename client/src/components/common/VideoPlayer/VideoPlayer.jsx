/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line import/no-unresolved
import { MediaPlayer, MediaProvider } from '@vidstack/react';
// eslint-disable-next-line import/no-unresolved
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import styles from './VideoPlayer.module.scss';

const STAGE_ASPECT_RATIO = 16 / 9;

const VideoPlayer = React.memo(({ attachment, autoPlay, className, posterUrl }) => {
  const [t] = useTranslation();
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const video = attachment.data.video || {};
  const status = video.status || 'ready';
  const sourceUrl = attachment.data.playbackUrl || attachment.data.url;
  const width = Number(video.width);
  const height = Number(video.height);
  const hasDimensions = width > 0 && height > 0;
  const aspectRatio = hasDimensions ? width / height : STAGE_ASPECT_RATIO;
  const fitHeight = aspectRatio < STAGE_ASPECT_RATIO;

  const source = useMemo(() => {
    if (!sourceUrl) {
      return null;
    }

    return {
      src: sourceUrl,
      type: attachment.data.playbackUrl ? 'video/mp4' : attachment.data.mimeType,
    };
  }, [attachment.data.mimeType, attachment.data.playbackUrl, sourceUrl]);

  if (status === 'pending' || status === 'processing') {
    return (
      <div
        className={classNames(styles.root, styles.state, className)}
        role="status"
        aria-live="polite"
      >
        <span className={styles.spinner} aria-hidden="true" />
        <span>{t('common.videoProcessing')}</span>
      </div>
    );
  }

  if (status === 'failed' || !source || hasPlaybackError) {
    return (
      <div className={classNames(styles.root, styles.state, styles.failed, className)} role="alert">
        <span>{t('common.videoPlaybackFailed')}</span>
        {attachment.data.url && (
          <a href={attachment.data.url} target="_blank" rel="noreferrer">
            {t('action.downloadOriginalVideo')}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={classNames(styles.root, className)}>
      <MediaPlayer
        className={classNames(styles.player, fitHeight && styles.fitHeight)}
        src={source}
        title={attachment.name}
        poster={posterUrl || undefined}
        aspectRatio={hasDimensions ? `${width} / ${height}` : '16 / 9'}
        autoPlay={autoPlay}
        load={autoPlay ? 'eager' : 'visible'}
        preload={autoPlay ? 'auto' : 'metadata'}
        muted={autoPlay}
        playsInline
        onError={() => setHasPlaybackError(true)}
      >
        <MediaProvider
          mediaProps={{
            'aria-label': attachment.name,
            controlsList: 'nodownload',
          }}
        />
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          colorScheme="dark"
          showTooltipDelay={350}
          noModal
        />
      </MediaPlayer>
    </div>
  );
});

VideoPlayer.propTypes = {
  attachment: PropTypes.shape({
    name: PropTypes.string.isRequired,
    data: PropTypes.shape({
      mimeType: PropTypes.string,
      playbackUrl: PropTypes.string,
      url: PropTypes.string,
      video: PropTypes.shape({
        height: PropTypes.number,
        status: PropTypes.string,
        width: PropTypes.number,
      }),
    }).isRequired,
  }).isRequired,
  autoPlay: PropTypes.bool,
  className: PropTypes.string,
  posterUrl: PropTypes.string,
};

VideoPlayer.defaultProps = {
  autoPlay: false,
  className: undefined,
  posterUrl: undefined,
};

export default VideoPlayer;
