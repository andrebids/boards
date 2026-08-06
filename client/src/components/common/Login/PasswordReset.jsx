/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Message } from 'semantic-ui-react';

import api from '../../../api/password-resets';
import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import { Input } from '../../../lib/custom-ui';
import { isPassword } from '../../../utils/validator';
import PublicAuthLayout from './PublicAuthLayout';
import styles from './Content.module.scss';

const PasswordReset = React.memo(() => {
  const config = useSelector(selectors.selectConfig);
  const [t] = useTranslation();
  const navigate = useNavigate();
  const passwordRef = useRef();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasReset, setWasReset] = useState(false);
  const [error, setError] = useState(null);
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), []);
  const passwordsDoNotMatch = Boolean(confirmation && password !== confirmation);
  const passwordIsInvalid = Boolean(password && !isPassword(password));

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!wasReset) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => navigate(Paths.LOGIN, { replace: true }), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [navigate, wasReset]);

  const handleSubmit = useCallback(async () => {
    if (!token || !isPassword(password)) {
      passwordRef.current?.select();
      return;
    }
    if (password !== confirmation) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      window.history.replaceState({}, document.title, Paths.RESET_PASSWORD);
      setWasReset(true);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmation, password, token]);

  let content;
  if (!config.passwordResetEnabled) {
    content = <Message warning role="status" content={t('common.passwordResetUnavailable')} />;
  } else if (!token && !wasReset) {
    content = (
      <Message error role="alert" content={t('common.invalidOrExpiredPasswordResetLink')} />
    );
  } else if (wasReset) {
    content = <Message success role="status" content={t('common.passwordResetSuccessfully')} />;
  } else {
    content = (
      <>
        {error && (
          <Message error role="alert" content={t('common.invalidOrExpiredPasswordResetLink')} />
        )}
        <Form aria-busy={isSubmitting} onSubmit={handleSubmit}>
          <div className={styles.inputWrapper}>
            <label className={styles.inputLabel} htmlFor="new-password">
              {t('common.newPassword')}
            </label>
            <Input.Password
              withStrengthBar
              fluid
              id="new-password"
              inputRef={passwordRef}
              name="password"
              autoComplete="new-password"
              value={password}
              maxLength={256}
              required
              readOnly={isSubmitting}
              aria-invalid={passwordIsInvalid}
              aria-describedby="password-strength-help"
              className={styles.input}
              onChange={(_, data) => setPassword(data.value)}
            />
            <p id="password-strength-help" className={styles.helperText}>
              {t('common.mediumPasswordRequirement')}
            </p>
          </div>
          <div className={styles.inputWrapper}>
            <label className={styles.inputLabel} htmlFor="confirm-new-password">
              {t('common.confirmNewPassword')}
            </label>
            <Input.Password
              fluid
              id="confirm-new-password"
              name="confirmation"
              autoComplete="new-password"
              value={confirmation}
              maxLength={256}
              required
              readOnly={isSubmitting}
              aria-invalid={passwordsDoNotMatch}
              aria-describedby={passwordsDoNotMatch ? 'password-match-error' : undefined}
              className={styles.input}
              onChange={(_, data) => setConfirmation(data.value)}
            />
            {passwordsDoNotMatch && (
              <p id="password-match-error" role="alert" className={styles.errorText}>
                {t('common.passwordsDoNotMatch')}
              </p>
            )}
          </div>
          <Form.Button
            fluid
            primary
            type="submit"
            content={t('action.resetPassword')}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </Form>
      </>
    );
  }

  return (
    <PublicAuthLayout title={t('common.resetPassword_title')}>
      {content}
      <p className={styles.authLink}>
        <Link to={Paths.LOGIN}>{t('action.backToLogin')}</Link>
      </p>
    </PublicAuthLayout>
  );
});

export default PasswordReset;
