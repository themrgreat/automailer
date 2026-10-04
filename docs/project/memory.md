# Project Memory — AI Bulk Email (Automailer)

> Concise, living record of current state. Update this file at the end of every significant task
> (see the update checklist in `docs/project/rules.md`'s spirit, and the instructions this file was
> generated under). Do not duplicate full content from `PRD.md`/`Architecture.md`/`design.md` here
> — link to them instead.

_Last updated: 2026-09-16 (Admin Panel for dynamic AI/email limits, this session)._

## Project State

**Overall status**: Functionally complete for its core single-operator workflow. Import → Template
→ Generate → Review → Send all work end-to-end, backed by 4 pluggable AI providers and 2 pluggable
mail providers, with encrypted credential storage and a settings UI. AI-generation and
email-sending retry/concurrency/rate limits are now admin-configurable at runtime (Admin Panel,
this session) instead of hardcoded. No tests, no CI, no deployment tooling, and no authentication
exist yet — see `PRD.md` § Known Gaps.

A full-repo bug audit was completed in the previous session (prompted by a user-reported stuck
Generate step that turned out to be a real race condition, not user error). 15 genuine bugs were
found and fixed across backend and frontend — see Recent Changes. None were committed as of this
update.

- **Completed functionality**: see `phases.md` Phases 1–4 (import/parse/preview, templating + AI
  generation, review/edit/send, provider settings UI) and Phase 6 (Admin Panel & dynamic
  configuration, this session).
- **Partially implemented**: Phase 5 — a provider-card UI refinement is in progress as uncommitted
  local changes (unrelated to this session's work).
- **Remaining work**: Phase 7 (hardening: tests, CI, deployment config, crash recovery for
  in-flight batches, and an explicit decision on whether auth/templates-management UI are in
  scope) — none of it started.

## Current Phase

**Phase 6 — Admin Panel & Dynamic Configuration** (see `phases.md`). Status: Completed, uncommitted.

## Current Work

Implemented an Admin Panel (`/settings/admin`) making previously-hardcoded AI-generation and
email-sending limits dynamically configurable and MongoDB-persisted, per user request (the
operator runs mostly free-tier AI/mail services, so provider limits change independently of the
code). See `phases.md` Phase 6 for the full file list. Key design points:
- Every new default exactly matches the app's prior hardcoded behavior (AI retry 2 / concurrency 2;
  email concurrency 2, but email previously had **no** retry and **no** rate limit at all — both
  new capabilities default to "off" so existing installs see zero behavior change until an admin
  opts in).
- Validation rejects non-integers and out-of-range values (retry 0–10, concurrency 1–20,
  emails/minute 0–10000); a missing/corrupt stored field fails open to the default, mirroring
  `decryptSafe()`'s existing convention — never crashes generation/sending.
- A Reset-to-Defaults action (`DELETE /api/admin-settings`) was added after the user asked whether
  anything else was missing — mirrors `clearProviderCredentials()`'s pattern, gives the operator a
  quick way back to known-good values after experimenting with free-tier quota tuning.
- Verified against the project's real MongoDB (not mocked): GET/PUT/DELETE round-trip, invalid
  values rejected with clear 400 messages, values survive a full backend process restart, `npm run
  lint` and `npm run build` both clean on the frontend. Could **not** visually screenshot the page
  (no headless-browser tool in this environment) — the user confirmed it renders correctly via
  their own screenshot.
- Project docs (`Architecture.md`, `PRD.md`, `phases.md`, this file) updated to match, per explicit
  user request — `MY_CODING_STYLE.md` intentionally left untouched (it's a personal-style
  reference, not project-state documentation).

Separately (not touched by this session): an uncommitted UI change to the provider settings card
still exists — see Active Files below. Its exact intent was not stated anywhere in the repo (no
commit message, no comment, no ticket) and should be confirmed with whoever made the change before
being extended or committed.

## Active Files

- `frontend/src/components/ProviderCard.jsx` — 34 lines changed, uncommitted, purpose not recorded
  (pre-existing, not from this session).
- `frontend/src/index.css` — 35 lines added, uncommitted, likely styling to support the
  `ProviderCard.jsx` change above (pre-existing, not from this session).
- Admin Panel files (this session, uncommitted) — see `phases.md` Phase 6 "Relevant Files" for the
  full list; none are in conflict with the `ProviderCard.jsx`/`index.css` changes above.

