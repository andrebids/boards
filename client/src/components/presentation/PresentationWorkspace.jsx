import React, { useEffect } from 'react';
import { Icon, Loader } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import Paths from '../../constants/Paths';
import { usePresentation } from './PresentationContext';

import styles from './PresentationWorkspace.module.scss';

const PresentationWorkspace = React.memo(() => {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const project = useSelector(selectors.selectCurrentProject);
  const { presentation, isLoading, error, reload } = usePresentation();

  useEffect(() => {
    if (!isLoading && project && (!presentation || !presentation.isEnabled)) {
      navigate(Paths.PROJECTS.replace(':id', project.id), { replace: true });
    }
  }, [isLoading, navigate, presentation, project]);

  if (isLoading) {
    return <Loader active size="huge" />;
  }

  if (error) {
    return (
      <div className={styles.centerState} role="alert">
        <Icon name="warning circle" size="big" />
        <h1>{t('common.presentationLoadFailed')}</h1>
        <Button variant="secondary" onClick={reload}>
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  if (!presentation?.isEnabled) {
    return null;
  }

  return (
    <main className={styles.workspace}>
      <header className={styles.toolbar}>
        <div>
          <h1>{presentation.title}</h1>
          <span>{project?.name}</span>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate(Paths.PROJECTS.replace(':id', project.id))}
        >
          {t('common.backToProject')}
        </Button>
      </header>
      <section className={styles.emptyState}>
        <Icon name="file powerpoint outline" size="huge" />
        <h2>{t('common.presentationPreparingTitle')}</h2>
        <p>{t('common.presentationPreparingDescription')}</p>
      </section>
    </main>
  );
});

export default PresentationWorkspace;
