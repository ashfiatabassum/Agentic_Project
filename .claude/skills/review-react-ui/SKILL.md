---
name: review-react-ui
description: Review or implement React UI in the testimonial MVP, especially space configuration, public collection form, inbox, billing demo, dashboard, and embed controls. Use for frontend components and user flows.
---

# Review React UI

Read `docs/PRD.md` and the active OpenSpec requirements. Identify the exact component and user journey before editing.

1. Keep owner-only screens separate from public customer pages. Do not rely on hidden buttons for authorization.
2. Make form labels, required/optional state, errors, submission feedback, keyboard access, and responsive layout clear.
3. Preserve persisted server state on refresh; do not hard-code counts or plans in UI. Treat network errors and loading/empty states explicitly.
4. Reflect configured fields, questions, consent choices, and theme on the public form. Start consent unchecked.
5. Prevent hidden/non-consenting testimonials from appearing in public UI, while relying on server filtering as the authority.
6. Run the available client checks and use Playwright MCP to inspect the relevant journey. Report exact files changed, checks run, observed gaps, and any remaining issue.

Do not claim compliance from code inspection alone. Record verified outcomes in `docs/verification.md`.
