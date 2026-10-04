# Product Requirements Document — AI Bulk Email (Automailer)

> Source of truth: the actual codebase at the time of writing (single commit `20eca9a "Initial
> project scaffold: backend + frontend"`, plus uncommitted local edits to
> `frontend/src/components/ProviderCard.jsx` and `frontend/src/index.css`). No prior PRD, ticket
> tracker, or design doc exists in the repo — everything below is derived from reading the code.

## Project Overview

**What it does**: A self-hosted internal tool that lets a user upload a spreadsheet of
recipients/companies, generate a personalized outreach email per row using an AI provider, review
and edit each generated email, and send them individually or in bulk through a configured email
provider.

**Primary purpose**: Automate the manual work of writing and sending personalized outreach/sales
emails at scale, while still allowing per-email human review before sending.

**Problem it solves**: Writing individually personalized outreach emails for a list of dozens or
hundreds of contacts is slow to do by hand and low-quality to do with a single copy-pasted
template. This tool combines dynamic spreadsheet ingestion, an AI writer, and a review/send
pipeline so each recipient gets a distinct, context-aware email without the user writing each one.

## Target Users

- A single operator (sales/marketing/outreach person, or a developer running it for themselves)
  running the app locally or on a private deployment.
- **User types or roles**: **None implemented.** There is no login, session, user table, or
  role/permission system anywhere in the backend or frontend. The app assumes one trusted operator
  with full access to every route and every stored credential. (Needs Verification if multi-user
  support is an intended future requirement — nothing in the code suggests it is planned.)

## Features

### Completed
- Spreadsheet import (`.xlsx` via `exceljs`, `.csv` via `csv-parse`) with fully dynamic column
  detection (no hardcoded schema) — `backend/src/services/parser.js`, `routes/upload.js`.
- Automatic best-guess detection of the recipient email column, with manual override — 
  `guessEmailColumn()`, `POST /api/batches/:id/email-column`.
- Batch preview table showing all imported rows/columns, missing-email count.
- Reusable seeded templates ("Business Introduction", "Cold Sales Outreach") plus custom
  ad-hoc templates with `{{Column Name}}` placeholder insertion — `db/index.js` seed, `TemplateStep.jsx`.
- Recipient targeting: one record, a manually selected subset (with search), or all records.
- AI email generation per record via 4 pluggable providers (Gemini, Grok, OpenAI, Claude), with a
  shared prompt-building/JSON-parsing layer and automatic retry with backoff on HTTP 429/503 —
  `backend/src/services/ai/*`.
- Async bulk generation with a concurrency cap of 2 and live progress polling —
  `routes/generate.js`, `GenerateStep.jsx`.
- Manual editing of any generated email (subject/body/recipient) — `PUT /api/records/:id`.
- Per-record AI "re-prompt"/regenerate with an additional free-text instruction, reusing the
  original template snapshot — `POST /api/records/:id/regenerate`.
- Per-record audit history (generate/regenerate/manual_edit/send/send_failed) —
  `services/history.js`, visible in `EmailCard`'s "History" view.
- Sending via 2 pluggable providers (Zoho SMTP, Gmail API/OAuth2) — single record (sync), selected,
  or all (async, concurrency 2) — `routes/send.js`.
- Record status lifecycle tracked and surfaced in the UI (`StatusBadge`): `draft` → `generating` →
  `ai_generated`/`failed` → (`reviewed` on manual edit) → `sending` → `sent`/`failed`.
- AI Providers and Mail Providers settings pages: per-provider credential entry, connection test
  (real API call, no generation/send cost), enable/disable, "set as default", and clearing stored
  credentials — `AiProviders.jsx`, `MailProviders.jsx`, `ProviderCard.jsx`.
- Credential storage: values entered via Settings are AES-256-GCM encrypted before being written to
  MongoDB (`backend/src/utils/crypto.js`); `.env` values are always available as a fallback when no
  usable DB-stored default exists.
- Batch dashboard: list all batches, resume one, delete a batch (and its records + history) —
  `Dashboard.jsx`, `routes/batches.js`.
- Template CRUD API exists (`routes/templates.js`) though the frontend currently only supports
  selecting an existing template or creating one inline during generation — a separate
  "manage templates" screen/list-edit-delete UI is **Not Found** in the frontend.
