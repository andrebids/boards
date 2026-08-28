/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import history from '../../../history';
import {
  activateGlobalTarget,
  getGlobalConversationTarget,
  getGlobalDirectConversationTarget,
} from '../navigation';
import createInitialChatWindows, { setChatWindowMinimized } from './windowState';

import '../theme.scss';

const ChatContext = createContext(null);

const getParticipantUserIds = (conversation) =>
  conversation.participantUserIds ||
  conversation.userIds ||
  (conversation.participants || []).map((participant) =>
    typeof participant === 'string' ? participant : participant.userId,
  );

const isGeneralConversation = (conversation) =>
  ['project_group', 'projectGroup', 'general'].includes(conversation.type);

const isDirectConversation = (conversation) => conversation?.type === 'projectDirect';

const ChatProvider = React.memo(({ children }) => {
  const currentUser = useSelector(selectors.selectCurrentUser);
  const project = useSelector(selectors.selectCurrentProject);
  const isCurrentUserChatMember = useSelector(
    selectors.selectIsCurrentUserChatMemberForCurrentProject,
  );
  const conversations = useSelector(selectors.selectChatConversationsForCurrentProject);
  const conversationCreationErrors = useSelector(selectors.selectChatConversationCreationErrors);
  const accessRevocationVersions = useSelector(selectors.selectChatAccessRevocationVersions);
  const hasFetchedConversations = useSelector(
    selectors.selectHasFetchedChatConversationsForCurrentProject,
  );
  const hasPendingMessages = useSelector(selectors.selectHasPendingChatMessages);
  const hasFetchedInbox = useSelector(selectors.selectHasFetchedChatInbox);
  const isInboxFetching = useSelector(selectors.selectIsChatInboxFetching);
  const isChatAvailableForCurrentUser = useSelector(selectors.selectIsChatAvailableForCurrentUser);

  const dispatch = useDispatch();
  const store = useStore();
  const { t } = useTranslation();
  const projectId = project?.id;
  const scopeKey = `${currentUser.id}:${projectId || 'none'}`;
  const previousScopeKey = useRef(scopeKey);
  const subscribedWindowIdsRef = useRef(new Set());
  const previousRevocationVersionRef = useRef(accessRevocationVersions[projectId] || 0);
  const handledDeepLinkRef = useRef(null);
  const hasRequestedInboxRef = useRef(false);

  const [windows, setWindows] = useState(createInitialChatWindows);
  const [pendingConversation, setPendingConversation] = useState(null);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  const [isConversationListClosing, setIsConversationListClosing] = useState(false);
  const [inboxScope, setInboxScope] = useState(() =>
    projectId && isCurrentUserChatMember ? 'project' : 'global',
  );
  const windowsRef = useRef(windows);

  const isEnabled = isCurrentUserChatMember || isChatAvailableForCurrentUser;

  useEffect(() => {
    if (hasFetchedInbox || isInboxFetching || hasRequestedInboxRef.current) {
      return;
    }

    hasRequestedInboxRef.current = true;
    dispatch(entryActions.fetchChatInbox());
  }, [dispatch, hasFetchedInbox, isInboxFetching]);

  useEffect(() => {
    if (!hasPendingMessages) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasPendingMessages]);

  useEffect(() => {
    if (!hasPendingMessages) {
      return undefined;
    }

    const unblock = history.block((transition) => {
      // eslint-disable-next-line no-alert
      if (window.confirm(t('chat.pendingMessageLeaveWarning'))) {
        unblock();
        transition.retry();
      }
    });

    return unblock;
  }, [hasPendingMessages, t]);

  useEffect(() => {
    if (previousScopeKey.current === scopeKey) {
      return;
    }

    windowsRef.current.forEach(({ id }) => {
      dispatch(entryActions.closeChatConversation(id));
    });
    previousScopeKey.current = scopeKey;
    subscribedWindowIdsRef.current = new Set();
    previousRevocationVersionRef.current = accessRevocationVersions[projectId] || 0;
    setWindows(createInitialChatWindows());
    setPendingConversation(null);
    setIsConversationListOpen(false);
    setIsConversationListClosing(false);
    setInboxScope(projectId && isCurrentUserChatMember ? 'project' : 'global');
    handledDeepLinkRef.current = null;
  }, [accessRevocationVersions, dispatch, isCurrentUserChatMember, projectId, scopeKey]);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  useEffect(
    () => () => {
      windowsRef.current.forEach(({ id }) => {
        dispatch(entryActions.closeChatConversation(id));
      });
    },
    [dispatch],
  );

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    dispatch(entryActions.fetchChatForCurrentProject());
  }, [isEnabled, project?.id, dispatch]);

  useEffect(() => {
    const revocationVersion = accessRevocationVersions[projectId] || 0;
    if (revocationVersion <= previousRevocationVersionRef.current) {
      return;
    }

    previousRevocationVersionRef.current = revocationVersion;
    subscribedWindowIdsRef.current = new Set();
    setPendingConversation(null);
    setIsConversationListOpen(false);
    setIsConversationListClosing(false);
    setWindows([]);
  }, [accessRevocationVersions, projectId]);

  useEffect(() => {
    if (!hasFetchedConversations) {
      return;
    }

    const validConversationIds = new Set(conversations.map(({ id }) => id));
    const invalidWindows = windows.filter(({ id }) => !validConversationIds.has(id));
    invalidWindows.forEach(({ id }) => {
      if (subscribedWindowIdsRef.current.has(id)) {
        subscribedWindowIdsRef.current.delete(id);
        dispatch(entryActions.closeChatConversation(id));
      }
    });

    if (invalidWindows.length > 0) {
      setWindows((currentWindows) =>
        currentWindows.filter(({ id }) => validConversationIds.has(id)),
      );
    }
  }, [conversations, dispatch, hasFetchedConversations, windows]);

  useEffect(() => {
    windows.forEach(({ id, isMinimized }) => {
      if (!conversations.some((conversation) => conversation.id === id)) {
        return;
      }

      if (!subscribedWindowIdsRef.current.has(id)) {
        subscribedWindowIdsRef.current.add(id);
        dispatch(entryActions.openChatConversation(id));
        if (isMinimized) {
          dispatch(entryActions.toggleChatConversationMinimized(id));
        }
      }
    });
  }, [conversations, dispatch, windows]);

  const openConversation = useCallback(
    (id) => {
      subscribedWindowIdsRef.current.add(id);
      dispatch(entryActions.openChatConversation(id));
      setWindows((currentWindows) => {
        const existingWindow = currentWindows.find((window) => window.id === id);
        let nextWindows;

        if (existingWindow) {
          nextWindows = [
            ...currentWindows.filter((window) => window.id !== id),
            {
              ...existingWindow,
              isMinimized: false,
            },
          ];
        } else {
          nextWindows = [...currentWindows, { id, isMinimized: false }];
        }

        windowsRef.current = nextWindows;
        return nextWindows;
      });
    },
    [dispatch],
  );

  useEffect(() => {
    if (!hasFetchedConversations || !projectId) {
      return;
    }

    const parameters = new URLSearchParams(window.location.search);
    const conversationId = parameters.get('chatConversation');
    const messageId = parameters.get('chatMessage');
    const deepLinkKey = conversationId && `${projectId}:${conversationId}:${messageId || ''}`;
    if (!conversationId || handledDeepLinkRef.current === deepLinkKey) {
      return;
    }

    handledDeepLinkRef.current = deepLinkKey;
    if (conversations.some(({ id }) => id === conversationId)) {
      openConversation(conversationId);
    }
  }, [conversations, hasFetchedConversations, openConversation, projectId]);

  useEffect(() => {
    if (!pendingConversation) {
      return;
    }

    const conversation = conversations.find((item) => {
      if (pendingConversation.type === 'general') {
        return isGeneralConversation(item);
      }

      return (
        isDirectConversation(item) &&
        getParticipantUserIds(item).includes(pendingConversation.userId)
      );
    });

    if (conversation) {
      openConversation(conversation.id);
      setPendingConversation(null);
    }
  }, [conversations, openConversation, pendingConversation]);

  useEffect(() => {
    if (pendingConversation && conversationCreationErrors[pendingConversation.requestKey]) {
      setPendingConversation(null);
    }
  }, [conversationCreationErrors, pendingConversation]);

  const openGeneralConversation = useCallback(() => {
    const conversation = conversations.find(isGeneralConversation);

    if (conversation) {
      openConversation(conversation.id);
      return;
    }

    setPendingConversation({ type: 'general', requestKey: `${projectId}:general` });
    dispatch(entryActions.createGeneralChatConversation(projectId));
  }, [conversations, dispatch, openConversation, projectId]);

  const openDirectConversation = useCallback(
    (userId) => {
      const conversation = conversations.find(
        (item) => isDirectConversation(item) && getParticipantUserIds(item).includes(userId),
      );

      if (conversation) {
        openConversation(conversation.id);
        return;
      }

      setPendingConversation({
        type: 'direct',
        userId,
        requestKey: `${projectId}:direct:${userId}`,
      });
      dispatch(entryActions.createDirectChatConversation(projectId, userId));
    },
    [conversations, dispatch, openConversation, projectId],
  );

  useEffect(() => {
    if (!hasFetchedConversations || !projectId) {
      return;
    }

    const parameters = new URLSearchParams(window.location.search);
    const userId = parameters.get('chatDirectUser');
    if (!userId) {
      return;
    }

    parameters.delete('chatDirectUser');
    const search = parameters.toString();
    history.replace(
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
    openDirectConversation(userId);
  }, [hasFetchedConversations, openDirectConversation, projectId]);

  const closeConversation = useCallback(
    (id) => {
      subscribedWindowIdsRef.current.delete(id);
      dispatch(entryActions.closeChatConversation(id));
      setWindows((currentWindows) => {
        const nextWindows = currentWindows.filter((window) => window.id !== id);

        windowsRef.current = nextWindows;
        return nextWindows;
      });
      const parameters = new URLSearchParams(window.location.search);
      if (parameters.get('chatConversation') === id) {
        parameters.delete('chatConversation');
        parameters.delete('chatMessage');
        const search = parameters.toString();
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
        );
        handledDeepLinkRef.current = null;
      }
    },
    [dispatch],
  );

  const toggleConversationMinimized = useCallback(
    (id) => {
      const currentWindow = windowsRef.current.find((window) => window.id === id);
      if (!currentWindow) {
        return;
      }

      const nextWindows = setChatWindowMinimized(
        windowsRef.current,
        id,
        !currentWindow.isMinimized,
      );

      windowsRef.current = nextWindows;
      dispatch(entryActions.toggleChatConversationMinimized(id));
      setWindows(nextWindows);
    },
    [dispatch],
  );

  const minimizeConversation = useCallback(
    (id) => {
      const nextWindows = setChatWindowMinimized(windowsRef.current, id, true);
      if (nextWindows === windowsRef.current) {
        return;
      }

      windowsRef.current = nextWindows;
      dispatch(entryActions.toggleChatConversationMinimized(id));
      setWindows(nextWindows);
    },
    [dispatch],
  );

  const openConversationList = useCallback(() => {
    setInboxScope(projectId && isCurrentUserChatMember ? 'project' : 'global');
    setIsConversationListClosing(false);
    setIsConversationListOpen(true);
  }, [isCurrentUserChatMember, projectId]);

  const startConversationListClose = useCallback(() => {
    setIsConversationListClosing(true);
  }, []);

  const closeConversationList = useCallback(() => {
    setIsConversationListOpen(false);
    setIsConversationListClosing(false);
  }, []);

  const openGlobalConversation = useCallback(
    (item) => {
      const firstBoardId = item?.projectId
        ? selectors.selectFirstBoardIdByProjectId(store.getState(), item.projectId)
        : undefined;
      const target = getGlobalConversationTarget({
        currentPathname: window.location.pathname,
        currentProjectId: projectId,
        currentSearch: window.location.search,
        firstBoardId,
        item,
      });
      activateGlobalTarget(target, history.push, () => openConversation(target.conversationId));
    },
    [openConversation, projectId, store],
  );

  const openGlobalPerson = useCallback(
    (person) => {
      const firstBoardId = person?.projectId
        ? selectors.selectFirstBoardIdByProjectId(store.getState(), person.projectId)
        : undefined;
      const target = getGlobalDirectConversationTarget({
        currentPathname: window.location.pathname,
        currentProjectId: projectId,
        currentSearch: window.location.search,
        firstBoardId,
        person,
      });
      activateGlobalTarget(target, history.push, () => openDirectConversation(person.userId));
    },
    [openDirectConversation, projectId, store],
  );

  const value = useMemo(
    () => ({
      closeConversationList,
      closeConversation,
      conversations,
      inboxScope,
      isConversationListClosing,
      isConversationListOpen,
      isEnabled,
      isProjectChatEnabled: isCurrentUserChatMember,
      isPending: !!pendingConversation,
      minimizeConversation,
      openConversation,
      openConversationList,
      openDirectConversation,
      openGeneralConversation,
      openGlobalConversation,
      openGlobalPerson,
      setInboxScope,
      startConversationListClose,
      toggleConversationMinimized,
      windows,
    }),
    [
      closeConversationList,
      closeConversation,
      conversations,
      inboxScope,
      isConversationListClosing,
      isConversationListOpen,
      isEnabled,
      isCurrentUserChatMember,
      minimizeConversation,
      openConversation,
      openConversationList,
      openDirectConversation,
      openGeneralConversation,
      openGlobalConversation,
      openGlobalPerson,
      pendingConversation,
      startConversationListClose,
      toggleConversationMinimized,
      windows,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
});

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useChat = () => {
  const value = useContext(ChatContext);

  if (!value) {
    throw new Error('useChat must be used inside ChatProvider');
  }

  return value;
};

export default ChatProvider;
