// Chat windows intentionally live only for the current UI session. Restoring
// them from browser storage makes old conversations appear to open with a new click.
const createInitialChatWindows = () => [];

export default createInitialChatWindows;