(Run `git diff` for the exact current delta — this memory file will not be kept in sync with
further edits automatically.)

## Recent Changes

- Initial commit `20eca9a`: "Initial project scaffold: backend + frontend" — the entire
  application as described in `Architecture.md` and `PRD.md` was introduced in this single commit.
  No incremental history exists to draw further "recent changes" from.
- (Earlier this session) Created `docs/project/PRD.md`, `Architecture.md`, `rules.md`, `phases.md`,
  `design.md`, `memory.md` — no application code touched.
- **(This session, uncommitted) Backend fixes:**
  1. `utils/concurrency.js` — worker errors in `runWithConcurrency` weren't caught, so one item
     throwing silently aborted the rest of the batch. Now wrapped per-item in `next()`.
  2. `routes/generate.js` `generateForRecord`, `routes/send.js` `sendForRecord`, and
     `routes/records.js`'s `/regenerate` handler all had their initial DB status-update sitting
     outside the surrounding try/catch — a transient DB error there left the record silently stuck
     (e.g. at `"draft"`) instead of marked `"failed"`. All three now wrap the full function body.
  3. **NoSQL injection**: `batchId`/`recordIds`/`templateId` from request bodies in
     `routes/send.js` and `routes/generate.js` were passed into Mongo filters with no type check —
     e.g. `{"batchId": {"$ne": null}, "recordIds": "all"}` would match every record across every
     batch, so one call could send real emails to every past recipient. Fixed by requiring these to
     be plain strings before they reach a query.
  4. `services/parser.js` — duplicate spreadsheet column headers (two columns named "Email") caused
     one to silently overwrite the other with no warning. Fixed by disambiguating duplicates
     (`Email`, `Email (2)`, …) for both `.xlsx` and `.csv` parsing.
- **(This session, uncommitted) Frontend fixes:**
  5. `EmailCard.jsx` — wired `useToast()` into send/edit/regenerate/delete so actions get a clear
     success/error toast instead of a silent update or an easy-to-miss inline banner.
  6. `EmailCard.jsx` `canSend` only excluded status `"sending"`, not `"sent"` — the Send button
     stayed clickable after a successful send, and `ReviewStep.jsx`'s `sendAll`/`sendSelected`
     resent every targeted/checked record regardless of status. This is the root cause of the
     "send needs 2-3 clicks" report — some of those clicks were genuine duplicate sends. Fixed by
     excluding `"sent"`/`"sending"` everywhere a send is initiated.
  7. `BatchWorkflow.jsx` — the polling `useEffect` decided whether to poll based on a snapshot of
     `records` that could catch the batch mid-transition (still all `"draft"` right after
     `POST /api/generate` returns, before the background job updates anything), permanently
     preventing polling from ever starting — the Generate screen would look frozen forever. Fixed
     by keying "in flight" off `step === "generate"` + targeted records, not a status snapshot that
     can race. Also added a request-sequence guard so an out-of-order poll response can't overwrite
     newer state, and removed a dead unused `recordsRef`.
  8. `EmailCard.jsx` Delete had no `finally`, so a failed delete could leave every button on that
     card permanently disabled. Fixed.
  9. `Dashboard.jsx`/`BatchWorkflow.jsx` `refresh()` never cleared a previous error on success, so
     one transient network blip pinned the error banner on screen indefinitely. Fixed.
  10. `Stepper.jsx` mislabeled the furthest (still in-progress) step as "done" once the user
      navigated back to an earlier step. Fixed.
  11. `ImportPage.jsx` — the file input's value was never reset, so re-selecting the same file after
      a failed upload silently did nothing. Fixed.
  12. `GenerateStep.jsx` — success/failure tallies only recognized `ai_generated`/`failed`
      explicitly, so re-running Generate over records with other statuses (e.g. `sent`) could make
      the counts not sum to the total. Fixed to derive `succeeded` from `done - failed`.
