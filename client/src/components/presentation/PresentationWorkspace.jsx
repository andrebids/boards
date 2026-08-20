import React, { useEffect, useRef, useState } from 'react';
import { Icon, Loader } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../selectors';
import Config from '../../constants/Config';
import api from '../../api';
import { usePresentation } from './PresentationContext';

import styles from './PresentationWorkspace.module.scss';

const PresentationWorkspace = React.memo(() => {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const project = useSelector(selectors.selectCurrentProject);
  const { presentation, isLoading, error, reload } = usePresentation();
  const editorRef = useRef(null);
  const [editorError, setEditorError] = useState(null);

  useEffect(() => {
    if (!isLoading && project && (!presentation || !presentation.isEnabled)) {
      navigate(Paths.PROJECTS.replace(':id', project.id), { replace: true });
    }
  }, [isLoading, navigate, presentation, project]);

  useEffect(() => {
    if (!presentation?.isEnabled || !editorRef.current) {
      return undefined;
    }

    const script = document.createElement('script');
    script.src = `${Config.CRYPTPAD_URL}/cryptpad-api.js`;
    script.async = true;
    script.onload = () => {
      if (!window.CryptPadAPI || !editorRef.current) {
        setEditorError(new Error('CryptPad API unavailable'));
        return;
      }

      window
        .CryptPadAPI('cryptpad-presentation-editor', {
          document: {
            url: `${Config.CRYPTPAD_URL}/common/onlyoffice/dist/v9/sdkjs/slide/themes/src/CP_01_Blank_light.pptx`,
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
          },
        })
        .catch(setEditorError);
    };
    script.onerror = () => setEditorError(new Error('CryptPad API unavailable'));
    document.head.appendChild(script);

    return () => script.remove();
  }, [presentation]);

  if (isLoading) {
    return <Loader active size="huge" />;
  }

  if (error) {
    return (
      <div className={styles.centerState} role="alert">
        <Icon name="warning circle" size="big" />
        <h1>{t('common.presentationLoadFailed')}</h1>
        <Button variant="secondary" onClick={reload}>
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  if (!presentation?.isEnabled) {
    return null;
  }

  return (
    <main className={styles.workspace}>
      {editorError ? (
        <section className={styles.emptyState} role="alert">
          <Icon name="warning circle" size="huge" />
          <h2>{t('common.presentationLoadFailed')}</h2>
          <p>{editorError.message}</p>
        </section>
      ) : (
        <section ref={editorRef} className={styles.editor} id="cryptpad-presentation-editor" />
      )}
    </main>
  );
});

export default PresentationWorkspace;
