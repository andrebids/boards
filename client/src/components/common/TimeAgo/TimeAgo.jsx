/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import ReactTimeAgo from 'react-time-ago';
import TimeAgo from 'javascript-time-ago';

import getDateFormat from '../../../utils/get-date-format';
import ExpirableTime from './ExpirableTime';

// Importar as nossas traduções personalizadas
import ptPTLocale from '../../../locales/pt-PT/core';

const TimeAgoComponent = React.memo(({ date, withExpiration }) => {
  const [t, i18n] = useTranslation();

  // Registar as traduções personalizadas logo no início
  useEffect(() => {
    // Forçar o registo das nossas traduções personalizadas para pt-PT
    // Importante: registar com o locale correto 'pt-PT' para que funcione
    console.log(
      'Registando traduções personalizadas pt-PT:',
      ptPTLocale.timeAgo
    );
    TimeAgo.addLocale(ptPTLocale.timeAgo);
  }, []);

  // Registar o locale personalizado quando o componente for montado
  useEffect(() => {
    // Garantir que o locale pt-PT seja carregado sempre
    if (i18n.resolvedLanguage === 'pt-PT') {
      i18n.loadCoreLocale('pt-PT').then(() => {
        // Forçar o registo das nossas traduções personalizadas
        TimeAgo.addLocale(ptPTLocale.timeAgo);
      });
    }
  }, [i18n.resolvedLanguage]);

  const verboseDateFormatter = useCallback(
    value =>
      t(`format:${getDateFormat(value)}`, {
        value,
        postProcess: 'formatDate',
      }),
    [t]
  );

  return (
    <ReactTimeAgo
      date={date}
      timeStyle="round-minute"
      locale={i18n.resolvedLanguage}
      component={withExpiration ? ExpirableTime : undefined}
      formatVerboseDate={verboseDateFormatter}
      onError={error => {
        console.error('Erro no ReactTimeAgo:', error);
      }}
    />
  );
});

TimeAgoComponent.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  withExpiration: PropTypes.bool,
};

TimeAgoComponent.defaultProps = {
  withExpiration: false,
};

export default TimeAgoComponent;
