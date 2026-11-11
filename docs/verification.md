# Verification log

Record **observed** results only. A planned test is not a pass. Use test accounts and synthetic testimonials; do not include real customer data in public screenshots or commits.

## Environment

- Date/time: 11 November 2026 (setup phase)
- Commit: `d6e2ca4`
- Frontend/backend/database versions and run commands: React 19.1.10, Vite 8.3.5, Tailwind 4.3.3, Express 5.3.0, mysql2 3.24.6, MySQL 8.0.46, Node 24.18.0; `npm run setup`, `npm run dev` (see README)
- Browser: Chrome (user confirmed the scaffold status page shows client/API/database ok)
- Playwright MCP connection status (`/mcp`): configuration checked outside a session — `@playwright/mcp@0.0.84` started, completed the MCP handshake, and listed 25 tools. `/mcp` inside a fresh Claude Code session (11 November 2026): `playwright` ✔ connected, 25 tools, loaded from `C:\Agentic_Project\.mcp.json`. Not yet used on app pages.
- Hook status (`/hooks`): hook command run manually as Claude Code would run it — normalized a `server/` JS file, ignored a file outside `client/`/`server/`. `/hooks` in a fresh Claude Code session (11 November 2026): 1 hook on PostToolUse, `[Project]`, matcher `Edit|Write`, command `node "$CLAUDE_PROJECT_DIR/.claude/hooks/format-changed.cjs"`. Firing during a real session edit: not yet observed.

## Feature checks

| Requirement ID | Scenario | Expected | Actual result | Pass/Fail/Not run | Evidence / issue / fix |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Owner registers, logs out, and private route denies access | Owner session works; signed-out request denied | | Not run | |
| FR-02 | Owner creates space; other owner tries to access it | Link created; cross-owner access denied | | Not run | |
| FR-03 | Toggle fields and required flags | Public form reflects saved settings | | Not run | |
| FR-05 | Customer submits without account | Owner sees saved submission | | Not run | |
| FR-06 | Try missing required field and unchecked public consent | Validation works; no unintended publication | | Not run | |
| FR-08 | Favourite, hide, edit, and wall actions | Inbox order and public visibility change correctly | | Not run | |
| FR-10 | Embed snippet in separate HTML page | Layout/theme/animation reflected; responsive | | Not run | |
| FR-11 | Change dashboard from 7 to 30 days | Chart and totals show correct data | | Not run | |
| FR-12 | Reach/exceed limits and race two submissions | Backend rejects over-limit actions | | Not run | |
| FR-13 | Simulated upgrade, logout/login, revisit billing | Persisted Paid state, limits update, demo label visible | | Not run | |

## Agentic tool use

| Tool | Date/feature | Invocation or action performed | Finding/result | Fix and commit |
| --- | --- | --- | --- | --- |
| OpenSpec | | | | |
| React skill | | | | |
| MySQL skill | | | | |
| Reviewer subagent | | | | |
| Claude Code hook | | | | |
| Playwright MCP | | | | |

## Skill usage log

One row **per skill run**, added in the same session the skill ran. Covers project skills (`grill-me`/`grilling`, `mysql`, `review-mysql-model`, `vercel-react-best-practices`, `review-react-ui`) and built-in skills used on project work (for example `security-review`, `code-review`). Record only runs that actually happened.

**How invoked** values: `typed` (user typed `/skill-name`), `requested` (user asked Claude in a prompt to use the skill), `auto` (Claude started it on its own because the task matched).

