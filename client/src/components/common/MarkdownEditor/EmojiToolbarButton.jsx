import React, { Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Smile } from 'lucide-react';

import LazyEmojiPicker, {
  EMOJI_CATEGORY_ICONS,
  EMOJI_PICKER_CLASS_NAME,
  EMOJI_PICKER_HEIGHT,
  EMOJI_PICKER_WIDTH,
} from '../../chat/LazyEmojiPicker';
import { getReactionEmojiPickerPosition } from '../../chat/reaction-utils';

import styles from './EmojiToolbarButton.module.scss';

const EmojiToolbarButton = React.memo(({ onEmojiSelect }) => {
  const [t] = useTranslation();
  const menuId = useId();
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);
  const isOpen = Boolean(position);

  const close = useCallback(({ restoreFocus = false } = {}) => {
    setPosition(null);

    if (restoreFocus) {
      buttonRef.current?.focus();
    }
  }, []);

  const handleToggle = useCallback(() => {
    setPosition((currentPosition) =>
      currentPosition
        ? null
        : getReactionEmojiPickerPosition(
            buttonRef.current,
            EMOJI_PICKER_WIDTH,
            EMOJI_PICKER_HEIGHT,
          ),
    );
  }, []);

  const handleEmojiClick = useCallback(
    ({ emoji }) => {
      onEmojiSelect(emoji);
      close();
    },
    [close, onEmojiSelect],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) {
        return;
      }

      close();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close({ restoreFocus: true });
      }
    };
    const handleViewportChange = () => close();

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [close, isOpen]);

  const portalTarget = document.getElementById('app');

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t('chat.addEmoji')}
        title={t('chat.addEmoji')}
        className={styles.button}
        onClick={handleToggle}
      >
        <Smile aria-hidden="true" size={18} strokeWidth={1.9} />
      </button>
      {isOpen &&
        portalTarget &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="dialog"
            aria-label={t('chat.chooseEmoji')}
            className={styles.menu}
            style={position}
          >
            <Suspense fallback={null}>
              <LazyEmojiPicker
                categoryIcons={EMOJI_CATEGORY_ICONS}
                className={EMOJI_PICKER_CLASS_NAME}
                theme="dark"
                width={EMOJI_PICKER_WIDTH}
                height={EMOJI_PICKER_HEIGHT}
                previewConfig={{ showPreview: false }}
                searchPlaceholder={t('chat.searchEmoji')}
                onEmojiClick={handleEmojiClick}
              />
            </Suspense>
          </div>,
          portalTarget,
        )}
    </>
  );
});

EmojiToolbarButton.propTypes = {
  onEmojiSelect: PropTypes.func.isRequired,
};

export default EmojiToolbarButton;
