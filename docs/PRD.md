# Product Requirements Document — Testimonial MVP

**Status:** Baseline, being finalised feature by feature in a `grill-me` session (started 11 November 2026). Decided so far: **FR-01 Login** (see §10). Remaining features are still draft.  
**Date:** 11 November 2026.  
**Owner:** Ashfia.  
**Source:** User brief and discussion. The LMS assignment brief has been received ([assignment-brief.md](assignment-brief.md)); it sets the workflow and submission rules but not app features. The instructor's Project Requirements lesson (the feature list) has not yet been compared with this draft.

## 1. Goal and scope

Let a business owner create a branded collection page, receive written testimonials from customers without requiring customer accounts, manage submissions, publish selected testimonials, embed a wall on another website, and see basic activity and plan information. This is a minimal project, inspired by the provided Testimonial.to screenshots rather than a pixel-perfect copy.

## 2. Roles

| Role | Access |
| --- | --- |
| Visitor/customer | Open a public space link, submit a testimonial, and view public Wall of Love/embeds without logging in. |
| Owner | Register/login; create and edit only their own spaces; view/manage only their own testimonials; configure embeds; see dashboard and billing. |

There is no separate platform administrator in this scope. “Admin” in the brief means the owner managing a space.

## 3. Primary journeys

1. Owner registers/logs in → creates a space → configures content, questions, fields, and theme → sees success page and copyable public link.
2. Customer opens the public link without an account → reads space details/questions → fills configured fields and written testimonial → chooses consent → submits → sees confirmation.
3. Owner opens dashboard/inbox → filters and reviews → edits/hides/favourites → adds an eligible testimonial to the Wall of Love → copies a configured embed snippet.
4. Free owner sees usage and an upgrade prompt → opens billing → activates a **clearly labelled simulated** Paid plan → sees success and updated limits/status.

## 4. Functional requirements and acceptance criteria

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Owner registration, login, logout | A new owner can register and sign in; a signed-out user cannot access private pages or APIs. |
| FR-02 | Create/list/edit spaces | Owner can create and later edit title, subtitle, collection prompt, unique public slug, theme, and questions; a success screen shows the public URL. Other owners cannot read/edit it. |
| FR-03 | Configurable fields | Name and email are always enabled and required. Owner can enable company name, social link, and profile photo, and mark each enabled optional field required or optional. |
| FR-04 | Predefined themes | Owner can pick at least two predefined collection-page themes; the public page reflects the saved choice. |
| FR-05 | Public text collection | Anyone with the link can view the configured questions and submit text, enabled fields, answers, and consent without registering. Server validates required fields and shows useful errors. |
| FR-06 | Consent and confirmation | Public-display and social-sharing choices start unchecked and are stored separately; successful submission displays a thank-you page. No public display without public-display consent. |
| FR-07 | Owner inbox | Owner sees their space's submissions, can filter by state, and view full details and consent. Other owners cannot access them. |
| FR-08 | Moderation | Owner can edit text/details, hide/unhide, favourite/unfavourite, and add/remove an eligible item from Wall of Love. Favourites sort first. Hidden or non-consenting items are not public. |
| FR-09 | Wall of Love | A public wall shows only testimonials selected for the wall, visible, and consented to public display. |
| FR-10 | Embed builder | Owner selects at least grid and carousel/list layouts, light/dark mode, background colour, and animation on/off; preview and generated responsive iframe snippet reflect those settings. |
| FR-11 | Dashboard | Owner sees total spaces, total submissions, current plan, recent activity, daily submission graph, and 7/30-day selector. Free plan shows upgrade prompt. |
| FR-12 | Limits | Free: max 3 spaces and 100 saved submissions per space. Paid: max 25 spaces and 1,000 saved submissions per space. Server rejects creation/submission past limits, including concurrent requests. |
| FR-13 | Billing demo | Billing shows both plans and an upgrade action explicitly labelled as a simulation. Authenticated owner can simulate upgrade, see success, and later see Paid on billing/dashboard; an event is recorded. No card data is requested. |

## 5. Business and data rules

- The plan belongs to the owner and applies to every owned space. Count all saved testimonials, including hidden ones, toward the per-space quota; changing display status does not free capacity.
- The quota check and insert must be atomic or otherwise concurrency-safe on the server. A client-side disabled button is only UI feedback.
- A favourite affects inbox ordering, not public visibility. `on_wall` affects public display only when `consent_public = true` and `hidden = false`.
- Social-sharing consent does not by itself publish to the wall; it is a distinct permission.
- Store question text with its answer or retain question versions so editing a space's questions does not make old answers unintelligible.
- The owner may edit content as requested; retain an `edited_at` marker and do not misrepresent edited content in the demo.
- Validate email format, lengths, links, uploaded photo type/size, and ownership server-side. Store password hashes, not raw passwords.
- Anonymous submission is open by design; add basic rate limiting and input length caps. Public APIs must not expose email, private answers, or consent flags unless explicitly intended for the owner.

## 6. Pages

