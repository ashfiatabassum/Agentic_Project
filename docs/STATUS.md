# Project status and next handoff

**Updated:** 12 November 2026
**Phase:** M0 and M1 complete. **M2 (auth and spaces) implemented and verified on branch `feature/m2-auth-spaces` — not yet committed.** The developer is checking everything by hand; commits, push, and the pull request happen only after the developer confirms.

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

- **M2 auth and spaces (uncommitted)** — sign up / log in / log out with server-side sessions and rate limits; spaces with questions, customer fields, theme, colour, logo, slug, delete; dashboard; space limit enforced under concurrency. **42/42 tests**, build OK, Playwright journey passed (two owners, 375 px, error states). Hook observed firing. Reviews: 4 skills + 3 subagents, findings fixed or recorded (`docs/verification.md`).

## Next actions

Milestones and their tasks live in [`plan.md`](../plan.md).

1. **Developer:** check M2 by hand (`npm run dev`): the landing page at http://localhost:5173/, the redesigned sign up / log in, then the dashboard and space form; confirm plan decisions **E14–E18** (E19–E20 were requested by the developer). M2 is committed on `feature/m2-auth-spaces` (7 commits, not pushed yet).
2. After confirmation: push the branch, open the PR to `main`, merge, record PR link and merge commit in `verification.md`, delete the branch.
3. Plan **M3 — public form + inbox** (accept but lock, hard cap, photo upload; move the submit locking pattern from `concurrency.test.js` into a service). Re-check the `answeredQuestions` EXPLAIN with real answers.
4. Known gap from the E19 review: landing-page pricing is a copy of the plans seed rows (`client/src/lib/plans.js`); M7 billing adds `GET /api/plans` and switches the page to it.
5. Still open: compare the Project Requirements lesson with the PRD if it becomes available.

## Progress table

| Feature | Planned | Implemented | Verified | Notes |
| --- | :---: | :---: | :---: | --- |
| Data model and migrations | Yes | Yes | Yes | M1; 19/19 tests |
| Authentication | Yes (PRD §10) | Yes (uncommitted) | Yes | M2; 13 API tests + browser |
| Spaces, fields, themes, logo | Yes (PRD §11) | Yes (uncommitted) | Yes (settings) | M2; public display in M3 |
| Public form and consent | Yes | No | No | Tables ready |
| Inbox and moderation | Yes | No | No | Tables ready |
| Wall and embed | Yes | No | No | |
| Dashboard and quotas | Yes | Partly | Space limit only | M2: space limit + "n of 3" usage; stats M6, testimonial limits M3 |
| Demo billing | Yes | No | No | |

## Blockers / open questions

- Project Requirements lesson not yet compared with the PRD (PRD is the agreed baseline).
- M2 waits for the developer's manual check before any commit.
- Rate limits share one bucket behind a proxy unless `TRUST_PROXY` is set (known limitation, README).

## Handoff rule

After each feature, replace stale rows above and record the last completed commit, checks run, unresolved bugs, and exact next task. Do not replace unknowns with guesses.
