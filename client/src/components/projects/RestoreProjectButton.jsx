import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import entryActions from '../../entry-actions';

const RestoreProjectButton = React.memo(({ id, compact }) => {
  const project = useSelector((state) => selectors.selectProjectById(state, id));
  const canRestore = useSelector((state) =>
    selectors.selectIsProjectWithIdExternalAccessibleForCurrentUser(state, id),
  );
  const dispatch = useDispatch();
  const [t] = useTranslation();
  if (!project?.isArchived || !canRestore) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      icon={compact ? 'undo' : undefined}
      aria-label={t('common.restoreProjectNamed', { name: project.name })}
      title={t('common.restoreProject')}
      isPending={project.isArchiveSubmitting}
      onClick={() => dispatch(entryActions.setProjectArchived(id, false))}
    >
      {compact ? undefined : t('common.restoreProject')}
    </Button>
  );
});

RestoreProjectButton.propTypes = { id: PropTypes.string.isRequired, compact: PropTypes.bool };
RestoreProjectButton.defaultProps = { compact: false };

export default RestoreProjectButton;
