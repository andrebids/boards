/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import classNames from 'classnames';
import omit from 'lodash/omit';
import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form, Icon, Menu, Radio, Segment } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import { useForm } from '../../../hooks';
import { BoardMembershipRoles } from '../../../constants/Enums';
import { BoardMembershipRoleIcons } from '../../../constants/Icons';

import styles from './SelectPermissionsStep.module.scss';

const DESCRIPTION_BY_ROLE = {
  [BoardMembershipRoles.EDITOR]:
    'common.canEditBoardLayoutAndAssignMembersToCards',
  [BoardMembershipRoles.VIEWER]: 'common.canOnlyViewBoard',
};

const SelectPermissionsStep = React.memo(
  ({ boardMembership, title, buttonContent, onSelect, onBack, onClose }) => {
    const [t] = useTranslation();

    const defaultData = useMemo(
      () =>
        boardMembership && {
          role: boardMembership.role,
          canComment: boardMembership.canComment,
        },
      [boardMembership]
    );

    const [data, handleFieldChange, setData] = useForm(() => ({
      role: BoardMembershipRoles.EDITOR,
      canComment: null,
      ...defaultData,
    }));

    const handleSubmit = useCallback(() => {
      if (!dequal(data, defaultData)) {
        onSelect(
          data.role === BoardMembershipRoles.EDITOR
            ? omit(data, 'canComment')
            : data
        );
      }

      onClose();
    }, [defaultData, onSelect, onClose, data]);

    const handleSelectRoleClick = useCallback(
      (_, { value: role }) => {
        setData(prevData => ({
          ...prevData,
          role,
          canComment:
            role === BoardMembershipRoles.EDITOR ? null : !!prevData.canComment,
        }));
      },
      [setData]
    );

    return (
      <>
        <Popup.Header onBack={onBack}>
          {t(title, {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <Form onSubmit={handleSubmit}>
            <Menu
              secondary
              vertical
              role="radiogroup"
              aria-label={t(title, {
                context: 'title',
              })}
              className={styles.menu}
            >
              {[BoardMembershipRoles.EDITOR, BoardMembershipRoles.VIEWER].map(
                role => {
                  const isSelected = role === data.role;

                  return (
                    <Menu.Item
                      as="button"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      key={role}
                      value={role}
                      active={isSelected}
                      className={classNames(
                        styles.menuItem,
                        isSelected && styles.menuItemSelected,
                      )}
                      onClick={handleSelectRoleClick}
                    >
                      <Icon
                        name={BoardMembershipRoleIcons[role]}
                        className={styles.menuItemIcon}
                      />
                      <span className={styles.menuItemContent}>
                        <span className={styles.menuItemTitle}>
                          {t(`common.${role}`)}
                        </span>
                        <span className={styles.menuItemDescription}>
                          {t(DESCRIPTION_BY_ROLE[role])}
                        </span>
                      </span>
                      {isSelected && (
                        <Icon
                          name="check circle"
                          aria-hidden="true"
                          className={styles.menuItemCheck}
                        />
                      )}
                    </Menu.Item>
                  );
                },
              )}
            </Menu>
            {data.role !== BoardMembershipRoles.EDITOR && (
              <Segment basic className={styles.settings}>
                <Radio
                  toggle
                  name="canComment"
                  checked={data.canComment}
                  label={t('common.canComment')}
                  className={styles.fieldRadio}
                  onChange={handleFieldChange}
                />
              </Segment>
            )}
            <Button positive content={t(buttonContent)} />
          </Form>
        </Popup.Content>
      </>
    );
  }
);

SelectPermissionsStep.propTypes = {
  boardMembership: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  title: PropTypes.string,
  buttonContent: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

SelectPermissionsStep.defaultProps = {
  boardMembership: undefined,
  title: 'common.selectPermissions',
  buttonContent: 'action.selectPermissions',
};

export default SelectPermissionsStep;
