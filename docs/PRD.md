# Product Requirements Document — Testimonial MVP

**Status:** Feature scope **final** (§11) and data model **final** ([data-model.md](data-model.md)), 11 November 2026. FR-01 Login is fully decided (§10); data-level rules for all features are in the data model; remaining UI behaviour details are settled as each milestone is planned.  
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
| FR-02 | Create/list/edit/delete spaces | Owner can create and later edit title, subtitle, collection prompt, custom thank-you message, unique public slug, theme, brand colour, and questions; a success screen shows the public URL. Owner can delete a space after confirmation, which deletes its testimonials. Other owners cannot read/edit/delete it. |
| FR-03 | Configurable fields | Name and email are always enabled and required. Owner can set job title, company name, social link, profile photo, and star rating (1–5) each to off, optional, or required. |
| FR-04 | Predefined themes, brand colour, and logo | Owner can pick at least two predefined collection-page themes and an accent (brand) colour, and optionally upload a logo (replace or remove later); the public page, wall, and embed reflect the saved choices. Logo uploads use the same server-side image type and size checks as profile photos. |
| FR-05 | Public text collection | Anyone with the link can view the configured questions and submit text, enabled fields, answers, and consent without registering. Server validates required fields and shows useful errors. |
| FR-06 | Consent and confirmation | Public-display and social-sharing choices start unchecked and are stored separately; successful submission displays the space's thank-you message (or a default). No public display without public-display consent. |
| FR-07 | Owner inbox | Owner sees their space's visible (unlocked) submissions, can filter by state, search by text (name, company, testimonial text), and view full details and consent. Locked submissions appear only as a count with an upgrade prompt. Other owners cannot access them. |
| FR-08 | Moderation | Owner can edit text/details, hide/unhide, favourite/unfavourite, add/remove an eligible item from Wall of Love, and delete a submission (for example spam) after confirmation. Favourites sort first. Hidden, locked, or non-consenting items are not public. |
| FR-09 | Wall of Love | A public wall shows only testimonials selected for the wall, visible, and consented to public display. |
| FR-10 | Embed builder | Owner selects at least grid and carousel/list layouts, light/dark mode, background colour, and animation on/off; preview and generated responsive iframe snippet reflect those settings. |
| FR-11 | Dashboard | Owner sees total spaces, total submissions, current plan, recent activity, daily submission graph, and 7/30-day selector. Free plan shows upgrade prompt. |
| FR-12 | Limits | Free: max 3 spaces and 100 visible submissions per space. Paid: max 25 spaces and 1,000 visible submissions per space. Space creation past the limit is rejected by the server, including concurrent requests. Submissions past the per-space limit are **accepted but locked** (see §5); a hard cap of 1,000 saved submissions per space rejects anything beyond it. |
| FR-13 | Billing demo | Billing shows both plans and an upgrade action explicitly labelled as a simulation. Authenticated owner can simulate upgrade, see success, and later see Paid on billing/dashboard; an event is recorded. No card data is requested. |

## 5. Business and data rules

- The plan belongs to the owner and applies to every owned space.
- **Accept but lock (decided 11 Nov 2026):** in each space, the oldest *N* saved testimonials are visible, where *N* is the owner's plan limit per space (Free 100, Paid 1,000); newer ones are **locked**. Locked status is calculated from submission order, not stored, so concurrent submissions cannot exceed it. Hidden testimonials count toward *N*; hiding does not free capacity. Deleting a testimonial frees capacity and the oldest locked one becomes visible. Upgrading raises *N* and unlocks automatically.
- Locked testimonials cannot be opened, edited, added to the wall, or shown publicly or in embeds; the owner sees only how many are locked, with an upgrade prompt. Customers always see the normal thank-you page.
- Hard cap: at most 1,000 saved testimonials per space (the Paid limit), to bound storage and abuse. Beyond it, submission is rejected with "This page isn't accepting testimonials right now."
- The space-count limit is enforced at creation and must be concurrency-safe on the server (create is rejected past the limit). A client-side disabled button is only UI feedback.
- A favourite affects inbox ordering, not public visibility. `on_wall` affects public display only when `consent_public = true` and `hidden = false`.
- Social-sharing consent does not by itself publish to the wall; it is a distinct permission.
- Store question text with its answer or retain question versions so editing a space's questions does not make old answers unintelligible.
- The owner may edit content as requested; retain an `edited_at` marker and do not misrepresent edited content in the demo.
- Validate email format, lengths, links, uploaded photo type/size, and ownership server-side. Store password hashes, not raw passwords.
- Anonymous submission is open by design; add basic rate limiting and input length caps. Public APIs must not expose email, private answers, or consent flags unless explicitly intended for the owner.

## 6. Pages

