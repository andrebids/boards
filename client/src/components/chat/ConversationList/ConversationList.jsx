import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ConversationRow from '../ConversationRow';
import {
  getDirectUser,
  isChatParticipantPinned,
  isCustomGroupConversation,
  isGeneralConversation,
} from '../utils';

import styles from './ConversationList.module.scss';

const ConversationList = React.memo(
  ({
    conversations,
    currentUser,
    isEmbedded,
    isPending,
    members,
    onConversationOpen,
    onGeneralOpen,
    openConversationIds,
    showGeneralFallback,
  }) => {
    const [t] = useTranslation();
    const { directConversations, generalConversation, groupConversations, pinnedConversations } =
      useMemo(() => {
        const general = conversations.find(isGeneralConversation);
        const customGroups = conversations.filter(isCustomGroupConversation);
        const availableDirectConversations = conversations.filter(
          (conversation) =>
            !isGeneralConversation(conversation) &&
            !isCustomGroupConversation(conversation) &&
            getDirectUser(conversation, members, currentUser.id),
        );
        const isPinned = (conversation) =>
          isChatParticipantPinned(
            conversation.participants?.find(({ userId }) => userId === currentUser.id),
            isGeneralConversation(conversation),
          );
        const projectGroups = [general, ...customGroups].filter(Boolean);

        return {
          generalConversation: general,
          pinnedConversations: [...projectGroups, ...availableDirectConversations].filter(isPinned),
          groupConversations: projectGroups.filter((conversation) => !isPinned(conversation)),
          directConversations: availableDirectConversations.filter(
            (conversation) => !isPinned(conversation),
          ),
        };
      }, [conversations, currentUser.id, members]);
    const renderConversationRow = (conversation) => {
      const isGeneral = isGeneralConversation(conversation);

      return (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          currentParticipant={conversation.participants?.find(
            ({ userId }) => userId === currentUser.id,
          )}
          isGeneral={isGeneral}
          isOpen={openConversationIds.includes(conversation.id)}
          isPending={isPending}
          lastMessage={conversation.lastMessage}
          onClick={onConversationOpen}
          sender={
            isGeneral && members.find((member) => member.id === conversation.lastMessage?.userId)
          }
          user={getDirectUser(conversation, members, currentUser.id)}
        />
      );
    };
    const showFallback = !generalConversation && showGeneralFallback;

    return (
      <div
        id="chat-tabpanel-conversations"
        className={`${styles.list} ${isEmbedded ? styles.embedded : ''}`}
        role={isEmbedded ? undefined : 'tabpanel'}
        aria-labelledby={isEmbedded ? undefined : 'chat-tab-conversations'}
      >
        {(pinnedConversations.length > 0 || showFallback) && (
          <span className={styles.sectionLabel}>{t('chat.pinned')}</span>
        )}
        {showFallback && (
          <ConversationRow isGeneral isPending={isPending} onClick={onGeneralOpen} />
        )}
        {pinnedConversations.map(renderConversationRow)}
        {groupConversations.length > 0 && (
          <span className={styles.sectionLabel}>{t('chat.groups')}</span>
        )}
        {groupConversations.map(renderConversationRow)}
        {directConversations.length > 0 && (
          <span className={styles.sectionLabel}>{t('chat.directConversations')}</span>
        )}
        {directConversations.map(renderConversationRow)}
        {!generalConversation &&
          !showGeneralFallback &&
          directConversations.length === 0 &&
          groupConversations.length === 0 &&
          pinnedConversations.length === 0 && (
            <div className={styles.empty}>{t('chat.noConversations')}</div>
          )}
      </div>
    );
  },
);

ConversationList.propTypes = {
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      lastMessage: PropTypes.shape({
        userId: PropTypes.string,
      }),
    }),
  ).isRequired,
  currentUser: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  isEmbedded: PropTypes.bool,
  isPending: PropTypes.bool.isRequired,
  openConversationIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onConversationOpen: PropTypes.func.isRequired,
  onGeneralOpen: PropTypes.func.isRequired,
  showGeneralFallback: PropTypes.bool,
};

ConversationList.defaultProps = {
  isEmbedded: false,
  showGeneralFallback: true,
};

export default ConversationList;
