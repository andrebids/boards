import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { AtSign, Bell, BellOff, Clock3, MoreHorizontal } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';

import styles from './ConversationActions.module.scss';

const MENU_GAP = 6;
const VIEWPORT_GAP = 8;

const ConversationActions = React.memo(({ conversationId, isMuted, participant }) => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || 230;
    const menuHeight = menuRef.current?.offsetHeight || 250;
    const left = Math.max(
      VIEWPORT_GAP,
      Math.min(
        buttonRect.right - menuWidth,
        window.innerWidth - menuWidth - VIEWPORT_GAP,
      ),
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
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
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
    updatePreferences(
      participant?.notificationLevel || 'all',
      date.toISOString(),
    );
  }, [participant?.notificationLevel, updatePreferences]);

  const portalTarget = document.getElementById('app') || document.body;

  return (
    <span
      data-chat-row-actions
      className={`${styles.actions} ${isOpen ? styles.open : ''}`}
    >
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
            aria-label={t('chat.notificationPreferences')}
            style={{ left: position.left, top: position.top }}
          >
            <span className={styles.menuLabel}>{t('chat.notifications')}</span>
            <button
              type="button"
              role="menuitem"
              onClick={() => updatePreferences('all')}
            >
              <Bell aria-hidden="true" size={15} />
              {t('chat.notifyAll')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => updatePreferences('mentions')}
            >
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
            <button
              type="button"
              role="menuitem"
              onClick={() => updatePreferences('none')}
            >
              <BellOff aria-hidden="true" size={15} />
              {t('chat.mutePermanently')}
            </button>
            {isMuted && (
              <button
                type="button"
                role="menuitem"
                onClick={() => updatePreferences('all')}
              >
                <Bell aria-hidden="true" size={15} />
                {t('chat.unmute')}
              </button>
            )}
          </div>,
          portalTarget,
        )}
    </span>
  );
});

ConversationActions.propTypes = {
  conversationId: PropTypes.string.isRequired,
  isMuted: PropTypes.bool,
  participant: PropTypes.shape({
    notificationLevel: PropTypes.string,
  }),
};

ConversationActions.defaultProps = {
  isMuted: false,
  participant: undefined,
};

export default ConversationActions;
