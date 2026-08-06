/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Message } from 'semantic-ui-react';

import api from '../../../api/password-resets';
import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import { Input } from '../../../lib/custom-ui';
import PublicAuthLayout from './PublicAuthLayout';
import styles from './Content.module.scss';

const PasswordResetRequest = React.memo(() => {
  const config = useSelector(selectors.selectConfig);
  const [t] = useTranslation();
  const inputRef = useRef();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasAccepted, setWasAccepted] = useState(false);
  const [error, setError] = useState(null);
  const isInvalid = Boolean(email && !isEmail(email.trim()));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedEmail = email.trim();
    if (!isEmail(normalizedEmail)) {
      inputRef.current?.select();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.requestPasswordReset(normalizedEmail);
      setWasAccepted(true);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

  let content;
  if (!config.passwordResetEnabled) {
    content = <Message warning role="status" content={t('common.passwordResetUnavailable')} />;
  } else if (wasAccepted) {
    content = <Message success role="status" content={t('common.passwordResetRequestAccepted')} />;
  } else {
    content = (
      <>
        <p className={styles.helperText}>{t('common.passwordResetRequestDescription')}</p>
        {error && <Message error role="alert" content={t('common.passwordResetRequestFailed')} />}
        <Form aria-busy={isSubmitting} onSubmit={handleSubmit}>
          <div className={styles.inputWrapper}>
            <label className={styles.inputLabel} htmlFor="password-reset-email">
              {t('common.email')}
            </label>
            <Input
              fluid
              id="password-reset-email"
              inputRef={inputRef}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              maxLength={256}
              required
              readOnly={isSubmitting}
              aria-invalid={isInvalid}
              className={styles.input}
              onChange={(_, data) => setEmail(data.value)}
            />
          </div>
          <Form.Button
            fluid
            primary
            type="submit"
            content={t('action.sendPasswordResetLink')}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </Form>
      </>
    );
  }

  return (
    <PublicAuthLayout title={t('common.forgotPassword_title')}>
      {content}
      <p className={styles.authLink}>
        <Link to={Paths.LOGIN}>{t('action.backToLogin')}</Link>
      </p>
    </PublicAuthLayout>
  );
});

export default PasswordResetRequest;
