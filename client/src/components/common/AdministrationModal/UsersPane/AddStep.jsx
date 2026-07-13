/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Form, Message } from 'semantic-ui-react';
import { useDidUpdate, usePrevious } from '../../../../lib/hooks';
import { Input, Popup } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import locales from '../../../../locales';
import { useForm, useNestedRef } from '../../../../hooks';
import { WelcomeEmailLanguages } from '../../../../constants/Enums';

import styles from './AddStep.module.scss';

const createMessage = (error) => {
  if (!error) {
    return error;
  }

  switch (error.message) {
    case 'Email already in use':
      return {
        type: 'error',
        content: 'common.emailAlreadyInUse',
      };
    default:
      return {
        type: 'warning',
        content: 'common.unknownError',
      };
  }
};

const languageOptions = locales
  .filter((locale) => WelcomeEmailLanguages.includes(locale.language))
  .map((locale) => ({
    value: locale.language,
    flag: locale.country,
    text: locale.name,
  }));

const AddStep = React.memo(({ onClose }) => {
  const {
    data: defaultData,
    isSubmitting,
    error,
    createdUserId,
    welcomeEmailSent,
  } = useSelector(selectors.selectUserCreateForm);

  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);
  const createdUser = useSelector((state) =>
    createdUserId ? selectUserById(state, createdUserId) : null,
  );
  const resendForm = createdUser?.welcomeEmailResendForm;

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const wasSubmitting = usePrevious(isSubmitting);
  const wasResending = usePrevious(resendForm?.isSubmitting);

  const [data, handleFieldChange] = useForm(() => ({
    email: '',
    name: '',
    language: 'pt-PT',
    ...defaultData,
  }));

  const message = useMemo(() => createMessage(error), [error]);

  const [emailFieldRef, handleEmailFieldRef] = useNestedRef('inputRef');
  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const cleanData = {
      email: data.email.trim(),
      name: data.name.trim(),
      language: data.language,
    };

    if (!cleanData.name) {
      nameFieldRef.current.select();
      return;
    }

    if (!isEmail(cleanData.email)) {
      emailFieldRef.current.select();
      return;
    }

    dispatch(entryActions.createUser(cleanData));
  }, [dispatch, data, emailFieldRef, nameFieldRef]);

  const handleMessageDismiss = useCallback(() => {
    dispatch(entryActions.clearUserCreateError());
  }, [dispatch]);

  const handleResendClick = useCallback(() => {
    dispatch(entryActions.resendUserWelcomeEmail(createdUserId));
  }, [createdUserId, dispatch]);

  useEffect(() => {
    nameFieldRef.current.focus({
      preventScroll: true,
    });
  }, [nameFieldRef]);

  useEffect(
    () => () => {
      dispatch(entryActions.clearUserCreateError());
    },
    [dispatch],
  );

  useDidUpdate(() => {
    if (wasSubmitting && !isSubmitting) {
      if (error) {
        if (error.message === 'Email already in use') {
          emailFieldRef.current.select();
        }
      } else if (welcomeEmailSent) {
        onClose();
      }
    }
  }, [onClose, isSubmitting, wasSubmitting, error, welcomeEmailSent]);

  useDidUpdate(() => {
    if (wasResending && !resendForm?.isSubmitting && resendForm?.wasSent) {
      onClose();
    }
  }, [onClose, wasResending, resendForm]);

  if (createdUserId && welcomeEmailSent === false) {
    return (
      <>
        <Popup.Header>
          {t('common.userCreatedEmailPending', {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <Message warning visible content={t('common.userCreatedButWelcomeEmailFailed')} />
          {resendForm?.wasSent === false && (
            <Message error visible content={t('common.welcomeEmailResendFailed')} />
          )}
          <Button
            positive
            content={t('action.resendWelcomeEmail')}
            loading={resendForm?.isSubmitting}
            disabled={resendForm?.isSubmitting}
            onClick={handleResendClick}
          />
          <Button content={t('action.close')} onClick={onClose} />
        </Popup.Content>
      </>
    );
  }

  return (
    <>
      <Popup.Header>
        {t('common.addUser', {
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
          <div className={styles.text}>{t('common.name')}</div>
          <Input
            fluid
            ref={handleNameFieldRef}
            name="name"
            value={data.name}
            maxLength={128}
            readOnly={isSubmitting}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.text}>{t('common.email')}</div>
          <Input
            fluid
            ref={handleEmailFieldRef}
            name="email"
            value={data.email}
            maxLength={256}
            readOnly={isSubmitting}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.text}>{t('common.welcomeEmailLanguage')}</div>
          <Dropdown
            fluid
            selection
            name="language"
            options={languageOptions}
            value={data.language}
            disabled={isSubmitting}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.controls}>
            <Button
              positive
              content={t('action.addUser')}
              loading={isSubmitting}
              disabled={isSubmitting}
              className={styles.button}
            />
          </div>
        </Form>
      </Popup.Content>
    </>
  );
});

AddStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AddStep;
