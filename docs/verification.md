# Verification log

Record **observed** results only. A planned test is not a pass. Use test accounts and synthetic testimonials; do not include real customer data in public screenshots or commits.

## Environment

- Date/time: 11 November 2026 (setup phase)
- Commit: `d6e2ca4`
- Frontend/backend/database versions and run commands: React 19.1.10, Vite 8.3.5, Tailwind 4.3.3, Express 5.3.0, mysql2 3.24.6, MySQL 8.0.46, Node 24.18.0; `npm run setup`, `npm run dev` (see README)
- Browser: Chrome (user confirmed the scaffold status page shows client/API/database ok)
- Playwright MCP connection status (`/mcp`): configuration checked outside a session — `@playwright/mcp@0.0.84` started, completed the MCP handshake, and listed 25 tools. `/mcp` inside a fresh session: not yet recorded.
- Hook status (`/hooks`): hook command run manually as Claude Code would run it — normalized a `server/` JS file, ignored a file outside `client/`/`server/`. Firing during a real session edit: not yet observed.

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

## Remaining gaps

List incomplete requirements with honest impact. In particular, real Stripe checkout/webhooks are excluded from the current demo plan unless the instructor's actual requirements require them.
