# Implementation plan — Testimonial MVP

This is the build roadmap: **in what order** the app is built, as milestones with checkboxes. Other docs answer other questions:

| File | Answers |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | What the app must do (FR-01 – FR-13) |
| [docs/data-model.md](docs/data-model.md) | How data is stored |
| **plan.md** (this file) | In what order it is built, and what "done" means for each step |
| [docs/STATUS.md](docs/STATUS.md) | Where we are now, blockers, handoff |
| [docs/verification.md](docs/verification.md) | What was actually checked, tool evidence, issues log |

## How this plan is used

- Milestones are planned **one at a time**: the next milestone is written here and reviewed before any of its code is written (plan → implement → verify).
- Tick a task `[x]` only after it is done **and** verified; add the commit hash or evidence next to it.
- Each milestone lists the requirements it covers, its tasks, its "done when" checks, the agentic tools it uses, and the branch it runs on.
- If the PRD, data model, and this plan disagree, stop and fix the plan first.

---

## M0 — Project setup ✅

**Goal:** a public GitHub repo with Claude Code context, a running API + client + MySQL connection, and verified run commands — no product features yet.
**Requirements covered:** assignment steps 2 (set up project, `CLAUDE.md` with commands and rules); groundwork for all FRs.
**Branch:** `main`. **Completed:** 11 November 2026.

### Tasks

- [x] Move the starter from `testimonial-mvp-starter/` to the repo root so `CLAUDE.md`, `.claude/`, and `.mcp.json` load in Claude Code — `6a07d99`
- [x] Config fixes: hook command uses `$CLAUDE_PROJECT_DIR`; Playwright MCP pinned to `0.0.84`; reviewer subagent limited to read-only commands — `6a07d99`
- [x] Docs: save assignment brief (`docs/assignment-brief.md`); update PRD source and STATUS blockers; core vs optional tools in `CLAUDE.md`; README stack note and submission checklist — `6a07d99`
- [x] First commit pushed to `ashfiatabassum/Agentic_Project`; repo confirmed public (GitHub API returns 200 without login)
- [x] Server scaffold: Express 5.3.0 + mysql2 3.24.6, config from `server/.env`, MySQL pool, `GET /api/health`, JSON 404, error handler, 3 `node:test` tests — `ead4f0a`
- [x] Local MySQL: database `testimonial_mvp`, user `testimonial_app` (localhost and 127.0.0.1), `server/.env` created (gitignored) — health returns `"database":"ok"`
- [x] Client scaffold: React 19.1.10 + Vite 8.3.5 + Tailwind 4.3.3, `/api` proxy to port 4000, status page — `081f12f`
- [x] Root scripts: `npm run setup`, `npm run dev` (API + client together), `npm test`, `npm run build` — `081f12f`
- [x] Replace "TBD" commands in `CLAUDE.md` and README with verified ones (migration command still TBD → M1) — `d6e2ca4`
- [x] Issues and corrections log in `docs/verification.md`; `CLAUDE.md` rule to log mistakes as they happen — `6e04789`
- [x] Fresh Claude Code session in the repo root: `/mcp` shows `playwright` ✔ 25 tools; `/hooks` shows the project PostToolUse hook — `884217d`, `38f335d`

### Done when

- [x] `npm run dev` from the repo root starts both apps, and http://localhost:5173 shows Client / API / Database all **ok** (confirmed by the developer in the browser)
- [x] `npm test` passes (3/3), including against the live database
- [x] `npm run build` succeeds
- [x] No secrets committed (`server/.env` is gitignored; `git status` shows only source files)

### Agentic tools

Configuration checked only; **no tool used on feature work yet**. Hook command and Playwright MCP were exercised outside a session, then confirmed loaded in a fresh session. Evidence of real use starts in M1.

### Issues found

