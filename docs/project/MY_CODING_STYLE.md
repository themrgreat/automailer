# MY_CODING_STYLE.md

> **Purpose of this file:** This document describes how the developer behind this codebase personally writes code — habits, naming instincts, structural preferences, and recurring quirks — extracted by analyzing a set of eligible personal repositories (collaborative projects and unrelated widget/integration repos were excluded as either non-representative or not solely personally authored).
>
> **This file is NOT an architecture spec.** It does not say what stack, framework, folder structure, or database to use for a new project. It says: *given whatever correct, appropriate technical choice the new project needs, which of the several reasonable ways to write that code would feel most natural for this developer.*

---

## 0. How a future AI should use this file

Priority order when writing new code in this style, **highest first**:

1. **Correctness** — the code must work.
2. **Security & safety** — no vulnerabilities, no unsafe patterns.
3. **Project requirements** — do what the current project actually needs.
4. **Appropriate architecture / engineering best practice for the new project's stack.**
5. **Maintainability & performance.**
6. **Personal style described below** — apply this only where 1–5 leave more than one reasonable option.

**Do not** import architecture, tech stack, or business logic from their old repos into a new project. **Do** carry over: naming instincts, how they shape functions and components, how they handle errors/validation/async, how they comment, how they format, and how much they abstract vs. keep flat.

Where a historical habit is genuinely outdated or technically weaker than the modern/correct approach, **Section 11 ("Modernize, Don't Copy")** tells you exactly how to preserve the *intent* of the habit while using the *right* implementation.

---

## 1. Evidence base

**Analyzed (23 repos):** PingMe, URL-Shortner, Transcript_Viewer (their own widget files only — server scaffold was vendor code), Chart, Tic-Tac-Toe-Game, Bubble-Game, Product-Page, Film-Folio, Photography-Website, Refokus-Website (code-authorship only — visual design is a known clone, excluded from conclusions), Some-Practice-Stuff, Practice-Website-00 through 10.

