import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CloseButton } from '../../../lib/custom-ui';
import VideoPlayer from '../../common/VideoPlayer';

import styles from './MessageList.module.scss';

const AttachmentPreview = React.memo(({ attachment, onClose }) => {
  const [t] = useTranslation();
  const url = attachment.data?.url;
  const mimeType = attachment.data?.mimeType || '';
  const isImage = !!attachment.data?.image;
  const isVideo = !!attachment.data?.video || mimeType.startsWith('video/');
  const isPdf = mimeType === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.previewBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={attachment.name}
        className={styles.previewDialog}
      >
        <header>
          <strong>{attachment.name}</strong>
          <span>
            <a href={url} target="_blank" rel="noreferrer" aria-label={t('chat.downloadFile')}>
              <Download aria-hidden="true" size={17} />
            </a>
            <CloseButton ariaLabel={t('chat.close')} onClick={onClose} />
          </span>
        </header>
        <div className={styles.previewBody}>
          {isImage && <img src={url} alt={attachment.name} />}
          {isVideo && (
            <VideoPlayer
              attachment={attachment}
              posterUrl={
                attachment.data?.thumbnailUrls?.outside720 ||
                attachment.data?.thumbnailUrls?.outside360
              }
              className={styles.previewVideo}
            />
          )}
          {isPdf && <iframe src={url} title={attachment.name} />}
          {!isImage && !isVideo && !isPdf && (
            <div className={styles.genericPreview}>
              <FileText aria-hidden="true" size={42} strokeWidth={1.5} />
              <span>{t('chat.previewUnavailable')}</span>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.getElementById('app') || document.body,
  );
});

AttachmentPreview.propTypes = {
  attachment: PropTypes.shape({
    name: PropTypes.string.isRequired,
    data: PropTypes.shape({
      url: PropTypes.string,
      playbackUrl: PropTypes.string,
      mimeType: PropTypes.string,
      thumbnailUrls: PropTypes.shape({
        outside360: PropTypes.string,
        outside720: PropTypes.string,
      }),
      image: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
      video: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AttachmentPreview;
