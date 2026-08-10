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
import VideoPlayer from '../../../common/VideoPlayer';
import TimeAgo from '../../../common/TimeAgo';
import getDefaultMedia from './selection';

import styles from './CardImageCarousel.module.scss';

const SWIPE_THRESHOLD = 48;

const isVideoAttachment = (attachment) =>
  Boolean(
    attachment.data.video ||
      (attachment.data.mimeType && attachment.data.mimeType.startsWith('video/')),
  );

const getThumbnailUrl = (attachment, preferredSize = '720') => {
  if (!attachment.data.thumbnailUrls) {
    return null;
  }

  const fallbackSize = preferredSize === '720' ? '360' : '720';

  return (
    attachment.data.thumbnailUrls[`outside${preferredSize}`] ||
    attachment.data.thumbnailUrls[`outside${fallbackSize}`] ||
    null
  );
};

const getLocalDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const getLocalMinuteKey = (date) =>
  `${getLocalDateKey(date)}-${date.getHours()}-${date.getMinutes()}`;

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
    const visualAttachments = attachments.filter(
      (attachment) =>
        attachment.isPersisted !== false &&
        attachment.data &&
        attachment.data.url &&
        ((attachment.data.image && attachment.data.thumbnailUrls) || isVideoAttachment(attachment)),
    );

    if (!card.coverAttachmentId) {
      return visualAttachments;
    }

    const coverAttachment = visualAttachments.find(
      (attachment) => attachment.id === card.coverAttachmentId,
    );

    if (!coverAttachment) {
      return visualAttachments;
    }

    return [
      coverAttachment,
      ...visualAttachments.filter((attachment) => attachment.id !== coverAttachment.id),
    ];
  }, [attachments, card.coverAttachmentId]);

  const [t] = useTranslation();
  const dispatch = useDispatch();
  const [selectedId, setSelectedId] = useState(null);
  const [loadedImageKeys, setLoadedImageKeys] = useState({});
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [thumbnailScrollState, setThumbnailScrollState] = useState({
    hasOverflow: false,
    canScrollPrevious: false,
    canScrollNext: false,
  });
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);
  const rootRef = useRef(null);
  const thumbnailsRef = useRef(null);
  const actionToolbarRef = useRef(null);
  const actionsButtonRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const pointerStartXRef = useRef(null);
  const didSwipeRef = useRef(false);

  const defaultImage = useMemo(
    () => getDefaultMedia(images, card.coverAttachmentId),
    [images, card.coverAttachmentId],
  );
  const temporalMetadataById = useMemo(() => {
    const dayGroups = new Map();
    const metadataById = {};

    images.forEach((image) => {
      const date = new Date(image.createdAt);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const item = {
        date,
        image,
      };
      const dateKey = getLocalDateKey(date);
      const dayGroup = dayGroups.get(dateKey) || [];

      dayGroup.push(item);
      dayGroups.set(dateKey, dayGroup);
      metadataById[image.id] = {
        fullDateTime: t('format:fullDateTime', {
          value: date,
          postProcess: 'formatDate',
        }),
      };
    });

    dayGroups.forEach((dayGroup) => {
      if (dayGroup.length < 2) {
        return;
      }

      const minuteGroups = new Map();

      dayGroup.forEach((item) => {
        const minuteKey = getLocalMinuteKey(item.date);
        const minuteGroup = minuteGroups.get(minuteKey) || [];

        minuteGroup.push(item);
        minuteGroups.set(minuteKey, minuteGroup);
      });

      minuteGroups.forEach((minuteGroup) => {
        minuteGroup.forEach(({ date, image }, index) => {
          metadataById[image.id] = {
            ...metadataById[image.id],
            time: t('format:time', {
              value: date,
              postProcess: 'formatDate',
            }),
            ordinal: minuteGroup.length > 1 ? `${index + 1}/${minuteGroup.length}` : null,
          };
        });
      });
    });

    return metadataById;
  }, [images, t]);
  const selectedImageIndex = images.findIndex((image) => image.id === selectedId);
  const selectedIndex =
    selectedImageIndex >= 0
      ? selectedImageIndex
      : Math.max(
          0,
          images.findIndex((image) => image.id === defaultImage?.id),
        );
  const selectedImage = images[selectedIndex];
  const hasMultipleImages = images.length > 1;
  const selectedIsVideo = selectedImage ? isVideoAttachment(selectedImage) : false;
  const isCover = selectedImage?.id === card.coverAttachmentId;

  const updateThumbnailScrollState = useCallback(() => {
    const thumbnailsElement = thumbnailsRef.current;

    if (!thumbnailsElement) {
      return;
    }

    const maximumScrollLeft = thumbnailsElement.scrollWidth - thumbnailsElement.clientWidth;
    const hasOverflow = maximumScrollLeft > 2;
    const nextState = {
      hasOverflow,
      canScrollPrevious: hasOverflow && thumbnailsElement.scrollLeft > 2,
      canScrollNext: hasOverflow && thumbnailsElement.scrollLeft < maximumScrollLeft - 2,
    };

    setThumbnailScrollState((currentState) =>
      currentState.hasOverflow === nextState.hasOverflow &&
      currentState.canScrollPrevious === nextState.canScrollPrevious &&
      currentState.canScrollNext === nextState.canScrollNext
        ? currentState
        : nextState,
    );
  }, []);

  useEffect(() => {
    if (!images.length) {
      setSelectedId(null);
      return;
    }

    if (!images.some((image) => image.id === selectedId)) {
      setSelectedId(defaultImage.id);
    }
  }, [defaultImage, images, selectedId]);

  useEffect(() => {
    setIsActionsMenuOpen(false);
    setIsDeleteConfirmationOpen(false);
  }, [selectedId]);

  useEffect(() => {
    const thumbnailsElement = thumbnailsRef.current;

    if (!thumbnailsElement) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(updateThumbnailScrollState);
    const resizeObserver = new ResizeObserver(updateThumbnailScrollState);

    resizeObserver.observe(thumbnailsElement);
    thumbnailsElement.addEventListener('scroll', updateThumbnailScrollState, {
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      thumbnailsElement.removeEventListener('scroll', updateThumbnailScrollState);
    };
  }, [images.length, updateThumbnailScrollState]);

  useEffect(() => {
    const thumbnailsElement = thumbnailsRef.current;
    const selectedThumbnail = thumbnailsElement?.querySelector(
      `[data-carousel-thumbnail="${selectedIndex}"]`,
    );

    if (!selectedThumbnail) {
      return;
    }

    const thumbnailLeft = selectedThumbnail.offsetLeft;
    const thumbnailRight = thumbnailLeft + selectedThumbnail.offsetWidth;
    const thumbnailsStyles = window.getComputedStyle(thumbnailsElement);
    const scrollPaddingLeft = Number.parseFloat(thumbnailsStyles.scrollPaddingLeft) || 0;
    const scrollPaddingRight = Number.parseFloat(thumbnailsStyles.scrollPaddingRight) || 0;
    const visibleLeft = thumbnailsElement.scrollLeft + scrollPaddingLeft;
    const visibleRight =
      thumbnailsElement.scrollLeft + thumbnailsElement.clientWidth - scrollPaddingRight;

    if (thumbnailLeft >= visibleLeft && thumbnailRight <= visibleRight) {
      return;
    }

    selectedThumbnail.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedIndex]);

  useEffect(() => {
    if (!isActionsMenuOpen) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      actionsMenuRef.current?.querySelector('button')?.focus();
    });

    const handleDocumentPointerDown = (event) => {
      if (!actionToolbarRef.current?.contains(event.target)) {
        setIsActionsMenuOpen(false);
        setIsDeleteConfirmationOpen(false);
      }
    };

    const handleDocumentKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsActionsMenuOpen(false);
      setIsDeleteConfirmationOpen(false);
      actionsButtonRef.current?.focus();
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isActionsMenuOpen, isDeleteConfirmationOpen]);

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

  const scrollThumbnails = useCallback((direction) => {
    const thumbnailsElement = thumbnailsRef.current;

    if (!thumbnailsElement) {
      return;
    }

    thumbnailsElement.scrollBy({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      left: direction * Math.max(78, thumbnailsElement.clientWidth * 0.75),
    });
  }, []);

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

      if (event.target.hasAttribute('data-carousel-thumbnail')) {
        const normalizedIndex = (nextIndex + images.length) % images.length;

        requestAnimationFrame(() => {
          rootRef.current?.querySelector(`[data-carousel-thumbnail="${normalizedIndex}"]`)?.focus();
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

  const handleImageLoad = useCallback((imageKey) => {
    setLoadedImageKeys((previousKeys) => {
      if (previousKeys[imageKey]) {
        return previousKeys;
      }

      return {
        ...previousKeys,
        [imageKey]: true,
      };
    });
  }, []);

  const handleToggleCoverClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!selectedImage || selectedIsVideo) {
        return;
      }

      dispatch(
        entryActions.updateCurrentCard({
          coverAttachmentId: isCover ? null : selectedImage.id,
        }),
      );
    },
    [dispatch, isCover, selectedImage, selectedIsVideo],
  );

  const handleDownloadClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!selectedImage) {
        return;
      }

      const linkElement = document.createElement('a');
      linkElement.href = selectedImage.data.url;
      linkElement.download = selectedImage.data.filename || selectedImage.name;
      linkElement.target = '_blank';
      linkElement.click();
    },
    [selectedImage],
  );

  const handleActionsMenuToggleClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsActionsMenuOpen((isOpen) => {
      if (isOpen) {
        setIsDeleteConfirmationOpen(false);
      }

      return !isOpen;
    });
  }, []);

  const handleActionsMenuDownloadClick = useCallback(
    (event) => {
      handleDownloadClick(event);
      setIsActionsMenuOpen(false);
      setIsDeleteConfirmationOpen(false);
      window.requestAnimationFrame(() => {
        actionsButtonRef.current?.focus();
      });
    },
    [handleDownloadClick],
  );

  const handleDeleteRequestClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDeleteConfirmationOpen(true);
  }, []);

  const handleDeleteCancelClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDeleteConfirmationOpen(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedImage) {
      return;
    }

    setIsActionsMenuOpen(false);
    setIsDeleteConfirmationOpen(false);
    dispatch(entryActions.deleteAttachment(selectedImage.id));
  }, [dispatch, selectedImage]);

  const handleActionsMenuKeyDown = useCallback((event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const buttons = Array.from(actionsMenuRef.current?.querySelectorAll('button') || []);
    const currentIndex = buttons.indexOf(document.activeElement);

    if (!buttons.length) {
      return;
    }

    let nextIndex;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = buttons.length - 1;
    } else if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    }

    event.preventDefault();
    event.stopPropagation();
    buttons[nextIndex].focus();
  }, []);

  if (!selectedImage) {
    return null;
  }

  const coverActionLabel = isCover
    ? t('action.removeCover', {
        context: 'title',
      })
    : t('action.makeCover', {
        context: 'title',
      });

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
      <section ref={rootRef} className={styles.carousel} aria-label={t('common.cardMedia')}>
        <div
          className={styles.viewport}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {images.map((image, index) => {
            const isSelected = index === selectedIndex;
            const isVideo = isVideoAttachment(image);
            const thumbnailUrl = getThumbnailUrl(image);

            if (isVideo) {
              return (
                <div
                  key={image.id}
                  className={classNames(
                    styles.slide,
                    styles.videoSlide,
                    isSelected && styles.slideSelected,
                  )}
                >
                  {isSelected && (
                    <VideoPlayer attachment={image} autoPlay posterUrl={thumbnailUrl} />
                  )}
                </div>
              );
            }

            const imageUrl = getThumbnailUrl(image) || image.data.url;
            const imageKey = `${image.id}:${imageUrl}`;
            const isImageLoading = !loadedImageKeys[imageKey];

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
                    aria-busy={isSelected && isImageLoading}
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
                      src={imageUrl}
                      alt={image.name}
                      className={styles.image}
                      onLoad={() => handleImageLoad(imageKey)}
                      onError={() => handleImageLoad(imageKey)}
                    />
                    {isSelected && isImageLoading && (
                      <span className={styles.mediaLoadingIndicator} aria-hidden="true">
                        <span className={styles.mediaLoadingSpinner} />
                      </span>
                    )}
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
                aria-label={t('action.previousMedia')}
                onKeyDown={handleKeyDown}
                onClick={selectPrevious}
              >
                <Icon fitted name="chevron left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={classNames(styles.navigation, styles.next)}
                aria-label={t('action.nextMedia')}
                onKeyDown={handleKeyDown}
                onClick={selectNext}
              >
                <Icon fitted name="chevron right" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div
          ref={actionToolbarRef}
          className={styles.actionToolbar}
          role="group"
          aria-label={t('common.actions')}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          {canEdit && !selectedIsVideo && (
            <button
              type="button"
              className={classNames(
                styles.actionButton,
                styles.coverActionButton,
                isCover && styles.actionButtonActive,
              )}
              aria-label={coverActionLabel}
              aria-pressed={isCover}
              title={coverActionLabel}
              onClick={handleToggleCoverClick}
            >
              <Icon fitted name={isCover ? 'check circle' : 'image outline'} aria-hidden="true" />
              <span className={styles.actionLabel}>{t('common.cover')}</span>
            </button>
          )}
          {canEdit && !selectedIsVideo && (
            <span className={styles.actionDivider} aria-hidden="true" />
          )}
          <button
            ref={actionsButtonRef}
            type="button"
            className={styles.actionButton}
            aria-label={t('common.actions')}
            aria-controls={isActionsMenuOpen ? 'card-media-actions-menu' : undefined}
            aria-expanded={isActionsMenuOpen}
            aria-haspopup="menu"
            title={t('common.actions')}
            onClick={handleActionsMenuToggleClick}
          >
            <Icon fitted name="ellipsis horizontal" aria-hidden="true" />
          </button>
          {isActionsMenuOpen && isDeleteConfirmationOpen && (
            <div
              ref={actionsMenuRef}
              id="card-media-actions-menu"
              className={classNames(styles.actionsMenu, styles.actionsMenuConfirmation)}
              role="alertdialog"
              aria-label={t('common.deleteAttachment', {
                context: 'title',
              })}
              aria-modal="true"
              tabIndex={-1}
            >
              <p className={styles.confirmationMessage}>
                {t('common.areYouSureYouWantToDeleteThisAttachment')}
              </p>
              <div className={styles.confirmationActions}>
                <button
                  type="button"
                  className={styles.confirmationCancelButton}
                  onClick={handleDeleteCancelClick}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className={styles.confirmationDeleteButton}
                  onClick={handleDeleteConfirm}
                >
                  {t('action.deleteAttachment')}
                </button>
              </div>
            </div>
          )}
          {isActionsMenuOpen && !isDeleteConfirmationOpen && (
            <div
              ref={actionsMenuRef}
              id="card-media-actions-menu"
              className={styles.actionsMenu}
              role="menu"
              aria-label={t('common.actions')}
              tabIndex={-1}
              onKeyDown={handleActionsMenuKeyDown}
            >
              <button
                type="button"
                role="menuitem"
                className={styles.actionsMenuItem}
                onClick={handleActionsMenuDownloadClick}
              >
                <Icon fitted name="download" aria-hidden="true" />
                <span>{t('common.download')}</span>
              </button>
              {canEdit && (
                <>
                  <span className={styles.actionsMenuDivider} aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    className={classNames(styles.actionsMenuItem, styles.actionsMenuItemDanger)}
                    onClick={handleDeleteRequestClick}
                  >
                    <Icon fitted name="trash alternate outline" aria-hidden="true" />
                    <span>
                      {t('common.deleteAttachment', {
                        context: 'title',
                      })}
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className={styles.status} aria-live="polite">
          {t('common.mediaPosition', {
            current: selectedIndex + 1,
            total: images.length,
          })}
        </div>
        {hasMultipleImages && (
          <div
            className={classNames(
              styles.thumbnailRail,
              thumbnailScrollState.canScrollPrevious && styles.thumbnailRailHasPrevious,
              thumbnailScrollState.canScrollNext && styles.thumbnailRailHasNext,
            )}
          >
            {thumbnailScrollState.hasOverflow && (
              <button
                type="button"
                className={classNames(styles.thumbnailNavigation, styles.thumbnailPrevious)}
                aria-label={t('action.previousMedia')}
                disabled={!thumbnailScrollState.canScrollPrevious}
                onClick={() => scrollThumbnails(-1)}
              >
                <Icon fitted name="chevron left" aria-hidden="true" />
              </button>
            )}
            <div
              ref={thumbnailsRef}
              className={styles.thumbnails}
              role="group"
              aria-label={t('common.cardMedia')}
            >
              {images.map((image, index) => {
                const isSelected = index === selectedIndex;
                const isVideo = isVideoAttachment(image);
                const thumbnailUrl = getThumbnailUrl(image, '360');
                const temporalMetadata = temporalMetadataById[image.id];
                let thumbnailNode;

                if (thumbnailUrl) {
                  thumbnailNode = (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className={styles.thumbnailImage}
                    />
                  );
                } else if (isVideo) {
                  thumbnailNode = (
                    <video
                      src={image.data.url}
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                      className={styles.thumbnailImage}
                    />
                  );
                } else {
                  thumbnailNode = (
                    <span className={styles.thumbnailFallback} aria-hidden="true">
                      <Icon fitted name="file image outline" />
                    </span>
                  );
                }

                return (
                  <button
                    key={image.id}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-current={isSelected ? 'true' : undefined}
                    aria-label={t('common.mediaPosition', {
                      current: index + 1,
                      total: images.length,
                    })}
                    title={
                      temporalMetadata?.fullDateTime
                        ? `${image.name}\n${temporalMetadata.fullDateTime}`
                        : image.name
                    }
                    data-carousel-thumbnail={index}
                    className={classNames(styles.thumbnail, isSelected && styles.thumbnailSelected)}
                    onKeyDown={handleKeyDown}
                    onClick={() => setSelectedId(image.id)}
                  >
                    <span className={styles.thumbnailPreview}>
                      {thumbnailNode}
                      {isVideo && (
                        <span className={styles.thumbnailVideoIndicator} aria-hidden="true">
                          <Icon fitted name="play" />
                        </span>
                      )}
                    </span>
                    <span className={styles.thumbnailTime} aria-hidden="true">
                      <span className={styles.thumbnailRelativeTime}>
                        <TimeAgo date={image.createdAt} />
                      </span>
                      {temporalMetadata?.time && (
                        <span className={styles.thumbnailExactTime}>
                          {temporalMetadata.time}
                          {temporalMetadata.ordinal && (
                            <span className={styles.thumbnailOrdinal}>
                              {temporalMetadata.ordinal}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {thumbnailScrollState.hasOverflow && (
              <button
                type="button"
                className={classNames(styles.thumbnailNavigation, styles.thumbnailNext)}
                aria-label={t('action.nextMedia')}
                disabled={!thumbnailScrollState.canScrollNext}
                onClick={() => scrollThumbnails(1)}
              >
                <Icon fitted name="chevron right" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>
    </Gallery>
  );
});

export default CardImageCarousel;
