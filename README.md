# Testimonial MVP — project starter

This repository currently contains the **requirements and agentic workflow starter**, not a completed application. The application will use React + Vite + Tailwind CSS for `client/`, Node.js + Express for `server/`, and MySQL. Do not mark a feature complete until it has been implemented and verified.

**Stack choice:** the course built this project in PHP/Laravel; the assignment allows a stack with prior experience, so this version uses React + Express + MySQL (JavaScript throughout). See [docs/assignment-brief.md](docs/assignment-brief.md) for the grading and submission brief.

## Start here

1. Compare [docs/PRD.md](docs/PRD.md) with the instructor's **Project Requirements** lesson and record corrections before coding.
2. Read [CLAUDE.md](CLAUDE.md), [docs/data-model.md](docs/data-model.md), and [docs/STATUS.md](docs/STATUS.md).
3. Set up the React and Express apps, and replace the local setup section with exact installation, database, environment, and run commands once they work.
4. Optional: initialize OpenSpec for Claude Code (`openspec init --tools claude`). Do not claim that OpenSpec is initialized until this command succeeds.
5. Run `/mcp` in Claude Code to confirm the Playwright server; run `/hooks` to confirm the project hook. Project MCP configuration may require approval the first time.

## Planned local setup (update after implementation)

- Node.js and npm, MySQL, and Claude Code are required.
- `client/` and `server/` will each have an `.env.example`; copy to `.env` and supply local values. Never commit real secrets.
- Exact `npm install`, migration, seed, and `npm run dev` commands: **TBD after scaffold and successful execution**.
- The public link must point to a reachable host when demonstrating from another device. A localhost link works only on the same computer.

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
