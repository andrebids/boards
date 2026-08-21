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
      <div className={styles.viewport}>
        {items.length > 0 ? (
          <div className={styles.track}>
            {tickerSequences.map(([sequenceId, sequenceItems]) => (
              <div
                aria-hidden={sequenceId === 'duplicate'}
                className={styles.sequence}
                key={sequenceId}
              >
                {sequenceItems.map((item) => (
                  <a
                    className={styles.item}
                    href={item.url}
                    key={`${sequenceId}-${item.url}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.imageUrl && (
                      <img
                        alt=""
                        className={styles.thumbnail}
                        decoding="async"
                        loading="eager"
                        referrerPolicy="no-referrer"
                        src={item.imageUrl}
                        onError={(event) => {
                          const image = event.currentTarget;
                          image.hidden = true;
                        }}
                      />
                    )}
                    <span className={styles.copy}>
                      <span className={styles.source}>{item.source}</span>
                      <span className={styles.title}>{item.title}</span>
                    </span>
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
