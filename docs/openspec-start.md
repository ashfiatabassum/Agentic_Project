# OpenSpec setup and first change

This file is an instruction sheet, **not** evidence that OpenSpec is already initialized or used.

1. Install OpenSpec using its current official installation instructions; verify `openspec --version`.
2. At the repository root run `openspec init --tools claude`; inspect the generated `openspec/` and `.claude/` workflow files and commit them. If existing project skills share names, retain both without overwriting them.
3. In Claude Code: “Read `docs/PRD.md` and `docs/data-model.md`. Explore the smallest end-to-end change for owner signup, space creation, anonymous text submission, and inbox display. Identify uncertainties without implementing code.”
4. Ask Claude to propose one bounded change (for example, `collect-text-testimonials`). Review `proposal.md`, specs, design, and tasks. Correct any missing anonymous, quota, consent, or owner-isolation cases before applying.
5. Apply the change, verify the running app against its scenarios, then archive/sync the spec using the OpenSpec workflow. Keep the actual artifacts in Git.

OpenSpec's workflow names or command syntax may differ by installed version. Use the commands printed by `openspec init` and do not invent successful invocations. The PRD remains the broad product reference; an OpenSpec change defines the precise behaviour of one implementation slice.