- **Admin Panel** (`/settings/admin`): AI-generation retry limit + concurrency, and email-sending
  emails/minute rate limit + concurrency + retry limit, all editable at runtime and persisted in
  MongoDB (`admin_settings` collection) — no source-code edits or restarts needed when a free-tier
  provider's limits change. Includes input validation (whole numbers, bounded ranges) and a
  Reset-to-Defaults action. Missing/invalid stored values fail open to the app's original hardcoded
  behavior (retry 2 / concurrency 2 for AI; unlimited rate / concurrency 2 / no retry for email) —
  `backend/src/services/adminSettings.js`, `routes/adminSettings.js`,
  `frontend/src/pages/AdminSettings.jsx`.

### In Progress
- Provider settings card UI polish — `frontend/src/components/ProviderCard.jsx` and
  `frontend/src/index.css` have uncommitted local changes at the time of writing (not yet
  committed to git). Exact intent of the in-flight change is **Needs Verification** — inspect
  `git diff` for current details before continuing this work.

### Planned
- **None documented.** No roadmap, issue tracker, or TODO comments exist in the codebase
  (`grep`-ed for TODO/FIXME/XXX/HACK across `backend/src` and `frontend/src`: no matches). Any
  "planned" work is Unknown/Needs Verification — ask the user/stakeholder for a roadmap if one
  exists outside this repo.

### Unknown / Needs Verification
- Whether multi-user/auth support is intended.
- Whether a dedicated "manage templates" (edit/delete existing templates) screen is expected in the
  frontend, since the API supports it but the UI doesn't expose it yet.
- Whether unsubscribe/compliance handling (CAN-SPAM/GDPR footer, opt-out tracking) is required —
  not present in the current mailer implementation.
- Deployment target (no Dockerfile, CI config, or hosting-specific config found in the repo).
- Whether attachments, HTML template richness beyond a single body string, or scheduling/delayed
  sends are desired — none of these exist today.

## User Flows

### 1. First-time setup
User configures at least one AI provider and one mail provider, either by editing
`backend/.env` before starting the server, or by visiting **AI Providers** / **Mail Providers** in
the app (which requires `SETTINGS_ENCRYPTION_KEY` to be set to save credentials from the UI).

### 2. Main workflow (Dashboard → Import → Preview → Template → Generate → Review → Send)
1. **Dashboard** (`/`) — see past batches or start a new import.
2. **Import** (`/import`) — drag/drop or browse a `.xlsx`/`.csv` file; on success, redirected to
   `/batches/:batchId`.
3. **Preview step** — confirm/adjust which column is the recipient email address; see all
   imported rows and detected columns.
4. **Template step** — pick a seeded/previously-saved template or write a custom one
   (subject/body/tone/purpose/instructions with `{{Column}}` placeholders); choose target
   recipients (one/selected/all).
5. **Generate step** — kicks off async AI generation; a progress bar and status chips update via
   polling until all targeted records reach a terminal state (`ai_generated`/`failed`).
6. **Review & Send step** — for each generated email: view, manually edit, re-prompt the AI with
   an extra instruction, view its history, delete it, or send it individually; also supports
   selecting a subset or sending everything targeted in this run.
7. User can navigate back to earlier steps (up to the furthest step reached) via the Stepper, or
   return to the Dashboard to resume a different batch later (state persists in MongoDB, so a
   batch can be revisited across sessions).

### 3. Provider configuration flow
User visits **AI Providers** or **Mail Providers**, selects a provider from a dropdown, enters its
credential field(s) (masked/maskable password inputs with show/hide), optionally sets a model
(AI only), clicks **Test connection** to verify before saving is required, clicks **Save**, then
**Set as default** to make it the active provider without touching `.env` or restarting the
backend.

## Functional Requirements

- The system must dynamically detect spreadsheet columns from file headers — no column name may be
  hardcoded anywhere in parsing or templating.
- The system must support at least Gemini, Grok, OpenAI, and Claude as interchangeable AI
  generation backends, and Zoho SMTP and Gmail API as interchangeable send backends, selectable at
  runtime without a restart.
- The system must let a DB-stored provider configuration (Settings UI) override the corresponding
  `.env` variable when that provider is enabled, has resolvable credentials, and is marked default;
  otherwise it must fall back to `.env`.
- The system must never persist a provider credential in plaintext; credentials saved via the
  Settings UI must be AES-256-GCM encrypted before being written to MongoDB.
- The system must track a well-defined status per record throughout its lifecycle and make failures
  (`error` field) visible to the user.
