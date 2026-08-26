export const getTabBadgeText = (unreadMessageTotal) =>
  unreadMessageTotal > 9 ? '9+' : String(unreadMessageTotal);

export const getTabTitle = (title, unreadMessageTotal) =>
  unreadMessageTotal > 0 ? `(${unreadMessageTotal}) ${title}` : title;
