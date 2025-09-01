/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon, Button, Loader } from 'semantic-ui-react';

import styles from './FilePreviewModal.module.scss';

const PdfPreview = ({ file, onClose }) => {
  const [t] = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const pdfUrl = file?.data?.url;

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleDownload = useCallback(() => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = file.name;
      link.click();
    }
  }, [pdfUrl, file.name]);

  const handleOpenInNewTab = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }, [pdfUrl]);

  if (hasError) {
    return (
      <div className={styles.errorContainer}>
        <Icon name="exclamation triangle" size="huge" />
        <p>{t('common.errorLoadingPdf')}</p>
        <div className={styles.errorActions}>
          <Button onClick={handleOpenInNewTab}>
            {t('common.openInNewTab')}
          </Button>
          <Button onClick={handleDownload}>{t('common.download')}</Button>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pdfPreviewContainer}>
      {/* Header com controles */}
      <div className={styles.pdfPreviewHeader}>
        <div className={styles.pdfInfo}>
          <Icon name="file pdf outline" />
          <span className={styles.fileName}>{file.name}</span>
        </div>

        <div className={styles.pdfControls}>
          <Button
            icon="external alternate"
            size="mini"
            onClick={handleOpenInNewTab}
            title={t('common.openInNewTab')}
          />

          <Button
            icon="download"
            size="mini"
            onClick={handleDownload}
            title={t('common.download')}
          />

          <Button
            icon="close"
            size="mini"
            onClick={onClose}
            title={t('common.close')}
          />
        </div>
      </div>

      {/* Container do PDF */}
      <div className={styles.pdfContainer}>
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Loader active size="large" />
            <p>{t('common.loadingPdf')}</p>
          </div>
        )}

        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          title={file.name}
          className={styles.pdfIframe}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
        />
      </div>

      {/* Footer com informações */}
      <div className={styles.pdfPreviewFooter}>
        <span className={styles.pdfInfo}>
          <Icon name="file pdf outline" />
          PDF Document
        </span>
        <span className={styles.fileSize}>
          {file.data?.size && formatFileSize(file.data.size)}
        </span>
      </div>
    </div>
  );
};

/**
 * Formata o tamanho do ficheiro em bytes para uma string legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado
 */
const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

PdfPreview.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
    data: PropTypes.shape({
      url: PropTypes.string.isRequired,
      size: PropTypes.number,
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PdfPreview;