- **(This session, uncommitted) Admin Panel — dynamic AI/email limits:**
  13. New `admin_settings` MongoDB collection + `services/adminSettings.js`
      (`getSettings`/`updateSettings`/`resetSettings`, validated, fail-open to defaults) +
      `routes/adminSettings.js` (`GET`/`PUT`/`DELETE /api/admin-settings`).
  14. `routes/generate.js` / `routes/send.js` — hardcoded `CONCURRENCY = 2` replaced with a
      per-request read of `aiGeneration.concurrency` / `emailSending.concurrency` from admin
      settings.
  15. `services/ai/index.js` — hardcoded `MAX_RETRIES = 2` replaced with `aiGeneration.retryLimit`.
  16. `services/mailer/index.js` — added retry-with-backoff (`emailSending.retryLimit`, new
      capability, default 0) and an emails-per-minute rate limit via new
      `utils/rateLimiter.js` (`emailSending.emailsPerMinute`, new capability, default 0 =
      unlimited). Neither existed before; both default off so behavior is unchanged until an admin
      opts in.
  17. `frontend/src/pages/AdminSettings.jsx` (new page, `/settings/admin`) — AI Generation and
      Email Sending cards, Save + Reset-to-Defaults; `api.js` gained
      `getAdminSettings`/`updateAdminSettings`/`resetAdminSettings`; nav link added to
      `Sidebar.jsx`. No new CSS — reuses `.card`/`.field`/`.field-label`/`.btn`.

## Known Issues

- No automated tests exist for backend or frontend.
- No CI/CD pipeline configured.
- No authentication/authorization on any route — acceptable only for a trusted/private deployment.
- No deployment configuration (Dockerfile, compose, hosting config) found.
- No recovery path if the backend **process itself restarts/crashes** while records are
  mid-`generating`/`sending` — they will remain stuck in that status until manually re-triggered.
  (Narrower than before: records getting silently stuck from an in-process *unhandled error* during
  generate/send — as opposed to the whole process dying — is now fixed; see Recent Changes #1-2.)
- No "manage templates" (list/edit/delete existing templates) UI, despite full backend CRUD support.
- Uncommitted local changes to `ProviderCard.jsx`/`index.css` (see Active Files) — verify intent
  before building further on top of them.

Full detail in `PRD.md` § Known Gaps (note: that document predates this session's bug-fix pass and
does not yet reflect the fixes in Recent Changes above).

## Important Decisions

- **Documentation location**: `docs/project/` was created fresh — no pre-existing documentation
  structure was found in the repo to defer to (only a generic `README.md` at the repo root and
  `MY_CODING_STYLE.md`, a personal coding-style profile unrelated to this specific project's
  functional docs).
- **No fabrication policy applied**: every claim in these six documents was verified against actual
  source files; anything not verifiable was explicitly marked `Unknown`/`Needs Verification`/`Not
  Found` rather than guessed (see e.g. deployment target, multi-user intent, roadmap items).
- Architectural/style decisions already baked into the codebase (no ORM, `exceljs` over `xlsx`,
  DB-default-with-env-fallback credentials, fail-open decryption, polling over WebSockets, no auth)
  are recorded in `Architecture.md` § Architecture Decisions — treat them as intentional unless a
  future task explicitly revisits them.
- **Admin Panel scope**: only AI-generation/email-sending retry, concurrency, and rate limits were
  exposed — per-provider generation params (e.g. `temperature`/`max_tokens` in `ai/gemini.js` etc.)
  were deliberately left hardcoded; they're model-behavior tuning, not usage/rate controls, and
  `rules.md` explicitly warns against broadening AI provider behavior casually.
- **`admin_settings` uses a fixed `id: "global"`, not `nanoid()`** — a deliberate exception to the
  "every generated id uses `nanoid()`" convention in `rules.md`, because it's a true singleton
  document (one, ever), not a repeated entity like `batches`/`records`/`templates`. Flagged
  explicitly to the user as a judgment call rather than applied silently.

## Next Steps

1. Decide whether to commit this session's backend security/reliability fixes and frontend bug
   fixes (all verified via lint + a successful `vite build`, none committed yet) — as one commit or
   split backend/frontend.
2. Decide whether to commit the Admin Panel work (Phase 6, this session) — separately from the
   bug-fix pass above, since they're unrelated changes.
3. Confirm the intent of the uncommitted `ProviderCard.jsx`/`index.css` changes with whoever
   authored them; commit once verified (Phase 5).
4. Decide, with the project owner, which Phase 7 hardening item to tackle first (tests, CI,
   deployment, full crash recovery, or auth) — none has been started, so priority is an open
   question, not a technical one.
5. If new functional work begins, update this file's Current Work/Active Files/Recent Changes
   sections at the end of that work, per the standing instruction under which this file was
   created.
