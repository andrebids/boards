import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://78b406a3a022b066abd560dab1aae8ad@o4509903486320640.ingest.de.sentry.io/4509903499558992',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Configurações adicionais para o ambiente
  environment: process.env.NODE_ENV || 'development',
  release: 'planka-client@2.0.0-rc.3',
  // Configurar sample rate para performance
  tracesSampleRate: 1.0,
});