Recorded in [verification.md → Issues and corrections log](docs/verification.md#issues-and-corrections-log): Git Bash backslash mangling in tests, a temp file pointed at the drive root, placeholder password pasted into MySQL, a likely extra `@127.0.0.1` account, and `npm run dev` run from the wrong folder.

### Carried forward

- Compare the instructor's **Project Requirements** lesson with `docs/PRD.md` (still not done).
- Data model gaps and migrations → **M1** (to be planned next).

---

## M1 — Data model and migrations

**Goal:** the final schema exists in MySQL, created by repeatable migrations, with seed data and automated tests proving the constraints, accept-but-lock ranking, and concurrency rules. No feature endpoints yet.
**Requirements covered:** assignment step 3 (data model in the repo); data foundations for FR-01 – FR-13 ([data-model.md](docs/data-model.md), Final).
**Branch:** `main`. **Status:** ✅ complete (11 November 2026) — implemented in the original session; hook evidence deferred (see Agentic tools).

### Planning (done)

- [x] Feature scope finalised after comparing with Testimonial.to — PRD §11 (`9fd78b0`, `828449a`)
- [x] Login decided in a `grill-me` session — PRD §10 (`3c7674e`)
- [x] Table design proposed, reviewed with `mysql` and `review-mysql-model`, checked on a disposable copy (22/22) — Skill usage log #2–#3
- [x] Data model marked **Final** with review changes R1–R7 and defaults D1–D12

### Tasks

- [x] **Migration runner** `server/db/migrate.js`: creates `schema_migrations`; applies `NNN_*.sql` in order; SHA-256 checksum (line endings normalised); refuses edited or missing applied files; forward-only; **named lock** so two runs cannot collide (added after the `mysql` review)
- [x] **Migrations** `001`–`009` in dependency order, with `plans` and `themes` seed rows; `.gitattributes` forces LF for `*.sql`
- [x] **Scripts** (server and root): `npm run migrate`, `npm run db:reset` (guarded: production and unknown DB names refused — verified), `npm run seed` (demo owner, 2 spaces, 5 synthetic testimonials; skips if already seeded)
- [x] **Test database** `testimonial_mvp_test` created by the developer; `testimonial_app` access verified from both loopback addresses; `server/.env.test` (gitignored) + committed `server/.env.test.example`; `pretest` resets and migrates it
- [x] **Schema tests** `server/test/schema.test.js` (12 tests) + `password.test.js` (2), from the review script, against the real migrations
- [x] **Concurrency tests** `server/test/concurrency.test.js`: 4 parallel space creations at the Free limit → exactly 3; 4 parallel submissions at 999 saved → exactly 1 accepted, 1,000 total (hard cap; first time tested)
- [x] **Docs:** migrate/reset/seed/test commands in `CLAUDE.md` and README; STATUS updated

### Done when

- [x] `npm run migrate` on an empty database creates all 10 tables; running it again reports "0 applied, 9 already up to date"
- [x] Editing an applied migration makes `npm run migrate` fail: "Migration 002_create_themes.sql was edited after it was applied (checksum mismatch)"
- [x] `npm run seed` on the migrated dev DB → 1 owner, 2 spaces, 2 questions, 5 testimonials, 10 answers, 2 on the wall; reset refuses `some_other_db` and `NODE_ENV=production`
- [x] `npm test` → **19/19 pass** (schema, password, concurrency, health) against `testimonial_mvp_test`
- [x] Dev database `testimonial_mvp` untouched by tests (tests refuse any other DB name; dev DB holds only seed data)
- [x] No secrets or generated data committed (`server/.env`, `server/.env.test` ignored; verified with `git check-ignore`)

### Agentic tools

- **Skills:** `mysql` + `review-mysql-model` reviewed the actual migrations, runner, seed, and tests — Skill usage log #4–#5. The built schema was introspected (collations, indexes, FKs, CHECKs, nullable columns) and matched data-model.md; two fixes applied (migration lock, hashing outside the seed transaction).
- **Hook:** not observed — M1 was implemented in the original session, which never loaded the project hook. Hook evidence is **still required** and deferred to a later milestone run in a fresh session (developer decision, 11 November 2026).
- **Playwright MCP:** not applicable (no UI in M1).

### Carried forward to M2

- Owner-scoped queries (`spaces.owner_id = <session user>`) and explicit public columns (R7) — no app queries exist yet.
- Move the quota and hard-cap locking patterns from the tests into real service functions and point the concurrency tests at those services.

### Risks

- MySQL DDL commits implicitly, so a failed migration can leave a partial schema: one table per file, and `db:reset` for development recovery.
- Creating the test database needs MySQL root once (developer action).

---

## M2 — Auth and spaces

**Goal:** an owner can sign up, log in, see their dashboard, and create / edit / delete spaces with questions, customer-field settings, theme, brand colour, logo, and a public link — all owner-isolated and limit-enforced on the server. (The customer side comes in M3.)
**Requirements covered:** FR-01 (fully, PRD §10), FR-02, FR-03 (settings only), FR-04, FR-12 (space limit).
**Branch:** `feature/m2-auth-spaces`, merged into `main` through a pull request when "Done when" passes (see `CLAUDE.md` → Git workflow). Built in a **fresh Claude Code session** so the formatting hook runs.
**Status:** plan approved 12 November 2026 (E0–E13). **Implemented and verified on the branch (12 November 2026), not yet committed:** the developer checks everything by hand first; commit, push, and PR only after the developer confirms.

### Decisions (E0–E13) — approved

| # | Decision | Default |
| --- | --- | --- |
| E0 | **Split** the old "M2" | M2 = auth + spaces; **M3 = public form + inbox** (customer submits → owner sees it). Smaller slices, each verifiable in the browser. Later milestones shift by one (see roadmap below). |
| E1 | Client routing | `react-router` (pinned exact version). Routes: `/signup`, `/login`, `/dashboard`, `/spaces/new`, `/spaces/:id/edit`, `/spaces/:id/created`. Private routes redirect to `/login?next=…` (PRD §10). |
| E2 | Space form layout | One page, sections in order: **Basics** (name, subtitle, collection prompt, thank-you message) → **Public link** (slug) → **Questions** → **Customer fields** → **Look** (theme, brand colour, logo). Save button at the bottom; field errors shown inline. No live preview in M2. |
| E3 | Slug | Auto-filled from the name until the owner edits it; ASCII only (non-ASCII names such as Bangla fall back to `space-xxxxxx`); availability checked on blur (`GET /api/spaces/slug-available`); if taken, suggest `-2`, `-3`. Editing an existing slug shows "the old link will stop working". |
| E4 | Questions editor | List of up to 5; add, edit text, remove, reorder with **↑ / ↓ buttons** (no drag-and-drop). On save the server compares with the stored list: kept → updated, new → inserted, removed → deleted if unanswered, deactivated if answered (D4). |
| E5 | Customer fields | Name and email shown as fixed "Always required". Job title, company, social link, photo, rating: one **Off / Optional / Required** control each. |
| E6 | Theme and colour | Three theme cards (Light, Dark, Warm) from `GET /api/themes`; colour via `<input type="color">` plus a hex text box. |
| E7 | Logo | Uploaded **after** the space exists: `POST /api/spaces/:id/logo` (multipart, `multer` pinned), `DELETE /api/spaces/:id/logo`. JPEG/PNG/WebP detected from magic bytes, ≤ 2 MB, random file name in `server/uploads/logos/`, old file deleted on replace. Served read-only at `/uploads/...`. |
| E8 | Space API | `GET /api/spaces` (mine, with testimonial counts), `POST /api/spaces` (space-limit lock from M1 moved into a real service), `GET/PUT/DELETE /api/spaces/:id`, `GET /api/spaces/slug-available`, `GET /api/themes`. Another owner's space → **404** (does not reveal it exists). |
| E9 | Delete space | Confirmation dialog: owner types the space name; shows how many testimonials will be deleted. Server deletes the row (cascade) then the logo file. |
| E10 | Dashboard (M2 version) | Header: name, plan badge, **Log out**. "Spaces: 1 of 3" usage. Space cards: name, public link (copy button), testimonial count, Edit. "Create space" disabled with an explanation at the limit (server still enforces). Full statistics come with the dashboard milestone. |
| E11 | Server building blocks | No new libraries for cookies or rate limiting: small own modules for cookie parsing, `requireAuth`, JSON-only guard (415), in-memory rate limiter, validation helpers, and one error format (`{ error, fields }`). |
| E12 | Client building blocks | `AuthContext` (calls `/api/auth/me` once), one `api()` fetch helper (JSON, error shape, 401 → login redirect), plain React state for forms; no data-fetching library. Tailwind, labelled inputs, keyboard-usable controls. |
| E13 | "Space created" page | Shows the public link `http://localhost:5173/s/<slug>` with Copy, plus "Edit space" and "Go to dashboard". (The link opens a page that arrives in M3; until then it shows "Coming soon".) |

### Decisions made during implementation (E14–E18) — for the developer to confirm

Small choices the PRD and E0–E13 did not settle; raised by the `requirements-reviewer` run as "behaviour not in the PRD".

| # | Decision | Chosen |
| --- | --- | --- |
| E14 | Versions | `react-router` **7.18.5** (8.x needs React ≥ 19.2.7; the project pins 19.1.10). `multer` 2.5.0. |
| E15 | Status codes and messages | Space limit → **403** "Your Free plan allows 3 spaces. Delete a space to make room." (upgrade wording comes with billing in M7). Taken slug → **409** with `fields.slug`. Removed/stale question id → 400 "This question no longer exists. Reload the page." |
| E16 | Rate-limit counting | Sign-up: only well-formed attempts count toward 5/hour (typos do not lock a person out). Login: counted **before** checking the password and given back on success, so only failures count and parallel requests cannot slip past. `Retry-After` header on 429. Optional `TRUST_PROXY` for deployments behind a proxy. |
| E17 | CSRF exceptions | Logout accepts any content type ("always succeeds", Q13; a cross-site logout carries no cookie). Logo upload is multipart and also requires the header `X-Requested-With: fetch`. |
| E18 | API details | `PUT /api/spaces/:id` replaces all settings (missing `fields`/`questions` = off/none). Brand colour stored uppercase. `GET /api/themes` is public (lookup data). `Cache-Control: no-store` on the API; uploads served with `nosniff`. Client: `/` → `/dashboard`, a 404 page, and a "could not reach the server" screen when `/me` fails for a reason other than 401. |

### Added scope (E19–E20) — requested by the developer, 12 November 2026

The developer asked for an interactive marketing landing page and larger sign in / sign up pages, inspired by testimonial.to's layout (reference screenshot) but with our own name, wording, and a **light + indigo** theme (developer's choice). Not a copy: no logos, images, or text from that site.

