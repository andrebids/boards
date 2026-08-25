import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import Config from '../../constants/Config';
import api from '../../api';
import { Button, FilePicker } from '../../lib/custom-ui';

import {
  createPresentationLoadDiagnostic,
  normalizePresentationLoadError,
} from './presentationEditorDiagnostics';
import getPresentationEditorLanguage from './presentationLocale';
import PresentationMediaPicker from './PresentationMediaPicker';
import { isPptxFile, PRESENTATION_FILE_ACCEPT, PRESENTATION_MIME_TYPE } from './presentationImport';

import styles from './PresentationWorkspace.module.scss';

const getErrorMessage = (response) => `Could not load presentation document (${response.status})`;

const PresentationEditor = React.memo(({ boardIds, canEdit, presentation, onSessionUpdate }) => {
  const [t, i18n] = useTranslation();
  const editorRef = useRef(null);
  const isEditorInitializedRef = useRef(false);
  const presentationRef = useRef(presentation);
  const editorLanguageRef = useRef(
    getPresentationEditorLanguage(i18n.resolvedLanguage || i18n.language),
  );
  const [editorError, setEditorError] = useState(null);
  const [imageInsertCallback, setImageInsertCallback] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadPhase, setLoadPhase] = useState('initializing');
  const [attempt, setAttempt] = useState(1);
  const containerId = useMemo(
    () => `cryptpad-presentation-editor-${presentation.id}`,
    [presentation.id],
  );

  presentationRef.current = presentation;

  const handleRetry = useCallback(() => {
    isEditorInitializedRef.current = false;
    setEditorError(null);
    setIsReady(false);
    setLoadPhase('initializing');
    setAttempt((previousAttempt) => previousAttempt + 1);
  }, []);

  const handlePresentationFileSelect = useCallback(
    async (file) => {
      if (!isPptxFile(file)) {
        setImportError('invalid');
        return;
      }

      setImportError(null);
      setIsImporting(true);
      try {
        await api.saveProjectPresentationFile(presentation.id, file);
        handleRetry();
      } catch (nextError) {
        setImportError('upload');
      } finally {
        setIsImporting(false);
      }
    },
    [handleRetry, presentation.id],
  );

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
            mode: initialPresentation.cryptpadMode,
            editorConfig: {
              lang: editorLanguageRef.current,
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
                }
              },
              onError: (nextError) => {
                reportFailure('cryptpad-runtime', nextError);
              },
              onNewKey: async (data, callback) => {
                try {
                  const currentPresentation = presentationRef.current;
                  const result = await api.updateProjectPresentationCryptPadKey(
                    initialPresentation.id,
                    {
                      keyVersion: currentPresentation.cryptpadKeyVersion,
                      editKey: data.new,
                      viewKey: data.view,
                    },
                  );
                  onSessionUpdate(initialPresentation.id, result.key, result.keyVersion);
                  callback(result.key);
                } catch (nextError) {
                  reportFailure('cryptpad-key-update', nextError);
                }
              },
              onSave: (file, callback) => {
                const presentationFile = new File([file], 'presentation.pptx', {
                  type: PRESENTATION_MIME_TYPE,
                });

                api
                  .saveProjectPresentationFile(initialPresentation.id, presentationFile)
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
  }, [attempt, containerId, handleImageInsertRequest, onSessionUpdate, presentation.isEnabled]);

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
      <section className={styles.editorSection}>
        {canEdit && (
          <div className={styles.editorToolbar}>
            <FilePicker accept={PRESENTATION_FILE_ACCEPT} onSelect={handlePresentationFileSelect}>
              <Button
                variant="secondary"
                icon="upload"
                loading={isImporting}
                disabled={isImporting}
              >
                {t('common.presentationImport')}
              </Button>
            </FilePicker>
            {importError && (
              <p className={styles.importError} role="alert">
                {t(
                  importError === 'invalid'
                    ? 'common.presentationImportInvalidFile'
                    : 'common.presentationImportFailed',
                )}
              </p>
            )}
          </div>
        )}
        <section className={styles.editor} aria-busy={!isReady}>
          <div ref={editorRef} className={styles.editorMount} />
        </section>
      </section>
      <PresentationMediaPicker
        boardIds={boardIds}
        open={imageInsertCallback !== null}
        onClose={handleImagePickerClose}
        onSelect={handleImageSelect}
      />
    </>
  );
});

PresentationEditor.propTypes = {
  boardIds: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  canEdit: PropTypes.bool.isRequired,
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
