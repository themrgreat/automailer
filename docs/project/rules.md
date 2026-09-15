# Development Rules — AI Bulk Email (Automailer)

> These rules describe how to work in this specific codebase. They are derived from the existing
> code's actual conventions (verified by reading `backend/src` and `frontend/src` in full), not
> generic best practice. Where the repo also has `MY_CODING_STYLE.md` (the developer's personal
> style profile from their other projects), this file takes priority for anything specific to
> *this* project — fall back to `MY_CODING_STYLE.md` only where this project's own code leaves more
> than one reasonable option.

## General Rules

- Inspect the existing route/service/component before adding a new one — most needs (CRUD on a
  collection, a provider integration, a settings card) already have a near-identical existing
  pattern to copy.
- Do not restructure `backend/src` or `frontend/src` folder layout without being explicitly asked.
- Do not introduce a new state-management library, ORM, CSS framework, or job queue — none exist
  today and none are implied as needed by current functionality.
- Keep changes scoped to the feature/bug at hand. This is a small, single-commit-history codebase;
  large sweeping refactors are easy to justify but not asked for here.
- Preserve the record `status` lifecycle values (`draft`, `generating`, `ai_generated`, `reviewed`,
  `sending`, `sent`, `failed`) exactly — `StatusBadge.jsx` and multiple route handlers key off these
  literal strings.

## What to Use

- **Backend**: CommonJS (`require`/`module.exports`), Express `Router()` per resource, every async
  handler wrapped in `asyncHandler` (`backend/src/utils/asyncHandler.js`), direct
  `getDb().collection("name")` calls (no repository layer to add for a single new query).
- **Frontend**: function components with hooks only (no class components), all backend calls added
  as a new named export in `frontend/src/api.js` (never call `axios` directly from a
  page/component), `apiErrorMessage(err)` for surfacing any caught error to the user,
  `useToast()` for one-off success/error notifications, plain CSS classes from `index.css` (add new
  classes there, following the existing `.kebab-case` naming and the file's section-banner comment
  style, e.g. `/* ---------- Section name ---------- */`).
- **Adding a new AI or mail provider**: add one entry to the relevant `registry.js` (id, label,
  `fields[]`, models/docsUrl for AI) and one class implementing `generateEmail`/`sendEmail` plus a
  static `testConnection`, then register the class in that domain's `PROVIDER_CLASSES` map in
  `config.js`. Do not add provider-specific UI — `ProviderCard.jsx` renders whatever the registry
  declares.
- **Templates/placeholders**: use `{{Column Name}}` syntax exactly as `fillTemplateVars()` expects
  (`routes/generate.js`) — the regex is `\{\{\s*([^}]+?)\s*\}\}`.
- **IDs**: `nanoid()` for every generated id (batches, records, templates, history entries) — do not
  switch to Mongo `ObjectId` or UUIDs for new documents; the whole app queries by the `id` string
  field, not `_id`.
- **Timestamps**: `new Date().toISOString()` string fields (`createdAt`/`updatedAt`), not native
  `Date` objects or Unix epoch numbers.
- **Data-access pattern**: inline queries per route handler, matching the existing style; introduce
  a shared service function (like `services/history.js`) only once a query/update is needed in more
  than one route, mirroring how `history.js` and `parser.js` came about.
- **Error-handling pattern (backend)**: `try { ... } catch (err) { update record status/error;
  addHistory(...); }` for anything that mutates a record's generation/send outcome; for plain CRUD
  routes, let `asyncHandler` forward to the single global Express error middleware in
  `backend/src/index.js`, which responds `{ error: err.message }` with `err.status || 500`. Throw
  `Error` objects with an attached `.status` property (see `notFound()` helpers in `ai/config.js` /
  `mailer/config.js`) rather than manually crafting response objects inside services.
- **Error-handling pattern (frontend)**: `try/catch/finally` around every async action, a dedicated
  `busy`/`loading` boolean set before the call and reset in `finally`, errors surfaced via
  `apiErrorMessage(err)` into either a local `error` state (`<div className="error-banner">`) or a
  toast — match whichever the surrounding component already uses.
- **Testing patterns**: none exist yet. If asked to add tests, ask which framework the user wants
  (none is currently installed for either backend or frontend) rather than assuming Jest/Vitest.

## What to Avoid

- Don't add a new npm dependency for something the existing stack already covers (e.g. don't add a
  date library — `toISOString()`/`Date` suffice; don't add a form library — plain controlled inputs
  are used everywhere).