- The system must allow a per-record re-generation that does not affect the rest of the batch.
- The system must record an audit trail entry for every generate/regenerate/manual-edit/send action
  on a record.
- Bulk generation and bulk sending must not be fully sequential nor fully unbounded — both use a
  concurrency cap (`backend/src/utils/concurrency.js`), admin-configurable via the Admin Panel
  (defaults to 2, matching the app's original hardcoded value).
- Bulk email sending must additionally respect an admin-configurable emails-per-minute rate limit
  (default: unlimited, i.e. no change from before the Admin Panel existed) — see
  `backend/src/utils/rateLimiter.js`.
- Sending a single record must be synchronous (so the UI can show an immediate per-record result);
  bulk operations must be asynchronous with client-side polling for progress.

## Non-Functional Requirements

- **Performance**: Bulk AI generation and bulk sending are throttled to an admin-configurable
  concurrency (default 2) to avoid provider rate limits; the AI layer retries transient failures
  (HTTP 429/503) with a backoff, honoring a provider-supplied `retryAfterMs` when available, up to
  an admin-configurable retry limit (default 2). Email sending now also retries on failure (default
  0 = no retry, matching prior behavior) and can be capped to an emails-per-minute rate via the
  Admin Panel (default unlimited). No caching layer, queue, or job persistence beyond MongoDB
  record status exists — a server restart mid-batch leaves records stuck in
  `generating`/`sending` with no automatic resume (Needs Verification / known gap).
- **Security**: Provider credentials are AES-256-GCM encrypted at rest (`SETTINGS_ENCRYPTION_KEY`);
  masked previews only are ever returned to the frontend, never raw stored secrets. However, there
  is **no authentication or authorization** on any API route — anyone who can reach the backend
  port can read/write all batches, records, templates, and provider settings (including triggering
  test-sends and viewing masked credential previews). This is acceptable only for a trusted,
  private/local deployment.
- **Accessibility**: Basic semantic affordances exist (aria-labels on icon-only buttons, alt-free
  icons via `lucide-react`), but no formal accessibility audit, skip-links, or ARIA live regions for
  async status updates were found. Not verified against WCAG.
- **Reliability**: No automatic retry/resume exists for a crashed/restarted server mid-generation
  or mid-send; in-flight `generating`/`sending` records would need manual re-triggering. No test
  suite exists to catch regressions (see Known Gaps).
- **Scalability**: Single Express process, single MongoDB database, in-memory file upload buffer
  (`multer.memoryStorage()`, 20MB limit) — suitable for small-to-moderate batch sizes and a single
  concurrent user; not designed for horizontal scaling or multi-tenant use.
- **Maintainability**: Provider plug-in pattern (a `registry.js` declaring fields/models + one
  class per provider + a shared `config.js`) makes adding a new AI or mail provider low-effort and
  UI-change-free — a notable, intentional architecture decision.

## Known Gaps

- **No automated tests** of any kind (no `*.test.*`/`*.spec.*` files found in the repository).
- **No CI/CD configuration** (`.github/` does not exist; no other CI config files found).
- **No authentication/authorization** anywhere in the app.
- **No Dockerfile, docker-compose, or hosting-specific deployment config** found — deployment
  process is Not Found/Unknown.
- **No "manage templates" UI** for listing/editing/deleting previously saved templates, despite the
  backend API supporting full CRUD (`routes/templates.js`).
- **No resume/recovery path** for records stuck in `generating`/`sending` after a server crash or
  restart mid-batch.
- **No unsubscribe/compliance tooling** (no opt-out list, no footer injection, no bounce handling)
  for bulk outbound email.
- **No rate-limiting/throttling at the HTTP layer** (e.g., no protection against another local
  process hammering `/api/generate` or `/api/send` repeatedly) beyond the internal concurrency cap.
  (Distinct from the Admin Panel's emails-per-minute limit, which throttles outbound sends to the
  mail provider, not inbound calls to this app's own API.)
- Frontend has uncommitted local changes to `ProviderCard.jsx` and `index.css` at time of writing —
  treat as in-progress/unverified until committed.
- The `SETTINGS_ENCRYPTION_KEY` rotation story is minimal: if the key changes or is lost, previously
  encrypted credentials silently fail to decrypt and the app falls back to "no stored value" rather
  than erroring loudly (`decryptSafe()` in both `ai/config.js` and `mailer/config.js`) — this is a
  deliberate design choice (documented in-code) but means a lost key = silently reverting to `.env`
  values, which could confuse an operator who forgot they changed the key.
