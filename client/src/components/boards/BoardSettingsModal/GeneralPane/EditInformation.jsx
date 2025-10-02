/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { useForm, useNestedRef } from '../../../../hooks';

import styles from './EditInformation.module.scss';

const EditInformation = React.memo(() => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const boardId = useSelector(
    state => selectors.selectCurrentModal(state).params.id
  );
  const board = useSelector(state => selectBoardById(state, boardId));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const defaultData = useMemo(
    () => ({
      name: board.name,
      progressBarEnabled: board.progressBarEnabled || false,
      progressBarPercentage: board.progressBarPercentage || 0,
    }),
    [board.name, board.progressBarEnabled, board.progressBarPercentage]
  );

  const [data, handleFieldChange] = useForm(() => ({
    name: '',
    progressBarEnabled: false,
    progressBarPercentage: 0,
    ...defaultData,
  }));

  const cleanData = useMemo(
    () => ({
      ...data,
      name: data.name.trim(),
      progressBarEnabled: data.progressBarEnabled,
      progressBarPercentage: parseInt(data.progressBarPercentage, 10) || 0,
    }),
    [data]
  );

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    if (!cleanData.name) {
      nameFieldRef.current.select();
      return;
    }

    if (cleanData.progressBarEnabled) {
      const percentage = parseInt(cleanData.progressBarPercentage, 10);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return;
      }
    }

    dispatch(entryActions.updateBoard(boardId, cleanData));
  }, [boardId, dispatch, cleanData, nameFieldRef]);

  return (
    <Form onSubmit={handleSubmit}>
      <div className={styles.text}>{t('common.title')}</div>
      <div className={classNames(styles.field, styles.darkInput)}>
        <Input
          fluid
          ref={handleNameFieldRef}
          name="name"
          value={data.name}
          maxLength={128}
          onChange={handleFieldChange}
        />
      </div>
      
      <Form.Field>
        <label>{t('common.progressBar')}</label>
        <Form.Checkbox
          toggle
          checked={data.progressBarEnabled}
          label={t('common.enableProgressBar')}
          name="progressBarEnabled"
          onChange={handleFieldChange}
        />
      </Form.Field>
      
      {data.progressBarEnabled && (
        <Form.Field className={styles.darkInput}>
          <label>{t('common.progressPercentage')}</label>
          <div className={styles.sliderRow}>
            <input
              className={styles.slider}
              type="range"
              min="0"
              max="100"
              step="1"
              name="progressBarPercentage"
              value={data.progressBarPercentage}
              onChange={(e) =>
                handleFieldChange(e, {
                  type: 'range',
                  name: 'progressBarPercentage',
                  value: e.target.value,
                })
              }
            />
            <div className={styles.sliderValue}>{data.progressBarPercentage}%</div>
          </div>
        </Form.Field>
      )}
      
      <Button
        positive
        disabled={dequal(cleanData, defaultData)}
        content={t('action.save')}
      />
    </Form>
  );
});

export default EditInformation;
