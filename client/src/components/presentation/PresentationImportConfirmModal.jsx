import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../lib/custom-ui';

const PresentationImportConfirmModal = React.memo(
  ({ file, open, onCancel, onConfirm, isImporting }) => {
    const [t] = useTranslation();

    if (!file) {
      return null;
    }

    return (
      <Modal
        open={open}
        onClose={onCancel}
        closeOnDimmerClick={!isImporting}
        closeOnEscape={!isImporting}
        size="tiny"
      >
        <Modal.Header>{t('common.presentationImport')}</Modal.Header>
        <Modal.Content>
          <p>{t('common.presentationImportConfirm', { name: file.name })}</p>
        </Modal.Content>
        <Modal.Actions>
          <Button variant="secondary" onClick={onCancel} isDisabled={isImporting}>
            {t('action.cancel')}
          </Button>
          <Button onClick={onConfirm} isPending={isImporting}>
            {t('action.import')}
          </Button>
        </Modal.Actions>
      </Modal>
    );
  },
);

PresentationImportConfirmModal.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }),
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isImporting: PropTypes.bool.isRequired,
};

PresentationImportConfirmModal.defaultProps = {
  file: null,
};

export default PresentationImportConfirmModal;
