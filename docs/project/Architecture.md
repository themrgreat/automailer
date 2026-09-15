# Architecture — AI Bulk Email (Automailer)

> Reflects the actual codebase, not an idealized design. Verified by reading every backend route/
> service and every frontend page/component as of commit `20eca9a` plus uncommitted local edits to
> `frontend/src/components/ProviderCard.jsx` and `frontend/src/index.css`.

## Tech Stack

| Layer | Choice | Evidence |
|---|---|---|
| Language | JavaScript (no TypeScript anywhere) | all `.js`/`.jsx`, no `tsconfig.json` |
| Backend framework | Express 4 (`^4.21.0`) | `backend/package.json`, `backend/src/index.js` |
| Backend module system | CommonJS (`require`/`module.exports`) | `"type": "commonjs"` in `backend/package.json` |
| Frontend framework | React 19 (`^19.2.8`) + Vite 8 | `frontend/package.json` |
| Frontend module system | ESM (`"type": "module"`), JSX (not TSX) | `frontend/package.json`, `.jsx` files |
| Routing (frontend) | `react-router-dom` v7, `HashRouter` | `App.jsx` |
| HTTP client (frontend) | `axios`, one configured instance in `api.js` | `frontend/src/api.js` |
| Database | MongoDB via official `mongodb` driver — **no ORM/ODM** | `backend/src/db/index.js` |
| File parsing | `exceljs` (`.xlsx`), `csv-parse` (`.csv`) | `backend/src/services/parser.js` — `xlsx`/SheetJS deliberately avoided (CVEs, per README) |
| File upload | `multer`, in-memory storage, 20MB limit, `.xlsx`/`.csv` only | `backend/src/middleware/upload.js` |
| AI providers | Gemini, Grok (xAI), OpenAI, Claude — each a hand-written `fetch`-based class, no SDKs | `backend/src/services/ai/*.js` |
| Email sending | `nodemailer`, two providers: Zoho (SMTP) and Gmail (OAuth2) | `backend/src/services/mailer/*.js` |
| Auth | **None** — no auth library, middleware, session, or user model anywhere | confirmed by full route/file inspection |
| Secrets at rest | AES-256-GCM, hand-rolled via Node's `crypto` module | `backend/src/utils/crypto.js` |
| State management (frontend) | Local component state only (`useState`/`useEffect`) + polling; no Redux/Zustand/React Query | all `pages/`/`components/` files |
| Styling | Hand-written global CSS (`index.css`), CSS custom properties, no CSS-in-JS/Tailwind/CSS Modules | `frontend/src/index.css` |
| Icons | `lucide-react` | throughout frontend components |
| Linting (frontend) | `oxlint` (`npm run lint`) | `frontend/package.json`, `.oxlintrc.json` |
| Linting (backend) | None configured (no ESLint config found) | Not Found |
| Testing | **None** — no test runner, no test files | Not Found |
| Build tool (frontend) | Vite (`vite build`) | `frontend/package.json` |
| Build tool (backend) | None — runs directly via `node --watch` in dev, `node` in prod | `backend/package.json` scripts |
| Deployment/infra | **Not Found** — no Dockerfile, docker-compose, CI config, or hosting config in the repo | Not Found |

## Application Flow

```text
Browser (React SPA, HashRouter)
  → Pages (Dashboard / ImportPage / BatchWorkflow / AiProviders / MailProviders)
  → Components (Stepper, PreviewStep, TemplateStep, GenerateStep, ReviewStep, EmailCard, ProviderCard, ...)
  → api.js (single axios instance, baseURL "/api")
  → Vite dev-server proxy ("/api" → http://localhost:4000) [dev only]
  → Express app (backend/src/index.js)
  → Routers (upload, batches, templates, generate, records, send, aiProviders, mailProviders)
  → asyncHandler wrapper → route logic
  → Services (parser, ai/*, mailer/*, history, crypto) and/or MongoDB (via db/index.js)
  → External APIs (Gemini/Grok/OpenAI/Claude REST endpoints; Zoho SMTP / Gmail API via nodemailer)
  → MongoDB persists batches/records/templates/history/provider configs
  → JSON response back through Express → axios → React state update → re-render
```

