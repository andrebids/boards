/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { Button } from '../../../lib/custom-ui';
import { push } from '../../../lib/redux-router';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import Paths from '../../../constants/Paths';
import {
  AttachmentTypes,
  BoardMembershipRoles,
  CardTypes,
  ListTypes,
} from '../../../constants/Enums';
import handleAttachmentFiles, { hasPendingAttachment } from '../../../utils/attachment-upload';
import ProjectContent from './ProjectContent';
import StoryContent from './StoryContent';
import InlineContent from './InlineContent';
import EditName from './EditName';
import ActionsStep from './ActionsStep';

import styles from './Card.module.scss';
import globalStyles from '../../../styles.module.scss';

const Card = React.memo(({ id, isInline, isFileDragOver: isFileDragOverProp }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectIsCardWithIdRecent = useMemo(
    () => selectors.makeSelectIsCardWithIdRecent(),
    []
  );
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectAttachmentsForCard = useMemo(() => selectors.makeSelectAttachmentsForCard(), []);

  const card = useSelector(state => selectCardById(state, id));
  const list = useSelector(state => selectListById(state, card.listId));
  const isAttachmentUploading = useSelector((state) =>
    hasPendingAttachment(selectAttachmentsForCard(state, id)),
  );

  const isHighlightedAsRecent = useSelector(state => {
    const { turnOffRecentCardHighlighting } =
      selectors.selectCurrentUser(state);

    if (turnOffRecentCardHighlighting) {
      return false;
    }

    return selectIsCardWithIdRecent(state, id);
  });

  const canUseActions = useSelector(state => {
    const boardMembership =
      selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return (
      !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR
    );
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isEditNameOpened, setIsEditNameOpened] = useState(false);
  const [isLocalFileDragOver, setIsLocalFileDragOver] = useState(false);
  const isFileDragOverControlled = typeof isFileDragOverProp === 'boolean';
  const isFileDragOver = isFileDragOverControlled
    ? isFileDragOverProp
    : isLocalFileDragOver;

  const handleClick = useCallback(() => {
    if (document.activeElement) {
      document.activeElement.blur();
    }

    dispatch(push(Paths.CARDS.replace(':id', id)));
  }, [id, dispatch]);

  const handleNameEdit = useCallback(() => {
    setIsEditNameOpened(true);
  }, []);

  const handleEditNameClose = useCallback(() => {
    setIsEditNameOpened(false);
  }, []);

  const handleFileDragOver = useCallback(
    event => {
      if (
        isFileDragOverControlled ||
        !canUseActions ||
        !event.dataTransfer?.types?.includes('Files')
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsLocalFileDragOver(true);
    },
    [canUseActions, isFileDragOverControlled]
  );

  const handleFileDragLeave = useCallback(
    event => {
      if (isFileDragOverControlled || !event.dataTransfer?.types?.includes('Files')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!event.currentTarget.contains(event.relatedTarget)) {
        setIsLocalFileDragOver(false);
      }
    },
    [isFileDragOverControlled],
  );

  const handleFileDrop = useCallback(
    event => {
      if (
        isFileDragOverControlled ||
        !canUseActions ||
        !event.dataTransfer?.types?.includes('Files')
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsLocalFileDragOver(false);

      handleAttachmentFiles(event.dataTransfer.files, {
        onAccepted: (file) => {
          dispatch(
            entryActions.createAttachment(id, {
              file,
              type: AttachmentTypes.FILE,
              name: file.name,
            }),
          );
        },
        t,
      });
    },
    [canUseActions, dispatch, id, isFileDragOverControlled, t]
  );

  const ActionsPopup = usePopup(ActionsStep, { variantClass: 'notifications' });

  if (isEditNameOpened) {
    return <EditName cardId={id} onClose={handleEditNameClose} />;
  }

  let Content;
  if (isInline) {
    Content = InlineContent;
  } else {
    switch (card.type) {
      case CardTypes.PROJECT:
        Content = ProjectContent;

        break;
      case CardTypes.STORY:
        Content = StoryContent;

        break;
      default:
        Content = InlineContent;
    }
  }

  return (
    <div
      data-file-drop-target={`card:${id}`}
      className={classNames(
        styles.wrapper,
        !isInline && card.type === CardTypes.STORY && styles.wrapperStory,
        isHighlightedAsRecent && styles.wrapperRecent,
        isFileDragOver && styles.wrapperFileDragOver,
        'card'
      )}
      onDragEnter={isFileDragOverControlled ? undefined : handleFileDragOver}
      onDragOver={isFileDragOverControlled ? undefined : handleFileDragOver}
      onDragLeave={isFileDragOverControlled ? undefined : handleFileDragLeave}
      onDrop={isFileDragOverControlled ? undefined : handleFileDrop}
    >
      {isFileDragOver && (
        <div className={styles.fileDropOverlay}>{t('common.dropFileToUpload')}</div>
      )}
      {isAttachmentUploading && !isFileDragOver && (
        <span role="status" aria-label={t('common.loading')} className={styles.uploadIndicator}>
          <Icon fitted loading name="spinner" />
        </span>
      )}
      {card.isPersisted ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                       jsx-a11y/no-static-element-interactions */}
          <div
            className={classNames(
              styles.content,
              list.type === ListTypes.CLOSED && styles.contentDisabled
            )}
            onClick={handleClick}
          >
            <Content cardId={id} />
          </div>
          {canUseActions && (
            <ActionsPopup cardId={id} onNameEdit={handleNameEdit}>
              <span className={styles.actionsTrigger}>
                <Button
                  variant="secondary"
                  aria-label={t('action.edit')}
                  title={t('action.edit')}
                  className={styles.actionsButton}
                >
                  <Icon fitted name="pencil" size="small" />
                </Button>
              </span>
            </ActionsPopup>
          )}
        </>
      ) : (
        <span
          className={classNames(
            styles.content,
            list.type === ListTypes.CLOSED && styles.contentDisabled
          )}
        >
          <Content cardId={id} />
        </span>
      )}
    </div>
  );
});

Card.propTypes = {
  id: PropTypes.string.isRequired,
  isFileDragOver: PropTypes.bool,
  isInline: PropTypes.bool,
};

Card.defaultProps = {
  isFileDragOver: undefined,
  isInline: false,
};

export default Card;
