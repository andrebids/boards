# Card attachment upload retry debug report

- **Symptom:** Creating a card from a file succeeded even when the subsequent attachment upload failed, but the UI only logged the error.
- **Root cause:** `createCardWithAttachment` caught the upload exception after confirming the card and did not dispatch any UI feedback or retain a retry path.
- **Fix:** The upload is now isolated in `uploadCardAttachment`. Failures show an actionable toast that retains the original file and retries only the attachment upload; the created card is never rolled back.
- **Evidence:** Focused saga and watcher tests pass (3 tests total), including the upload failure path.
- **Regression test:** `client/src/sagas/core/services/cards.test.js`.
- **Related:** The socket-origin exclusion still requires explicitly inserting the successful attachment in the local store.
- **Status:** DONE