| Route concept | Audience | Main content |
| --- | --- | --- |
| Sign up / sign in | Owner | Credentials and errors |
| Dashboard | Owner | Statistics, graph, spaces, plan prompt |
| New/edit space | Owner | Title, subtitle, prompt, questions, fields, theme |
| Space created | Owner | Public link and next steps |
| Public collection `/s/:slug` | Customer | Branded questions and submission form |
| Thank-you | Customer | Submission confirmation |
| Space inbox | Owner | Filters, details, moderation actions |
| Wall `/s/:slug/wall` | Public | Eligible selected testimonials |
| Embed builder | Owner | Layout controls, preview, code |
| Billing and success | Owner | Plan comparison, clearly labelled demo upgrade/status |

## 7. Technical approach

- React + Vite + Tailwind CSS frontend; Node.js + Express API; MySQL database; JavaScript throughout.
- Use a responsive iframe pointing to a public wall route for embed. Sanitize/escape customer-provided content; never inject raw customer HTML.
- Use secure HTTP-only login cookies and server-side owner checks. Keep secrets in environment variables.
- See [data-model.md](data-model.md) for entities; implementation details may evolve through OpenSpec review.

## 8. Exclusions and unresolved decisions

- **Excluded from initial implementation:** video capture, NPS, brand monitoring, rewards, portfolio pages, imports, real Stripe checkout/webhooks, email notifications, and multi-owner teams.
- **Unresolved:** The instructor's actual Project Requirements lesson must be compared with this draft. If it explicitly requires real Stripe, list it as incomplete rather than relabel the simulation.
- **Resolved (grill-me, 11 Nov 2026):** the Paid plan price is **৳999 per month (BDT)**. It is displayed as a demo price; no money is charged.
- **Unresolved:** Number/length of custom questions and profile-photo storage provider. Choose small defaults during OpenSpec planning and record them here.

## 9. Verification target

Run the entire owner/customer journey in separate browser contexts. Test another owner cannot access the first owner's space/inbox, required fields, no public wall without consent, hidden items, favourite ordering, limit boundaries and concurrent submissions, embed in a separate test HTML page, and persistence of the demo plan after sign-out/in. Record actual outcomes in `verification.md`.

## 10. Decisions from the grill-me session

The PRD above is the baseline (Q1). Decisions below refine it and take precedence where more specific. Question numbers refer to the grill-me session of 11 November 2026.

### FR-01 Login — decided

**Registration (Q5, Q8)**

- Fields: **name** (trimmed, 1–100 characters, any script), **email** (trimmed, lowercased, valid format, unique, ≤254), **password**. No username.
- New accounts start on the **Free** plan; the client can never set the plan.
- Successful registration creates the account and a session in one request and opens the dashboard (empty state).

**Passwords (Q6)**

- 8–128 characters; no forced character-class rules. Form hint: "At least 8 characters".
- Hashed with Node's built-in `crypto.scrypt` (random 16-byte salt per user, `timingSafeEqual`), stored as `scrypt$<params>$<salt>$<hash>`. Never logged, returned, or stored in plain text.

**Sessions (Q7, Q7a)**

- Server-side sessions: the cookie holds a random 32-byte token; the database stores only its SHA-256 hash.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, `Max-Age` 7 days.
- Fixed 7-day lifetime (no sliding renewal, no "remember me"). Expired sessions are rejected; expired rows are deleted whenever someone logs in.
- Several devices may be logged in at once; logout ends only the current session.

**Errors and abuse protection (Q9, Q11)**

- Login failure always shows "Invalid email or password"; when the email is unknown, a dummy hash check still runs so timing does not reveal registered emails.
- Registering an existing email returns 409 "An account with this email already exists."
- In-memory rate limits: 10 failed logins per IP per 15 minutes; 5 registrations per IP per hour; over the limit returns 429.
- CSRF: `SameSite=Lax` cookies plus JSON-only state-changing requests (other content types return 415). The public photo upload is handled separately with its feature.

**Access control (Q12)**

- One `requireAuth` middleware on every private API; missing or expired session returns 401 `{"error":"Not signed in"}`.
- Private pages redirect signed-out users to `/login?next=<path>` (same-site paths only) and return there after login; an API 401 mid-session does the same. Signed-in users opening `/login` or `/signup` go to the dashboard.
- The client learns the current user from `GET /api/auth/me` on load.

**API (Q13)**

| Method & path | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ name, email, password }` | 201, sets cookie, `{ user }` | 400 validation, 409 email exists, 429 |
| `POST /api/auth/login` | `{ email, password }` | 200, sets cookie, `{ user }` | 400 validation, 401 invalid credentials, 429 |
| `POST /api/auth/logout` | — | 204, deletes session, clears cookie | always succeeds |
| `GET /api/auth/me` | — | 200 `{ user }` | 401 |

- `user` = `{ id, name, email, plan }`; never the password hash.
- Validation errors across the whole API: `{ "error": "Validation failed", "fields": { "<field>": "<message>" } }`.
- Pages: `/signup`, `/login`; a **Log out** button in the private header.

**Out of scope (Q10)** — listed as not done in the README: email verification, password reset, change password/email, delete account, "remember me", social login, multi-owner teams, admin role.

**Verification (Q14)** — automated `node:test` tests against a separate `testimonial_mvp_test` database (register; case-insensitive duplicate email; field validation; login success and identical failure messages; `/me` with and without cookie; old cookie rejected after logout; expired session rejected; 415 for non-JSON writes; 429 on the 11th failed login), plus a Playwright MCP journey (sign up → dashboard → refresh stays signed in → log out; `/dashboard` while signed out → login → returns). Results in `verification.md` (FR-01).
