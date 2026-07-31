/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { Button } from '../../../lib/custom-ui';
import { useDidUpdate } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import { startStopwatch, stopStopwatch } from '../../../utils/stopwatch';
import { isUsableMarkdownElement } from '../../../utils/element-helpers';
import { BoardMembershipRoles, CardTypes, ListTypes } from '../../../constants/Enums';
import { CardTypeIcons } from '../../../constants/Icons';
import { ClosableContext } from '../../../contexts';
import CardImageCarousel from './CardImageCarousel';
import CardModalLayout, {
  CardModalActionButton,
  CardModalActionGroup,
  CardModalBody,
  CardModalMain,
  CardModalMetadata,
  CardModalMetadataAddButton,
  CardModalMetadataItem,
  CardModalSidebar,
} from './CardModalLayout';
import NameField from './NameField';
import TaskLists from './TaskLists';
import CustomFieldGroups from './CustomFieldGroups';
import Communication from './Communication';
import CreationDetailsStep from './CreationDetailsStep';
import DueDateChip from '../DueDateChip';
import StopwatchChip from '../StopwatchChip';
import SelectCardTypeStep from '../SelectCardTypeStep';
import EditDueDateStep from '../EditDueDateStep';
import EditStopwatchStep from '../EditStopwatchStep';
import MoveCardStep from '../MoveCardStep';
import ExpandableMarkdown from '../../common/ExpandableMarkdown';
import EditMarkdown from '../../common/EditMarkdown';
import ConfirmationStep from '../../common/ConfirmationStep';
import UserAvatar from '../../users/UserAvatar';
import BoardMembershipsStep from '../../board-memberships/BoardMembershipsStep';
import LabelChip from '../../labels/LabelChip';
import LabelsStep from '../../labels/LabelsStep';
import ListsStep from '../../lists/ListsStep';
import AddTaskListStep from '../../task-lists/AddTaskListStep';
import Attachments from '../../attachments/Attachments';
import AddAttachmentStep from '../../attachments/AddAttachmentStep';
import AddCustomFieldGroupStep from '../../custom-field-groups/AddCustomFieldGroupStep';

import styles from './ProjectContent.module.scss';

