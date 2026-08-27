import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { Image, Modal } from "semantic-ui-react";
import { ImagePlus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CloseButton, FilePicker, Input } from "../../lib/custom-ui";
import makeSelectPresentationCardImageMedia from "./presentationMedia";

import styles from "./PresentationMediaPicker.module.scss";

const PresentationMediaPicker = React.memo(
  ({ boardIds, open, onClose, onSelect }) => {
    const [t] = useTranslation();
    const selectMedia = useMemo(makeSelectPresentationCardImageMedia, []);
    const media = useSelector((state) => selectMedia(state, boardIds));
    const [query, setQuery] = useState("");
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
      setQuery("");
      setError(null);
      onClose();
    }, [onClose]);

    const handleCardImageSelect = useCallback(
      async (item) => {
        setError(null);
        setIsLoadingId(item.id);

        try {
          const response = await fetch(item.url, { credentials: "include" });
          if (!response.ok) {
            throw new Error(`Could not load image (${response.status})`);
          }

          onSelect({ blob: await response.blob(), name: item.name });
          setQuery("");
        } catch (nextError) {
          setError(t("common.presentationMediaLoadError"));
        } finally {
          setIsLoadingId(null);
        }
      },
      [onSelect, t],
    );

    const handleComputerImageSelect = useCallback(
      (file) => {
        if (!file) {
          return;
        }

        onSelect({ blob: file, name: file.name });
        setQuery("");
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
              <h2>{t("common.presentationMediaTitle")}</h2>
              <p>{t("common.presentationMediaDescription")}</p>
            </div>
            <CloseButton
              ariaLabel={t("common.presentationMediaClose")}
              onClick={handleClose}
            />
          </header>

          <div className={styles.actions}>
            <div className={styles.search}>
              <Search aria-hidden="true" size={16} strokeWidth={2} />
              <Input
                id="presentation-media-search"
                aria-label={t("common.presentationMediaSearch")}
                fluid
                placeholder={t("common.presentationMediaSearch")}
                value={query}
                onChange={(event, data) => setQuery(data.value)}
              />
              {query && (
                <CloseButton
                  ariaLabel={t("common.presentationMediaClearSearch")}
                  className={styles.clearSearchButton}
                  onClick={() => setQuery("")}
                  title={t("common.presentationMediaClearSearch")}
                />
              )}
            </div>
            <FilePicker accept="image/*" onSelect={handleComputerImageSelect}>
              <button type="button" className={styles.uploadButton}>
                <ImagePlus aria-hidden="true" size={16} strokeWidth={2} />
                {t("common.presentationMediaUpload")}
              </button>
            </FilePicker>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {filteredMedia.length > 0 ? (
            <div
              className={styles.grid}
              role="list"
              aria-label={t("common.presentationMediaListLabel")}
            >
              {filteredMedia.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.item}
                  disabled={isLoadingId !== null}
                  onClick={() => handleCardImageSelect(item)}
                >
                  <Image
                    src={item.thumbnailUrl}
                    alt=""
                    className={styles.thumbnail}
                  />
                  <span className={styles.itemContent}>
                    <strong>{item.cardName}</strong>
                    <span>{item.name}</span>
                  </span>
                  {isLoadingId === item.id && (
                    <span className={styles.loading}>
                      {t("common.presentationMediaInserting")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState} role="status">
              <ImagePlus aria-hidden="true" size={28} strokeWidth={1.6} />
              <strong>
                {query
                  ? t("common.presentationMediaSearchEmpty")
                  : t("common.presentationMediaEmpty")}
              </strong>
              <span>{t("common.presentationMediaEmptyDescription")}</span>
            </div>
          )}
        </Modal.Content>
      </Modal>
    );
  },
);

PresentationMediaPicker.propTypes = {
  boardIds: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default PresentationMediaPicker;
