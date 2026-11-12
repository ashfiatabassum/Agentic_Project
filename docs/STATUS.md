# Project status and next handoff

**Updated:** 12 November 2026
**Phase:** M0–M3 complete (M2 merged by [PR #1](https://github.com/ashfiatabassum/Agentic_Project/pull/1), `efe21f0`; M3 merged by [PR #2](https://github.com/ashfiatabassum/Agentic_Project/pull/2), `76a39c8`). M4 (moderation + Wall of Love) implemented and verified on `feature/m4-moderation-wall`, checked by hand by the developer and E54 confirmed; PR to `main` open, merge waits for the developer.

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

- **M2 auth and spaces + landing page** — merged (PR #1). 42 tests at merge.
- **M3 public form and inbox** — merged (PR #2, `76a39c8`; 68/68 tests and build OK on `main`). public collection page `/s/:slug` (theme, colour, logo, fields per mode, rating, answers, photo, two unchecked consents, thank-you), submission with accept but lock, the 1,000 hard cap under concurrency, two rate limits; owner inbox (favourites first, filters, search, detail, locked banner); dashboard inbox links and counts. **68/68 tests**, build OK, Playwright journey passed. Reviews: 4 skills + 3 subagents; all findings fixed or recorded as E34–E37.

- **M4 moderation + Wall of Love** — on `feature/m4-moderation-wall` (plan commit `99b2244` on `main`). Owner-only edit, hide, favourite, wall, delete (locked → 403; wall needs public consent and not hidden; deleting frees capacity); public wall `/s/:slug/wall` with only eligible testimonials and no private data. **85/85 tests** (17 new), build OK, Playwright journey passed (`docs/screenshots/m4-*`). Reviews: 4 skills (log #16–19) + 3 subagents (log #7–9); fixes applied, the rest recorded as E54.

## Next actions

Milestones and their tasks live in [`plan.md`](../plan.md).

1. ✅ Done: developer checked M2 by hand and confirmed E14–E18; [PR #1](https://github.com/ashfiatabassum/Agentic_Project/pull/1) merged (`efe21f0`). Branch `feature/m2-auth-spaces` kept for now; delete it later (`git branch -d feature/m2-auth-spaces` and `git push origin --delete feature/m2-auth-spaces`).
2. ✅ Done: developer checked M3 by hand and confirmed E34–E38; [PR #2](https://github.com/ashfiatabassum/Agentic_Project/pull/2) merged (`76a39c8`). Branch `feature/m3-public-form-inbox` kept for now; delete it later together with the M2 branch.
3. ✅ Developer checked M4 by hand and confirmed E54 (12 November 2026). **Now:** PR to `main` is open; merge when the developer says so, then record the merge commit.
6. After M4 merges: M5 (embed) and M6 (dashboard) in parallel sessions per plan.md E53.
4. Known gap from the E19 review: landing-page pricing is a copy of the plans seed rows (`client/src/lib/plans.js`); M7 billing adds `GET /api/plans` and switches the page to it.
5. Still open: compare the Project Requirements lesson with the PRD if it becomes available.

## Progress table

| Feature | Planned | Implemented | Verified | Notes |
| --- | :---: | :---: | :---: | --- |
| Data model and migrations | Yes | Yes | Yes | M1; 19/19 tests |
| Authentication | Yes (PRD §10) | Yes | Yes | M2; 13 API tests + browser |
| Spaces, fields, themes, logo | Yes (PRD §11) | Yes | Yes | M2 settings; M3 public display |
| Public form and consent | Yes | Yes | Yes | M3; browser + 26 tests |
| Inbox and moderation | Yes | Yes | Yes (M4 on branch) | M3 inbox merged; M4 actions waiting for review |
| Wall and embed | Yes | Wall yes (M4 branch); embed no | Wall yes | Embed is M5 |
| Dashboard and quotas | Yes | Partly | Limits yes; stats no | Space limit (M2) and accept-but-lock testimonial limits + hard cap (M3); stats M6 |
| Demo billing | Yes | No | No | |

## Blockers / open questions

- Project Requirements lesson not yet compared with the PRD (PRD is the agreed baseline).
- Rate limits share one bucket behind a proxy unless `TRUST_PROXY` is set (known limitation, README).

## Handoff rule

After each feature, replace stale rows above and record the last completed commit, checks run, unresolved bugs, and exact next task. Do not replace unknowns with guesses.
