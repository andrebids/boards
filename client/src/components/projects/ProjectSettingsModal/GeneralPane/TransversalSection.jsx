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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);

  useEffect(() => {
    setMode(project.transversalMode || 'disabled');
    setUserIds(project.transversalUserIds || []);
  }, [project.transversalMode, project.transversalUserIds]);

  useEffect(() => {
    if (!isDropdownOpen) return undefined;
    activateClosable();
    return deactivateClosable;
  }, [isDropdownOpen, activateClosable, deactivateClosable]);

  useEffect(() => {
    if (mode !== 'selected') return undefined;
    let cancelled = false;
    setUsers(null);
    setError(null);
    api
      .getProjectCardMemberOptions(project.id)
      .then(({ items }) => {
        if (cancelled) return;
        setUsers(items);
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
      <div className={styles.accessField}>
        <label htmlFor="transversal-mode">{t('common.transversalAccess')}</label>
        <select
          id="transversal-mode"
          className="ui fluid dropdown"
          value={mode}
          disabled={isBusy}
          onChange={(event) => {
            setMode(event.target.value);
            setError(null);
          }}
        >
          <option value="disabled">{t('common.transversalDisabled')}</option>
          <option value="all">{t('common.transversalEveryone')}</option>
          <option value="selected">{t('common.transversalSelected')}</option>
        </select>
      </div>
      {mode === 'selected' && (
        <div className={`${styles.accessField} ${isDropdownOpen ? styles.dropdownOpen : ''}`}>
          <Form.Select
            fluid
            multiple
            search
            selection
            label={t('common.transversalPeople')}
            aria-label={t('common.transversalPeople')}
            placeholder={t('common.transversalChoosePeople')}
            options={(users || []).map((user) => ({
              key: user.id,
              value: user.id,
              text: user.name,
            }))}
            value={userIds}
            loading={!users && !error}
            disabled={isBusy || !users}
            onChange={(_, { value }) => setUserIds(value)}
            onOpen={() => setIsDropdownOpen(true)}
            onClose={() => setIsDropdownOpen(false)}
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
      <Button
        variant="primary"
        disabled={isBusy || (mode === 'selected' && !users)}
        onClick={handleSave}
      >
        {t('action.save')}
      </Button>
    </section>
  );
});

export default TransversalSection;
