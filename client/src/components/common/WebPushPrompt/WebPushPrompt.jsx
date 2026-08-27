/*! Copyright (c) 2024 PLANKA Software GmbH */

import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { BellRing } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import { useWebPush } from '../../../hooks';
import { Button } from '../../../lib/custom-ui';
import {
  WEB_PUSH_PROMPT_STORAGE_KEY,
  WebPushStates,
  shouldShowWebPushPrompt,
} from '../../../utils/web-push';

import styles from './WebPushPrompt.module.scss';

const WebPushPrompt = React.memo(({ hasRelevantActivity }) => {
  const currentUserId = useSelector(selectors.selectCurrentUserId);
  const [isVisible, setIsVisible] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const {
    activate: activateWebPush,
    setState: setWebPushState,
    state: webPushState,
  } = useWebPush();
  const [t] = useTranslation();

  const storageKey = `${WEB_PUSH_PROMPT_STORAGE_KEY}:${currentUserId}`;

  useEffect(() => {
    if (webPushState !== WebPushStates.INACTIVE) {
      setIsVisible(false);
      return;
    }

    let lastShownAt = null;
    try {
      lastShownAt = window.localStorage.getItem(storageKey);
    } catch (_) {
      // Storage can be unavailable in locked-down browsers; the prompt still works for this visit.
    }

    if (!shouldShowWebPushPrompt({ hasRelevantActivity, lastShownAt })) {
      return;
    }

    setIsVisible(true);
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch (_) {
      // Keep the prompt usable even when persistence is unavailable.
    }
  }, [hasRelevantActivity, storageKey, webPushState]);

  const handleActivate = useCallback(async () => {
    setIsActivating(true);
    setHasError(false);

    try {
      const state = await activateWebPush();
      setWebPushState(state);

      if (
        state === WebPushStates.ACTIVE ||
        state === WebPushStates.BLOCKED ||
        state === WebPushStates.INACTIVE
      ) {
        setIsVisible(false);
      } else {
        setHasError(true);
      }
    } catch (_) {
      setHasError(true);
    } finally {
      setIsActivating(false);
    }
  }, [activateWebPush, setWebPushState]);

  const handleLater = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <aside className={styles.wrapper} aria-labelledby="web-push-prompt-title">
      <span className={styles.icon} aria-hidden="true">
        <BellRing />
      </span>
      <div className={styles.content}>
        <h2 id="web-push-prompt-title" className={styles.title}>
          {t('common.webPushPromptTitle')}
        </h2>
        <p className={styles.description}>{t('common.webPushPromptDescription')}</p>
        {hasError && (
          <p className={styles.error} role="alert">
            {t('common.webPushPromptError')}
          </p>
        )}
      </div>
      <div className={styles.actions}>
        <Button
          type="button"
          size="small"
          variant="primary"
          isPending={isActivating}
          onClick={handleActivate}
        >
          {t('common.webPushPromptActivate')}
        </Button>
        <Button
          type="button"
          size="small"
          variant="ghost"
          isDisabled={isActivating}
          onClick={handleLater}
        >
          {t('common.webPushPromptLater')}
        </Button>
      </div>
    </aside>
  );
});

WebPushPrompt.propTypes = {
  hasRelevantActivity: PropTypes.bool,
};

WebPushPrompt.defaultProps = {
  hasRelevantActivity: false,
};

export default WebPushPrompt;
