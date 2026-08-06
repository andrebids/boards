# Board member tooltip clipping

## Symptom

The user-name tooltip below each board member avatar was partially hidden in the board's top-left action bar.

## Root cause

`UserAvatar` rendered board tooltips as pseudo-elements inside `BoardActions`. The action bar must keep `overflow-x: auto` for narrow viewports and therefore computes vertical overflow as clipped. The tooltip extended to approximately `y=198`, while the clipping ancestor ended at `y=186`.

The tooltip was introduced in commit `be112b0` without accounting for that overflow boundary. Raising `z-index` cannot escape an ancestor's overflow clip.

## Fix

Board-avatar tooltips now use the project's existing Semantic UI `Popup`, rendered through its portal and configured with `preventOverflow`. The existing avatar action click remains the popup trigger for membership actions.

## Verification

- Before: tooltip pseudo-element exceeded its clipping ancestor by about 12 px.
- After: forced-open diagnostic measured the first tooltip at `x=26..106`, `y=175..207`, mounted outside the action bar and fully within the 1280x720 viewport.
- The temporary forced-open diagnostic was removed.
- Avatar click still opens the membership actions popup.
- Browser console: no errors.
- ESLint for `UserAvatar.jsx`: pass.
- Client tests: 88 tests pass across 23 suites. One unrelated suite fails before running because the Jest/Babel configuration does not parse JSX in `BoardActivitiesPanel.test.js`.

## Regression seam

The current Jest setup has no working component-rendering seam for this JSX/portal interaction. The regression was checked against the real local application via hot reload and DOM geometry.
