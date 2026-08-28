import React, { useCallback, useEffect, useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { Icon, Modal } from 'semantic-ui-react';

import Button from '../Button';
import CloseButton from '../CloseButton';

import styles from './AlertDialog.module.scss';

const Tones = {
  ACCENT: 'accent',
  DANGER: 'danger',
  DEFAULT: 'default',
  SUCCESS: 'success',
  WARNING: 'warning',
};

const iconNames = {
  [Tones.ACCENT]: 'info circle',
  [Tones.DANGER]: 'trash alternate outline',
  [Tones.DEFAULT]: 'info circle',
  [Tones.SUCCESS]: 'check circle',
  [Tones.WARNING]: 'warning sign',
};

const AlertDialog = React.memo(
  ({
    cancelLabel,
    children,
    confirmLabel,
    description,
    initialFocusRef,
    isDismissable,
    isPending,
    onCancel,
    onConfirm,
    open,
    title,
    tone,
  }) => {
    const cancelButtonRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
      if (!open) {
        return undefined;
      }

      const timeout = window.setTimeout(() => {
        const initialFocusTarget = initialFocusRef?.current || cancelButtonRef.current;

        if (initialFocusRef?.current?.select) {
          initialFocusRef.current.select();
        } else {
          initialFocusTarget?.focus();
        }
      });

      return () => window.clearTimeout(timeout);
    }, [initialFocusRef, open]);

    const handleClose = useCallback(() => {
      if (isDismissable && !isPending) {
        onCancel();
      }
    }, [isDismissable, isPending, onCancel]);

    return (
      <Modal
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        basic
        className={`${styles.modal} glass`}
        closeIcon={
          isDismissable ? <CloseButton ariaLabel={cancelLabel} className="close" /> : undefined
        }
        closeOnDimmerClick={isDismissable}
        closeOnEscape={isDismissable}
        dimmer={{ className: 'glass-dimmer' }}
        open={open}
        role="alertdialog"
        size="tiny"
        onClose={handleClose}
      >
        <Modal.Content className={styles.content}>
          <div className={`${styles.icon} ${styles[tone]}`} aria-hidden="true">
            <Icon name={iconNames[tone]} />
          </div>
          <div className={styles.copy}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <div id={descriptionId} className={styles.description}>
              {description}
            </div>
            {children && <div className={styles.children}>{children}</div>}
          </div>
        </Modal.Content>
        <Modal.Actions className={styles.actions}>
          <Button ref={cancelButtonRef} variant="secondary" disabled={isPending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            isPending={isPending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </Modal.Actions>
      </Modal>
    );
  },
);

AlertDialog.propTypes = {
  cancelLabel: PropTypes.node.isRequired,
  children: PropTypes.node,
  confirmLabel: PropTypes.node.isRequired,
  description: PropTypes.node.isRequired,
  initialFocusRef: PropTypes.shape({
    current: PropTypes.object,
  }),
  isDismissable: PropTypes.bool,
  isPending: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  title: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(Object.values(Tones)),
};

AlertDialog.defaultProps = {
  isDismissable: false,
  isPending: false,
  children: undefined,
  initialFocusRef: undefined,
  tone: Tones.DEFAULT,
};

export { Tones };
export default AlertDialog;
