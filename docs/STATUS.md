# Project status and next handoff

**Updated:** 11 November 2026
**Phase:** M0 (setup) and M1 (data model and migrations) complete. No user-facing feature implemented yet; M2 (first vertical slice) is next.

## Decisions made

- Stack: React + Vite + Tailwind, Node.js + Express, MySQL 8.0, JavaScript.
- Scope: PRD §11 is the final feature scope (after comparing with Testimonial.to): text testimonials with job title, rating, and optional photo; spaces with custom questions, themes, brand colour, logo, and thank-you message; inbox with search, moderation, and delete; Wall of Love; iframe embed; dashboard; plan limits with **accept but lock**; simulated ৳999/month Paid upgrade. Video, AI, imports, and real payments excluded.
- Login (FR-01) fully specified in PRD §10 (grill-me session).
- Data model **Final** (`docs/data-model.md`): 10 tables, reviewed with the `mysql` and `review-mysql-model` skills.
- Agentic workflow: core tools are the formatting hook, skills (`grill-me`, `mysql` + `review-mysql-model`, `vercel-react-best-practices` + `review-react-ui`), and Playwright MCP; the requirements-reviewer subagent and OpenSpec are optional. At least one parallel branch/session must be merged.
- Repository: root of `ashfiatabassum/Agentic_Project` (public).

## Done so far

- **M0 setup** — starter pushed (`6a07d99`); server scaffold (`ead4f0a`); client scaffold (`081f12f`); verified commands (`d6e2ca4`); Playwright MCP and hook loaded in a fresh session (`884217d`, `38f335d`).
- **M1 data model and migrations** — 9 migrations + runner with checksums and a named lock; `migrate`, `db:reset` (guarded), `seed`; test database `testimonial_mvp_test`; **19/19 tests pass** (schema, password, concurrency incl. 1,000 hard cap, health). Dev DB `testimonial_mvp` migrated and seeded (demo owner `demo@example.com` / `demo-password`).

## Next actions

Milestones and their tasks live in [`plan.md`](../plan.md).

1. Plan **M2 — Auth + spaces + public form + inbox** in `plan.md` (login is already decided in PRD §10; spaces, public form, and inbox UI details still to settle).
2. Carry forward from M1: owner-scoped queries, explicit public columns (R7), and moving the quota/hard-cap locking from tests into real service functions.
3. Hook evidence: still required; run a later milestone in a fresh Claude Code session so the hook fires on real edits.
4. Still open: compare the Project Requirements lesson with the PRD if it becomes available.

## Progress table

| Feature | Planned | Implemented | Verified | Notes |
| --- | :---: | :---: | :---: | --- |
| Data model and migrations | Yes | Yes | Yes | M1; 19/19 tests |
| Authentication | Yes (PRD §10) | No | No | M2 |
| Spaces, fields, themes, logo | Yes (PRD §11) | No | No | Tables ready |
| Public form and consent | Yes | No | No | Tables ready |
| Inbox and moderation | Yes | No | No | Tables ready |
| Wall and embed | Yes | No | No | |
| Dashboard and quotas | Yes | No | No | Locking pattern tested in M1 |
| Demo billing | Yes | No | No | |

## Blockers / open questions

- Project Requirements lesson not yet compared with the PRD (PRD is the agreed baseline).
- Hook evidence not yet observed during real feature work.

## Handoff rule

After each feature, replace stale rows above and record the last completed commit, checks run, unresolved bugs, and exact next task. Do not replace unknowns with guesses.
