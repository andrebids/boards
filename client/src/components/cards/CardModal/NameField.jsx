/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Mention, MentionsInput } from 'react-mentions';
import camelCase from 'lodash/camelCase';
import { useDidUpdate, usePrevious, useToggle } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useEscapeInterceptor } from '../../../hooks';
import UserAvatar from '../../users/UserAvatar';
import globalStyles from '../../../styles.module.scss';

import styles from './NameField.module.scss';

const Sizes = {
  MEDIUM: 'medium',
  LARGE: 'large',
};

const NameField = React.memo(({ defaultValue, size, onUpdate }) => {
  const [value, setValue] = useState(defaultValue);
  const prevDefaultValue = usePrevious(defaultValue);
  const [blurFieldState, blurField] = useToggle();

  const fieldRef = useRef(null);
  const isFocusedRef = useRef(false);

  const dispatch = useDispatch();
  const users = useSelector(selectors.selectMembershipsForCurrentBoard);
  const labels = useSelector(selectors.selectLabelsForCurrentBoard);

  const handleEscape = useCallback(() => {
    setValue(defaultValue);
    blurField();
  }, [defaultValue, blurField]);

  const [activateEscapeInterceptor, deactivateEscapeInterceptor] =
    useEscapeInterceptor(handleEscape);

  const handleFocus = useCallback(() => {
    activateEscapeInterceptor();
    isFocusedRef.current = true;
  }, [activateEscapeInterceptor]);

  const handleKeyDown = useCallback(
    event => {
      if (event.key === 'Enter') {
        event.preventDefault();

        if (fieldRef.current) {
          fieldRef.current.blur();
        }
      }
    },
    [],
  );

  const handleBlur = useCallback(() => {
    deactivateEscapeInterceptor();
    isFocusedRef.current = false;

    const cleanValue = value.trim();

    if (cleanValue) {
      if (cleanValue !== defaultValue) {
        onUpdate(cleanValue);
      }
    } else {
      setValue(defaultValue);
    }
  }, [defaultValue, onUpdate, value, deactivateEscapeInterceptor]);

  const handleChange = useCallback(
    (event, newValue) => {
      setValue(newValue);
    },
    [],
  );

  const handleUserAdd = useCallback(
    (userId, display) => {
      // eslint-disable-next-line no-console
      console.log('[NameField] Dispatching addUserToCurrentCard with userId:', userId);
      setValue(prevValue => prevValue.replace(`@${display}`, '').trim());
      dispatch(entryActions.addUserToCurrentCard(userId));
    },
    [dispatch],
  );

  const handleLabelAdd = useCallback(
    (labelId, display) => {
      setValue(prevValue => prevValue.replace(`#${display}`, '').trim());
      dispatch(entryActions.addLabelToCurrentCard(labelId));
    },
    [dispatch],
  );

  const userSuggestionRenderer = useCallback(
    (entry, search, highlightedDisplay) => (
      <div className={styles.suggestion}>
        <UserAvatar id={entry.id} size="tiny" />
        {highlightedDisplay}
      </div>
    ),
    [],
  );

  const labelSuggestionRenderer = useCallback(
    (entry, search, highlightedDisplay) => (
      <div className={styles.suggestion}>
        <span
          className={classNames(
            styles.labelSuggestion,
            globalStyles[`background${upperFirst(camelCase(entry.color))}`],
          )}
        />
        {highlightedDisplay}
      </div>
    ),
    [],
  );

  useDidUpdate(() => {
    if (!isFocusedRef.current && defaultValue !== prevDefaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue, prevDefaultValue]);

  useDidUpdate(() => {
    if (fieldRef.current) {
      fieldRef.current.blur();
    }
  }, [blurFieldState]);

  return (
    <MentionsInput
      inputRef={fieldRef}
      value={value}
      maxLength={1024}
      spellCheck={false}
      className={classNames(styles.field, styles[`field${upperFirst(size)}`], 'mentions-input')}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleBlur}
      allowSpaceInQuery
      allowSuggestionsAboveCursor
      style={{
        control: {
          minHeight: 'auto',
        },
        suggestions: {
          list: {
            backgroundColor: 'rgba(14, 17, 23, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            zIndex: 100020,
          },
          item: {
            color: '#e6edf3',
            fontWeight: '600',
            '&focused': {
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#ffffff',
              fontWeight: '700',
            },
          },
        },
      }}
    >
      <Mention
        trigger="@"
        markup="@__display__"
        data={users.map(({ user }) => ({
          id: user.id,
          display: user.username || user.name,
          avatarUrl: user.avatarUrl,
        }))}
        onAdd={handleUserAdd}
        renderSuggestion={userSuggestionRenderer}
        className={styles.mention}
      />
      <Mention
        trigger="#"
        markup="#__display__"
        data={labels.map(label => ({
          id: label.id,
          display: label.name,
          color: label.color,
        }))}
        onAdd={handleLabelAdd}
        renderSuggestion={labelSuggestionRenderer}
        className={styles.mention}
      />
    </MentionsInput>
  );
});

NameField.propTypes = {
  defaultValue: PropTypes.string.isRequired,
  size: PropTypes.oneOf(Object.values(Sizes)),
  onUpdate: PropTypes.func.isRequired,
};

NameField.defaultProps = {
  size: Sizes.MEDIUM,
};

export default NameField;
