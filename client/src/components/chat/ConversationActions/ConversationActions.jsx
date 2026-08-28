import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { AtSign, Bell, BellOff, Clock3, LogOut, MoreHorizontal, Users } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import { AlertDialog } from '../../../lib/custom-ui';
import { useChat } from '../ChatContext';

import styles from './ConversationActions.module.scss';

const MENU_GAP = 6;
const VIEWPORT_GAP = 8;

const ConversationActions = React.memo((props) => {
  const { canLeave, conversationId, conversationTitle, isMuted, participant } = props;
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const { openGroupManager } = useChat();
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const canManage = canLeave && participant?.role === 'owner';

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || 230;
    const menuHeight = menuRef.current?.offsetHeight || 250;
    const left = Math.max(
      VIEWPORT_GAP,
      Math.min(buttonRect.right - menuWidth, window.innerWidth - menuWidth - VIEWPORT_GAP),
    );
    const preferredTop = buttonRect.bottom + MENU_GAP;
    const top =
      preferredTop + menuHeight <= window.innerHeight - VIEWPORT_GAP
        ? preferredTop
        : Math.max(VIEWPORT_GAP, buttonRect.top - menuHeight - MENU_GAP);

    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updatePosition();
    const frameId = window.requestAnimationFrame(() => {
      updatePosition();
      menuRef.current?.querySelector('button')?.focus();
    });

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const updatePreferences = useCallback(
    (notificationLevel, mutedUntil = null) => {
      dispatch(
        entryActions.updateChatConversationPreferences(conversationId, {
          notificationLevel,
          mutedUntil,
        }),
      );
      setIsOpen(false);
    },
    [conversationId, dispatch],
  );

  const muteUntilEndOfDay = useCallback(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    updatePreferences(participant?.notificationLevel || 'all', date.toISOString());
  }, [participant?.notificationLevel, updatePreferences]);

  const handleLeaveGroupClick = useCallback(() => {
    setIsOpen(false);
    setIsLeaveDialogOpen(true);
  }, []);

  const handleManageGroupClick = useCallback(() => {
    setIsOpen(false);
    openGroupManager(conversationId);
  }, [conversationId, openGroupManager]);

  const handleLeaveGroupCancel = useCallback(() => {
    setIsLeaveDialogOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const handleLeaveGroupConfirm = useCallback(() => {
    setIsLeaveDialogOpen(false);
    dispatch(entryActions.leaveChatConversation(conversationId));
  }, [conversationId, dispatch]);

  const portalTarget = document.getElementById('app') || document.body;

  return (
    <>
      <span data-chat-row-actions className={`${styles.actions} ${isOpen ? styles.open : ''}`}>
        <button
          ref={buttonRef}
          type="button"
          className={`${styles.actionButton} ${isMuted ? styles.muted : ''}`}
          aria-label={t('chat.conversationActions')}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => setIsOpen((value) => !value)}
        >
          <MoreHorizontal aria-hidden="true" size={17} strokeWidth={2} />
        </button>
        {isOpen &&
          createPortal(
            <div
              ref={menuRef}
              className={styles.menu}
              role="menu"
              aria-label={t('chat.conversationActions')}
              style={{ left: position.left, top: position.top }}
            >
              <span className={styles.menuLabel}>{t('chat.notifications')}</span>
              <button type="button" role="menuitem" onClick={() => updatePreferences('all')}>
                <Bell aria-hidden="true" size={15} />
                {t('chat.notifyAll')}
              </button>
              <button type="button" role="menuitem" onClick={() => updatePreferences('mentions')}>
                <AtSign aria-hidden="true" size={15} />
                {t('chat.notifyMentions')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  updatePreferences(
                    participant?.notificationLevel || 'all',
                    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                  )
                }
              >
                <Clock3 aria-hidden="true" size={15} />
                {t('chat.muteOneHour')}
              </button>
              <button type="button" role="menuitem" onClick={muteUntilEndOfDay}>
                <Clock3 aria-hidden="true" size={15} />
                {t('chat.muteUntilTomorrow')}
              </button>
              <button type="button" role="menuitem" onClick={() => updatePreferences('none')}>
                <BellOff aria-hidden="true" size={15} />
                {t('chat.mutePermanently')}
              </button>
              {isMuted && (
                <button type="button" role="menuitem" onClick={() => updatePreferences('all')}>
                  <Bell aria-hidden="true" size={15} />
                  {t('chat.unmute')}
                </button>
              )}
              {canLeave && (
                <>
                  <span className={styles.menuDivider} aria-hidden="true" />
                  {canManage && (
                    <button type="button" role="menuitem" onClick={handleManageGroupClick}>
                      <Users aria-hidden="true" size={15} />
                      {t('chat.manageGroup')}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.destructiveAction}
                    onClick={handleLeaveGroupClick}
                  >
                    <LogOut aria-hidden="true" size={15} />
                    {t('chat.leaveGroup')}
                  </button>
                </>
              )}
            </div>,
            portalTarget,
          )}
      </span>
      <AlertDialog
        cancelLabel={t('action.cancel')}
        confirmLabel={t('chat.leaveGroup')}
        description={t('chat.confirmLeaveGroup', { group: conversationTitle })}
        open={isLeaveDialogOpen}
        title={t('chat.leaveGroup')}
        tone="danger"
        onCancel={handleLeaveGroupCancel}
        onConfirm={handleLeaveGroupConfirm}
      />
    </>
  );
});

ConversationActions.propTypes = {
  canLeave: PropTypes.bool,
  conversationId: PropTypes.string.isRequired,
  conversationTitle: PropTypes.string,
  isMuted: PropTypes.bool,
  participant: PropTypes.shape({
    notificationLevel: PropTypes.string,
    role: PropTypes.string,
  }),
};

ConversationActions.defaultProps = {
  canLeave: false,
  conversationTitle: undefined,
  isMuted: false,
  participant: undefined,
};

export default ConversationActions;
