/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Form } from 'semantic-ui-react';
import { Button, Input, Popup } from '../../../lib/custom-ui';

import { useField, useNestedRef } from '../../../hooks';

import styles from './SaveFilterStep.module.scss';

const SaveFilterStep = React.memo(({ onCreate, onClose }) => {
  const [t] = useTranslation();
  const [name, handleNameChange] = useField('');

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const cleanName = name.trim();

    if (!cleanName) {
      nameFieldRef.current.select();
      return;
    }

    onCreate(cleanName);
    onClose();
  }, [name, nameFieldRef, onCreate, onClose]);

  useEffect(() => {
    nameFieldRef.current.focus({
      preventScroll: true,
    });
  }, [nameFieldRef]);

  return (
    <>
      <Popup.Header>
        {t('common.saveFilter', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <Input
            fluid
            ref={handleNameFieldRef}
            value={name}
            placeholder={t('common.filterName')}
            maxLength={64}
            onChange={handleNameChange}
          />
          <Button variant="primary" content={t('action.save')} className={styles.submitButton} />
        </Form>
      </Popup.Content>
    </>
  );
});

SaveFilterStep.propTypes = {
  onCreate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SaveFilterStep;
