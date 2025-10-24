/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon, List, Dropdown } from 'semantic-ui-react';

import selectors from '../../../selectors';
import actions from '../../../actions';

import styles from './MembersTab.module.scss';

const MembersTab = React.memo(({ projectId }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const financeMembers = useSelector(selectors.selectFinanceMembers);
  const currentUser = useSelector(selectors.selectCurrentUser);
  const allUsers = useSelector(selectors.selectActiveUsers);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Usar todos os usuários ativos do sistema
  const projectUsers = allUsers || [];

  // Helper para obter dados do usuário
  const getUserById = useCallback(
    (userId) => {
      return allUsers.find((user) => user.id === userId);
    },
    [allUsers]
  );

  const handleAddMember = useCallback(() => {
    if (selectedUserId) {
      dispatch(actions.addFinanceMember(projectId, selectedUserId));
      setSelectedUserId(null);
    }
  }, [selectedUserId, projectId, dispatch]);

  const handleRemoveMember = useCallback(
    (memberId) => {
      if (
        window.confirm(
          t('finance.confirmRemoveMember', { defaultValue: 'Remover este membro?' }),
        )
      ) {
        dispatch(actions.removeFinanceMember(memberId));
      }
    },
    [dispatch, t],
  );

  const availableUsers = projectUsers.filter(
    (user) => !financeMembers.some((member) => member.userId === user.id),
  );

  const userOptions = availableUsers.map((user) => ({
    key: user.id,
    text: user.name || user.username,
    value: user.id,
  }));

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3>{t('finance.members', { defaultValue: 'Membros com Acesso' })}</h3>
      </div>

      <div className={styles.addMemberSection}>
        <Dropdown
          placeholder={t('finance.selectUser', { defaultValue: 'Selecionar utilizador' })}
          fluid
          selection
          options={userOptions}
          value={selectedUserId}
          onChange={(_, { value }) => setSelectedUserId(value)}
        />
        <Button primary onClick={handleAddMember} disabled={!selectedUserId}>
          <Icon name="plus" />
          {t('finance.addMember', { defaultValue: 'Adicionar' })}
        </Button>
      </div>

      {financeMembers.length === 0 ? (
        <div className={styles.empty}>
          {t('finance.noMembers', { defaultValue: 'Sem membros no painel financeiro.' })}
        </div>
      ) : (
        <List divided relaxed className={styles.membersList}>
          {financeMembers.map((member) => (
            <List.Item key={member.id} className={styles.memberItem}>
              <List.Content floated="right">
                <Button
                  icon
                  size="small"
                  color="red"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Icon name="trash" />
                </Button>
              </List.Content>
              <List.Icon name="user" size="large" verticalAlign="middle" />
              <List.Content>
                <List.Header>
                  {member.userId === currentUser.id
                    ? t('finance.you', { defaultValue: 'Você' })
                    : (() => {
                        const user = getUserById(member.userId);
                        return user ? user.name || user.username || user.email : 'Utilizador';
                      })()}
                </List.Header>
                <List.Description>
                  {t('finance.addedOn', { defaultValue: 'Adicionado em' })}{' '}
                  {new Date(member.createdAt).toLocaleDateString('pt-PT')}
                </List.Description>
              </List.Content>
            </List.Item>
          ))}
        </List>
      )}

      <div className={styles.note}>
        <Icon name="info circle" />
        {t('finance.membersNote', {
          defaultValue: 'Apenas gestores de projeto podem adicionar ou remover membros.',
        })}
      </div>
    </div>
  );
});

MembersTab.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default MembersTab;

