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

## Next milestones

To be planned one at a time after M1: **M2 — Auth + spaces + public form + inbox** (first vertical slice).
