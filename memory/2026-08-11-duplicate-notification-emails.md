# Debug report: duplicate notification emails

- **Symptom:** A single `addMemberToBoard` event produced two emails: a templated message from the central SMTP sender and a plain message from a legacy personal sender.
- **Root cause:** `notifications/create-one` sent through the central Nodemailer/SMTP path and then forwarded the same event to every personal Apprise `NotificationService`. A personal `mailto://` service therefore duplicated central email delivery.
- **Fix:** When central email is enabled, filter `mailto://` and `mailtos://` services from the personal Apprise batch. Other personal services such as Discord remain enabled.
- **Evidence:** The regression test failed before the fix because the Apprise batch contained both mailto and Discord. It passes after the fix with one central email and only Discord in the Apprise batch. Focused lint passes; the development server is healthy and `/api/config` returns HTTP 200.
- **Regression test:** `server/test/utils/notification-preferences.test.js` — `does not send a second mailto notification when central email is enabled`.
- **Related:** The complete test command currently stops during Sails bootstrap at `server/config/custom.js:62` because `sails.config` is undefined. Running all utility tests reaches 98 passing and one unrelated existing failure in `comment-mentions.test.js`, whose `User` mock lacks `NotificationLevels`.
- **Status:** DONE_WITH_CONCERNS — the affected flow is covered and verified, while unrelated pre-existing suite failures prevent a fully green repository-wide run.
