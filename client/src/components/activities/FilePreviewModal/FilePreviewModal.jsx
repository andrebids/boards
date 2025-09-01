/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Modal, Icon, Button } from 'semantic-ui-react';

import { getFileType, canPreviewFile } from '../../../utils/fileTypeUtils';
import ImagePreview from './ImagePreview';
import PdfPreview from './PdfPreview';

import styles from './FilePreviewModal.module.scss';

const FilePreviewModal = ({ file, isOpen, onClose }) => {
  const [t] = useTranslation();

  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    event => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Se não há ficheiro ou não pode ser previewado
  if (!file || !canPreviewFile(file)) {
    return null;
  }

  const fileType = getFileType(file.name);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="large"
      className={`${styles.filePreviewModal} glass-panel`}
      closeIcon
      closeOnDimmerClick
      closeOnEscape
    >
      {/* Backdrop personalizado */}
      <div className={styles.modalBackdrop} onClick={handleBackdropClick} />

      {/* Conteúdo do modal */}
      <Modal.Content className={styles.modalContent}>
        {/* Header do modal */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Icon name="eye" />
            <span>{t('common.filePreview')}</span>
          </div>

          <div className={styles.modalActions}>
            <Button
              icon="close"
              size="mini"
              onClick={handleClose}
              title={t('common.close')}
            />
          </div>
        </div>

        {/* Conteúdo do preview */}
        <div className={styles.previewContent}>
          {fileType.isImage && (
            <ImagePreview file={file} onClose={handleClose} />
          )}

          {fileType.isPdf && <PdfPreview file={file} onClose={handleClose} />}

          {fileType.isDocument && !fileType.isPdf && (
            <div className={styles.documentPreview}>
              <div className={styles.documentInfo}>
                <Icon name="file text outline" size="huge" />
                <h3>{file.name}</h3>
                <p>{t('common.documentPreviewNotAvailable')}</p>
              </div>

              <div className={styles.documentActions}>
                <Button
                  icon="external alternate"
                  content={t('common.openInNewTab')}
                  onClick={() => window.open(file.data.url, '_blank')}
                />
                <Button
                  icon="download"
                  content={t('common.download')}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = file.data.url;
                    link.download = file.name;
                    link.click();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};

FilePreviewModal.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
    data: PropTypes.shape({
      url: PropTypes.string,
      thumbnailUrls: PropTypes.object,
      image: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
      }),
      size: PropTypes.number,
    }),
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FilePreviewModal;
