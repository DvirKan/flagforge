# Supabase setup (Windows + VS Code)

This guide connects FLAGFORGE to a Supabase project: database tables, security policies, sign-up / sign-in,
email links and the first administrator. Commands are for PowerShell in the VS Code terminal, run from the
project folder (`C:\dev\flagforge`).

## 0. What lives where

| Thing | Where | Secret? |
|---|---|---|
| Project URL `https://<ref>.supabase.co` | `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` | No |
| Publishable key `sb_publishable_…` | `.env.local` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No (RLS protects data) |
| Secret key `sb_secret_…` | `.env.local` → `SUPABASE_SECRET_KEY` | **Yes — server only** |
| Database password | your password manager; asked by `supabase link` | **Yes** |

Development and production should be **separate Supabase projects** with separate keys.

## 1. Install the Supabase CLI (once)

The CLI is a dev dependency of the project. Newer npm versions block install scripts by default, so approve
the CLI's download script once:

```powershell
npm install-scripts approve supabase
npm rebuild supabase
npx supabase --version
```

If `npm install-scripts` is not recognised, your npm runs install scripts normally — just run
`npx supabase --version`.

## 2. Link the project and apply the migrations

```powershell
npx supabase login                 # opens the browser once
npx supabase link --project-ref <your-project-ref>   # asks for the database password
npx supabase db push               # applies everything in supabase/migrations
```

`db push` shows the list of migrations and asks for confirmation. It records what was applied, so running it
again later only applies new migrations.

Check: Supabase dashboard → **Table Editor** shows `profiles`, `countries` (193 rows), `game_sessions`,
`game_session_questions`, `user_roles`.

**Fallback without the CLI:** dashboard → **SQL Editor** → paste and run each file from `supabase/migrations`
in filename order. (The CLI is preferred because it tracks which migrations ran.)

## 3. Authentication settings (dashboard)

**Authentication → URL Configuration**
- *Site URL*: `http://localhost:3000` (production: your real domain)
- *Redirect URLs*: add `http://localhost:3000/**` (production: `https://your-domain/**`)

**Authentication → Providers → Email** (or *Sign In / Providers*)
- Email provider enabled, **Confirm email** on
- Minimum password length: **8**
- Secure email change: on

**Authentication → Emails → Templates** — Supabase only allows editing templates once **custom SMTP** is set
up (§4). Until then the default templates are used: their links work, but only in the browser where the user
signed up / requested the reset (PKCE). After configuring SMTP, use links that work on any device:

Ready-made bilingual templates: `supabase/templates/confirm-signup.html` and
`supabase/templates/reset-password.html` (subjects and steps in docs/DEPLOY.md §4).

The app handles both styles at `/auth/confirm`, so the default templates also work (same browser only).

## 4. Email delivery

The built-in Supabase mailer is for development: it sends only to members of your Supabase organisation and
at a very low hourly rate. For real users configure SMTP (**Authentication → Emails → SMTP Settings**) with a
provider. Without a domain: a (dedicated) Gmail account with an app password; with a domain: Resend, Postmark,
Amazon SES or Brevo. Step-by-step settings: docs/DEPLOY.md §4.

**Do not sign up with made-up addresses** on a project that sends emails — bounced messages can get the
project's email sending restricted. The automated auth tests create users through the admin API, which sends
no email.

## 5. Make yourself an administrator

Sign up in the app first, then in **SQL Editor**:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles where username = '<your-username>';
```

There is no way to become an admin from the app itself — the role table has no client write policy.

## 6. Generate TypeScript types (optional)

```powershell
npm run db:types     # writes src/types/database.ts from the linked project
```

## 7. Verify

```powershell
npm run build
npm run test:e2e:auth   # real sign-up verification, sign-in, saved game, language, reset, security, deletion
```

The auth suite creates throwaway users (`ff-e2e-…@example.com`) through the admin API and deletes them at the end.

## Database testing without Supabase

`npm run test:db` runs the migrations and RLS/function tests against any plain PostgreSQL ≥ 15 (set
`TEST_DATABASE_URL`). `supabase/tests/local-shim.sql` emulates the Supabase `auth` schema and roles for this —
it is never applied to a real project.

## Rotating a leaked key

Dashboard → **Project Settings → API Keys** → create a new secret key, update `.env.local` / Vercel, redeploy,
then delete the old key. If the database password leaked: **Project Settings → Database → Reset password**.
