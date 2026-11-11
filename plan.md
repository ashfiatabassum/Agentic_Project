# Implementation plan — Testimonial MVP

This is the build roadmap: **in what order** the app is built, as milestones with checkboxes. Other docs answer other questions:

| File | Answers |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | What the app must do (FR-01 – FR-13) |
| [docs/data-model.md](docs/data-model.md) | How data is stored |
| **plan.md** (this file) | In what order it is built, and what "done" means for each step |
| [docs/STATUS.md](docs/STATUS.md) | Where we are now, blockers, handoff |
| [docs/verification.md](docs/verification.md) | What was actually checked, tool evidence, issues log |

## How this plan is used

- Milestones are planned **one at a time**: the next milestone is written here and reviewed before any of its code is written (plan → implement → verify).
- Tick a task `[x]` only after it is done **and** verified; add the commit hash or evidence next to it.
- Each milestone lists the requirements it covers, its tasks, its "done when" checks, the agentic tools it uses, and the branch it runs on.
- If the PRD, data model, and this plan disagree, stop and fix the plan first.

---

## M0 — Project setup ✅

**Goal:** a public GitHub repo with Claude Code context, a running API + client + MySQL connection, and verified run commands — no product features yet.
**Requirements covered:** assignment steps 2 (set up project, `CLAUDE.md` with commands and rules); groundwork for all FRs.
**Branch:** `main`. **Completed:** 11 November 2026.

### Tasks

- [x] Move the starter from `testimonial-mvp-starter/` to the repo root so `CLAUDE.md`, `.claude/`, and `.mcp.json` load in Claude Code — `6a07d99`
- [x] Config fixes: hook command uses `$CLAUDE_PROJECT_DIR`; Playwright MCP pinned to `0.0.84`; reviewer subagent limited to read-only commands — `6a07d99`
- [x] Docs: save assignment brief (`docs/assignment-brief.md`); update PRD source and STATUS blockers; core vs optional tools in `CLAUDE.md`; README stack note and submission checklist — `6a07d99`
- [x] First commit pushed to `ashfiatabassum/Agentic_Project`; repo confirmed public (GitHub API returns 200 without login)
- [x] Server scaffold: Express 5.3.0 + mysql2 3.24.6, config from `server/.env`, MySQL pool, `GET /api/health`, JSON 404, error handler, 3 `node:test` tests — `ead4f0a`
- [x] Local MySQL: database `testimonial_mvp`, user `testimonial_app` (localhost and 127.0.0.1), `server/.env` created (gitignored) — health returns `"database":"ok"`
- [x] Client scaffold: React 19.1.10 + Vite 8.3.5 + Tailwind 4.3.3, `/api` proxy to port 4000, status page — `081f12f`
- [x] Root scripts: `npm run setup`, `npm run dev` (API + client together), `npm test`, `npm run build` — `081f12f`
- [x] Replace "TBD" commands in `CLAUDE.md` and README with verified ones (migration command still TBD → M1) — `d6e2ca4`
- [x] Issues and corrections log in `docs/verification.md`; `CLAUDE.md` rule to log mistakes as they happen — `6e04789`
- [x] Fresh Claude Code session in the repo root: `/mcp` shows `playwright` ✔ 25 tools; `/hooks` shows the project PostToolUse hook — `884217d`, `38f335d`

### Done when

- [x] `npm run dev` from the repo root starts both apps, and http://localhost:5173 shows Client / API / Database all **ok** (confirmed by the developer in the browser)
- [x] `npm test` passes (3/3), including against the live database
- [x] `npm run build` succeeds
- [x] No secrets committed (`server/.env` is gitignored; `git status` shows only source files)

### Agentic tools

Configuration checked only; **no tool used on feature work yet**. Hook command and Playwright MCP were exercised outside a session, then confirmed loaded in a fresh session. Evidence of real use starts in M1.

### Issues found

Recorded in [verification.md → Issues and corrections log](docs/verification.md#issues-and-corrections-log): Git Bash backslash mangling in tests, a temp file pointed at the drive root, placeholder password pasted into MySQL, a likely extra `@127.0.0.1` account, and `npm run dev` run from the wrong folder.

### Carried forward

- Compare the instructor's **Project Requirements** lesson with `docs/PRD.md` (still not done).
- Data model gaps and migrations → **M1** (to be planned next).

---

## Next milestones

To be planned one at a time, starting with **M1 — Data model and migrations**.