Async/background work (bulk generate, bulk send) does not follow a request/response round trip for
the actual work: the route responds immediately with `{ started: true, count }` and the real work
(`runWithConcurrency`) continues server-side; the frontend discovers progress by polling
`GET /api/generate/:batchId/status` and by `BatchWorkflow.jsx` re-fetching the whole batch every
1.2s while any record is `generating`/`sending`. There is no WebSocket/SSE — polling only.

## Data Flow

1. **Origin**: a user-supplied `.xlsx`/`.csv` file (in-memory buffer via `multer`).
2. **Processing**: `services/parser.js` extracts headers dynamically (no fixed schema) and produces
   `{ columns: string[], rows: object[] }`. `guessEmailColumn()` heuristically picks the recipient
   email field.
3. **Storage (import)**: one `batches` document + N `records` documents are inserted into MongoDB,
   each record carrying the full imported row under `data` plus workflow fields (`status`, `subject`,
   `body`, `recipientEmail`, etc.).
4. **Template resolution**: a template (`templates` collection) or an ad-hoc custom template object
   is combined with a record's `data` by substituting `{{Column Name}}` tokens
   (`fillTemplateVars()` in `routes/generate.js`).
5. **AI generation**: the filled template + record data + tone/purpose/instructions are sent to
   `services/ai/index.js#generateEmail()`, which resolves the active provider (DB-default → `.env`
   fallback), builds a prompt (`services/ai/types.js#buildPrompt`), calls the provider's REST API,
   and parses a strict-JSON `{subject, body}` response (`parseModelJson`). The result is written
   back onto the `records` document, and a `history` entry is appended.
6. **Review/edit**: manual edits (`PUT /api/records/:id`) or AI re-prompts
   (`POST /api/records/:id/regenerate`) update the same `records` document in place and append to
   `history`.
7. **Sending**: `services/mailer/index.js#sendEmail()` resolves the active mail provider the same
   DB-default → `.env` way, and `nodemailer` sends the `subject`/`body`/`recipientEmail` as both
   plain text and a naive `\n` → `<br/>` HTML conversion. Status/`history` are updated per outcome.
8. **Retrieval**: every read (batch listing, batch detail, record detail, history, provider status)
   is a direct MongoDB query via `getDb().collection(...)` — no caching layer.

## Folder & File Structure

```text
backend/
  src/
    index.js                    Express app entry: mounts routers, DB connect, global error handler
    db/index.js                  Mongo connection + index creation + seeds 2 starter templates on first run
    middleware/
      upload.js                   multer config (memory storage, 20MB limit, xlsx/csv only)
    routes/
      upload.js                   POST /api/upload
      batches.js                   GET/DELETE batches, POST email-column
      templates.js                  full CRUD for templates
      generate.js                    POST /api/generate (bulk async), GET status
      records.js                     record GET/PUT/DELETE, POST regenerate
      send.js                         POST /api/send (bulk async), POST /api/send/:id (sync single)
      aiProviders.js                  AI provider settings CRUD/test/default
      mailProviders.js                 Mail provider settings CRUD/test/default
    services/
      parser.js                    spreadsheet → {columns, rows}; guessEmailColumn()
      history.js                    addHistory() — audit log writer
      ai/
        index.js                     generateEmail(): provider resolution + retry-with-backoff
        config.js                     DB-vs-env credential resolution; save/test/default/list logic
        registry.js                   provider ids/labels/fields/models/docsUrl declarations
        types.js                      buildPrompt(), parseModelJson(), httpError() — shared across providers
        gemini.js / grok.js / openai.js / claude.js   one class per provider (generateEmail + static testConnection)
      mailer/
        index.js / config.js / registry.js   mirrors the ai/ structure exactly
        zoho.js / gmail.js            one class per provider (sendEmail + static testConnection)
    utils/
      crypto.js                    AES-256-GCM encrypt/decrypt + hasEncryptionKey()
      concurrency.js                 runWithConcurrency(items, limit, worker) — small worker pool
      asyncHandler.js                 wraps async route handlers so rejections reach Express's error middleware
frontend/
  src/
    App.jsx                      HashRouter + route table + Sidebar/topbar/Toast shell
    api.js                       every backend call as a named async function; apiErrorMessage() helper
    main.jsx                     ReactDOM root render
    pages/
      Dashboard.jsx                list/delete batches; entry point ("/")
      ImportPage.jsx                drag-drop/browse upload → navigates to new batch
      BatchWorkflow.jsx             stepper container: preview → template → generate → review; polls while in-flight
      AiProviders.jsx / MailProviders.jsx   settings pages, thin wrappers around ProviderCard
    components/
      Stepper.jsx                   4-step progress pills with "furthest reached" high-water-mark
      PreviewStep.jsx                 column table, email-column picker, missing-email count
      TemplateStep.jsx                 template pick/create + recipient targeting (one/selected/all)
      GenerateStep.jsx                 progress bar + status chips during bulk generation
      ReviewStep.jsx                   filterable list of EmailCards + bulk send controls
      EmailCard.jsx                     per-record view/edit/reprompt/history/send/delete
      ProviderCard.jsx                  generic provider settings card (used by both AI & Mail pages)
      StatusBadge.jsx                   status → label/color badge
      Sidebar.jsx                       nav links + mobile drawer
      Toast.jsx                         ToastProvider/useToast — global success/error toasts
    index.css                     entire design system: CSS variables + all component classes (no CSS Modules)
    vite.config.js                Vite + React plugin + dev-server /api proxy to :4000
sample-data/                    example recipients.xlsx / recipients.csv / "recipients - Copy.csv" for trying imports
```

