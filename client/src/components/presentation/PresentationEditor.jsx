import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import Config from '../../constants/Config';
import api from '../../api';

import styles from './PresentationWorkspace.module.scss';

const PRESENTATION_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const getErrorMessage = (response) => `Could not load presentation document (${response.status})`;

const PresentationEditor = React.memo(({ presentation }) => {
  const [t] = useTranslation();
  const editorRef = useRef(null);
  const isEditorInitializedRef = useRef(false);
  const [editorError, setEditorError] = useState(null);
  const containerId = useMemo(
    () => `cryptpad-presentation-editor-${presentation.id}`,
    [presentation.id],
  );

  useEffect(() => {
    if (!presentation.isEnabled || !editorRef.current || isEditorInitializedRef.current) {
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

    const loadDocument = async () => {
      const fileResponse = await fetch(
        `${Config.SERVER_BASE_URL}/api/project-presentations/${presentation.id}/file`,
        { credentials: 'include' },
      );

      if (fileResponse.ok) {
        return fileResponse.blob();
      }
      if (fileResponse.status !== 404) {
        throw new Error(getErrorMessage(fileResponse));
      }

      const templateResponse = await fetch(
        `${Config.CRYPTPAD_URL}/common/onlyoffice/dist/v9/sdkjs/slide/themes/src/CP_01_Blank_light.pptx`,
      );
      if (!templateResponse.ok) {
        throw new Error(getErrorMessage(templateResponse));
      }

      return templateResponse.blob();
    };

    const initializeEditor = async () => {
      if (!window.CryptPadAPI || !editorRef.current) {
        setEditorError(new Error('CryptPad API unavailable'));
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
        window
          .CryptPadAPI(containerId, {
            document: {
              url: documentUrl,
              fileType: 'pptx',
              title: presentation.title,
              key: presentation.cryptpadSessionKey,
              permissions: { chat: false },
            },
            documentType: 'presentation',
            mode: presentation.cryptpadMode,
            editorConfig: { lang: 'pt' },
            events: {
              onNewKey: async (data, callback) => {
                try {
                  const result = await api.updateProjectPresentationCryptPadKey(presentation.id, {
                    keyVersion: presentation.cryptpadKeyVersion,
                    editKey: data.new,
                    viewKey: data.view,
                  });
                  callback(result.key);
                } catch (nextError) {
                  setEditorError(nextError);
                }
              },
              onSave: (file, callback) => {
                const presentationFile = new File([file], 'presentation.pptx', {
                  type: PRESENTATION_MIME_TYPE,
                });

                api
                  .saveProjectPresentationFile(presentation.id, presentationFile)
                  .then(() => callback())
                  .catch((nextError) => {
                    setEditorError(nextError);
                    callback({ error: nextError.message });
                  });
              },
            },
          })
          .catch(setEditorError);
      } catch (nextError) {
        setEditorError(nextError);
      }
    };

    if (window.CryptPadAPI) {
      initializeEditor();
    } else {
      script = document.createElement('script');
      script.src = `${Config.CRYPTPAD_URL}/cryptpad-api.js`;
      script.async = true;
      script.onload = initializeEditor;
      script.onerror = () => setEditorError(new Error('CryptPad API unavailable'));
      document.head.appendChild(script);
    }

    return () => {
      isCancelled = true;
      script?.remove();
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
      editorElement.replaceChildren();
    };
  }, [containerId, presentation]);

  if (editorError) {
    return (
      <section className={styles.emptyState} role="alert">
        <Icon name="warning circle" size="huge" />
        <h2>{t('common.presentationLoadFailed')}</h2>
        <p>{editorError.message}</p>
      </section>
    );
  }

  return <section ref={editorRef} className={styles.editor} />;
});

PresentationEditor.propTypes = {
  presentation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    cryptpadSessionKey: PropTypes.string,
    cryptpadKeyVersion: PropTypes.number.isRequired,
    cryptpadMode: PropTypes.string.isRequired,
  }).isRequired,
};

export default PresentationEditor;