const ProjectContent = React.memo(({ onClose }) => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectPrevListById = useMemo(() => selectors.makeSelectListById(), []);

  const card = useSelector(selectors.selectCurrentCard);
  const board = useSelector(selectors.selectCurrentBoard);
  const userIds = useSelector(selectors.selectUserIdsForCurrentCard);
  const labelIds = useSelector(selectors.selectLabelIdsForCurrentCard);
  const attachmentIds = useSelector(selectors.selectAttachmentIdsForCurrentCard);

  const isJoined = useSelector(selectors.selectIsCurrentUserInCurrentCard);

  const list = useSelector((state) => selectListById(state, card.listId));

  // TODO: check availability?
  const prevList = useSelector(
    (state) => card.prevListId && selectPrevListById(state, card.prevListId),
  );

  const isInArchiveList = list.type === ListTypes.ARCHIVE;
  const isInTrashList = list.type === ListTypes.TRASH;

  const {
    canEditType,
    canEditName,
    canEditDescription,
    canEditDueDate,
    canEditStopwatch,
    canSubscribe,
    canJoin,
    canDuplicate,
    canMove,
    canRestore,
    canArchive,
    canDelete,
    canUseLists,
    canUseMembers,
    canUseLabels,
    canAddTaskList,
    canAddAttachment,
    canAddCustomFieldGroup,
  } = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);

    let isMember = false;
    let isEditor = false;

    if (boardMembership) {
      isMember = true;
      isEditor = boardMembership.role === BoardMembershipRoles.EDITOR;
    }

    if (isInArchiveList || isInTrashList) {
      return {
        canEditType: false,
        canEditName: false,
        canEditDescription: false,
        canEditDueDate: false,
        canEditStopwatch: false,
        canSubscribe: isMember,
        canJoin: false,
        canDuplicate: false,
        canMove: false,
        canRestore: isEditor,
        canArchive: isEditor,
        canDelete: isEditor,
        canUseLists: isEditor,
        canUseMembers: false,
        canUseLabels: false,
        canAddTaskList: false,
        canAddAttachment: false,
        canAddCustomFieldGroup: false,
      };
    }

    return {
      canEditType: isEditor,
      canEditName: isEditor,
      canEditDescription: isEditor,
      canEditDueDate: isEditor,
      canEditStopwatch: isEditor,
      canSubscribe: isMember,
      canJoin: isEditor,
      canDuplicate: isEditor,
      canMove: isEditor,
      canRestore: null,
      canArchive: isEditor,
      canDelete: isEditor,
      canUseLists: isEditor,
      canUseMembers: isEditor,
      canUseLabels: isEditor,
      canAddTaskList: isEditor,
      canAddAttachment: isEditor,
      canAddCustomFieldGroup: isEditor,
    };
  }, shallowEqual);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [descriptionDraft, setDescriptionDraft] = useState(null);
  const [isEditDescriptionOpened, setIsEditDescriptionOpened] = useState(false);
  const [, , setIsClosableActive] = useContext(ClosableContext);

  const handleListSelect = useCallback(
    (listId) => {
      dispatch(entryActions.moveCurrentCard(listId));
    },
    [dispatch],
  );

  const handleTypeSelect = useCallback(
    (type) => {
      dispatch(
        entryActions.updateCurrentCard({
          type,
        }),
      );
    },
    [dispatch],
  );

  const handleNameUpdate = useCallback(
    (name) => {
      dispatch(
        entryActions.updateCurrentCard({
          name,
        }),
      );
    },
    [dispatch],
  );

  const handleDescriptionUpdate = useCallback(
    (description) => {
      dispatch(
        entryActions.updateCurrentCard({
          description,
        }),
      );
    },
    [dispatch],
  );

  const handleToggleStopwatchClick = useCallback(() => {
    dispatch(
      entryActions.updateCurrentCard({
        stopwatch: card.stopwatch.startedAt
          ? stopStopwatch(card.stopwatch)
          : startStopwatch(card.stopwatch),
      }),
    );
  }, [card.stopwatch, dispatch]);

  const handleDuplicateClick = useCallback(() => {
    dispatch(
      entryActions.duplicateCurrentCard({
        name: `${card.name} (${t('common.copy', {
          context: 'inline',
        })})`,
      }),
    );

    onClose();
  }, [onClose, card.name, dispatch, t]);

  const handleRestoreClick = useCallback(() => {
    dispatch(entryActions.moveCurrentCard(card.prevListId, undefined, true));
  }, [card.prevListId, dispatch]);

  const handleArchiveConfirm = useCallback(() => {
    dispatch(entryActions.moveCurrentCardToArchive());
  }, [dispatch]);

  const handleDeleteConfirm = useCallback(() => {
    if (isInTrashList) {
      dispatch(entryActions.deleteCurrentCard());
    } else {
      dispatch(entryActions.moveCurrentCardToTrash());
    }
  }, [isInTrashList, dispatch]);

  const handleUserSelect = useCallback(
    (userId) => {
      dispatch(entryActions.addUserToCurrentCard(userId));
    },
    [dispatch],
  );

  const handleUserDeselect = useCallback(
    (userId) => {
      dispatch(entryActions.removeUserFromCurrentCard(userId));
    },
    [dispatch],
  );

  const handleLabelSelect = useCallback(
    (labelId) => {
      dispatch(entryActions.addLabelToCurrentCard(labelId));
    },
    [dispatch],
  );

  const handleLabelDeselect = useCallback(
    (labelId) => {
      dispatch(entryActions.removeLabelFromCurrentCard(labelId));
    },
    [dispatch],
  );

  const handleCustomFieldGroupCreate = useCallback(
    (data) => {
      dispatch(entryActions.createCustomFieldGroupInCurrentCard(data));
    },
    [dispatch],
  );

  const handleToggleJointClick = useCallback(() => {
    if (isJoined) {
      dispatch(entryActions.removeCurrentUserFromCurrentCard());
    } else {
      dispatch(entryActions.addCurrentUserToCurrentCard());
    }
  }, [isJoined, dispatch]);

  const handleToggleSubscriptionClick = useCallback(() => {
    dispatch(
      entryActions.updateCurrentCard({
        isSubscribed: !card.isSubscribed,
      }),
    );
  }, [card.isSubscribed, dispatch]);

  const handleEditDescriptionClick = useCallback((event) => {
    if (window.getSelection().toString() || isUsableMarkdownElement(event.target)) {
      return;
    }

    setIsEditDescriptionOpened(true);
  }, []);

  const handleEditDescriptionClose = useCallback((nextDescriptionDraft) => {
    setDescriptionDraft(nextDescriptionDraft);
    setIsEditDescriptionOpened(false);
  }, []);

  useDidUpdate(() => {
    if (!canEditDescription) {
      setIsEditDescriptionOpened(false);
    }
  }, [canEditDescription]);

  useDidUpdate(() => {
    setIsClosableActive(isEditDescriptionOpened);
  }, [isEditDescriptionOpened]);

  const CreationDetailsPopup = usePopupInClosableContext(CreationDetailsStep);
  const BoardMembershipsPopup = usePopupInClosableContext(BoardMembershipsStep);
  const LabelsPopup = usePopupInClosableContext(LabelsStep);
  const ListsPopup = usePopupInClosableContext(ListsStep);
  const SelectCardTypePopup = usePopupInClosableContext(SelectCardTypeStep);
  const EditDueDatePopup = usePopupInClosableContext(EditDueDateStep);
  const EditStopwatchPopup = usePopupInClosableContext(EditStopwatchStep);
  const AddTaskListPopup = usePopupInClosableContext(AddTaskListStep);
  const AddAttachmentPopup = usePopupInClosableContext(AddAttachmentStep);
  const AddCustomFieldGroupPopup = usePopupInClosableContext(AddCustomFieldGroupStep);
  const MoveCardPopup = usePopupInClosableContext(MoveCardStep);
  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  return (
    <CardModalLayout
      icon={CardTypeIcons[CardTypes.PROJECT]}
      title={
        canEditName ? (
          <NameField defaultValue={card.name} onUpdate={handleNameUpdate} />
        ) : (
          card.name
        )
      }
    >
      <CardModalMetadata>
        {board.alwaysDisplayCardCreator && (
          <CardModalMetadataItem
            label={t('common.creator', {
                context: 'title',
            })}
          >
            <CreationDetailsPopup userId={card.creatorUserId}>
              <UserAvatar withCreatorIndicator id={card.creatorUserId} />
            </CreationDetailsPopup>
          </CardModalMetadataItem>
        )}
        {userIds.length > 0 && (
          <CardModalMetadataItem
            label={t('common.members', {
                context: 'title',
            })}
          >
            {userIds.map((userId) => (
              <span key={userId}>
                {canUseMembers ? (
                  <BoardMembershipsPopup
                    currentUserIds={userIds}
                    onUserSelect={handleUserSelect}
                    onUserDeselect={handleUserDeselect}
                  >
                    <UserAvatar id={userId} />
                  </BoardMembershipsPopup>
                ) : (
                  <UserAvatar id={userId} />
                )}
              </span>
            ))}
            {canUseMembers && (
              <BoardMembershipsPopup
                currentUserIds={userIds}
                onUserSelect={handleUserSelect}
                onUserDeselect={handleUserDeselect}
              >
                <CardModalMetadataAddButton
                  circular
                  ariaLabel={t('action.addMember')}
                  icon="add user"
                />
              </BoardMembershipsPopup>
            )}
          </CardModalMetadataItem>
        )}
        {labelIds.length > 0 && (
          <CardModalMetadataItem
            label={t('common.labels', {
                context: 'title',
            })}
          >
            {labelIds.map((labelId) => (
              <span key={labelId}>
                {canUseLabels ? (
                  <LabelsPopup
                    currentIds={labelIds}
                    cardId={card.id}
                    onSelect={handleLabelSelect}
                    onDeselect={handleLabelDeselect}
                  >
                    <LabelChip id={labelId} />
                  </LabelsPopup>
                ) : (
                  <LabelChip id={labelId} />
                )}
              </span>
            ))}
            {canUseLabels && (
              <LabelsPopup
                currentIds={labelIds}
                cardId={card.id}
                onSelect={handleLabelSelect}
                onDeselect={handleLabelDeselect}
              >
                <CardModalMetadataAddButton ariaLabel={t('action.addLabel')} />
              </LabelsPopup>
            )}
          </CardModalMetadataItem>
        )}
        {card.dueDate && (
          <CardModalMetadataItem
            label={t('common.dueDate', {
                context: 'title',
            })}
          >
            {canEditDueDate ? (
              <EditDueDatePopup cardId={card.id}>
                <DueDateChip
                  withStatusIcon
                  value={card.dueDate}
                  withStatus={
                    list.type !== ListTypes.CLOSED && !isInArchiveList && !isInTrashList
                  }
                />
              </EditDueDatePopup>
            ) : (
              <DueDateChip
                withStatusIcon
                value={card.dueDate}
                withStatus={list.type !== ListTypes.CLOSED && !isInArchiveList && !isInTrashList}
              />
            )}
          </CardModalMetadataItem>
        )}
        {card.stopwatch && (
          <CardModalMetadataItem
            label={t('common.stopwatch', {
                context: 'title',
            })}
          >
            {canEditStopwatch ? (
              <EditStopwatchPopup cardId={card.id}>
                <StopwatchChip value={card.stopwatch} />
              </EditStopwatchPopup>
            ) : (
              <StopwatchChip value={card.stopwatch} />
            )}
            {canEditStopwatch && (
              <CardModalMetadataAddButton
                ariaLabel={t('common.stopwatch')}
                icon={card.stopwatch.startedAt ? 'pause' : 'play'}
                onClick={handleToggleStopwatchClick}
              />
            )}
          </CardModalMetadataItem>
        )}
        <CardModalMetadataItem label={t('common.list')}>
          {canUseLists ? (
            <ListsPopup currentId={list.id} onSelect={handleListSelect}>
              <button type="button" className={styles.listButton}>
                <span className={classNames(styles.list, styles.listHoverable)}>
                  <Icon name="columns" size="small" className={styles.listIcon} />
                  <span className={styles.hidable}>{list.name || t(`common.${list.type}`)}</span>
                </span>
              </button>
            </ListsPopup>
          ) : (
            <span className={styles.list}>
              <Icon name="columns" size="small" className={styles.listIcon} />
              <span className={styles.hidable}>{list.name || t(`common.${list.type}`)}</span>
            </span>
          )}
        </CardModalMetadataItem>
      </CardModalMetadata>
      <CardModalBody>
        <CardModalMain>
          <CardImageCarousel />
          {(card.description || canEditDescription) && (
            <div className={classNames(styles.contentModule, styles.contentModuleDescription)}>
              <div className={styles.moduleWrapper}>
                <Icon name="align left" className={styles.moduleIcon} />
                <div className={styles.moduleHeader}>
                  {t('common.description')}
                  {canEditDescription && !isEditDescriptionOpened && descriptionDraft && (
                    <span className={styles.draftChip}>{t('common.unsavedChanges')}</span>
                  )}
                </div>
                {canEditDescription && (
                  <>
                    {isEditDescriptionOpened && (
                      <EditMarkdown
                        defaultValue={card.description}
                        draftValue={descriptionDraft}
                        placeholder="common.enterDescription"
                        onUpdate={handleDescriptionUpdate}
                        onClose={handleEditDescriptionClose}
                      />
                    )}
                    {!isEditDescriptionOpened &&
                      (card.description ? (
                        /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                                    jsx-a11y/no-static-element-interactions */
                        <div className={styles.cursorPointer} onClick={handleEditDescriptionClick}>
                          <Button
                            variant="secondary"
                            aria-label={t('action.editDescription', {
                              context: 'title',
                            })}
                            isIconOnly
                            className={styles.editButton}
                          >
                            <Icon fitted name="pencil" size="small" />
                          </Button>
                          <ExpandableMarkdown>{card.description}</ExpandableMarkdown>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.descriptionButton}
                          onClick={handleEditDescriptionClick}
                        >
                          <span className={styles.descriptionButtonText}>
                            {t('action.addMoreDetailedDescription')}
                          </span>
                        </button>
                      ))}
                  </>
                )}
                {!canEditDescription && <ExpandableMarkdown>{card.description}</ExpandableMarkdown>}
              </div>
            </div>
          )}
          <CustomFieldGroups />
          <TaskLists />
          {attachmentIds.length > 0 && (
            <div className={styles.contentModule}>
              <div className={styles.moduleWrapper}>
                <Icon name="attach" className={styles.moduleIcon} />
                <div className={styles.moduleHeader}>{t('common.attachments')}</div>
                <Attachments />
              </div>
            </div>
          )}
          <div className={styles.contentModule}>
            <div className={styles.moduleWrapper}>
              <Icon name="list ul" className={styles.moduleIcon} />
              <Communication />
            </div>
          </div>
        </CardModalMain>
        <CardModalSidebar>
          {(canEditDueDate ||
            canEditStopwatch ||
            canUseMembers ||
            canUseLabels ||
            canAddTaskList ||
            canAddAttachment ||
            canAddCustomFieldGroup) && (
            <CardModalActionGroup title={t('action.addToCard')}>
              {canUseMembers && (
                <BoardMembershipsPopup
                  currentUserIds={userIds}
                  onUserSelect={handleUserSelect}
                  onUserDeselect={handleUserDeselect}
                >
                  <CardModalActionButton icon="user outline">
                    {t('common.members')}
                  </CardModalActionButton>
                </BoardMembershipsPopup>
              )}
              {canUseLabels && (
                <LabelsPopup
                  currentIds={labelIds}
                  cardId={card.id}
                  onSelect={handleLabelSelect}
                  onDeselect={handleLabelDeselect}
                >
                  <CardModalActionButton icon="bookmark outline">
                    {t('common.labels')}
                  </CardModalActionButton>
                </LabelsPopup>
              )}
              {canEditDueDate && (
                <EditDueDatePopup cardId={card.id}>
                  <CardModalActionButton icon="calendar check outline">
                    {t('common.dueDate', {
                      context: 'title',
                    })}
                  </CardModalActionButton>
                </EditDueDatePopup>
              )}
              {canEditStopwatch && (
                <EditStopwatchPopup cardId={card.id}>
                  <CardModalActionButton icon="clock outline">
                    {t('common.stopwatch')}
                  </CardModalActionButton>
                </EditStopwatchPopup>
              )}
              {canAddTaskList && (
                <AddTaskListPopup>
                  <CardModalActionButton icon="check square outline">
                    {t('common.taskList', {
                      context: 'title',
                    })}
                  </CardModalActionButton>
                </AddTaskListPopup>
              )}
              {canAddAttachment && (
                <AddAttachmentPopup>
                  <CardModalActionButton icon="attach">
                    {t('common.attachment')}
                  </CardModalActionButton>
                </AddAttachmentPopup>
              )}
              {canAddCustomFieldGroup && (
                <AddCustomFieldGroupPopup onCreate={handleCustomFieldGroupCreate}>
                  <CardModalActionButton icon="sticky note outline">
                    {t('common.customField', {
                      context: 'title',
                    })}
                  </CardModalActionButton>
                </AddCustomFieldGroupPopup>
              )}
            </CardModalActionGroup>
          )}
          {((!board.limitCardTypesToDefaultOne && canEditType) ||
            canSubscribe ||
            canJoin ||
            canDuplicate ||
            canMove ||
            (canRestore && (isInArchiveList || isInTrashList)) ||
            (canArchive && !isInArchiveList) ||
            canDelete) && (
            <CardModalActionGroup title={t('common.actions')}>
              {canJoin && (
                <CardModalActionButton
                  icon={isJoined ? 'flag outline' : 'flag checkered'}
                  onClick={handleToggleJointClick}
                >
                  {isJoined ? t('action.leave') : t('action.join')}
                </CardModalActionButton>
              )}
              {canSubscribe && (
                <CardModalActionButton
                  icon={
                    board.isSubscribed || card.isSubscribed
                      ? 'bell slash outline'
                      : 'bell outline'
                  }
                  disabled={board.isSubscribed}
                  onClick={handleToggleSubscriptionClick}
                >
                  {board.isSubscribed
                    ? t('common.boardSubscribed')
                    : card.isSubscribed
                      ? t('action.unsubscribe')
                      : t('action.subscribe')}
                </CardModalActionButton>
              )}
              {!board.limitCardTypesToDefaultOne && canEditType && (
                <SelectCardTypePopup
                  withButton
                  defaultValue={card.type}
                  title="common.editType"
                  buttonContent="action.save"
                  onSelect={handleTypeSelect}
                >
                  <CardModalActionButton icon="map outline">
                    {t('action.editType', {
                      context: 'title',
                    })}
                  </CardModalActionButton>
                </SelectCardTypePopup>
              )}
              {canDuplicate && (
                <CardModalActionButton
                  icon="copy outline"
                  onClick={handleDuplicateClick}
                >
                  {t('action.duplicate')}
                </CardModalActionButton>
              )}
              {canMove && (
                <MoveCardPopup id={card.id}>
                  <CardModalActionButton icon="share square outline">
                    {t('action.move')}
                  </CardModalActionButton>
                </MoveCardPopup>
              )}
              {canRestore && (isInArchiveList || isInTrashList) && (
                <CardModalActionButton
                  icon="undo alternate"
                  disabled={!prevList}
                  onClick={handleRestoreClick}
                >
                  {prevList
                    ? t('action.restoreToList', {
                        list: prevList.name || t(`common.${prevList.type}`),
                      })
                    : t('common.selectListToRestoreThisCard')}
                </CardModalActionButton>
              )}
              {canArchive && !isInArchiveList && (
                <ConfirmationPopup
                  title="common.archiveCard"
                  content="common.areYouSureYouWantToArchiveThisCard"
                  buttonContent="action.archiveCard"
                  onConfirm={handleArchiveConfirm}
                >
                  <CardModalActionButton icon="folder open outline">
                    {t('action.archive')}
                  </CardModalActionButton>
                </ConfirmationPopup>
              )}
              {canDelete && (
                <ConfirmationPopup
                  title={isInTrashList ? 'common.deleteCardForever' : 'common.deleteCard'}
                  content={
                    isInTrashList
                      ? 'common.areYouSureYouWantToDeleteThisCardForever'
                      : 'common.areYouSureYouWantToDeleteThisCard'
                  }
                  buttonContent={isInTrashList ? 'action.deleteCardForever' : 'action.deleteCard'}
                  onConfirm={handleDeleteConfirm}
                >
                  <CardModalActionButton
                    danger
                    icon="trash alternate outline"
                  >
                    {isInTrashList
                      ? t('action.deleteForever', {
                          context: 'title',
                        })
                      : t('action.delete')}
                  </CardModalActionButton>
                </ConfirmationPopup>
              )}
            </CardModalActionGroup>
          )}
        </CardModalSidebar>
      </CardModalBody>
    </CardModalLayout>
  );
});

ProjectContent.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ProjectContent;
