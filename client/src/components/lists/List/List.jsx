/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { Button, Icon } from 'semantic-ui-react';
import { useDidUpdate, useTransitioning } from '../../../lib/hooks';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import DroppableTypes from '../../../constants/DroppableTypes';
import { BoardMembershipRoles, ListTypes } from '../../../constants/Enums';
import { ListTypeIcons } from '../../../constants/Icons';
import EditName from './EditName';
import ActionsStep from './ActionsStep';
import DraggableCard from '../../cards/DraggableCard';
import AddCard from '../../cards/AddCard';
import ArchiveCardsStep from '../../cards/ArchiveCardsStep';
import PlusMathIcon from '../../../assets/images/plus-math-icon.svg?react';
import { processSupportedFiles } from '../../../utils/file-helpers';

import styles from './List.module.scss';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [dragFileCount, setDragFileCount] = useState(0);

  const wrapperRef = useRef(null);
  const cardsWrapperRef = useRef(null);

  const handleCardCreate = useCallback(
    (data, autoOpen) => {
      dispatch(entryActions.createCard(id, data, autoOpen));
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

    const handleDragOver = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();

    // Verificar se há arquivos sendo arrastados
    if (event.dataTransfer && event.dataTransfer.types && event.dataTransfer.types.includes('Files')) {
      const fileCount = event.dataTransfer.files.length;
      console.log(`📁 Arrastando ${fileCount} arquivo(s)`);
      setDragFileCount(fileCount);
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();

    // Só remove o estado de drag se realmente sair da área
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
      setDragFileCount(0);
    }
  }, []);

  const handleDrop = useCallback(
    async event => {
      event.preventDefault();
      setIsDragOver(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      const processedFiles = processSupportedFiles(files);
      if (processedFiles.length === 0) return;

      console.log('Processando arquivos:', processedFiles);

      setIsProcessing(true);
      setProcessingProgress({ current: 0, total: processedFiles.length });

      try {
        // Processar arquivos sequencialmente para melhor controle
        for (let i = 0; i < processedFiles.length; i++) {
          const fileData = processedFiles[i];
          const cardData = {
            name: fileData.name,
            type: 'story', // Adicionar tipo padrão
          };

          console.log(`🎴 Criando card ${i + 1}/${processedFiles.length}:`, cardData);
          console.log(
            '📄 Tipo de arquivo:',
            fileData.isImage ? 'Imagem (capa)' : 'Anexo'
          );
          console.log('📄 Arquivo:', fileData.file);
          console.log(
            '📄 Nome do arquivo:',
            fileData.file ? fileData.file.name : 'undefined'
          );
          console.log(
            '📄 Tamanho do arquivo:',
            fileData.file ? fileData.file.size : 'undefined'
          );

          // Atualizar progresso
          setProcessingProgress({ current: i + 1, total: processedFiles.length });

          dispatch(
            entryActions.createCardWithAttachment(id, cardData, fileData.file)
          );

          // Pequena pausa entre criações para evitar sobrecarga
          if (i < processedFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error('Erro ao processar arquivos:', error);
      } finally {
        setIsProcessing(false);
        setProcessingProgress({ current: 0, total: 0 });
        console.log('✅ Processamento finalizado');
      }
    },
    [id, dispatch]
  );

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
              />
            ))}
            {placeholder}
            {canAddCard && (
              <AddCard
                isOpened={isAddCardOpened}
                className={styles.addCard}
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
            className={classNames(
              styles.outerWrapper,
              list.color &&
                styles[`outerWrapper${upperFirst(camelCase(list.color))}`],
              isFavoritesActive && styles.outerWrapperWithFavorites
            )}
            onTransitionEnd={handleWrapperTransitionEnd}
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
                <div className={styles.headerName}>{list.name}</div>
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
                    <Button className={styles.headerButton}>
                      <Icon fitted name="pencil" size="small" />
                    </Button>
                  </ActionsPopup>
                ) : (
                  canArchiveCards && (
                    <ArchiveCardsPopup listId={id}>
                      <Button className={styles.headerButton}>
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
                  list.color &&
                    styles[`addCardButton${upperFirst(camelCase(list.color))}`],
                  isDragOver && styles.addCardButtonDragOver,
                  isProcessing && styles.addCardButtonProcessing
                )}
                onClick={handleAddCardClick}
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <PlusMathIcon className={styles.addCardButtonIcon} />
                <span className={styles.addCardButtonText}>
                  {isDragOver
                    ? t('common.dropFilesHere')
                    : isProcessing
                      ? t('common.processingFiles')
                      : cardIds.length > 0
                        ? t('action.addAnotherCard')
                        : t('action.addCard')}
                </span>
                                 {isDragOver && (
                   <div className={styles.dragOverlay}>
                     <Icon name="upload" size="large" />
                     <span>
                       {dragFileCount > 1
                         ? `${t('common.dropFilesHere')} (${dragFileCount} arquivos)`
                         : t('common.dropFilesHere')
                       }
                     </span>
                   </div>
                 )}
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
