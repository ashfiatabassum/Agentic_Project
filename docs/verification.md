# Verification log

Record **observed** results only. A planned test is not a pass. Use test accounts and synthetic testimonials; do not include real customer data in public screenshots or commits.

## Environment

- Date/time:
- Commit:
- Frontend/backend/database versions and run commands:
- Browser:
- Playwright MCP connection status (`/mcp`):
- Hook status (`/hooks`):

## Feature checks

| Requirement ID | Scenario | Expected | Actual result | Pass/Fail/Not run | Evidence / issue / fix |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Owner registers, logs out, and private route denies access | Owner session works; signed-out request denied | | Not run | |
| FR-02 | Owner creates space; other owner tries to access it | Link created; cross-owner access denied | | Not run | |
| FR-03 | Toggle fields and required flags | Public form reflects saved settings | | Not run | |
| FR-05 | Customer submits without account | Owner sees saved submission | | Not run | |
| FR-06 | Try missing required field and unchecked public consent | Validation works; no unintended publication | | Not run | |
| FR-08 | Favourite, hide, edit, and wall actions | Inbox order and public visibility change correctly | | Not run | |
| FR-10 | Embed snippet in separate HTML page | Layout/theme/animation reflected; responsive | | Not run | |
| FR-11 | Change dashboard from 7 to 30 days | Chart and totals show correct data | | Not run | |
| FR-12 | Reach/exceed limits and race two submissions | Backend rejects over-limit actions | | Not run | |
| FR-13 | Simulated upgrade, logout/login, revisit billing | Persisted Paid state, limits update, demo label visible | | Not run | |

## Agentic tool use

| Tool | Date/feature | Invocation or action performed | Finding/result | Fix and commit |
| --- | --- | --- | --- | --- |
| OpenSpec | | | | |
| React skill | | | | |
| MySQL skill | | | | |
| Reviewer subagent | | | | |
| Claude Code hook | | | | |
| Playwright MCP | | | | |

## Parallel work and integration

- Independent task:
- Branch/worktree and second session:
- Main-branch work happening simultaneously:
- Merge commit:
- Conflicts and resolution:
- Integrated checks after merge:

## Remaining gaps

List incomplete requirements with honest impact. In particular, real Stripe checkout/webhooks are excluded from the current demo plan unless the instructor's actual requirements require them.
