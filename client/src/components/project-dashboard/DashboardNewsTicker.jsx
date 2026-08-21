import React, { useEffect, useMemo, useState } from 'react';

import api from '../../api';

import styles from './DashboardNewsTicker.module.scss';

const NEWS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const DashboardNewsTicker = React.memo(() => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    const loadNews = () => {
      api
        .getDashboardNews()
        .then(({ items: nextItems }) => {
          if (!isCancelled) {
            setItems(nextItems || []);
          }
        })
        .catch(() => {});
    };

    loadNews();
    const intervalId = window.setInterval(loadNews, NEWS_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const tickerSequences = useMemo(
    () => [
      ['current', items],
      ['duplicate', items],
    ],
    [items],
  );

  return (
    <aside className={styles.ticker} aria-label="Notícias de tecnologia">
      <span className={styles.label}>Notícias</span>
      <div className={styles.viewport}>
        {items.length > 0 ? (
          <div className={styles.track}>
            {tickerSequences.map(([sequenceId, sequenceItems]) => (
              <div className={styles.sequence} key={sequenceId}>
                {sequenceItems.map((item) => (
                  <a
                    className={styles.item}
                    href={item.url}
                    key={`${sequenceId}-${item.url}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{item.source}</span>
                    {item.title}
                  </a>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <span className={styles.loading}>A atualizar notícias…</span>
        )}
      </div>
    </aside>
  );
});

export default DashboardNewsTicker;