| # | Decision | Chosen |
| --- | --- | --- |
| E19 | Landing page at `/` (public) | Replaces the `/` → `/dashboard` redirect (E18). Sections: sticky nav (logo mark, Features / Pricing / Wall of Love anchors, Log in, Start for free — or "Go to dashboard" when signed in); hero with one gradient phrase and two calls to action; interactive feature tabs (Collect / Manage / Showcase / Embed) swapping mock previews with synthetic data; floating sample testimonial cards around a mock dashboard window; Free vs Paid pricing (৳0 / ৳999 per month, Paid labelled "Demo — no real payment") from one constants file; footer. Light theme: white / slate-50, slate-900 text, indigo-600 primary, indigo→violet gradient on the hero phrase and main button only. Hover lift on cards; all motion off under `prefers-reduced-motion`. Desktop-first, usable at 1024 px and below. |
| E20 | Sign in / sign up redesign | Two-column card ~960 px wide on desktop: left brand panel (indigo gradient, headline, one sample testimonial), right form; stacks to one column on narrow screens. Fields 48 px tall with 16 px text, visible labels, placeholder examples, show/hide password toggle, password hint, inline errors, full-width 48 px button with loading state, link to switch pages. All PRD §10 behaviour unchanged. The private header uses the same logo mark and theme. |

