import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '../../lib/custom-ui';
import entryActions from '../../entry-actions';

const LeaveGroupDialog = React.memo(({ conversationId, conversationTitle, isOwner, onClose }) => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const update = useSelector((state) => state.chat.conversationUpdatesById[conversationId]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (hasSubmitted && update?.operation === 'leave' && update.isSuccess) {
      onClose();
    }
  }, [hasSubmitted, onClose, update]);

  return (
    <AlertDialog
      cancelLabel={t('action.cancel')}
      confirmLabel={t('chat.leaveGroup')}
      description={t(isOwner ? 'chat.confirmLeaveGroupOwner' : 'chat.confirmLeaveGroup', {
        group: conversationTitle,
      })}
      isPending={Boolean(update?.isPending)}
      open
      title={t('chat.leaveGroup')}
      tone="danger"
      onCancel={onClose}
      onConfirm={() => {
        if (!update?.isPending) {
          setHasSubmitted(true);
          dispatch(entryActions.leaveChatConversation(conversationId));
        }
      }}
    >
      {hasSubmitted && update?.operation === 'leave' && update.error && (
        <span role="alert">{t('chat.leaveGroupFailed')}</span>
      )}
    </AlertDialog>
  );
});

LeaveGroupDialog.propTypes = {
  conversationId: PropTypes.string.isRequired,
  conversationTitle: PropTypes.string,
  isOwner: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

LeaveGroupDialog.defaultProps = {
  conversationTitle: undefined,
  isOwner: false,
};

export default LeaveGroupDialog;
