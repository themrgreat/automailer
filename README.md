# AI Bulk Email

Import an Excel/CSV file of recipients, generate a personalized email per row with AI (Grok,
Gemini, OpenAI, or Claude), review/edit/re-prompt each one, then send individually, selected, or
in bulk (via Zoho Mail SMTP or the Gmail API). Both AI and mail providers can be configured from
`.env` or from in-app Settings pages (API keys/credentials are encrypted at rest in MongoDB).

## Tech stack

- **Frontend**: React + Vite (JSX), plain fetch-based `api.js` client
- **Backend**: Node.js + Express (CommonJS)
- **Database**: MongoDB via the official `mongodb` driver (e.g. a free MongoDB Atlas cluster)
- **File parsing**: `exceljs` (`.xlsx`) and `csv-parse` (`.csv`), uploads handled by `multer`
- **AI generation**: Google Gemini, xAI Grok, OpenAI, or Anthropic Claude (pluggable, chosen via
  `AI_PROVIDER` or the AI Providers settings page)
- **Email sending**: Zoho Mail SMTP or Gmail API/OAuth2 (pluggable, chosen via `MAIL_PROVIDER` or
  the Mail Providers settings page), via `nodemailer`
- **Credential storage**: provider credentials saved from the Settings pages are AES-256-GCM
  encrypted (`SETTINGS_ENCRYPTION_KEY`) before being stored in MongoDB

## Structure

