# Testimonial MVP — project starter

This repository currently contains the **requirements and agentic workflow starter**, not a completed application. The application will use React + Vite + Tailwind CSS for `client/`, Node.js + Express for `server/`, and MySQL. Do not mark a feature complete until it has been implemented and verified.

**Stack choice:** the course built this project in PHP/Laravel; the assignment allows a stack with prior experience, so this version uses React + Express + MySQL (JavaScript throughout). See [docs/assignment-brief.md](docs/assignment-brief.md) for the grading and submission brief.

## Start here

1. Compare [docs/PRD.md](docs/PRD.md) with the instructor's **Project Requirements** lesson and record corrections before coding.
2. Read [CLAUDE.md](CLAUDE.md), [docs/data-model.md](docs/data-model.md), and [docs/STATUS.md](docs/STATUS.md).
3. Set up the React and Express apps, and replace the local setup section with exact installation, database, environment, and run commands once they work.
4. Optional: initialize OpenSpec for Claude Code (`openspec init --tools claude`). Do not claim that OpenSpec is initialized until this command succeeds.
5. Run `/mcp` in Claude Code to confirm the Playwright server; run `/hooks` to confirm the project hook. Project MCP configuration may require approval the first time.

## How to run locally

**Requirements:** Node.js 22.12+ (developed on 24.18), npm, MySQL 8.0.

1. **Install dependencies** (root, `server/`, and `client/`):
   ```bash
   npm run setup
   ```
2. **Create the database and app user** as the MySQL root user (choose your own password):
   ```sql
   CREATE DATABASE testimonial_mvp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'testimonial_app'@'localhost' IDENTIFIED BY 'your-password';
   CREATE USER 'testimonial_app'@'127.0.0.1' IDENTIFIED BY 'your-password';
   GRANT ALL PRIVILEGES ON testimonial_mvp.* TO 'testimonial_app'@'localhost';
   GRANT ALL PRIVILEGES ON testimonial_mvp.* TO 'testimonial_app'@'127.0.0.1';
   ```
3. **Configure the server:** copy `server/.env.example` to `server/.env` and set `DB_PASSWORD` to the same password. `server/.env` is gitignored; never commit it.
4. **Create tables:** migration command **TBD** (not built yet).
5. **Start the app:**
   ```bash
   npm run dev
   ```
   This starts the API on http://localhost:4000 and the client on http://localhost:5173. Open the client URL; `/api` requests are proxied to the API.
6. **Check:** http://localhost:4000/api/health should return `{"status":"ok","api":"ok","database":"ok"}`.

Other commands: `npm test` (server tests), `npm run build` (client production build), `npm run dev:server` / `npm run dev:client` (one side only).

The public collection link must point to a reachable host when demonstrating from another device. A localhost link works only on the same computer.

## Scope status

| Feature | Status |
| --- | --- |
| Owner authentication | Planned |
| Space creation and configuration | Planned |
| Anonymous text submission and thank-you page | Planned |
| Inbox moderation and Wall of Love | Planned |
| Responsive iframe embed | Planned |
| Dashboard statistics | Planned |
| Free/Paid quota enforcement | Planned |
| Demo upgrade and saved plan state | Planned |
| Real Stripe checkout and webhooks | Not in this demo scope |

The Paid upgrade is a **simulation**. It must never collect card information or be described as a real transaction. Price currency and billing cadence are unresolved in the current brief.

## Agentic workflow evidence (fill with actual use)

| Tool | Role | Intended use | Where / evidence after use |
| --- | --- | --- | --- |
| Claude Code hook | Core | Normalize whitespace after code edits | `.claude/settings.json`, `.claude/hooks/format-changed.cjs`, and observed run |
| React skill | Core | Review UI structure, forms, state, accessibility | `.claude/skills/review-react-ui/`; findings in `docs/verification.md` |
| MySQL skill | Core | Review schema, constraints, query boundaries | `.claude/skills/review-mysql-model/`; findings in `docs/verification.md` |
| Playwright MCP | Core | Browser journey checks | `.mcp.json`; observed results in `docs/verification.md` |
| Reviewer subagent | Optional | Independent requirement/security review | `.claude/agents/requirements-reviewer.md`; findings in `docs/verification.md` |
| OpenSpec | Optional | Proposal, requirements, tasks for a feature | Link to committed `openspec/changes/...` |
| Parallel session/branch | Required | Independent feature implementation and merge | Branch/merge commit and integration check |

Configuration alone is not evidence of use. Update this table only after performing each action, and remove optional tools that were not used.

## Submission checklist

- [ ] GitHub repository is public, or access is granted to the reviewer's GitHub username.
- [ ] README contains verified run commands, exact done/not-done status, and which agentic tools were used and where.
- [ ] Final data model and `CLAUDE.md` are committed.
- [ ] At least two agentic tools were actually used; a separate branch/session was merged cleanly.
- [ ] 2–5 minute recording or screenshots show the app working.
- [ ] 200–300 word reflection (what worked, what went wrong and the fix, what to plan differently) is exported as PDF or DOCX.
- [ ] Repository and uploaded evidence were checked before final LMS submission.

**LMS steps:** open the assignment → **Add submission** → paste the repo link → upload screenshots/recording and the reflection → **Save changes** → **Submit assignment**. A submitted assignment cannot be edited.