| # | Date | Skill | Milestone / feature | How invoked | What it did | Outcome / decisions / fixes | Commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-11 | `grill-me` → `grilling` | M1 planning: FR-01 Login (cross-table conventions included) | typed (`/grill-me`) | Interviewed the developer one question at a time (Q1–Q16) with a recommended answer for each; looked up facts itself (PRD, data model, `mysql` skill) instead of asking. | 17 decisions settled for Login (sessions table with hashed tokens, scrypt passwords, 7-day fixed sessions, generic login errors, rate limits, CSRF via SameSite + JSON-only, 4 endpoints, 9 tests + Playwright journey). Developer **overrode two recommendations**: lookup tables for plans (Q4: chose b over VARCHAR+CHECK), and supplied the price (৳999/month BDT), resolving a PRD unknown. Developer stopped the session at Spaces (Q16) to list all features first and design tables afterwards. Decisions saved to PRD §10 and data-model.md. | `3c7674e` |
| 2 | 2026-11-11 | `mysql` (planetscale/database-skills) | M1 table design review | requested ("review this with mysql and review-mysql-model skills") | Followed the skill workflow; read local references (data-types, composite-indexes, row-locking-gotchas, isolation-levels, deadlocks, query-optimization-pitfalls); checked the 10-table proposal against them. | Findings: email needs `utf8mb4_bin` (default `ai_ci` treats `jose@`/`josé@` as equal — verified); ASCII charset for hashes, slug, colour, currency; prefer `NOT NULL DEFAULT ''` for optional text; trim testimonial indexes to `(space_id, created_at)` until EXPLAIN shows need; COUNT must follow `FOR UPDATE` in the same REPEATABLE READ transaction, retry on 1213, file I/O outside transactions. Deviations kept and recorded: integer minor units for money (skill suggests DECIMAL), `VARCHAR`+`CHECK` for plain states. | `7582457` |
| 3 | 2026-11-11 | `review-mysql-model` (project) | M1 table design review | requested (same prompt) | Mapped PRD §5/§10/§11 to tables, keys, and constraints; ran checks on a disposable copy (all tables prefixed `zz_review_` in the empty `testimonial_mvp`, dropped afterwards; 0 tables left). | 22/22 behaviour checks pass on MySQL 8.0.46: FKs, unique email/slug, slug/colour/mode/rating CHECKs, flags default 0, `on_wall` needs public consent and not hidden (new CHECK), simulated-only billing events, question delete keeps answer snapshot, space delete cascades, accept-but-lock 105 → 100 visible / 5 locked and all visible after upgrade, rank query uses a covering index lookup. Concurrency: 4 parallel space creations with `FOR UPDATE` on the owner row → exactly 3 spaces; same race without the lock → 5 (bug reproduced). Not yet tested: hard-cap race on the space row, owner-scoped queries (no app code yet). | `7582457` |
| 4 | 2026-11-11 | `mysql` (planetscale/database-skills) | M1 implementation review (migrations 001–009, `migrate.js`, `seed.js`) | requested (plan.md M1: review the written migrations) | Introspected the built schema in `testimonial_mvp_test` (row format, engines, non-default collations, all indexes, FK delete rules, FK index coverage, CHECK count, nullable columns) and compared with data-model.md; reviewed runner and seed for locking and transaction rules. | Schema matches data-model.md exactly (Dynamic/InnoDB; R1/R2 collations; every FK indexed; 8 CHECKs; only the 7 allowed nullable columns). **Two fixes:** named lock (`GET_LOCK`) so concurrent `migrate` runs cannot collide (verified with two parallel runs); password hashing moved before the seed transaction ("keep slow work outside transactions"). | `f93a1dc` |
| 5 | 2026-11-11 | `review-mysql-model` (project) | M1 implementation review | requested (same step) | Walked its 6-point checklist against the code and tests. | Points 1, 2, 4, 5, 6 satisfied with evidence (19/19 tests incl. both concurrency boundaries; db:reset guards verified; dev DB was empty before migrating, data is seed-only). **Gaps carried to M2:** owner-scoped queries and explicit public columns (no app queries yet); locking pattern currently lives in tests — must move into real services and the tests must call them. No schema change needed. | `f93a1dc` |

Installed project skills (not uses):

| Skill | Source | Role | Commit |
| --- | --- | --- | --- |
| `review-mysql-model` | Written for this project (starter) | Project rules: schema/queries | `6a07d99` |
| `review-react-ui` | Written for this project (starter) | Project rules: UI | `6a07d99` |
| `grill-me`, `grilling` | `mattpocock/skills`, pinned in `skills-lock.json` | Planning interview | `16e4d5f` |
| `vercel-react-best-practices` | `vercel-labs/agent-skills`, pinned in `skills-lock.json` | General React performance | `51d8465` |
| `mysql` | `planetscale/database-skills`, pinned in `skills-lock.json` (postgres, vitess, neki from the same pack removed) | General MySQL/InnoDB | `e81599e` |

Both external skills were read and scanned before use: guidance text only, no scripts. Known caveats are recorded in `CLAUDE.md` → "Skills: which to use".

