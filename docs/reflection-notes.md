# Reflection notes — facts for the developer's reflection

These are **facts from the project logs**, collected so the 200–300-word reflection can be accurate. They are not the reflection: the reflection is the developer's own experience, written in their own words, then exported as PDF or DOCX ([reflection-template.md](reflection-template.md)). Check each claim against the linked log before using it.

## What was built (for paragraph 1)

- All PRD requirements FR-01 – FR-13: sign-up/login, spaces with themes and custom fields, public collection page without accounts, inbox and moderation, Wall of Love, embed builder, dashboard, Free/Paid limits with "accept but lock", and a clearly labelled **simulated** billing upgrade (no real payments). README → "What is done".
- 7 pull requests (#1–#7), 119 server tests + 5 client tests passing on `main`, Playwright browser checks for every milestone.
- Planning: PRD and data model first, then one milestone at a time in `plan.md` with numbered decisions (E0–E113) approved before coding. `CLAUDE.md` held the rules. OpenSpec was **not** used.

## What worked well (for paragraph 2) — examples with observed results

- **Reviewer subagents found real bugs the tests did not:** a rate-limit bypass with a padded slug (M3, Subagent log #4); the embed missing the saved logo, which FR-04 requires (M5, #12); a stale billing page after upgrading in another tab (M7, #16 and #17).
- **Tests found a bug from M1:** the M6 dashboard tests showed timestamps 6 hours ahead, because MySQL used the server's Bangladesh time zone while the app read UTC (plan.md E92; Issues log "M6: tests found an old bug").
- **Concurrency tests:** 4 parallel space creations → exactly 3; 4 parallel submissions at 999 → exactly 1,000; 5 parallel upgrades → exactly 1 billing event.
- **Playwright MCP:** checked the embed on a page from a different origin, proved that `/login` and `/dashboard` cannot be framed, emulated reduced motion, and caught visual bugs (unrated stars looking filled, a clipped card border).
- **Parallel session:** M5 (embed) in a second Claude Code session and git worktree while M6 (dashboard) was built in the first; both merged and checked together on `main` (verification.md → Parallel work and integration).
- **Hook:** whitespace normalised automatically after edits (observed M2, M4, M5, M7).

## What went wrong and how it was fixed (for paragraph 3) — pick one real example

- **Incomplete AI output caught by review:** Claude's first M5 plan left the logo out of the embed; the requirements reviewer pointed to FR-04; fixed with a logo header (E73), confirmed in the browser.
- **Wrong claim in a plan:** the M5 plan said lazy loading made the embed's first load smaller; the reviewer and `npm run build` showed it did not; the plan was corrected (Issues log "M5 planning").
- **Shared test database in parallel work:** an early M2 reviewer run hit `ER_NO_SUCH_TABLE` because two reviewers reset the same test database at once; for M5/M6 the rule became "ask before every `npm test`" (E55).
- **Merge problem git could not see:** both sessions used the same row numbers in the shared logs; found while resolving the M5 merge; M5's rows renumbered (Issues log "M5: merging `main`").
- **Shared dev database reset:** session A reset the shared dev database without telling session B first, against E55; recorded in the issues log with the lesson.
- **Repeated tooling mistakes:** Bash heredocs with complex quoting failed several times (M1, M3, M4, M5); Playwright steps sent in parallel ran before the page loaded (M3, M7). Fix: file-based scripts and one browser step at a time.

## What to do differently next time (for paragraph 4) — options backed by the logs

- Split shared resources per parallel session from the start: separate test databases **and** separate blocks of log numbers, and agree on who may reset what.
- Compare against the instructor's requirements text before coding (never available here; the README says so).
- Write the stated "done" claims (README, plan) only after checking them — several were corrected after review.
- Keep milestones small; the review-then-fix loop worked best when each milestone had its own branch, tests, and browser check.

Word-count target: 200–300 words in total. Keep billing described as a **simulation**.