- `backend/` — Express + JavaScript API, MongoDB storage
  - `src/routes/` — `upload`, `batches`, `templates`, `generate`, `records`, `send`,
    `aiProviders`, `mailProviders`
  - `src/services/ai/` — `gemini.js`, `grok.js`, `openai.js`, `claude.js` providers behind a
    common interface, plus `registry.js` (declares each provider's fields/models) and
    `config.js` (resolves DB-saved vs. `.env` credentials, default provider, connection tests)
  - `src/services/mailer/` — `zoho.js`, `gmail.js` providers behind a common interface, plus
    `registry.js` and `config.js` mirroring the AI provider setup
  - `src/services/parser.js` — spreadsheet parsing + email column guessing
  - `src/services/history.js` — per-record audit log (generate/send/failures)
  - `src/utils/crypto.js` — AES-256-GCM encrypt/decrypt for stored provider credentials
  - `src/db/` — MongoDB connection + collection setup (`batches`, `records`, `templates`,
    `history`, `ai_provider_configs`, `mail_provider_configs` collections)
- `frontend/` — Vite + React + JavaScript (JSX) SPA
  - `src/pages/BatchWorkflow.jsx` — the Import → Template → Generate → Review → Send stepper
  - `src/pages/AiProviders.jsx` / `src/pages/MailProviders.jsx` — settings pages for choosing a
    provider, entering credentials, testing the connection, and setting a default
  - `src/components/` — `Stepper`, `TemplateStep`, `GenerateStep`, `ReviewStep`, `PreviewStep`,
    `EmailCard`, `StatusBadge`, `ProviderCard` (shared by both provider settings pages), `Sidebar`
- `sample-data/recipients.xlsx` — example recipients file for trying the import flow

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- `AI_PROVIDER=grok`, `gemini`, `openai`, or `claude`, plus the matching API key
  - Grok: `GROK_API_KEY` from https://console.x.ai
  - Gemini: `GEMINI_API_KEY` from https://aistudio.google.com/apikey
  - OpenAI: `OPENAI_API_KEY` from https://platform.openai.com/api-keys
  - Claude: `CLAUDE_API_KEY` from https://console.anthropic.com/settings/keys
- `MAIL_PROVIDER=zoho` or `gmail`, plus the matching credentials
  - Zoho: `ZOHO_USER` + `ZOHO_APP_PASSWORD` (generate an app-specific password at
    https://accounts.zoho.com/home#security/app-passwords — do not use your normal Zoho password)
  - Gmail: `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` (OAuth 2.0 Client from Google Cloud Console,
    with the Gmail API enabled) + `GMAIL_REFRESH_TOKEN` for the sending mailbox + `GMAIL_USER`
- `SETTINGS_ENCRYPTION_KEY` — only required if you'd rather add/change provider credentials from
  the AI Providers / Mail Providers pages in the app than by editing `.env`. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Full list of variables (see `backend/.env.example`):

| Variable | Required for | Description |
| --- | --- | --- |
| `PORT` | always | Backend port (default `4000`) |
| `MONGODB_URI` | always | MongoDB connection string (e.g. from Atlas) |
| `MONGODB_DB_NAME` | optional | Database name, if not already in `MONGODB_URI` |
| `SETTINGS_ENCRYPTION_KEY` | optional | 32-byte hex key; required only to save provider credentials from the Settings UI |
| `AI_PROVIDER` | always | `grok`, `gemini`, `openai`, or `claude`; overridden by a default set in the AI Providers page |
| `GROK_API_KEY` / `GROK_MODEL` | `AI_PROVIDER=grok` | xAI key + model (default `grok-2-latest`) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | `AI_PROVIDER=gemini` | Google AI Studio key + model (default `gemini-flash-latest`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | `AI_PROVIDER=openai` | OpenAI key + model (default `gpt-4o-mini`) |
| `CLAUDE_API_KEY` / `CLAUDE_MODEL` | `AI_PROVIDER=claude` | Anthropic key + model (default `claude-sonnet-5`) |
| `MAIL_PROVIDER` | always | `zoho` or `gmail`; overridden by a default set in the Mail Providers page |
| `ZOHO_SMTP_HOST` / `ZOHO_SMTP_PORT` | optional | Defaults to `smtp.zoho.com:465` |
| `ZOHO_USER` / `ZOHO_APP_PASSWORD` | `MAIL_PROVIDER=zoho` | Mailbox + app-specific password |
| `ZOHO_FROM_NAME` | optional | Display name for the `From` header |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` / `GMAIL_USER` | `MAIL_PROVIDER=gmail` | OAuth2 credentials for the sending mailbox |
| `GMAIL_FROM_NAME` | optional | Display name for the `From` header |

Then run:

```bash
npm run dev
```

Backend listens on `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to the backend — open that URL.

## How it works

1. **Import** — upload `.xlsx` or `.csv`. Columns are detected dynamically from whatever headers
   the file has; nothing is hardcoded.
2. **Preview** — see all detected columns, row count, and pick which column is the recipient email
   address.
3. **Template** — use one of the seeded templates or write a custom one (subject, body, tone,
   purpose, extra instructions), inserting `{{Column Name}}` placeholders for any imported field.
4. **Select recipients** — one, a selected subset, or all records.
5. **Generate** — AI writes a unique email per selected record; progress is tracked live.
6. **Review & send** — edit any email manually, re-prompt the AI on an individual email with an
   extra instruction (without touching the rest of the batch), then send one/selected/all. Status
   per record is tracked as draft → generating → ai_generated/failed → reviewed → sending →
   sent/failed, with a per-record history log.

Separately, the **AI Providers** and **Mail Providers** pages (sidebar, under Settings) let you
pick a provider, paste its credentials and (for AI) a model, test the connection, and mark it as
the default — without ever touching `.env` or restarting the backend.

## API reference

All routes are mounted under `/api` on the backend (`http://localhost:4000`).

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `POST /api/upload` | Upload `.xlsx`/`.csv`, create a batch + records |
| `GET /api/batches` | List batches |
| `GET /api/batches/:id` | Get a batch + its records |
| `POST /api/batches/:id/email-column` | Set which column is the recipient email address |
| `DELETE /api/batches/:id` | Delete a batch, its records, and their history |
| `GET /api/templates` | List templates (seeded + custom) |
| `POST /api/templates` | Create a template |
| `PUT /api/templates/:id` | Update a template |
| `DELETE /api/templates/:id` | Delete a template |
| `POST /api/generate` | Kick off AI generation for `{ batchId, recordIds: "all" \| string[] }` (async, concurrency 2) |
| `GET /api/generate/:batchId/status` | Poll record status counts for a batch |
| `GET /api/records/:id` | Get a record |
| `GET /api/records/:id/history` | Get a record's audit log |
| `PUT /api/records/:id` | Manually edit a record's subject/body |
| `DELETE /api/records/:id` | Delete a record |
| `POST /api/records/:id/regenerate` | Re-prompt the AI for one record with an extra instruction |
| `POST /api/send` | Bulk send `{ batchId, recordIds: "all" \| string[] }` (async, concurrency 2) |
| `POST /api/send/:id` | Send a single record synchronously |
| `GET /api/ai-providers` | List AI providers, resolved credentials/model status, and which is default |
| `PUT /api/ai-providers/:id` | Save credentials/model/enabled for one AI provider |
| `DELETE /api/ai-providers/:id/credentials` | Remove a provider's stored (DB) credentials |
| `POST /api/ai-providers/:id/default` | Mark a provider as the default used for generation |
| `POST /api/ai-providers/:id/test` | Test connectivity/credentials for a provider |
| `GET /api/mail-providers` | List mail providers, resolved credentials status, and which is default |
| `PUT /api/mail-providers/:id` | Save credentials/enabled for one mail provider |
| `DELETE /api/mail-providers/:id/credentials` | Remove a provider's stored (DB) credentials |
| `POST /api/mail-providers/:id/default` | Mark a provider as the default used for sending |
| `POST /api/mail-providers/:id/test` | Test connectivity/credentials for a provider |

Record `status` lifecycle: `draft` → `generating` → `ai_generated` / `failed` → (manual edit) → `sending` → `sent` / `failed`.

## Notes

- Data is stored in MongoDB (`batches`, `records`, `templates`, `history`, `ai_provider_configs`,
  `mail_provider_configs` collections). Drop the database, or the individual collections, to reset
  all data.
- The `xlsx` (SheetJS) npm package has unpatched high-severity CVEs, so Excel parsing uses
  `exceljs` instead (`.xlsx` only — legacy `.xls` is not supported) and CSV parsing uses
  `csv-parse`.
- AI and mail providers are pluggable (`backend/src/services/ai`, `backend/src/services/mailer`) —
  swap `AI_PROVIDER`/`MAIL_PROVIDER` in `.env`, or pick a default from the AI Providers / Mail
  Providers pages in the app, without code changes.
- A provider saved from the Settings UI always takes priority over its `.env` value when it's
  enabled, has credentials, and is marked as default; otherwise the corresponding `.env` var is
  used as a fallback.
