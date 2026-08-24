/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Form, Icon, TextArea } from 'semantic-ui-react';
import { Button } from '../../../lib/custom-ui';
import { useClickAwayListener, useDidUpdate, useToggle } from '../../../lib/hooks';

import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import { focusEnd } from '../../../utils/element-helpers';
import { isModifierKeyPressed } from '../../../utils/event-helpers';

import styles from './AddTask.module.scss';

const DEFAULT_DATA = {
  name: '',
};

const MULTIPLE_REGEX = /\s*\r?\n\s*/;

const AddTask = React.memo((props) => {
  const { children, taskListId, parentTaskId, parentTaskName, isOpened, onClose } = props;
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [data, handleFieldChange, setData] = useForm(DEFAULT_DATA);
  const [focusNameFieldState, focusNameField] = useToggle();

  const [nameFieldRef, handleNameFieldRef] = useNestedRef();
  const [buttonRef, handleButtonRef] = useNestedRef();
  const [cancelButtonRef, handleCancelButtonRef] = useNestedRef();

  const submit = useCallback(
    (isMultiple = false) => {
      const cleanData = {
        ...data,
        name: data.name.trim(),
      };

      if (!cleanData.name) {
        nameFieldRef.current.select();
        return;
      }

      if (isMultiple) {
        cleanData.name.split(MULTIPLE_REGEX).forEach((name) => {
          dispatch(
            entryActions.createTask(taskListId, {
              ...cleanData,
              name,
              parentTaskId,
            }),
          );
        });
      } else {
        dispatch(entryActions.createTask(taskListId, { ...cleanData, parentTaskId }));
      }

      setData(DEFAULT_DATA);
      focusNameField();
    },
    [taskListId, parentTaskId, dispatch, data, setData, focusNameField, nameFieldRef],
  );

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleFieldKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit(isModifierKeyPressed(event));
      } else if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose, submit],
  );

  const handleClickAwayCancel = useCallback(() => {
    nameFieldRef.current.focus();
  }, [nameFieldRef]);

  const clickAwayProps = useClickAwayListener(
    [nameFieldRef, buttonRef, cancelButtonRef],
    onClose,
    handleClickAwayCancel,
  );

  useEffect(() => {
    if (isOpened) {
      focusEnd(nameFieldRef.current);
    }
  }, [isOpened, nameFieldRef]);

  useDidUpdate(() => {
    nameFieldRef.current.focus();
  }, [focusNameFieldState]);

  if (!isOpened) {
    return children;
  }

  return (
    <Form className={styles.wrapper} onSubmit={handleSubmit}>
      {parentTaskId && (
        <div className={styles.context} title={parentTaskName}>
          <Icon fitted name="level down alternate" className={styles.contextIcon} />
          <span className={styles.contextText}>
            {t('common.newSubtaskOf', { task: parentTaskName })}
          </span>
        </div>
      )}
      <TextArea
        {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
        ref={handleNameFieldRef}
        as={TextareaAutosize}
        name="name"
        value={data.name}
        placeholder={t(
          parentTaskId ? 'common.enterSubtaskDescription' : 'common.enterTaskDescription',
        )}
        maxLength={1024}
        minRows={2}
        spellCheck={false}
        className={styles.field}
        onKeyDown={handleFieldKeyDown}
        onChange={handleFieldChange}
      />
      <div className={styles.controls}>
        <Button
          {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
          variant="primary"
          ref={handleButtonRef}
          content={t(parentTaskId ? 'action.addSubtask' : 'action.addTask')}
          className={styles.submitButton}
        />
        {parentTaskId && (
          <Button
            {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
            variant="secondary"
            type="button"
            ref={handleCancelButtonRef}
            content={t('action.cancel')}
            className={styles.cancelButton}
            onClick={onClose}
          />
        )}
      </div>
    </Form>
  );
});

AddTask.propTypes = {
  children: PropTypes.element.isRequired,
  taskListId: PropTypes.string.isRequired,
  parentTaskId: PropTypes.string,
  parentTaskName: PropTypes.string,
  isOpened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

AddTask.defaultProps = {
  parentTaskId: undefined,
  parentTaskName: undefined,
};

export default AddTask;
