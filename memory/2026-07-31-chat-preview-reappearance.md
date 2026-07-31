# Debug report: chat preview reappeared after closing a window

- **Symptom:** After opening an incoming-message preview and then closing its chat window, the same preview appeared again without a new message.
- **Root cause:** `ChatLauncher` recalculated preview eligibility whenever `windows` changed. The reducer intentionally retained `lastMessageAlert`, so removing the conversation from `windows` made the old alert eligible again.
- **Fix:** Track handled launcher and preview alerts by `messageId`. Window/list visibility can hide a preview, but only a different `messageId` can present a new one. The preview close control was also moved to the card's top-right corner.
- **Evidence:** Live validation on `http://localhost:3008` showed the new preview, opened its conversation, closed the window, and observed `0` open panels and `0` message previews. The close control measured a 6 px top/right inset.
- **Regression test:** `client/src/components/chat/ChatLauncher/preview.test.js` covers an alert received while its window is open, closing that window with the same alert, and presenting the next message.
- **Related:** This area previously needed window overflow/minimization state tests; keeping alert identity separate from window visibility avoids another presentation-state coupling.
- **Status:** DONE_WITH_CONCERNS — the affected tests, lint, formatting, and live reproduction pass. The full client suite still has the pre-existing Jest JSX-transform failure in `BoardActivitiesPanel.test.js`; all 87 runnable tests pass.