## Major Modules

- **`services/ai/*` and `services/mailer/*`** — the two "provider" subsystems. Each has an
  identical shape: `registry.js` (static metadata), `config.js` (DB/env credential resolution,
  save/list/test/default logic, ~identical implementation duplicated between the two domains —
  intentional per-domain independence rather than a shared abstraction), and one class per concrete
  provider implementing a small interface (`generateEmail`/`sendEmail` + static `testConnection`).
- **`routes/generate.js` / `routes/send.js`** — the two "bulk async job" routes. Both follow the
  same pattern: validate input → respond immediately → run `runWithConcurrency` in the background →
  update record status/history as each item completes. `routes/send.js` additionally exposes a
  synchronous single-record variant for immediate UI feedback.
- **`services/parser.js`** — the only place spreadsheet format differences (`.xlsx` vs `.csv`) are
  handled; both paths normalize to the same `{columns, rows}` shape so nothing downstream needs to
  know which format was uploaded.
- **`utils/concurrency.js`** — a minimal, dependency-free worker-pool (`runWithConcurrency`) reused
  by both generation and sending; not a queue library, no persistence, no retry beyond what
  `services/ai/index.js` layers on top for AI calls specifically.
- **`BatchWorkflow.jsx`** — the frontend's central orchestrator for the whole per-batch workflow; it
  owns `step`/`furthest` state (letting a user navigate backward without losing progress) and the
  polling loop for in-flight records.
- **`ProviderCard.jsx`** — a single reusable component driving both `/settings/ai-providers` and
  `/settings/mail-providers`; it has no built-in knowledge of REST endpoints (an `actions` prop
  supplies `save`/`clearCredentials`/`setDefault`/`test`), and conditionally renders a model picker
  only when the provider view includes `models` (AI providers) vs. not (mail providers).

## Integrations

| Integration | Purpose | Auth mechanism | Notes |
|---|---|---|---|
| Google Gemini | AI email generation | API key (`GEMINI_API_KEY` or DB-stored) | `services/ai/gemini.js` |
| xAI Grok | AI email generation | API key (`GROK_API_KEY` or DB-stored) | OpenAI-compatible Chat Completions API |
| OpenAI | AI email generation | API key (`OPENAI_API_KEY` or DB-stored) | `services/ai/openai.js` |
| Anthropic Claude | AI email generation | API key (`CLAUDE_API_KEY` or DB-stored), header `x-api-key` + `anthropic-version` | `services/ai/claude.js` |
| Zoho Mail | Sending | SMTP with app-specific password (`ZOHO_USER`/`ZOHO_APP_PASSWORD`) | via `nodemailer` SMTP transport, port 465/secure by default |
| Gmail API | Sending | OAuth2 (`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`/`GMAIL_USER`) | via `nodemailer`'s `service: "gmail"` OAuth2 transport |
| MongoDB Atlas (or any MongoDB) | Primary datastore | Connection string (`MONGODB_URI`) | No ORM; raw driver only |

