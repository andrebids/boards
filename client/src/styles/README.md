# CSS architecture

This directory owns only global styling concerns:

- `glass-theme.css`: design tokens and reusable utility classes.
- `glass-modal.css`: shared modal shell and Semantic UI compatibility rules.
- `select-order-overrides.css`: legacy global overrides. Do not add new rules here.

Component states, modal variants, and feature-specific Semantic UI overrides belong in the relevant component's `*.module.scss` file. Scope third-party selectors to the component root and document the reason when `!important` is unavoidable.

Import global styles before application components in `src/index.js`. This keeps component styles as the final layer in the cascade. Do not target generated CSS-module class names or add broad selectors such as `.ui .button` to global files.

When changing an existing global override, move it to the owning component instead of adding another competing rule. The Project Settings modal is the reference migration for this pattern.
