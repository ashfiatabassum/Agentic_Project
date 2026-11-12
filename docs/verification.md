# Verification log

Record **observed** results only. A planned test is not a pass. Use test accounts and synthetic testimonials; do not include real customer data in public screenshots or commits.

## Environment

- Date/time: 11 November 2026 (setup phase)
- Commit: `d6e2ca4`
- Frontend/backend/database versions and run commands: React 19.1.10, Vite 8.3.5, Tailwind 4.3.3, Express 5.3.0, mysql2 3.24.6, MySQL 8.0.46, Node 24.18.0; `npm run setup`, `npm run dev` (see README)
- Browser: Chrome (user confirmed the scaffold status page shows client/API/database ok)
- Playwright MCP connection status (`/mcp`): `@playwright/mcp@0.0.84`; `/mcp` in a fresh session (11 November 2026): `playwright` ✔ connected, 25 tools, from `C:\Agentic_Project\.mcp.json`. Used on app pages from M2 onward.
- Hook status (`/hooks`): 1 PostToolUse hook, `[Project]`, matcher `Edit|Write`, command `node "$CLAUDE_PROJECT_DIR/.claude/hooks/format-changed.cjs"`. **Firing during a real session edit observed 12 November 2026 (M2)**: see Agentic tool use → hook.

### M2 run (12 November 2026)

