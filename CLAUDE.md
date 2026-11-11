# Working instructions for Claude Code

## Source of truth and reading order

1. Read `docs/assignment-brief.md` for what is graded and what must be submitted.
2. Read `docs/PRD.md` for product behaviour and open decisions.
3. Read `docs/data-model.md` for intended entities and database rules.
4. Read `docs/STATUS.md` for current progress and the next task.
5. Read the active plan (OpenSpec change, if used) before implementing it. If the Project Requirements lesson text has not been compared with the PRD, request that comparison and record any changes.

Do not silently invent product behaviour or claim unverified work is done. Keep the PRD, plan/OpenSpec artifacts, schema, status, and implementation aligned. If they conflict, stop that feature, describe the conflict, and update the relevant plan before coding.

## Stack and boundaries

- Frontend: React, Vite, Tailwind CSS, JavaScript. Backend: Node.js, Express, JavaScript. Database: MySQL with parameterized queries.
- Organize app code under `client/` and `server/`. Put migrations in `server/db/migrations/` or document an equivalent choice.
- Customers submit without accounts. Owners authenticate and may access only their own spaces and submissions.
- Enforce validation, owner authorization, and Free/Paid quotas on the server. Do not trust client-side counters or plan labels.
- Billing is a clearly labelled simulation. Never render card fields, use real payment credentials, or call the simulation Stripe.
- Do not commit `.env`, passwords, tokens, customer data, recordings with personal data, or generated database files.

## Commands

The application has not been scaffolded. Replace these placeholders with exact commands **after running them**:

- Install dependencies: TBD
- Create/migrate MySQL database: TBD
- Start backend: TBD
- Start frontend: TBD
- Run lint/test/build checks: TBD

## Feature loop: plan → implement → verify

The assignment requires at least two agentic tools. This project's **core tools** (use on every applicable feature): the PostToolUse formatting **hook**, the project **skills** (`review-react-ui`, `review-mysql-model`), and **Playwright MCP**. **Optional tools** (use when they add value, and record when used): the `requirements-reviewer` **subagent** and **OpenSpec**.

1. **Plan:** explore and write a short plan for one small feature (plan mode, or an OpenSpec change if used). Confirm acceptance criteria, owner isolation, consent, and quota cases before writing feature code.
2. **Implement** a coherent vertical slice. Run checks and exercise its acceptance criteria.
3. **Review with skills:** for React work invoke `review-react-ui`; for schema/query work invoke `review-mysql-model`. Record findings and fixes.
4. **Verify in the browser** with Playwright MCP, including unauthenticated submission and owner-only views. Record actual results in `docs/verification.md`.
5. Optionally run the `requirements-reviewer` subagent for an independent review and correct real gaps.
6. Confirm the PostToolUse formatting hook fires on an applicable code edit. Hook output does not replace tests.
7. Update `docs/STATUS.md`, `docs/verification.md`, and README status. Mark plan/OpenSpec tasks complete only after verification.

Run at least one independent task in a **separate session and branch/worktree**, then merge it and verify the integrated application. A subagent by itself does not prove this parallel-session requirement. Keep the branch name, merge commit, and integration result in the verification log.

## Definition of done

An item is done only when its acceptance criteria are checked in the running app, relevant automated checks pass, and the documentation states what was observed. Record failures and unfinished work truthfully. Never fabricate a tool invocation, test result, payment, or reflection experience.
