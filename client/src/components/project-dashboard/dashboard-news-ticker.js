export const MAX_DASHBOARD_TICKER_ITEMS = 18;

export const getDashboardTickerItems = (items) =>
  Array.isArray(items) ? items.slice(0, MAX_DASHBOARD_TICKER_ITEMS) : [];

export const shouldRenderDashboardTickerThumbnail = (item) =>
  item?.source === 'r/singularity' && Boolean(item.imageUrl);
