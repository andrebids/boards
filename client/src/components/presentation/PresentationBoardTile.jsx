import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import Config from '../../constants/Config';
import Paths from '../../constants/Paths';
import selectors from '../../selectors';
import PlusIcon from '../../assets/images/plus-icon.svg?react';
import { makePathWithPresentationBoard } from './presentationNavigation';
import { usePresentation } from './PresentationContext';
import getEnabledPresentationForBoard, {
  getPresentationBoardTileMode,
  getPresentationBoardTilePreview,
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
  const preview = getPresentationBoardTilePreview(presentation);
  const [failedPreviewFilename, setFailedPreviewFilename] = useState(null);

  useEffect(() => {
    setFailedPreviewFilename(null);
  }, [preview?.filename]);

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
    const createLabel = createError
      ? t('common.presentationCreateFailed')
      : t('action.createPresentation');

    return (
      <button
        type="button"
        className={`${styles.tile} ${styles.createTile}`}
        disabled={isCreating}
        title={createLabel}
        aria-label={createLabel}
        onClick={handleCreate}
      >
        <span className={styles.tileTitle}>{t('common.presentations')}</span>
        <span className={styles.createBody} aria-hidden="true">
          {isCreating ? (
            <Icon name="spinner" loading className={styles.createSpinner} />
          ) : (
            <PlusIcon className={styles.createIcon} />
          )}
        </span>
        {createError && (
          <span className={styles.visuallyHidden} role="alert">
            {t('common.presentationCreateFailed')}
          </span>
        )}
      </button>
    );
  }

  const presentationPath = makePathWithPresentationBoard(
    Paths.PRESENTATION.replace(':id', presentation.projectId),
    board.id,
  );

  if (preview && failedPreviewFilename !== preview.filename) {
    const previewUrl = `${Config.SERVER_BASE_URL}/api/project-presentations/${presentation.id}/preview?v=${encodeURIComponent(
      preview.filename,
    )}`;

    return (
      <Link
        to={presentationPath}
        className={`${styles.tile} ${styles.previewTile}`}
        title={presentation.title}
        aria-label={`${t('action.open')}: ${presentation.title}`}
      >
        <span className={styles.tileTitle}>{t('common.presentations')}</span>
        <img
          className={styles.previewImage}
          src={previewUrl}
          alt=""
          onError={() => setFailedPreviewFilename(preview.filename)}
        />
      </Link>
    );
  }

  return (
    <Link
      to={presentationPath}
      className={`${styles.tile} ${styles.previewTile}`}
      title={presentation.title}
      aria-label={`${t('action.open')}: ${presentation.title}`}
    >
      <span className={styles.tileTitle}>{t('common.presentations')}</span>
      <div className={styles.previewPlaceholder} aria-hidden="true">
        <Icon name="file powerpoint outline" className={styles.coverIcon} />
      </div>
    </Link>
  );
});

export default PresentationBoardTile;
