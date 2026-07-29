/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Gallery, Item as GalleryItem } from 'react-photoswipe-gallery';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { ClosableContext } from '../../../../contexts';
import { isListArchiveOrTrash } from '../../../../utils/record-helpers';
import { BoardMembershipRoles } from '../../../../constants/Enums';

import styles from './CardImageCarousel.module.scss';

const SWIPE_THRESHOLD = 48;

const CardImageCarousel = React.memo(() => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const card = useSelector(selectors.selectCurrentCard);
  const attachments = useSelector(selectors.selectAttachmentsForCurrentCard);
  const canEdit = useSelector((state) => {
    const list = selectListById(state, card.listId);

    if (isListArchiveOrTrash(list)) {
      return false;
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);

    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const images = useMemo(() => {
    const imageAttachments = attachments.filter(
      (attachment) =>
        attachment.isPersisted !== false &&
        attachment.data &&
        attachment.data.image &&
        attachment.data.thumbnailUrls &&
        attachment.data.url,
    );

    if (!card.coverAttachmentId) {
      return imageAttachments;
    }

    const coverAttachment = imageAttachments.find(
      (attachment) => attachment.id === card.coverAttachmentId,
    );

    if (!coverAttachment) {
      return imageAttachments;
    }

    return [
      coverAttachment,
      ...imageAttachments.filter((attachment) => attachment.id !== coverAttachment.id),
    ];
  }, [attachments, card.coverAttachmentId]);

  const [t] = useTranslation();
  const dispatch = useDispatch();
  const [selectedId, setSelectedId] = useState(null);
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);
  const rootRef = useRef(null);
  const pointerStartXRef = useRef(null);
  const didSwipeRef = useRef(false);

  const selectedIndex = Math.max(
    0,
    images.findIndex((image) => image.id === selectedId),
  );
  const selectedImage = images[selectedIndex];
  const hasMultipleImages = images.length > 1;
  const isCover = selectedImage?.id === card.coverAttachmentId;

  useEffect(() => {
    if (!images.length) {
      setSelectedId(null);
      return;
    }

    if (!images.some((image) => image.id === selectedId)) {
      setSelectedId(images[0].id);
    }
  }, [images, selectedId]);

  const selectIndex = useCallback(
    (index) => {
      if (!images.length) {
        return;
      }

      const normalizedIndex = (index + images.length) % images.length;
      setSelectedId(images[normalizedIndex].id);
    },
    [images],
  );

  const selectPrevious = useCallback(() => {
    selectIndex(selectedIndex - 1);
  }, [selectIndex, selectedIndex]);

  const selectNext = useCallback(() => {
    selectIndex(selectedIndex + 1);
  }, [selectIndex, selectedIndex]);

  const handleBeforeGalleryOpen = useCallback(
    (gallery) => {
      activateClosable();

      gallery.on('destroy', () => {
        deactivateClosable();
      });
    },
    [activateClosable, deactivateClosable],
  );

  const handleKeyDown = useCallback(
    (event) => {
      let nextIndex;

      switch (event.key) {
        case 'ArrowLeft':
          nextIndex = selectedIndex - 1;
          break;
        case 'ArrowRight':
          nextIndex = selectedIndex + 1;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = images.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      event.stopPropagation();
      selectIndex(nextIndex);

      const controlType = event.target.hasAttribute('data-carousel-thumbnail')
        ? 'thumbnail'
        : event.target.hasAttribute('data-carousel-dot')
          ? 'dot'
          : null;

      if (controlType) {
        const normalizedIndex = (nextIndex + images.length) % images.length;

        requestAnimationFrame(() => {
          rootRef.current
            ?.querySelector(`[data-carousel-${controlType}="${normalizedIndex}"]`)
            ?.focus();
        });
      }
    },
    [images.length, selectIndex, selectedIndex],
  );

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      pointerStartXRef.current = event.clientX;
      didSwipeRef.current = false;
    }
  }, []);

  const handlePointerUp = useCallback(
    (event) => {
      if (pointerStartXRef.current === null) {
        return;
      }

      const distance = event.clientX - pointerStartXRef.current;
      pointerStartXRef.current = null;

      if (Math.abs(distance) < SWIPE_THRESHOLD) {
        return;
      }

      didSwipeRef.current = true;

      if (distance > 0) {
        selectPrevious();
      } else {
        selectNext();
      }
    },
    [selectNext, selectPrevious],
  );

  const handlePointerCancel = useCallback(() => {
    pointerStartXRef.current = null;
  }, []);

  const handleToggleCoverClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!selectedImage) {
        return;
      }

      dispatch(
        entryActions.updateCurrentCard({
          coverAttachmentId: isCover ? null : selectedImage.id,
        }),
      );
    },
    [dispatch, isCover, selectedImage],
  );

  if (!selectedImage) {
    return null;
  }

  return (
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
        paddingFn: (viewportSize) => {
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
      onBeforeOpen={handleBeforeGalleryOpen}
    >
      <section ref={rootRef} className={styles.carousel} aria-label={t('common.cardImages')}>
        <div
          className={styles.viewport}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {images.map((image, index) => {
            const isSelected = index === selectedIndex;

            return (
              <GalleryItem
                key={image.id}
                src={image.data.url}
                width={image.data.image.width}
                height={image.data.image.height}
                original={image.data.url}
                caption={image.name}
              >
                {({ ref, open }) => (
                  <button
                    ref={ref}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-label={t('action.openImage', {
                      name: image.name,
                    })}
                    className={classNames(styles.slide, isSelected && styles.slideSelected)}
                    onKeyDown={handleKeyDown}
                    onClick={(event) => {
                      if (didSwipeRef.current) {
                        event.preventDefault();
                        didSwipeRef.current = false;
                        return;
                      }

                      open();
                    }}
                  >
                    <img
                      src={
                        image.data.thumbnailUrls.outside720 ||
                        image.data.thumbnailUrls.outside360 ||
                        image.data.url
                      }
                      alt={image.name}
                      className={styles.image}
                    />
                  </button>
                )}
              </GalleryItem>
            );
          })}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                className={classNames(styles.navigation, styles.previous)}
                aria-label={t('action.previousImage')}
                onKeyDown={handleKeyDown}
                onClick={selectPrevious}
              >
                <Icon fitted name="chevron left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={classNames(styles.navigation, styles.next)}
                aria-label={t('action.nextImage')}
                onKeyDown={handleKeyDown}
                onClick={selectNext}
              >
                <Icon fitted name="chevron right" aria-hidden="true" />
              </button>
            </>
          )}
          {canEdit && (
            <button
              type="button"
              className={classNames(styles.coverButton, isCover && styles.coverButtonActive)}
              aria-pressed={isCover}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={handleToggleCoverClick}
            >
              <Icon fitted name={isCover ? 'check' : 'image outline'} aria-hidden="true" />
              <span>
                {isCover
                  ? t('action.removeCover', {
                      context: 'title',
                    })
                  : t('action.makeCover', {
                      context: 'title',
                    })}
              </span>
            </button>
          )}
        </div>
        <div className={styles.status} aria-live="polite">
          {t('common.imagePosition', {
            current: selectedIndex + 1,
            total: images.length,
          })}
        </div>
        {hasMultipleImages && (
          <>
            <div className={styles.dots} role="group" aria-label={t('common.cardImages')}>
              {images.map((image, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={image.id}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-current={isSelected ? 'true' : undefined}
                    aria-label={t('common.imagePosition', {
                      current: index + 1,
                      total: images.length,
                    })}
                    data-carousel-dot={index}
                    className={classNames(styles.dot, isSelected && styles.dotSelected)}
                    onKeyDown={handleKeyDown}
                    onClick={() => setSelectedId(image.id)}
                  />
                );
              })}
            </div>
            <div className={styles.thumbnails} role="group" aria-label={t('common.cardImages')}>
              {images.map((image, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={image.id}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-current={isSelected ? 'true' : undefined}
                    aria-label={t('common.imagePosition', {
                      current: index + 1,
                      total: images.length,
                    })}
                    data-carousel-thumbnail={index}
                    className={classNames(styles.thumbnail, isSelected && styles.thumbnailSelected)}
                    onKeyDown={handleKeyDown}
                    onClick={() => setSelectedId(image.id)}
                  >
                    <img
                      src={
                        image.data.thumbnailUrls.outside360 ||
                        image.data.thumbnailUrls.outside720 ||
                        image.data.url
                      }
                      alt=""
                      className={styles.thumbnailImage}
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </Gallery>
  );
});

export default CardImageCarousel;