**Explicitly excluded per instruction:** all Zoho CRM/Deluge/plugin-manifest widgets (Weekly-Plan, Current-FY-Order, Deluge-Helper, Manage_Leave_Request, Partner-Search), Merchant-Minds (MerchantMind), AutoMeta, and the collaborative repos SSSadan and MailGenius (found under collaborators' accounts, not solely theirs).

**Also excluded for lack of signal:** the GitHub profile-README repo (no code), a repo left as an untouched framework starter template, and any vendored/tutorial-verbatim files identified during analysis.

**Confidence tags used throughout:** 🟢 High (consistent across many independent repos/eras) · 🟡 Medium (recurring but context-dependent, or fewer data points) · 🟠 Low (single occurrence, but distinctive enough to be worth knowing).

---

## 2. The five things that matter most (read this if nothing else)

1. **🟢 Leaves commented-out dead code and debug logs in place instead of deleting them** — old function versions, disabled CSS declarations, `// console.log(...)`. This is the single most consistent trait, present in every repo across every era and stack. *(For new code: don't deliberately replicate dead code, but don't be alarmed by it either — this is a genuine habit, not carelessness.)*
2. **🟢 Validation and guards are written as stacked single-line early returns**, not nested ifs:
   ```js
   if (!fullName.trim()) return toast.error("Full name is required");
   if (!email.trim()) return toast.error("Email is required");
   if (!/\S+@\S+\.\S+/.test(email)) return toast.error("Invalid email format");
   ```
3. **🟢 Uncertain data is read through fallback chains / optional chaining**, never assumed present:
   ```js
   const label = data.name || data.title || data.original_name || "Untitled";
   fileInputRef.current?.click();
   ```
4. **🟢 Verb-first, intention-revealing names.** Functions: `getUsersForSidebar`, `handleSubmit`, `validateForm`. Booleans: `isLoading`, `isSendDisabled`, `showOnlineOnly`.
5. **🟢 Defaults to flat, un-abstracted code when moving fast, but is fully capable of clean, reusable, prop-driven abstraction when a project is deliberate** (compare rushed CRUD form duplication in Product-Page vs. the reusable `Card`/`PageTemplate`/`ToggleSwitch` components in Film-Folio). **Default to simple and flat; abstract only once a real second use-case appears.**

---

## 3. Naming conventions

| Element | Convention | Confidence |
|---|---|---|
| Variables/functions | `camelCase` | 🟢 |
| Components/classes/models | `PascalCase` | 🟢 |
| Booleans | `is`/`show`/`has` prefix (`isSigningUp`, `showOnlineOnly`, `hasError`) | 🟢 |
| Event handlers | `handle` prefix (`handleSubmit`, `handleClickOutside`, `handleMenuToggle`) | 🟢 |
| Functions | verb-first (`getX`, `createX`, `validateX`, `setupX`, `applyX`) | 🟢 |
| Files (backend) | role-suffixed (`x.controller.js`, `x.service.js`, `x.dao.js`) | 🟡 (seen in more mature backends) |
| Files (Redux) | `xSlice.js`, `xThunk.js` per feature | 🟡 |
| CSS classes (rushed/practice work) | positional/numbered (`elem0`, `nav-prt1`, `b-two`) | 🟢 (constant across 11 practice sites — a speed habit, not to be copied into production work) |
| CSS classes (deliberate work) | `page-part` scoped abbreviations (`p1-top`, `f-prt1`) | 🟡 |

**Takeaway for new projects:** use clear verb-first function names and `is/has/show` booleans always — these are strong, era-independent habits. Numbered/positional CSS class names were a practice-project shortcut, not a preference to carry forward; prefer descriptive BEM-ish or utility class names in real projects instead.

---

## 4. Function & component structure

- 🟢 Functions and components are typically **short (10–40 lines)**, one clear responsibility, **flat body** — helper functions are rarely nested inside another function.
- 🟢 In React, hook/handler ordering is consistent: state/selector hooks → `useState` → `useRef` → derived `const`s → handler functions → early-return for loading/empty state → JSX.
  ```jsx
  const { messages, isLoading } = useSelector((s) => s.chat);
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const handleSend = () => { /* ... */ };

  if (isLoading) return <Loader />;
  return ( /* JSX */ );
  ```
- 🟡 Under time pressure, near-identical JSX blocks get repeated (e.g. 4–5 similar form fields) rather than mapped over a config array — this is a speed trade-off, not a stylistic preference. When a new project has enough repetition (3+ near-identical blocks), prefer extracting a small reusable component/config-driven render — this is done successfully in more careful projects (Film-Folio's `Card`, `PageTemplate`).

---

## 5. Conditionals & loops

- 🟢 **Guard clauses over nested ifs.** `if (!x) return;` at the top, not wrapped in an outer `if (x) { ... }`.
- 🟢 `.map()` / `.filter()` / `.find()` preferred for transforming arrays; `.forEach()` reserved for side effects (DOM updates, socket handling).
- 🟢 Ternaries for small conditional values/rendering; `switch` used for status-code/enum-like branching (e.g. an axios response interceptor keyed on HTTP status).
- 🟠 Plain `for` loops and `var`/`function` declarations only appear in the earliest vanilla-JS practice work — treat this as an early-stage habit that has already been superseded, not a preference to preserve.

---

## 6. Error handling & validation

- 🟢 Standard shape for backend handlers: `try { ... } catch (error) { log with context; respond with a clear status + message }`. Example of the instinctive template:
  ```js
  try {
    // logic
  } catch (error) {
    console.log("Error in createUser controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
  ```
- 🟡 **When a project grows past a few endpoints, this gets refactored into a shared wrapper** (`wrapAsync`) plus a small custom error-class hierarchy (`AppError`, `NotFoundError`, `ConflictError`) and one central error-handling middleware — this is the *correct* direction to default to in new backend projects, not the copy-pasted-per-function version.
- 🟢 Frontend: `try/catch/finally`, with a dedicated loading flag set `true` before the call and reset in `finally`; errors surfaced via a toast/snackbar with a fallback message: `err.response?.data?.message || err.message || "Something went wrong"`.
- 🟢 Manual validation (regex/length checks) rather than a schema library, historically. **Modernize this**: prefer a schema validator (Zod, Yup, etc.) in new projects for anything beyond trivial forms — but keep the habit of surfacing each failure as one clear, specific, user-facing message rather than a generic "invalid input."

---

## 7. Async & data fetching

- 🟢 **`async/await` exclusively** — no `.then()` chains, no raw callbacks (outside of DOM event listeners).
- 🟢 API calls centralized behind a single configured client instance (an `axiosInstance` with `baseURL` + interceptors) rather than inline `fetch`/`axios` calls scattered through the codebase.
- 🟡 In Redux-based apps, `createAsyncThunk` is the default async-state pattern, paired with a `Slice` file per feature/domain.
- 🟢 Every async UI action gets its own loading boolean, set/reset immediately around the call — this is worth keeping in any frontend stack (React Query/SWR states, Vue refs, plain state — whatever fits the new stack).

---

## 8. Code organization

- 🟡 Feature-based folders once a frontend project grows (`features/auth`, `features/chat`, each with its own slice + thunk + components) rather than type-based folders (`components/`, `reducers/` globally).
- 🟡 Backend: layered `controller → service/DAO → model` emerges in more mature work; flatter `controller → model` in earlier/smaller projects — layering is the direction to default to for anything non-trivial.
- 🟢 Vanilla-JS sites: fixed shape of `index.html` + `style.css` (+ optional `script.js`) + `images/`, no build tooling — appropriate only for genuinely static work; don't read this as an aversion to build tooling elsewhere (React projects all use Vite).
- 🟢 One small, deliberate abstraction extracted per recurring need (`socketService.js`, `formatMessageTime`, `wrapAsync`) rather than a big shared "utils dumping ground" file.

---

## 9. Comments, formatting, and personal voice

- 🟢 Comments are **sparse and purposeful** — they explain *why*, label a section, or flag a hack. Code is not narrated line-by-line.
- 🟢 Section-banner comments to delimit logical blocks: `// ---------- GSAP page animation ----------- //`
- 🟠 Occasional comments in **Hinglish**, and hacky/workaround CSS is sometimes flagged with the word **"Jugaad"** (e.g. `/* Jugaad for hover */`) — a genuine, distinctive personal voice marker. Fine to use sparingly for real workarounds in casual/personal projects; skip in professional/client-facing codebases unless requested.
- 🟢 Double quotes for strings (JS/JSX/HTML); semicolons present in frontend/CSS/HTML, more often omitted in backend JS files — treat as a per-file-type convention, not a rule to force either way; just be **consistent within a file**.
- 🟡 Indentation: 4 spaces in vanilla HTML/CSS/JS and backend files, 2 spaces in React/JSX files — likely tooling/era-driven rather than a conscious choice; match whatever the new project's formatter/linter already enforces.
- 🟢 Destructuring used heavily (`const { name, value } = e.target`); template literals over string concatenation.
- 🟢 Descriptive `alt` text on every image, always — a genuine accessibility habit worth always keeping.

---

## 10. CSS / visual styling philosophy

- 🟢 **Fluid, viewport-relative sizing** (`vw`, `vh`, `vmin`/`vmax`, `clamp()`) preferred over fixed `px`/`rem` for type scale and spacing — the strongest, most consistent CSS instinct across every era and project.
- 🟢 A small, fixed set of **desktop-first breakpoints** (roughly ~992px → ~768px → ~550-600px), reused near-verbatim project to project.
- 🟢 Global reset at the top of every stylesheet (`* { margin:0; padding:0; box-sizing:border-box; }`), one font-family stack declared once.
- 🟡 Historically: no CSS custom properties/design tokens, manual vendor prefixing, plain descendant selectors mirroring HTML nesting instead of nesting/SCSS. **Modernize these three specifically** (see Section 11) — the underlying instinct (fluid sizing, a small deliberate breakpoint system, minimal global reset) is good and should be kept; the *mechanism* should upgrade to CSS variables + a modern build pipeline that handles prefixing automatically.
- 🟢 Semantic HTML tags (`header`, `nav`, `main`, `footer`) used in more careful projects — this, not div-soup, is the actual preference when not rushing a practice exercise.

---

## 11. Modernize, don't copy — outdated habits → correct equivalent

| Historical habit (older repos) | Why it's dated / weaker | What to actually do (preserving the underlying intent) |
|---|---|---|
| Per-function copy-pasted `try/catch` + `console.log` in every controller | Not DRY, inconsistent error shape at scale | Central `wrapAsync` + custom error classes + one error-handling middleware (already done in more mature projects — default to it from the start) |
| Manual regex/length validation | Error-prone, hard to maintain, no type safety | Schema validation (Zod/Yup/etc.), but keep the habit of one specific, human-readable message per failed field |
| No CSS custom properties, manual vendor prefixes | Harder to theme/maintain; modern browsers/build tools don't need manual prefixing | CSS custom properties for tokens (`--space-md`, `--color-primary`) + fluid `clamp()` sizing (keeps the vw-based philosophy) + let the build tool (PostCSS/Autoprefixer or the framework) handle prefixing |
| Numbered/positional class names (`elem0`, `b-two`) | Not self-documenting, brittle to reorder | Descriptive, semantic class names (BEM-ish or utility classes) — keep the instinct of "one class per visual part," just name it for what it *is*, not its position |
| Duplicated near-identical JSX/HTML blocks | More code to maintain, easy to drift out of sync | Extract a small reusable component/config-driven `.map()` once 3+ near-identical blocks exist — already done well in more deliberate projects |
| Flat controller → model backend (no service layer) for larger apps | Business logic and persistence get entangled as the app grows | Controller → service → data-access layering for anything beyond a tiny CRUD app (URL-Shortner shows this happening naturally once it matters) |
| No null-checks on `querySelector` results in older vanilla JS | Silent runtime failures if markup changes | Guard before using a DOM ref, especially in code that isn't a quick practice script |

---

## 12. Defensive coding tendencies (keep these)

- 🟢 Fallback chains (`a || b || c || "default"`) and optional chaining as the default way to read data that might be missing.
- 🟢 Guard clauses at the very top of a function before doing any work.
- 🟢 Loading/error/empty state handled explicitly and early (`if (isLoading) return <Loader />`) rather than branching deep inside the render.
- 🟢 Descriptive `alt` text, defensive `preventDefault()` on drag/drop-style interactions.

---

## 13. Quick checklist for writing new code "in this style"

When there's more than one reasonable way to implement something, prefer the option that:

- [ ] Uses verb-first function names and `is/has/show`-prefixed booleans
- [ ] Handles validation as stacked early-return guard clauses with specific messages
- [ ] Reads uncertain/external data through fallback chains or optional chaining
- [ ] Uses `async/await` with a per-call loading flag and try/catch/finally
- [ ] Centralizes API calls behind one configured client rather than scattering fetch calls
- [ ] Keeps functions/components short and flat; abstracts only after real repetition appears
- [ ] Comments sparingly — only to explain *why*, flag a hack, or label a section
- [ ] Uses fluid (`vw`/`clamp()`) sizing and a small, deliberate breakpoint set for layout
- [ ] Applies modern equivalents (schema validation, CSS variables, layered backend, DRY error handling) instead of literally copying an older, weaker pattern — per Section 11
- [ ] Stays consistent within a file (quote style, semicolons, indentation) even if the exact convention varies project to project

This file should be revisited and re-generated periodically as more independent (non-collaborative, non-vendor) repositories accumulate.
