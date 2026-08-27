import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { getXlsxSheetRows, parseXlsxWorkbook } from './xlsx-preview';

import styles from './XlsxViewer.module.scss';

const ROWS_PER_PAGE = 50;

const XlsxViewer = React.memo(({ attachment }) => {
  const [t] = useTranslation();
  const [workbook, setWorkbook] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setWorkbook(null);
    setSelectedSheet(null);
    setCurrentPage(1);
    setHasError(false);

    const loadWorkbook = async () => {
      try {
        const response = await fetch(attachment.data.url, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to load XLSX attachment (${response.status})`);
        }

        const nextWorkbook = parseXlsxWorkbook(await response.arrayBuffer());

        setWorkbook(nextWorkbook);
        setSelectedSheet(nextWorkbook.SheetNames[0] || null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setHasError(true);
        }
      }
    };

    loadWorkbook();

    return () => {
      controller.abort();
    };
  }, [attachment.data.url]);

  const rows = useMemo(
    () => (workbook && selectedSheet ? getXlsxSheetRows(workbook, selectedSheet) : []),
    [selectedSheet, workbook],
  );

  const columnCount = useMemo(
    () => rows.reduce((maximum, row) => Math.max(maximum, row.length), 0),
    [rows],
  );

  const bodyRows = rows.slice(1);
  const totalPages = Math.max(1, Math.ceil(bodyRows.length / ROWS_PER_PAGE));
  const firstVisibleRow = (currentPage - 1) * ROWS_PER_PAGE;
  const visibleRows = bodyRows.slice(firstVisibleRow, firstVisibleRow + ROWS_PER_PAGE);

  const handleSheetChange = useCallback((event) => {
    setSelectedSheet(event.target.value);
    setCurrentPage(1);
  }, []);

  if (!workbook) {
    return (
      <div className={styles.status} role={hasError ? 'alert' : 'status'} aria-busy={!hasError}>
        {!hasError && <span className={styles.spinner} aria-hidden="true" />}
        <span className={styles.filename} title={attachment.name}>
          {attachment.name}
        </span>
        {hasError ? t('common.thereIsNoPreviewAvailableForThisAttachment') : t('common.loading')}
      </div>
    );
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <select
          aria-label={attachment.name}
          className={styles.sheetSelect}
          value={selectedSheet || ''}
          onChange={handleSheetChange}
        >
          {workbook.SheetNames.map((sheetName) => (
            <option key={sheetName} value={sheetName}>
              {sheetName}
            </option>
          ))}
        </select>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              aria-label={`${Math.max(1, currentPage - 1)} / ${totalPages}`}
              className={styles.pageButton}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              ‹
            </button>
            <span>{`${currentPage} / ${totalPages}`}</span>
            <button
              type="button"
              aria-label={`${Math.min(totalPages, currentPage + 1)} / ${totalPages}`}
              className={styles.pageButton}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 ? (
        <div className={styles.viewport}>
          <table className={styles.table} aria-label={`${attachment.name}: ${selectedSheet}`}>
            <thead>
              <tr>
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <th key={columnIndex} scope="col" title={rows[0][columnIndex] || undefined}>
                    {rows[0][columnIndex] || '\u00a0'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                // Spreadsheet rows have no persistent identifier; the source row number is stable.
                // eslint-disable-next-line react/no-array-index-key
                <tr key={firstVisibleRow + rowIndex}>
                  {Array.from({ length: columnCount }, (_, columnIndex) => (
                    <td key={columnIndex} title={row[columnIndex] || undefined}>
                      {row[columnIndex] || '\u00a0'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.status} role="status">
          {t('common.thereIsNoPreviewAvailableForThisAttachment')}
        </div>
      )}
    </div>
  );
});

XlsxViewer.propTypes = {
  attachment: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default XlsxViewer;
