import {
  createPresentationLoadDiagnostic,
  normalizePresentationLoadError,
} from './presentationEditorDiagnostics';

describe('presentation editor diagnostics', () => {
  test('preserves a CryptPad rejection returned as a string', () => {
    expect(normalizePresentationLoadError('Invalid session key')).toEqual(
      new Error('Invalid session key'),
    );
  });

  test('creates a safe diagnostic without document URLs or CryptPad keys', () => {
    expect(
      createPresentationLoadDiagnostic({
        presentationId: 'presentation-1',
        attempt: 2,
        phase: 'cryptpad-init',
        startedAt: 100,
        now: 425,
        error: {
          message: 'Integration rejected the document',
          key: 'private-session-key',
          url: 'blob:http://127.0.0.1:3008/private-document',
        },
      }),
    ).toEqual({
      presentationId: 'presentation-1',
      attempt: 2,
      phase: 'cryptpad-init',
      elapsedMs: 325,
      message: 'Integration rejected the document',
    });
  });
});
