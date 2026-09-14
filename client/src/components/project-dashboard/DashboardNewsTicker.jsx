import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';

import api from '../../api';
import {
  getDashboardTickerItems,
  shouldRenderDashboardTickerThumbnail,
} from './dashboard-news-ticker';

import styles from './DashboardNewsTicker.module.scss';

const NEWS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CLOCK_REFRESH_INTERVAL_MS = 15 * 1000;
// Each item scrolls past in this many seconds, which keeps the marquee near 40px/s.
const TICKER_SECONDS_PER_ITEM = 32;
const CLOCK_LOCALE = 'pt-PT';

const timeFormatter = new Intl.DateTimeFormat(CLOCK_LOCALE, { hour: '2-digit', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat(CLOCK_LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const formatDateLabel = (date) => {
  const label = dateFormatter.format(date);
  return `${label.charAt(0).toLocaleUpperCase(CLOCK_LOCALE)}${label.slice(1)}`;
};

const DashboardTvClock = React.memo(() => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), CLOCK_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <time className={styles.clock} dateTime={now.toISOString()}>
      <strong>{timeFormatter.format(now)}</strong>
      <span>{formatDateLabel(now)}</span>
    </time>
  );
});

const DashboardNewsTickerThumbnail = React.memo(({ imageUrl }) => {
  const [ref, isInView] = useInView({ rootMargin: '160px' });

  return (
    <span ref={ref} className={styles.thumbnailFrame}>
      {isInView && (
        <img
          alt=""
          className={styles.thumbnail}
          decoding="async"
          height="88"
          referrerPolicy="no-referrer"
          src={imageUrl}
          width="128"
          onError={(event) => {
            const image = event.currentTarget;
            image.hidden = true;
          }}
        />
      )}
    </span>
  );
});

DashboardNewsTickerThumbnail.propTypes = {
  imageUrl: PropTypes.string.isRequired,
};

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

  const tickerItems = useMemo(() => getDashboardTickerItems(items), [items]);
  const tickerSequences = useMemo(
    () => [
      ['current', tickerItems],
      ['duplicate', tickerItems],
    ],
    [tickerItems],
  );
  const trackStyle = useMemo(
    () => ({
      '--news-ticker-duration': `${Math.max(60, tickerItems.length * TICKER_SECONDS_PER_ITEM)}s`,
    }),
    [tickerItems.length],
  );

  return (
    <aside className={styles.ticker} aria-label="Notícias de tecnologia">
      <DashboardTvClock />
      <div className={styles.viewport}>
        {tickerItems.length > 0 ? (
          <div className={styles.track} style={trackStyle}>
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
                    {shouldRenderDashboardTickerThumbnail(item) && (
                      <DashboardNewsTickerThumbnail imageUrl={item.imageUrl} />
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
