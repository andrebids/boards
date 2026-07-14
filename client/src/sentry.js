import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

const redactEvent = (event) => {
  const sanitizedEvent = { ...event };

  if (sanitizedEvent.request) {
    sanitizedEvent.request = {
      ...sanitizedEvent.request,
      cookies: undefined,
      data: undefined,
      headers: undefined,
      query_string: undefined,
      url: sanitizedEvent.request.url?.split('?')[0],
    };
  }

  if (sanitizedEvent.exception?.values) {
    sanitizedEvent.exception = {
      ...sanitizedEvent.exception,
      values: sanitizedEvent.exception.values.map((value) => ({
        ...value,
        value: value.type || 'Unexpected application error',
        stacktrace: value.stacktrace && {
          ...value.stacktrace,
          frames: value.stacktrace.frames?.map((frame) => ({
            ...frame,
            filename: frame.filename?.split('?')[0],
          })),
        },
      })),
    };
  }

  sanitizedEvent.breadcrumbs = [];

  return sanitizedEvent;
};

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    beforeSend: redactEvent,
  });
}

export const reportChatError = (error, operation, context = {}) => {
  if (!dsn) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('area', 'chat');
    scope.setTag('operation', operation);
    Object.entries(context.tags || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        scope.setTag(key, String(value).slice(0, 128));
      }
    });
    if (context.details) {
      scope.setContext('chat_delivery', context.details);
    }
    scope.setLevel('error');
    Sentry.captureException(error);
  });
};

export default Sentry;
