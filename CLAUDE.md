# Working instructions for Claude Code

## Source of truth and reading order

1. Read `docs/assignment-brief.md` for what is graded and what must be submitted.
2. Read `docs/PRD.md` for product behaviour and open decisions.
3. Read `docs/data-model.md` for intended entities and database rules.
4. Read `plan.md` for the milestone order, the active milestone's tasks, and its "done when" checks.
5. Read `docs/STATUS.md` for current progress and the next task.
6. Read the active plan (OpenSpec change, if used) before implementing it. If the Project Requirements lesson text has not been compared with the PRD, request that comparison and record any changes.

Do not silently invent product behaviour or claim unverified work is done. Keep the PRD, plan/OpenSpec artifacts, schema, status, and implementation aligned. If they conflict, stop that feature, describe the conflict, and update the relevant plan before coding.

## Stack and boundaries

- Frontend: React, Vite, Tailwind CSS, JavaScript. Backend: Node.js, Express, JavaScript. Database: MySQL with parameterized queries.
- Organize app code under `client/` and `server/`. Put migrations in `server/db/migrations/` or document an equivalent choice.
- Customers submit without accounts. Owners authenticate and may access only their own spaces and submissions.
- Enforce validation, owner authorization, and Free/Paid quotas on the server. Do not trust client-side counters or plan labels.
- Billing is a clearly labelled simulation. Never render card fields, use real payment credentials, or call the simulation Stripe.
- Do not commit `.env`, passwords, tokens, customer data, recordings with personal data, or generated database files.

## Commands

Run from the repository root unless noted. Only list commands that have actually been run successfully.

- Install all dependencies (root, `server/`, `client/`): `npm run setup`
- Start API (port 4000) and client (port 5173) together: `npm run dev`
- Start only the API: `npm run dev:server` (or `npm run dev` inside `server/`)
- Start only the client: `npm run dev:client` (or `npm run dev` inside `client/`)
- Server tests (Node test runner): `npm test` — to also exercise the live database: `cd server && node --env-file=.env --test`
- Client production build: `npm run build`
- Health check: `GET http://localhost:4000/api/health` or through the Vite proxy at `http://localhost:5173/api/health`; 200 with `"database":"ok"` when MySQL is reachable
- Create/migrate MySQL tables: TBD (migration runner not built yet)

Local environment notes:

- MySQL 8.0 runs as the Windows service `MySQL80`; the CLI is `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"` (not on PATH).
- Database `testimonial_mvp`, app user `testimonial_app` exists for both `localhost` and `127.0.0.1` with the same password. Credentials live only in `server/.env` (gitignored); copy from `server/.env.example`. Never print or commit the password.
- In Git Bash, backslashes in command-line arguments to Windows programs get mangled; put test code with Windows paths or regexes in a script file instead of `node -e`.
- Pinned versions: Express 5.3.0, mysql2 3.24.6, React 19.1.10, Vite 8.3.5, Tailwind 4.3.3, concurrently 10.0.6, Playwright MCP 0.0.84.

## Feature loop: plan → implement → verify

The assignment requires at least two agentic tools. This project's **core tools** (use on every applicable feature): the PostToolUse formatting **hook**, the **skills** (`grill-me`/`grilling`, `mysql` + `review-mysql-model`, `vercel-react-best-practices` + `review-react-ui`), and **Playwright MCP**. **Optional tools** (use when they add value, and record when used): the `requirements-reviewer` **subagent** and **OpenSpec**.

1. **Plan:** explore and write a short plan for one small feature (plan mode, or an OpenSpec change if used). Confirm acceptance criteria, owner isolation, consent, and quota cases before writing feature code.
2. **Implement** a coherent vertical slice. Run checks and exercise its acceptance criteria.
3. **Review with skills** (see "Skills: which to use" below): for React work use `review-react-ui` plus `vercel-react-best-practices`; for schema/query work use `review-mysql-model` plus `mysql`. Record findings and fixes.
4. **Verify in the browser** with Playwright MCP, including unauthenticated submission and owner-only views. Record actual results in `docs/verification.md`.
5. Optionally run the `requirements-reviewer` subagent for an independent review and correct real gaps.
6. Confirm the PostToolUse formatting hook fires on an applicable code edit. Hook output does not replace tests.
7. Update `docs/STATUS.md`, `docs/verification.md`, and README status. Mark plan/OpenSpec tasks complete only after verification.

Run at least one independent task in a **separate session and branch/worktree**, then merge it and verify the integrated application. A subagent by itself does not prove this parallel-session requirement. Keep the branch name, merge commit, and integration result in the verification log.

## Skills: which to use

Each area has a **general** skill (external best practices) and a **project** skill (this app's rules). Use them as a pair; when they conflict, the project skill, `docs/PRD.md`, and `docs/data-model.md` win, and the conflict is raised with the developer rather than silently resolved.

| When | Planning | General skill | Project skill |
| --- | --- | --- | --- |
| Before implementing a milestone | `grill-me` (user types `/grill-me`) or `grilling` | — | — |
| Schema, migrations, indexes, queries, locking | — | `mysql` | `review-mysql-model` |
| React components, pages, forms, data fetching | — | `vercel-react-best-practices` | `review-react-ui` |

Notes on the external skills:

- **`mysql`** (`planetscale/database-skills`): read the **local** reference files in `.claude/skills/mysql/references/` instead of the GitHub URLs linked in its SKILL.md. Ignore its PlanetScale hosting recommendation: this project self-hosts MySQL 8.0 locally. Treat its rules of thumb (for example "lookup tables over ENUM", "use `SELECT … FOR UPDATE` sparingly") as review input; decide with the developer and record the decision in `docs/data-model.md`.
- **`vercel-react-best-practices`** (`vercel-labs/agent-skills`): written for React and Next.js. This app is a Vite single-page app with an Express API, so skip Next.js-only rules: `server-*`, `next/dynamic`, React Server Components, and hydration rules. Use `React.lazy` where it suggests dynamic imports. Most useful here: `rerender-*`, `rendering-conditional-render`, `client-*`, `async-parallel`, `bundle-barrel-imports`, and `js-*`.
- External skills are installed with `npx skills add …` into `.agents/skills/` and linked into `.claude/skills/` (Windows junctions; git stores both copies). Sources and hashes are pinned in `skills-lock.json`. Do not edit their files; update them with the installer.

## Record mistakes as they happen

Whenever something goes wrong — a bug Claude introduced, incomplete or incorrect AI output, a wrong assumption, a failed command, a merge conflict, or a misleading instruction — add a row to **Issues and corrections log** in `docs/verification.md` in the same session: what went wrong, who/what caused it, how it was detected, and the fix and how it was verified. Be honest about whether Claude, the developer, or the environment caused it. Do not wait until the end of the project.

## Record every skill run

Every time a skill runs on project work — a project skill (`grill-me`/`grilling`, `mysql`, `review-mysql-model`, `vercel-react-best-practices`, `review-react-ui`) or a built-in one such as `security-review` — add a row to **Skill usage log** in `docs/verification.md` in the same session: date, skill, milestone, how it was invoked (`typed`, `requested`, or `auto`), what it did, and the outcome (decisions made, findings, fixes) with the commit. After a `grill-me`/`grilling` session, write the confirmed decisions into `plan.md`, `docs/PRD.md`, or `docs/data-model.md` before implementing.

## Definition of done

An item is done only when its acceptance criteria are checked in the running app, relevant automated checks pass, and the documentation states what was observed. Record failures and unfinished work truthfully. Never fabricate a tool invocation, test result, payment, or reflection experience.
