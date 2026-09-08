/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { HomeViews } from '../../../constants/Enums';
import GridProjectsView from './GridProjectsView';
import GroupedProjectsView from './GroupedProjectsView';
import ArchivedProjectsModal from '../../projects/ArchivedProjectsModal';

import styles from './Home.module.scss';

const Home = React.memo(() => {
  const view = useSelector(selectors.selectHomeView);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const archiveLinkRef = useRef(null);
  const [t] = useTranslation();

  let View;
  switch (view) {
    case HomeViews.GRID_PROJECTS:
      View = GridProjectsView;

      break;
    case HomeViews.GROUPED_PROJECTS:
      View = GroupedProjectsView;

      break;
    default:
  }

  return (
    <div className={styles.wrapper}>
      <View />
      <button
        type="button"
        ref={archiveLinkRef}
        className={styles.archiveLink}
        onClick={() => setIsArchiveOpen(true)}
      >
        <Icon name="archive" aria-hidden="true" />
        {t('common.viewArchivedProjects')}
      </button>
      {isArchiveOpen && (
        <ArchivedProjectsModal
          onClose={() => {
            setIsArchiveOpen(false);
            archiveLinkRef.current?.focus();
          }}
        />
      )}
    </div>
  );
});

export default Home;
