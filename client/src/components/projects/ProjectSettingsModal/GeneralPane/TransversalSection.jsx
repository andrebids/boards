import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Form } from 'semantic-ui-react';
import toast from 'react-hot-toast';
import api from '../../../../api';
import actions from '../../../../actions';
import selectors from '../../../../selectors';
import { ClosableContext } from '../../../../contexts';
import { Button } from '../../../../lib/custom-ui';
import UserAvatar from '../../../users/UserAvatar';
import styles from './GeneralPane.module.scss';

const TransversalSection = React.memo(() => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const project = useSelector(selectors.selectCurrentProject);
  const [mode, setMode] = useState(project.transversalMode || 'disabled');
  const [userIds, setUserIds] = useState(project.transversalUserIds || []);
  const [users, setUsers] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);

  useEffect(() => {
    setMode(project.transversalMode || 'disabled');
    setUserIds(project.transversalUserIds || []);
  }, [project.transversalMode, project.transversalUserIds]);

  useEffect(() => {
    if (!openDropdown) return undefined;
    activateClosable();
    return deactivateClosable;
  }, [openDropdown, activateClosable, deactivateClosable]);

  useEffect(() => {
    if (mode !== 'selected') return undefined;
    let cancelled = false;
    setUsers(null);
    setError(null);
    api
      .getProjectCardMemberOptions(project.id)
      .then(({ items }) => {
        if (cancelled) return;
        setUsers(items.sort((a, b) => a.name.localeCompare(b.name)));
        setUserIds((ids) => ids.filter((id) => items.some((user) => user.id === id)));
      })
      .catch(() => {
        if (!cancelled) setError('common.transversalLoadFailed');
      });
    return () => {
      cancelled = true;
    };
  }, [project.id, mode, reload]);

  const handleSave = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const { item } = await api.updateProject(project.id, {
        transversalMode: mode,
        transversalUserIds: mode === 'selected' ? userIds : [],
      });
      dispatch(actions.updateProject.success(item));
      toast.success(t('common.transversalSaved'));
    } catch {
      setError('common.transversalSaveFailed');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-busy={isBusy}>
      <h3 className={styles.sectionTitle}>{t('common.transversalTitle')}</h3>
      <p className={styles.hint}>{t('common.transversalSettingsHint')}</p>
      <div
        className={`${styles.accessField} ${openDropdown === 'access' ? styles.dropdownOpen : ''}`}
      >
        <Form.Select
          fluid
          selection
          upward={false}
          id="transversal-mode"
          label={t('common.transversalAccess')}
          aria-label={t('common.transversalAccess')}
          options={[
            { value: 'disabled', text: t('common.transversalDisabled') },
            { value: 'all', text: t('common.transversalEveryone') },
            { value: 'selected', text: t('common.transversalSelected') },
          ]}
          value={mode}
          disabled={isBusy}
          onChange={(_, { value }) => {
            setMode(value);
            setError(null);
          }}
          onOpen={() => setOpenDropdown('access')}
          onClose={() => setOpenDropdown(null)}
        />
      </div>
      {mode === 'selected' && (
        <div
          className={`${styles.accessField} ${styles.memberField} ${
            openDropdown === 'people' ? styles.dropdownOpen : ''
          }`}
        >
          <Form.Select
            fluid
            multiple
            search
            selection
            upward={false}
            label={t('common.transversalPeople')}
            aria-label={t('common.transversalPeople')}
            searchInput={{ 'aria-label': t('common.transversalPeople') }}
            placeholder={t('common.transversalChoosePeople')}
            noResultsMessage={t('common.bulkCardMembersNoUsers')}
            renderLabel={({ content }) => ({ content })}
            options={(users || []).map((user) => ({
              key: user.id,
              value: user.id,
              text: user.name,
              content: (
                <span className={styles.memberIdentity}>
                  <span aria-hidden="true">
                    <UserAvatar id={user.id} fallbackUser={user} size="tiny" withTitle={false} />
                  </span>
                  <span className={styles.memberName}>{user.name}</span>
                </span>
              ),
            }))}
            value={userIds}
            loading={!users && !error}
            disabled={isBusy || !users || users.length === 0}
            onChange={(_, { value }) => setUserIds(value)}
            onOpen={() => setOpenDropdown('people')}
            onClose={() => setOpenDropdown(null)}
          />
          {!userIds.length && <p className={styles.hint}>{t('common.transversalNobody')}</p>}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.hint}>
          {t(error)}
        </p>
      )}
      {mode === 'selected' && !users && error && (
        <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
          {t('action.retry')}
        </Button>
      )}
      <div className={styles.action}>
        <Button
          variant="primary"
          disabled={isBusy || (mode === 'selected' && !users)}
          onClick={handleSave}
        >
          {t('action.save')}
        </Button>
      </div>
    </section>
  );
});

export default TransversalSection;
