/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Icon } from 'semantic-ui-react';
import { Button } from '../../../lib/custom-ui';
import { useDidUpdate, useTransitioning } from '../../../lib/hooks';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import DroppableTypes from '../../../constants/DroppableTypes';
import { AttachmentTypes, BoardMembershipRoles, ListTypes } from '../../../constants/Enums';
import { ListTypeIcons } from '../../../constants/Icons';
import EditName from './EditName';
import ActionsStep from './ActionsStep';
import DraggableCard from '../../cards/DraggableCard';
import AddCard from '../../cards/AddCard';
import ArchiveCardsStep from '../../cards/ArchiveCardsStep';
import PlusMathIcon from '../../../assets/images/plus-math-icon.svg?react';
import {
  buildProjectCardDataFromFile,
  processSupportedFiles,
} from '../../../utils/file-helpers';
import handleAttachmentFiles from '../../../utils/attachment-upload';
import {
  getCardIdFromFileDropTarget,
  getFileDropTarget,
  NEW_CARD_FILE_DROP_TARGET,
} from '../../../utils/file-drop-target';

import styles from './List.module.scss';
import globalStyles from '../../../styles.module.scss';

const LIGHT_LIST_COLORS = new Set([
  'light-mud',
  'bright-moss',
  'antique-blue',
  'dark-granite',
  'hufflepuff-gold',
  'golden-snitch',
  'magical-silver',
  'unicorn-white',
  'dusty-rose',
  'vibrant-sunset',
  'cool-sky',
  'soft-pink',
  'lavender',
  'powder-blue',
  'mint-green',
  'peach',
  'lilac',
  'pale-dogwood',
  'blue-white-stripes',
]);

