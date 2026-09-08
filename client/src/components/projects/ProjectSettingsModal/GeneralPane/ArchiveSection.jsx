import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { Button } from '../../../../lib/custom-ui';
import { usePopupInClosableContext } from '../../../../hooks';
import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import ConfirmationStep from '../../../common/ConfirmationStep';
import RestoreProjectButton from '../../RestoreProjectButton';
import styles from './GeneralPane.module.scss';

const ArchiveSection = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);
  const canArchive = useSelector((state) =>
    selectors.selectIsProjectWithIdExternalAccessibleForCurrentUser(state, project.id),
  );
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  if (!canArchive) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{t('common.projectArchive')}</h3>
      <p className={styles.hint}>
        {t(project.isArchived ? 'common.projectIsArchived' : 'common.projectArchiveHint')}
      </p>
      <div className={styles.action}>
        {project.isArchived ? (
          <RestoreProjectButton id={project.id} />
        ) : (
          <ConfirmationPopup
            title="common.archiveProjectConfirmTitle"
            content="common.archiveProjectConfirm"
            contentValues={{ name: project.name }}
            buttonContent="common.archiveProject"
            isPending={project.isArchiveSubmitting}
            variant="primary"
            onConfirm={() => dispatch(entryActions.setProjectArchived(project.id, true))}
          >
            <Button variant="secondary" size="sm" isPending={project.isArchiveSubmitting}>
              {t(project.isArchiveSubmitting ? 'common.archivingProject' : 'common.archiveProject')}
            </Button>
          </ConfirmationPopup>
        )}
      </div>
    </section>
  );
});

export default ArchiveSection;
