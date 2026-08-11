/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Icon, Message } from 'semantic-ui-react';

import { Button } from '../../../lib/custom-ui';
import entryActions from '../../../entry-actions';

import styles from './EmptyTrashToast.module.scss';

const CardAttachmentUploadFailureToast = React.memo(({ id, cardId, attachmentFile }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleRetryClick = useCallback(() => {
    dispatch(entryActions.uploadCardAttachment(cardId, attachmentFile));
    toast.dismiss(id);
  }, [attachmentFile, cardId, dispatch, id]);

  return (
    <Message visible negative size="tiny">
      <Icon name="warning sign" />
      {t('common.cardCreatedButAttachmentUploadFailed')}
      <Button
        variant="secondary"
        content={t('action.retry')}
        size="mini"
        className={styles.button}
        onClick={handleRetryClick}
      />
    </Message>
  );
});

CardAttachmentUploadFailureToast.propTypes = {
  id: PropTypes.string.isRequired,
  cardId: PropTypes.string.isRequired,
  attachmentFile: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default CardAttachmentUploadFailureToast;
