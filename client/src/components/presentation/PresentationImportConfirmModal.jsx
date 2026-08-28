import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '../../lib/custom-ui';

const PresentationImportConfirmModal = React.memo(({ file, open, onCancel, onConfirm }) => {
  const [t] = useTranslation();

  if (!file) {
    return null;
  }

  return (
    <AlertDialog
      cancelLabel={t('action.cancel')}
      confirmLabel={t('action.import')}
      description={t('common.presentationImportConfirm', { name: file.name })}
      open={open}
      title={t('common.presentationImport')}
      tone="warning"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
});

PresentationImportConfirmModal.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }),
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

PresentationImportConfirmModal.defaultProps = {
  file: null,
};

export default PresentationImportConfirmModal;
