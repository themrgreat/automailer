# Design System — AI Bulk Email (Automailer)

> Derived entirely from `frontend/src/index.css` and how components in `frontend/src/components/`
> and `frontend/src/pages/` apply its classes. No design tool file (Figma, etc.) or style guide
> exists in the repo — this document is a reverse-engineering of the shipped CSS.
> Note: `frontend/src/index.css` has uncommitted local changes at time of writing (see git status)
> — re-check the file before treating every detail below as final if it has since changed further.

## Visual Style

- **Overall style**: dark, dense, utilitarian dashboard/admin aesthetic — flat panels, subtle
  borders, small type, generous use of muted secondary text. No illustration, no gradients beyond a
  skeleton-loading shimmer and a striped "in-progress" fill on progress bars.
- **Layout**: fixed-width left sidebar (`--sidebar-width: 232px`) + a fluid main content column
  capped at `max-width: 1180px` and centered (`.app-shell`). Below 900px the sidebar collapses into
  a slide-in drawer behind a topbar hamburger button.
- **Spacing**: tight, consistent small increments (commonly 4/6/8/10/12/14/16/18/20px), no spacing
  scale variables defined — literal pixel values are used throughout rather than `--space-*` tokens.
- **Cards** (`.card`): the base content container — `var(--panel)` background, `1px solid
  var(--border)`, `var(--radius)` (10px) corners, 20px padding, 16px bottom margin. Most page
  sections are one `.card`.
- **Buttons** (`.btn`): inline-flex, bordered, `var(--panel-2)` background by default, 8px radius,
  13px font. Variants: `.btn-primary` (solid accent-colored), `.btn-danger` (danger-colored text/
  border on hover), `.btn-sm` (compact padding/font for inline row actions). Disabled state: 0.5
  opacity + `not-allowed` cursor.
- **Forms**: all text/email/number/password/textarea/select inputs share one rule set — `var(--bg)`
  background (darker than the card they sit in), `1px solid var(--border)`, 8px radius, full width,
  focus state swaps border color to `var(--accent)`. Labels are a separate `.field-label` block
  above the input (12px, `var(--text-dim)`, 500 weight), each input+label pair wrapped in a
  `.field` block with a 14px bottom margin. Password fields get a show/hide eye-icon toggle button
  absolutely positioned inside the input (`.field-input-wrap` / `.field-toggle-btn`).
- **Navigation**: a persistent left sidebar with brand block, flat nav links (10px gap icon+label,
  9px/12px padding, `var(--radius-sm)` corners), an `.active` state using the dim-accent background,
  and a footer line summarizing the workflow ("Import → Template → Generate → Review → Send").
- **Borders**: `1px solid var(--border)` is the near-universal border treatment across cards,
  inputs, tables, tabs, badges' containers, etc. — no double borders, no border on hover except a
  color swap to `var(--accent)`/`var(--danger)` on interactive elements.
- **Border radius**: three tokens — `--radius-sm: 6px` (small pills/icons/nav links),
  `--radius: 10px` (cards, most containers), `--radius-lg: 14px` (bigger feature cards like
  `.cta-card`, `.provider-card`). Fully round (`999px`) is used for pill-shaped elements (step
  pills, status pills, badges, progress bar track).
- **Shadows**: two tokens only — `--shadow-sm` (subtle, on card hover) and `--shadow-md` (deeper,
  used for the mobile sidebar drawer and toast stack). Shadows are used sparingly, not as a default
  card treatment.

## Colors

All colors are defined once as CSS custom properties on `:root` in `frontend/src/index.css`
(lines 1–21) — there is **no separate light-mode palette** and no Tailwind/theme config file.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0f1115` | Page/app background, and the "recessed" background inside cards for inputs and preview boxes |
| `--panel` | `#171a21` | Card/sidebar/panel background — the primary surface color |
| `--panel-2` | `#1e222b` | Secondary surface — buttons, table striping-equivalent elements, toasts, skeleton shimmer, chips |
| `--border` | `#2a2f3a` | Universal border color |
| `--text` | `#e8eaed` | Primary text color |
| `--text-dim` | `#9aa1ac` | Secondary/muted text (labels, descriptions, meta info) |
| `--accent` | `#6c8cff` | Primary brand/interactive color (links, focus rings, primary buttons, active states) |
| `--accent-dim` | `#3a4a8a` | Muted accent background (active nav link, active step pill, icon chip backgrounds) |
| `--success` | `#3ecf8e` | Success semantic color (sent status, success toast, positive test result) |
| `--warning` | `#f2b84b` | Warning semantic color (generating/sending in-progress badges) |
| `--danger` | `#f2554a` | Error semantic color (failed status, danger buttons, error banners) |

