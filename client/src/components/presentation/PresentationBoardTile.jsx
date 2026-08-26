import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import Paths from '../../constants/Paths';
import selectors from '../../selectors';
import { makePathWithPresentationBoard } from './presentationNavigation';
import { usePresentation } from './PresentationContext';
import getEnabledPresentationForBoard, {
  getPresentationBoardTileMode,
} from './presentationBoardTileState';

import styles from './PresentationBoardTile.module.scss';

const PresentationBoardTile = React.memo(() => {
  const [t] = useTranslation();
  const board = useSelector(selectors.selectCurrentBoard);
  const { presentations, canEdit, activate } = usePresentation();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const boardId = board?.id;
  const mode = boardId && getPresentationBoardTileMode(presentations, boardId, canEdit);
  const presentation =
    mode === 'open' ? getEnabledPresentationForBoard(presentations, boardId) : null;

  const handleCreate = useCallback(async () => {
    setCreateError(false);
    setIsCreating(true);

    try {
      await activate(boardId);
    } catch (error) {
      setCreateError(true);
    } finally {
      setIsCreating(false);
    }
  }, [activate, boardId]);

  if (!mode) {
    return null;
  }

  if (mode === 'create') {
    return (
      <button type="button" className={styles.tile} disabled={isCreating} onClick={handleCreate}>
        <div className={styles.cover} aria-hidden="true">
          <Icon
            name={isCreating ? 'spinner' : 'file powerpoint outline'}
            loading={isCreating}
            className={styles.coverIcon}
          />
          <span className={styles.coverLabel}>{t('common.presentations')}</span>
        </div>
        <div className={styles.content}>
          <span className={styles.type}>{t('common.presentations')}</span>
          <span className={styles.title}>{t('action.createPresentation')}</span>
          <span className={styles.open}>{t('common.presentationCreateDescription')}</span>
          {createError && (
            <span className={styles.error} role="alert">
              {t('common.presentationSaveFailed')}
            </span>
          )}
        </div>
      </button>
    );
  }

  const presentationPath = makePathWithPresentationBoard(
    Paths.PRESENTATION.replace(':id', presentation.projectId),
    board.id,
  );

  return (
    <Link to={presentationPath} className={styles.tile} title={presentation.title}>
      <div className={styles.cover} aria-hidden="true">
        <Icon name="file powerpoint outline" className={styles.coverIcon} />
        <span className={styles.coverLabel}>{t('common.presentations')}</span>
      </div>
      <div className={styles.content}>
        <span className={styles.type}>{t('common.presentations')}</span>
        <span className={styles.title}>{presentation.title}</span>
        <span className={styles.open}>{t('action.open')}</span>
      </div>
    </Link>
  );
});

export default PresentationBoardTile;
