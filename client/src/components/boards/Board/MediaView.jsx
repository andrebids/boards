/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Gallery, Item as GalleryItem } from 'react-photoswipe-gallery';
import { Icon } from 'semantic-ui-react';
import { useWindowWidth } from '../../../lib/hooks';
import { Masonry } from '../../../lib/custom-ui';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import VideoPlayer from '../../common/VideoPlayer';
import Paths from '../../../constants/Paths';
import { AttachmentTypes } from '../../../constants/Enums';

import styles from './MediaView.module.scss';

const COLUMN_WIDTH = 300;

const MediaView = React.memo(() => {
  const attachments = useSelector(
    selectors.selectFilteredAttachmentsForCurrentBoard
  );

  const [t] = useTranslation();
  const dispatch = useDispatch();
  const windowWidth = useWindowWidth();

  const handleCardClick = useCallback(
    cardId => {
      dispatch(push(Paths.CARDS.replace(':id', cardId)));
    },
    [dispatch]
  );

  if (attachments.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateCard}>
            <Icon
              name="folder open outline"
              size="big"
              className={styles.emptyStateIcon}
            />
            <div className={styles.emptyStateText}>
              {t('common.noAttachmentsToDisplay')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Gallery
        withCaption
        withDownloadButton
        options={{
          wheelToZoom: true,
          showHideAnimationType: 'none',
          closeTitle: '',
          zoomTitle: '',
          arrowPrevTitle: '',
          arrowNextTitle: '',
          errorMsg: '',
          paddingFn: viewportSize => {
            const paddingX = viewportSize.x / 20;
            const paddingY = viewportSize.y / 20;

            return {
              top: paddingX,
              bottom: paddingX,
              left: paddingY,
              right: paddingY,
            };
          },
        }}
      >
        <Masonry
          columns={Math.max(1, Math.floor(windowWidth / COLUMN_WIDTH))}
          spacing={20}
        >
          {attachments.map(attachment => {
            const isLink = attachment.type === AttachmentTypes.LINK;
            const data = attachment.data || {};
            const image = data.image;
            const video = data.video;

            const thumbnailUrls = data.thumbnailUrls;
            const thumbnailUrl = (thumbnailUrls && thumbnailUrls.outside360) || null;

            const dimensions = (image && image.width && image.height && image) ||
              (video && video.width && video.height && video) ||
              null;

            const name =
              attachment.name ||
              (attachment.data && attachment.data.filename) ||
              '—';

            const cardName = attachment.cardName || '';
            const title = cardName ? `${name} — ${cardName}` : name;

            let galleryItemProps;
            if (image && image.width && image.height) {
              galleryItemProps = {
                src: (thumbnailUrls && thumbnailUrls.outside720) || data.url,
                width: image.width,
                height: image.height,
              };
            } else if (video) {
              galleryItemProps = {
                content: (
                  <VideoPlayer
                    attachment={attachment}
                    posterUrl={
                      (thumbnailUrls &&
                        (thumbnailUrls.outside720 || thumbnailUrls.outside360)) ||
                      undefined
                    }
                    className={styles.videoContent}
                  />
                ),
              };
            } else {
              galleryItemProps = {
                content: (
                  <span className={styles.previewError}>
                    {t('common.thereIsNoPreviewAvailableForThisAttachment')}
                  </span>
                ),
              };
            }

            const openLabel = t(
              isLink ? 'common.openInNewTab' : 'common.openAttachment'
            );

            return (
              <div key={attachment.id}>
                <GalleryItem
                  {...galleryItemProps} // eslint-disable-line react/jsx-props-no-spreading
                  original={attachment.data && attachment.data.url}
                  caption={title}
                >
                  {({ ref, open }) => {
                    const handleOpen = () => {
                      if (isLink) {
                        if (attachment.data && attachment.data.url) {
                          window.open(
                            attachment.data.url,
                            '_blank',
                            'noopener,noreferrer'
                          );
                        }

                        return;
                      }

                      open();
                    };

                    return (
                      <div
                        ref={ref}
                        role="button"
                        tabIndex={0}
                        title={title}
                        className={styles.tile}
                        onClick={handleOpen}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpen();
                          }
                        }}
                      >
                        {thumbnailUrl ? (
                          <div
                            className={styles.image}
                            style={{
                              backgroundImage: `url("${thumbnailUrl}")`,
                              aspectRatio: dimensions
                                ? dimensions.width / dimensions.height
                                : undefined,
                            }}
                          />
                        ) : (
                          <div
                            className={classNames(
                              styles.image,
                              styles.imagePlaceholder
                            )}
                          >
                            <Icon
                              name={
                                // eslint-disable-next-line no-nested-ternary
                                isLink
                                  ? 'linkify'
                                  : video
                                    ? 'file video outline'
                                    : 'file outline'
                              }
                              size="big"
                              className={styles.placeholderIcon}
                            />
                          </div>
                        )}
                        <div className={styles.bottomOverlay}>
                          <div className={styles.overlayAttachmentName}>
                            {name}
                          </div>
                          {cardName && (
                            <div className={styles.overlayCardName}>
                              {cardName}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={openLabel}
                          title={openLabel}
                          className={classNames(
                            styles.hoverButton,
                            styles.hoverButtonLeft
                          )}
                          onClick={event => {
                            event.stopPropagation();
                            handleOpen();
                          }}
                        >
                          <Icon
                            fitted
                            name={isLink ? 'external square' : 'expand'}
                          />
                        </button>
                        {attachment.cardId && (
                          <button
                            type="button"
                            aria-label={t('common.openCard')}
                            title={t('common.openCard')}
                            className={classNames(
                              styles.hoverButton,
                              styles.hoverButtonRight
                            )}
                            onClick={event => {
                              event.stopPropagation();
                              handleCardClick(attachment.cardId);
                            }}
                          >
                            <Icon fitted name="sticky note outline" />
                          </button>
                        )}
                      </div>
                    );
                  }}
                </GalleryItem>
              </div>
            );
          })}
        </Masonry>
      </Gallery>
    </div>
  );
});

export default MediaView;
