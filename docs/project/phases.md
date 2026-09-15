# Development Phases — AI Bulk Email (Automailer)

> Reconstructed from the actual state of the codebase (single commit `20eca9a "Initial project
> scaffold: backend + frontend"` plus uncommitted local edits), since no pre-existing roadmap,
> issue tracker, or phase plan was found in the repo. Phase boundaries below reflect functional
> areas of the shipped code, not a literal historical timeline (git history has only one commit).

## Phase 1 — Core Data Pipeline (Import, Parse, Preview)

**Status**: Completed

### Goal
Get recipient data from an arbitrary spreadsheet into the system with zero hardcoded schema
assumptions, and let the user confirm/correct which column is the recipient email.

### Completed
- `.xlsx` (`exceljs`) and `.csv` (`csv-parse`) parsing with dynamic column detection
  (`services/parser.js`).
- Upload endpoint creating a `batches` doc + N `records` docs (`routes/upload.js`).
- Automatic email-column guess (`guessEmailColumn`) with manual override endpoint
  (`POST /api/batches/:id/email-column`).
- Preview UI: column table, row/column/missing-email counts, email-column picker
  (`PreviewStep.jsx`).
- Batch listing/deletion (`Dashboard.jsx`, `routes/batches.js`).

### Remaining
- None known for this phase's original scope.

### Relevant Files
`backend/src/services/parser.js`, `backend/src/routes/upload.js`, `backend/src/routes/batches.js`,
`backend/src/middleware/upload.js`, `frontend/src/pages/ImportPage.jsx`,
`frontend/src/pages/Dashboard.jsx`, `frontend/src/components/PreviewStep.jsx`.

---

## Phase 2 — Templating & AI Generation

**Status**: Completed

### Goal
Let the user define an email template (seeded or custom) with dynamic placeholders, target a set
of recipients, and generate a unique AI-written email per targeted record across 4 interchangeable
AI providers.

### Completed
- Template CRUD backend (`routes/templates.js`) and 2 seeded templates on first DB connect
  (`db/index.js`).
- Custom/ad-hoc template creation inline during generation, with `{{Column}}` placeholder
  insertion helpers (`TemplateStep.jsx`).
- Recipient targeting: one / selected (with search) / all (`TemplateStep.jsx`).
- Pluggable AI provider architecture: `registry.js` + `config.js` (DB-vs-env credential
  resolution) + one class per provider (Gemini, Grok, OpenAI, Claude), a shared prompt
  builder/response parser (`services/ai/types.js`), and retry-with-backoff on 429/503
  (`services/ai/index.js`).
- Async bulk generation with concurrency cap 2, live progress polling
  (`routes/generate.js`, `GenerateStep.jsx`).
- Per-record status/error/template-snapshot tracking through generation.

### Remaining
- No dedicated "manage templates" UI (list/edit/delete existing templates) exists in the frontend,
  even though the backend API fully supports it — Needs Verification whether this is in scope.

### Relevant Files
`backend/src/routes/templates.js`, `backend/src/routes/generate.js`, `backend/src/services/ai/*`,
`frontend/src/components/TemplateStep.jsx`, `frontend/src/components/GenerateStep.jsx`.

---

## Phase 3 — Review, Edit & Send

**Status**: Completed

### Goal
Let the user review every AI-generated email, correct it manually or via an AI re-prompt, inspect
its history, and send one/some/all through a pluggable mail provider.

### Completed
- Manual edit endpoint + UI (`PUT /api/records/:id`, `EmailCard.jsx` edit mode).
- Per-record AI re-prompt/regenerate reusing the original template snapshot
  (`POST /api/records/:id/regenerate`).
- Per-record audit history (`services/history.js`, `EmailCard.jsx` history mode).
- Single (sync), selected, and all (async) sending (`routes/send.js`, `ReviewStep.jsx`).
- Pluggable mail provider architecture mirroring the AI one: `registry.js` + `config.js` + Zoho
  (SMTP) and Gmail (OAuth2) provider classes.
