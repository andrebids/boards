import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Plus, Users, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useChat } from '../ChatContext';
import { getDirectUser, isGeneralConversation } from '../utils';
import ChatHeader from '../ChatHeader';
import ChatSearch from '../ChatSearch';
import ChatTabs from '../ChatTabs';
import ConversationList from '../ConversationList';
import MemberList from '../MemberList';
import ChatAvatar from '../ChatAvatar';

import styles from './ChatPanel.module.scss';

const ChatPanel = React.memo(({ isClosing, onClose }) => {
  const [t] = useTranslation();
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const groupTitleRef = useRef(null);
  const currentUser = useSelector(selectors.selectCurrentUser);
  const project = useSelector(selectors.selectCurrentProject);
  const members = useSelector(selectors.selectChatMembersForCurrentProject);
  const createdConversationIds = useSelector(
    (state) => state.chat.createdConversationIdByRequestKey,
  );
  const dispatch = useDispatch();
  const {
    conversations,
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
        if (isGroupFormOpen && activeTab === 'members') {
          setGroupTitle('');
          setSelectedMemberIds([]);
          setIsGroupFormOpen(false);
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
          `${member.name} ${member.username || ''}`.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [currentUser.id, members, query]);

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
    [dispatch, groupTitle, project.id, selectedMemberIds],
  );

  const searchPlaceholder =
    activeTab === 'conversations'
      ? t('chat.searchConversations')
      : t(isGroupFormOpen ? 'chat.searchGroupMembers' : 'chat.searchMembers');

  const openConversationIds = useMemo(() => windows.map(({ id }) => id), [windows]);

  const handleNewConversation = useCallback(() => {
    setQuery('');
    setActiveTab('members');
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  return (
    <section
      id="chat-conversation-panel"
      ref={panelRef}
      role="dialog"
      aria-label={t('chat.openConversations')}
      aria-modal="false"
      tabIndex="-1"
      className={`${styles.panel} ${
        activeTab === 'members' && isGroupFormOpen ? styles.groupFormPanel : ''
      } ${isClosing ? styles.closing : ''}`}
    >
      <ChatHeader memberCount={members.length} projectName={project?.name} onClose={onClose} />
      <ChatSearch
        ref={searchRef}
        value={query}
        placeholder={searchPlaceholder}
        onChange={setQuery}
      />
      {!(activeTab === 'members' && isGroupFormOpen) && (
        <ChatTabs activeTab={activeTab} onChange={setActiveTab} />
      )}
      <div className={styles.content}>
        {activeTab === 'conversations' && (
          <ConversationList
            conversations={filteredConversations}
            currentUser={currentUser}
            members={members}
            openConversationIds={openConversationIds}
            isPending={isPending}
            onConversationOpen={handleConversationOpen}
            onGeneralOpen={handleGeneralOpen}
          />
        )}
        {activeTab === 'members' && (
          <div
            id="chat-tabpanel-members"
            className={styles.membersContent}
            role="tabpanel"
            aria-labelledby="chat-tab-members"
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
                  <button
                    type="button"
                    className={styles.closeGroupFormButton}
                    aria-label={t('chat.cancel')}
                    onClick={handleGroupFormClose}
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
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
                          ? t('chat.groupMemberCount', { count: selectedMemberIds.length })
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
                          <span className={styles.memberSelectionIndicator} aria-hidden="true">
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
                      <div className={styles.groupMembersEmpty}>{t('chat.noMembersFound')}</div>
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
                <button
                  type="button"
                  className={styles.createGroupButton}
                  onClick={handleGroupFormOpen}
                >
                  <Plus aria-hidden="true" size={16} />
                  {t('chat.createGroup')}
                </button>
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
      {activeTab === 'conversations' && (
        <footer className={styles.footer}>
          <button type="button" onClick={handleNewConversation}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
            {t('chat.newConversation')}
          </button>
        </footer>
      )}
    </section>
  );
});

ChatPanel.propTypes = {
  isClosing: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

ChatPanel.defaultProps = { isClosing: false };

export default ChatPanel;
