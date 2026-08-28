import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

import Config from '../../constants/Config';
import api from '../../api';
import { Button } from '../../lib/custom-ui';

import {
  createPresentationLoadDiagnostic,
  normalizePresentationLoadError,
} from './presentationEditorDiagnostics';
import getPresentationEditorLanguage from './presentationLocale';
import PresentationImportConfirmModal from './PresentationImportConfirmModal';
import PresentationMediaPicker from './PresentationMediaPicker';
import {
  getPresentationImportMessageError,
  getPresentationImportFile,
  isInvalidPresentationImportError,
  isPresentationImportTooLarge,
  isPptxFile,
  getPresentationImportOrigins,
  PRESENTATION_IMPORT_MAX_MEGABYTES,
  PRESENTATION_MIME_TYPE,
} from './presentationImport';

import styles from './PresentationWorkspace.module.scss';

const getErrorMessage = (response) => `Could not load presentation document (${response.status})`;
const PRESENTATION_IMPORT_READY_TIMEOUT_MS = 120000;

const PresentationEditor = React.memo(({ boardIds, presentation, onSessionUpdate }) => {
  const [t, i18n] = useTranslation();
  const editorRef = useRef(null);
  const isEditorInitializedRef = useRef(false);
  const editorGenerationRef = useRef(0);
  const presentationRef = useRef(presentation);
  const pendingImportToastRef = useRef(null);
  const pendingImportTimeoutRef = useRef(null);
  const editorLanguageRef = useRef(
    getPresentationEditorLanguage(i18n.resolvedLanguage || i18n.language),
  );
  const [editorError, setEditorError] = useState(null);
  const [imageInsertCallback, setImageInsertCallback] = useState(null);
  const [importError, setImportError] = useState(null);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadPhase, setLoadPhase] = useState('initializing');
  const [attempt, setAttempt] = useState(1);
  const containerId = useMemo(
    () => `cryptpad-presentation-editor-${presentation.id}`,
    [presentation.id],
  );

  const trackedPresentation = presentationRef.current;
  if (
    presentation.id !== trackedPresentation.id ||
    presentation.cryptpadKeyVersion >= trackedPresentation.cryptpadKeyVersion
  ) {
    presentationRef.current = presentation;
  }

  const handleRetry = useCallback(() => {
    editorGenerationRef.current += 1;
    isEditorInitializedRef.current = false;
    setEditorError(null);
    setIsReady(false);
    setLoadPhase('initializing');
    setAttempt((previousAttempt) => previousAttempt + 1);
  }, []);

  const clearPendingImportTimeout = useCallback(() => {
    if (pendingImportTimeoutRef.current !== null) {
      window.clearTimeout(pendingImportTimeoutRef.current);
      pendingImportTimeoutRef.current = null;
    }
  }, []);

  const getImportErrorMessage = useCallback(
    (error) => {
      if (error === 'invalid') {
        return t('common.presentationImportInvalidFile');
      }
      if (error === 'tooLarge') {
        return t('common.presentationImportFileTooLarge', {
          size: PRESENTATION_IMPORT_MAX_MEGABYTES,
        });
      }
      if (error === 'openTimeout') {
        return t('common.presentationImportOpenTimedOut');
      }

      return t('common.presentationImportFailed');
    },
    [t],
  );

  const handlePresentationFileSelect = useCallback(
    (file) => {
      if (isImporting || pendingImportFile) {
        return;
      }

      if (!isPptxFile(file)) {
        setImportError('invalid');
        return;
      }

      if (isPresentationImportTooLarge(file)) {
        setImportError('tooLarge');
        toast.error(getImportErrorMessage('tooLarge'));
        return;
      }

      setImportError(null);
      setPendingImportFile(file);
    },
    [getImportErrorMessage, isImporting, pendingImportFile],
  );

  const handlePresentationImportCancel = useCallback(() => {
    setPendingImportFile(null);
  }, []);

  const handlePresentationImportConfirm = useCallback(async () => {
    const file = pendingImportFile;
    if (!file || isImporting) {
      return;
    }

    setPendingImportFile(null);
    setImportError(null);
    setIsImporting(true);
    const toastId = toast.loading(t('common.presentationImportLoading', { name: file.name }));

    try {
      const result = await api.importProjectPresentationFile(presentation.id, file);
      const importedPresentation = result.item;

      presentationRef.current = importedPresentation;
      pendingImportToastRef.current = {
        id: toastId,
        successMessage: t('common.presentationImportSuccess'),
        failureMessage: t('common.presentationImportFailed'),
      };
      clearPendingImportTimeout();
      pendingImportTimeoutRef.current = window.setTimeout(() => {
        const pendingImportToast = pendingImportToastRef.current;
        pendingImportTimeoutRef.current = null;
        if (!pendingImportToast) {
          return;
        }

        pendingImportToastRef.current = null;
        setImportError('openTimeout');
        setIsImporting(false);
        toast.error(getImportErrorMessage('openTimeout'), { id: pendingImportToast.id });
      }, PRESENTATION_IMPORT_READY_TIMEOUT_MS);
      handleRetry();
    } catch (nextError) {
      const nextImportError = isInvalidPresentationImportError(nextError) ? 'invalid' : 'upload';

      setImportError(nextImportError);
      toast.error(getImportErrorMessage(nextImportError), { id: toastId });
      setIsImporting(false);
    }
  }, [
    clearPendingImportTimeout,
    getImportErrorMessage,
    handleRetry,
    isImporting,
    pendingImportFile,
    presentation.id,
    t,
  ]);

  useEffect(() => () => clearPendingImportTimeout(), [clearPendingImportTimeout]);

  useEffect(() => {
    const cryptPadOrigins = getPresentationImportOrigins(
      Config.CRYPTPAD_URL,
      Config.CRYPTPAD_SANDBOX_URL,
    );
    const handlePresentationImportMessage = (event) => {
      if (!cryptPadOrigins.has(event.origin) || isImporting || pendingImportFile) {
        return;
      }

      if (getPresentationImportMessageError(event.data) === 'file-too-large') {
        setImportError('tooLarge');
        toast.error(getImportErrorMessage('tooLarge'));
        return;
      }

      const file = getPresentationImportFile(event.data);
      if (!file) {
        return;
      }

      handlePresentationFileSelect(file);
    };

    window.addEventListener('message', handlePresentationImportMessage);

    return () => {
      window.removeEventListener('message', handlePresentationImportMessage);
    };
  }, [getImportErrorMessage, handlePresentationFileSelect, isImporting, pendingImportFile]);

  const handleImageInsertRequest = useCallback((data, callback) => {
    if (!data || typeof callback !== 'function') {
      return;
    }

    setImageInsertCallback(() => callback);
  }, []);

  const handleImagePickerClose = useCallback(() => {
    imageInsertCallback?.();
    setImageInsertCallback(null);
  }, [imageInsertCallback]);

  const handleImageSelect = useCallback(
    (image) => {
      imageInsertCallback?.(image);
      setImageInsertCallback(null);
    },
    [imageInsertCallback],
  );

  useEffect(() => {
    const initialPresentation = presentationRef.current;
    const editorGeneration = editorGenerationRef.current;
    let editorKeyVersion = initialPresentation.cryptpadKeyVersion;
    if (!initialPresentation.isEnabled || !editorRef.current || isEditorInitializedRef.current) {
      return undefined;
    }

    const editorElement = editorRef.current;
    const containerElement = document.createElement('div');
    containerElement.id = containerId;
    containerElement.className = styles.editorMount;
    editorElement.appendChild(containerElement);
    let isCancelled = false;
    let script;
    let documentUrl;
    let currentPhase = 'initializing';
    const startedAt = Date.now();

    const setPhase = (nextPhase) => {
      currentPhase = nextPhase;
      if (!isCancelled) {
        setLoadPhase(nextPhase);
      }
    };

    const reportFailure = (phase, nextError) => {
      const error = normalizePresentationLoadError(nextError);
      const diagnostic = createPresentationLoadDiagnostic({
        presentationId: initialPresentation.id,
        attempt,
        phase,
        startedAt,
        error,
      });

      if (!isCancelled) {
        if (process.env.NODE_ENV !== 'production') {
          // Do not include session keys, document URLs, or file contents in diagnostics.
          // eslint-disable-next-line no-console
          console.error('[PresentationEditor] Load failed', diagnostic);
        }
        isEditorInitializedRef.current = false;
        setIsReady(false);
        setLoadPhase(phase);
        setEditorError(error);

        const pendingImportToast = pendingImportToastRef.current;
        if (pendingImportToast) {
          clearPendingImportTimeout();
          pendingImportToastRef.current = null;
          setImportError('upload');
          setIsImporting(false);
          toast.error(pendingImportToast.failureMessage, {
            id: pendingImportToast.id,
          });
        }
      }

      return error;
    };

    const loadDocument = async () => {
      setPhase('document-fetch');
      const fileResponse = await fetch(
        `${Config.SERVER_BASE_URL}/api/project-presentations/${initialPresentation.id}/file`,
        { credentials: 'include' },
      );

      if (fileResponse.ok) {
        setPhase('document-ready');
        return fileResponse.blob();
      }
      if (fileResponse.status !== 404) {
        throw new Error(getErrorMessage(fileResponse));
      }

      setPhase('template-fetch');
      const templateResponse = await fetch(
        `${Config.CRYPTPAD_URL}/common/onlyoffice/dist/v9/sdkjs/slide/themes/src/CP_01_Blank_light.pptx`,
      );
      if (!templateResponse.ok) {
        throw new Error(getErrorMessage(templateResponse));
      }

      setPhase('document-ready');
      return templateResponse.blob();
    };

    const initializeEditor = async () => {
      if (!window.CryptPadAPI || !editorRef.current) {
        reportFailure('cryptpad-api', new Error('CryptPad API unavailable'));
        return;
      }

      try {
        if (isCancelled || isEditorInitializedRef.current) {
          return;
        }

        const documentBlob = await loadDocument();
        if (isCancelled || isEditorInitializedRef.current) {
          return;
        }

        documentUrl = URL.createObjectURL(documentBlob);
        isEditorInitializedRef.current = true;
        setPhase('cryptpad-init');
        window
          .CryptPadAPI(Config.CRYPTPAD_URL, containerId, {
            document: {
              url: documentUrl,
              blob: documentBlob,
              fileType: 'pptx',
              title: initialPresentation.title,
              key: initialPresentation.cryptpadSessionKey,
              permissions: { chat: false, download: true, print: false },
            },
            documentType: 'presentation',
            autosave: 30,
            mode: initialPresentation.cryptpadMode,
            editorConfig: {
              lang: editorLanguageRef.current,
              plankaPersistentSession: true,
              customization: {
                about: false,
                help: false,
                loaderName: 'none',
                logo: {
                  visible: false,
                },
              },
            },
            events: {
              onDocumentReady: () => {
                if (!isCancelled) {
                  setPhase('ready');
                  setIsReady(true);

                  const pendingImportToast = pendingImportToastRef.current;
                  if (pendingImportToast) {
                    clearPendingImportTimeout();
                    pendingImportToastRef.current = null;
                    toast.success(pendingImportToast.successMessage, {
                      id: pendingImportToast.id,
                    });
                    setIsImporting(false);
                  }
                  setImportError((currentError) =>
                    currentError === 'openTimeout' ? null : currentError,
                  );
                }
              },
              onError: (nextError) => {
                reportFailure('cryptpad-runtime', nextError);
              },
              onNewKey: async (data, callback) => {
                try {
                  const result = await api.updateProjectPresentationCryptPadKey(
                    initialPresentation.id,
                    {
                      keyVersion: editorKeyVersion,
                      editKey: data.new,
                      viewKey: data.view,
                    },
                  );
                  if (result.key) {
                    editorKeyVersion = result.keyVersion;
                  }
                  onSessionUpdate(initialPresentation.id, result.key, result.keyVersion);
                  callback(result.key);
                } catch (nextError) {
                  reportFailure('cryptpad-key-update', nextError);
                }
              },
              onSave: (file, callback) => {
                if (editorGeneration !== editorGenerationRef.current) {
                  callback();
                  return;
                }

                const presentationFile = new File([file], 'presentation.pptx', {
                  type: PRESENTATION_MIME_TYPE,
                });

                api
                  .saveProjectPresentationFile(
                    initialPresentation.id,
                    presentationFile,
                    editorKeyVersion,
                  )
                  .then(() => callback())
                  .catch((nextError) => {
                    const error = reportFailure('document-save', nextError);
                    callback({ error: error.message });
                  });
              },
              onInsertImage: handleImageInsertRequest,
            },
          })
          .catch((nextError) => reportFailure('cryptpad-init', nextError));
      } catch (nextError) {
        reportFailure(currentPhase, nextError);
      }
    };

    if (window.CryptPadAPI) {
      initializeEditor();
    } else {
      script = document.createElement('script');
      script.src = `${Config.CRYPTPAD_URL}/cryptpad-api.js`;
      script.async = true;
      script.onload = initializeEditor;
      script.onerror = () =>
        reportFailure('cryptpad-script', new Error('CryptPad API unavailable'));
      document.head.appendChild(script);
    }

    return () => {
      isCancelled = true;
      script?.remove();
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
      isEditorInitializedRef.current = false;
      editorElement.replaceChildren();
    };
  }, [
    attempt,
    clearPendingImportTimeout,
    containerId,
    handleImageInsertRequest,
    onSessionUpdate,
    presentation.isEnabled,
  ]);

  if (editorError) {
    return (
      <section className={styles.emptyState} role="alert">
        <Icon name="warning circle" size="huge" />
        <h2>{t('common.presentationLoadFailed')}</h2>
        <p>{t('common.presentationLoadErrorDescription')}</p>
        <p className={styles.diagnostic}>
          {t('common.presentationLoadStage', { stage: loadPhase })}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          {t('action.retry')}
        </Button>
      </section>
    );
  }

  return (
    <>
      <section className={styles.editor} aria-busy={!isReady || isImporting}>
        <div ref={editorRef} className={styles.editorMount} />
        {importError && (
          <p className={styles.importError} role="alert">
            {getImportErrorMessage(importError)}
          </p>
        )}
      </section>
      <PresentationMediaPicker
        boardIds={boardIds}
        open={imageInsertCallback !== null}
        onClose={handleImagePickerClose}
        onSelect={handleImageSelect}
      />
      <PresentationImportConfirmModal
        file={pendingImportFile}
        open={pendingImportFile !== null}
        onCancel={handlePresentationImportCancel}
        onConfirm={handlePresentationImportConfirm}
      />
    </>
  );
});

PresentationEditor.propTypes = {
  boardIds: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  presentation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    cryptpadSessionKey: PropTypes.string,
    cryptpadKeyVersion: PropTypes.number.isRequired,
    cryptpadMode: PropTypes.string.isRequired,
  }).isRequired,
  onSessionUpdate: PropTypes.func.isRequired,
};

export default PresentationEditor;
