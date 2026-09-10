/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import omit from 'lodash/omit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Form, Message } from 'semantic-ui-react';
import { useDidUpdate, usePrevious, useToggle } from '../../../lib/hooks';
import { Button, Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import { isPassword } from '../../../utils/validator';
import api from '../../../api';
import { UserRoles } from '../../../constants/Enums';

import styles from './EditUserPasswordStep.module.scss';

const createMessage = (error) => {
  if (!error) {
    return error;
  }

  switch (error.message) {
    case 'Invalid current password':
      return {
        type: 'error',
        content: 'common.invalidCurrentPassword',
      };
    default:
      return {
        type: 'warning',
        content: 'common.unknownError',
      };
  }
};

const EditUserPasswordStep = React.memo(({ id, withPasswordConfirmation, onBack, onClose }) => {
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);
  const isAdmin = useSelector(
    (state) => selectors.selectCurrentUser(state).role === UserRoles.ADMIN,
  );
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const accessToken = useSelector(selectors.selectAccessToken);

  const {
    data: defaultData,
    isSubmitting,
    error,
  } = useSelector((state) => selectUserById(state, id).passwordUpdateForm);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const wasSubmitting = usePrevious(isSubmitting);

  const [data, handleFieldChange, setData] = useForm({
    password: '',
    currentPassword: '',
    ...defaultData,
  });

  const message = useMemo(() => createMessage(error), [error]);
  const [focusCurrentPasswordFieldState, focusCurrentPasswordField] = useToggle();

  const [passwordFieldRef, handlePasswordFieldRef] = useNestedRef('inputRef');
  const [currentPasswordFieldRef, handleCurrentPasswordFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    if (isGeneratingPassword) {
      return;
    }

    if (!data.password || !isPassword(data.password)) {
      passwordFieldRef.current.select();
      return;
    }

    if (withPasswordConfirmation && !data.currentPassword) {
      currentPasswordFieldRef.current.focus();
      return;
    }

    dispatch(
      entryActions.updateUserPassword(
        id,
        withPasswordConfirmation ? data : omit(data, 'currentPassword'),
      ),
    );
  }, [
    id,
    withPasswordConfirmation,
    dispatch,
    data,
    passwordFieldRef,
    currentPasswordFieldRef,
    isGeneratingPassword,
  ]);

  const handleMessageDismiss = useCallback(() => {
    dispatch(entryActions.clearUserPasswordUpdateError(id));
  }, [id, dispatch]);

  const handleGeneratePassword = useCallback(async () => {
    setIsGeneratingPassword(true);
    setPasswordFeedback(null);
    try {
      const {
        item: { password },
      } = await api.generateUserPassword({
        Authorization: `Bearer ${accessToken}`,
      });
      setData((prevData) => ({ ...prevData, password }));
    } catch {
      setPasswordFeedback('common.passwordGenerationFailed');
    } finally {
      setIsGeneratingPassword(false);
    }
  }, [setData, accessToken]);

  const handleCopyPassword = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.password);
      setPasswordFeedback('common.passwordCopied');
    } catch {
      setPasswordFeedback('common.passwordCopyFailed');
      passwordFieldRef.current.select();
    }
  }, [data.password, passwordFieldRef]);

  useEffect(() => {
    setPasswordFeedback(null);
  }, [data.password]);

  useEffect(() => {
    passwordFieldRef.current.focus({
      preventScroll: true,
    });
  }, [passwordFieldRef]);

  useDidUpdate(() => {
    if (wasSubmitting && !isSubmitting) {
      if (!error) {
        onClose();
      } else if (error.message === 'Invalid current password') {
        setData((prevData) => ({
          ...prevData,
          currentPassword: '',
        }));
        focusCurrentPasswordField();
      }
    }
  }, [isSubmitting, wasSubmitting, error, onClose]);

  useDidUpdate(() => {
    currentPasswordFieldRef.current.focus();
  }, [focusCurrentPasswordFieldState]);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.editPassword', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        {message && (
          <Message
            {...{
              [message.type]: true,
            }}
            visible
            content={t(message.content)}
            onDismiss={handleMessageDismiss}
          />
        )}
        <Form onSubmit={handleSubmit}>
          <div className={styles.text}>{t('common.newPassword')}</div>
          <Input.Password
            withStrengthBar
            fluid
            ref={handlePasswordFieldRef}
            name="password"
            aria-label={t('common.newPassword')}
            autoComplete="new-password"
            disabled={isGeneratingPassword}
            value={data.password}
            maxLength={256}
            className={styles.field}
            onChange={handleFieldChange}
          />
          {isAdmin && !withPasswordConfirmation && (
            <>
              <div className={styles.passwordActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  content={t('common.generateSecurePassword')}
                  loading={isGeneratingPassword}
                  disabled={isSubmitting || isGeneratingPassword}
                  onClick={handleGeneratePassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  content={t('common.copyPassword')}
                  disabled={isSubmitting || isGeneratingPassword || !data.password}
                  onClick={handleCopyPassword}
                />
              </div>
              {passwordFeedback && (
                <div role="status" className={styles.passwordFeedback}>
                  {t(passwordFeedback)}
                </div>
              )}
            </>
          )}
          {withPasswordConfirmation && (
            <>
              <div className={styles.text}>{t('common.currentPassword')}</div>
              <Input.Password
                fluid
                ref={handleCurrentPasswordFieldRef}
                name="currentPassword"
                value={data.currentPassword}
                maxLength={256}
                className={styles.field}
                onChange={handleFieldChange}
              />
            </>
          )}
          <Button
            variant="primary"
            content={t('action.save')}
            loading={isSubmitting}
            disabled={isSubmitting || isGeneratingPassword}
          />
        </Form>
      </Popup.Content>
    </>
  );
});

EditUserPasswordStep.propTypes = {
  id: PropTypes.string.isRequired,
  withPasswordConfirmation: PropTypes.bool,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

EditUserPasswordStep.defaultProps = {
  withPasswordConfirmation: false,
  onBack: undefined,
};

export default EditUserPasswordStep;