| Route concept | Audience | Main content |
| --- | --- | --- |
| Landing page `/` | Public | What the product does, interactive feature preview, sample testimonials, Free vs Paid (demo) pricing, sign-up call to action (added 12 Nov 2026, plan.md E19) |
| Sign up / sign in | Owner | Credentials and errors; two-column desktop layout with larger fields (plan.md E20) |
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
- **Also excluded after comparing with Testimonial.to (11 Nov 2026):** AI features (writing help, sentiment, summaries, style generator), social/review imports, case studies, automated invitations and email assistant, custom domains, REST API/webhooks/Zapier/MCP, replying to testimonials, tags, and extra widget types (single-testimonial embed, badges, globe map, collect buttons). **Video** is Testimonial.to's headline feature; it is excluded here because recording, upload, storage, and playback would dominate the project. If the course's Project Requirements lesson requires video, it is listed as missing rather than relabelled.
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
- CSRF: `SameSite=Lax` cookies plus JSON-only state-changing requests (other content types return 415). The public photo upload is handled separately with its feature. *Exceptions decided in M2 (plan.md E17):* logout accepts any content type, because it must always succeed and a cross-site logout carries no cookie; the owner's logo upload is multipart and also requires the header `X-Requested-With: fetch`.

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

## 11. Final feature scope (11 November 2026)

Agreed after listing all functions and comparing with Testimonial.to (home, pricing, widgets, and features pages). Additions from that comparison are marked **(new)**. Behaviour details not yet decided are settled when each feature is planned; tables are designed from this list afterwards.

### 1. Authentication (FR-01) — fully decided in §10

1. Sign up with name, email, and password; signed in automatically
2. Log in with email and password
3. Log out (ends this device's session)
4. Stay signed in for 7 days
5. Get the current user on page load
6. Protect private pages and APIs (redirect to login, then back)
7. Rate-limit login and sign-up attempts
8. **(added 12 Nov 2026)** Public landing page at `/` with an interactive feature preview and pricing, leading to sign up; larger two-column sign in / sign up pages (plan.md E19–E20)

### 2. Spaces (FR-02 – FR-04)

1. Create a space: name, subtitle, collection prompt, public link (slug)
2. **(new)** Custom thank-you message per space (default text if empty)
3. List my spaces on the dashboard
4. Edit a space later
5. **(new)** Delete a space after confirmation (also deletes its testimonials)
6. Add, edit, reorder, and remove custom questions
7. Configure customer fields: name and email always required; **(new)** job title, company, social link, profile photo, and **(new)** star rating 1–5 — each off, optional, or required
8. Pick a predefined theme (at least two) and **(new)** a brand (accent) colour
9. **(new)** Upload an optional logo (replace or remove later); same image type and size checks as profile photos
10. "Space created" screen with a copyable public link
11. Other owners cannot view, edit, or delete my space

### 3. Public collection — customers (FR-05, FR-06)

1. Open `/s/:slug` without an account
2. See the space's logo, name, prompt, questions, theme, and brand colour
3. Fill in the configured fields, star rating (if enabled), testimonial text, and answers
4. Upload a profile photo (if enabled)
5. Two separate consent boxes (public display, social sharing), both unchecked
6. Submit with server validation and clear errors
7. Thank-you page with the space's message
8. Rate and length limits on submissions
9. Submissions past the plan limit are accepted but locked; past the hard cap, rejected politely

### 4. Inbox and moderation (FR-07, FR-08)

1. View a space's visible submissions, favourites first
2. Filter by state (all, on wall, hidden, favourites)
3. **(new)** Search by name, company, or testimonial text
4. Open full details, including consent, rating, and answers
5. Edit text and details (marked as edited)
6. Hide / unhide
7. Favourite / unfavourite
8. Add to / remove from the Wall of Love (only with public consent, not hidden, not locked)
9. **(new)** Delete a submission (for example spam) after confirmation
10. See how many submissions are locked, with an upgrade prompt
11. Other owners cannot access my inbox

### 5. Wall of Love (FR-09)

1. Public wall `/s/:slug/wall`
2. Shows only testimonials on the wall, not hidden, not locked, and with public consent
3. Shows name, job title/company, photo, rating, and text; never email, consent flags, or private data

### 6. Embed (FR-10)

1. Embed builder page per space
2. Layout (grid, carousel/list), light/dark mode, background colour, animation on/off
3. Live preview
4. Generate and copy a responsive iframe snippet
5. Public embed route rendering the wall with those settings

### 7. Dashboard (FR-11)

1. Totals: spaces and submissions
2. Current plan and usage against limits (including locked count)
3. Recent activity
4. Daily submissions graph with a 7/30-day selector
5. Upgrade prompt on the Free plan

### 8. Plan limits (FR-12)

1. Free: 3 spaces, 100 visible testimonials per space
2. Paid: 25 spaces, 1,000 visible testimonials per space
3. Space creation past the limit is rejected, even under concurrent requests
4. Testimonials past the limit are accepted but locked (oldest *N* visible); hard cap 1,000 saved per space
5. Hidden testimonials count; deleting frees capacity; upgrading unlocks

### 9. Billing demo (FR-13)

1. Billing page comparing Free (৳0) and Paid (৳999/month)
2. Upgrade button clearly labelled as a simulation; no card fields
3. Simulated upgrade → success page → Paid shown on billing and dashboard, locked testimonials unlocked
4. Plan persists after logging out and back in
5. Each upgrade is recorded as an event
