import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from 'semantic-ui-react';
import camelCase from 'lodash/camelCase';
import upperFirst from 'lodash/upperFirst';
import classNames from 'classnames';

import { useClosableModal } from '../../hooks';
import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import Paths from '../../constants/Paths';
import buildSearchParts from '../../utils/build-search-parts';
import RestoreProjectButton from './RestoreProjectButton';
import styles from './ArchivedProjectsModal.module.scss';
import globalStyles from '../../styles.module.scss';

const ArchivedProject = React.memo(({ project, onClose }) => {
  const [t] = useTranslation();
  const image = useSelector(
    (state) =>
      project.backgroundImageId &&
      selectors.selectBackgroundImageById(state, project.backgroundImageId),
  );
  const canRestore = useSelector((state) =>
    selectors.selectIsProjectWithIdExternalAccessibleForCurrentUser(state, project.id),
  );
  const firstBoardId = useSelector((state) =>
    selectors.selectFirstBoardIdByProjectId(state, project.id),
  );

  return (
    <li className={styles.row} data-project-id={project.id}>
      <div
        aria-hidden="true"
        className={classNames(
          styles.thumbnail,
          project.backgroundType === 'gradient' &&
            globalStyles[`background${upperFirst(camelCase(project.backgroundGradient))}`],
        )}
        style={{
          backgroundImage:
            project.backgroundType === 'image' && image?.thumbnailUrls?.outside360
              ? `url("${image.thumbnailUrls.outside360}")`
              : undefined,
        }}
      />
      <div className={styles.information}>
        <span className={styles.name}>{project.name}</span>
        <span className={styles.secondary}>{t(project.group, { context: 'title' })}</span>
        {!canRestore && (
          <span className={styles.secondary}>{t('common.projectRestoreManagerRequired')}</span>
        )}
      </div>
      <div className={styles.actions}>
        <Button
          as={Link}
          to={
            firstBoardId
              ? Paths.BOARDS.replace(':id', firstBoardId)
              : Paths.PROJECTS.replace(':id', project.id)
          }
          variant="ghost"
          size="sm"
          aria-label={t('common.openArchivedProjectNamed', { name: project.name })}
          onClick={onClose}
        >
          {t('common.openArchivedProject')}
        </Button>
        <RestoreProjectButton id={project.id} />
      </div>
    </li>
  );
});

ArchivedProject.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    group: PropTypes.string.isRequired,
    backgroundImageId: PropTypes.string,
    backgroundType: PropTypes.string,
    backgroundGradient: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

const ArchivedProjectsModal = React.memo(({ onClose }) => {
  const projects = useSelector(selectors.selectArchivedProjectsForCurrentUser);
  const [search, setSearch] = useState('');
  const [t] = useTranslation();
  const [ClosableModal] = useClosableModal();
  const titleId = useId();
  const inputRef = useRef(null);
  const focusedProjectId = useRef(null);
  const contentRef = useRef(null);
  const filtered = useMemo(() => {
    const parts = buildSearchParts(search);
    return projects.filter((project) =>
      parts.every((part) => project.name.toLowerCase().includes(part)),
    );
  }, [projects, search]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (
      focusedProjectId.current &&
      !filtered.some((project) => project.id === focusedProjectId.current)
    ) {
      // A restore or a remote update removed the focused row.
      const nextLink = contentRef.current?.querySelector('li a');
      if (nextLink) nextLink.focus();
      else inputRef.current?.focus();
      focusedProjectId.current = null;
    }
  }, [filtered]);

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const dialog = event.target.closest('[role="dialog"]');
    const controls = dialog?.querySelectorAll(
      'button:not(:disabled), a[href], input:not(:disabled)',
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <ClosableModal
      closeIcon
      size="small"
      className={styles.modal}
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
      onClose={onClose}
      onKeyDown={handleKeyDown}
    >
      <ClosableModal.Header id={titleId}>{t('common.archivedProjects')}</ClosableModal.Header>
      <ClosableModal.Content>
        <div
          ref={contentRef}
          onFocus={(event) => {
            focusedProjectId.current = event.target.closest('[data-project-id]')?.dataset.projectId;
          }}
        >
          <Input
            fluid
            icon="search"
            ref={inputRef}
            value={search}
            aria-label={t('common.searchArchivedProjects')}
            placeholder={t('common.searchArchivedProjects')}
            onChange={(_, { value }) => setSearch(value)}
          />
          {filtered.length ? (
            <ul className={styles.list}>
              {filtered.map((project) => (
                <ArchivedProject key={project.id} project={project} onClose={onClose} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty} role="status">
              {t(projects.length ? 'common.noArchivedProjectsMatch' : 'common.noArchivedProjects')}
            </p>
          )}
        </div>
      </ClosableModal.Content>
    </ClosableModal>
  );
});

ArchivedProjectsModal.propTypes = { onClose: PropTypes.func.isRequired };

export default ArchivedProjectsModal;