const List = React.memo(({ id, index }) => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const selectFilteredCardIdsByListId = useMemo(
    () => selectors.makeSelectFilteredCardIdsByListId(),
    []
  );

  const isFavoritesActive = useSelector(
    selectors.selectIsFavoritesActiveForCurrentUser
  );
  const list = useSelector(state => selectListById(state, id));
  const cardIds = useSelector(state =>
    selectFilteredCardIdsByListId(state, id)
  );

  const { canEdit, canArchiveCards, canAddCard, canDropCard } = useSelector(
    state => {
      const isEditModeEnabled = selectors.selectIsEditModeEnabled(state); // TODO: move out?

      const boardMembership =
        selectors.selectCurrentUserMembershipForCurrentBoard(state);
      const isEditor =
        !!boardMembership &&
        boardMembership.role === BoardMembershipRoles.EDITOR;

      return {
        canEdit: isEditModeEnabled && isEditor,
        canArchiveCards: list.type === ListTypes.CLOSED && isEditor,
        canAddCard: isEditor,
        canDropCard: isEditor,
      };
    },
    shallowEqual
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isEditNameOpened, setIsEditNameOpened] = useState(false);
  const [isAddCardOpened, setIsAddCardOpened] = useState(false);
  const [fileDropTarget, setFileDropTarget] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const wrapperRef = useRef(null);
  const cardsWrapperRef = useRef(null);

  const handleCardCreate = useCallback(
    (data, autoOpen, userIds = [], labelIds = []) => {
      console.log('🔥 List.jsx handleCardCreate:', { data, autoOpen, userIds, labelIds });
      dispatch(entryActions.createCard(id, data, autoOpen, userIds, labelIds));
    },
    [id, dispatch]
  );

  const handleCardCreateWithAttachment = useCallback(
    (cardData, attachmentFile) => {
      dispatch(
        entryActions.createCardWithAttachment(id, cardData, attachmentFile)
      );
    },
    [id, dispatch]
  );

  const handleHeaderClick = useCallback(() => {
    if (list.isPersisted && canEdit) {
      setIsEditNameOpened(true);
    }
  }, [list.isPersisted, canEdit]);

  const handleAddCardClick = useCallback(() => {
    setIsAddCardOpened(true);
  }, []);

  const handleAddCardClose = useCallback(() => {
    setIsAddCardOpened(false);
  }, []);

  const handleCardAdd = useCallback(() => {
    setIsAddCardOpened(true);
  }, []);

  const handleNameEdit = useCallback(() => {
    setIsEditNameOpened(true);
  }, []);

  const handleEditNameClose = useCallback(() => {
    setIsEditNameOpened(false);
  }, []);

  const resetFileDropState = useCallback(() => {
    setFileDropTarget(null);
  }, []);

  const handleNewCardFiles = useCallback(
    async files => {
      const processedFiles = processSupportedFiles(handleAttachmentFiles(files, { t }));
      if (processedFiles.length === 0) return;

      setIsProcessing(true);
      setProcessingProgress({ current: 0, total: processedFiles.length });

      try {
        for (let i = 0; i < processedFiles.length; i += 1) {
          const fileData = processedFiles[i];
          const cardData = buildProjectCardDataFromFile(fileData);

          setProcessingProgress({ current: i + 1, total: processedFiles.length });
          dispatch(entryActions.createCardWithAttachment(id, cardData, fileData.file));

          if (i < processedFiles.length - 1) {
            await new Promise((resolve) => {
              setTimeout(resolve, 100);
            });
          }
        }
      } finally {
        setIsProcessing(false);
        setProcessingProgress({ current: 0, total: 0 });
      }
    },
    [dispatch, id, t],
  );

  const handleFileDragOverCapture = useCallback(event => {
    if (!event.dataTransfer?.types?.includes('Files')) {
      return;
    }

    event.preventDefault();
    setFileDropTarget(getFileDropTarget(event.target));
  }, []);

  const handleFileDragLeaveCapture = useCallback(
    event => {
      if (!event.dataTransfer?.types?.includes('Files')) {
        return;
      }

      if (!event.currentTarget.contains(event.relatedTarget)) {
        resetFileDropState();
      }
    },
    [resetFileDropState],
  );

  const handleFileDropCapture = useCallback(
    async event => {
      if (!event.dataTransfer?.types?.includes('Files')) {
        return;
      }

      event.preventDefault();

      const target = getFileDropTarget(event.target);
      const cardId = getCardIdFromFileDropTarget(target);
      const files = Array.from(event.dataTransfer.files);

      resetFileDropState();

      if (cardId) {
        event.stopPropagation();
        handleAttachmentFiles(files, {
          onAccepted: (file) => {
            dispatch(
              entryActions.createAttachment(cardId, {
                file,
                name: file.name,
                type: AttachmentTypes.FILE,
              }),
            );
          },
          t,
        });

        return;
      }

      if (target === NEW_CARD_FILE_DROP_TARGET && !isAddCardOpened) {
        event.stopPropagation();
        await handleNewCardFiles(files);
      }
    },
    [dispatch, handleNewCardFiles, isAddCardOpened, resetFileDropState, t],
  );

  useEffect(() => {
    window.addEventListener('blur', resetFileDropState);
    window.addEventListener('dragend', resetFileDropState);
    window.addEventListener('drop', resetFileDropState);

    return () => {
      window.removeEventListener('blur', resetFileDropState);
      window.removeEventListener('dragend', resetFileDropState);
      window.removeEventListener('drop', resetFileDropState);
    };
  }, [resetFileDropState]);

  const handleWrapperTransitionEnd = useTransitioning(
    wrapperRef,
    styles.outerWrapperTransitioning,
    [isFavoritesActive]
  );

  useDidUpdate(() => {
    if (isAddCardOpened) {
      cardsWrapperRef.current.scrollTop = cardsWrapperRef.current.scrollHeight;
    }
  }, [cardIds, isAddCardOpened]);

  const ActionsPopup = usePopup(ActionsStep);
  const ArchiveCardsPopup = usePopup(ArchiveCardsStep);

  const cardsNode = (
    <Droppable
      droppableId={`list:${id}`}
      type={DroppableTypes.CARD}
      isDropDisabled={!list.isPersisted || !canDropCard}
    >
      {({ innerRef, droppableProps, placeholder }) => (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <div {...droppableProps} ref={innerRef}>
          <div className={styles.cards}>
            {cardIds.map((cardId, cardIndex) => (
              <DraggableCard
                key={cardId}
                id={cardId}
                index={cardIndex}
                className={styles.card}
                isFileDragOver={fileDropTarget === `card:${cardId}`}
              />
            ))}
            {placeholder}
            {canAddCard && (
              <AddCard
                isOpened={isAddCardOpened}
                className={styles.addCard}
                isFileDragOver={fileDropTarget === NEW_CARD_FILE_DROP_TARGET}
                onCreate={handleCardCreate}
                onCreateWithAttachment={handleCardCreateWithAttachment}
                onClose={handleAddCardClose}
              />
            )}
          </div>
        </div>
      )}
    </Droppable>
  );

  return (
    <Draggable
      draggableId={`list:${id}`}
      index={index}
      isDragDisabled={!list.isPersisted || !canEdit || isEditNameOpened}
    >
      {({ innerRef, draggableProps, dragHandleProps }) => (
        <div
          {...draggableProps} // eslint-disable-line react/jsx-props-no-spreading
          data-drag-scroller
          ref={innerRef}
          className={styles.innerWrapper}
        >
          <div
            ref={wrapperRef}
            data-file-drop-target={NEW_CARD_FILE_DROP_TARGET}
            className={classNames(
              styles.outerWrapper,
              list.color &&
                globalStyles[
                  `background${upperFirst(camelCase(list.color))}`
                ],
              list.color &&
                LIGHT_LIST_COLORS.has(list.color) &&
                styles.outerWrapperLight,
              isFavoritesActive && styles.outerWrapperWithFavorites,
              !!fileDropTarget && styles.outerWrapperFileDragOver
            )}
            onTransitionEnd={handleWrapperTransitionEnd}
            onDragEnterCapture={canAddCard ? handleFileDragOverCapture : undefined}
            onDragOverCapture={canAddCard ? handleFileDragOverCapture : undefined}
            onDragLeaveCapture={canAddCard ? handleFileDragLeaveCapture : undefined}
            onDropCapture={canAddCard ? handleFileDropCapture : undefined}
          >
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                         jsx-a11y/no-static-element-interactions */}
            <div
              {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
              className={classNames(
                styles.header,
                canEdit && styles.headerEditable
              )}
              onClick={handleHeaderClick}
            >
              {isEditNameOpened ? (
                <EditName listId={id} onClose={handleEditNameClose} />
              ) : (
                <div className={styles.headerContent}>
                  <div className={styles.headerName}>{list.name}</div>
                </div>
              )}
              {list.type !== ListTypes.ACTIVE && (
                <Icon
                  name={ListTypeIcons[list.type]}
                  className={classNames(
                    styles.headerIcon,
                    list.isPersisted &&
                      (canEdit || canArchiveCards) &&
                      styles.headerIconHidable
                  )}
                />
              )}
              {list.isPersisted &&
                (canEdit ? (
                  <ActionsPopup
                    listId={id}
                    onNameEdit={handleNameEdit}
                    onCardAdd={handleCardAdd}
                  >
                    <Button variant="secondary" className={styles.headerButton}>
                      <Icon fitted name="ellipsis horizontal" size="small" />
                    </Button>
                  </ActionsPopup>
                ) : (
                  canArchiveCards && (
                    <ArchiveCardsPopup listId={id}>
                      <Button variant="secondary" className={styles.headerButton}>
                        <Icon fitted name="archive" size="small" />
                      </Button>
                    </ArchiveCardsPopup>
                  )
                ))}
            </div>
            <div ref={cardsWrapperRef} className={styles.cardsInnerWrapper}>
              <div className={styles.cardsOuterWrapper}>{cardsNode}</div>
            </div>
            {!isAddCardOpened && canAddCard && (
              <button
                type="button"
                disabled={!list.isPersisted || isProcessing}
                className={classNames(
                  styles.addCardButton,
                  fileDropTarget === NEW_CARD_FILE_DROP_TARGET && styles.addCardButtonDragOver,
                  isProcessing && styles.addCardButtonProcessing
                )}
                onClick={handleAddCardClick}
              >
                <PlusMathIcon className={styles.addCardButtonIcon} />
                <span className={styles.addCardButtonText}>
                  {fileDropTarget === NEW_CARD_FILE_DROP_TARGET
                    ? t('common.dropFilesHere')
                    : isProcessing
                      ? t('common.processingFiles')
                      : cardIds.length > 0
                        ? t('action.addAnotherCard')
                        : t('action.addCard')}
                </span>
                                 {isProcessing && (
                   <div className={styles.processingOverlay}>
                     <Icon name="spinner" loading size="large" />
                     <span>
                       {processingProgress.total > 1
                         ? `${t('common.processingFiles')} (${processingProgress.current}/${processingProgress.total})`
                         : t('common.processingFiles')
                       }
                     </span>
                   </div>
                 )}
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});

List.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
};

export default List;
