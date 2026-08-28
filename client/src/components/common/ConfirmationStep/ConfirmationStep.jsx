/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'semantic-ui-react';
import { AlertDialog } from '../../../lib/custom-ui';

import { useForm, useNestedRef } from '../../../hooks';

const ButtonVariants = {
  DANGER: 'danger',
  PRIMARY: 'primary',
};

const ConfirmationStep = React.memo(
  ({
    title,
    content,
    contentValues,
    buttonContent,
    variant,
    typeValue,
    typeContent,
    onConfirm,
    onBack,
    onClose,
  }) => {
    const [t] = useTranslation();

    const [data, handleFieldChange] = useForm({
      typeValue: '',
    });

    const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

    const handleSubmit = useCallback(() => {
      if (typeValue) {
        const cleanData = {
          ...data,
          typeValue: data.typeValue.trim(),
        };

        if (cleanData.typeValue.toLowerCase() !== typeValue.toLowerCase()) {
          nameFieldRef.current.select();
          return;
        }
      }

      onConfirm();
    }, [typeValue, onConfirm, data, nameFieldRef]);

    useEffect(() => {
      if (typeValue) {
        nameFieldRef.current.select();
      }
    }, [typeValue, nameFieldRef]);

    return (
      <AlertDialog
        cancelLabel={t('action.cancel')}
        confirmLabel={t(buttonContent)}
        description={
          <>
            <p>{t(content, contentValues)}</p>
            {typeContent && <p>{t(typeContent)}</p>}
          </>
        }
        initialFocusRef={typeValue ? nameFieldRef : undefined}
        open
        title={t(title, {
          context: 'title',
        })}
        tone={variant === ButtonVariants.DANGER ? 'danger' : 'accent'}
        onCancel={onBack || onClose}
        onConfirm={handleSubmit}
      >
        {typeValue && (
          <Form onSubmit={handleSubmit}>
            <Input
              fluid
              ref={handleNameFieldRef}
              name="typeValue"
              value={data.typeValue}
              placeholder={typeValue}
              maxLength={128}
              onChange={handleFieldChange}
            />
          </Form>
        )}
      </AlertDialog>
    );
  },
);

ConfirmationStep.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  contentValues: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  ),
  buttonContent: PropTypes.string.isRequired,
  typeValue: PropTypes.string,
  typeContent: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func,
  variant: PropTypes.oneOf(Object.values(ButtonVariants)),
};

ConfirmationStep.defaultProps = {
  contentValues: undefined,
  typeValue: undefined,
  typeContent: undefined,
  onBack: undefined,
  onClose: undefined,
  variant: ButtonVariants.DANGER,
};

export default ConfirmationStep;
