# Administration (`/admin`)

## Access

- Only users with the `admin` role (table `user_roles`) — granted with SQL by the project owner
  (docs/SUPABASE.md §5). There is no way to obtain the role from the app.
- Every admin page and every admin server action calls `requireAdmin()`: it verifies the session with Supabase
  Auth, then asks the database (`is_admin`, service role). Anyone else gets a **404** — the area is not revealed.
- Admin reads and writes use the server-side service-role client (needs `SUPABASE_SECRET_KEY`); all admin
  database functions are `service_role`-only and invisible to browsers.

## What an admin can do

| Page | Actions |
| --- | --- |
| `/admin` | Overview (players, new this week, games this week, today's attempts, how far ahead the calendar is published — highlighted red when today is not published). **Prepare ahead** 7/14/30/60 days. 28-day calendar with status, the five flags, attempts and problem count. Recent audit log. |
| `/admin/daily/<date>` | Preview the five questions (flag, answer, options, per-question success rate). Validation result. For a **draft** from today on: publish, regenerate all five, replace one question (choose a country of the same difficulty, or random avoiding nearby days), delete. For a **published future date nobody started**: unpublish (it becomes a draft again). Past dates are read-only. |

Destructive or irreversible buttons need a second click ("Click again to confirm").

## Rules the database enforces regardless of the UI

- Publishing runs `validate_daily_challenge` (5 questions, 2/2/1 composition, ordered, 4 distinct options
  containing the answer, matching difficulties…); problems are shown and nothing is published.
- Published challenges are immutable; unpublishing only for future dates without attempts; today's and
  past challenges never change.
- `admin_delete_draft` deletes drafts only.

## Audit log

`admin_audit_log`: actor (null for scripts or deleted accounts), source (`admin` / `script`), action
(`daily.generate`, `daily.regenerate`, `daily.replace_question`, `daily.publish`, `daily.unpublish`,
`daily.delete_draft`, `daily.fill_ahead`), target date, details (countries, positions, counts), time.
Append-only: a trigger refuses updates and deletes — except the foreign key setting `actor_id` to null when
an admin's account is deleted, so history survives.

Unexpected failures in admin actions are also written to the server log as one-line JSON
(`{"level":"error","scope":"admin.daily",…}`), visible in the hosting provider's logs.
