# Gatekeeper — design system (Master)

B2B security / access-control admin: **light**, high legibility, **flat** layout (no card/pill UI). Operator console, not a marketing site.

## Brand and tone

- **Product:** physical access + face-matching; the UI is for operators at a desk.
- **Visual direction:** **light** warm neutrals (stone/warm gray), **flat** regions separated by **hairline rules** only. No heavy rounded “cards” or full-pill controls. **One** neutral/ink primary for default actions; **green/red** only for domain states (granted/denied/review affordances), not for generic chrome.

## Color tokens (semantic)

- **Background:** off-white / warm paper (`--color-bg`).
- **Surface:** white or slightly raised warm gray (`--color-surface`, `--color-surface-raised`).
- **Borders:** warm gray, 1px (`--color-border`, `--color-border-subtle`).
- **Text:** body ink (`--color-text`); **muted** for metadata (`--color-text-muted`), ≥3:1 on light surfaces; body ≥4.5:1.
- **Primary (generic CTAs):** dark ink/charcoal (`--color-accent`), not saturated green.
- **Focus:** warm brown/amber ring (`--color-focus`), not blue.
- **Danger / denied:** red family for destructive and denied; **granted** green only where the action is “grant” in a data table or success state, not for every button.

**Avoid:** slate–cyan–violet “tech” gradients, neon progress bars, purple/blue as default UI chrome.

## Typography

- **Body / UI:** IBM Plex Sans (400–700) via Google Fonts, loaded in HTML.
- **Mono / metrics:** IBM Plex Mono for numbers and threshold lines.
- **Scale:** Tight: section labels are often **uppercase, small, tracked**; page title remains the heaviest weight.

## Components

- **Buttons:** small corner radius (≈2–4px), **hairline** border for secondary; **primary** = dark fill. No pill shapes.
- **Focus:** 2px outline using `--color-focus`; do not use `outline: none` without replacement.
- **Disabled:** lower opacity and `not-allowed`.
- **Tables:** optional sticky header; compact row padding; outer frame **not** a heavy rounded “card” — borders as simple rules.
- **Layout:** **CSS grid** on admin: header + two-column **workspace** (roster/imports | thresholds/calibration/review) + full-width **enroll** main; minimize vertical scrolling on common viewports.

## Anti-patterns (avoid)

- Rounded “card” stacks for every block.
- Fully rounded (pill) buttons and progress tracks.
- Cyan–indigo or purple gradients for non-semantic progress.
- Using **success** green for every primary action.
- Relying on color alone for destructive actions (pair with label/position).
- Unstyled `h1`–`h3` in flow (use the label styles above for dense admin sections).
