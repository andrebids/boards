import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Bookmark, Plus, Users, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useChat } from '../ChatContext';
import {
  getConversationTitle,
  getDirectUser,
  isCustomGroupConversation,
  isGeneralConversation,
} from '../utils';
import ChatHeader from '../ChatHeader';
import ChatSearch from '../ChatSearch';
import ChatTabs from '../ChatTabs';
import ConversationList from '../ConversationList';
import MemberList from '../MemberList';

import styles from './ChatPanel.module.scss';

const ChatPanel = React.memo(({ isClosing, onClose }) => {
  const [t] = useTranslation();
  const panelRef = useRef(null);
  const currentUser = useSelector(selectors.selectCurrentUser);
  const project = useSelector(selectors.selectCurrentProject);
  const members = useSelector(selectors.selectChatMembersForCurrentProject);
  const savedMessages = useSelector(selectors.selectSavedChatMessagesForCurrentProject);
  const dispatch = useDispatch();
  const {
    conversations,
    isPending,
    openConversation,
    openDirectConversation,
    openGeneralConversation,
  } = useChat();
  const [activeTab, setActiveTab] = useState('conversations');
  const [query, setQuery] = useState('');
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [pendingGroup, setPendingGroup] = useState(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeTab === 'saved' && project?.id) {
      dispatch(entryActions.fetchChatSavedMessages(project.id));
    }
  }, [activeTab, dispatch, project?.id]);

  useEffect(() => {
    if (!pendingGroup) {
      return;
    }
    const createdGroup = conversations.find(
      (conversation) =>
        isCustomGroupConversation(conversation) &&
        conversation.title === pendingGroup.title &&
        !pendingGroup.existingIds.includes(conversation.id),
    );
    if (createdGroup) {
      openConversation(createdGroup.id);
      setPendingGroup(null);
      onClose();
    }
  }, [conversations, onClose, openConversation, pendingGroup]);

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

  const filteredSavedMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return savedMessages.filter(
      (message) =>
        !normalizedQuery ||
        String(message.text || '')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
    );
  }, [query, savedMessages]);

  const handleConversationOpen = useCallback(
    (id) => {
      openConversation(id);
      onClose();
    },
    [onClose, openConversation],
  );

  const handleGeneralOpen = useCallback(() => {
    openGeneralConversation();
    onClose();
  }, [onClose, openGeneralConversation]);

  const handleMemberOpen = useCallback(
    (id) => {
      openDirectConversation(id);
      onClose();
    },
    [onClose, openDirectConversation],
  );

  const handleSavedMessageOpen = useCallback(
    (message) => {
      const parameters = new URLSearchParams(window.location.search);
      parameters.set('chatConversation', message.conversationId);
      parameters.set('chatMessage', message.id);
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}?${parameters.toString()}${window.location.hash}`,
      );
      dispatch(
        entryActions.fetchChatMessages(message.conversationId, {
          aroundId: message.id,
          replace: true,
        }),
      );
      openConversation(message.conversationId);
      onClose();
    },
    [dispatch, onClose, openConversation],
  );

  const handleGroupSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const title = groupTitle.trim();
      if (!title || selectedMemberIds.length === 0) {
        return;
      }
      dispatch(
        entryActions.createCustomChatGroup(project.id, {
          title,
          userIds: selectedMemberIds,
        }),
      );
      setPendingGroup({
        title,
        existingIds: conversations.map(({ id }) => id),
      });
      setGroupTitle('');
      setSelectedMemberIds([]);
      setIsGroupFormOpen(false);
      setActiveTab('conversations');
    },
    [conversations, dispatch, groupTitle, project.id, selectedMemberIds],
  );

  let searchPlaceholder = t('chat.searchSavedMessages');
  if (activeTab === 'conversations') {
    searchPlaceholder = t('chat.searchConversations');
  } else if (activeTab === 'members') {
    searchPlaceholder = t('chat.searchMembers');
  }

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-label={t('chat.openConversations')}
      aria-modal="false"
      tabIndex="-1"
      className={`${styles.panel} ${isClosing ? styles.closing : ''}`}
    >
      <ChatHeader memberCount={members.length} projectName={project?.name} onClose={onClose} />
      <ChatSearch value={query} placeholder={searchPlaceholder} onChange={setQuery} />
      <ChatTabs activeTab={activeTab} onChange={setActiveTab} />
      <div className={styles.content}>
        {activeTab === 'conversations' && (
          <ConversationList
            conversations={filteredConversations}
            currentUser={currentUser}
            members={members}
            isPending={isPending}
            onConversationOpen={handleConversationOpen}
            onGeneralOpen={handleGeneralOpen}
          />
        )}
        {activeTab === 'members' && (
          <div className={styles.membersContent}>
            <button
              type="button"
              className={styles.createGroupButton}
              onClick={() => setIsGroupFormOpen((value) => !value)}
            >
              {isGroupFormOpen ? (
                <X aria-hidden="true" size={16} />
              ) : (
                <Plus aria-hidden="true" size={16} />
              )}
              {t('chat.createGroup')}
            </button>
            {isGroupFormOpen && (
              <form className={styles.groupForm} onSubmit={handleGroupSubmit}>
                <label htmlFor="chat-group-title">
                  <span>{t('chat.groupName')}</span>
                  <input
                    id="chat-group-title"
                    value={groupTitle}
                    maxLength={80}
                    placeholder={t('chat.groupNamePlaceholder')}
                    onChange={(event) => setGroupTitle(event.target.value)}
                  />
                </label>
                <fieldset>
                  <legend>{t('chat.chooseGroupMembers')}</legend>
                  {filteredMembers.map((member) => (
                    <label key={member.id} htmlFor={`chat-group-member-${member.id}`}>
                      <input
                        id={`chat-group-member-${member.id}`}
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={() =>
                          setSelectedMemberIds((ids) =>
                            ids.includes(member.id)
                              ? ids.filter((id) => id !== member.id)
                              : [...ids, member.id],
                          )
                        }
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </fieldset>
                <button
                  type="submit"
                  disabled={!groupTitle.trim() || selectedMemberIds.length === 0}
                >
                  <Users aria-hidden="true" size={15} /> {t('chat.createGroup')}
                </button>
              </form>
            )}
            <MemberList
              members={filteredMembers}
              isPending={isPending}
              onMemberOpen={handleMemberOpen}
            />
          </div>
        )}
        {activeTab === 'saved' && (
          <div className={styles.savedList}>
            {filteredSavedMessages.length === 0 ? (
              <div className={styles.savedEmpty}>
                <Bookmark aria-hidden="true" size={25} strokeWidth={1.7} />
                <span>{t('chat.noSavedMessages')}</span>
              </div>
            ) : (
              filteredSavedMessages.map((message) => {
                const conversation = conversations.find(({ id }) => id === message.conversationId);
                return (
                  <button
                    type="button"
                    key={message.id}
                    onClick={() => handleSavedMessageOpen(message)}
                  >
                    <strong>
                      {conversation
                        ? getConversationTitle(
                            conversation,
                            members,
                            currentUser.id,
                            project.name,
                            {
                              conversationTitle: t('chat.conversation'),
                              generalTitle: t('chat.general'),
                            },
                          )
                        : t('chat.conversation')}
                    </strong>
                    <span>{message.text || t('chat.sentFile')}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
});

ChatPanel.propTypes = {
  isClosing: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

ChatPanel.defaultProps = { isClosing: false };

export default ChatPanel;
