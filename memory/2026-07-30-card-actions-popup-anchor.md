# DEBUG REPORT — Card actions popup anchor

- **Symptom:** The card actions popup opened at the top-left of the viewport instead of from the card edit pencil.
- **Root cause:** `usePopup` uses `@fluentui/react-component-ref` to obtain a DOM anchor. After the pencil migrated to the shared `Button` adapter, the forwarded ref resolved to the Semantic UI `Button` component instance instead of an HTML element. Popper therefore received an invalid reference and left its wrapper at `left: 0; top: 0`.
- **Fix:** Wrap the shared button in a positioned native `span` and use that span as the direct `ActionsPopup` trigger. The visual button remains unchanged and the shared button ref contract remains compatible with existing `useNestedRef` consumers.
- **Evidence:** Before the fix, the trigger was at approximately `(531, 339)` while the Popper wrapper remained at `(0, 0)` with no transform. After the fix, the native trigger is `28×28` at approximately `(531, 339)` and the Popper wrapper receives `translate3d(530.857px, 284px, 0)`. The popup was visually confirmed beside the pencil with no browser console errors.
- **Regression test:** Manual hot-reload browser check at `http://localhost:3008/boards/1580585591148381189`, asserting the popup wrapper receives a Popper transform aligned with the trigger. The current automated acceptance suite only covers login and has no authenticated board fixture.
- **Related:** A global change to make the shared `Button` ref point directly to the DOM was rejected because existing components use `useNestedRef` and expect the Semantic UI component instance.
- **Status:** DONE_WITH_CONCERNS — fixed and reproduced successfully; no automated authenticated board regression fixture exists yet.
