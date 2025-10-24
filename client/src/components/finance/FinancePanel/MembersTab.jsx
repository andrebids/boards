/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
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

  // Selector para obter qualquer usuário por id (inclui inativos/fora da lista ativa)
  const selectUserByIdSelector = useMemo(
    () => selectors.makeSelectUserById(),
    []
  );
  const usersById = useSelector(state => {
    const map = {};
    for (const m of financeMembers) {
      const id = typeof m.userId === 'object' ? m.userId.id : m.userId;
      map[id] = selectUserByIdSelector(state, id);
    }
    return map;
  });

  const handleAddMember = useCallback(() => {
    if (selectedUserId) {
      dispatch(actions.addFinanceMember(projectId, selectedUserId));
      setSelectedUserId(null);
    }
  }, [selectedUserId, projectId, dispatch]);

  // When selecting a user in the dropdown, add immediately and clear selection
  const handleSelectAndAdd = useCallback((_, { value }) => {
    setSelectedUserId(value);
    if (value) {
      dispatch(actions.addFinanceMember(projectId, value));
      // Clear value to allow adding the same user if removed later
      setSelectedUserId(null);
    }
  }, [dispatch, projectId]);

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

  // Build list of all users with a check for those already added
  const memberUserIds = useMemo(
    () =>
      financeMembers.map(m => (typeof m.userId === 'object' ? m.userId.id : m.userId)),
    [financeMembers]
  );

  const userOptions = useMemo(() => (
    projectUsers.map((user) => {
      const isMember = memberUserIds.includes(user.id);
      return {
        key: user.id,
        value: user.id,
        disabled: isMember,
        text: user.name || user.username,
        content: (
          <div className={styles.optionRow}>
            <span className={styles.optionName}>{user.name || user.username}</span>
            {isMember && <Icon name="check" className={styles.optionCheck} />}
          </div>
        ),
      };
    })
  ), [projectUsers, memberUserIds]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.header}>
          <h3>{t('finance.members', { defaultValue: 'Membros com Acesso' })}</h3>
        </div>

        <div className={styles.addMemberSection}>
          <Dropdown
            className={styles.addMemberDropdown}
            placeholder={t('finance.selectUser', { defaultValue: 'Selecionar utilizador' })}
            selection
            options={userOptions}
            value={selectedUserId}
            onChange={handleSelectAndAdd}
          />
        </div>
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
                  className={styles.iconOnlyDanger}
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Icon name="trash" fitted />
                </Button>
              </List.Content>
              <List.Icon name="user" size="large" verticalAlign="middle" />
              <List.Content>
                <List.Header>
                  {(() => {
                    const memberUserId = typeof member.userId === 'object' ? member.userId.id : member.userId;
                    if (memberUserId === currentUser.id) {
                      return t('finance.you', { defaultValue: 'Você' });
                    }
                    const embeddedUser = typeof member.userId === 'object' ? member.userId : null;
                    const user = usersById[memberUserId] || embeddedUser;
                    return user ? (user.username || user.email || user.name) : 'Utilizador';
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
        <span className={styles.noteText}>
          {t('finance.membersNote', {
            defaultValue: 'Apenas gestores de projeto podem adicionar ou remover membros.',
          })}
        </span>
      </div>
    </div>
  );
});

MembersTab.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default MembersTab;

