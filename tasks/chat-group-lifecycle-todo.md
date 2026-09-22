# Chat group lifecycle — implementation checklist

Scope: lifecycle changes from the approved chat-group plan. Reviewed on 2026-09-21; remaining failures corrected and revalidated on 2026-09-22 in this worktree. No production deployment, production migration, build, commit, or push was performed.

## Phase A — data and server contract

- [x] Add participant lifecycle columns: `left_at`, `left_reason`, `history_visible_through_message_id`, `history_hidden_at`.
- [x] Keep leave/remove as participant state transitions; do not delete participant rows.
- [x] Add transaction-scoped advisory locking for leave, removal, and re-entry.
- [x] Revalidate project membership and active owner/writer state inside the lifecycle transaction.
- [x] Preserve owner transfer and archive behavior for the last active member.

## Phase B — visibility and client behavior

- [x] Enforce private lower history boundaries and exit/re-entry upper boundaries in message reads and extras.
- [x] Hide post-exit edits, attachments, reactions, replies, link previews, unread counts, and scheduled chat notifications.
- [x] Block writes, reactions, attachment creation, forwarding, editing, deletion, and live subscriptions for historical participants. Historical reads and read cursors stay within the exit boundary.
- [x] Keep historical conversations visible as read-only until the participant explicitly removes them from their list.
- [x] Add explicit confirmation for owner leave/member removal and translated lifecycle copy in EN/PT/FR/ES.
- [x] Explain re-entry history semantics in the group editor.

## Review corrections

- Moved lifecycle utilities out of the Sails helper loader; corrected controller imports.
- Declared the message visibility helper synchronous and tested the actual Sails machine calling convention.
- Revalidated membership inside conversation locks, including forwarding, attachments, reads, subscriptions and pending notification delivery.
- Published fresh lifecycle state after commit so concurrent leave/re-entry cannot publish stale participant permissions.
- Applied historical limits before pagination and to direct attachment downloads, replies, reactions and refreshed previews.
- Repaired client historical-cache reloads, hidden-conversation re-entry, socket resubscription, active member counts, pending/error confirmations and abandoned fetch states.
- Corrected the attachment upload success exit: the attachment was persisted but the HTTP response did not finish.

## Validation

- [x] Server chat wildcard + push suite: **102 passing, 0 failing**.
- [x] Focused client lifecycle suites: **82 passing, 0 failing** across 9 suites.
- [x] Expanded client chat + request queue suite: **180 passing, 0 failing** across 24 suites (2026-09-22). The two former layout failures were stale test expectations: the mention portal lives in shared `MessageTextInput`, and the compact panel is bottom-anchored. Tests now cover those actual contracts, including portal layering, desktop/mobile viewport caps, list scrolling and launcher clearance. No layout CSS change was needed.
- [x] ESLint on all changed/new server JavaScript: 49 files, 0 errors/warnings.
- [x] ESLint on all changed/new client JavaScript/JSX: 28 files, 0 errors/warnings.
- [x] Follow-up ESLint on all 7 JavaScript files changed for the remaining failures: 0 errors/warnings.
- [x] Dependency-backed checks used the installed canonical checkout dependencies via `NODE_PATH`; the earlier missing-dependency blockers are resolved.
- [x] API integration (`server/test/chat-lifecycle-api.mjs`) passed against a disposable PostgreSQL database: 3→2→1→0, owner transfer, removal, re-entry after hiding, absent/cleared history bounds, late edits/attachments, empty history, historical pagination/deep links and archived state.
- [x] Two independent socket sessions: concurrent send/leave respects the exit boundary, and neither departed session receives later messages. Concurrent last-member departures archive the group.
- [x] Notification race tests use mocked delivery providers; no real email/push delivery was performed.
- [x] Browser proof in authenticated QA at `http://localhost:3009`: owner-leave confirmation; history retained with composer/attachments disabled; private list removal; re-entry without reload; absence messages visible; successful new message; owner transfer; member-removal confirmation; single-member write blocking with rename still allowed; re-add restores the composer.
- [x] Follow-up responsive browser check: panel stays within the viewport at widths 320, 768, 1024 and 1440 px (height 800). Desktop bottom = 716, mobile bottom = 724; panel z-index = 10031. Temporary viewport override was reset. Mention suggestions were visible in the body portal at z-index 10033 and selectable with Enter.
- [x] Console error reproduced and resolved: hiding the historical group unmounted the composer, which posted `/typing` after access ended. The typing saga now skips unavailable/read-only conversations. A regression test also proved the detached request queue reported failures as unhandled even when its caller caught them; the queue now returns an outcome and rethrows only to its caller. Tests verify ordering, continuation after failure, and preservation of genuinely unhandled errors.
- [x] Typing selector warning resolved using the existing memoized selector utility; a regression test verifies stable results and updates when typing changes.
- [x] Final authenticated browser sequence (2026-09-22): send message → leave → preserved read-only history → remove from list. **No console errors or warnings** during the final sequence, including panel and mention checks. Temporary diagnostic logging was removed.
- [x] `git diff --check` passed.

### Isolated QA runtime

The worktree was mounted into `planka-chat-qa-server-2fe2` and `planka-chat-qa-client-2fe2`, with `planka-chat-qa-db-2fe2` on the separate `planka-chat-qa-2fe2` network. Existing development images/dependencies were reused, with server/client hot reload and disposable QA-only users/projects. Local ports are 3009 (UI) and 1338 (API); email/push delivery is disabled. Migrations ran only in the disposable database, including validation of the stricter lifecycle constraint. The canonical development checkout/service at port 3008 was not changed.

The QA containers remain running for inspection. Stopping/removing this QA stack discards its disposable database. Do not use these test credentials/data for production.

## Release follow-up

- [ ] Review and run the migration in the normal release window.
- [x] Run the server/client dependency-backed lifecycle test suites.
- [x] Validate authenticated leave/remove/re-entry flows against the isolated development service.
- [x] Resolve the two baseline layout-test failures; expanded scoped suite is now entirely green.
- [ ] Deploy only after the above checks and explicit release authorization.
