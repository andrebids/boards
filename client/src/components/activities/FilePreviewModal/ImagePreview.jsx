/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon, Button, Loader } from 'semantic-ui-react';

import styles from './FilePreviewModal.module.scss';

const ImagePreview = ({ file, onClose }) => {
  const [t] = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const previewUrl = file?.data?.url || file?.data?.thumbnailUrls?.outside720;

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    e => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    e => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, zoom, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(() => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = file.name;
      link.click();
    }
  }, [previewUrl, file.name]);

  if (hasError) {
    return (
      <div className={styles.errorContainer}>
        <Icon name="exclamation triangle" size="huge" />
        <p>{t('common.errorLoadingImage')}</p>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </div>
    );
  }

  return (
    <div className={styles.imagePreviewContainer}>
      {/* Header com controles */}
      <div className={styles.imagePreviewHeader}>
        <div className={styles.imageInfo}>
          <Icon name="image" />
          <span className={styles.fileName}>{file.name}</span>
        </div>

        <div className={styles.imageControls}>
          <Button.Group size="mini">
            <Button
              icon="zoom out"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title={t('common.zoomOut')}
            />
            <Button
              icon="zoom"
              onClick={handleResetZoom}
              disabled={zoom === 1}
              title={t('common.resetZoom')}
            />
            <Button
              icon="zoom in"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title={t('common.zoomIn')}
            />
          </Button.Group>

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

      {/* Container da imagem */}
      <div
        className={styles.imageContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
        }}
      >
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Loader active size="large" />
            <p>{t('common.loadingImage')}</p>
          </div>
        )}

        <img
          src={previewUrl}
          alt={file.name}
          className={styles.previewImage}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
        />
      </div>

      {/* Footer com informações */}
      <div className={styles.imagePreviewFooter}>
        <span className={styles.zoomInfo}>{Math.round(zoom * 100)}%</span>
        {file.data?.image && (
          <span className={styles.imageInfo}>
            {file.data.image.width} × {file.data.image.height}
          </span>
        )}
      </div>
    </div>
  );
};

ImagePreview.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
    data: PropTypes.shape({
      url: PropTypes.string,
      thumbnailUrls: PropTypes.object,
      image: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
      }),
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ImagePreview;