- Filterable review list by status, bulk select/send controls, summary counters
  (`ReviewStep.jsx`).

### Remaining
- No compliance/unsubscribe tooling (opt-out handling, bounce tracking) — flagged as a gap, not a
  confirmed requirement.
- No recovery path if the server restarts mid-send (records could remain stuck at `sending`).

### Relevant Files
`backend/src/routes/records.js`, `backend/src/routes/send.js`, `backend/src/services/mailer/*`,
`backend/src/services/history.js`, `frontend/src/components/ReviewStep.jsx`,
`frontend/src/components/EmailCard.jsx`.

---

## Phase 4 — Provider Settings UI & Credential Management

**Status**: Completed (with an in-progress UI refinement — see Phase 5)

### Goal
Let a user configure AI and mail providers entirely from the app (credentials, model choice,
enable/disable, default selection, connection testing) without editing `.env` or restarting the
backend, while keeping secrets encrypted at rest.

### Completed
- AES-256-GCM credential encryption gated on `SETTINGS_ENCRYPTION_KEY` (`utils/crypto.js`).
- DB-default-with-env-fallback resolution for both AI and mail providers (`ai/config.js`,
  `mailer/config.js`).
- Full settings API: list/save/clear-credentials/set-default/test per provider, for both domains
  (`routes/aiProviders.js`, `routes/mailProviders.js`).
- Generic, reusable `ProviderCard.jsx` driving both `AiProviders.jsx` and `MailProviders.jsx` pages,
  including masked/showable password fields and a conditional model picker.

### Remaining
- None for the originally-scoped functionality — see Phase 5 for an in-flight visual refinement.

### Relevant Files
`backend/src/utils/crypto.js`, `backend/src/services/ai/config.js`,
`backend/src/services/mailer/config.js`, `backend/src/routes/aiProviders.js`,
`backend/src/routes/mailProviders.js`, `frontend/src/components/ProviderCard.jsx`,
`frontend/src/pages/AiProviders.jsx`, `frontend/src/pages/MailProviders.jsx`.

---

## Phase 5 — Provider Card UI Polish

**Status**: In Progress — **this is the current phase**

### Goal
Unknown/Needs Verification exact intent — there are uncommitted local edits to
`frontend/src/components/ProviderCard.jsx` (34 lines changed) and `frontend/src/index.css`
(35 lines added) at the time of writing, not yet reflected in any commit message or documentation.

### Completed
- Not yet determinable from the working tree alone — inspect `git diff` for the current exact
  state of these two files before continuing this work, since it may already be partially done.

### Remaining
- Confirm with the user/stakeholder what the intended change is (visual only? new field type?
  behavior change?) if it isn't obvious from re-reading the diff.
- Commit the change once verified, following the existing commit-message style (a short, plain
  descriptive sentence, as seen in `20eca9a`).

### Relevant Files
`frontend/src/components/ProviderCard.jsx`, `frontend/src/index.css`.

---

## Phase 6 — Hardening (Not Started)

**Status**: Planned — inferred from Known Gaps in `PRD.md`, not from any explicit roadmap

### Goal
Address the gaps that matter before this app could be trusted beyond a single private/trusted
operator or a larger email volume: testing, deployment tooling, crash-recovery for in-flight
batches, and (if ever needed) authentication.

### Completed
- None.

### Remaining
- Decide on and add a test framework/suite (currently zero tests exist).
- Decide on and add CI (currently no `.github/` or other CI config).
- Decide on and add deployment tooling (currently no Dockerfile/compose/hosting config).
- Design a recovery/resume story for records stuck in `generating`/`sending` after a crash.
- Decide whether authentication/authorization is in scope; if so, treat as new architecture, not a
  patch (see `rules.md` Security section).
- Decide whether a "manage templates" list/edit/delete UI is needed (backend already supports it).

### Relevant Files
None yet — this phase has not started. Would touch broadly across the repo depending on which item
is prioritized.