- Don't duplicate a provider's credential-resolution logic — reuse `resolveProviderCredentials`/
  `getActiveProviderId` from the relevant domain's `config.js`.
- Don't hardcode spreadsheet column names anywhere — always go through `batch.columns` /
  `record.data`, per the app's core "fully dynamic columns" design.
- Don't use the `xlsx` (SheetJS) npm package — `exceljs` is used specifically because `xlsx` has
  unpatched CVEs (see README "Notes").
- Don't remove or weaken the AES-256-GCM encryption path in `utils/crypto.js`, or start writing
  provider credentials to MongoDB unencrypted.
- Don't perform a large unrelated refactor while doing a focused feature/bugfix — this repo has one
  commit in its history; keep new commits similarly focused and reviewable.
- Don't change the record `status` string values or the `history.type` string values without
  updating every place that reads them (`StatusBadge.jsx` LABELS map, filters in `ReviewStep.jsx`,
  CSS `.badge-<status>` classes in `index.css`).
- Don't remove the `.env` fallback path when adding new provider config — the app is designed to be
  runnable with zero database-stored settings, purely from `.env`.
- Don't introduce a deprecated/legacy API for any provider (e.g. don't add a Grok/OpenAI call using
  a chat-completions shape different from what's already used) without checking the provider's
  current docs first.

## Error Handling

Documented existing convention (see "What to Use" above for the concrete pattern). Two additional
specifics worth preserving:
- `services/ai/index.js#generateEmail` retries only HTTP 429/503 (rate-limited/overloaded), up to
  `MAX_RETRIES = 2`, honoring a provider-reported retry delay when parseable
  (`services/ai/types.js#parseRetryDelayMs`), otherwise a fixed/backoff default. Do not broaden this
  to retry other status codes without deliberate justification (e.g. retrying 4xx auth errors would
  waste calls and mask real credential problems).
- A failed decrypt of a stored credential (`decryptSafe()`) must never throw up to the caller — it
  logs and returns `null`, letting resolution fall back to `.env`. Preserve this fail-open behavior
  if touching `ai/config.js` or `mailer/config.js`.

## Security

- Never expose secrets or credentials in API responses — only `maskValue()`-processed previews
  (`ab12...cd34` or all-bullet for short values) may leave the backend; never send `apiKey`,
  `appPassword`, `clientSecret`, or `refreshToken` raw values in a JSON response.
- Never hardcode sensitive information (API keys, DB URIs, encryption keys) in source — they belong
  in `backend/.env` (gitignored) or in encrypted MongoDB fields via the Settings UI.
- Do not commit `.env` — it is already gitignored; double-check any new env-var-holding file is too.
- There is currently no authentication/authorization boundary to preserve in this app (see
  Architecture.md) — do not assume one exists when reasoning about "who can call this route."
  If asked to add auth, treat it as a new architectural capability, not a small patch, since every
  route currently assumes an implicitly trusted caller.
- Validate user input at the boundary matching existing patterns: multer's `fileFilter` restricts
  upload extensions; route handlers check required body fields with guard-clause `if (!x) return
  res.status(400)...` before doing work — extend this style for new inputs rather than introducing
  a schema-validation library unless asked.
- Do not weaken the `SETTINGS_ENCRYPTION_KEY` requirement gate (`hasEncryptionKey()` check before
  allowing credential saves) — it exists specifically to prevent silently storing plaintext secrets
  when no key is configured.

## Change Boundaries

Unless explicitly requested:
- Do not modify files outside the feature area you're working in (e.g. a mailer change shouldn't
  touch `services/ai/*`).
- Do not add infrastructure (Docker, CI, hosting config) — none exists today; if asked to add it,
  treat it as new scope requiring explicit confirmation of the target platform.
- Do not change the MongoDB schema/collection shape (field names, added required fields) without
  updating every reader/writer of that collection — there is no migration tooling, so a shape change
  is a breaking change for any existing documents already in the database.
- Do not add or remove npm dependencies without a clear need tied to the current task.
- Do not perform broad refactors (e.g. converting the app to TypeScript, introducing Redux, changing
  CommonJS to ESM in the backend) during unrelated feature work — these would be significant,
  separately-scoped decisions.
- Do not remove existing functionality (a route, a UI step, a provider) without explicit approval,
  even if it looks unused — verify usage across both frontend and backend before assuming so.
