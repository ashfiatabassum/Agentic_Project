---
name: review-mysql-model
description: Design or review MySQL schema, migrations, indexes, constraints, and queries for the testimonial MVP. Use when implementing spaces, configurable fields, submissions, moderation, plan limits, and demo billing persistence.
---

# Review MySQL model

Read `docs/PRD.md`, `docs/data-model.md`, and the active OpenSpec change. Inspect existing migrations and queries before proposing changes.

1. Map each requirement to a table, key, constraint, and query. Preserve historical questions for old answers.
2. Check foreign keys, unique slug/email, indexes for owner inbox and graph queries, defaults for consent/publication, and safe migration order.
3. Scope private reads and writes through the authenticated owner. Never trust `owner_id`, plan, or quota counts from the browser.
4. Use parameterized SQL. Enforce space and per-space submission quotas with a concurrency-safe transaction/lock strategy; explain and test the boundary.
5. Keep simulated upgrades explicit in stored events; store no card information. Protect public queries from returning email or private response fields.
6. Run the migration/query checks on a disposable local database. Report schema changes, exact commands/results, risks, and gaps. Update `docs/data-model.md` if implementation decisions change.

Do not run destructive migrations against user data without identifying the target database and a recovery path.
