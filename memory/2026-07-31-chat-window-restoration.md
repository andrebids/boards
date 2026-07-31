# Chat windows restored with a new click

## Debug report

- **Symptom:** Clicking one project member could make two chat windows and additional dock bubbles appear.
- **Root cause:** `ChatContext` restored the complete per-project window list from `localStorage`. That restoration could become visible around the next interaction, while `openConversation` correctly appended only the newly selected conversation. The individual overflow bubbles introduced in commit `c1bc499` made the restored windows more noticeable.
- **Fix:** Chat windows now live only in the current UI session. Initial state and project/user scope changes start with an empty window list; the context no longer reads, writes, or clears persisted chat-window state.
- **Evidence:** Before the fix, a reload restored two windows without a click. After the fix, one member click produced one window and a reload produced zero restored windows.
- **Regression test:** `client/src/components/chat/ChatContext/windowState.test.js` verifies that stale browser storage is not consulted when initializing chat windows.
- **Related:** Multi-window behavior is preserved within a single session. The full client suite has one pre-existing infrastructure failure in `BoardActivitiesPanel.test.js` because Jest lacks JSX transformation; the other 21 suites and 79 tests passed.
- **Status:** DONE_WITH_CONCERNS (the chat fix is verified; the unrelated JSX test configuration failure remains)