### Tasks

Ticked items are verified on the working tree; commit hashes are added when the developer approves the commits.

- [x] Create branch `feature/m2-auth-spaces` from up-to-date `main` (`main` = `origin/main` at `b4cf4f0`)
- [x] Add pinned dependencies: `react-router` 7.18.5 (client), `multer` 2.5.0 (server) — see E14
- [x] Server: auth module per PRD §10 — register, login, logout, me; scrypt (M1 `password.js`); sessions table; cookie flags; generic login error with dummy-hash timing; rate limits; JSON-only guard; `requireAuth`
- [x] Server: spaces service + routes (E3–E9) with owner scoping on every query; space-limit lock moved from the M1 test into the service; questions diff; logo upload/replace/remove with file clean-up
- [x] Client: router, `AuthContext`, `api()` helper, layout with header; pages `/signup`, `/login`, `/dashboard`, `/spaces/new`, `/spaces/:id/edit`, `/spaces/:id/created`
- [x] Tests (API, `node:test` against `testimonial_mvp_test`): the 9 login tests from PRD §10 Q14; spaces CRUD; **owner B gets 404** on A's space read/update/delete/logo; 4 concurrent creates at the Free limit → 3 (now via the real service); slug rules and availability; questions diff (unanswered deleted, answered deactivated, max 5); logo: wrong type by content, > 2 MB, replace deletes old file; delete space removes logo file — plus parallel-login limit, logout with any content type, WebP, update-slug 409 (added after reviews)
- [x] Reviews: `review-react-ui` + `vercel-react-best-practices` on the client; `review-mysql-model` + `mysql` on the new queries; subagents `code-reviewer` + `security-reviewer` + `requirements-reviewer` (findings and fixes in verification.md)
- [x] Browser check with **Playwright MCP**: sign up → dashboard → create space (questions, fields, theme, colour) → created page → edit (logo upload, per E7 only possible once the space exists) → dashboard shows it → log out → private URL redirects to login → log in returns to it; second owner cannot open the first owner's edit URL
- [x] Docs: verification.md (FR-01–04, FR-12 rows, skill/subagent/hook logs), README status, STATUS, this plan
- [x] Commit the verified M2 work in four commits (`2a5a281` API, `abf6873` tests, `8bcc6db` client, `9a8eb95` docs) — the original session closed before committing; tests re-run first (42/42) and the build passed
- [x] E19: landing page at `/` (sections above), plan constants file `client/src/lib/plans.js`, route change, shared logo mark `components/Logo.jsx`
- [x] E20: redesigned sign in / sign up (two-column 960 px card, 48 px / 16 px fields, show/hide password, loading spinner) and matching private header
- [x] Verify E19–E20: build OK; server tests 42/42; Playwright MCP at 1440×900 and 1024×768 (no horizontal scroll) — all four feature tabs by mouse and keyboard (Arrow keys, End, wrap-around), sign-up validation errors, password toggle, sign up → dashboard, landing shows "Go to dashboard" when signed in, log out, `/spaces/new` → login `?next` → wrong password "Invalid email or password" → correct login returns to `/spaces/new`; console shows only the expected 400/401 API responses, no JavaScript errors; screenshots in `docs/screenshots/m2-landing-*`, `m2-signup-*`, `m2-login-*`; reviewed with `review-react-ui` (#10: 2 fixed, 1 deferred) and `vercel-react-best-practices` (#11: 2 fixed)
- [ ] **Developer manual check** of the whole M2 branch
- [ ] Open a pull request `feature/m2-auth-spaces` → `main` (summary, checks run, known gaps); merge after "Done when" passes; record PR link and merge commit; delete the branch

### Done when

- [x] All server tests pass: **42/42** (M1's 19 plus 23 new auth and spaces tests)
- [x] Playwright journey above passes, with screenshots of dashboard, space form, and created page (`docs/screenshots/m2-*.png`)
- [x] Another owner gets 404 for every space endpoint of someone else (tested: `spaces.test.js`; also in the browser)
- [x] The 4th space on Free is refused even under concurrent requests (tested through the real service and the API)
- [x] Hook observed firing on a real edit; skill and subagent findings fixed or recorded
- [ ] `npm run build` succeeds ✔; no secrets or uploaded files committed — `server/uploads/`, `server/.env*`, and `.playwright-mcp/` are ignored on the working tree; re-check `git status` at commit time

### Risks

- Largest milestone so far (two features, uploads, first real UI): keep commits per task.
- Windows file paths in upload handling: build paths with `path.join`, test with real files.

---

## Roadmap after M2 (E0 approved)

| Milestone | Scope |
| --- | --- |
| M3 | Public collection form + thank-you + inbox (FR-05 – FR-07; accept but lock; hard cap; photo upload) |
| M4 | Moderation + Wall of Love (FR-08, FR-09) |
| M5 | Embed builder (FR-10) — **parallel branch and session**, merged into `main` |
| M6 | Dashboard statistics + plan limits UI (FR-11, FR-12) |
| M7 | Billing demo (FR-13) |
| M8 | Final check, README, recording, reflection, submission |