- Branch `feature/m2-auth-spaces` from `main` at `b4cf4f0`; checks ran before committing (merged later by PR #1).
- Added: `react-router` 7.18.5 (client), `multer` 2.5.0 (server).
- `npm test` → **42/42 pass** (against `testimonial_mvp_test`); `npm run build` → success (≈256 kB JS, 80 kB gzip).
- Browser: Playwright MCP (Chromium) against `npm run dev` (dev DB `testimonial_mvp`), synthetic owners `pw-owner-a@example.com` and `pw-owner-b@example.com`. Screenshots `docs/screenshots/m2-*.png`.

## Feature checks

| Requirement ID | Scenario | Expected | Actual result | Pass/Fail/Not run | Evidence / issue / fix |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Owner registers, logs out, and private route denies access | Owner session works; signed-out request denied | **API (13 tests):**<br>• HttpOnly SameSite=Lax 7-day cookie, only its hash stored<br>• client cannot set the plan; duplicate email 409<br>• identical 401 for a wrong password and an unknown email<br>• `/me` 401 with no cookie or a forged one; logout ends only that device; expired session 401<br>• 415 for non-JSON writes<br>• 11th failed login 429; 15 parallel failed logins → exactly 10×401 + 5×429<br>**Browser:**<br>• signed-out `/dashboard` → login with `next`, and back to the page after login<br>• `?next=//evil.example` ignored<br>• `/me` 500 shows a server error, not the login page<br>• failed logout keeps the owner signed in | Pass | `npm test`; Playwright MCP 12 Nov 2026 |
| FR-02 | Owner creates space; other owner tries to access it | Link created; cross-owner access denied | **API:**<br>• create, read, list, update and delete space; every field validated<br>• slug rules; unique across owners (409, with `-2` suggestions)<br>• questions diff: answered questions are deactivated and their snapshot kept<br>• owner B gets 404 on every endpoint<br>• deleting a space removes its testimonials and logo file<br>**Browser:**<br>• auto slug and "available" check; reorder questions; Copy link<br>• slug-change warning<br>• delete confirmation needs the exact name<br>• owner B sees "Space not found" | Pass | `spaces.test.js`; screenshots `m2-*.png` |
| FR-03 | Toggle fields and required flags | Public form reflects saved settings | **Settings (M2).**<br>**Public form (M3):**<br>• Acme shows only its enabled fields; Night Owl shows all of them<br>• optional fields are labelled "(optional)"<br>• server enforces required fields<br>• field switched on while the form was open → "This form changed… reload" | Pass | `testimonials.test.js`; `m3-public-*` |
| FR-04 | Theme, brand colour, logo | Saved choices; logo checks as photos | **Theme and colour:**<br>• warm theme and `#C2410C` saved<br>• theme cards accessible<br>**Logo:**<br>• fake PNG and files over 2 MB rejected; missing `X-Requested-With` → 403<br>• type detected from the file's bytes; replace and remove delete the old file; served `nosniff`<br>**Public page (M3):**<br>• warm and dark themes checked<br>• brand colour with readable text; logo or initial fallback | Pass | `spaces.test.js`; Playwright MCP |
| FR-05 | Customer submits without account | Owner sees saved submission | • Logged-out visitor submitted on `/s/acme-bakery` and on `/s/night-owl-studio` (dark theme, photo, both consents)<br>• both show in the inbox exactly as entered<br>• 375 px: no horizontal scroll<br>• API: the public read returns display keys only | Pass | `testimonials.test.js`; `m3-*` |
| FR-06 | Try missing required field and unchecked public consent | Validation works; no unintended publication | • Both consents start unchecked; the server stores 0/0 unless ticked<br>• empty submit shows field errors and a summary<br>• thank-you heading receives focus<br>• nothing is published in M3 (the wall is M4) | Pass | Browser + tests |
| FR-07 | Owner inbox: list, filter, search, details, isolation | Owner-only; consent visible | • Favourites first, then newest<br>• Hidden filter; search "cardamom"; empty state<br>• detail shows answers, email and consents<br>• second owner gets "does not exist or is not yours" and 404 from the API (also with A's testimonial id under B's space)<br>• tested: every filter and literal `%`/`_` search | Pass | `testimonials.test.js`; `m3-inbox-1440.png` |
| FR-08 | Favourite, hide, edit, and wall actions | Inbox order and public visibility change correctly | | Not run | |
| FR-10 | Embed snippet in separate HTML page | Layout/theme/animation reflected; responsive | | Not run | |
| FR-11 | Change dashboard from 7 to 30 days | Chart and totals show correct data | | Not run | |
| FR-12 | Reach/exceed limits and race two submissions | Backend rejects over-limit actions | **Spaces (M2):**<br>• Free owner with 1 space, 4 parallel creates → 201, 201, 403, 403 (exactly 3)<br>• Paid owner can create a 4th<br>• usage count comes from the server<br>**Testimonials (M3):**<br>• 101st on Free saved but locked (inbox 100 + banner, "· 1 locked", detail 403); upgrade unlocks<br>• hidden testimonials count toward the limit<br>• 1,001st refused<br>• **4 concurrent submits at 999 → exactly 1,000**<br>• rate limits: 5 per IP per space and 30 attempts per IP, both per 10 min | Pass | `spaces.test.js`, `testimonials.test.js`, `concurrency.test.js` |
| FR-13 | Simulated upgrade, logout/login, revisit billing | Persisted Paid state, limits update, demo label visible | | Not run | |

## Agentic tool use

| Tool | Date/feature | Invocation or action performed | Finding/result | Fix and commit |
| --- | --- | --- | --- | --- |
| OpenSpec | — | Not used (optional) | — | — |
| React skill | 2026-11-12 M2, M3 | `review-react-ui` + `vercel-react-best-practices` (Skill usage log #6–7, #10–13) | See log | Fixed (PR #1, PR #2) |
| MySQL skill | 2026-11-12 M2, M3 | `review-mysql-model` + `mysql` (Skill usage log #8–9, #14–15) | See log | Fixed (PR #1, PR #2) |
| Reviewer subagent | 2026-11-12 M2, M3 | `code-reviewer`, `security-reviewer`, `requirements-reviewer` (Subagent usage log #1–6) | See log | Fixed or recorded (PR #1, PR #2) |
| Claude Code hook | 2026-11-12 M2 | Edited `client/src/pages/SimplePages.jsx` with three trailing spaces at the end of line 1 | The PostToolUse hook removed them; `grep` finds no trailing whitespace in `client/src`, `server/src` or `server/test` | First observed firing in a real session |
| Playwright MCP | 2026-11-12 M2, M3 | Owner and customer journeys, second owner in an isolated context, 375 px, routed 500 errors | See FR rows; found UI issues each milestone | Fixed and re-checked |

## Skill usage log

One row **per skill run**, added in the same session the skill ran. Covers project skills (`grill-me`/`grilling`, `mysql`, `review-mysql-model`, `vercel-react-best-practices`, `review-react-ui`) and built-in skills used on project work (for example `security-review`, `code-review`). Record only runs that actually happened.

**How invoked** values: `typed` (user typed `/skill-name`), `requested` (user asked Claude in a prompt to use the skill), `auto` (Claude started it on its own because the task matched).

| # | Date | Skill | Milestone / feature | How invoked | What it did | Outcome / decisions / fixes | Commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-11 | `grill-me` → `grilling` | M1 planning: FR-01 Login | typed (`/grill-me`) | Interviewed the developer one question at a time (Q1–Q16), recommending an answer for each and looking facts up itself. | **17 Login decisions:** hashed session tokens, scrypt, 7-day sessions, generic errors, rate limits, SameSite + JSON-only CSRF.<br>**Developer overrides:**<br>• lookup tables for plans (Q4)<br>• price ৳999/month<br>Stopped at Q16 to list features first. Saved to PRD §10 and data-model.md. | `3c7674e` |
| 2 | 2026-11-11 | `mysql` | M1 table design | requested | Checked the 10-table proposal against the local references (data types, indexes, locking, isolation, deadlocks). | **Findings:**<br>• `utf8mb4_bin` for email (`jose@` = `josé@` under `ai_ci`)<br>• ASCII for hashes, slug and colour; `NOT NULL DEFAULT ''`<br>• trim the indexes<br>• COUNT after `FOR UPDATE`; retry on 1213; I/O outside transactions<br>**Kept, recorded:** integer money units; `VARCHAR`+`CHECK` for states. | `7582457` |
| 3 | 2026-11-11 | `review-mysql-model` | M1 table design | requested | Mapped PRD §5/§10/§11 to tables; ran checks on disposable `zz_review_` tables (dropped afterwards). | • **22/22 checks pass** (FKs, uniques, CHECKs, consent defaults, snapshots, cascades, accept-but-lock 105 → 100 + 5 locked)<br>• Race test: 4 parallel space creates → 3 with the lock, 5 without (bug reproduced) | `7582457` |
| 4 | 2026-11-11 | `mysql` | M1 migrations, runner, seed | requested | Introspected the built schema and compared it with data-model.md. | • Schema matches exactly<br>**2 fixes:**<br>• `GET_LOCK` against parallel `migrate` runs (verified)<br>• password hashing moved outside the seed transaction | `f93a1dc` |
| 5 | 2026-11-11 | `review-mysql-model` | M1 implementation | requested | 6-point checklist against code and tests. | • 5 of 6 points met (19/19 tests)<br>**Carried to M2:**<br>• owner-scoped queries<br>• explicit public columns<br>• locking pattern to move from the tests into the services | `f93a1dc` |
| 6 | 2026-11-12 | `review-react-ui` | M2 client | auto (plan task) | Checklist plus the Playwright run and a 375 px check. | • Auth separation, labels, errors and server counts OK<br>**Fixes:**<br>• question inputs squeezed at 375 px<br>• hard-coded "3 spaces" removed<br>Points 4–5 not applicable until M3. | PR #1 |
| 7 | 2026-11-12 | `vercel-react-best-practices` | M2 client and server async | auto | Applicable rules only; Next.js rules skipped. | **Fixes:**<br>• parallel session clean-up<br>• Set lookup in the questions diff<br>**Rejected:**<br>• `React.lazy` (bundle is 80 kB gzip)<br>• SWR (E12) | PR #1 |
| 8 | 2026-11-12 | `review-mysql-model` | M2 queries | auto | `EXPLAIN` of 8 queries on the test DB. | • Every query owner-scoped; insert objects built on the server<br>• all queries use indexes<br>• **Open:** `answeredQuestions` scan to re-check in M3 | PR #1 |
| 9 | 2026-11-12 | `mysql` | M2 transactions | auto | Read `deadlocks.md` and `row-locking-gotchas.md`; checked the transactions. | **Fixes:**<br>• deadlock retry waits 20–70 ms<br>• session clean-up can no longer fail a login<br>**Accepted:** brief locks on 404 paths | PR #1 |
| 10 | 2026-11-12 | `review-react-ui` | M2 E19–E20 landing + auth | requested | Checklist with the Playwright results at 1440 and 1024 px. | **Fixes:**<br>• password toggle announced contradictory states<br>• mock showed consent already ticked<br>**Deferred to M7:** landing pricing copied from the seed | `7f81b43` |
| 11 | 2026-11-12 | `vercel-react-best-practices` | M2 E19–E20 | requested | 4 rendering/rerender rules. | **Fixes:**<br>• `Icon` paths hoisted<br>• `Spinner` animates a wrapper<br>**Not applied:** lazy landing page (it loads first) | `7f81b43` |
| 12 | 2026-11-12 | `review-react-ui` | M3 client | requested | Checklist with the Playwright journey. | **2 fixes:**<br>• photo control had two tab stops and an unnamed button<br>• error scroll ignored reduced motion | `a4b3b6e` |
| 13 | 2026-11-12 | `vercel-react-best-practices` | M3 client | requested | 3 rules (content-visibility, functional setState, derived state). | **2 fixes:**<br>• `content-visibility` on inbox rows<br>• functional update for answers | `a4b3b6e` |
| 14 | 2026-11-12 | `mysql` | M3 queries | requested | `EXPLAIN ANALYZE` with 1,000 + 5,000 rows. | • All reads use indexes, ≤ 3 ms<br>**1 fix:** window queries narrowed (list 2.97 → 1.84 ms, detail 2.87 → 0.81 ms)<br>Lock-table inspection denied to the app user (least privilege). | `5e272da` |
| 15 | 2026-11-12 | `review-mysql-model` | M3 server | requested | 6-point checklist. | • All 6 points met<br>• **Noted:** field settings are read just before the transaction (limits unaffected) | `5e272da` |

Installed project skills (not uses):

| Skill | Source | Role | Commit |
| --- | --- | --- | --- |
| `review-mysql-model` | Written for this project (starter) | Project rules: schema/queries | `6a07d99` |
| `review-react-ui` | Written for this project (starter) | Project rules: UI | `6a07d99` |
| `grill-me`, `grilling` | `mattpocock/skills`, pinned in `skills-lock.json` | Planning interview | `16e4d5f` |
| `vercel-react-best-practices` | `vercel-labs/agent-skills`, pinned in `skills-lock.json` | General React performance | `51d8465` |
| `mysql` | `planetscale/database-skills`, pinned in `skills-lock.json` (postgres, vitess, neki from the same pack removed) | General MySQL/InnoDB | `e81599e` |

Both external skills were read and scanned before use: guidance text only, no scripts. Known caveats are recorded in `CLAUDE.md` → "Skills: which to use".

## Subagent usage log

One row **per subagent run**, added in the same session. Record only runs that actually happened, and what was done with each finding (fixed, rejected with reason, or deferred).

| # | Date | Subagent | Milestone / scope | What it reviewed | Findings (by severity) | Fixed / rejected / deferred | Commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-12 | `code-reviewer` | M2 | Server, client, tests | 0 High.<br>**Medium:**<br>(1) parallel logins bypass the limiter<br>(2) saving overwrites text typed during the save<br>**Low:**<br>(3) lock also locked the plans row<br>(4) failed logout looks successful<br>(5) any `/me` error means signed out<br>(6) stale "available" slug message<br>(7) test gaps<br>(8) proxy IP | **Fixed:** 1–7, with tests and browser checks (8: see security #2)<br>**Deferred:** upload-vs-delete race test | PR #1 |
| 2 | 2026-11-12 | `security-reviewer` | M2 auth, sessions, uploads, CSRF | Same diff + greps for XSS/SQL sinks | 0 High.<br>**Medium:**<br>(1) login limiter race<br>(2) `req.ip` behind a proxy<br>**Low:**<br>(3) `SELECT *`<br>(4) dummy-hash timing<br>(5) 409 reveals registered emails | **Fixed:** 1–4 (2 via an optional `TRUST_PROXY`)<br>**Accepted:** 5 (PRD §10 Q9; limited by the sign-up rate limit) | PR #1 |
| 3 | 2026-11-12 | `requirements-reviewer` | M2 vs E0–E13, FR-01–04, FR-12 | Code, tests, docs | No blocking gaps.<br>(1) missing docs<br>(2) logout 415 contradicts Q13<br>(3) limit messages differ<br>(4) logo-on-create wording<br>(5) test gaps<br>(6) `signedOut` flag persists<br>Plus 10 behaviours not in the PRD/plan. | **Fixed:** 1–5<br>**Rejected:** 6 (correct after a deliberate logout)<br>The behaviours became decisions E14–E18 (confirmed). | PR #1 |
| 4 | 2026-11-12 | `security-reviewer` | M3 | Public read/submit, inbox, uploads, CSRF; read-only curl | 0 High.<br>**Medium:**<br>• padded slug bypassed the rate limit<br>• invalid uploads written to disk without limit<br>**Low:**<br>• non-ASCII slug → 500<br>• `SELECT *`<br>• `mailto:` injection | All 5 fixed (E34–E35); tests added | `c50187d`, `2b0272d` |
| 5 | 2026-11-12 | `code-reviewer` | M3 | Diff + `npm test` (58/58) + build | **Medium:**<br>• non-ASCII slug 500<br>• hidden `form` errors<br>**Low (6):**<br>• multer 400s not given back<br>• photo saved when photos are off<br>• rating not clearable<br>• stale inbox<br>• no retry on inbox error<br>• E21 wording | All fixed except E21 (decision E36) | `c50187d`, `2b0272d` |
| 6 | 2026-11-12 | `requirements-reviewer` | M3 vs E21–E33, FR-03–07, FR-12 | Decision table with file:line evidence | No blocking defect.<br>**Deviations:**<br>• E21<br>• E28/E31 counts<br>• wording<br>**Findings:**<br>• docs<br>• rate-limit give-back<br>• `form` errors<br>• photo-off<br>• question-deleted race 500<br>• test gaps | Fixed or recorded as E34–E37 | `c50187d`, `2b0272d` |

Available project subagents (read-only; tools `Read, Grep, Glob, Bash`, with Bash limited to read-only commands by their instructions; `model: sonnet` since 12 November 2026 to save tokens):

| Subagent | Purpose | File |
| --- | --- | --- |
| `requirements-reviewer` | Implemented behaviour vs PRD and plan: acceptance criteria, consent, quotas, journeys | `.claude/agents/requirements-reviewer.md` |
| `code-reviewer` | Correctness, error handling, validation, SQL and React quality, tests | `.claude/agents/code-reviewer.md` |
| `security-reviewer` | Owner isolation, sessions, CSRF, public data exposure, XSS, uploads, rate limits, secrets, billing simulation | `.claude/agents/security-reviewer.md` |

## Pull requests and merges

| Milestone | Pull request | Branch | Merge commit | Checks on merged `main` | Branch deleted |
| --- | --- | --- | --- | --- | --- |
| M2 auth and spaces (+ E19–E20) | [#1](https://github.com/ashfiatabassum/Agentic_Project/pull/1) — merged 2026-11-12 via `gh pr merge --merge` | `feature/m2-auth-spaces` (10 commits) | `efe21f0` | `npm test` 42/42, `npm run build` OK | Not yet (developer will delete later) |
| M3 public form and inbox (+ E34–E38) | [#2](https://github.com/ashfiatabassum/Agentic_Project/pull/2) — merged 2026-11-12 via `gh pr merge --merge` | `feature/m3-public-form-inbox` (10 commits) | `76a39c8` | `npm test` 68/68, `npm run build` OK | Not yet (developer will delete later) |

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
| 2026-11-11 | Setup: config check | First hook test reported a JSON error; the second silently skipped the file. | Claude's test harness: Git Bash mangles backslashes in arguments to Windows programs (`node -e`). Not a hook bug. | Debug output showed the path as `C:Agentic_Projectserver_hooktest.js`. | Re-ran from a script file: the hook worked. Rule added to CLAUDE.md. Recurred once later; handled the same way. |
| 2026-11-11 | Setup: server live check | A log path `../../srv.log` resolved to `C:\srv.log` and Claude tried to delete it. | Claude used a relative path without checking it. | Claude Code's safety check blocked the `rm`. | Re-ran with the log in the scratchpad. Lesson: absolute scratch paths. |
| 2026-11-11 | Setup: MySQL connection | `ER_ACCESS_DENIED_ERROR`: the password was set to the literal text `PASTE-THE-13-CHARACTERS`. | Claude's instructions put a placeholder in SQL meant to be pasted. | Failing connection although `.env` checked clean (without revealing it). | Reset SQL generated from `server/.env`. Lesson: no copy-paste placeholders for secrets. |
| 2026-11-11 | Setup: MySQL connection | `localhost` connected but `127.0.0.1` was denied. | Most likely a separate `@127.0.0.1` account (not confirmed before reset). | Connection test against both addresses. | Recreated both accounts with one password; both connect, health 200, tests pass. |
| 2026-11-11 | Setup: running the API | `npm run dev` failed with `ENOENT package.json` (twice). | Run from the root before a root `package.json` existed. | npm error. | Added a root `package.json` that starts API and client; user verified. |
| 2026-11-11 | M1: schema review checks | One check reported FAIL ("rank query … no full scan"). | Claude's regex expected `Index lookup`; MySQL prints `Covering index lookup`. | Printed `EXPLAIN FORMAT=TREE`. | Recorded as passing from the printed plan (22/22). Lesson: assert on the exact line, case-insensitively. |
| 2026-11-11 | M1: writing migrations | A Bash heredoc writing all 9 SQL files failed (quoting). | Claude: one long shell command with quoted SQL. | Bash error; nothing written. | Used the Write tool. Lesson: file tools, not heredocs. |
| 2026-11-11 | M1: committing | `server/.env.test.example` did not appear in `git status`. | `.gitignore` rule `.env.*` (starter config). | Reviewing untracked files before commit. | Added `!.env.test.example`; real `.env.test` still ignored. |
| 2026-11-12 | M2: dependencies | react-router 8.x needs React ≥ 19.2.7; the project pins 19.1.10. | Version constraint, found by Claude before installing. | `npm view … peerDependencies`. | Installed 7.18.5 (E14). Build and journey pass. |
| 2026-11-12 | M2: editing a test | A Bash rewrite of `concurrency.test.js` hung. | Claude: malformed command (stray `cat >`, nested heredocs). | Timed out after 120 s. | File confirmed unchanged; edited with the Edit tool. |
| 2026-11-12 | M2: applying review fixes | One of three batched edits did not apply (login briefly had no `hit`); another put a SQL `--` comment outside a JS string. | Claude: batched edits without checking each. | "String to replace not found"; `grep` and `node --check`. | Re-applied, comment fixed; tests 42/42 incl. the new parallel-login test. |
| 2026-11-12 | M2: subagent reviews | A reviewer's `npm test` failed with `ER_NO_SUCH_TABLE`. | Claude ran three reviewers in parallel; two reset the shared test DB at once. | Reported by the subagent. | Lesson: only one parallel reviewer may run tests. Full suite re-run alone: 42/42. |
| 2026-11-12 | M2: Playwright checks | (a) Hidden radio clicks timed out; (b) screenshot to the scratchpad refused; (c) the browser restart lost the login. | Tool behaviour, not app bugs. | Playwright errors. | (a) Clicked labels; (b) screenshots in `docs/screenshots/`, `.playwright-mcp/` ignored; (c) logged in again. |
| 2026-11-12 | M2: dev servers | `npm run dev` "exited 1" but its `node` children kept ports 4000/5173; two brief API crashes during half-applied edits. | Windows: `concurrently` doesn't stop grandchildren; Claude's edits in progress. | `netstat -ano`. | Verified the running servers serve the final code (logout 204, health 200). Stop those processes before restarting. |
| 2026-11-12 | M2: bugs Claude introduced, caught before commit | 12 first-draft defects: login limiter race, form overwrite, plans-row lock, logout and `/me` error handling, stale slug message, logout 415, limit message mismatch, theme radio names, `?next` on logout, 375 px question inputs, hard-coded limit. | Claude (initial implementation). | Playwright (4), `review-react-ui` (2), code/security reviewers (6), requirements reviewer (2). | All fixed; 42/42 tests, build OK, browser re-checks. |
| 2026-11-12 | M2: session hand-over | The M2 session closed with 39 verified files uncommitted; its leftover dev server blocked port 5173 (white screen for the developer). | Workflow: session stopped before committing. | "Port 5173 is already in use"; process tree. | Stopped that process tree; tests 42/42, build OK; committed in 4 commits (`2a5a281`…`9a8eb95`). Lesson: commit before ending a session. |
| 2026-11-12 | M2 E19–E20: Playwright checks | (a) Arrow-key tab test showed no change; (b) a screenshot showed the wrong tab. | Claude's test steps: (a) focus lost after `evaluate`; (b) stale file read back. | `document.activeElement`; panel heading. | (a) Re-tested as a user: arrows, End, wrap all work; (b) re-took the screenshot. |
| 2026-11-12 | M2: recording the sign-off | A `sed` edit blanked a plan.md heading. | Claude: `#` was both the delimiter and in the text. | Printed result. | Restored with Edit (`c8343c6`). Lesson: Edit tool for Markdown. |
| 2026-11-12 | M3: Playwright check | Unrated stars looked filled on the warm theme. | Claude: empty stars used the orange border colour. | Screenshot. | Neutral `--star-empty`; re-checked. |
| 2026-11-12 | M3: test data | Night Owl message showed "�" for an em dash. | Claude's test step: `curl` in Git Bash sent Windows-1252. Not an app bug. | Stored bytes `EF BF BD`. | Re-saved via a UTF-8 client. Lesson: create non-ASCII test data with Node/fetch. |
| 2026-11-12 | M3: Claude's first implementation | 9 defects found by the reviewers (Subagent log #4–6): padded-slug bypass, unlimited invalid uploads, non-ASCII 500, hidden `form` errors, photo saved when off, rating not clearable, stale inbox, `mailto:` injection, question-deleted 500. | Claude (initial implementation). | The three reviewer subagents. | All fixed, 10 new tests (68/68), browser re-checks; E21 difference recorded as E36. |
| 2026-11-12 | M3: writing the logs | A Bash heredoc with this log update failed. | Claude repeated the M1 mistake. | Bash error; nothing written. | Wrote a script file with the file tool. |
| 2026-11-12 | M3: browser re-check | A star click failed ("does not match any elements"). | Claude clicked before the page loaded. | Playwright error. | Repeated after load: works. |
| 2026-11-12 | M3 E38: breadcrumbs | (a) The space crumb linked to edit on the inbox, to the inbox elsewhere; (b) the Alt+← Back test was inconclusive. | Claude: (a) inconsistent target; (b) the shortcut belongs to the browser window in automated runs. | (a) Reviewing the crumb table; (b) URL unchanged. | (a) Plain text on its own inbox; (b) `history.back()` after a real click: /login → /. All crumbs clicked. |

## Remaining gaps

List incomplete requirements with honest impact. In particular, real Stripe checkout/webhooks are excluded from the current demo plan unless the instructor's actual requirements require them.
