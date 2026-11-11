# Project status and next handoff

**Updated:** 11 November 2026  
**Phase:** Requirements starter only; no application feature has been implemented or verified.

## Decisions made

- Stack: React + Vite + Tailwind, Node.js + Express, MySQL, JavaScript.
- Core deliverable: text testimonials, anonymous customer submission, owner moderation, public wall, iframe embed, dashboard, plan limits.
- Billing: explicitly simulated upgrade; no card collection or Stripe integration in this scoped demo.
- Agentic workflow (assignment requires at least two tools): core tools are the formatting hook, React and MySQL skills, and Playwright MCP; the requirements-reviewer subagent and OpenSpec are optional. At least one parallel branch/session must be merged.
- Repository: the starter lives at the root of `ashfiatabassum/Agentic_Project` (moved from `testimonial-mvp-starter/` on 11 November 2026).
- Config: hook command uses `$CLAUDE_PROJECT_DIR`; Playwright MCP pinned to `@playwright/mcp@0.0.84`; hook script tested manually on a throwaway `client/` file (normalized whitespace, exit 0).

- Setup (11 November 2026): starter pushed (`6a07d99`); repo is public. Hook command and Playwright MCP 0.0.84 configuration checked outside a session (hook normalizes `client/`/`server/` JS; MCP starts and lists 25 tools). This is a configuration check, not use during feature work.
- Server scaffold (`ead4f0a`): Express API with MySQL pool and `/api/health`; 3 node:test tests pass, including against the live database.
- Client scaffold (`081f12f`): React + Vite + Tailwind with `/api` proxy; build succeeds; user confirmed `npm run dev` shows client, API, and database all ok in the browser.
- Local MySQL: database `testimonial_mvp` and user `testimonial_app` (localhost and 127.0.0.1) recreated cleanly after an access-denied problem (placeholder password set by mistake, plus a likely extra `@127.0.0.1` account with a different password).

## Next actions

1. Obtain the actual Module 13 **Project Requirements** lesson text and reconcile it with `docs/PRD.md` (especially billing and media requirements). The assignment brief is already in `docs/assignment-brief.md`.
2. Build a migration runner (`server/db/migrations/`) and record its command; finalise the data model gaps first (embed settings, recent activity, question FK, lock strategy, missing columns, price).
3. Complete the first vertical slice: owner sign up → create space → public anonymous submission → owner inbox.

## Progress table

| Feature | Planned | Implemented | Verified | Notes |
| --- | :---: | :---: | :---: | --- |
| Authentication | Yes | No | No | |
| Spaces and configurable fields | Yes | No | No | |
| Public form and consent | Yes | No | No | |
| Inbox and moderation | Yes | No | No | |
| Wall and embed | Yes | No | No | |
| Dashboard and quotas | Yes | No | No | |
| Demo billing | Yes | No | No | |

## Blockers / open questions

- Project Requirements lesson (feature list) not yet compared with the PRD; the assignment brief is available.
- Reviewer GitHub username for repo access is unknown (brief shows a placeholder); otherwise make the repo public.
- Is profile photo mandatory for submission grading? Decide storage provider and size cap.
- Is 999 BDT, USD, or another currency, and one-time or recurring? The demo must not imply a cadence before confirmation.
- Choose question count and length limits during the first OpenSpec proposal.

## Handoff rule

After each feature, replace stale rows above and record the last completed commit, checks run, unresolved bugs, and exact next task. Do not replace unknowns with guesses.
