import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { getTabBadgeText, getTabTitle } from './tab-notification';

const BADGE_COLOR = '#0485f7';
const BADGE_TEXT_COLOR = '#f7faff';
const FAVICON_SIZE = 32;
const PULSE_FRAME_MS = 180;
const PULSE_DURATION_MS = 900;

const TabNotification = React.memo(({ title, unreadMessageTotal, lastMessageAlert }) => {
  const faviconRef = useRef(null);
  const originalFaviconHrefRef = useRef(null);
  const faviconImageRef = useRef(null);
  const handledAlertMessageIdRef = useRef(null);
  const pulseIntervalRef = useRef(null);
  const pulseTimeoutRef = useRef(null);
  const [isFaviconReady, setIsFaviconReady] = useState(false);

  const clearPulse = useCallback(() => {
    if (pulseIntervalRef.current) {
      window.clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    if (pulseTimeoutRef.current) {
      window.clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }
  }, []);

  const updateFavicon = useCallback((count, isPulsing = false) => {
    if (!faviconRef.current || !faviconImageRef.current) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.drawImage(faviconImageRef.current, 0, 0, FAVICON_SIZE, FAVICON_SIZE);

    if (count > 0) {
      const text = getTabBadgeText(count);
      const badgeRadius = text.length > 1 ? 9 : 7;
      const badgeX = FAVICON_SIZE - badgeRadius;
      const badgeY = badgeRadius;

      if (isPulsing) {
        context.beginPath();
        context.fillStyle = 'rgba(4, 133, 247, 0.32)';
        context.arc(badgeX, badgeY, badgeRadius + 4, 0, Math.PI * 2);
        context.fill();
      }

      context.beginPath();
      context.fillStyle = BADGE_COLOR;
      context.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = BADGE_TEXT_COLOR;
      context.font = `bold ${text.length > 1 ? 12 : 14}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, badgeX, badgeY + 0.5);
    }

    faviconRef.current.href = canvas.toDataURL('image/png');
  }, []);

  useEffect(() => {
    const favicon = document.querySelector('link[rel~="icon"]');
    if (!favicon) {
      return undefined;
    }

    faviconRef.current = favicon;
    originalFaviconHrefRef.current = favicon.href;

    const image = new Image();
    image.onload = () => {
      faviconImageRef.current = image;
      setIsFaviconReady(true);
    };
    image.src = originalFaviconHrefRef.current;

    return () => {
      clearPulse();
      if (originalFaviconHrefRef.current) {
        favicon.href = originalFaviconHrefRef.current;
      }
    };
  }, [clearPulse]);

  useEffect(() => {
    document.title = getTabTitle(title, unreadMessageTotal);
  }, [title, unreadMessageTotal]);

  useEffect(() => {
    clearPulse();
    updateFavicon(unreadMessageTotal);
  }, [clearPulse, isFaviconReady, unreadMessageTotal, updateFavicon]);

  useEffect(() => {
    const messageId = lastMessageAlert?.messageId;
    if (
      !messageId ||
      messageId === handledAlertMessageIdRef.current ||
      !isFaviconReady ||
      unreadMessageTotal === 0
    ) {
      return undefined;
    }

    handledAlertMessageIdRef.current = messageId;
    if (!document.hidden) {
      return undefined;
    }

    let isPulsing = true;
    updateFavicon(unreadMessageTotal, isPulsing);
    pulseIntervalRef.current = window.setInterval(() => {
      isPulsing = !isPulsing;
      updateFavicon(unreadMessageTotal, isPulsing);
    }, PULSE_FRAME_MS);
    pulseTimeoutRef.current = window.setTimeout(() => {
      clearPulse();
      updateFavicon(unreadMessageTotal);
    }, PULSE_DURATION_MS);

    return clearPulse;
  }, [clearPulse, isFaviconReady, lastMessageAlert, unreadMessageTotal, updateFavicon]);

  return null;
});

TabNotification.propTypes = {
  title: PropTypes.string.isRequired,
  unreadMessageTotal: PropTypes.number.isRequired,
  lastMessageAlert: PropTypes.shape({
    messageId: PropTypes.string,
  }),
};

TabNotification.defaultProps = {
  lastMessageAlert: undefined,
};

export default TabNotification;