No payment system, analytics, or third-party storage/CDN integration exists.

## Database

- **Technology**: MongoDB (no version pinned beyond driver `^7.6.0`); works with any standard
  MongoDB instance (README suggests a free Atlas cluster).
- **No ORM/ODM** — collections are accessed directly via `getDb().collection("name")`, with no
  schema validation enforced by Mongo itself (`db/index.js` only creates indexes, not JSON schema
  validators). Document shape is entirely enforced by application code convention.
- **Collections**:
  | Collection | Purpose | Key fields | Indexes |
  |---|---|---|---|
  | `batches` | one per uploaded file | `id`, `filename`, `columns[]`, `rowCount`, `createdAt` | unique `id` |
  | `records` | one per spreadsheet row | `id`, `batchId`, `data{}`, `recipientEmail`, `subject`, `body`, `status`, `error`, `editedManually`, `regenerateCount`, `templateSnapshot`, timestamps | unique `id`, non-unique `batchId` |
  | `templates` | reusable/custom email templates | `id`, `name`, `subject`, `body`, `tone`, `purpose`, `instructions`, timestamps | unique `id`; 2 seeded on first connect if empty |
  | `history` | append-only per-record audit log | `id`, `recordId`, `type`, `detail`, `createdAt` | non-unique `recordId` |
  | `ai_provider_configs` | one doc per AI provider id | `providerId`, `credentials{}` (encrypted), `model`, `enabled`, `isDefault`, `lastTestedAt/Ok/Error` | unique `providerId` |
  | `mail_provider_configs` | one doc per mail provider id | same shape as above, mail-specific fields | unique `providerId` |
- **Relationships**: purely reference-by-string-id, no Mongo-native relations/joins/`$lookup`
  observed — `records.batchId` references `batches.id`; `history.recordId` references `records.id`.
  Both are manually cleaned up on delete (`routes/batches.js` `DELETE`, `routes/records.js` `DELETE`).
- **Data access pattern**: every route handler calls `getDb()` directly and issues its own
  query/update — no repository/DAO layer, no query builder. Writes are simple `updateOne`/
  `insertOne`/`insertMany`/`deleteMany` calls with no multi-document transactions.

## Architecture Decisions

Decisions clearly evident from the code (not assumed):

- **No ORM** — raw `mongodb` driver chosen, likely to keep the dependency surface small; document
  shape is convention-only, which is a maintainability trade-off worth knowing before adding new
  fields (no schema validator will catch a typo).
- **`exceljs` over the `xlsx` (SheetJS) package** — explicit, documented (README + comment-free but
  README-stated) choice to avoid the `xlsx` package's unpatched CVEs; `.xls` (legacy binary Excel)
  is consequently unsupported.
- **Provider plug-in pattern duplicated per domain** (`ai/` and `mailer/` each have their own
  near-identical `config.js`) rather than a single shared generic "credential-backed provider"
  abstraction — favors domain independence/simplicity over DRY at this scale.
- **DB-default-with-env-fallback credential resolution** — a deliberate layered design so the app
  works purely from `.env` with zero DB configuration, while still allowing runtime provider
  switching from the UI without restarting the process.
- **Fail-open on decryption error** (`decryptSafe()`) — a bad/rotated `SETTINGS_ENCRYPTION_KEY`
  degrades to "no stored value" (falling back to `.env`) rather than crashing the app; explicitly
  commented as intentional in both `ai/config.js` and `mailer/config.js`.
- **Polling, not WebSockets/SSE**, for async progress — simplest implementation given Express's
  synchronous-request model and the app's single-operator, low-concurrency use case.
- **Concurrency-capped background jobs run in-process** (`runWithConcurrency`), not via a job queue
  (no Bull/BullMQ/Agenda) — appropriate for the app's current scale but means no persistence/resume
  if the process restarts mid-batch (see PRD Known Gaps).
- **No authentication layer** — architecture assumes a single trusted operator / private network;
  this is a boundary any future architecture change (e.g. multi-user support) would need to address
  explicitly, not something to casually bolt on.