## Parallel work and integration

- Independent task:
- Branch/worktree and second session:
- Main-branch work happening simultaneously:
- Merge commit:
- Conflicts and resolution:
- Integrated checks after merge:

## Issues and corrections log

Record each mistake, wrong assumption, or failure as it happens (by Claude, by the developer, or by the environment), with how it was detected and fixed. This is the factual source for the reflection's "where did it go wrong" section.

| Date | Phase | What went wrong | Who/what caused it | How it was detected | Fix and verification |
| --- | --- | --- | --- | --- | --- |
| 2026-11-11 | Setup: config check | First hook test reported a JSON error, the second silently skipped the file. | Claude's test harness: Git Bash strips/mangles backslashes in arguments passed to Windows programs (`node -e`, `echo` with `C:\...` paths), so the hook received a broken path. Not a hook bug. | Debug output showed the resolved path as `C:Agentic_Projectserver_hooktest.js`. | Re-ran the test from a script file with real Windows paths: hook normalized the file and exited 0. Rule added to CLAUDE.md: use script files, not `node -e`, for Windows paths/regexes in Git Bash. Same issue recurred once later with a regex check and was handled the same way. |
| 2026-11-11 | Setup: server live check | A test command wrote its log to `../../srv.log`, which resolved to `C:\srv.log` (drive root), and tried to delete it. | Claude used a relative path without checking where it resolved. | Claude Code's built-in safety check blocked the `rm`; nothing ran. | Re-ran with the log in the session scratchpad and no deletion. Lesson: use absolute scratch paths for temporary files. |
| 2026-11-11 | Setup: MySQL connection | `/api/health` returned `ER_ACCESS_DENIED_ERROR`. MySQL's password for `testimonial_app` was set to the literal text `PASTE-THE-13-CHARACTERS`. | Claude's instructions used a placeholder inside SQL meant to be copy-pasted; it was pasted as-is. | Connection test kept failing although `.env` was verified clean (length, characters, encoding checked without revealing the value). | Generated the reset SQL from `server/.env` so no password had to be typed, with a masked preview. Lesson: avoid copy-paste placeholders for secrets. |
| 2026-11-11 | Setup: MySQL connection | After fixing the password, `localhost` connected but `127.0.0.1` was still denied. | Most likely a separate `testimonial_app@127.0.0.1` account with a different password (not confirmed before reset). | Connection test against both addresses; MySQL greeting probe showed both reach the same server. | Dropped all `testimonial_app` accounts and the empty database, recreated both loopback accounts with one password. Verified: both addresses connect, health 200, tests pass. |
| 2026-11-11 | Setup: running the API | `npm run dev` failed with `ENOENT package.json` (twice). | Run from the repo root before a root `package.json` existed; instructions said to run inside `server/`. | npm error message. | Added a root `package.json` with `npm run dev` that starts API and client together; verified by the user in the browser. |
| 2026-11-11 | M1: schema review checks | One check reported FAIL ("rank query … no full scan"). | Claude's test: the regex expected `Index lookup` but MySQL prints `Covering index lookup` (case differs); a second assertion also matched the harmless "Table scan" on the materialised window result. Not a schema problem. | Printed the full `EXPLAIN FORMAT=TREE`: base table read is `Covering index lookup … using ix_t_space_created (space_id=…)`. | Result recorded as passing based on the printed plan (22/22). Lesson: assert on the specific base-table line, case-insensitively. |
| 2026-11-11 | M1: writing migrations | A Bash heredoc writing all 9 SQL files failed ("unexpected EOF while looking for matching `'`"). | Claude used one long shell command with many quoted SQL strings; the shell quoting broke. | Bash error; no files had been written. | Rewrote each migration with the file Write tool instead. Lesson: use file tools, not shell heredocs, for multi-file content with quotes. |
| 2026-11-11 | M1: committing | `server/.env.test.example` did not appear in `git status`. | `.gitignore` rule `.env.*` hid it; only `.env.example` was exempted (starter config). | Reviewing the untracked file list before committing. | Added `!.env.test.example` to `.gitignore`; verified `server/.env.test` (real password) is still ignored. |

## Remaining gaps

List incomplete requirements with honest impact. In particular, real Stripe checkout/webhooks are excluded from the current demo plan unless the instructor's actual requirements require them.
