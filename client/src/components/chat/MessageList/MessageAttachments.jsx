import React from 'react';
import PropTypes from 'prop-types';
import { Image as ImageIcon, Paperclip, RefreshCw } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import Config from '../../../constants/Config';
import {
  getAttachmentDeliveryErrorMessage,
  getPendingAttachmentCopy,
  isPendingAttachmentRetryable,
} from './attachment-state';

import styles from './MessageList.module.scss';

const getAttachmentUrl = (attachment) =>
  attachment.data?.url ||
  `${Config.SERVER_BASE_URL}/api/chat-message-attachments/${attachment.id}/download`;

export function SendingStatus({ label }) {
  return (
    <span className={styles.sendingStatus}>
      <RefreshCw aria-hidden="true" className={styles.sendingSpinner} size={11} strokeWidth={2} />
      {label}
    </span>
  );
}

SendingStatus.propTypes = {
  label: PropTypes.string.isRequired,
};

const MessageAttachments = React.memo(
  ({ caption, imageAttachments, messageId, onLoad, onPreview, otherAttachments, pendingFiles }) => {
    const dispatch = useDispatch();
    const [t] = useTranslation();

    return (
      <>
        {imageAttachments.length > 0 && (
          <div className={styles.imageMessage}>
            <div
              className={`${styles.imageGallery} ${
                imageAttachments.length > 1 ? styles.imageGalleryMultiple : ''
              }`}
            >
              {imageAttachments.map((attachment) => {
                const url = getAttachmentUrl(attachment);
                const previewUrl = attachment.data?.thumbnailUrls?.outside360 || url;

                return (
                  <button
                    type="button"
                    key={attachment.id}
                    className={styles.imageAttachment}
                    aria-label={attachment.name}
                    onClick={() =>
                      onPreview({
                        ...attachment,
                        data: { ...attachment.data, url },
                      })
                    }
                  >
                    <img src={previewUrl} alt={attachment.name} onLoad={onLoad} />
                  </button>
                );
              })}
            </div>
            {caption && (
              <div className={`${styles.bubble} ${styles.imageCaption}`} dir="auto">
                {caption}
              </div>
            )}
          </div>
        )}
        {otherAttachments.length > 0 && (
          <div className={styles.attachments}>
            {otherAttachments.map((attachment) => {
              const url = getAttachmentUrl(attachment);
              const thumbnailUrl = attachment.data?.thumbnailUrls?.outside360;
              const isVisualPreview =
                attachment.data?.image ||
                attachment.data?.video ||
                attachment.data?.mimeType === 'application/pdf';
              let attachmentIcon = <Paperclip aria-hidden="true" size={14} />;
              if (thumbnailUrl) {
                attachmentIcon = <img src={thumbnailUrl} alt="" onLoad={onLoad} />;
              } else if (attachment.data?.image) {
                attachmentIcon = <ImageIcon aria-hidden="true" size={14} />;
              }

              return (
                <button
                  type="button"
                  key={attachment.id}
                  className={`${styles.attachment} ${thumbnailUrl ? styles.attachmentVisual : ''}`}
                  onClick={() => {
                    if (isVisualPreview) {
                      onPreview({
                        ...attachment,
                        data: { ...attachment.data, url },
                      });
                    } else {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  {attachmentIcon}
                  <span>{attachment.name}</span>
                </button>
              );
            })}
          </div>
        )}
        {pendingFiles.length > 0 && (
          <div className={styles.pendingAttachments}>
            {pendingFiles.map((pendingFile, pendingFileIndex) => {
              const status = pendingFile.status || 'uploading';
              const copy = getPendingAttachmentCopy(status);
              const name = pendingFile.file?.name || pendingFile.name || t('chat.sentFile');
              const isRetryable = isPendingAttachmentRetryable(pendingFile);

              return (
                <div
                  key={pendingFile.clientAttachmentId || `${name}-${pendingFileIndex}`}
                  className={styles.pendingAttachment}
                >
                  <Paperclip aria-hidden="true" size={14} />
                  <span>
                    <strong>{name}</strong>
                    {copy && (
                      <small>
                        {status === 'uploading' ? <SendingStatus label={t(copy)} /> : t(copy)}
                      </small>
                    )}
                  </span>
                  {isRetryable && (
                    <button
                      type="button"
                      title={getAttachmentDeliveryErrorMessage(pendingFile.error, t)}
                      onClick={() =>
                        dispatch(
                          entryActions.retryChatMessageAttachment(
                            messageId,
                            pendingFile.clientAttachmentId,
                          ),
                        )
                      }
                    >
                      {t('chat.retry')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  },
);

const attachmentShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  data: PropTypes.shape({
    image: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    mimeType: PropTypes.string,
    thumbnailUrls: PropTypes.shape({
      outside360: PropTypes.string,
    }),
    url: PropTypes.string,
    video: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  }),
});

MessageAttachments.propTypes = {
  caption: PropTypes.node,
  imageAttachments: PropTypes.arrayOf(attachmentShape),
  messageId: PropTypes.string,
  onLoad: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  otherAttachments: PropTypes.arrayOf(attachmentShape),
  pendingFiles: PropTypes.arrayOf(
    PropTypes.shape({
      clientAttachmentId: PropTypes.string,
      error: PropTypes.shape({
        code: PropTypes.string,
        message: PropTypes.string,
      }),
      file: PropTypes.shape({ name: PropTypes.string }),
      name: PropTypes.string,
      status: PropTypes.string,
    }),
  ),
};

MessageAttachments.defaultProps = {
  caption: null,
  imageAttachments: [],
  messageId: undefined,
  otherAttachments: [],
  pendingFiles: [],
};

export default MessageAttachments;
