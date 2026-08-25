import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Image, Modal } from 'semantic-ui-react';
import { ImagePlus, Search } from 'lucide-react';

import { CloseButton, FilePicker, Input } from '../../lib/custom-ui';
import makeSelectPresentationCardImageMedia from './presentationMedia';

import styles from './PresentationMediaPicker.module.scss';

const PresentationMediaPicker = React.memo(({ boardIds, open, onClose, onSelect }) => {
  const selectMedia = useMemo(makeSelectPresentationCardImageMedia, []);
  const media = useSelector((state) => selectMedia(state, boardIds));
  const [query, setQuery] = useState('');
  const [isLoadingId, setIsLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const filteredMedia = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return media;
    }

    return media.filter((item) =>
      [item.name, item.cardName, item.boardName].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
    );
  }, [media, query]);

  const handleClose = useCallback(() => {
    setQuery('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleCardImageSelect = useCallback(
    async (item) => {
      setError(null);
      setIsLoadingId(item.id);

      try {
        const response = await fetch(item.url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Could not load image (${response.status})`);
        }

        onSelect({ blob: await response.blob(), name: item.name });
        setQuery('');
      } catch (nextError) {
        setError('Não foi possível obter esta imagem. Tente novamente.');
      } finally {
        setIsLoadingId(null);
      }
    },
    [onSelect],
  );

  const handleComputerImageSelect = useCallback(
    (file) => {
      if (!file) {
        return;
      }

      onSelect({ blob: file, name: file.name });
      setQuery('');
    },
    [onSelect],
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      className={styles.modal}
      closeOnDimmerClick={false}
      closeOnEscape
      size="small"
    >
      <Modal.Content className={styles.content}>
        <header className={styles.header}>
          <div>
            <h2>Imagens dos cartões</h2>
            <p>Escolha uma imagem dos quadros a que tem acesso.</p>
          </div>
          <CloseButton ariaLabel="Fechar" onClick={handleClose} />
        </header>

        <div className={styles.actions}>
          <div className={styles.search}>
            <Search aria-hidden="true" size={16} strokeWidth={2} />
            <Input
              id="presentation-media-search"
              aria-label="Pesquisar imagens"
              fluid
              placeholder="Pesquisar imagens"
              value={query}
              onChange={(event, data) => setQuery(data.value)}
            />
            {query && (
              <CloseButton
                ariaLabel="Limpar pesquisa"
                className={styles.clearSearchButton}
                onClick={() => setQuery('')}
                title="Limpar pesquisa"
              />
            )}
          </div>
          <FilePicker accept="image/*" onSelect={handleComputerImageSelect}>
            <button type="button" className={styles.uploadButton}>
              <ImagePlus aria-hidden="true" size={16} strokeWidth={2} />
              Carregar do computador
            </button>
          </FilePicker>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {filteredMedia.length > 0 ? (
          <div className={styles.grid} role="list" aria-label="Imagens dos cartões">
            {filteredMedia.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.item}
                disabled={isLoadingId !== null}
                onClick={() => handleCardImageSelect(item)}
              >
                <Image src={item.thumbnailUrl} alt="" className={styles.thumbnail} />
                <span className={styles.itemContent}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.boardName} · {item.cardName}
                  </span>
                </span>
                {isLoadingId === item.id && <span className={styles.loading}>A inserir…</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState} role="status">
            <ImagePlus aria-hidden="true" size={28} strokeWidth={1.6} />
            <strong>
              {query ? 'Não encontrámos imagens.' : 'Ainda não existem imagens nos cartões.'}
            </strong>
            <span>Também pode carregar uma imagem do computador.</span>
          </div>
        )}
      </Modal.Content>
    </Modal>
  );
});

PresentationMediaPicker.propTypes = {
  boardIds: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default PresentationMediaPicker;