Additional one-off colors appear inline for specific semantic backgrounds rather than as root
tokens (Needs Verification whether these should be promoted to `:root` tokens in a future cleanup):
`#16332a`/`var(--success)` (success pill/chip background), `#3a2f1f`/`var(--warning)` (no-config
warning pill), `#1f2f3a`/`#6ca9f2` (info-blue pill, e.g. "reviewed"/"ready_to_send" badges,
"enabled" status pill), `#3a1f1f`/`#ffb4ae` (error banner and failed test-result background/text),
`#1f3a3a`/`#4fd1c5` (teal accent used for the "ai_generated" badge and one dashboard icon variant).

## Theme

- **Light mode**: **Not implemented.** All colors are hardcoded dark-theme values on bare `:root`
  with no `@media (prefers-color-scheme: light)` or `[data-theme]` override.
- **Dark mode**: the only theme; it is not conditionally applied — it's simply the app's single
  visual design.
- **Theme switching**: **Not implemented** — no toggle, no stored preference, no `prefers-color-
  scheme` media query at all in `index.css`.
- **Theme variables/tokens**: exist (the `--*` custom properties above) but are used as a
  maintainability convenience, not as a multi-theme mechanism today.

## Typography

- **Font family**: system font stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter,
  Roboto, Helvetica, Arial, sans-serif` — declared once on `body`. No web font is loaded (no
  `@font-face`, no Google Fonts link).
- **Base size**: `14px` on `body`, `line-height: 1.5`.
- **Heading sizes** (all literal `px`, no fluid `clamp()`/`vw` sizing is used anywhere in this
  file — unlike the fluid-sizing habit noted in `MY_CODING_STYLE.md`, this project uses fixed
  pixel sizes throughout):
  - Page title (`.page-title`): 20px, weight 700.
  - Card heading (`.card h2`): 15px (no explicit weight override — inherits browser default `h2`
    bold).
  - Provider card title (`.provider-card-title`): 15px, weight 600.
- **Body/UI sizes**: a dense scale of small sizes is used rather than a strict type scale —
  observed values include 11px, 11.5px, 12px, 12.5px, 13px, 13.5px, 14px, 15px. Examples: page
  subtitle 13px, card description 12.5px, table cells 12.5px, table headers 11.5px uppercase,
  status pills 10.5px uppercase, buttons 13px (12px for `.btn-sm`).
- **Font weights used**: 500 (labels, nav links, buttons), 600 (titles, card headings, badges'
  bold spans), 700 (page title, summary tile numbers, status pills). No 300/400-explicit or
  900-weight usage found.
- **Letter spacing**: only on uppercase micro-labels — `0.02em`–`0.03em` (table headers, summary
  tile labels, status pills).
- **Line height**: `1.5` set globally on `body`; not overridden per element elsewhere.

## Responsive Design

- **Breakpoints**: two, both `max-width` (desktop-first): `900px` and `600px`.
- **900px breakpoint**: sidebar becomes a fixed, off-canvas drawer (`transform: translateX(-100%)`
  by default, slides in via `.sidebar.open`), a topbar with a hamburger menu button appears
  (`.topbar { display: flex }`), a dark scrim overlay appears behind the open drawer
  (`.sidebar-scrim`), and `.app-shell` padding shrinks from `24px 20px 80px` to `18px 14px 60px`.
- **600px breakpoint**: the toast stack (`.toast-stack`) switches from a fixed bottom-right box with
  a `320px` max width to a full-width-minus-margins bar (`left/right: 14px`, no max-width cap).
- **No dedicated tablet breakpoint** exists between 600–900px beyond the single 900px sidebar
  collapse — the grid layouts (`.dashboard-grid`, `.provider-grid`) rely on CSS Grid
  `auto-fit`/`minmax()` to reflow responsively without an explicit breakpoint.
- **Desktop behavior**: full sidebar always visible, `.app-shell` content centered with a 1180px
  cap so text/tables don't over-stretch on very wide screens.
- **Mobile behavior**: single-column stacking is achieved implicitly via `auto-fit`/`minmax` grids
  and flex-wrap on `.btn-row`/`.stepper`/`.page-header`, rather than explicit mobile-only rules
  beyond the two breakpoints above. Tables (`.data-table`) rely on `.table-scroll { overflow-x:
  auto }` for horizontal scrolling on narrow viewports rather than reflowing to cards.

## Reusable UI

| Component/class | Purpose | Design convention |
|---|---|---|
| `.card` | Base content container used on nearly every page | panel bg, bordered, `--radius`, 20px padding |
| `.btn` / `.btn-primary` / `.btn-danger` / `.btn-sm` | All buttons app-wide | bordered by default, solid accent for primary actions, compact variant for inline row actions |
| `.field` + `.field-label` | Every form input | label above input, consistent 14px bottom margin |
| `.badge` + `.badge-<status>` | Record status display (`StatusBadge.jsx`) | one modifier class per lifecycle status, each with a distinct semantic background/text color pairing |
| `.status-pill` + `.status-pill-<variant>` | Provider configuration state (`ProviderCard.jsx`'s `StatusPill`) | `default` (success-green), `on`/configured (info-blue), `off`/disabled (neutral gray), `none`/not-configured (warning-amber) |
| `.step-pill` (`Stepper.jsx`) | Batch workflow progress indicator | numbered circle + label; `.active` (accent), `.done` (success, clickable) states |
| `.tabs` / `.tab-btn` | Mode/filter switching (template mode tabs, review status filters) | underline-style active indicator (2px accent bottom border) |
| `.summary-row` / `.summary-tile` | Numeric KPI-style stat display (preview counts, review counts) | flex row of equal-ish tiles, large bold number + small uppercase label |
| `.progress-bar` / `.progress-bar-fill` / `.progress-bar-fill.active` | Bulk generation progress (`GenerateStep.jsx`) | striped animated fill while in progress, solid once complete |
| `.email-card` (`EmailCard.jsx`) | Per-record review unit | secondary-surface bg, view/edit/reprompt/history modes swapped via local component state, not separate components |
| `.provider-card` (`ProviderCard.jsx`) | Per-provider settings unit | shared by both AI and Mail settings pages; feature-larger radius (`--radius-lg`) than a plain `.card` |
| `.toast` / `.toast-success` / `.toast-error` (`Toast.jsx`) | Global transient notifications | fixed bottom-right stack, auto-dismiss after 3.5s, colored left-border-equivalent via full border color swap |
| `.error-banner` | Inline error display | consistent danger-tinted box, reused identically across every page/step for caught errors |
| `.dropzone` / `.dropzone.drag` | File upload target (`ImportPage.jsx`) | dashed border, hover/drag state swaps border color and adds a background tint |
| `.data-table` / `.table-scroll` | Any tabular data (batch preview, recipient selection) | sticky header row, ellipsis-truncated cells with `title` tooltip, horizontal scroll container |
| `.spinner` / `.spin-icon` | Inline loading indicators | small rotating ring (`.spinner`) or rotating icon wrapper (`.spin-icon`, used with `lucide-react`'s `Loader2`) |
| `.skeleton-row` | Loading placeholder for lists (`Dashboard.jsx`, provider pages) | animated gradient shimmer bar |

**Consistency convention to preserve**: new UI should reuse an existing class from this table
rather than inventing a new visual pattern for something that already has one (e.g. a new async
action's loading state should reuse `.spinner`/`.spin-icon` + a `busy` state, not a new spinner
design; a new numeric stat display should reuse `.summary-tile`, not a bespoke layout).
