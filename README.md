# Testimonial MVP

A small testimonial-collection app built with Claude Code and an agentic workflow (Module 13 project). A business owner creates a branded collection page; customers leave a written testimonial without an account; the owner moderates it, publishes selected ones on a public **Wall of Love**, embeds that wall on another website, watches activity on a dashboard, and can run a clearly labelled **simulated** upgrade to a Paid plan.

**Stack:** React 19 + Vite 8 + Tailwind CSS 4 (`client/`), Node.js + Express 5 (`server/`), MySQL 8.0 with parameterized queries. JavaScript throughout. The course built the project in PHP/Laravel; the assignment allows a familiar stack. Grading brief: [docs/assignment-brief.md](docs/assignment-brief.md).

**Repository documents:** what the app must do — [docs/PRD.md](docs/PRD.md); data model — [docs/data-model.md](docs/data-model.md); build order and every decision — [plan.md](plan.md); what was actually checked, tool evidence, and the mistakes log — [docs/verification.md](docs/verification.md); current state — [docs/STATUS.md](docs/STATUS.md); rules for Claude Code — [CLAUDE.md](CLAUDE.md).

## How to run locally

**Requirements:** Node.js 22.12+ (developed on 24.18), npm, MySQL 8.0.

1. **Install dependencies** (root, `server/`, and `client/`):
   ```bash
   npm run setup
   ```
2. **Create the database and app user** as the MySQL root user (choose your own password):
   ```sql
   CREATE DATABASE testimonial_mvp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE DATABASE testimonial_mvp_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'testimonial_app'@'localhost' IDENTIFIED BY 'your-password';
   CREATE USER 'testimonial_app'@'127.0.0.1' IDENTIFIED BY 'your-password';
   GRANT ALL PRIVILEGES ON testimonial_mvp.* TO 'testimonial_app'@'localhost';
   GRANT ALL PRIVILEGES ON testimonial_mvp.* TO 'testimonial_app'@'127.0.0.1';
   GRANT ALL PRIVILEGES ON testimonial_mvp_test.* TO 'testimonial_app'@'localhost';
   GRANT ALL PRIVILEGES ON testimonial_mvp_test.* TO 'testimonial_app'@'127.0.0.1';
   ```
3. **Configure the server:** copy `server/.env.example` to `server/.env` and `server/.env.test.example` to `server/.env.test`, and set `DB_PASSWORD` in both. Both files are gitignored; never commit them.
4. **Create tables and demo data:**
   ```bash
   npm run migrate   # creates the 10 tables (safe to re-run)
   npm run seed      # demo owner demo@example.com / demo-password, 2 spaces, sample testimonials
   ```
   `npm run db:reset` wipes and re-creates the dev database (development only).
5. **Start the app:**
   ```bash
   npm run dev
   ```
   This starts the API on http://localhost:4000 and the client on http://localhost:5173. Open the client URL; `/api` requests are proxied to the API. (Other ports: set `PORT` in `server/.env`, and `CLIENT_PORT` / `API_PROXY_TARGET` in a gitignored `client/.env.local`.)
6. **Check:** http://localhost:4000/api/health should return `{"status":"ok","api":"ok","database":"ok"}`.

**Tests and build:** `npm test` (119 server tests; resets and uses the separate `testimonial_mvp_test` database, never the dev data), `npm run test:client` (5 client unit tests, no database), `npm run build` (client production build). Final result on `main`: **119/119**, **5/5**, build OK.

**Try it:** log in as `demo@example.com` / `demo-password` (Free plan) → open a space's public link `/s/acme-bakery` in a private window and submit a testimonial with public consent → back in the inbox, add it to the wall → open `/s/acme-bakery/wall` → "Embed" on the dashboard card → "Upgrade (demo)" on the dashboard.

A localhost link works only on the same computer; demonstrating from another device needs a reachable host.

## What is done

