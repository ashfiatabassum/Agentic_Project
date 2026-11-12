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

## M2 — Auth and spaces ✅

**Goal:** an owner can sign up, log in, see their dashboard, and create / edit / delete spaces with questions, customer-field settings, theme, brand colour, logo, and a public link — all owner-isolated and limit-enforced on the server. (The customer side comes in M3.)
**Requirements covered:** FR-01 (fully, PRD §10), FR-02, FR-03 (settings only), FR-04, FR-12 (space limit).
**Branch:** `feature/m2-auth-spaces`, merged into `main` through a pull request when "Done when" passes (see `CLAUDE.md` → Git workflow). Built in a **fresh Claude Code session** so the formatting hook runs.
**Status:** plan approved 12 November 2026 (E0–E13); E14–E18 confirmed and the whole branch checked by hand by the developer (12 November 2026); E19–E20 added at the developer's request. Merged into `main` by pull request (details below).

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

### Decisions made during implementation (E14–E18) — confirmed by the developer, 12 November 2026


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
- [x] **Developer manual check** of the whole M2 branch (landing page, sign up / log in, dashboard, space form) — done by the developer, 12 November 2026
- [x] Pull request [#1](https://github.com/ashfiatabassum/Agentic_Project/pull/1) `feature/m2-auth-spaces` → `main` opened and **merged** 12 November 2026 (merge commit `efe21f0`, 10 branch commits); merged `main` re-tested: 42/42, build OK. Branch kept for now at the developer's request (delete later).

### Done when

- [x] All server tests pass: **42/42** (M1's 19 plus 23 new auth and spaces tests)
- [x] Playwright journey above passes, with screenshots of dashboard, space form, and created page (`docs/screenshots/m2-*.png`)
- [x] Another owner gets 404 for every space endpoint of someone else (tested: `spaces.test.js`; also in the browser)
- [x] The 4th space on Free is refused even under concurrent requests (tested through the real service and the API)
- [x] Hook observed firing on a real edit; skill and subagent findings fixed or recorded
- [x] `npm run build` succeeds; no secrets or uploaded files committed — `server/uploads/`, `server/.env*`, and `.playwright-mcp/` ignored (verified with `git status --ignored` before the M2 commits)

### Risks

- Largest milestone so far (two features, uploads, first real UI): keep commits per task.
- Windows file paths in upload handling: build paths with `path.join`, test with real files.

---

## M3 — Public form and inbox ✅

**Goal:** a customer opens a space's public link without an account, fills in the configured fields, rating, answers, photo, and consent, submits, and sees the thank-you message; the owner sees it in that space's inbox with search, filters, and full details. Plan limits use **accept but lock**; the 1,000 hard cap holds under concurrency.
**Requirements covered:** FR-05, FR-06, FR-07, FR-12 (testimonial limits), FR-03 (fields shown to customers), FR-04 (theme, colour, logo on the public page); PRD §5 rules (consent, accept but lock, rate limits, no private data in public APIs).
**Branch:** `feature/m3-public-form-inbox` from `main`, merged by pull request (CLAUDE.md → Git workflow). **Status:** implemented, reviewed, and browser-verified on the branch (12 November 2026); checked by hand by the developer, E34–E38 confirmed. Moderation actions (edit, hide, favourite, wall, delete) are **M4**.

### Decisions (E21–E33) — approved by the developer, 12 November 2026

| # | Decision | Default |
| --- | --- | --- |
| E21 | Public read API | `GET /api/public/spaces/:slug` → only display data: name, subtitle, prompt, thank-you message, theme, brand colour, logo URL, the five field modes, active questions (`id`, `text`, order). Never owner, email, counts, or plan. Unknown slug → 404. No login, no cookie needed. |
| E22 | Submit API | `POST /api/public/spaces/:slug/testimonials` as **one `multipart/form-data` request**: a `data` part (JSON with the fields, rating, answers, consents) plus an optional `photo` part. Added to the JSON-only guard's multipart allow-list (no session is involved, so CSRF does not apply). `201 { thankYouMessage }`. |
| E23 | Validation (server is the authority) | Name 1–100 and email (valid, ≤ 254) always required; job title / company (≤ 100), social link (`http`/`https`, ≤ 300), rating (integer 1–5), photo — each **ignored when off, optional or required as configured**; testimonial text 1–2,000; each answer ≤ 1,000, **answers optional**, only for this space's active questions (question text stored as `question_snapshot`); both consents default `false`. One error shape `{ error, fields }`. |
| E24 | Limits and locking | Photo checked by magic bytes and saved **before** the transaction (≤ 2 MB). Then `withTransaction`: lock the space row (`FOR UPDATE`), count saved testimonials, **reject at 1,000** (`403` "This page isn't accepting testimonials right now", photo file deleted), else insert testimonial + answers. Past the plan limit (100 Free) it is **saved and locked** — the customer still sees the normal thank-you. The submit pattern moves from `concurrency.test.js` into this service. |
| E25 | Rate limit | In memory: **5 submissions per IP per space per 10 minutes** → 429 with `Retry-After`. |
| E26 | Public page `/s/:slug` | Uses the space's theme (light / dark / warm), brand colour for buttons and focus rings, and logo. Order: rating → testimonial text → questions → name, email → job title, company, social link → photo (preview, change, remove) → two consent checkboxes (unchecked) → submit. "(optional)" on optional fields. Inline errors; the browser checks size/type early but the server decides. **Responsive down to 375 px** (customers are often on phones). |
| E27 | Thank-you | Shown in place on `/s/:slug` after success (heading receives focus), with the space's message or the default "Thank you! Your testimonial has been sent." and a "Send another" link. Unknown slug → friendly "This page doesn't exist". |
| E28 | Inbox route and API | Page `/spaces/:id/inbox`, linked from each dashboard card ("Inbox · 12"). `GET /api/spaces/:id/testimonials?filter=&q=` returns summaries of **visible** testimonials only, **favourites first, then newest** (FR-08). Filters: All, Favourites, On wall, Hidden, Public consent. Search: name, company, testimonial text (`LIKE`, with `%`/`_` escaped). No pagination (≤ 1,000 per space). Another owner → 404. |
| E29 | Testimonial detail | Click a row → detail panel from `GET /api/spaces/:id/testimonials/:tid`: full text, rating, photo, name, email, job title, company, social link, both consents, answers with their question snapshots, received date. A locked testimonial → `403 { locked: true }` with no content. |
| E30 | Locked banner | Inbox response includes `counts: { visible, locked, total }` and the plan limit. If `locked > 0`: banner "12 testimonials are locked on the Free plan — upgrade to see them." (The upgrade button arrives with billing in M7; until then the banner explains it.) |
| E31 | Dashboard counts | Space cards show "12 testimonials" and, if any, "· 3 locked". |
| E32 | Photo URLs | Stored as `photos/<random>.ext`, served read-only from `/uploads/photos/` (random 128-bit names). Customer email is never sent to public pages. |
| E33 | Demo data | `npm run seed` unchanged; for the locked case, tests and Playwright create rows directly in the test database. |

### Decisions added after the M3 reviews (E34–E38) — confirmed by the developer, 12 November 2026

| # | Decision | Chosen |
| --- | --- | --- |
| E34 | Hardening the public endpoints (security-reviewer, code-reviewer) | A slug that breaks the slug rules (padded, uppercase, non-ASCII) is 404 **before** rate limits and queries. The service finds the space and validates the data **before** checking or saving a photo; a photo sent to a space with photos off is ignored entirely. Malformed uploads → 400. A question removed while a customer was answering → 400 "This form changed… reload". |
| E35 | Second rate limit | Besides E25 (5 per IP per space per 10 min, given back for invalid/unknown requests), **every** public submit attempt from an IP counts toward **30 per 10 minutes**, never given back, so invalid uploads cannot be repeated without limit. |
| E36 | E21 as implemented | The public read does **not** include the thank-you message; it is returned by the submit response (only needed after submitting). Questions are returned in display order (array order) as `{ id, text }`; `slug` is included. |
| E37 | Counts and wording | Dashboard and inbox both show **visible** testimonials plus "· N locked" (E31 revised). Thank-you heading "Testimonial sent" (the default message already starts with "Thank you!"); "Send another testimonial" is a button. Optional ratings have a "Clear rating" button. |
| E38 | Breadcrumbs (requested by the developer) | Every owner page below the dashboard shows a breadcrumb trail: "Your spaces › New space", "Your spaces › {space} › Edit / Created / Inbox". Accessible pattern (`nav aria-label="Breadcrumb"`, current page `aria-current="page"`). A space's crumb always links to its inbox (plain text on the inbox itself). Not on public or login pages; the browser Back button keeps working. Replaces the scattered "Back to dashboard" / "← Your spaces" links. The "space created" page now links to the public page and the inbox (its "coming in the next milestone" note was outdated). |

### Tasks

- [x] Create branch `feature/m3-public-form-inbox` from up-to-date `main`
- [x] Server: public space read (E21) and submit (E22–E25) — `routes/public.js`, `services/testimonials.js`, multer for the photo, validation per field mode, space-row lock and hard cap, photo save/cleanup, rate limits (+ E34–E35 after review) — `900ec9e`, `c50187d`
- [x] Server: inbox list + detail (E28–E30) with owner scoping, `ROW_NUMBER()` visibility, filters, escaped search; dashboard `lockedCount` (E31) — `900ec9e`, `5e272da`
- [x] Client: public page `/s/:slug` with theming, fields, questions, photo, consents, errors, in-place thank-you (E26–E27) — `ea89295`, `8577c08`, `a4b3b6e`, `2b0272d`
- [x] Client: inbox page with filters, search, list, detail panel, locked banner; dashboard card link and counts — `ea89295`, `2b0272d`
- [x] Tests: 26 new M3 tests (16 first, 10 after the reviews) — **68/68** total, including 4 concurrent submits at 999 → exactly 1,000 through the real service, owner isolation, every filter, literal `%`/`_` search, locked 403, padded/non-ASCII slugs, the per-IP attempt limit, deactivated/foreign/duplicate questions
- [x] Reviews: `review-react-ui`, `vercel-react-best-practices`, `mysql` (EXPLAIN ANALYZE, 1 fix), `review-mysql-model` — Skill usage log #12–#15; subagents `security-reviewer`, `code-reviewer`, `requirements-reviewer` — Subagent usage log #4–#6; all findings fixed or recorded (E34–E37)
- [x] Playwright MCP: logged-out customer on a warm and a dark space (fields per mode, unchecked consents, errors, photo upload, thank-you focus, 375 px); owner inbox order, filter, search, detail; locked banner after 101 testimonials; second owner → 404; review fixes re-checked ("form changed" message, Clear rating, "Testimonial sent"); screenshots `docs/screenshots/m3-*`
- [x] Docs: verification.md (FR-03 – FR-07, FR-12 rows, skill/subagent/issue logs), STATUS, this plan
- [x] **Developer manual check** of the whole M3 branch (public form, inbox, breadcrumbs) and E34–E38 confirmed — done by the developer, 12 November 2026
- [x] Push, PR to `main`, merge, record PR and merge commit — [PR #2](https://github.com/ashfiatabassum/Agentic_Project/pull/2), merge commit `76a39c8`; on `main`: 68/68 tests, build OK

### Done when

- [x] All server tests pass (M1 + M2 + new M3 tests)
- [x] Playwright journey above passes, screenshots saved in `docs/screenshots/m3-*`
- [x] Public API responses contain no email, owner, plan, or locked data (tested)
- [x] Hard cap holds under concurrent submissions through the real service (tested)
- [x] Skill and subagent findings fixed or recorded
- [x] `npm run build` succeeds; no uploaded photos or secrets committed

### Risks

- Public, unauthenticated upload endpoint: abuse via large or fake files — size limit enforced while streaming, type by magic bytes, rate limit, cleanup on every failure path.
- Dark theme and brand colours: keep text contrast readable (check in the browser).

---

## M4 — Moderation and Wall of Love

**Goal:** the owner can edit, hide, favourite, add to or remove from the wall, and delete any **visible** testimonial in their own space's inbox. A public Wall of Love page `/s/:slug/wall` shows only testimonials that are on the wall, not hidden, not locked, and have public consent. It shows no email, consent flags, answers, or other private data.
**Requirements covered:** FR-08, FR-09; PRD §5 rules (owner-only access, wall eligibility, accept but lock, `edited_at` marker, deleting frees capacity, no private data in public APIs); PRD §11.4 items 5–9 and §11.5.
**Branch:** `feature/m4-moderation-wall` from `main`, merged by pull request (CLAUDE.md → Git workflow). **Status:** implemented, reviewed, and browser-verified on the branch; checked by hand by the developer and E54 confirmed (12 November 2026). PR to `main` open; merge waits for the developer.
**Schema:** no migration. `testimonials` already has `is_hidden`, `is_favorite`, `on_wall`, `original_body`, `edited_at`, and the CHECK `chk_testimonials_wall_eligible` (R4).

### Decisions (E39–E52) — approved by the developer, 12 November 2026

| # | Decision | Proposed |
| --- | --- | --- |
| E39 | Who can act | **Only the space's owner.** All moderation routes sit under `/api/spaces/:spaceId/testimonials/:tid`, need a session, and use the JSON-only CSRF guard. Every query is scoped with `spaces.owner_id = <session user>` (a join through `spaces`). Another owner's space or testimonial, or a testimonial from a different space → **404**, the same response as an unknown id, so ids cannot be probed. |
| E40 | Locked testimonials | Every action (edit, hide, favourite, wall, delete) on a **locked** testimonial → `403 { locked: true }`, and nothing changes. Locked status is worked out inside the action's transaction with the same `ROW_NUMBER()` rule as the inbox (E28–E29). Owners never see locked rows, so the UI has nothing to click. Locked rows become visible again when capacity is freed (E46) or after an upgrade (M7). |
| E41 | Flags API | `PATCH /api/spaces/:spaceId/testimonials/:tid` with any of `{ favorite, hidden, onWall }` (booleans only; anything else → 400). Returns the updated detail (same shape as E29). One transaction: lock the testimonial row (`SELECT … FOR UPDATE`, owner-scoped), check it is visible, then update. |
| E42 | Wall rule (consent) | `onWall: true` is accepted only if `consent_public = 1` **and** it is not hidden **and** not locked. Otherwise → `409` with a reason: "The customer did not agree to public display" or "Unhide it first". Social-sharing consent alone is **not** enough. The DB CHECK (R4) is the backstop. **The owner can never change either consent flag.** |
| E43 | Hide and the wall | Hiding sets `is_hidden = 1, on_wall = 0` in the same `UPDATE` (the CHECK requires it). Unhiding does **not** put it back on the wall (data-model R4). Hidden testimonials stay in the inbox (Hidden filter) and still count toward the plan limit (PRD §5). Favourite never affects public visibility. |
| E44 | Edit content | `PUT /api/spaces/:spaceId/testimonials/:tid/content` with `{ name, jobTitle, company, socialLink, rating, body, removePhoto }`. Same limits as E23: name 1–100, body 1–2,000, job title/company ≤ 100, social link `http`/`https` ≤ 300, rating `null` or 1–5. These are editable whatever the space's field modes. **Not editable:** email, both consents, answers, received date. The photo can only be **removed** (not replaced). The file is deleted after commit. |
| E45 | Edited marker | If anything actually changes, set `edited_at = NOW()`. The **first** time the body changes, save the customer's text in `original_body` (D5); later edits keep it. If nothing changed → 200, and `edited_at` is not touched. The inbox detail shows "Edited {date}" and a "Show original text" toggle. The wall shows a small "Edited" note (data-model). |
| E46 | Delete | `DELETE /api/spaces/:spaceId/testimonials/:tid` → 204. The answers are removed by cascade and the photo file is deleted after commit. The UI first shows a confirmation dialog ("Delete this testimonial? This cannot be undone." with Cancel/Delete; focus is trapped; Escape cancels), in the style of `DeleteSpaceDialog`. Deleting frees capacity, so the oldest locked testimonial becomes visible (tested). |
| E47 | Inbox UI | The detail panel has action buttons: ☆ Favourite, Hide/Unhide, Add to wall/Remove from wall, Edit, and Delete. "Add to wall" is **disabled, with the reason shown** when there is no public consent or the testimonial is hidden. Edit opens an inline form in the panel with Save/Cancel and field errors from the server. List rows show badges (Favourite, On wall, Hidden, Edited). After each action the list and counts reload (no optimistic update). Errors (409/403/404) are shown in the panel. |
| E48 | Public wall API | `GET /api/public/spaces/:slug/wall` (no login; invalid slug → 404 before any query, as in E34). It returns `{ space: { name, slug, subtitle, theme, brandColor, logoUrl }, testimonials: [...] }`. Each testimonial is exactly `{ name, jobTitle, company, photoUrl, rating, body, edited, createdAt }`, with columns listed explicitly, never `SELECT *`. **Never** email, social link, consent flags, `original_body`, answers, ids, counts, owner, or plan. Filter: `on_wall = 1 AND is_hidden = 0 AND consent_public = 1` and rank ≤ the owner's limit (not locked). Order: newest first. |
| E49 | Public wall page | Route `/s/:slug/wall`. It uses the space's theme, brand colour, and logo, with the header "{space name} — Wall of Love". Testimonials appear as a responsive card grid (1 column at 375 px, up to 3 on desktop). Each card has a photo or initials, name, job title · company, stars (with an accessible label "Rated 4 out of 5"), the text (plain text, never HTML), and "Edited" if edited. An empty wall shows "No testimonials here yet." A link "Share your own experience" goes to `/s/:slug`, and an unknown slug → "This page doesn't exist". The card component is kept separate so M5's embed can reuse it. |
| E50 | Links to the wall | The inbox header and the "space created" page get a "View Wall of Love" link (it opens `/s/:slug/wall`). |
| E51 | Wall rate limit / caching | No rate limit on the read (same as the public space read). `Cache-Control: no-store`, so removing an item from the wall takes effect at once. |
| E52 | Demo data | `npm run seed` is unchanged: the bakery space already has testimonials on the wall. Tests and Playwright create other cases (no consent, hidden, locked) directly in the test database. |

### Decisions recorded after the M4 reviews (E54) — confirmed by the developer, 12 November 2026

| # | Decision | Chosen |
| --- | --- | --- |
| E54 | Small differences between E39–E52 and the implementation (requirements-reviewer, security-reviewer) | (a) The wall's `space` object uses the names from the existing public API (E21/E36): `{ slug, title, subtitle, themeCode, brandColor, logoUrl }`, not `name`/`theme`. M5 builds on this. (b) The wall note reads "Edited by the business" instead of just "Edited", which makes PRD §5 ("do not misrepresent edited content") clearer. (c) `PATCH { hidden: false, onWall: true }` on a hidden testimonial unhides it **and** adds it to the wall in one request; consent is still required (tested). (d) Accepted, not changed: the wall read has no rate limit (E51; one indexed query per space of at most 1,000 rows); a snapshot rank can only be over-strict (data-model.md); social links with embedded `user:pw@` are still accepted (owner-only display, `rel="noopener noreferrer nofollow"`; tightening it would change the M3 public form, so it is left for a later hardening pass). |

### Tasks

- [x] Developer approved E39–E53 (12 November 2026); create branch `feature/m4-moderation-wall` from up-to-date `main`
- [x] Server: flags PATCH (E41–E43), content PUT (E44–E45), and DELETE (E46) in `services/testimonials.js` + `routes/testimonials.js`, owner-scoped, with lock check and row lock; photo file removed after commit
- [x] Server: public wall read (E48, E51) in `routes/public.js` + service
- [x] Client: inbox detail actions, inline edit form, delete dialog, badges, "Show original text", wall link (E47, E50)
- [x] Client: public wall page `/s/:slug/wall` with themed card grid (E49)
- [x] Tests (new, about 20). Owner isolation: another owner gets 404 for PATCH/PUT/DELETE, and so does a testimonial id from another space. A locked testimonial gets 403 for every action, with no change in the DB. Wall: no public consent → 409, hidden → 409, social consent only → 409. Hiding clears `on_wall`; unhiding does not restore it. Edit: validation errors; email/consent cannot be changed (extra keys ignored or 400); `original_body` is set only on the first body edit; `edited_at` is set; a no-op edit leaves `edited_at` unchanged; removing the photo deletes the file. Delete: answers cascade, the photo file is deleted, and 101 rows → deleting one visible → the former #101 becomes visible. Public wall: only eligible rows; the response keys are exactly the E48 list (no `email`, `consent*`, `original_body`, `socialLink`, `id`); locked on-wall rows are excluded; an invalid or unknown slug → 404; an empty wall → `[]`. CSRF: a non-JSON PATCH → 415.
- [x] Reviews, **each run once at the end**, not after every fix: `review-react-ui` + `vercel-react-best-practices`, and `review-mysql-model` + `mysql` (EXPLAIN on the wall query). Subagents: `code-reviewer`, `security-reviewer` (public page + owner actions), `requirements-reviewer` (FR-08, FR-09). **Only one subagent may run `npm test`** (code-reviewer); the others read only. Record all findings in `docs/verification.md`.
- [x] Playwright MCP, using **snapshots** (accessibility tree) for the checks and **screenshots only for the final evidence** (`docs/screenshots/m4-*`):
  - owner favourites a testimonial → it moves to the top; hides one → it appears under the Hidden filter and leaves the wall; "Add to wall" is disabled with the reason shown for a testimonial without public consent
  - owner adds an eligible testimonial to the wall → it appears on `/s/:slug/wall` (logged out, in a fresh context); removing it makes it disappear
  - edit text → "Edited" shows in the inbox and on the wall, and the original text can be viewed in the inbox
  - delete with confirmation (Cancel keeps it, Delete removes it); with 101 rows, after a delete the locked banner count drops
  - wall at 375 px and on desktop; dark theme readable; the page source/network response contains no email
  - a second owner gets 404 on the first owner's moderation API
- [x] Docs: verification.md (FR-08, FR-09 rows; skill, subagent, and issue logs), STATUS, README status, and this plan
- [x] **Developer manual check** of the M4 branch and E54 confirmed — done by the developer, 12 November 2026
- [ ] Push, PR to `main`, merge, record the PR and merge commit

### Done when

- [x] All server tests pass (M1–M3 + new M4 tests) — 85/85 (17 new M4 tests)
- [x] Owner isolation, locked 403, and wall-consent rules are covered by tests
- [x] The public wall response has exactly the allowed keys (tested) and contains no email, consent flags, original text, answers, or locked testimonials
- [x] Playwright journey above passes; final screenshots saved in `docs/screenshots/m4-*`
- [x] Skill and subagent findings fixed or recorded
- [x] `npm run build` succeeds; no uploaded photos or secrets committed (checked the staged file list)

### Risks

- **Leaking private data on a public page.** Mitigations: an explicit column list, a test of the exact response keys, and a security review.
- **IDOR (guessing another owner's testimonial ids).** Mitigation: every write joins through `spaces.owner_id` and checks `space_id`, and the tests cover another owner and another space.
- **Edit/delete races (two tabs).** Mitigation: a row lock in the transaction. The photo file is deleted only after commit, so a rollback never loses a file the database still points to.
- **Misrepresenting edited content.** Mitigations: the "Edited" marker on the wall, and the original text is kept and viewable by the owner.
- **The confirmation dialog and the inline edit form need focus management.** Check them with the keyboard during the Playwright run.

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

### Parallel work (E53) — approved by the developer, 12 November 2026

The assignment requires at least one independent task to be built in a **separate Claude Code session on its own branch**, then merged and checked in the combined app. A subagent does not count.

| Item | Decision |
| --- | --- |
| What runs in parallel | **M5 (embed) and M6 (dashboard statistics) run at the same time, after M4 is merged.** M5 needs M4's public wall API (E48) and the wall card (E49), so it cannot run alongside M4. M5 and M6 touch different files. |
| Sessions | Session A works on M6 in this folder (`feature/m6-dashboard-stats`). Session B works on M5 in a git worktree: `git worktree add ../Agentic_Project-m5 -b feature/m5-embed main`, opened in a second VS Code window with its own Claude Code session. |
| Ports | Session B runs the API and client on other ports (for example 4001/5174) through its own `.env`. Before starting, check that the ports can be set without changing code; if they cannot, make that a small change first. |
| Test database | `npm test` wipes the test DB, so both sessions must not run it at the same time against one database. Either session B gets its own test DB (`testimonial_mvp_test_m5`, which means widening the guard's allow-list), or only one session runs tests at a time. Choose when M5/M6 are planned. |
| Merging | Each branch has its own PR. The branch that merges second first merges `main` into itself, resolves any conflicts, reruns the tests and build, and then merges. Afterwards a Playwright check on `main` covers the embed and the dashboard together. |
| Evidence (`docs/verification.md`) | Both branch names, which session built each one, commit times that overlap, both PR links and merge commits, any conflicts and how they were resolved, and the test and browser results on `main` after both merges. |
