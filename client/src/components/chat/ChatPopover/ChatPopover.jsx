/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { ChevronRight, Search, UserRound, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popup } from "../../../lib/custom-ui";

import selectors from "../../../selectors";
import UserAvatar from "../../users/UserAvatar";
import { useChat } from "../ChatContext";
import {
  getConversationTitle,
  getDirectUser,
  isGeneralConversation,
} from "../utils";

import styles from "./ChatPopover.module.scss";

const ChatPopover = React.memo(({ onClose }) => {
  const [t] = useTranslation();
  const currentUser = useSelector(selectors.selectCurrentUser);
  const project = useSelector(selectors.selectCurrentProject);
  const members = useSelector(selectors.selectChatMembersForCurrentProject);

  const {
    conversations,
    isPending,
    openConversation,
    openDirectConversation,
    openGeneralConversation,
  } = useChat();

  const [query, setQuery] = useState("");

  const recentConversations = useMemo(
    () =>
      conversations
        .filter(
          (conversation) =>
            !isGeneralConversation(conversation) &&
            getDirectUser(conversation, members, currentUser.id),
        )
        .slice(0, 5),
    [conversations, currentUser.id, members],
  );

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return members.filter(
      (member) =>
        member.id !== currentUser.id &&
        (!normalizedQuery ||
          member.name.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [currentUser.id, members, query]);

  const handleConversationClick = useCallback(
    (event) => {
      openConversation(event.currentTarget.dataset.id);
      onClose();
    },
    [onClose, openConversation],
  );

  const handleGeneralClick = useCallback(() => {
    openGeneralConversation();
    onClose();
  }, [onClose, openGeneralConversation]);

  const handleMemberClick = useCallback(
    (event) => {
      openDirectConversation(event.currentTarget.dataset.id);
      onClose();
    },
    [onClose, openDirectConversation],
  );

  return (
    <Popup.Content>
      <div className={styles.wrapper}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>{t("chat.project")}</span>
            <h3 className={styles.title}>{t("chat.conversations")}</h3>
          </div>
          <span className={styles.memberCount}>
            {t("chat.memberCount", { count: members.length })}
          </span>
        </div>

        <button
          type="button"
          className={styles.generalButton}
          disabled={isPending}
          onClick={handleGeneralClick}
        >
          <span className={styles.generalIcon}>
            <Users aria-hidden="true" size={17} strokeWidth={2} />
          </span>
          <span className={styles.itemCopy}>
            <strong>
              {t("chat.general")} - {project.name}
            </strong>
            <small>{t("chat.allAuthorizedMembers")}</small>
          </span>
          <ChevronRight
            aria-hidden="true"
            size={15}
            strokeWidth={2}
            className={styles.chevron}
          />
        </button>

        {recentConversations.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>{t("chat.recent")}</h4>
            <div className={styles.list}>
              {recentConversations.map((conversation) => {
                const user = getDirectUser(
                  conversation,
                  members,
                  currentUser.id,
                );

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    data-id={conversation.id}
                    className={styles.listItem}
                    onClick={handleConversationClick}
                  >
                    {user ? (
                      <UserAvatar id={user.id} size="small" />
                    ) : (
                      <span className={styles.fallbackAvatar}>
                        <UserRound
                          aria-hidden="true"
                          size={16}
                          strokeWidth={2}
                        />
                      </span>
                    )}
                    <span className={styles.itemCopy}>
                      <strong>
                        {getConversationTitle(
                          conversation,
                          members,
                          currentUser.id,
                          project.name,
                          {
                            conversationTitle: t("chat.conversation"),
                            generalTitle: t("chat.general"),
                          },
                        )}
                      </strong>
                      <small>
                        {conversation.lastMessage?.text ||
                          t("chat.openConversation")}
                      </small>
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className={styles.unread}>
                        {Math.min(conversation.unreadCount, 99)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.membersHeading}>
            <h4 className={styles.sectionTitle}>{t("chat.members")}</h4>
            <label
              className={styles.search}
              htmlFor="chat-popover-member-search"
            >
              <Search aria-hidden="true" size={14} strokeWidth={2} />
              <input
                id="chat-popover-member-search"
                value={query}
                placeholder={t("chat.searchMembers")}
                aria-label={t("chat.searchMembers")}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className={styles.memberList}>
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                data-id={member.id}
                className={styles.listItem}
                disabled={isPending}
                onClick={handleMemberClick}
              >
                <span className={styles.avatarWrapper}>
                  <UserAvatar id={member.id} size="small" />
                  {member.isOnline && (
                    <span className={styles.onlineIndicator} />
                  )}
                </span>
                <span className={styles.itemCopy}>
                  <strong>{member.name}</strong>
                  <small>
                    {member.isOnline
                      ? t("chat.available")
                      : t("chat.startConversation")}
                  </small>
                </span>
              </button>
            ))}
            {filteredMembers.length === 0 && (
              <div className={styles.empty}>{t("chat.noMembersFound")}</div>
            )}
          </div>
        </section>
      </div>
    </Popup.Content>
  );
});

ChatPopover.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ChatPopover;