All PRD requirements FR-01 – FR-13 and every item of the final scope (PRD §11) are implemented and verified: automated tests plus a Playwright browser check per milestone, recorded in [docs/verification.md](docs/verification.md#feature-checks). A final read-only audit against the whole PRD found no functional gaps (Subagent usage log #18).

| Feature (PRD) | Status | Milestone, PR |
| --- | --- | --- |
| Owner sign-up, login, logout, 7-day sessions, protected pages, rate limits (FR-01) | Done and verified | M2, [#1](https://github.com/ashfiatabassum/Agentic_Project/pull/1) |
| Public landing page with feature preview and pricing | Done and verified | M2, #1 (prices from the API since M7) |
| Spaces: create, edit, delete, unique link, questions, customer fields off/optional/required, two+ themes, brand colour, logo, thank-you message, owner isolation (FR-02 – FR-04) | Done and verified | M2, #1 |
| Public collection page without an account: fields, rating, answers, photo, two unchecked consents, validation, thank-you (FR-05, FR-06) | Done and verified | M3, [#2](https://github.com/ashfiatabassum/Agentic_Project/pull/2) |
| Inbox: favourites first, filters, search, details, locked count (FR-07) | Done and verified | M3, #2 |
| Moderation: edit (marked as edited), hide, favourite, wall, delete (FR-08) | Done and verified | M4, [#3](https://github.com/ashfiatabassum/Agentic_Project/pull/3) |
| Public Wall of Love: only on-wall, visible, consented, unlocked testimonials; no private data (FR-09) | Done and verified | M4, #3 |
| Embed builder: grid / list / carousel, light / dark, background, logo header, animation, live preview, responsive iframe snippet; only `/embed/*` can be framed (FR-10) | Done and verified | M5, [#5](https://github.com/ashfiatabassum/Agentic_Project/pull/5), [#6](https://github.com/ashfiatabassum/Agentic_Project/pull/6) |
| Dashboard: totals, plan and usage, recent activity, daily graph with 7/30 days, upgrade prompt (FR-11) | Done and verified | M6, [#4](https://github.com/ashfiatabassum/Agentic_Project/pull/4) |
| Plan limits: 3 / 25 spaces (concurrency-safe), 100 / 1,000 visible per space with **accept but lock**, 1,000 hard cap (FR-12) | Done and verified | M2, M3, M6 |
| Billing demo: plan comparison, clearly labelled simulated upgrade (no card fields, nothing charged), success page, history, Paid persists, limits rise and locked testimonials unlock (FR-13) | Done and verified | M7, [#7](https://github.com/ashfiatabassum/Agentic_Project/pull/7) |

## What is not done

**Excluded by design** (PRD §8, decided before building):

- **Real payments:** no Stripe or any payment provider, no card details, no invoices. The upgrade is a simulation and is labelled as one everywhere; the database refuses a non-simulated billing event. No downgrade and no plan expiry (data-model D6).
- **Video testimonials** (Testimonial.to's headline feature), NPS, brand monitoring, rewards, portfolio pages, imports (social or review sites), case studies, email notifications and automated invitations, AI features, custom domains, REST API / webhooks / Zapier, replying to testimonials, tags, multi-owner teams, and extra widget types (single-testimonial embed, badges, collect buttons).
- **Account extras (PRD §10 Q10):** email verification, password reset, change password or email, delete account, "remember me", social login, admin role.

**Known limitations:**

- **No production deployment.** The app runs locally with `npm run dev`. The anti-framing headers for client pages are set by the Vite dev/preview server (`client/frameHeaders.js`); any host serving `client/dist` must send the same headers. The embed snippet points to the origin the builder was opened on.
- Rate limits are kept in server memory per IP; behind a reverse proxy set `TRUST_PROXY` (see `server/.env.example`). The public wall read and the simulated upgrade have no rate limit (accepted, plan.md E51, E113).
- Small accepted items are listed in [docs/verification.md → Remaining gaps](docs/verification.md#remaining-gaps).
- **Requirements source:** the app follows the agreed PRD. The instructor's separate *Project Requirements* lesson text was never available in this repository, so it was not compared line by line (PRD header).

## Agentic tools used, and where

Configuration alone is not evidence; every row below links to recorded runs.

| Tool | How it was used | Evidence |
| --- | --- | --- |
| **`CLAUDE.md`** | Project rules and verified commands: reading order, stack, owner isolation, quotas on the server, billing as a labelled simulation, feature loop, git workflow, logging rules | [CLAUDE.md](CLAUDE.md) |
| **Skills (29 runs)** | `grill-me`/`grilling` interviewed the developer before the login feature (17 decisions); `mysql` + `review-mysql-model` reviewed tables, indexes, transactions and locking each milestone (EXPLAIN on the test database); `vercel-react-best-practices` + `review-react-ui` reviewed every client milestone; `dataviz` guided the dashboard chart | [Skill usage log](docs/verification.md#skill-usage-log) #1–#29 |
| **Subagents (18 runs)** | Read-only reviewers in `.claude/agents/`: `code-reviewer`, `security-reviewer`, `requirements-reviewer` after each milestone (M2–M7), plus a final whole-PRD audit. They found real defects, e.g. a rate-limit bypass with padded slugs (M3), the missing logo in the embed (M5), a stale billing page after a second upgrade (M7) | [Subagent usage log](docs/verification.md#subagent-usage-log) #1–#18 |
| **Hook** | A PostToolUse hook (`.claude/hooks/format-changed.cjs`) normalises whitespace after every Edit/Write; observed firing in M2, M4, M5 and M7 | [Agentic tool use](docs/verification.md#agentic-tool-use) |
| **MCP: Playwright** | Browser checks per milestone: customer and owner journeys, second owner in an isolated context, 375 px, keyboard focus, forced errors, the embed on a separate-origin page, framing refusals, reduced motion, the billing journey | [Feature checks](docs/verification.md#feature-checks), screenshots below |
| **Parallel session** | M5 (embed) was built in a **second Claude Code session** in a git worktree on `feature/m5-embed` while M6 (dashboard) was built in the first session; each merged by its own PR (M6 #4 first, M5 #5 second after merging `main`), then an integration check on `main` | [Parallel work and integration](docs/verification.md#parallel-work-and-integration) |
| OpenSpec | **Not used** (optional); planning was done in `plan.md` with numbered decisions approved by the developer before each milestone | [plan.md](plan.md) |

Every mistake along the way — by Claude, the developer, or the environment — is in the [Issues and corrections log](docs/verification.md#issues-and-corrections-log).

## Screenshots

All in [docs/screenshots/](docs/screenshots/), taken with Playwright MCP from the running app with synthetic data:

- Landing and auth: `m2-landing-hero-1440.png`, `m2-login-1024.png`, `m2-signup-errors-1440.png`
- Spaces: `m2-space-form.png`, `m2-space-created.png`, `m3-breadcrumbs-edit.png`
- Public form and thank-you: `m3-public-warm-1440.png`, `m3-public-dark-375.png`, `m3-public-errors.png`, `m3-thank-you-warm.png`
- Inbox and moderation: `m3-inbox-1440.png`, `m3-inbox-locked.png`, `m4-inbox-moderation.png`
- Wall of Love: `m4-wall-desktop.png`, `m4-wall-375.png`, `m4-wall-dark-empty.png`
- Embed: `m5-builder-1280.png`, `m5-host-grid-1280.png`, `m5-host-carousel-dark-375.png`, `m5-framing-blocked.png`
- Dashboard: `m6-dashboard-desktop.png`, `m6-dashboard-375.png`, `m5-integration-dashboard-main.png`
- Billing demo: `m7-billing-confirm.png`, `m7-billing-success.png`, `m7-billing-paid.png`

## Submission checklist

- [x] GitHub repository is public: https://github.com/ashfiatabassum/Agentic_Project (checked with `gh repo view`, 12 November 2026).
- [x] README contains verified run commands, exact done/not-done status, and which agentic tools were used and where.
- [x] Final data model and `CLAUDE.md` are committed.
- [x] At least two agentic tools were actually used; a separate branch/session was merged cleanly.
- [ ] 2–5 minute recording or screenshots show the app working (screenshots are in the repo; a recording is up to the developer).
- [ ] 200–300 word reflection exported as PDF or DOCX (written by the developer; facts to draw on: [docs/reflection-notes.md](docs/reflection-notes.md)).
- [ ] Repository and uploaded evidence were checked before final LMS submission.

**LMS steps:** open the assignment → **Add submission** → paste the repo link → upload screenshots/recording and the reflection → **Save changes** → **Submit assignment**. A submitted assignment cannot be edited.
