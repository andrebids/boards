import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ConversationRow from '../ConversationRow';
import {
  getDirectUser,
  isCustomGroupConversation,
  isGeneralConversation,
} from '../utils';

import styles from './ConversationList.module.scss';

const ConversationList = React.memo(
  ({
    conversations,
    currentUser,
    isPending,
    members,
    onConversationOpen,
    onGeneralOpen,
    openConversationIds,
  }) => {
    const [t] = useTranslation();
    const { customGroups, directConversations, generalConversation } = useMemo(
      () => ({
        generalConversation: conversations.find(isGeneralConversation),
        customGroups: conversations.filter(isCustomGroupConversation),
        directConversations: conversations.filter(
          (conversation) =>
            !isGeneralConversation(conversation) &&
            !isCustomGroupConversation(conversation) &&
            getDirectUser(conversation, members, currentUser.id),
        ),
      }),
      [conversations, currentUser.id, members],
    );

    return (
      <div
        id="chat-tabpanel-conversations"
        className={styles.list}
        role="tabpanel"
        aria-labelledby="chat-tab-conversations"
      >
        <span className={styles.sectionLabel}>{t('chat.pinned')}</span>
        <ConversationRow
          conversation={generalConversation}
          currentParticipant={generalConversation?.participants?.find(
            ({ userId }) => userId === currentUser.id,
          )}
          isGeneral
          isOpen={openConversationIds.includes(generalConversation?.id)}
          isPending={isPending}
          lastMessage={generalConversation?.lastMessage}
          onClick={generalConversation ? onConversationOpen : onGeneralOpen}
          sender={
            generalConversation &&
            members.find(
              (member) => member.id === generalConversation.lastMessage?.userId,
            )
          }
        />
        {customGroups.length > 0 && (
          <span className={styles.sectionLabel}>{t('chat.groups')}</span>
        )}
        {customGroups.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            currentParticipant={conversation.participants?.find(
              ({ userId }) => userId === currentUser.id,
            )}
            isOpen={openConversationIds.includes(conversation.id)}
            isPending={isPending}
            lastMessage={conversation.lastMessage}
            onClick={onConversationOpen}
          />
        ))}
        {directConversations.length > 0 && (
          <span className={styles.sectionLabel}>
            {t('chat.directConversations')}
          </span>
        )}
        {directConversations.map((conversation) => {
          const user = getDirectUser(conversation, members, currentUser.id);
          return (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              currentParticipant={conversation.participants?.find(
                ({ userId }) => userId === currentUser.id,
              )}
              isOpen={openConversationIds.includes(conversation.id)}
              isPending={isPending}
              lastMessage={conversation.lastMessage}
              onClick={onConversationOpen}
              user={user}
            />
          );
        })}
        {!generalConversation &&
          directConversations.length === 0 &&
          customGroups.length === 0 && (
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
};

export default ConversationList;
