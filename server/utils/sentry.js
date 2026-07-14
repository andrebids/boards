let Sentry;

const redactEvent = (event) => {
  const sanitizedEvent = { ...event };

  if (sanitizedEvent.request) {
    sanitizedEvent.request = {
      ...sanitizedEvent.request,
      cookies: undefined,
      data: undefined,
      headers: undefined,
      query_string: undefined,
      url: sanitizedEvent.request.url && sanitizedEvent.request.url.split('?')[0],
    };
  }

  if (sanitizedEvent.exception && sanitizedEvent.exception.values) {
    sanitizedEvent.exception = {
      ...sanitizedEvent.exception,
      values: sanitizedEvent.exception.values.map((value) => ({
        ...value,
        value: value.type || 'Unexpected server error',
        stacktrace:
          value.stacktrace &&
          {
            ...value.stacktrace,
            frames: value.stacktrace.frames && value.stacktrace.frames.map((frame) => ({
              ...frame,
              filename: frame.filename && frame.filename.split('?')[0],
            })),
          },
      })),
    };
  }

  sanitizedEvent.breadcrumbs = [];

  return sanitizedEvent;
};

const init = () => {
  if (!process.env.SENTRY_DSN || Sentry) {
    return;
  }

  // The dependency is optional at runtime when monitoring is disabled.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    beforeSend: redactEvent,
  });
};

const reportChatError = (error, operation) => {
  if (!Sentry) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('area', 'chat');
    scope.setTag('operation', operation);
    scope.setLevel('error');
    Sentry.captureException(error);
  });
};

module.exports = { init, reportChatError };
