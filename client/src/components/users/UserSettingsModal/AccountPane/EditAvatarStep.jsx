/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Button, Popup } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import UserAvatar from '../../UserAvatar';

import styles from './EditAvatarStep.module.scss';

const EditAvatarStep = React.memo(({ onClose }) => {
  const user = useSelector(selectors.selectCurrentUser);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleFileSelect = useCallback(
    (file) => {
      dispatch(
        entryActions.updateCurrentUserAvatar({
          file,
        }),
      );

      onClose();
    },
    [onClose, dispatch],
  );

  const handleDropAccepted = useCallback(
    (files) => {
      handleFileSelect(files[0]);
    },
    [handleFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, rootRef } = useDropzone({
    accept: {
      'image/*': [],
    },
    multiple: false,
    onDropAccepted: handleDropAccepted,
  });

  const handleDeleteClick = useCallback(() => {
    dispatch(
      entryActions.updateCurrentUser({
        avatar: null,
      }),
    );

    onClose();
  }, [onClose, dispatch]);

  useEffect(() => {
    rootRef.current?.focus();
  }, [rootRef]);

  useEffect(() => {
    const handlePaste = (event) => {
      const file = event.clipboardData?.files[0];

      if (file?.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleFileSelect]);

  return (
    <>
      <Popup.Header>
        {t('common.editAvatar', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <div
          /* eslint-disable-next-line react/jsx-props-no-spreading */
          {...getRootProps({
            'aria-label': t('action.uploadNewAvatar'),
            className: `${styles.uploadZone} ${isDragActive ? styles.uploadZoneActive : ''}`,
            role: 'button',
            tabIndex: 0,
          })}
        >
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <input {...getInputProps({ 'aria-hidden': true, tabIndex: -1 })} />
          <span className={styles.preview} aria-hidden="true">
            <UserAvatar id={user.id} size="massive" />
            <span className={styles.previewBadge}>
              <ImagePlus size={16} strokeWidth={2.2} />
            </span>
          </span>
          <span className={styles.uploadCopy}>
            <span className={styles.uploadTitle}>{t('action.uploadNewAvatar')}</span>
            <span className={styles.uploadHint}>
              {isDragActive ? t('common.dropFileToUpload') : t('common.dropImagesHere')}
            </span>
          </span>
        </div>
        {user.avatar && (
          <Button fullWidth size="sm" variant="danger-soft" onClick={handleDeleteClick}>
            <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
            {t('action.deleteAvatar')}
          </Button>
        )}
      </Popup.Content>
    </>
  );
});

EditAvatarStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default EditAvatarStep;
