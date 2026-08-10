# Debug report: file drop creates story and large image upload fails

- **Symptom:** `TRANSVERSAL 3.jpg` could not be uploaded by dropping it directly on a list, and the resulting card path used the story type.
- **Root cause:** the list drop handler hard-coded `type: 'story'`. Separately, the 21,646,924-byte image exceeded Skipper Disk's implicit 15,000,000-byte upload limit because regular attachments did not configure `maxBytes`.
- **Fix:** dropped files and all newly-created cards are forced to the project type; the story choice was removed from creation/settings UI while legacy stories remain readable. Regular attachments now default to a configurable 25 MiB limit through `ATTACHMENT_MAX_BYTES`.
- **Evidence:** client drop regression tests pass; server upload-limit regression test passes; server lint passes; the running development container reports `attachmentMaxBytes=26214400`; browser validation shows the add-card form without a type selector and no console errors.
- **Regression tests:** `client/src/utils/file-helpers.test.js` and `server/test/utils/attachment-upload-limit.test.js`.
- **Related:** the full client suite has 23 passing suites and one unrelated pre-existing JSX/Babel configuration failure in `BoardActivitiesPanel.test.js`.
- **Status:** DONE_WITH_CONCERNS (the browser-control surface could verify the UI but cannot inject an external filesystem drag; the size-limit path is covered by configuration/unit evidence).
