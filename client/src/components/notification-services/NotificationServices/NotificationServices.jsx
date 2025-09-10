/*!
 * Copyright (c) 2024 Blachere Boards Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { Message, Icon } from 'semantic-ui-react';
import { Trans } from 'react-i18next';

import styles from './NotificationServices.module.scss';

const NotificationServices = React.memo(() => {
  const globalSmtpUser = process.env.REACT_APP_SMTP_USER || 'boards@bids.pt';

  return (
    <div className={styles.notificationTestContainer}>
      <Message positive icon>
        <Icon name="check circle" />
        <Message.Content>
          <Message.Header>
            <Trans i18nKey="common.globalNotificationsActiveTitle">
              Sistema de Notificações Globais Ativo
            </Trans>
          </Message.Header>
          <p>
            <Trans i18nKey="common.globalNotificationsActiveDescription">
              Todas as notificações são enviadas centralmente através do endereço de e-mail{' '}
              <strong>{{ email: globalSmtpUser }}</strong>. Não é necessária qualquer configuração
              adicional por parte do utilizador.
            </Trans>
          </p>
        </Message.Content>
      </Message>
    </div>
  );
});

export default NotificationServices;
