import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Checkbox, Form } from 'semantic-ui-react';

import api from '../../../../api';
import selectors from '../../../../selectors';
import { ClosableContext } from '../../../../contexts';
import { Button } from '../../../../lib/custom-ui';
import UserAvatar from '../../../users/UserAvatar';
import styles from './GeneralPane.module.scss';

const CardMembersSection = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);
  const [t] = useTranslation();
  const [users, setUsers] = useState(null);
  const [userIds, setUserIds] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);

  useEffect(() => {
    if (!isDropdownOpen) {
      return undefined;
    }
    activateClosable();
    return deactivateClosable;
  }, [isDropdownOpen, activateClosable, deactivateClosable]);

  useEffect(() => {
    let cancelled = false;
    setUsers(null);
    setError(null);
    api
      .getProjectCardMemberOptions(project.id)
      .then(({ items }) => {
        if (!cancelled) {
          setUsers(items.sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('common.bulkCardMembersLoadFailed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [project.id, reload]);

  useEffect(() => {
    if (!users || userIds.length === 0) {
      setIsPreviewLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsPreviewLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const { item } = await api.addProjectCardMembers(project.id, {
          userIds: userIds.join(','),
          includeArchived,
          preview: true,
        });
        if (!cancelled) {
          setPreview(item);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError.code === 'E_UNPROCESSABLE_ENTITY'
              ? 'common.bulkCardMembersChanged'
              : 'common.bulkCardMembersPreviewFailed',
          );
        }
      } finally {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [project.id, users, userIds, includeArchived]);

  const resetPreview = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const handleAdd = async () => {
    if (isBusy || isPreviewLoading || !preview?.canApply || preview.additionsTotal === 0) {
      return;
    }
    setIsBusy(true);
    resetPreview();
    try {
      const { item } = await api.addProjectCardMembers(project.id, {
        userIds: userIds.join(','),
        includeArchived,
        preview: false,
      });
      if (item.addedTotal !== undefined) {
        setResult(item);
      } else {
        setPreview(item);
      }
    } catch (nextError) {
      if (nextError.code === 'E_UNPROCESSABLE_ENTITY') {
        setError('common.bulkCardMembersChanged');
      } else {
        setError('common.bulkCardMembersApplyFailed');
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-busy={isBusy || isPreviewLoading}>
      <h3 className={styles.sectionTitle}>{t('common.cards', { context: 'title' })}</h3>
      <p className={styles.hint}>{t('common.bulkCardMembersHint')}</p>
      <div className={`${styles.accessField} ${styles.memberField}`}>
        <Form.Select
          fluid
          multiple
          search
          selection
          upward={false}
          label={t('common.bulkCardMembersLabel')}
          aria-label={t('common.bulkCardMembersLabel')}
          searchInput={{ 'aria-label': t('common.bulkCardMembersLabel') }}
          onOpen={() => setIsDropdownOpen(true)}
          onClose={() => setIsDropdownOpen(false)}
          placeholder={t('common.bulkCardMembersPlaceholder')}
          noResultsMessage={t('common.bulkCardMembersNoUsers')}
          loading={!users && !error}
          disabled={isBusy || !users || users.length === 0}
          value={userIds}
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
          onChange={(_, { value }) => {
            if (value.length > 100) {
              setError('common.bulkCardMembersLimit');
              return;
            }
            setUserIds(value);
            resetPreview();
          }}
        />
      </div>
      {users?.length === 0 && <p className={styles.hint}>{t('common.bulkCardMembersNoUsers')}</p>}
      <Checkbox
        id="project-card-members-include-archived"
        className={styles.archiveCheckbox}
        label={t('common.bulkCardMembersIncludeArchived')}
        checked={includeArchived}
        disabled={isBusy}
        onChange={(_, { checked }) => {
          setIncludeArchived(checked);
          resetPreview();
        }}
      />
      <div aria-live="polite" aria-atomic="true">
        {preview && (
          <div className={styles.bulkSummary}>
            <p>{t('common.bulkCardMembersPreview', preview)}</p>
            {preview.existingTotal > 0 && (
              <p className={styles.hint}>{t('common.bulkCardMembersExisting', preview)}</p>
            )}
            {preview.missingBoardMemberships.length > 0 && (
              <>
                <p>{t('common.bulkCardMembersMissingAccess')}</p>
                <ul className={styles.bulkIssues}>
                  {preview.missingBoardMemberships.map((item) => (
                    <li key={`${item.boardId}:${item.userId}`}>
                      {item.userName}: {item.boardName}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {preview.forbiddenBoards.length > 0 && (
              <p>
                {t('common.bulkCardMembersCannotEdit', {
                  boards: preview.forbiddenBoards.map(({ name }) => name).join(', '),
                })}
              </p>
            )}
          </div>
        )}
        {result && (
          <div className={styles.bulkSummary}>
            <p>{t('common.bulkCardMembersResult', result)}</p>
            {result.failedTotal > 0 && <p>{t('common.bulkCardMembersPartialFailure', result)}</p>}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.hint}>
          {t(error)}
        </p>
      )}
      <div className={styles.action}>
        {(error || result?.failedTotal > 0) && (
          <Button
            variant="secondary"
            disabled={isBusy || isPreviewLoading}
            onClick={() => {
              resetPreview();
              setReload((value) => value + 1);
            }}
          >
            {t('action.retry')}
          </Button>
        )}
        <Button
          disabled={
            isBusy || isPreviewLoading || !preview?.canApply || preview.additionsTotal === 0
          }
          loading={isBusy || isPreviewLoading}
          onClick={handleAdd}
        >
          {t('common.bulkCardMembersApply')}
        </Button>
      </div>
    </section>
  );
});

export default CardMembersSection;
