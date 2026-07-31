# Minimized overflow chat reopens after closing a panel

## Debug report

- **Symptom:** With three chat conversations, the dock showed two panels and one bubble. Closing one visible panel automatically reopened the conversation represented by the bubble.
- **Root cause:** `ChatDock` derived overflow conversations as `hiddenWindows`, but left their `isMinimized` state set to `false`. Once a visible panel was removed, the layout recomputed its available slots and promoted the still-active hidden conversation.
- **Fix:** Overflow conversations are now converted into explicit minimized state through an idempotent context operation. The dock keeps the bubble visible, and a conversation only returns to a panel after the user clicks that bubble.
- **Evidence:** Before the fix, opening Geral, João, and Marta then closing Marta left two panels (Geral and João). After the fix, the same sequence leaves one panel (João) and the Geral bubble.
- **Regression test:** `client/src/components/chat/ChatContext/windowState.test.js` verifies that an overflow conversation remains minimized after another panel is closed.
- **Verification:** Targeted regression tests and lint passed. In the full client suite, 21 suites and 82 tests passed. Two unrelated failures remain in the current worktree: an inbox mention-total assertion in `reducers/chat.test.js`, and missing JSX transformation for `BoardActivitiesPanel.test.js`.
- **Status:** DONE_WITH_CONCERNS (the dock behavior is fixed and verified; unrelated suite failures remain)
