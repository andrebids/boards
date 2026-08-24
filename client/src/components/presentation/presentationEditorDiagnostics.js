export const normalizePresentationLoadError = (error) => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }

  if (error && typeof error.message === 'string' && error.message.trim()) {
    return new Error(error.message);
  }

  if (error && typeof error.error === 'string' && error.error.trim()) {
    return new Error(error.error);
  }

  return new Error('Presentation editor request failed');
};

export const createPresentationLoadDiagnostic = ({
  presentationId,
  attempt,
  phase,
  startedAt,
  now = Date.now(),
  error,
}) => ({
  presentationId,
  attempt,
  phase,
  elapsedMs: Math.max(0, now - startedAt),
  message: normalizePresentationLoadError(error).message,
});
