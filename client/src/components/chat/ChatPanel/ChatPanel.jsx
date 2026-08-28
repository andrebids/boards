import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, Check, Folder, Inbox, Plus, Users } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { CloseButton } from '../../../lib/custom-ui';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useChat } from '../ChatContext';
import { getDirectUser, isGeneralConversation } from '../utils';
import ChatHeader from '../ChatHeader';
import ChatSearch from '../ChatSearch';
import ConversationList from '../ConversationList';
import MemberList from '../MemberList';
import ChatAvatar from '../ChatAvatar';
import GlobalInbox from '../GlobalInbox';

import styles from './ChatPanel.module.scss';

const ChatPanel = React.memo(
  ({
    inboxScope,
    isClosing,
    onClose,
    onInboxScopeChange,
    onOpenGlobalConversation,
    onOpenGlobalPerson,
  }) => {
    const [t] = useTranslation();
    const panelRef = useRef(null);
    const searchRef = useRef(null);
    const groupTitleRef = useRef(null);
    const currentUser = useSelector(selectors.selectCurrentUser);
    const project = useSelector(selectors.selectCurrentProject);
    const globalUnreadTotal = useSelector(selectors.selectChatInboxUnreadConversationTotal) || 0;
    const members = useSelector(selectors.selectChatMembersForCurrentProject);
    const createdConversationIds = useSelector(
      (state) => state.chat.createdConversationIdByRequestKey,
    );
    const dispatch = useDispatch();
    const {
      conversations,
      isProjectChatEnabled,
      isPending,
      openConversation,
      openDirectConversation,
      openGeneralConversation,
      windows,
    } = useChat();
    const [activeTab, setActiveTab] = useState('conversations');
    const [query, setQuery] = useState('');
    const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
    const [groupTitle, setGroupTitle] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [pendingGroup, setPendingGroup] = useState(null);

    useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          if (isGroupFormOpen) {
            setGroupTitle('');
            setSelectedMemberIds([]);
            setIsGroupFormOpen(false);
            setQuery('');
            return;
          }
          if (activeTab === 'members') {
            setActiveTab('conversations');
            setQuery('');
            return;
          }
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, isGroupFormOpen, onClose]);

    useEffect(() => {
      panelRef.current?.focus();
    }, []);

    useEffect(() => {
      if (!pendingGroup) {
        return;
      }
      const createdGroup = conversations.find(
        (conversation) => conversation.id === createdConversationIds[pendingGroup.requestKey],
      );
      if (createdGroup) {
        setPendingGroup(null);
        onClose(() => openConversation(createdGroup.id));
      }
    }, [conversations, createdConversationIds, onClose, openConversation, pendingGroup]);

    const filteredConversations = useMemo(() => {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      if (!normalizedQuery) {
        return conversations;
      }

      return conversations.filter((conversation) => {
        const title =
          getDirectUser(conversation, members, currentUser.id)?.name ||
          (isGeneralConversation(conversation) ? t('chat.general') : t('chat.conversation'));
        const lastMessage = conversation.lastMessage?.text || '';
        return `${title} ${lastMessage}`.toLocaleLowerCase().includes(normalizedQuery);
      });
    }, [conversations, currentUser.id, members, query, t]);

    const filteredMembers = useMemo(() => {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      return members.filter(
        (member) =>
          member.id !== currentUser.id &&
          (!normalizedQuery ||
            `${member.name} ${member.username || ''}`
              .toLocaleLowerCase()
              .includes(normalizedQuery)),
      );
    }, [currentUser.id, members, query]);

    const availableMembers = useMemo(() => {
      const directConversationUserIds = new Set(
        conversations
          .map((conversation) => getDirectUser(conversation, members, currentUser.id)?.id)
          .filter(Boolean),
      );

      return [...filteredMembers]
        .filter((member) => !directConversationUserIds.has(member.id))
        .sort((left, right) => {
          if (left.isOnline !== right.isOnline) {
            return left.isOnline ? -1 : 1;
          }

          return left.name.localeCompare(right.name);
        });
    }, [conversations, currentUser.id, filteredMembers, members]);

    const isSearching = query.trim().length > 0;
    const suggestedMembers = isSearching ? availableMembers : availableMembers.slice(0, 5);

    const selectedMembers = useMemo(() => {
      const membersById = new Map(members.map((member) => [member.id, member]));
      return selectedMemberIds.map((id) => membersById.get(id)).filter(Boolean);
    }, [members, selectedMemberIds]);

    const handleConversationOpen = useCallback(
      (id) => {
        onClose(() => openConversation(id));
      },
      [onClose, openConversation],
    );

    const handleGeneralOpen = useCallback(() => {
      onClose(openGeneralConversation);
    }, [onClose, openGeneralConversation]);

    const handleMemberOpen = useCallback(
      (id) => {
        onClose(() => openDirectConversation(id));
      },
      [onClose, openDirectConversation],
    );

    const handleGroupFormOpen = useCallback(() => {
      setQuery('');
      setIsGroupFormOpen(true);
      setActiveTab('members');
      window.requestAnimationFrame(() => groupTitleRef.current?.focus());
    }, []);

    const handleGroupFormClose = useCallback(() => {
      setGroupTitle('');
      setSelectedMemberIds([]);
      setIsGroupFormOpen(false);
      setQuery('');
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }, []);

    const handleGroupMemberToggle = useCallback((id) => {
      setSelectedMemberIds((ids) =>
        ids.includes(id) ? ids.filter((memberId) => memberId !== id) : [...ids, id],
      );
    }, []);

    const handleGroupSubmit = useCallback(
      (event) => {
        event.preventDefault();
        const title = groupTitle.trim();
        if (!title || selectedMemberIds.length === 0) {
          return;
        }
        const requestKey = `${project.id}:group:${Date.now()}`;
        dispatch(
          entryActions.createCustomChatGroup(
            project.id,
            {
              title,
              userIds: selectedMemberIds,
            },
            requestKey,
          ),
        );
        setPendingGroup({
          requestKey,
        });
        setGroupTitle('');
        setSelectedMemberIds([]);
        setIsGroupFormOpen(false);
        setActiveTab('conversations');
      },
      [dispatch, groupTitle, project?.id, selectedMemberIds],
    );

    const searchPlaceholder =
      activeTab === 'conversations'
        ? t('chat.searchConversationsAndMembers')
        : t(isGroupFormOpen ? 'chat.searchGroupMembers' : 'chat.searchMembers');

    const openConversationIds = useMemo(() => windows.map(({ id }) => id), [windows]);

    const handleNewConversation = useCallback(() => {
      setQuery('');
      setActiveTab('members');
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }, []);

    const handleConversationsBack = useCallback(() => {
      setQuery('');
      setIsGroupFormOpen(false);
      setActiveTab('conversations');
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }, []);

    const handleGlobalConversationOpen = useCallback(
      (item) => {
        onOpenGlobalConversation(item);
        onClose();
      },
      [onClose, onOpenGlobalConversation],
    );

    const handleGlobalPersonOpen = useCallback(
      (person) => {
        onOpenGlobalPerson(person);
        onClose();
      },
      [onClose, onOpenGlobalPerson],
    );

    const handleScopeChange = useCallback(
      (scope) => {
        if (scope === inboxScope) return;

        setActiveTab('conversations');
        setQuery('');
        setIsGroupFormOpen(false);
        setGroupTitle('');
        setSelectedMemberIds([]);
        onInboxScopeChange(scope);
      },
      [inboxScope, onInboxScopeChange],
    );

    const handleScopeKeyDown = useCallback(
      (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const scope = event.key === 'ArrowLeft' || event.key === 'Home' ? 'project' : 'global';
        handleScopeChange(scope);
        document.getElementById(`chat-scope-${scope}`)?.focus();
      },
      [handleScopeChange],
    );

    const canUseProjectScope = Boolean(project && isProjectChatEnabled);
    const isGlobalScope = inboxScope === 'global' || !canUseProjectScope;

    useEffect(() => {
      if (!canUseProjectScope && inboxScope !== 'global') {
        onInboxScopeChange('global');
      }
    }, [canUseProjectScope, inboxScope, onInboxScopeChange]);

    return (
      <section
        id="chat-conversation-panel"
        ref={panelRef}
        role="dialog"
        aria-label={t(isGlobalScope ? 'chat.globalInbox' : 'chat.openConversations')}
        aria-modal="false"
        tabIndex="-1"
        className={`${styles.panel} ${!isGlobalScope && activeTab === 'conversations' ? styles.discoveryPanel : ''} ${isClosing ? styles.closing : ''}`}
      >
        <ChatHeader
          memberCount={members.length}
          meta={
            isGlobalScope ? t('chat.globalInboxSummary', { count: globalUnreadTotal }) : undefined
          }
          projectName={project?.name}
          title={isGlobalScope ? t('chat.globalInbox') : undefined}
          onClose={onClose}
        />
        {canUseProjectScope && (
          <div
            className={`${styles.scopeSwitcher} ${isGlobalScope ? styles.globalScope : ''}`}
            role="tablist"
            aria-label={t('chat.chatScope')}
          >
            <button
              type="button"
              id="chat-scope-project"
              role="tab"
              aria-controls="chat-scope-project-panel"
              aria-selected={!isGlobalScope}
              tabIndex={isGlobalScope ? -1 : 0}
              className={!isGlobalScope ? styles.activeScope : ''}
              onClick={() => handleScopeChange('project')}
              onKeyDown={handleScopeKeyDown}
            >
              <Folder aria-hidden="true" size={14} strokeWidth={2} />
              {t('chat.currentProject')}
            </button>
            <button
              type="button"
              id="chat-scope-global"
              role="tab"
              aria-controls="chat-scope-global-panel"
              aria-selected={isGlobalScope}
              tabIndex={isGlobalScope ? 0 : -1}
              className={isGlobalScope ? styles.activeScope : ''}
              onClick={() => handleScopeChange('global')}
              onKeyDown={handleScopeKeyDown}
            >
              <Inbox aria-hidden="true" size={14} strokeWidth={2} />
              {t('chat.globalInbox')}
              {globalUnreadTotal > 0 && (
                <span
                  aria-label={t('chat.unreadConversations', {
                    count: globalUnreadTotal,
                  })}
                >
                  {globalUnreadTotal > 99 ? '99+' : globalUnreadTotal}
                </span>
              )}
            </button>
          </div>
        )}
        <div className={styles.scopeViewport}>
          {!isGlobalScope && (
            <div
              id="chat-scope-project-panel"
              role="tabpanel"
              aria-labelledby="chat-scope-project"
              className={`${styles.scopeView} ${styles.projectScopeView}`}
            >
              <ChatSearch
                ref={searchRef}
                value={query}
                placeholder={searchPlaceholder}
                onChange={setQuery}
              />
              <div className={styles.content}>
                {activeTab === 'conversations' && (
                  <div className={styles.discoveryContent}>
                    {(!isSearching || filteredConversations.length > 0) && (
                      <section
                        className={styles.discoverySection}
                        aria-label={t('chat.conversations')}
                      >
                        <ConversationList
                          conversations={filteredConversations}
                          currentUser={currentUser}
                          isEmbedded
                          members={members}
                          openConversationIds={openConversationIds}
                          isPending={isPending}
                          onConversationOpen={handleConversationOpen}
                          onGeneralOpen={handleGeneralOpen}
                          showGeneralFallback={!isSearching}
                        />
                      </section>
                    )}
                    {(!isSearching || suggestedMembers.length > 0) && (
                      <section
                        className={styles.discoverySection}
                        aria-label={t('chat.startConversation')}
                      >
                        <header className={styles.discoveryHeader}>
                          {availableMembers.length > 0 && (
                            <button
                              type="button"
                              className={styles.discoveryAction}
                              onClick={handleNewConversation}
                            >
                              {t('chat.startConversation')}
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.discoveryAction}
                            onClick={handleGroupFormOpen}
                          >
                            <Users aria-hidden="true" size={14} />
                            {t('chat.createGroup')}
                          </button>
                        </header>
                        {suggestedMembers.length > 0 && (
                          <MemberList
                            isCompact
                            members={suggestedMembers}
                            isPending={isPending}
                            onMemberOpen={handleMemberOpen}
                          />
                        )}
                        {!isSearching && availableMembers.length > 5 && (
                          <button
                            type="button"
                            className={styles.viewAllMembers}
                            onClick={handleNewConversation}
                          >
                            {t('chat.viewAllMembers', { count: filteredMembers.length })}
                          </button>
                        )}
                      </section>
                    )}
                    {isSearching &&
                      filteredConversations.length === 0 &&
                      suggestedMembers.length === 0 && (
                        <div className={styles.discoveryEmpty}>{t('chat.noChatResults')}</div>
                      )}
                  </div>
                )}
                {activeTab !== 'conversations' && (
                  <div
                    id="chat-tabpanel-members"
                    className={styles.membersContent}
                    role="region"
                    aria-label={t('chat.members')}
                  >
                    {isGroupFormOpen ? (
                      <form className={styles.groupForm} onSubmit={handleGroupSubmit}>
                        <header className={styles.groupFormHeader}>
                          <span className={styles.groupFormIcon}>
                            <Users aria-hidden="true" size={18} />
                          </span>
                          <span className={styles.groupFormCopy}>
                            <strong>{t('chat.createGroup')}</strong>
                            <small>{t('chat.createGroupDescription')}</small>
                          </span>
                          <CloseButton
                            ariaLabel={t('chat.cancel')}
                            onClick={handleGroupFormClose}
                          />
                        </header>
                        <label className={styles.groupTitleField} htmlFor="chat-group-title">
                          <span>{t('chat.groupName')}</span>
                          <input
                            ref={groupTitleRef}
                            id="chat-group-title"
                            value={groupTitle}
                            maxLength={80}
                            placeholder={t('chat.groupNamePlaceholder')}
                            onChange={(event) => setGroupTitle(event.target.value)}
                          />
                        </label>
                        <section className={styles.memberPicker}>
                          <div className={styles.memberPickerHeader}>
                            <span>
                              <strong>{t('chat.chooseGroupMembers')}</strong>
                              <small>
                                {selectedMemberIds.length > 0
                                  ? t('chat.groupMemberCount', {
                                      count: selectedMemberIds.length,
                                    })
                                  : t('chat.selectAtLeastOneMember')}
                              </small>
                            </span>
                            {selectedMembers.length > 0 && (
                              <span
                                className={styles.selectedAvatars}
                                role="img"
                                aria-label={t('chat.selectedGroupMembers', {
                                  count: selectedMembers.length,
                                })}
                              >
                                {selectedMembers.slice(0, 5).map((member) => (
                                  <ChatAvatar key={member.id} user={member} />
                                ))}
                                {selectedMembers.length > 5 && (
                                  <span className={styles.selectedOverflow}>
                                    +{selectedMembers.length - 5}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <div
                            className={styles.memberOptions}
                            role="group"
                            aria-label={t('chat.chooseGroupMembers')}
                          >
                            {filteredMembers.map((member) => {
                              const isSelected = selectedMemberIds.includes(member.id);
                              return (
                                <button
                                  type="button"
                                  key={member.id}
                                  className={`${styles.memberOption} ${
                                    isSelected ? styles.memberOptionSelected : ''
                                  }`}
                                  aria-pressed={isSelected}
                                  onClick={() => handleGroupMemberToggle(member.id)}
                                >
                                  <ChatAvatar user={member} isOnline={member.isOnline} />
                                  <span className={styles.memberOptionCopy}>
                                    <strong>{member.name}</strong>
                                    <small>
                                      {member.isOnline
                                        ? t('chat.available')
                                        : member.username || t('chat.memberOfProject')}
                                    </small>
                                  </span>
                                  <span
                                    className={styles.memberSelectionIndicator}
                                    aria-hidden="true"
                                  >
                                    {isSelected ? (
                                      <Check size={15} strokeWidth={2.6} />
                                    ) : (
                                      <Plus size={15} />
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                            {filteredMembers.length === 0 && (
                              <div className={styles.groupMembersEmpty}>
                                {t('chat.noMembersFound')}
                              </div>
                            )}
                          </div>
                        </section>
                        <footer className={styles.groupFormFooter}>
                          <button type="button" onClick={handleGroupFormClose}>
                            {t('chat.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={!groupTitle.trim() || selectedMemberIds.length === 0}
                          >
                            <Users aria-hidden="true" size={15} /> {t('chat.createGroup')}
                          </button>
                        </footer>
                      </form>
                    ) : (
                      <>
                        <header className={styles.membersViewHeader}>
                          <button type="button" onClick={handleConversationsBack}>
                            <ArrowLeft aria-hidden="true" size={16} />
                            {t('chat.backToConversations')}
                          </button>
                          <button type="button" onClick={handleGroupFormOpen}>
                            <Plus aria-hidden="true" size={15} />
                            {t('chat.createGroup')}
                          </button>
                        </header>
                        <MemberList
                          members={filteredMembers}
                          isPending={isPending}
                          onMemberOpen={handleMemberOpen}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {isGlobalScope && (
            <div
              id="chat-scope-global-panel"
              role="tabpanel"
              aria-labelledby="chat-scope-global"
              className={`${styles.scopeView} ${styles.globalScopeView} ${styles.content} ${styles.globalContent}`}
            >
              <GlobalInbox
                onOpenConversation={handleGlobalConversationOpen}
                onOpenPerson={handleGlobalPersonOpen}
              />
            </div>
          )}
        </div>
      </section>
    );
  },
);

ChatPanel.propTypes = {
  inboxScope: PropTypes.oneOf(['global', 'project']),
  isClosing: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onInboxScopeChange: PropTypes.func,
  onOpenGlobalConversation: PropTypes.func,
  onOpenGlobalPerson: PropTypes.func,
};

ChatPanel.defaultProps = {
  inboxScope: 'project',
  isClosing: false,
  onInboxScopeChange: () => undefined,
  onOpenGlobalConversation: () => undefined,
  onOpenGlobalPerson: () => undefined,
};

export default ChatPanel;
