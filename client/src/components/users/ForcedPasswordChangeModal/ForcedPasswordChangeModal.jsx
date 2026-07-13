/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form, Message, Modal } from 'semantic-ui-react';
import { useDidUpdate, usePrevious } from '../../../lib/hooks';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import { isPassword } from '../../../utils/validator';

import styles from './ForcedPasswordChangeModal.module.scss';

const ForcedPasswordChangeModal = React.memo(() => {
  const currentUser = useSelector(selectors.selectCurrentUser);
  const { isSubmitting, error } = currentUser.passwordUpdateForm;

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const wasSubmitting = usePrevious(isSubmitting);

  const [data, handleFieldChange, setData] = useForm({
    currentPassword: '',
    password: '',
    passwordConfirmation: '',
  });

  const [currentPasswordFieldRef, handleCurrentPasswordFieldRef] = useNestedRef('inputRef');
  const [passwordFieldRef, handlePasswordFieldRef] = useNestedRef('inputRef');
  const [confirmationFieldRef, handleConfirmationFieldRef] = useNestedRef('inputRef');

  const passwordsDoNotMatch = useMemo(
    () => data.passwordConfirmation.length > 0 && data.password !== data.passwordConfirmation,
    [data.password, data.passwordConfirmation],
  );

  const handleSubmit = useCallback(() => {
    if (!data.currentPassword) {
      currentPasswordFieldRef.current.focus();
      return;
    }

    if (!data.password || !isPassword(data.password)) {
      passwordFieldRef.current.select();
      return;
    }

    if (data.password !== data.passwordConfirmation) {
      confirmationFieldRef.current.select();
      return;
    }

    dispatch(
      entryActions.updateCurrentUserPassword({
        currentPassword: data.currentPassword,
        password: data.password,
      }),
    );
  }, [data, dispatch, currentPasswordFieldRef, passwordFieldRef, confirmationFieldRef]);

  const handleErrorDismiss = useCallback(() => {
    dispatch(entryActions.clearCurrentUserPasswordUpdateError());
  }, [dispatch]);

  useEffect(() => {
    currentPasswordFieldRef.current.focus({
      preventScroll: true,
    });
  }, [currentPasswordFieldRef]);

  useDidUpdate(() => {
    if (wasSubmitting && !isSubmitting && error?.message === 'Invalid current password') {
      setData((prevData) => ({
        ...prevData,
        currentPassword: '',
      }));
      currentPasswordFieldRef.current.focus();
    }
  }, [wasSubmitting, isSubmitting, error, currentPasswordFieldRef, setData]);

  return (
    <Modal
      open
      size="tiny"
      closeOnDimmerClick={false}
      closeOnEscape={false}
      className={styles.wrapper}
    >
      <Modal.Header>{t('common.changeTemporaryPassword_title')}</Modal.Header>
      <Modal.Content>
        <Message info content={t('common.changeTemporaryPasswordDescription')} />
        {error && (
          <Message
            error
            visible
            content={
              error.message === 'Invalid current password'
                ? t('common.invalidCurrentPassword')
                : t('common.unknownError')
            }
            onDismiss={handleErrorDismiss}
          />
        )}
        <Form onSubmit={handleSubmit}>
          <div className={styles.text}>{t('common.temporaryPassword')}</div>
          <Input.Password
            fluid
            ref={handleCurrentPasswordFieldRef}
            name="currentPassword"
            value={data.currentPassword}
            maxLength={256}
            readOnly={isSubmitting}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.text}>{t('common.newPassword')}</div>
          <Input.Password
            withStrengthBar
            fluid
            ref={handlePasswordFieldRef}
            name="password"
            value={data.password}
            maxLength={256}
            readOnly={isSubmitting}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.text}>{t('common.confirmNewPassword')}</div>
          <Input.Password
            fluid
            ref={handleConfirmationFieldRef}
            name="passwordConfirmation"
            value={data.passwordConfirmation}
            maxLength={256}
            readOnly={isSubmitting}
            error={passwordsDoNotMatch}
            className={styles.field}
            onChange={handleFieldChange}
          />
          {passwordsDoNotMatch && (
            <div className={styles.error}>{t('common.passwordsDoNotMatch')}</div>
          )}
          <Button
            positive
            content={t('action.changePassword')}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </Form>
      </Modal.Content>
    </Modal>
  );
});

export default ForcedPasswordChangeModal;
