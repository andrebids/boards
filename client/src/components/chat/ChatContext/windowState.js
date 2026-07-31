// Chat windows intentionally live only for the current UI session. Restoring
// them from browser storage makes old conversations appear to open with a new click.
const createInitialChatWindows = () => [];

export const getOverflowChatWindowIds = (windows, limit) => {
  const activeWindows = windows.filter((window) => !window.isMinimized);
  const overflowCount = Math.max(0, activeWindows.length - limit);

  return activeWindows.slice(0, overflowCount).map((window) => window.id);
};

export const setChatWindowMinimized = (windows, id, isMinimized) => {
  const targetWindow = windows.find((window) => window.id === id);

  if (!targetWindow || targetWindow.isMinimized === isMinimized) {
    return windows;
  }

  return windows.map((window) => (window.id === id ? { ...window, isMinimized } : window));
};

export default createInitialChatWindows;
