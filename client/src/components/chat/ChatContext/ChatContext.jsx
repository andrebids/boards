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
import { useDispatch, useSelector } from 'react-redux';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';

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

const readStoredWindows = (storageKey) => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        id: item.id,
        isMinimized: !!item.isMinimized,
      }));
  } catch {
    return [];
  }
};

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

  const dispatch = useDispatch();
  const projectId = project?.id;
  const storageKey = `planka-chat-windows:${currentUser.id}:${projectId || 'none'}`;
  const previousStorageKey = useRef(storageKey);
  const subscribedWindowIdsRef = useRef(new Set());
  const previousRevocationVersionRef = useRef(accessRevocationVersions[projectId] || 0);
  const handledDeepLinkRef = useRef(null);

  const [windows, setWindows] = useState(() => readStoredWindows(storageKey));
  const [pendingConversation, setPendingConversation] = useState(null);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  const windowsRef = useRef(windows);

  const isEnabled = isCurrentUserChatMember;

  useEffect(() => {
    if (previousStorageKey.current === storageKey) {
      return;
    }

    windowsRef.current.forEach(({ id }) => {
      dispatch(entryActions.closeChatConversation(id));
    });
    previousStorageKey.current = storageKey;
    subscribedWindowIdsRef.current = new Set();
    previousRevocationVersionRef.current = accessRevocationVersions[projectId] || 0;
    setWindows(readStoredWindows(storageKey));
    setPendingConversation(null);
    setIsConversationListOpen(false);
    handledDeepLinkRef.current = null;
  }, [accessRevocationVersions, dispatch, projectId, storageKey]);

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
    try {
      localStorage.setItem(storageKey, JSON.stringify(windows));
    } catch {
      // Storage can be unavailable in private browsing. The dock still works in memory.
    }
  }, [storageKey, windows]);

  useEffect(() => {
    const revocationVersion = accessRevocationVersions[projectId] || 0;
    if (revocationVersion <= previousRevocationVersionRef.current) {
      return;
    }

    previousRevocationVersionRef.current = revocationVersion;
    subscribedWindowIdsRef.current = new Set();
    setPendingConversation(null);
    setIsConversationListOpen(false);
    setWindows([]);

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Storage is optional; clearing in-memory state still protects the current session.
    }
  }, [accessRevocationVersions, projectId, storageKey]);

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

        if (existingWindow) {
          return [
            ...currentWindows.filter((window) => window.id !== id),
            {
              ...existingWindow,
              isMinimized: false,
            },
          ];
        }

        return [...currentWindows, { id, isMinimized: false }];
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

  const closeConversation = useCallback(
    (id) => {
      subscribedWindowIdsRef.current.delete(id);
      dispatch(entryActions.closeChatConversation(id));
      setWindows((currentWindows) => currentWindows.filter((window) => window.id !== id));
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
      dispatch(entryActions.toggleChatConversationMinimized(id));
      setWindows((currentWindows) =>
        currentWindows.map((window) =>
          window.id === id ? { ...window, isMinimized: !window.isMinimized } : window,
        ),
      );
    },
    [dispatch],
  );

  const openConversationList = useCallback(() => {
    setIsConversationListOpen(true);
  }, []);

  const closeConversationList = useCallback(() => {
    setIsConversationListOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      closeConversationList,
      closeConversation,
      conversations,
      isConversationListOpen,
      isEnabled,
      isPending: !!pendingConversation,
      openConversation,
      openConversationList,
      openDirectConversation,
      openGeneralConversation,
      toggleConversationMinimized,
      windows,
    }),
    [
      closeConversationList,
      closeConversation,
      conversations,
      isConversationListOpen,
      isEnabled,
      openConversation,
      openConversationList,
      openDirectConversation,
      openGeneralConversation,
      pendingConversation,
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
