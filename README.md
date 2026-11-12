# Testimonial MVP

## How to run the project

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
   API on http://localhost:4000, client on http://localhost:5173 (open the client; `/api` is proxied). Health check: http://localhost:4000/api/health returns `{"status":"ok","api":"ok","database":"ok"}`.

**Tests and build:** `npm test` (119 server tests on the separate `testimonial_mvp_test` database), `npm run test:client` (5 client unit tests), `npm run build`. Final result on `main`: **119/119**, **5/5**, build OK.

**Try it:** log in as `demo@example.com` / `demo-password` → open `/s/acme-bakery` in a private window and submit a testimonial with public consent → in the inbox, add it to the wall → open `/s/acme-bakery/wall` → "Embed" on the dashboard card → "Upgrade (demo)" on the dashboard.

## Which features are done and which aren't

### Done

All PRD requirements FR-01 – FR-13 are implemented and verified (automated tests plus a Playwright browser check per milestone, recorded in [docs/verification.md](docs/verification.md#feature-checks)).

| Feature | PRD | Status | PR |
| --- | --- | --- | --- |
| Owner sign-up, login, logout | FR-01 | ✅ Done | [#1](https://github.com/ashfiatabassum/Agentic_Project/pull/1) |
| Landing page with pricing | — | ✅ Done | #1 |
| Spaces: link, questions, fields, theme, logo | FR-02 – FR-04 | ✅ Done | #1 |
| Public collection form with consent | FR-05, FR-06 | ✅ Done | [#2](https://github.com/ashfiatabassum/Agentic_Project/pull/2) |
| Inbox: filters, search, details | FR-07 | ✅ Done | #2 |
| Moderation: edit, hide, favourite, delete | FR-08 | ✅ Done | [#3](https://github.com/ashfiatabassum/Agentic_Project/pull/3) |
| Public Wall of Love | FR-09 | ✅ Done | #3 |
| Embed builder and iframe snippet | FR-10 | ✅ Done | [#5](https://github.com/ashfiatabassum/Agentic_Project/pull/5), [#6](https://github.com/ashfiatabassum/Agentic_Project/pull/6) |
| Dashboard with 7/30-day graph | FR-11 | ✅ Done | [#4](https://github.com/ashfiatabassum/Agentic_Project/pull/4) |
| Plan limits (accept but lock, hard cap) | FR-12 | ✅ Done | #1, #2, #4 |
| Simulated billing upgrade | FR-13 | ✅ Done | [#7](https://github.com/ashfiatabassum/Agentic_Project/pull/7) |

### Not done

**Excluded by design** (PRD §8):

- **Real payments:** no Stripe or any payment provider, no card details, no invoices. No downgrade and no plan expiry.
- Video testimonials, NPS, imports, email notifications and invitations, AI features, custom domains, REST API / webhooks, replying, tags, teams, extra widget types.
- Account extras: email verification, password reset, change password or email, delete account, social login, admin role.

**Known limitations:**

- No production deployment; the app runs locally with `npm run dev`. Any host serving `client/dist` must send the anti-framing headers from `client/frameHeaders.js`.
- Rate limits are kept in server memory per IP; behind a reverse proxy set `TRUST_PROXY`. The public wall read and the simulated upgrade have no rate limit (accepted, plan.md E51, E113).
- The instructor's *Project Requirements* lesson text was never available, so the app follows the agreed PRD.

## Which agentic tools were used and where

| Tool | Where it was used | Evidence |
| --- | --- | --- |
| `CLAUDE.md` | Project rules for every session | [CLAUDE.md](CLAUDE.md) |
| Skills (29 runs) | Planning and reviews in every milestone | [Skill log](docs/verification.md#skill-usage-log) |
| Subagents (18 runs) | Code, security and requirements reviews, M2–M7 | [Subagent log](docs/verification.md#subagent-usage-log) |
| Hook | Formats files after every edit | [Tool use](docs/verification.md#agentic-tool-use) |
| MCP: Playwright | Browser checks in every milestone | [Feature checks](docs/verification.md#feature-checks) |
| Parallel session | M5 built in a second session and worktree | [Parallel work](docs/verification.md#parallel-work-and-integration) |
| OpenSpec | Not used (optional) | [plan.md](plan.md) |

Details:

- **Skills:**
  - `grill-me` / `grilling`: interviewed the developer before the login feature (17 decisions).
  - `mysql` + `review-mysql-model`: reviewed tables, indexes, transactions and locking in each milestone.
  - `vercel-react-best-practices` + `review-react-ui`: reviewed the client code in every milestone.
  - `dataviz`: guided the dashboard chart.
- **Subagents:** read-only reviewers in `.claude/agents/`, plus a final audit against the whole PRD. Examples of real defects they found:
  - a rate-limit bypass with padded slugs (M3)
  - the logo missing from the embed (M5)
  - a stale billing page after a second upgrade (M7)
- **Hook:** `.claude/hooks/format-changed.cjs` (PostToolUse on Edit/Write) cleans up whitespace in changed files. Seen firing in M2, M4, M5 and M7.
- **Playwright MCP:** browser checks of:
  - the customer journey, and the owner journey including a second owner
  - phone width (375 px) and keyboard focus
  - forced error states
  - the embed on a separate-origin page
  - the billing journey

  Screenshots are in [docs/screenshots/](docs/screenshots/).
- **Parallel session:** M5 (the embed) was built in a second Claude Code session, in a git worktree on `feature/m5-embed`, while M6 was built in the first session. M6 merged first (PR #4), then M5 (PR #5), followed by an integration check on `main`.
- **OpenSpec:** not used. Planning was done in `plan.md`, with numbered decisions the developer approved.
