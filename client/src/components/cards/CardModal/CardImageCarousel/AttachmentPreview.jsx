/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import Config from '../../../../constants/Config';
import Encodings from '../../../../constants/Encodings';
import { AttachmentTypes } from '../../../../constants/Enums';
import ContentViewer from '../../../attachments/Attachments/ContentViewer';
import CsvViewer from '../../../attachments/Attachments/CsvViewer';
import VideoPlayer from '../../../common/VideoPlayer';
import {
  getSpreadsheetPreviewStatus,
  getThreeDFormat,
  isPersistedAttachment,
  isVideoAttachment,
} from './selection';

import styles from './CardImageCarousel.module.scss';

const ThreeDViewer = React.lazy(() => import('./ThreeDViewer'));
const XlsxViewer = React.lazy(() => import('./XlsxViewer'));

const AttachmentPreview = React.memo(({ attachment, isSelected, posterUrl }) => {
  const [t] = useTranslation();
  const threeDFormat = getThreeDFormat(attachment);
  const spreadsheetPreviewStatus = getSpreadsheetPreviewStatus(attachment);

  let content = null;

  if (isSelected) {
    if (!isPersistedAttachment(attachment)) {
      content = (
        <span className={styles.previewMessage} role="status" aria-busy="true">
          <span className={styles.mediaLoadingSpinner} aria-hidden="true" />
          {t('common.loading')}
        </span>
      );
    } else if (attachment.type === AttachmentTypes.LINK) {
      content = (
        <a
          href={attachment.data.url}
          target="_blank"
          rel="noreferrer"
          className={styles.linkPreview}
        >
          <Icon fitted name="linkify" size="big" aria-hidden="true" />
          <span className={styles.previewName}>{attachment.name}</span>
          <span className={styles.previewAction}>{t('action.open')}</span>
        </a>
      );
    } else if (isVideoAttachment(attachment)) {
      content = <VideoPlayer attachment={attachment} autoPlay posterUrl={posterUrl} />;
    } else if (threeDFormat) {
      content = (
        <React.Suspense
          fallback={
            <span className={styles.previewMessage} role="status" aria-busy="true">
              <span className={styles.mediaLoadingSpinner} aria-hidden="true" />
              {t('common.loading')}
            </span>
          }
        >
          <ThreeDViewer attachment={attachment} format={threeDFormat} />
        </React.Suspense>
      );
    } else if (spreadsheetPreviewStatus === 'tooBig') {
      content = (
        <span className={styles.previewMessage}>
          {t('common.contentOfThisAttachmentIsTooBigToDisplay')}
        </span>
      );
    } else if (spreadsheetPreviewStatus === 'ready') {
      content = (
        <React.Suspense
          fallback={
            <span className={styles.previewMessage} role="status" aria-busy="true">
              <span className={styles.mediaLoadingSpinner} aria-hidden="true" />
              {t('common.loading')}
            </span>
          }
        >
          <XlsxViewer attachment={attachment} />
        </React.Suspense>
      );
    } else {
      switch (attachment.data.mimeType) {
        case 'application/pdf':
          content = (
            <object
              data={attachment.data.url}
              type={attachment.data.mimeType}
              title={attachment.name}
              className={styles.embeddedPreview}
            >
              <span className={styles.previewMessage}>
                {t('common.thereIsNoPreviewAvailableForThisAttachment')}
              </span>
            </object>
          );
          break;
        case 'audio/mpeg':
        case 'audio/wav':
        case 'audio/ogg':
        case 'audio/opus':
        case 'audio/mp4':
        case 'audio/x-aac':
          content = (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio
              controls
              src={attachment.data.url}
              aria-label={attachment.name}
              className={styles.audioPreview}
            />
          );
          break;
        case 'text/csv':
          content = <CsvViewer src={attachment.data.url} className={styles.embeddedPreview} />;
          break;
        default:
          if (attachment.data.encoding === Encodings.UTF8) {
            content =
              attachment.data.sizeInBytes <= Config.MAX_SIZE_IN_BYTES_TO_DISPLAY_CONTENT ? (
                <ContentViewer
                  src={attachment.data.url}
                  filename={attachment.data.filename}
                  className={styles.embeddedPreview}
                />
              ) : (
                <span className={styles.previewMessage}>
                  {t('common.contentOfThisAttachmentIsTooBigToDisplay')}
                </span>
              );
          } else {
            content = (
              <span className={styles.previewMessage}>
                <Icon fitted name="file outline" size="big" aria-hidden="true" />
                <span className={styles.previewName} title={attachment.name}>
                  {attachment.name}
                </span>
                {t('common.thereIsNoPreviewAvailableForThisAttachment')}
              </span>
            );
          }
      }
    }
  }

  return (
    <div
      className={classNames(
        styles.slide,
        styles.attachmentSlide,
        isSelected && styles.slideSelected,
      )}
    >
      {content}
    </div>
  );
});

AttachmentPreview.propTypes = {
  attachment: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  isSelected: PropTypes.bool.isRequired,
  posterUrl: PropTypes.string,
};

AttachmentPreview.defaultProps = {
  posterUrl: undefined,
};

export default AttachmentPreview;
