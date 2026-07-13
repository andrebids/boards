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

  const canAddList = useSelector(state => {
    const isEditModeEnabled = selectors.selectIsEditModeEnabled(state); // TODO: move out?

    if (!isEditModeEnabled) {
      return isEditModeEnabled;
    }

    const boardMembership =
      selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return (
      !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR
    );
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isAddListOpened, setIsAddListOpened] = useState(false);
  const [isFileDragOverAddList, setIsFileDragOverAddList] = useState(false);

  const wrapperRef = useRef(null);
  const prevPositionRef = useRef(null);

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

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const id = parseDndId(draggableId);

      switch (type) {
        case DroppableTypes.LIST:
          dispatch(entryActions.moveList(id, destination.index));

          break;
        case DroppableTypes.CARD:
          dispatch(
            entryActions.moveCard(
              id,
              parseDndId(destination.droppableId),
              destination.index
            )
          );

          break;
        default:
      }
    },
    [dispatch]
  );

  const handleAddListClick = useCallback(() => {
    setIsAddListOpened(true);
  }, []);

  const handleAddListClose = useCallback(() => {
    setIsAddListOpened(false);
  }, []);

  const handleAddListFileDragOver = useCallback(event => {
    if (!event.dataTransfer?.types?.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsFileDragOverAddList(true);
  }, []);

  const handleAddListFileDragLeave = useCallback(event => {
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
    event => {
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
          })
        );
      }
    },
    [dispatch, listIds.length, t]
  );

  const handleMouseDown = useCallback(event => {
    // If button is defined and not equal to 0 (left click)
    if (event.button) {
      return;
    }

    if (
      event.target !== wrapperRef.current &&
      !event.target.dataset.dragScroller
    ) {
      return;
    }

    prevPositionRef.current = event.clientX;

    window.getSelection().removeAllRanges();
    document.body.classList.add(globalStyles.dragScrolling);
  }, []);

  const handleWindowMouseMove = useCallback(event => {
    if (prevPositionRef.current === null) {
      return;
    }

    event.preventDefault();

    window.scrollBy({
      left: prevPositionRef.current - event.clientX,
    });

    prevPositionRef.current = event.clientX;
  }, []);

  const handleWindowMouseRelease = useCallback(() => {
    if (prevPositionRef.current === null) {
      return;
    }

    prevPositionRef.current = null;
    document.body.classList.remove(globalStyles.dragScrolling);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleWindowMouseMove);

    window.addEventListener('mouseup', handleWindowMouseRelease);
    window.addEventListener('blur', handleWindowMouseRelease);
    window.addEventListener('contextmenu', handleWindowMouseRelease);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);

      window.removeEventListener('mouseup', handleWindowMouseRelease);
      window.removeEventListener('blur', handleWindowMouseRelease);
      window.removeEventListener('contextmenu', handleWindowMouseRelease);
    };
  }, [handleWindowMouseMove, handleWindowMouseRelease]);

  useDidUpdate(() => {
    if (isAddListOpened) {
      window.scroll(document.body.scrollWidth, 0);
    }
  }, [listIds, isAddListOpened]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${
        isTimelinePanelExpanded
          ? styles.timelinePanelExpanded
          : styles.timelinePanelCollapsed
      }`}
      onMouseDown={handleMouseDown}
    >
      <div>
        <DragDropContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Droppable
            droppableId="board"
            type={DroppableTypes.LIST}
            direction="horizontal"
          >
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
                          {listIds.length > 0
                            ? t('action.addAnotherList')
                            : t('action.addList')}
                        </span>
                      </button>
                    )}
                    {isFileDragOverAddList && (
                      <div className={styles.addListDropOverlay}>
                        {t('common.dropFilesHere')}
                      </div>
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
});

export default KanbanContent;
