/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useDidUpdate } from '../../../../lib/hooks';
import { closePopup } from '../../../../lib/popup';

import selectors from '../../../../selectors';
import { selectIsTimelinePanelExpanded } from '../../../../selectors/timelinePanelSelectors';
import entryActions from '../../../../entry-actions';
import parseDndId from '../../../../utils/parse-dnd-id';
import DroppableTypes from '../../../../constants/DroppableTypes';
import { BoardMembershipRoles, ListTypes } from '../../../../constants/Enums';
import AddList from './AddList';
import List from '../../../lists/List';
import PlusMathIcon from '../../../../assets/images/plus-math-icon.svg?react';

import styles from './KanbanContent.module.scss';
import globalStyles from '../../../../styles.module.scss';

const KanbanContent = React.memo(() => {
  const listIds = useSelector(selectors.selectFiniteListIdsForCurrentBoard);
  const isTimelinePanelExpanded = useSelector(selectIsTimelinePanelExpanded);

  const canAddList = useSelector((state) => {
    const isEditModeEnabled = selectors.selectIsEditModeEnabled(state); // TODO: move out?

    if (!isEditModeEnabled) {
      return isEditModeEnabled;
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isAddListOpened, setIsAddListOpened] = useState(false);
  const [isFileDragOverAddList, setIsFileDragOverAddList] = useState(false);
  const [isDragScrolling, setIsDragScrolling] = useState(false);
  const [isHorizontallyScrollable, setIsHorizontallyScrollable] = useState(false);

  const wrapperRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const dragPositionRef = useRef(null);

  const handleDragStart = useCallback(() => {
    document.body.classList.add(globalStyles.dragging);
    closePopup();
  }, []);

  const handleDragEnd = useCallback(
    ({ draggableId, type, source, destination }) => {
      document.body.classList.remove(globalStyles.dragging);

      if (!destination) {
        return;
      }

      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

      const id = parseDndId(draggableId);

      switch (type) {
        case DroppableTypes.LIST:
          dispatch(entryActions.moveList(id, destination.index));

          break;
        case DroppableTypes.CARD:
          dispatch(
            entryActions.moveCard(id, parseDndId(destination.droppableId), destination.index),
          );

          break;
        default:
      }
    },
    [dispatch],
  );

  const handleAddListClick = useCallback(() => {
    setIsAddListOpened(true);
  }, []);

  const handleAddListClose = useCallback(() => {
    setIsAddListOpened(false);
  }, []);

  const handleAddListFileDragOver = useCallback((event) => {
    if (!event.dataTransfer?.types?.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsFileDragOverAddList(true);
  }, []);

  const handleAddListFileDragLeave = useCallback((event) => {
    if (!event.dataTransfer?.types?.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsFileDragOverAddList(false);
    }
  }, []);

  const handleAddListFileDrop = useCallback(
    (event) => {
      if (!event.dataTransfer?.types?.includes('Files')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsFileDragOverAddList(false);

      if (event.dataTransfer.files.length > 0) {
        dispatch(
          entryActions.createListInCurrentBoard({
            name: `${t('common.list')} ${listIds.length + 1}`,
            type: ListTypes.ACTIVE,
          }),
        );
      }
    },
    [dispatch, listIds.length, t],
  );

  const updateScrollability = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const isScrollable = scrollContainer.scrollWidth > scrollContainer.clientWidth + 1;

    setIsHorizontallyScrollable((currentValue) =>
      currentValue === isScrollable ? currentValue : isScrollable,
    );
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (event.button !== 0 || !scrollContainerRef.current) {
      return;
    }

    if (event.target !== wrapperRef.current && !event.target.dataset.dragScroller) {
      return;
    }

    dragPositionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scrollContainerRef.current.scrollLeft,
    };

    window.getSelection().removeAllRanges();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragScrolling(true);
  }, []);

  const handlePointerMove = useCallback((event) => {
    const dragPosition = dragPositionRef.current;
    const scrollContainer = scrollContainerRef.current;

    if (!dragPosition || !scrollContainer || dragPosition.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    scrollContainer.scrollLeft = dragPosition.startScrollLeft + dragPosition.startX - event.clientX;
  }, []);

  const handlePointerRelease = useCallback((event) => {
    if (dragPositionRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragPositionRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragScrolling(false);
  }, []);

  const handleWheel = useCallback((event) => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || !event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
      return;
    }

    event.preventDefault();
    scrollContainer.scrollLeft += event.deltaY;
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.target !== event.currentTarget || !scrollContainerRef.current) {
      return;
    }

    let nextScrollLeft;

    switch (event.key) {
      case 'ArrowLeft':
        nextScrollLeft = scrollContainerRef.current.scrollLeft - 96;
        break;
      case 'ArrowRight':
        nextScrollLeft = scrollContainerRef.current.scrollLeft + 96;
        break;
      case 'Home':
        nextScrollLeft = 0;
        break;
      case 'End':
        nextScrollLeft = scrollContainerRef.current.scrollWidth;
        break;
      default:
        return;
    }

    event.preventDefault();
    scrollContainerRef.current.scrollTo({
      left: nextScrollLeft,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const scrollContainer = document.scrollingElement;
    const scrollStyleContainer = wrapperRef.current?.closest('#app');

    if (!scrollContainer || !scrollStyleContainer) {
      return undefined;
    }

    scrollContainerRef.current = scrollContainer;
    scrollStyleContainer.classList.add(styles.kanbanScroll);
    updateScrollability();

    const resizeObserver = new ResizeObserver(updateScrollability);
    resizeObserver.observe(scrollContainer);
    window.addEventListener('resize', updateScrollability);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollability);
      scrollStyleContainer.classList.remove(styles.kanbanScroll);
      scrollContainerRef.current = null;
    };
  }, [updateScrollability]);

  useEffect(() => {
    updateScrollability();
  }, [isTimelinePanelExpanded, listIds, updateScrollability]);

  useDidUpdate(() => {
    if (isAddListOpened) {
      const scrollContainer = scrollContainerRef.current;

      if (scrollContainer) {
        scrollContainer.scrollTo({
          left: scrollContainer.scrollWidth,
          behavior: 'smooth',
        });
      }
    }
  }, [listIds, isAddListOpened]);

  /* A scrollable region is intentionally focusable so keyboard users can pan the board. */
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${
        isHorizontallyScrollable ? styles.wrapperScrollable : ''
      } ${isDragScrolling ? styles.wrapperDragScrolling : ''} ${
        isTimelinePanelExpanded ? styles.timelinePanelExpanded : styles.timelinePanelCollapsed
      }`}
      role="region"
      aria-label={t('common.board')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onWheel={handleWheel}
    >
      <div>
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type={DroppableTypes.LIST} direction="horizontal">
            {({ innerRef, droppableProps, placeholder }) => (
              <div
                {...droppableProps} // eslint-disable-line react/jsx-props-no-spreading
                data-drag-scroller
                ref={innerRef}
                className={styles.lists}
              >
                {listIds.map((listId, index) => (
                  <List key={listId} id={listId} index={index} />
                ))}
                {placeholder}
                {canAddList && (
                  <div
                    data-drag-scroller
                    className={styles.list}
                    onDragEnter={handleAddListFileDragOver}
                    onDragOver={handleAddListFileDragOver}
                    onDragLeave={handleAddListFileDragLeave}
                    onDrop={handleAddListFileDrop}
                  >
                    {isAddListOpened ? (
                      <AddList onClose={handleAddListClose} />
                    ) : (
                      <button
                        type="button"
                        className={styles.addListButton}
                        onClick={handleAddListClick}
                      >
                        <PlusMathIcon className={styles.addListButtonIcon} />
                        <span className={styles.addListButtonText}>
                          {listIds.length > 0 ? t('action.addAnotherList') : t('action.addList')}
                        </span>
                      </button>
                    )}
                    {isFileDragOverAddList && (
                      <div className={styles.addListDropOverlay}>{t('common.dropFilesHere')}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
});

export default KanbanContent;
